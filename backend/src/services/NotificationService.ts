import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { Notification } from '../entities/Notification';

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
  ) {}

  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    data: NotificationData
  ): Promise<Notification> {
    const result = await this.pool.query(
      `INSERT INTO public."Notifications"
       (user_id, type, title, message, entity_type, entity_id, related_user_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.type,
        data.title,
        data.message,
        data.entityType || null,
        data.entityId || null,
        data.relatedUserId || null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );

    const notification = result.rows[0];

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
    const query = unreadOnly
      ? `SELECT * FROM public."Notifications"
         WHERE user_id = $1 AND read = false
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`
      : `SELECT * FROM public."Notifications"
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`;

    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const result = await this.pool.query(
      `UPDATE public."Notifications"
       SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE public."Notifications"
       SET read = true
       WHERE user_id = $1 AND read = false
       RETURNING id`,
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
       FROM public."Notifications"
       WHERE user_id = $1 AND read = false`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM public."Notifications"
       WHERE id = $1 AND user_id = $2`,
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

    const result = await this.pool.query(
      `SELECT id FROM public."Users"
       WHERE username = ANY($1)`,
      [usernames]
    );

    return result.rows.map(row => row.id);
  }
}
