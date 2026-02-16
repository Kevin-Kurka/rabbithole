import { Redis } from 'ioredis';
import { Graph } from '../types/GraphTypes';

/**
 * Cache configuration for different data types
 */
interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string; // Cache key prefix
}

/**
 * User statistics interface
 */
interface UserStats {
  userId: string;
  totalPoints: number;
  totalContributions: number;
  achievements: number;
  rank?: number;
  level?: number;
}

/**
 * Leaderboard entry interface
 */
interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  rank: number;
}

/**
 * CacheService - Redis-based caching layer for performance optimization
 *
 * Implements multi-layer caching strategy:
 * - Veracity scores: 5 min TTL (frequently accessed, moderate update frequency)
 * - Graph data: 10 min TTL (large objects, infrequent updates)
 * - User stats: 5 min TTL (moderate access, frequent updates)
 * - Leaderboard: 5 min TTL (frequent access, moderate update frequency)
 */
export class CacheService {
  private redis: Redis;

  // Cache configurations
  private static readonly CONFIGS = {
    VERACITY: { ttl: 300, prefix: 'veracity' } as CacheConfig, // 5 minutes
    GRAPH: { ttl: 600, prefix: 'graph' } as CacheConfig, // 10 minutes
    USER_STATS: { ttl: 300, prefix: 'user_stats' } as CacheConfig, // 5 minutes
    LEADERBOARD: { ttl: 300, prefix: 'leaderboard' } as CacheConfig, // 5 minutes
  };

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate cache key with prefix
   */
  private key(config: CacheConfig, id: string): string {
    return `${config.prefix}:${id}`;
  }



  // =================================================================
  // GRAPH DATA CACHING
  // =================================================================

  /**
   * Cache graph data (10 min TTL)
   */
  async cacheGraph(graphId: string, graph: Graph): Promise<void> {
    const key = this.key(CacheService.CONFIGS.GRAPH, graphId);
    await this.redis.setex(
      key,
      CacheService.CONFIGS.GRAPH.ttl,
      JSON.stringify(graph)
    );
  }

  /**
   * Get cached graph data
   */
  async getGraph(graphId: string): Promise<Graph | null> {
    const key = this.key(CacheService.CONFIGS.GRAPH, graphId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as Graph;
    } catch (error) {
      console.error('Error parsing cached graph:', error);
      await this.redis.del(key); // Remove corrupted cache
      return null;
    }
  }

  /**
   * Invalidate graph cache
   * Also invalidates related caches (nodes, edges)
   */
  async invalidateGraph(graphId: string): Promise<void> {
    const key = this.key(CacheService.CONFIGS.GRAPH, graphId);
    await this.redis.del(key);

    // Invalidate related graph list cache
    await this.redis.del('graph:list:all');
  }

  // =================================================================
  // USER STATISTICS CACHING
  // =================================================================

  /**
   * Cache user statistics (5 min TTL)
   */
  async cacheUserStats(userId: string, stats: UserStats): Promise<void> {
    const key = this.key(CacheService.CONFIGS.USER_STATS, userId);
    await this.redis.setex(
      key,
      CacheService.CONFIGS.USER_STATS.ttl,
      JSON.stringify(stats)
    );
  }

  /**
   * Get cached user statistics
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    const key = this.key(CacheService.CONFIGS.USER_STATS, userId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as UserStats;
    } catch (error) {
      console.error('Error parsing cached user stats:', error);
      await this.redis.del(key); // Remove corrupted cache
      return null;
    }
  }

  /**
   * Invalidate user statistics cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const key = this.key(CacheService.CONFIGS.USER_STATS, userId);
    await this.redis.del(key);

    // Also invalidate leaderboard when user stats change
    await this.invalidateLeaderboard();
  }

  // =================================================================
  // LEADERBOARD CACHING
  // =================================================================

  /**
   * Cache leaderboard (5 min TTL)
   */
  async cacheLeaderboard(leaderboard: LeaderboardEntry[]): Promise<void> {
    const key = this.key(CacheService.CONFIGS.LEADERBOARD, 'global');
    await this.redis.setex(
      key,
      CacheService.CONFIGS.LEADERBOARD.ttl,
      JSON.stringify(leaderboard)
    );
  }

