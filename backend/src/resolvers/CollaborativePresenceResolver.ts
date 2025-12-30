import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Arg,
  Ctx,
  Root,
  ID,
  Float,
  ObjectType,
  Field,
  InputType,
  PubSub,
  PubSubEngine,
} from 'type-graphql';
import { Context } from '../types/context';
import { UserPresence, PresenceStatus } from '../entities/Collaboration';

// ============================================================================
// SUBSCRIPTION TOPICS
// ============================================================================

const CURSOR_MOVED = 'CURSOR_MOVED';
const USER_PRESENCE_CHANGED = 'USER_PRESENCE_CHANGED';
const NODE_SELECTED = 'NODE_SELECTED';
const TYPING_STARTED = 'TYPING_STARTED';
const TYPING_STOPPED = 'TYPING_STOPPED';
const EDIT_LOCK_ACQUIRED = 'EDIT_LOCK_ACQUIRED';
const EDIT_LOCK_RELEASED = 'EDIT_LOCK_RELEASED';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  if (typeof props === 'string') {
    try {
      return JSON.parse(props);
    } catch {
      return {};
    }
  }
  return props;
}

// Cache for node type IDs
const nodeTypeCache: Map<string, string> = new Map();

async function getNodeTypeId(pool: any, name: string): Promise<string | null> {
  if (nodeTypeCache.has(name)) {
    return nodeTypeCache.get(name)!;
  }
  const result = await pool.query(
    `SELECT id FROM node_types WHERE name = $1`,
    [name]
  );
  if (result.rows.length === 0) return null;
  nodeTypeCache.set(name, result.rows[0].id);
  return result.rows[0].id;
}

// ============================================================================
// TYPES
// ============================================================================

// Internal type for presence data stored in Redis
interface InternalUserPresence {
  userId: string;
  userName: string;
  userAvatar?: string;
  graphId: string;
  status: PresenceStatus;
  selectedNodeIds?: string[];
  lastActive: Date;
}

@ObjectType()
class CursorPosition {
  @Field(() => ID)
  userId!: string;

  @Field()
  userName!: string;

  @Field({ nullable: true })
  userAvatar?: string;

  @Field(() => ID)
  graphId!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field()
  timestamp!: Date;
}

// UserPresence is imported from entities/Collaboration.ts

@ObjectType()
class NodeSelection {
  @Field(() => ID)
  userId!: string;

  @Field()
  userName!: string;

  @Field(() => ID)
  graphId!: string;

  @Field(() => [ID])
  nodeIds!: string[];

  @Field()
  timestamp!: Date;
}

@ObjectType()
class TypingIndicator {
  @Field(() => ID)
  userId!: string;

  @Field()
  userName!: string;

  @Field(() => ID)
  nodeId!: string; // Which node they're typing a comment on

  @Field()
  isTyping!: boolean;

  @Field()
  timestamp!: Date;
}

@ObjectType()
class EditLock {
  @Field(() => ID)
  lockId!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  userName!: string;

  @Field(() => ID)
  entityId!: string; // Node or Edge ID

  @Field()
  entityType!: string; // 'node' or 'edge'

  @Field()
  acquiredAt!: Date;

