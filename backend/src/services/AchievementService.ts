import { Pool } from 'pg';
import Redis from 'ioredis';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { GamificationReputation } from '../entities/GamificationReputation';
import { LeaderboardEntry } from '../entities/LeaderboardEntry';
import { UserStats } from '../entities/UserStats';
import { ACHIEVEMENTS, getAchievementByKey } from '../config/achievements';

export class AchievementService {
  private pool: Pool;
  private redis: Redis;
  private readonly LEADERBOARD_CACHE_KEY = 'leaderboard';
  private readonly LEADERBOARD_TTL = 300; // 5 minutes

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  /**
   * Check all achievements for a user and award any newly earned ones
   */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    const earnedAchievements: Achievement[] = [];

    // Get user's current metrics
    const metrics = await this.getUserMetrics(userId);

    // Check each achievement
    for (const achievementDef of ACHIEVEMENTS) {
      // Skip if already earned
      const alreadyEarned = await this.hasAchievement(userId, achievementDef.key);
      if (alreadyEarned) continue;

      // Check if criteria is met
      const criteriamet = this.checkCriteria(metrics, achievementDef.criteria);

      if (criteriamet) {
        // Award achievement
        const achievement = await this.awardAchievement(userId, achievementDef.key);
        if (achievement) {
          earnedAchievements.push(achievement);
        }
      } else {
        // Update progress
        await this.updateProgress(userId, achievementDef.key, metrics);
      }
    }

