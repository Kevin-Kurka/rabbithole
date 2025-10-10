/**
 * GraphQL Resolvers for Real-Time Collaboration
 */

import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  PubSub,
  Publisher,
  Authorized,
  FieldResolver,
  Int
} from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  GraphShare,
  GraphInvitation,
  UserPresence,
  GraphActivity,
  CollaborationSession,
  PresenceUpdate,
  CursorUpdate,
  ChatMessage,
  Permission,
  PresenceStatus,
  ActionType
} from '../entities/Collaboration';
import { Graph } from '../entities/Graph';
import { User } from '../entities/User';
import { createPresenceService } from '../services/collaboration/PresenceService';
import { createOperationalTransformEngine } from '../services/collaboration/OperationalTransform';
import { createChatService } from '../services/ChatService';
import {
  Operation,
  MessageType
} from '../services/collaboration/interfaces';

// Subscription topics
const GRAPH_UPDATED = 'GRAPH_UPDATED';
const PRESENCE_UPDATED = 'PRESENCE_UPDATED';
const USER_JOINED = 'USER_JOINED';
const USER_LEFT = 'USER_LEFT';
const ACTIVITY_CREATED = 'ACTIVITY_CREATED';
const CURSOR_MOVED = 'CURSOR_MOVED';
const SELECTION_CHANGED = 'SELECTION_CHANGED';
const CHAT_MESSAGE = 'CHAT_MESSAGE';

@Resolver(GraphShare)
export class GraphShareResolver {
  @FieldResolver(() => User)
  async user(@Root() share: GraphShare, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [share.userId]
    );
    return result.rows[0];
  }

  @FieldResolver(() => User)
  async sharedBy(@Root() share: GraphShare, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [share.sharedBy]
    );
    return result.rows[0];
  }

  @FieldResolver(() => Graph)
  async graph(@Root() share: GraphShare, @Ctx() { pool }: { pool: Pool }): Promise<Graph> {
    const result = await pool.query(
      'SELECT * FROM public."Graphs" WHERE id = $1',
      [share.graphId]
    );
    return result.rows[0];
  }
}

@Resolver(UserPresence)
export class PresenceResolver {
  @FieldResolver(() => User)
  async user(@Root() presence: UserPresence, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [presence.userId]
    );
    return result.rows[0];
  }
}

@Resolver(GraphActivity)
export class ActivityResolver {
  @FieldResolver(() => User)
  async user(@Root() activity: GraphActivity, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [activity.userId]
    );
    return result.rows[0];
  }
}

@Resolver(ChatMessage)
export class ChatMessageResolver {
  @FieldResolver(() => User)
  async user(@Root() message: ChatMessage, @Ctx() { pool }: { pool: Pool }): Promise<User> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [message.userId]
    );
    return result.rows[0];
  }
}

@Resolver()
export class CollaborationResolver {
  private presenceService: any;
  private chatService: any;
  private otEngine: any;

  constructor() {
    // These would be properly injected in production
    this.otEngine = createOperationalTransformEngine();
  }

  // Initialize services with context (called on first use)
  private initServices(pool: Pool, pubSub: PubSubEngine, redis: Redis) {
    if (!this.presenceService) {
      this.presenceService = createPresenceService({ pool, pubSub, redis });
    }
    if (!this.chatService) {
      this.chatService = createChatService({ pool, pubSub, redis });
    }
  }

  // =====================================================
  // Queries
  // =====================================================

  @Query(() => [GraphShare])
  async graphCollaborators(
    @Arg('graphId') graphId: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<GraphShare[]> {
    // Check if user has access to view collaborators
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.VIEW);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const result = await pool.query(
      `SELECT * FROM public."GraphShares"
       WHERE graph_id = $1
       ORDER BY shared_at DESC`,
      [graphId]
    );

    return result.rows;
  }

  @Query(() => [UserPresence])
  async activeUsers(
    @Arg('graphId') graphId: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<UserPresence[]> {
    // Check access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.VIEW);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const result = await pool.query(
      `SELECT * FROM public."UserPresence"
       WHERE graph_id = $1 AND status != 'offline'
       AND last_heartbeat > NOW() - INTERVAL '2 minutes'`,
      [graphId]
    );

    return result.rows;
  }