  @Field()
  expiresAt!: Date;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class UpdateCursorInput {
  @Field(() => ID)
  graphId!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@InputType()
class UpdatePresenceInput {
  @Field(() => ID)
  graphId!: string;

  @Field()
  status!: string; // 'online', 'idle', 'offline'

  @Field(() => [ID], { nullable: true })
  selectedNodeIds?: string[];
}

@InputType()
class AcquireEditLockInput {
  @Field(() => ID)
  entityId!: string;

  @Field()
  entityType!: string;
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * CollaborativePresenceResolver
 *
 * GraphQL resolver for real-time collaboration features
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 */
@Resolver()
export class CollaborativePresenceResolver {
  /**
   * Get all active users in a graph
   */
  @Query(() => [UserPresence])
  async getActiveUsers(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool, redis }: Context
  ): Promise<UserPresence[]> {
    try {
      // Get from Redis (for real-time data)
      const presenceKey = `presence:graph:${graphId}`;
      const userKeys = await redis.smembers(presenceKey);

      const presences: UserPresence[] = [];

      for (const userKey of userKeys) {
        const data = await redis.get(`presence:${userKey}`);
        if (data) {
          const presence = JSON.parse(data);
          // Only include if last active within 5 minutes
          const lastActive = new Date(presence.lastActive);
          const now = new Date();
          if (now.getTime() - lastActive.getTime() < 5 * 60 * 1000) {
            presences.push(presence);
          } else {
            // Remove stale presence
            await redis.srem(presenceKey, userKey);
            await redis.del(`presence:${userKey}`);
          }
        }
      }

      return presences;
    } catch (error) {
      console.error('Error fetching active users:', error);
      return [];
    }
  }

  /**
   * Get active edit locks for a graph
   * Uses GraphLock NodeType from nodes table
   */
  @Query(() => [EditLock])
  async getActiveEditLocks(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<EditLock[]> {
    try {
      const graphLockTypeId = await getNodeTypeId(pool, 'GraphLock');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!graphLockTypeId) {
        console.warn('GraphLock node type not found');
        return [];
      }

      const sql = `
        SELECT
          l.id as lock_id,
          l.props,
          l.created_at as acquired_at,
          u.props->>'username' as user_name
        FROM nodes l
        LEFT JOIN nodes u ON (l.props->>'userId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
        WHERE l.node_type_id = $1
        AND l.props->>'graphId' = $2
        AND (l.props->>'releasedAt') IS NULL
        AND (l.props->>'expiresAt')::timestamp > NOW()
      `;

      const result = await pool.query(sql, [graphLockTypeId, graphId]);

      return result.rows.map((row) => {
        const props = parseProps(row.props);
        return {
          lockId: row.lock_id,
          userId: props.userId,
          userName: row.user_name || 'Anonymous',
          entityId: props.entityId,
          entityType: props.entityType || props.lockType,
          acquiredAt: row.acquired_at,
          expiresAt: new Date(props.expiresAt),
        };
      });
    } catch (error) {
      console.error('Error fetching edit locks:', error);
      return [];
    }
  }

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Update cursor position
   */
  @Mutation(() => Boolean)
  async updateCursor(
    @Arg('input') input: UpdateCursorInput,
    @Ctx() { userId, redis, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      // Get user info
      const userKey = `user:${userId}`;
      let userName = 'Anonymous';
      let userAvatar: string | undefined;

      // Store cursor position in Redis (with TTL of 10 seconds)
      const cursorKey = `cursor:${userId}:${input.graphId}`;
      const cursorData: CursorPosition = {
        userId,
        userName,
        userAvatar,
        graphId: input.graphId,
        x: input.x,
        y: input.y,
        timestamp: new Date(),
      };

      await redis.setex(cursorKey, 10, JSON.stringify(cursorData));

      // Publish cursor update
      await pubSubEngine.publish(`${CURSOR_MOVED}:${input.graphId}`, cursorData);

      return true;
    } catch (error) {
      console.error('Error updating cursor:', error);
      return false;
    }
  }

  /**
   * Update user presence
   * Uses User NodeType from nodes table
   */
  @Mutation(() => Boolean)
  async updatePresence(
    @Arg('input') input: UpdatePresenceInput,
    @Ctx() { userId, pool, redis, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      // Get user info from User node
      const userTypeId = await getNodeTypeId(pool, 'User');
      let userName = 'Anonymous';
      let userAvatar: string | undefined;

      if (userTypeId) {
        const userResult = await pool.query(
          'SELECT props FROM nodes WHERE id = $1 AND node_type_id = $2',
          [userId, userTypeId]
        );

        if (userResult.rows.length > 0) {
          const userProps = parseProps(userResult.rows[0].props);
          userName = userProps.username || 'Anonymous';
          userAvatar = userProps.avatarUrl;
        }
      }

      const presence: InternalUserPresence = {
        userId,
        userName,
        userAvatar,
        graphId: input.graphId,
        status: input.status as PresenceStatus,
        selectedNodeIds: input.selectedNodeIds,
        lastActive: new Date(),
      };

      // Store in Redis
      const presenceKey = `presence:${userId}:${input.graphId}`;
      await redis.setex(presenceKey, 300, JSON.stringify(presence)); // 5 minutes TTL

      // Add to graph presence set
      await redis.sadd(`presence:graph:${input.graphId}`, presenceKey);

      // Publish presence update
      await pubSubEngine.publish(
        `${USER_PRESENCE_CHANGED}:${input.graphId}`,
        presence
      );

      return true;
    } catch (error) {
      console.error('Error updating presence:', error);
      return false;
    }
  }

  /**
   * Broadcast node selection
   */
  @Mutation(() => Boolean)
  async broadcastSelection(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('nodeIds', () => [ID]) nodeIds: string[],
    @Ctx() { userId, pool, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const userTypeId = await getNodeTypeId(pool, 'User');
      let userName = 'Anonymous';

      if (userTypeId) {
        const userResult = await pool.query(
          'SELECT props FROM nodes WHERE id = $1 AND node_type_id = $2',
          [userId, userTypeId]
        );
        if (userResult.rows.length > 0) {
          const userProps = parseProps(userResult.rows[0].props);
          userName = userProps.username || 'Anonymous';
        }
      }

      const selection: NodeSelection = {
        userId,
        userName,
        graphId,
        nodeIds,
        timestamp: new Date(),
      };

      await pubSubEngine.publish(`${NODE_SELECTED}:${graphId}`, selection);

      return true;
    } catch (error) {
      console.error('Error broadcasting selection:', error);
      return false;
    }
  }

  /**
   * Broadcast typing indicator
   */
  @Mutation(() => Boolean)
  async setTypingIndicator(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('isTyping') isTyping: boolean,
    @Ctx() { userId, pool, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const userTypeId = await getNodeTypeId(pool, 'User');
      let userName = 'Anonymous';

      if (userTypeId) {
        const userResult = await pool.query(
          'SELECT props FROM nodes WHERE id = $1 AND node_type_id = $2',
          [userId, userTypeId]
        );
        if (userResult.rows.length > 0) {
          const userProps = parseProps(userResult.rows[0].props);
          userName = userProps.username || 'Anonymous';
        }
      }

      const indicator: TypingIndicator = {
        userId,
        userName,
        nodeId,
        isTyping,
        timestamp: new Date(),
      };

      const topic = isTyping ? TYPING_STARTED : TYPING_STOPPED;
      await pubSubEngine.publish(`${topic}:${nodeId}`, indicator);

      return true;
    } catch (error) {
      console.error('Error setting typing indicator:', error);
      return false;
    }
  }

  /**
   * Acquire edit lock
   * Creates a GraphLock node instead of using standalone table
   */
  @Mutation(() => EditLock, { nullable: true })
  async acquireEditLock(
    @Arg('input') input: AcquireEditLockInput,
    @Ctx() { userId, pool, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<EditLock | null> {
    if (!userId) return null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const graphLockTypeId = await getNodeTypeId(pool, 'GraphLock');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!graphLockTypeId) {
        throw new Error('GraphLock node type not found. Run migrations.');
      }

      // Check if lock already exists and is not expired
      const existingLock = await client.query(
        `SELECT id FROM nodes
         WHERE node_type_id = $1
         AND props->>'entityId' = $2
         AND props->>'entityType' = $3
         AND (props->>'releasedAt') IS NULL
         AND (props->>'expiresAt')::timestamp > NOW()`,
        [graphLockTypeId, input.entityId, input.entityType]
      );

      if (existingLock.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new Error('Entity is already locked by another user');
      }

      // Get graphId from entity (node or edge)
      let graphId: string | null = null;
      if (input.entityType === 'node') {
        const nodeResult = await client.query(
          `SELECT props->>'graphId' as graph_id FROM nodes WHERE id = $1`,
          [input.entityId]
        );
        graphId = nodeResult.rows[0]?.graph_id;
      } else {
        // For edges, we need to get graphId from props or source node
        const edgeResult = await client.query(
          `SELECT e.props->>'graphId' as graph_id, n.props->>'graphId' as source_graph_id
           FROM edges e
           LEFT JOIN nodes n ON e.source_node_id = n.id
           WHERE e.id = $1`,
          [input.entityId]
        );
        graphId = edgeResult.rows[0]?.graph_id || edgeResult.rows[0]?.source_graph_id;
      }

      if (!graphId) {
        await client.query('ROLLBACK');
        throw new Error('Entity not found or missing graphId');
      }

      // Create lock as a GraphLock node (30 second expiry)
      const expiresAt = new Date(Date.now() + 30 * 1000);
      const lockProps = {
        graphId,
        userId,
        lockType: 'exclusive',
        entityType: input.entityType,
        entityId: input.entityId,
        expiresAt: expiresAt.toISOString(),
        reason: 'edit',
      };

      const lockResult = await client.query(
        `INSERT INTO nodes (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, created_at`,
        [graphLockTypeId, JSON.stringify(lockProps)]
      );

      await client.query('COMMIT');

      const lock = lockResult.rows[0];

      // Get user info
      let userName = 'Anonymous';
      if (userTypeId) {
        const userResult = await pool.query(
          'SELECT props FROM nodes WHERE id = $1 AND node_type_id = $2',
          [userId, userTypeId]
        );
        if (userResult.rows.length > 0) {
          const userProps = parseProps(userResult.rows[0].props);
          userName = userProps.username || 'Anonymous';
        }
      }

      const lockData: EditLock = {
        lockId: lock.id,
        userId,
        userName,
        entityId: input.entityId,
        entityType: input.entityType,
        acquiredAt: lock.created_at,
        expiresAt,
      };

      // Publish lock acquisition
      await pubSubEngine.publish(`${EDIT_LOCK_ACQUIRED}:${graphId}`, lockData);

      return lockData;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error acquiring edit lock:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Release edit lock
   * Updates GraphLock node instead of standalone table
   */
  @Mutation(() => Boolean)
  async releaseEditLock(
    @Arg('lockId', () => ID) lockId: string,
    @Ctx() { userId, pool, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const graphLockTypeId = await getNodeTypeId(pool, 'GraphLock');
      if (!graphLockTypeId) return false;

      // Get lock and verify ownership
      const lockResult = await pool.query(
        `SELECT id, props FROM nodes
         WHERE id = $1 AND node_type_id = $2 AND props->>'userId' = $3`,
        [lockId, graphLockTypeId, userId]
      );

      if (lockResult.rows.length === 0) {
        return false;
      }

      const lockProps = parseProps(lockResult.rows[0].props);
      const graphId = lockProps.graphId;

      // Update lock with released timestamp
      await pool.query(
        `UPDATE nodes
         SET props = props || $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ releasedAt: new Date().toISOString() }), lockId]
      );

      // Publish lock release
      await pubSubEngine.publish(`${EDIT_LOCK_RELEASED}:${graphId}`, {
        lockId,
        userId,
        entityId: lockProps.entityId,
        entityType: lockProps.entityType,
      });

      return true;
    } catch (error) {
      console.error('Error releasing edit lock:', error);
      return false;
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  @Subscription(() => CursorPosition, {
    topics: ({ args }) => `${CURSOR_MOVED}:${args.graphId}`,
  })
  cursorMoved(
    @Arg('graphId', () => ID) graphId: string,
    @Root() cursorData: CursorPosition
  ): CursorPosition {
    return cursorData;
  }

  @Subscription(() => UserPresence, {
    topics: ({ args }) => `${USER_PRESENCE_CHANGED}:${args.graphId}`,
  })
  presenceChanged(
    @Arg('graphId', () => ID) graphId: string,
    @Root() presence: UserPresence
  ): UserPresence {
    return presence;
  }

  @Subscription(() => NodeSelection, {
    topics: ({ args }) => `${NODE_SELECTED}:${args.graphId}`,
  })
  nodeSelected(
    @Arg('graphId', () => ID) graphId: string,
    @Root() selection: NodeSelection
  ): NodeSelection {
    return selection;
  }

  @Subscription(() => TypingIndicator, {
    topics: ({ args }) => [
      `${TYPING_STARTED}:${args.nodeId}`,
      `${TYPING_STOPPED}:${args.nodeId}`,
    ],
  })
  typingIndicator(
    @Arg('nodeId', () => ID) nodeId: string,
    @Root() indicator: TypingIndicator
  ): TypingIndicator {
    return indicator;
  }

  @Subscription(() => EditLock, {
    topics: ({ args }) => [
      `${EDIT_LOCK_ACQUIRED}:${args.graphId}`,
      `${EDIT_LOCK_RELEASED}:${args.graphId}`,
    ],
  })
  editLockChanged(
    @Arg('graphId', () => ID) graphId: string,
    @Root() lock: EditLock
  ): EditLock {
    return lock;
  }
}
