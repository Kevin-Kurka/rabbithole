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
// TYPES
// ============================================================================

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

@ObjectType()
class UserPresence {
  @Field(() => ID)
  userId!: string;

  @Field()
  userName!: string;

  @Field({ nullable: true })
  userAvatar?: string;

  @Field(() => ID)
  graphId!: string;

  @Field()
  status!: string; // 'online', 'idle', 'offline'

  @Field(() => [ID], { nullable: true })
  selectedNodeIds?: string[];

  @Field(() => Date)
  lastActive!: Date;
}

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
   */
  @Query(() => [EditLock])
  async getActiveEditLocks(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<EditLock[]> {
    try {
      const sql = `
        SELECT
          l.id as lock_id,
          l.user_id,
          u.username as user_name,
          l.entity_id,
          l.entity_type,
          l.acquired_at,
          l.expires_at
        FROM public."GraphLocks" l
        INNER JOIN public."Users" u ON l.user_id = u.id
        WHERE l.graph_id = $1
        AND l.released_at IS NULL
        AND l.expires_at > NOW()
      `;

      const result = await pool.query(sql, [graphId]);

      return result.rows.map((row) => ({
        lockId: row.lock_id,
        userId: row.user_id,
        userName: row.user_name,
        entityId: row.entity_id,
        entityType: row.entity_type,
        acquiredAt: row.acquired_at,
        expiresAt: row.expires_at,
      }));
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
   */
  @Mutation(() => Boolean)
  async updatePresence(
    @Arg('input') input: UpdatePresenceInput,
    @Ctx() { userId, pool, redis, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      // Get user info
      const userResult = await pool.query(
        'SELECT username, avatar_url FROM public."Users" WHERE id = $1',
        [userId]
      );

      const userName = userResult.rows[0]?.username || 'Anonymous';
      const userAvatar = userResult.rows[0]?.avatar_url;

      const presence: UserPresence = {
        userId,
        userName,
        userAvatar,
        graphId: input.graphId,
        status: input.status,
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
      const userResult = await pool.query(
        'SELECT username FROM public."Users" WHERE id = $1',
        [userId]
      );

      const userName = userResult.rows[0]?.username || 'Anonymous';

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
      const userResult = await pool.query(
        'SELECT username FROM public."Users" WHERE id = $1',
        [userId]
      );

      const userName = userResult.rows[0]?.username || 'Anonymous';

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

      // Check if lock already exists and is not expired
      const existingLock = await client.query(
        `SELECT * FROM public."GraphLocks"
         WHERE entity_id = $1 AND entity_type = $2
         AND released_at IS NULL AND expires_at > NOW()`,
        [input.entityId, input.entityType]
      );

      if (existingLock.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new Error('Entity is already locked by another user');
      }

      // Get graph_id from entity
      let graphId: string;
      if (input.entityType === 'node') {
        const nodeResult = await client.query(
          'SELECT graph_id FROM public."Nodes" WHERE id = $1',
          [input.entityId]
        );
        graphId = nodeResult.rows[0]?.graph_id;
      } else {
        const edgeResult = await client.query(
          'SELECT graph_id FROM public."Edges" WHERE id = $1',
          [input.entityId]
        );
        graphId = edgeResult.rows[0]?.graph_id;
      }

      if (!graphId) {
        await client.query('ROLLBACK');
        throw new Error('Entity not found');
      }

      // Create lock (30 second expiry)
      const lockResult = await client.query(
        `INSERT INTO public."GraphLocks" (
          graph_id, user_id, lock_type, entity_type, entity_id, expires_at
        ) VALUES ($1, $2, 'write', $3, $4, NOW() + INTERVAL '30 seconds')
        RETURNING *`,
        [graphId, userId, input.entityType, input.entityId]
      );

      await client.query('COMMIT');

      const lock = lockResult.rows[0];

      // Get user info
      const userResult = await pool.query(
        'SELECT username FROM public."Users" WHERE id = $1',
        [userId]
      );

      const lockData: EditLock = {
        lockId: lock.id,
        userId: lock.user_id,
        userName: userResult.rows[0]?.username || 'Anonymous',
        entityId: lock.entity_id,
        entityType: lock.entity_type,
        acquiredAt: lock.acquired_at,
        expiresAt: lock.expires_at,
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
   */
  @Mutation(() => Boolean)
  async releaseEditLock(
    @Arg('lockId', () => ID) lockId: string,
    @Ctx() { userId, pool, pubSub }: Context,
    @PubSub() pubSubEngine: PubSubEngine
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const result = await pool.query(
        `UPDATE public."GraphLocks"
         SET released_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING graph_id, entity_id, entity_type`,
        [lockId, userId]
      );

      if (result.rows.length > 0) {
        const graphId = result.rows[0].graph_id;
        await pubSubEngine.publish(`${EDIT_LOCK_RELEASED}:${graphId}`, {
          lockId,
          userId,
          entityId: result.rows[0].entity_id,
          entityType: result.rows[0].entity_type,
        });
        return true;
      }

      return false;
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
