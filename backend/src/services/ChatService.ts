/**
 * Chat Service Implementation
 * Manages real-time chat for graph collaboration
 */

import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessageData {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  graphId: string;
}

export interface ChatServiceConfig {
  pool: Pool;
  pubSub: PubSubEngine;
  redis: Redis;
}

export class ChatService {
  private pool: Pool;
  private pubSub: PubSubEngine;
  private redis: Redis;
  private readonly MAX_MESSAGES = 100; // Store last 100 messages per graph

  constructor(config: ChatServiceConfig) {
    this.pool = config.pool;
    this.pubSub = config.pubSub;
    this.redis = config.redis;
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    graphId: string,
    userId: string,
    message: string
  ): Promise<ChatMessageData> {
    try {
      // Get user details
      const userResult = await this.pool.query(
        'SELECT id, username FROM public."Users" WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const messageId = uuidv4();
      const timestamp = new Date();

      const chatMessage: ChatMessageData = {
        id: messageId,
        userId,
        username: user.username,
        message: message.trim(),
        timestamp,
        graphId
      };

      // Store in Redis sorted set (scored by timestamp)
      const chatKey = `chat:${graphId}`;
      const score = timestamp.getTime();
      await this.redis.zadd(chatKey, score, JSON.stringify(chatMessage));

      // Trim to keep only last MAX_MESSAGES
      const count = await this.redis.zcard(chatKey);
      if (count > this.MAX_MESSAGES) {
        const removeCount = count - this.MAX_MESSAGES;
        await this.redis.zremrangebyrank(chatKey, 0, removeCount - 1);
      }

      // Set expiry on the key (7 days)
      await this.redis.expire(chatKey, 7 * 24 * 60 * 60);

      // Store in database for persistence
      await this.pool.query(
        `INSERT INTO public."ChatMessages"
         (id, graph_id, user_id, message, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [messageId, graphId, userId, message.trim(), timestamp]
      );

      // Publish to subscribers
      await this.pubSub.publish(`CHAT_MESSAGE:${graphId}`, {
        chatMessage
      });

      // Log activity
      await this.logActivity(graphId, userId, 'chat_message');

      return chatMessage;

    } catch (error) {
      console.error('Error in ChatService.sendMessage:', error);
      throw error;
    }
  }

  /**
   * Get recent messages for a graph
   */
  async getRecentMessages(
    graphId: string,
    limit: number = 50
  ): Promise<ChatMessageData[]> {
    try {
      const chatKey = `chat:${graphId}`;

      // Try Redis first
      const messages = await this.redis.zrevrange(chatKey, 0, limit - 1);

      if (messages.length > 0) {
        return messages
          .map(msg => JSON.parse(msg) as ChatMessageData)
          .reverse(); // Return in chronological order
      }

      // Fallback to database
      const result = await this.pool.query(
        `SELECT
          cm.id,
          cm.user_id as "userId",
          u.username,
          cm.message,
          cm.created_at as timestamp,
          cm.graph_id as "graphId"
         FROM public."ChatMessages" cm
         JOIN public."Users" u ON cm.user_id = u.id
         WHERE cm.graph_id = $1
         ORDER BY cm.created_at DESC
         LIMIT $2`,
        [graphId, limit]
      );

      const dbMessages = result.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        username: row.username,
        message: row.message,
        timestamp: row.timestamp,
        graphId: row.graphId
      })).reverse();

      // Repopulate Redis cache
      if (dbMessages.length > 0) {
        const pipeline = this.redis.pipeline();
        dbMessages.forEach(msg => {
          pipeline.zadd(
            chatKey,
            msg.timestamp.getTime(),
            JSON.stringify(msg)
          );
        });
        pipeline.expire(chatKey, 7 * 24 * 60 * 60);
        await pipeline.exec();
      }

      return dbMessages;

    } catch (error) {
      console.error('Error in ChatService.getRecentMessages:', error);
      throw error;
    }
  }

  /**
   * Get messages since a specific timestamp
   */
  async getMessagesSince(
    graphId: string,
    since: Date
  ): Promise<ChatMessageData[]> {
    try {
      const chatKey = `chat:${graphId}`;
      const sinceScore = since.getTime();

      // Get from Redis
      const messages = await this.redis.zrangebyscore(
        chatKey,
        sinceScore,
        '+inf'
      );

      return messages.map(msg => JSON.parse(msg) as ChatMessageData);

    } catch (error) {
      console.error('Error in ChatService.getMessagesSince:', error);
      throw error;
    }
  }

  /**
   * Clear all messages for a graph (admin only)
   */
  async clearChat(graphId: string): Promise<void> {
    try {
      // Clear Redis
      const chatKey = `chat:${graphId}`;
      await this.redis.del(chatKey);

      // Mark messages as deleted in database (soft delete)
      await this.pool.query(
        `UPDATE public."ChatMessages"
         SET deleted_at = NOW()
         WHERE graph_id = $1 AND deleted_at IS NULL`,
        [graphId]
      );

    } catch (error) {
      console.error('Error in ChatService.clearChat:', error);
      throw error;
    }
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Check if user owns the message
      const result = await this.pool.query(
        `SELECT graph_id, user_id FROM public."ChatMessages"
         WHERE id = $1 AND deleted_at IS NULL`,
        [messageId]
      );

      if (result.rows.length === 0) {
        throw new Error('Message not found');
      }

      const message = result.rows[0];

      // Only owner can delete (or could add admin check here)
      if (message.user_id !== userId) {
        throw new Error('Not authorized to delete this message');
      }

      // Soft delete in database
      await this.pool.query(
        `UPDATE public."ChatMessages"
         SET deleted_at = NOW()
         WHERE id = $1`,
        [messageId]
      );

      // Remove from Redis
      const chatKey = `chat:${message.graph_id}`;
      const allMessages = await this.redis.zrange(chatKey, 0, -1);

      for (const msgStr of allMessages) {
        const msg = JSON.parse(msgStr);
        if (msg.id === messageId) {
          await this.redis.zrem(chatKey, msgStr);
          break;
        }
      }

      // Publish deletion event
      await this.pubSub.publish(`CHAT_MESSAGE_DELETED:${message.graph_id}`, {
        messageId,
        userId
      });

      return true;

    } catch (error) {
      console.error('Error in ChatService.deleteMessage:', error);
      throw error;
    }
  }

  /**
   * Get message count for a graph
   */
  async getMessageCount(graphId: string): Promise<number> {
    try {
      const chatKey = `chat:${graphId}`;
      const count = await this.redis.zcard(chatKey);

      if (count > 0) {
        return count;
      }

      // Fallback to database
      const result = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM public."ChatMessages"
         WHERE graph_id = $1 AND deleted_at IS NULL`,
        [graphId]
      );

      return parseInt(result.rows[0].count, 10);

    } catch (error) {
      console.error('Error in ChatService.getMessageCount:', error);
      return 0;
    }
  }

  /**
   * Archive old messages (cleanup job)
   */
  async archiveOldMessages(daysToKeep: number = 30): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE public."ChatMessages"
         SET archived_at = NOW()
         WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
         AND archived_at IS NULL
         RETURNING id`
      );

      return result.rows.length;

    } catch (error) {
      console.error('Error in ChatService.archiveOldMessages:', error);
      return 0;
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Log activity to database
   */
  private async logActivity(
    graphId: string,
    userId: string,
    actionType: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO public."GraphActivity"
         (graph_id, user_id, action_type, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [graphId, userId, actionType]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}

/**
 * Factory function to create chat service
 */
export function createChatService(config: ChatServiceConfig): ChatService {
  return new ChatService(config);
}