    return earnedAchievements;
  }

  /**
   * Award an achievement to a user
   */
  async awardAchievement(userId: string, achievementKey: string): Promise<Achievement | null> {
    const achievementDef = getAchievementByKey(achievementKey);
    if (!achievementDef) return null;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get achievement from database
      const achievementResult = await client.query(
        'SELECT * FROM public."Achievements" WHERE key = $1',
        [achievementKey]
      );

      if (achievementResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const achievement = achievementResult.rows[0];

      // Check if already earned
      const existingResult = await client.query(
        'SELECT id FROM public."UserAchievements" WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievement.id]
      );

      if (existingResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return achievement;
      }

      // Award achievement
      await client.query(
        `INSERT INTO public."UserAchievements" (user_id, achievement_id, progress)
         VALUES ($1, $2, $3)`,
        [userId, achievement.id, { current: achievementDef.criteria.threshold, total: achievementDef.criteria.threshold }]
      );

      // Update reputation points
      await this.updateReputation(userId, achievementDef.points, achievementDef.category, client);

      await client.query('COMMIT');

      // Invalidate leaderboard cache
      await this.invalidateLeaderboardCache();

      return achievement;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error awarding achievement:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get progress towards an achievement
   */
  async getProgress(userId: string, achievementKey: string): Promise<number> {
    const achievementDef = getAchievementByKey(achievementKey);
    if (!achievementDef) return 0;

    const result = await this.pool.query(
      `SELECT ua.progress
       FROM public."UserAchievements" ua
       JOIN public."Achievements" a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND a.key = $2`,
      [userId, achievementKey]
    );

    if (result.rows.length === 0) {
      // No progress yet, calculate from metrics
      const metrics = await this.getUserMetrics(userId);
      const current = metrics[achievementDef.criteria.metric] || 0;
      return Math.min(current / achievementDef.criteria.threshold, 1.0);
    }

    const progress = result.rows[0].progress;
    if (!progress || !progress.current || !progress.total) return 0;

    return Math.min(progress.current / progress.total, 1.0);
  }

  /**
   * Update user reputation points
   */
  async updateReputation(
    userId: string,
    points: number,
    category: string,
    client?: Pool | any
  ): Promise<void> {
    const conn = client || this.pool;

    // Ensure user has a reputation record
    await conn.query(
      `INSERT INTO public."UserReputation" (user_id, total_points, evidence_points, methodology_points, consensus_points, collaboration_points, level)
       VALUES ($1, 0, 0, 0, 0, 0, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Update points
    const categoryField = `${category}_points`;
    await conn.query(
      `UPDATE public."UserReputation"
       SET total_points = total_points + $1,
           ${categoryField} = ${categoryField} + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [points, userId]
    );

    // Invalidate leaderboard cache
    await this.invalidateLeaderboardCache();
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(category?: string, limit: number = 100): Promise<LeaderboardEntry[]> {
    const cacheKey = category ? `${this.LEADERBOARD_CACHE_KEY}:${category}` : this.LEADERBOARD_CACHE_KEY;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build query
    let query = `
      SELECT
        u.id, u.username, u.email, u.created_at as "createdAt",
        ur.total_points as "totalPoints",
        ur.evidence_points as "evidencePoints",
        ur.methodology_points as "methodologyPoints",
        ur.consensus_points as "consensusPoints",
        ur.collaboration_points as "collaborationPoints",
        ur.level,
        RANK() OVER (ORDER BY ur.total_points DESC) as rank
      FROM public."UserReputation" ur
      JOIN public."Users" u ON ur.user_id = u.id
    `;

    if (category) {
      query += ` ORDER BY ur.${category}_points DESC, ur.total_points DESC`;
    } else {
      query += ` ORDER BY ur.total_points DESC`;
    }

    query += ` LIMIT $1`;

    const result = await this.pool.query(query, [limit]);

    const leaderboard: LeaderboardEntry[] = result.rows.map(row => ({
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        createdAt: row.createdAt
      },
      totalPoints: row.totalPoints,
      evidencePoints: row.evidencePoints,
      methodologyPoints: row.methodologyPoints,
      consensusPoints: row.consensusPoints,
      collaborationPoints: row.collaborationPoints,
      level: row.level,
      rank: parseInt(row.rank)
    }));

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, this.LEADERBOARD_TTL, JSON.stringify(leaderboard));

    return leaderboard;
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // Get reputation
    const repResult = await this.pool.query(
      `SELECT * FROM public."UserReputation" WHERE user_id = $1`,
      [userId]
    );

    const reputation = repResult.rows[0] || {
      total_points: 0,
      evidence_points: 0,
      methodology_points: 0,
      consensus_points: 0,
      collaboration_points: 0,
      level: 1
    };

    // Get achievements
    const achievementsResult = await this.pool.query(
      `SELECT
        ua.id, ua.user_id as "userId", ua.achievement_id as "achievementId", ua.earned_at as "earnedAt", ua.progress,
        a.id as "achievement_id", a.key, a.name, a.description, a.icon, a.category, a.points, a.criteria, a.created_at as "achievement_createdAt"
       FROM public."UserAchievements" ua
       JOIN public."Achievements" a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [userId]
    );

    const achievements: UserAchievement[] = achievementsResult.rows.map(row => ({
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

    return {
      totalPoints: reputation.total_points,
      level: reputation.level,
      achievements,
      categoryBreakdown: {
        evidence: reputation.evidence_points,
        methodology: reputation.methodology_points,
        consensus: reputation.consensus_points,
        collaboration: reputation.collaboration_points
      }
    };
  }

  /**
   * Helper: Check if user has achievement
   */
  private async hasAchievement(userId: string, achievementKey: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT ua.id
       FROM public."UserAchievements" ua
       JOIN public."Achievements" a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND a.key = $2`,
      [userId, achievementKey]
    );

    return result.rows.length > 0;
  }

  /**
   * Helper: Get user metrics for achievement checking
   */
  private async getUserMetrics(userId: string): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Evidence submitted
    const evidenceResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."Evidence" WHERE submitted_by = $1`,
      [userId]
    );
    metrics.evidence_submitted = parseInt(evidenceResult.rows[0]?.count || '0');

    // High veracity nodes (0.9+)
    const highVeracityResult = await this.pool.query(
      `SELECT COUNT(DISTINCT n.id) as count
       FROM public."Nodes" n
       JOIN public."VeracityScores" vs ON vs.target_node_id = n.id
       WHERE n.created_by = $1 AND vs.final_score >= 0.9`,
      [userId]
    );
    metrics.high_veracity_nodes = parseInt(highVeracityResult.rows[0]?.count || '0');

    // Level 0 contributions
    const level0Result = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."Nodes" WHERE created_by = $1 AND is_level_0 = true`,
      [userId]
    );
    metrics.level0_contributions = parseInt(level0Result.rows[0]?.count || '0');

    // Methodologies completed
    const methodologyResult = await this.pool.query(
      `SELECT COUNT(DISTINCT methodology_id) as count
       FROM public."UserMethodologyProgress"
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    metrics.methodologies_completed = parseInt(methodologyResult.rows[0]?.count || '0');

    // Graphs created
    const graphsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."Graphs" WHERE created_by = $1`,
      [userId]
    );
    metrics.graphs_created = parseInt(graphsResult.rows[0]?.count || '0');

    // Process validations
    const validationsResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."ConsensusVotes" WHERE user_id = $1`,
      [userId]
    );
    metrics.process_validations = parseInt(validationsResult.rows[0]?.count || '0');

    // Challenges submitted
    const challengesResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."Challenges" WHERE created_by = $1`,
      [userId]
    );
    metrics.challenges_submitted = parseInt(challengesResult.rows[0]?.count || '0');

    // Challenges resolved
    const resolvedResult = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM public."ChallengeResolutions"
       WHERE resolved_by = $1 AND status = 'resolved'`,
      [userId]
    );
    metrics.challenges_resolved = parseInt(resolvedResult.rows[0]?.count || '0');

    // Chat messages sent
    const chatResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."ChatMessages" WHERE sender_id = $1`,
      [userId]
    );
    metrics.chat_messages_sent = parseInt(chatResult.rows[0]?.count || '0');

    // Users helped (simplified: count of distinct users they've chatted with)
    const helpedResult = await this.pool.query(
      `SELECT COUNT(DISTINCT c.user_id) as count
       FROM public."ChatMessages" cm
       JOIN public."Conversations" c ON cm.conversation_id = c.id
       WHERE cm.sender_id = $1 AND c.user_id != $1`,
      [userId]
    );
    metrics.users_helped = parseInt(helpedResult.rows[0]?.count || '0');

    return metrics;
  }

  /**
   * Helper: Check if criteria is met
   */
  private checkCriteria(metrics: Record<string, number>, criteria: any): boolean {
    const metricValue = metrics[criteria.metric] || 0;
    const threshold = criteria.threshold;
    const operator = criteria.operator || 'gte';

    switch (operator) {
      case 'gte':
        return metricValue >= threshold;
      case 'lte':
        return metricValue <= threshold;
      case 'eq':
        return metricValue === threshold;
      default:
        return false;
    }
  }

  /**
   * Helper: Update achievement progress
   */
  private async updateProgress(userId: string, achievementKey: string, metrics: Record<string, number>): Promise<void> {
    const achievementDef = getAchievementByKey(achievementKey);
    if (!achievementDef) return;

    const current = metrics[achievementDef.criteria.metric] || 0;
    const total = achievementDef.criteria.threshold;

    // Get achievement ID
    const achResult = await this.pool.query(
      'SELECT id FROM public."Achievements" WHERE key = $1',
      [achievementKey]
    );

    if (achResult.rows.length === 0) return;
    const achievementId = achResult.rows[0].id;

    // Update or insert progress
    await this.pool.query(
      `INSERT INTO public."UserAchievements" (user_id, achievement_id, progress, earned_at)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (user_id, achievement_id)
       DO UPDATE SET progress = $3`,
      [userId, achievementId, { current, total }]
    );
  }

  /**
   * Helper: Invalidate leaderboard cache
   */
  private async invalidateLeaderboardCache(): Promise<void> {
    const keys = await this.redis.keys(`${this.LEADERBOARD_CACHE_KEY}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Initialize user reputation (called when user registers)
   */
  async initializeUserReputation(userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO public."UserReputation" (user_id, total_points, evidence_points, methodology_points, consensus_points, collaboration_points, level)
       VALUES ($1, 0, 0, 0, 0, 0, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  }
}
