import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { Notification } from '../types/GraphTypes';

export const NOTIFICATION_CREATED = 'NOTIFICATION_CREATED';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  relatedUserId?: string;
  metadata?: any;
}

export class NotificationService {
  constructor(
    private pool: Pool,
    private pubSub: PubSubEngine
  ) { }

  /**
   * Helper to serialize Node to Notification
   */
  private serializeNotification(node: any): Notification {
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;
    return {
      id: node.id,
      userId: props.userId,
      type: props.type,
      message: props.message,
      read: props.read || false,
      created_at: node.created_at
    };
  }

  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    data: NotificationData
  ): Promise<Notification> {
    // Get Notification node type ID
    const typeResult = await this.pool.query('SELECT id FROM public."NodeTypes" WHERE name = $1', ['Notification']);
    if (typeResult.rows.length === 0) {
      throw new Error('Notification node type not found');
    }
    const typeId = typeResult.rows[0].id;

    const props = {
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType,
      entityId: data.entityId,
      relatedUserId: data.relatedUserId,
      read: false,
      metadata: data.metadata
    };

    const result = await this.pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props)
       VALUES ($1, $2)
       RETURNING *`,
      [typeId, JSON.stringify(props)]
    );

    const notification = this.serializeNotification(result.rows[0]);

    // Publish real-time notification
    await this.pubSub.publish(`${NOTIFICATION_CREATED}_${userId}`, notification);

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    data: NotificationData
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      const notification = await this.createNotification(userId, data);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Create notifications for mentioned users in a comment
   */
  async notifyMentionedUsers(
    commentText: string,
    mentionedUserIds: string[],
    commentAuthorId: string,
    commentAuthorUsername: string,
    entityType: 'node' | 'edge',
    entityId: string
  ): Promise<void> {
    // Don't notify the author
    const filteredUserIds = mentionedUserIds.filter(id => id !== commentAuthorId);

    if (filteredUserIds.length === 0) return;

    await this.createBulkNotifications(filteredUserIds, {
      type: 'mention',
      title: 'You were mentioned',
      message: `@${commentAuthorUsername} mentioned you in a comment`,
      entityType,
      entityId,
      relatedUserId: commentAuthorId,
      metadata: {
        commentText: commentText.substring(0, 200) // Preview
      }
    });
  }

  /**
   * Create notification for comment reply
   */
  async notifyCommentReply(
    parentCommentAuthorId: string,
    replyAuthorId: string,
    replyAuthorUsername: string,
    commentText: string,
    entityType: 'node' | 'edge',
    entityId: string
  ): Promise<void> {
    // Don't notify if replying to your own comment
    if (parentCommentAuthorId === replyAuthorId) return;

    await this.createNotification(parentCommentAuthorId, {
      type: 'reply',
      title: 'New reply to your comment',
      message: `@${replyAuthorUsername} replied to your comment`,
      entityType,
      entityId,
      relatedUserId: replyAuthorId,
      metadata: {
        commentText: commentText.substring(0, 200)
      }
    });
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let query = `
      SELECT n.* 
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'Notification' 
      AND n.props->>'userId' = $1
    `;

    if (unreadOnly) {
      query += ` AND (n.props->>'read')::boolean = false`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;

    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows.map(this.serializeNotification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    // Verify ownership and type
    const check = await this.pool.query(
      `SELECT n.id, n.props 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Notification' AND n.props->>'userId' = $2`,
      [notificationId, userId]
    );

    if (check.rows.length === 0) return null;

    // Update read status
    const result = await this.pool.query(
      `UPDATE public."Nodes"
       SET props = props || '{"read": true}'::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    return this.serializeNotification(result.rows[0]);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    // Find all unread notifications for user
    const result = await this.pool.query(
      `UPDATE public."Nodes" n
       SET props = props || '{"read": true}'::jsonb, updated_at = NOW()
       FROM public."NodeTypes" nt
       WHERE n.node_type_id = nt.id 
       AND nt.name = 'Notification'
       AND n.props->>'userId' = $1
       AND (n.props->>'read' IS NULL OR (n.props->>'read')::boolean = false)
       RETURNING n.id`,
      [userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'Notification'
       AND n.props->>'userId' = $1
       AND (n.props->>'read' IS NULL OR (n.props->>'read')::boolean = false)`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM public."Nodes" n
       USING public."NodeTypes" nt
       WHERE n.node_type_id = nt.id
       AND nt.name = 'Notification'
       AND n.id = $1 
       AND n.props->>'userId' = $2`,
      [notificationId, userId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Parse @mentions from text
   * Returns array of usernames mentioned
   */
  parseMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Get user IDs from usernames
   */
  async getUserIdsByUsernames(usernames: string[]): Promise<string[]> {
    if (usernames.length === 0) return [];

    // Refactored to use Nodes table with type 'User'
    const result = await this.pool.query(
      `SELECT n.id 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'User'
       AND n.props->>'username' = ANY($1)`,
      [usernames]
    );

    return result.rows.map(row => row.id);
  }
}