  /**
   * Get cached leaderboard
   */
  async getLeaderboard(): Promise<LeaderboardEntry[] | null> {
    const key = this.key(CacheService.CONFIGS.LEADERBOARD, 'global');
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as LeaderboardEntry[];
    } catch (error) {
      console.error('Error parsing cached leaderboard:', error);
      await this.redis.del(key); // Remove corrupted cache
      return null;
    }
  }

  /**
   * Invalidate leaderboard cache
   */
  async invalidateLeaderboard(): Promise<void> {
    const key = this.key(CacheService.CONFIGS.LEADERBOARD, 'global');
    await this.redis.del(key);
  }

  // =================================================================
  // BULK OPERATIONS
  // =================================================================

  /**
   * Invalidate all caches for a specific graph
   * Use when graph structure changes significantly
   */
  async invalidateGraphCascade(graphId: string): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Invalidate graph cache
    pipeline.del(this.key(CacheService.CONFIGS.GRAPH, graphId));

    // Invalidate all veracity scores for nodes in this graph
    // Note: This requires querying nodes first, which is expensive
    // In production, consider using Redis key patterns with SCAN

    await pipeline.exec();
  }

  /**
   * Clear all caches (use sparingly, typically only for maintenance)
   */
  async clearAllCaches(): Promise<void> {
    const keys = await this.redis.keys('*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // =================================================================
  // CACHE STATISTICS
  // =================================================================

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: string;
  }> {
    const info = await this.redis.info('stats');
    const lines = info.split('\r\n');

    let hits = 0;
    let misses = 0;

    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        hits = parseInt(line.split(':')[1]);
      } else if (line.startsWith('keyspace_misses:')) {
        misses = parseInt(line.split(':')[1]);
      }
    }

    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    const memoryInfo = await this.redis.info('memory');
    const memoryLine = memoryInfo.split('\r\n').find(l => l.startsWith('used_memory_human:'));
    const memoryUsage = memoryLine ? memoryLine.split(':')[1] : 'unknown';

    return {
      hits,
      misses,
      hitRate,
      memoryUsage,
    };
  }

  // =================================================================
  // CACHE WARMING
  // =================================================================

  /**
   * Warm cache for frequently accessed data
   * Call this during application startup or maintenance windows
   */
  async warmCache(pool: any): Promise<void> {
    console.log('Warming cache...');

    // Warm up leaderboard
    try {
      // Refactored to use Nodes table with type 'User'
      const leaderboardResult = await pool.query(`
        SELECT
          n.id as user_id,
          n.props->>'username' as username,
          COALESCE((n.props->>'totalPoints')::int, 0) as points,
          ROW_NUMBER() OVER (ORDER BY COALESCE((n.props->>'totalPoints')::int, 0) DESC) as rank
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE nt.name = 'User'
        ORDER BY points DESC
        LIMIT 100
      `);

      await this.cacheLeaderboard(leaderboardResult.rows);
      console.log('Leaderboard cache warmed');
    } catch (error) {
      console.error('Error warming leaderboard cache:', error);
    }

    // Warm up recent graphs
    try {
      // Refactored to use Nodes table with type 'Graph'
      const graphsResult = await pool.query(`
        SELECT 
          n.id,
          n.props->>'name' as name,
          n.props->>'description' as description,
          n.created_at,
          n.updated_at
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE nt.name = 'Graph'
        ORDER BY n.updated_at DESC
        LIMIT 10
      `);

      for (const row of graphsResult.rows) {
        const graph: Graph = {
          id: row.id,
          name: row.name || 'Untitled Graph',
          description: row.description,
          nodes: [],
          edges: [],
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        await this.cacheGraph(graph.id, graph);
      }
      console.log(`Cached ${graphsResult.rows.length} recent graphs`);
    } catch (error) {
      console.error('Error warming graphs cache:', error);
    }

    console.log('Cache warming complete');
  }
}

export { UserStats, LeaderboardEntry };
