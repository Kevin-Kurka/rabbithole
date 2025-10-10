/**
 * Presence Service Implementation
 * Manages real-time user presence and cursor tracking
 */

import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import Redis from 'ioredis';
import {
  IPresenceService,
  UserPresenceData,
  CursorPosition,
  Viewport,
  PresenceStatus,
  CollaborationServiceConfig
} from './interfaces';

export class PresenceService implements IPresenceService {
  private pool: Pool;
  private pubSub: PubSubEngine;
  private redis: Redis;
  private readonly PRESENCE_TTL = 60; // 60 seconds TTL
  private readonly HEARTBEAT_INTERVAL = 30; // 30 seconds

  constructor(config: CollaborationServiceConfig) {
    this.pool = config.pool;
    this.pubSub = config.pubSub;
    this.redis = config.redis;

    // Start cleanup job
    this.startCleanupJob();
  }

  /**
   * Track a user joining a graph
   */
  async join(userId: string, graphId: string, sessionId: string): Promise<void> {
    try {
      // Check if user already has a presence record
      const existingPresence = await this.pool.query(
        `SELECT * FROM public."UserPresence"
         WHERE user_id = $1 AND graph_id = $2 AND session_id = $3`,
        [userId, graphId, sessionId]
      );

      if (existingPresence.rows.length === 0) {
        // Create new presence record
        await this.pool.query(
          `INSERT INTO public."UserPresence"
           (user_id, graph_id, session_id, status, last_heartbeat, connected_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [userId, graphId, sessionId, PresenceStatus.ONLINE]
        );
      } else {
        // Update existing record
        await this.pool.query(
          `UPDATE public."UserPresence"
           SET status = $1, last_heartbeat = NOW(), disconnected_at = NULL
           WHERE user_id = $2 AND graph_id = $3 AND session_id = $4`,
          [PresenceStatus.ONLINE, userId, graphId, sessionId]
        );
      }

      // Store in Redis for fast access
      const presenceKey = `presence:${graphId}:${userId}:${sessionId}`;
      await this.redis.setex(
        presenceKey,
        this.PRESENCE_TTL,
        JSON.stringify({
          userId,
          graphId,
          sessionId,
          status: PresenceStatus.ONLINE,
          joinedAt: Date.now()
        })
      );

      // Add to graph's active users set
      await this.redis.sadd(`graph:${graphId}:users`, userId);

      // Get user details for broadcast
      const userResult = await this.pool.query(
        `SELECT id, username, email, display_name, avatar_url
         FROM public."Users" WHERE id = $1`,
        [userId]
      );

      // Broadcast user joined event
      await this.pubSub.publish(`graph:${graphId}:presence`, {
        type: 'user_joined',
        payload: {
          userId,
          sessionId,
          user: userResult.rows[0],
          timestamp: Date.now()
        }
      });

      // Log activity
      await this.logActivity(graphId, userId, 'user_joined');

    } catch (error) {
      console.error('Error in PresenceService.join:', error);
      throw error;
    }
  }

  /**
   * Track a user leaving a graph
   */
  async leave(userId: string, graphId: string, sessionId: string): Promise<void> {
    try {
      // Update database
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET status = $1, disconnected_at = NOW()
         WHERE user_id = $2 AND graph_id = $3 AND session_id = $4`,
        [PresenceStatus.OFFLINE, userId, graphId, sessionId]
      );

      // Remove from Redis
      const presenceKey = `presence:${graphId}:${userId}:${sessionId}`;
      await this.redis.del(presenceKey);

      // Check if user has other active sessions
      const otherSessions = await this.redis.keys(
        `presence:${graphId}:${userId}:*`
      );

      if (otherSessions.length === 0) {
        // Remove from active users set if no other sessions
        await this.redis.srem(`graph:${graphId}:users`, userId);
      }

      // Broadcast user left event
      await this.pubSub.publish(`graph:${graphId}:presence`, {
        type: 'user_left',
        payload: {
          userId,
          sessionId,
          timestamp: Date.now()
        }
      });

      // Log activity
      await this.logActivity(graphId, userId, 'user_left');

    } catch (error) {
      console.error('Error in PresenceService.leave:', error);
      throw error;
    }
  }

  /**
   * Update user's cursor position
   */
  async updateCursor(
    userId: string,
    graphId: string,
    position: CursorPosition
  ): Promise<void> {
    try {
      // Update in database (debounced)
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET cursor_position = $1, last_heartbeat = NOW()
         WHERE user_id = $2 AND graph_id = $3 AND status = 'online'`,
        [JSON.stringify(position), userId, graphId]
      );

      // Update in Redis for real-time access
      const sessions = await this.getUserSessions(userId, graphId);
      for (const session of sessions) {
        const presenceKey = `presence:${graphId}:${userId}:${session}`;
        const data = await this.redis.get(presenceKey);
        if (data) {
          const presence = JSON.parse(data);
          presence.cursorPosition = position;
          await this.redis.setex(
            presenceKey,
            this.PRESENCE_TTL,
            JSON.stringify(presence)
          );
        }
      }

      // Broadcast cursor update (throttled on client)
      await this.pubSub.publish(`graph:${graphId}:cursors`, {
        type: 'cursor_moved',
        payload: {
          userId,
          position,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in PresenceService.updateCursor:', error);
      throw error;
    }
  }

  /**
   * Update user's selection
   */
  async updateSelection(
    userId: string,
    graphId: string,
    nodes: string[],
    edges: string[]
  ): Promise<void> {
    try {
      // Update in database
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET selected_nodes = $1, selected_edges = $2, last_heartbeat = NOW()
         WHERE user_id = $3 AND graph_id = $4 AND status = 'online'`,
        [nodes, edges, userId, graphId]
      );

      // Update in Redis
      const sessions = await this.getUserSessions(userId, graphId);
      for (const session of sessions) {
        const presenceKey = `presence:${graphId}:${userId}:${session}`;
        const data = await this.redis.get(presenceKey);
        if (data) {
          const presence = JSON.parse(data);
          presence.selectedNodes = nodes;
          presence.selectedEdges = edges;
          await this.redis.setex(
            presenceKey,
            this.PRESENCE_TTL,
            JSON.stringify(presence)
          );
        }
      }

      // Broadcast selection update
      await this.pubSub.publish(`graph:${graphId}:selections`, {
        type: 'selection_changed',
        payload: {
          userId,
          selectedNodes: nodes,
          selectedEdges: edges,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in PresenceService.updateSelection:', error);
      throw error;
    }
  }

  /**
   * Update user's viewport
   */
  async updateViewport(
    userId: string,
    graphId: string,
    viewport: Viewport
  ): Promise<void> {
    try {
      // Update in database (debounced)
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET viewport = $1, last_heartbeat = NOW()
         WHERE user_id = $2 AND graph_id = $3 AND status = 'online'`,
        [JSON.stringify(viewport), userId, graphId]
      );

      // Update in Redis
      const sessions = await this.getUserSessions(userId, graphId);
      for (const session of sessions) {
        const presenceKey = `presence:${graphId}:${userId}:${session}`;
        const data = await this.redis.get(presenceKey);
        if (data) {
          const presence = JSON.parse(data);
          presence.viewport = viewport;
          await this.redis.setex(
            presenceKey,
            this.PRESENCE_TTL,
            JSON.stringify(presence)
          );
        }
      }

      // Broadcast viewport update (useful for following feature)
      await this.pubSub.publish(`graph:${graphId}:viewports`, {
        type: 'viewport_changed',
        payload: {
          userId,
          viewport,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in PresenceService.updateViewport:', error);
      throw error;
    }
  }

  /**
   * Process heartbeat from user
   */
  async heartbeat(userId: string, graphId: string, sessionId: string): Promise<void> {
    try {
      // Update heartbeat timestamp
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET last_heartbeat = NOW()
         WHERE user_id = $1 AND graph_id = $2 AND session_id = $3`,
        [userId, graphId, sessionId]
      );

      // Refresh Redis TTL
      const presenceKey = `presence:${graphId}:${userId}:${sessionId}`;
      await this.redis.expire(presenceKey, this.PRESENCE_TTL);

      // Check if status needs to be updated
      const result = await this.pool.query(
        `SELECT status FROM public."UserPresence"
         WHERE user_id = $1 AND graph_id = $2 AND session_id = $3`,
        [userId, graphId, sessionId]
      );

      if (result.rows[0]?.status === PresenceStatus.IDLE) {
        // User is back from idle
        await this.pool.query(
          `UPDATE public."UserPresence"
           SET status = $1
           WHERE user_id = $2 AND graph_id = $3 AND session_id = $4`,
          [PresenceStatus.ONLINE, userId, graphId, sessionId]
        );

        // Broadcast status change
        await this.pubSub.publish(`graph:${graphId}:presence`, {
          type: 'status_changed',
          payload: {
            userId,
            status: PresenceStatus.ONLINE,
            timestamp: Date.now()
          }
        });
      }

    } catch (error) {
      console.error('Error in PresenceService.heartbeat:', error);
      throw error;
    }
  }

  /**
   * Get all active users in a graph
   */
  async getActiveUsers(graphId: string): Promise<UserPresenceData[]> {
    try {
      // Get from database with user details
      const result = await this.pool.query(
        `SELECT
          p.*,
          u.username,
          u.email,
          u.display_name,
          u.avatar_url
         FROM public."UserPresence" p
         JOIN public."Users" u ON p.user_id = u.id
         WHERE p.graph_id = $1
         AND p.status != 'offline'
         AND p.last_heartbeat > NOW() - INTERVAL '2 minutes'
         ORDER BY p.connected_at DESC`,
        [graphId]
      );

      return result.rows.map(row => ({
        userId: row.user_id,
        graphId: row.graph_id,
        sessionId: row.session_id,
        status: row.status as PresenceStatus,
        cursorPosition: row.cursor_position,
        selectedNodes: row.selected_nodes,
        selectedEdges: row.selected_edges,
        viewport: row.viewport,
        lastHeartbeat: row.last_heartbeat,
        user: {
          id: row.user_id,
          username: row.username,
          email: row.email,
          displayName: row.display_name,
          avatarUrl: row.avatar_url
        }
      }));

    } catch (error) {
      console.error('Error in PresenceService.getActiveUsers:', error);
      throw error;
    }
  }

  /**
   * Clean up expired presence records
   */
  async cleanupExpired(): Promise<void> {
    try {
      // Mark users as idle after 1 minute of no heartbeat
      await this.pool.query(
        `UPDATE public."UserPresence"
         SET status = 'idle'
         WHERE status = 'online'
         AND last_heartbeat < NOW() - INTERVAL '1 minute'`
      );

      // Mark users as offline after 2 minutes of no heartbeat
      const offlineResult = await this.pool.query(
        `UPDATE public."UserPresence"
         SET status = 'offline', disconnected_at = NOW()
         WHERE status != 'offline'
         AND last_heartbeat < NOW() - INTERVAL '2 minutes'
         RETURNING user_id, graph_id, session_id`
      );

      // Clean up Redis and broadcast offline events
      for (const row of offlineResult.rows) {
        const presenceKey = `presence:${row.graph_id}:${row.user_id}:${row.session_id}`;
        await this.redis.del(presenceKey);

        // Check if user has other active sessions
        const otherSessions = await this.redis.keys(
          `presence:${row.graph_id}:${row.user_id}:*`
        );

        if (otherSessions.length === 0) {
          await this.redis.srem(`graph:${row.graph_id}:users`, row.user_id);

          // Broadcast user offline
          await this.pubSub.publish(`graph:${row.graph_id}:presence`, {
            type: 'user_offline',
            payload: {
              userId: row.user_id,
              timestamp: Date.now()
            }
          });
        }
      }

    } catch (error) {
      console.error('Error in PresenceService.cleanupExpired:', error);
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Get user's active sessions for a graph
   */
  private async getUserSessions(userId: string, graphId: string): Promise<string[]> {
    const keys = await this.redis.keys(`presence:${graphId}:${userId}:*`);
    return keys.map(key => key.split(':')[3]);
  }

  /**
   * Log activity to database
   */
  private async logActivity(graphId: string, userId: string, actionType: string): Promise<void> {
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

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 30000); // Run every 30 seconds
  }
}

/**
 * Factory function to create presence service
 */
export function createPresenceService(config: CollaborationServiceConfig): IPresenceService {
  return new PresenceService(config);
}