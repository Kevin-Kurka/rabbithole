import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { LeaderboardEntry } from '../entities/LeaderboardEntry';
import { UserStats } from '../entities/UserStats';
import { AchievementService } from '../services/AchievementService';

interface Context {
  pool: Pool;
  redis?: Redis;
  userId?: string; // In a real app, this would come from JWT token
}

@Resolver()
export class GamificationResolver {
  /**
   * Get current user's achievements
   */
  @Query(() => [UserAchievement])
  async myAchievements(@Ctx() { pool, userId }: Context): Promise<UserAchievement[]> {
    // For testing, use a default user if not authenticated
    const currentUserId = userId || await this.getTestUserId(pool);

    const result = await pool.query(
      `SELECT
        ua.id, ua.user_id as "userId", ua.achievement_id as "achievementId", ua.earned_at as "earnedAt", ua.progress,
        a.id as "achievement_id", a.key, a.name, a.description, a.icon, a.category, a.points, a.criteria, a.created_at as "achievement_createdAt"
       FROM public."UserAchievements" ua
       JOIN public."Achievements" a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [currentUserId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      achievementId: row.achievementId,
      earnedAt: row.earnedAt,
      progress: row.progress,
      achievement: {
        id: row.achievement_id,
        key: row.key,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category,
        points: row.points,
        criteria: row.criteria,
        createdAt: row.achievement_createdAt
      }
    }));
  }

  /**
   * Get all available achievements
   */
  @Query(() => [Achievement])
  async allAchievements(@Ctx() { pool }: Context): Promise<Achievement[]> {
    const result = await pool.query(
      `SELECT
        id, key, name, description, icon, category, points, criteria, created_at as "createdAt"
       FROM public."Achievements"
       ORDER BY category, points DESC`
    );

    return result.rows;
  }

  /**
   * Get leaderboard
   */
  @Query(() => [LeaderboardEntry])
  async leaderboard(
    @Arg('category', { nullable: true }) category: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 100 }) limit: number,
    @Ctx() { pool, redis }: Context
  ): Promise<LeaderboardEntry[]> {
    const redisClient = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const achievementService = new AchievementService(pool, redisClient);
    return achievementService.getLeaderboard(category, limit);
  }

  /**
   * Get user stats
   */
  @Query(() => UserStats)
  async userStats(
    @Arg('userId', { nullable: true }) userId: string,
    @Ctx() { pool, redis, userId: contextUserId }: Context
  ): Promise<UserStats> {
    const redisClient = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const targetUserId = userId || contextUserId || await this.getTestUserId(pool);
    const achievementService = new AchievementService(pool, redisClient);
    return achievementService.getUserStats(targetUserId);
  }

  /**
   * Manually claim/check achievements (for testing and manual triggers)
   */
  @Mutation(() => [Achievement])
  async checkMyAchievements(@Ctx() { pool, redis, userId }: Context): Promise<Achievement[]> {
    const redisClient = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const currentUserId = userId || await this.getTestUserId(pool);
    const achievementService = new AchievementService(pool, redisClient);
    return achievementService.checkAchievements(currentUserId);
  }

  /**
   * Award points to a user (admin function, or called by other resolvers)
   */
  @Mutation(() => Boolean)
  async awardPoints(
    @Arg('userId') userId: string,
    @Arg('points', () => Int) points: number,
    @Arg('category') category: string,
    @Ctx() { pool, redis }: Context
  ): Promise<boolean> {
    const redisClient = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const achievementService = new AchievementService(pool, redisClient);
    await achievementService.updateReputation(userId, points, category);

    // Check for newly earned achievements
    await achievementService.checkAchievements(userId);

    return true;
  }

  /**
   * Get achievement progress
   */
  @Query(() => Number)
  async achievementProgress(
    @Arg('achievementKey') achievementKey: string,
    @Arg('userId', { nullable: true }) userId: string,
    @Ctx() { pool, redis, userId: contextUserId }: Context
  ): Promise<number> {
    const redisClient = redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    const targetUserId = userId || contextUserId || await this.getTestUserId(pool);
    const achievementService = new AchievementService(pool, redisClient);
    return achievementService.getProgress(targetUserId, achievementKey);
  }

  /**
   * Helper: Get test user ID (first user in database)
   */
  private async getTestUserId(pool: Pool): Promise<string> {
    const result = await pool.query('SELECT id FROM public."Users" LIMIT 1');
    if (result.rows.length === 0) {
      throw new Error('No users found in database. Please create a user first.');
    }
    return result.rows[0].id;
  }
}
