import { Resolver, Mutation, Arg, Ctx, PubSub, Subscription, Root, Query, FieldResolver, ID, Int } from 'type-graphql';
import { Comment } from '../entities/Comment';
import { CommentInput } from './GraphInput';
import { Notification } from '../entities/Notification';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { User } from '../entities/User';
import { NotificationService, NOTIFICATION_CREATED } from '../services/NotificationService';

const NEW_COMMENT = "NEW_COMMENT";

@Resolver(Comment)
export class CommentResolver {
  @Mutation(() => Comment)
  async createComment(
    @Arg("input") { targetId, text, parentCommentId }: CommentInput,
    @Ctx() { pool, pubSub, notificationService }: {
      pool: Pool,
      pubSub: PubSubEngine,
      notificationService: NotificationService
    },
    @Ctx() { user }: { user: User }
  ): Promise<Comment> {
    // Determine if target is a node or edge
    const nodeCheck = await pool.query(
      'SELECT id FROM public."Nodes" WHERE id = $1',
      [targetId]
    );
    const isNode = nodeCheck.rows.length > 0;

    const edgeCheck = isNode ? null : await pool.query(
      'SELECT id FROM public."Edges" WHERE id = $1',
      [targetId]
    );
    const isEdge = edgeCheck?.rows.length ?? 0 > 0;

    if (!isNode && !isEdge) {
      throw new Error('Target entity not found');
    }

    // Insert comment
    const result = await pool.query(
      `INSERT INTO public."Comments"
       (text, author_id, ${isNode ? 'target_node_id' : 'target_edge_id'}, parent_comment_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [text, user.id, targetId, parentCommentId || null]
    );

    const newComment = result.rows[0];

    // Fetch author details
    const authorResult = await pool.query(
      'SELECT id, username, email, created_at as "createdAt" FROM public."Users" WHERE id = $1',
      [user.id]
    );
    newComment.author = authorResult.rows[0];

    // Parse @mentions and create notifications
    const mentions = notificationService.parseMentions(text);
    if (mentions.length > 0) {
      const mentionedUserIds = await notificationService.getUserIdsByUsernames(mentions);
      await notificationService.notifyMentionedUsers(
        text,
        mentionedUserIds,
        user.id,
        user.username,
        isNode ? 'node' : 'edge',
        targetId
      );
    }

    // If this is a reply, notify the parent comment author
    if (parentCommentId) {
      const parentResult = await pool.query(
        'SELECT author_id FROM public."Comments" WHERE id = $1',
        [parentCommentId]
      );

      if (parentResult.rows.length > 0) {
        await notificationService.notifyCommentReply(
          parentResult.rows[0].author_id,
          user.id,
          user.username,
          text,
          isNode ? 'node' : 'edge',
          targetId
        );
      }
    }

    // Publish comment
    await pubSub.publish(NEW_COMMENT, newComment);

    return newComment;
  }

  @Query(() => [Comment])
  async getComments(
    @Arg("targetId", () => ID) targetId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Comment[]> {
    const result = await pool.query(
      `SELECT c.*, u.id as author_id, u.username, u.email, u.created_at as author_created_at
       FROM public."Comments" c
       JOIN public."Users" u ON c.author_id = u.id
       WHERE (c.target_node_id = $1 OR c.target_edge_id = $1)
       ORDER BY c.created_at ASC`,
      [targetId]
    );

    return result.rows.map(row => ({
      id: row.id,
      text: row.text,
      parentCommentId: row.parent_comment_id,
      targetNodeId: row.target_node_id,
      targetEdgeId: row.target_edge_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.author_id,
        username: row.username,
        email: row.email,
        createdAt: row.author_created_at
      }
    }));
  }

  @FieldResolver(() => [Comment])
  async replies(
    @Root() comment: Comment,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Comment[]> {
    const result = await pool.query(
      `SELECT c.*, u.id as author_id, u.username, u.email, u.created_at as author_created_at
       FROM public."Comments" c
       JOIN public."Users" u ON c.author_id = u.id
       WHERE c.parent_comment_id = $1
       ORDER BY c.created_at ASC`,
      [comment.id]
    );

    return result.rows.map(row => ({
      id: row.id,
      text: row.text,
      parentCommentId: row.parent_comment_id,
      targetNodeId: row.target_node_id,
      targetEdgeId: row.target_edge_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.author_id,
        username: row.username,
        email: row.email,
        createdAt: row.author_created_at
      }
    }));
  }

  @Query(() => [Notification])
  async getNotifications(
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Arg("unreadOnly", { defaultValue: false }) unreadOnly: boolean,
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<Notification[]> {
    return notificationService.getUserNotifications(user.id, limit, offset, unreadOnly);
  }

  @Query(() => Int)
  async getUnreadNotificationCount(
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<number> {
    return notificationService.getUnreadCount(user.id);
  }

  @Mutation(() => Notification)
  async markNotificationAsRead(
    @Arg("notificationId", () => ID) notificationId: string,
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<Notification | null> {
    return notificationService.markAsRead(notificationId, user.id);
  }

  @Mutation(() => Int)
  async markAllNotificationsAsRead(
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<number> {
    return notificationService.markAllAsRead(user.id);
  }

  @Subscription(() => Comment, {
    topics: NEW_COMMENT,
  })
  newComment(@Root() comment: Comment): Comment {
    return comment;
  }

  @Subscription(() => Notification, {
    topics: ({ context }) => `${NOTIFICATION_CREATED}_${context.user.id}`,
  })
  notificationCreated(@Root() notification: Notification): Notification {
    return notification;
  }
}