  @Query(() => [GraphActivity])
  async graphActivity(
    @Arg('graphId') graphId: string,
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<GraphActivity[]> {
    // Check access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.VIEW);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const result = await pool.query(
      `SELECT * FROM public."GraphActivity"
       WHERE graph_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [graphId, limit, offset]
    );

    return result.rows;
  }

  @Query(() => [Graph])
  async sharedGraphs(
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<Graph[]> {
    const result = await pool.query(
      `SELECT g.* FROM public."Graphs" g
       JOIN public."GraphShares" s ON g.id = s.graph_id
       WHERE s.user_id = $1
       ORDER BY s.shared_at DESC`,
      [userId]
    );

    return result.rows;
  }

  // =====================================================
  // Mutations
  // =====================================================

  @Mutation(() => GraphShare)
  async shareGraph(
    @Arg('graphId') graphId: string,
    @Arg('email') email: string,
    @Arg('permission') permission: Permission,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<GraphShare> {
    // Check if user has admin access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.ADMIN);
    if (!hasAccess) {
      throw new Error('Only admins can share graphs');
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM public."Users" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const targetUserId = userResult.rows[0].id;

    // Check if already shared
    const existingShare = await pool.query(
      'SELECT * FROM public."GraphShares" WHERE graph_id = $1 AND user_id = $2',
      [graphId, targetUserId]
    );

    if (existingShare.rows.length > 0) {
      // Update permission
      const result = await pool.query(
        `UPDATE public."GraphShares"
         SET permission = $1
         WHERE graph_id = $2 AND user_id = $3
         RETURNING *`,
        [permission, graphId, targetUserId]
      );

      return result.rows[0];
    }

    // Create new share
    const result = await pool.query(
      `INSERT INTO public."GraphShares"
       (graph_id, user_id, permission, shared_by, shared_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [graphId, targetUserId, permission, userId]
    );

    // Log activity
    await this.logActivity(
      pool,
      graphId,
      userId,
      ActionType.GRAPH_SHARED,
      'graph',
      graphId,
      null,
      { userId: targetUserId, permission }
    );

    // Publish event
    await pubSub.publish(`user:${targetUserId}:notifications`, {
      type: 'graph_shared',
      graphId,
      sharedBy: userId,
      permission
    });

    return result.rows[0];
  }

  @Mutation(() => GraphInvitation)
  async createInvitation(
    @Arg('graphId') graphId: string,
    @Arg('email') email: string,
    @Arg('permission') permission: Permission,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<GraphInvitation> {
    // Check admin access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.ADMIN);
    if (!hasAccess) {
      throw new Error('Only admins can create invitations');
    }

    const token = uuidv4();

    const result = await pool.query(
      `INSERT INTO public."GraphInvitations"
       (graph_id, email, permission, token, invited_by, invited_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
       RETURNING *`,
      [graphId, email, permission, token, userId]
    );

    // Send invitation email (would be implemented separately)
    // await emailService.sendInvitation(email, token, graphId);

    return result.rows[0];
  }

  @Mutation(() => GraphShare)
  async acceptInvitation(
    @Arg('token') token: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<GraphShare> {
    // Get invitation
    const inviteResult = await pool.query(
      `SELECT * FROM public."GraphInvitations"
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      throw new Error('Invalid or expired invitation');
    }

    const invitation = inviteResult.rows[0];

    // Create share
    const shareResult = await pool.query(
      `INSERT INTO public."GraphShares"
       (graph_id, user_id, permission, shared_by, shared_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [invitation.graph_id, userId, invitation.permission, invitation.invited_by]
    );

    // Update invitation status
    await pool.query(
      `UPDATE public."GraphInvitations"
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1`,
      [invitation.id]
    );

    return shareResult.rows[0];
  }

  @Mutation(() => Boolean)
  async revokeAccess(
    @Arg('graphId') graphId: string,
    @Arg('userId') targetUserId: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Check admin access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.ADMIN);
    if (!hasAccess) {
      throw new Error('Only admins can revoke access');
    }

    // Cannot revoke owner's access
    const graphResult = await pool.query(
      'SELECT created_by FROM public."Graphs" WHERE id = $1',
      [graphId]
    );

    if (graphResult.rows[0]?.created_by === targetUserId) {
      throw new Error('Cannot revoke owner access');
    }

    // Delete share
    await pool.query(
      'DELETE FROM public."GraphShares" WHERE graph_id = $1 AND user_id = $2',
      [graphId, targetUserId]
    );

    // Log activity
    await this.logActivity(
      pool,
      graphId,
      userId,
      ActionType.PERMISSION_CHANGED,
      'user',
      targetUserId,
      null,
      { action: 'revoked' }
    );

    // Notify user
    await pubSub.publish(`user:${targetUserId}:notifications`, {
      type: 'access_revoked',
      graphId
    });

    return true;
  }

  @Mutation(() => Boolean)
  async updateCursorPosition(
    @Arg('graphId') graphId: string,
    @Arg('x') x: number,
    @Arg('y') y: number,
    @Arg('nodeId', { nullable: true }) nodeId: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Update cursor position
    await pool.query(
      `UPDATE public."UserPresence"
       SET cursor_position = $1, last_heartbeat = NOW()
       WHERE user_id = $2 AND graph_id = $3`,
      [JSON.stringify({ x, y, nodeId }), userId, graphId]
    );

    // Publish cursor update
    await pubSub.publish(`${CURSOR_MOVED}:${graphId}`, {
      userId,
      position: { x, y, nodeId },
      timestamp: Date.now()
    });

    return true;
  }

  @Mutation(() => Boolean)
  async updateSelection(
    @Arg('graphId') graphId: string,
    @Arg('nodeIds', () => [String]) nodeIds: string[],
    @Arg('edgeIds', () => [String]) edgeIds: string[],
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Update selection
    await pool.query(
      `UPDATE public."UserPresence"
       SET selected_nodes = $1, selected_edges = $2, last_heartbeat = NOW()
       WHERE user_id = $3 AND graph_id = $4`,
      [nodeIds, edgeIds, userId, graphId]
    );

    // Publish selection update
    await pubSub.publish(`${SELECTION_CHANGED}:${graphId}`, {
      userId,
      selectedNodes: nodeIds,
      selectedEdges: edgeIds,
      timestamp: Date.now()
    });

    return true;
  }

  @Mutation(() => Boolean)
  async joinGraph(
    @Arg('graphId') graphId: string,
    @Arg('sessionId') sessionId: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Get Redis instance
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    this.initServices(pool, pubSub, redis);

    // Join graph using presence service
    await this.presenceService.join(userId, graphId, sessionId);

    // Get user details for broadcast
    const userResult = await pool.query(
      'SELECT id, username FROM public."Users" WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Publish user joined event
    await pubSub.publish(`${USER_JOINED}:${graphId}`, {
      userJoined: {
        userId,
        username: user.username,
        cursor: null,
        action: 'joined',
        timestamp: new Date()
      }
    });

    return true;
  }

  @Mutation(() => Boolean)
  async leaveGraph(
    @Arg('graphId') graphId: string,
    @Arg('sessionId') sessionId: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Get Redis instance
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    this.initServices(pool, pubSub, redis);

    // Leave graph using presence service
    await this.presenceService.leave(userId, graphId, sessionId);

    // Get user details for broadcast
    const userResult = await pool.query(
      'SELECT id, username FROM public."Users" WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Publish user left event
    await pubSub.publish(`${USER_LEFT}:${graphId}`, {
      userLeft: {
        userId,
        username: user.username,
        cursor: null,
        action: 'left',
        timestamp: new Date()
      }
    });

    return true;
  }

  @Query(() => [ChatMessage])
  async getChatMessages(
    @Arg('graphId') graphId: string,
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<ChatMessage[]> {
    // Check access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.VIEW);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get Redis instance
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    this.initServices(pool, pubSub, redis);

    const messages = await this.chatService.getRecentMessages(graphId, limit);
    return messages;
  }

  @Mutation(() => ChatMessage)
  async sendChatMessage(
    @Arg('graphId') graphId: string,
    @Arg('message') message: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<ChatMessage> {
    // Check access
    const hasAccess = await this.checkAccess(pool, userId, graphId, Permission.VIEW);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 1000) {
      throw new Error('Message too long (max 1000 characters)');
    }

    // Get Redis instance
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    this.initServices(pool, pubSub, redis);

    const chatMessage = await this.chatService.sendMessage(graphId, userId, message);
    return chatMessage;
  }

  @Mutation(() => Boolean)
  async deleteChatMessage(
    @Arg('messageId') messageId: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<boolean> {
    // Get Redis instance
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    this.initServices(pool, pubSub, redis);

    await this.chatService.deleteMessage(messageId, userId);
    return true;
  }

  // =====================================================
  // Subscriptions
  // =====================================================

  @Subscription(() => PresenceUpdate, {
    topics: ({ args }) => `${USER_JOINED}:${args.graphId}`
  })
  async userJoined(
    @Arg('graphId') graphId: string,
    @Root() payload: any
  ): Promise<PresenceUpdate> {
    return payload.userJoined;
  }

  @Subscription(() => PresenceUpdate, {
    topics: ({ args }) => `${USER_LEFT}:${args.graphId}`
  })
  async userLeft(
    @Arg('graphId') graphId: string,
    @Root() payload: any
  ): Promise<PresenceUpdate> {
    return payload.userLeft;
  }

  @Subscription(() => CursorUpdate, {
    topics: ({ args }) => `${CURSOR_MOVED}:${args.graphId}`
  })
  async cursorMoved(
    @Arg('graphId') graphId: string,
    @Root() cursor: any
  ): Promise<CursorUpdate> {
    // Transform cursor data to match CursorUpdate type
    return {
      userId: cursor.userId,
      username: cursor.username || 'Unknown',
      x: cursor.position.x,
      y: cursor.position.y,
      nodeId: cursor.position.nodeId,
      timestamp: new Date(cursor.timestamp)
    };
  }

  @Subscription(() => ChatMessage, {
    topics: ({ args }) => `${CHAT_MESSAGE}:${args.graphId}`
  })
  async chatMessage(
    @Arg('graphId') graphId: string,
    @Root() payload: any
  ): Promise<ChatMessage> {
    return payload.chatMessage;
  }

  @Subscription(() => GraphActivity, {
    topics: ({ args }) => `${ACTIVITY_CREATED}:${args.graphId}`
  })
  async activityCreated(
    @Arg('graphId') graphId: string,
    @Root() activity: any,
    @Ctx() { userId }: { userId: string }
  ): Promise<GraphActivity> {
    return activity;
  }

  @Subscription(() => UserPresence, {
    topics: ({ args }) => `${PRESENCE_UPDATED}:${args.graphId}`
  })
  async presenceUpdated(
    @Arg('graphId') graphId: string,
    @Root() presence: any
  ): Promise<UserPresence> {
    return presence;
  }

  @Subscription(() => GraphQLJSON, {
    topics: ({ args }) => `${SELECTION_CHANGED}:${args.graphId}`
  })
  async selectionChanged(
    @Arg('graphId') graphId: string,
    @Root() selection: any
  ): Promise<any> {
    return selection;
  }

  @Subscription(() => GraphQLJSON, {
    topics: ({ args }) => `${GRAPH_UPDATED}:${args.graphId}`
  })
  async graphUpdated(
    @Arg('graphId') graphId: string,
    @Root() update: any
  ): Promise<any> {
    return update;
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async checkAccess(
    pool: Pool,
    userId: string,
    graphId: string,
    requiredPermission: Permission
  ): Promise<boolean> {
    // Check if user is owner
    const graphResult = await pool.query(
      'SELECT created_by FROM public."Graphs" WHERE id = $1',
      [graphId]
    );

    if (graphResult.rows[0]?.created_by === userId) {
      return true;
    }

    // Check share permissions
    const shareResult = await pool.query(
      'SELECT permission FROM public."GraphShares" WHERE graph_id = $1 AND user_id = $2',
      [graphId, userId]
    );

    if (shareResult.rows.length === 0) {
      return false;
    }

    const userPermission = shareResult.rows[0].permission;

    // Check permission hierarchy
    const permissionHierarchy = {
      [Permission.VIEW]: [Permission.VIEW, Permission.EDIT, Permission.ADMIN],
      [Permission.EDIT]: [Permission.EDIT, Permission.ADMIN],
      [Permission.ADMIN]: [Permission.ADMIN]
    };

    return permissionHierarchy[requiredPermission].includes(userPermission);
  }

  private async logActivity(
    pool: Pool,
    graphId: string,
    userId: string,
    actionType: ActionType,
    entityType: string,
    entityId: string,
    oldData: any,
    newData: any
  ): Promise<void> {
    await pool.query(
      `INSERT INTO public."GraphActivity"
       (graph_id, user_id, action_type, entity_type, entity_id, old_data, new_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [graphId, userId, actionType, entityType, entityId, oldData, newData]
    );
  }
}