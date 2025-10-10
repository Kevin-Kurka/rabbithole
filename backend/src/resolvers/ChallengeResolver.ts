import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  FieldResolver,
  Int,
  Float,
  Authorized,
  PubSub,
  Publisher,
  Args
} from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';

// Subscription topics
const CHALLENGE_CREATED = 'CHALLENGE_CREATED';
const CHALLENGE_UPDATED = 'CHALLENGE_UPDATED';
const CHALLENGE_RESOLVED = 'CHALLENGE_RESOLVED';
const CHALLENGE_VOTE_ADDED = 'CHALLENGE_VOTE_ADDED';

// Input types (these would be in separate files in production)
class CreateChallengeInput {
  targetNodeId?: string;
  targetEdgeId?: string;
  challengeTypeCode!: string;
  title!: string;
  description!: string;
  severity!: string;
  evidenceIds?: string[];
  supportingSources?: any[];
}

class ChallengeVoteInput {
  challengeId!: string;
  vote!: string; // 'support' | 'reject' | 'abstain'
  confidence?: number;
  reason?: string;
  evidenceEvaluation?: any;
}

@Resolver()
export class ChallengeResolver {
  /**
   * QUERIES
   */

  @Query(() => [Object], { nullable: true })
  async challenges(
    @Arg('status', type => [String], { nullable: true }) status: string[],
    @Arg('limit', type => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', type => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<any[]> {
    let query = `
      SELECT 
        c.*,
        ct.display_name as challenge_type_name,
        ct.type_code,
        u.username as challenger_username,
        ur.reputation_score as challenger_reputation,
        ur.reputation_tier
      FROM public."Challenges" c
      JOIN public."ChallengeTypes" ct ON c.challenge_type_id = ct.id
      JOIN public."Users" u ON c.challenger_id = u.id
      LEFT JOIN public."UserReputation" ur ON c.challenger_id = ur.user_id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (status && status.length > 0) {
      conditions.push(`c.status = ANY($${paramCount})`);
      params.push(status);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  @Query(() => [Object])
  async activeChallenges(
    @Arg('limit', type => Int, { nullable: true, defaultValue: 10 }) limit: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM public."ActiveChallengesView" 
       WHERE status IN ('open', 'voting') 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  @Query(() => Object, { nullable: true })
  async myReputation(
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      `SELECT ur.*, u.username 
       FROM public."UserReputation" ur
       JOIN public."Users" u ON ur.user_id = u.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize reputation for new user
      await pool.query(
        `INSERT INTO public."UserReputation" (user_id) VALUES ($1) 
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      return {
        userId,
        reputationScore: 0,
        reputationTier: 'novice',
        challengesSubmitted: 0,
        challengesAccepted: 0,
        votesCast: 0
      };
    }

    return result.rows[0];
  }

  @Query(() => [Object])
  async reputationLeaderboard(
    @Arg('limit', type => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM public."ChallengeLeaderboard" LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * MUTATIONS
   */

  @Mutation(() => Object)
  async createChallenge(
    @Arg('input') input: CreateChallengeInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Validate either node or edge is targeted
    if (!input.targetNodeId && !input.targetEdgeId) {
      throw new Error('Must specify either targetNodeId or targetEdgeId');
    }
    if (input.targetNodeId && input.targetEdgeId) {
      throw new Error('Cannot challenge both node and edge simultaneously');
    }

    // Check if target is Level 0 (immutable)
    if (input.targetNodeId) {
      const nodeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Nodes" WHERE id = $1',
        [input.targetNodeId]
      );
      if (nodeCheck.rows[0]?.is_level_0) {
        throw new Error('Cannot challenge Level 0 (immutable) nodes');
      }
    }
    if (input.targetEdgeId) {
      const edgeCheck = await pool.query(
        'SELECT is_level_0 FROM public."Edges" WHERE id = $1',
        [input.targetEdgeId]
      );
      if (edgeCheck.rows[0]?.is_level_0) {
        throw new Error('Cannot challenge Level 0 (immutable) edges');
      }
    }

    // Get challenge type
    const typeResult = await pool.query(
      'SELECT * FROM public."ChallengeTypes" WHERE type_code = $1 AND is_active = true',
      [input.challengeTypeCode]
    );
    if (typeResult.rows.length === 0) {
      throw new Error('Invalid challenge type');
    }
    const challengeType = typeResult.rows[0];

    // Check user reputation
    const canChallenge = await pool.query(
      'SELECT can_user_challenge($1, $2) as can_challenge',
      [userId, challengeType.id]
    );
    if (!canChallenge.rows[0].can_challenge) {
      throw new Error(`Insufficient reputation. Required: ${challengeType.min_reputation_required}`);
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create challenge
      const challengeResult = await client.query(
        `INSERT INTO public."Challenges" (
          target_node_id, target_edge_id, challenge_type_id, challenger_id,
          title, description, severity, evidence_ids, supporting_sources,
          status, voting_starts_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'voting', now())
        RETURNING *`,
        [
          input.targetNodeId || null,
          input.targetEdgeId || null,
          challengeType.id,
          userId,
          input.title,
          input.description,
          input.severity || 'medium',
          input.evidenceIds || [],
          JSON.stringify(input.supportingSources || [])
        ]
      );
      const challenge = challengeResult.rows[0];

      // Create evidence links if provided
      if (input.evidenceIds && input.evidenceIds.length > 0) {
        for (const evidenceId of input.evidenceIds) {
          await client.query(
            `INSERT INTO public."ChallengeEvidence" (challenge_id, evidence_id, submitted_by)
             VALUES ($1, $2, $3)`,
            [challenge.id, evidenceId, userId]
          );
        }
      }

      // Create notification for target owner
      if (input.targetNodeId) {
        const nodeOwnerResult = await client.query(
          'SELECT created_by FROM public."Nodes" WHERE id = $1',
          [input.targetNodeId]
        );
        if (nodeOwnerResult.rows[0]?.created_by) {
          await client.query(
            `INSERT INTO public."ChallengeNotifications" 
             (user_id, challenge_id, notification_type, title, message)
             VALUES ($1, $2, 'challenge_created', $3, $4)`,
            [
              nodeOwnerResult.rows[0].created_by,
              challenge.id,
              `Your node has been challenged`,
              `Challenge: ${input.title}`
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Publish to subscriptions
      await pubSub.publish(CHALLENGE_CREATED, challenge);

      return challenge;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Mutation(() => Object)
  async voteOnChallenge(
    @Arg('input') input: ChallengeVoteInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if challenge is in voting period
    const challengeResult = await pool.query(
      `SELECT status, voting_ends_at FROM public."Challenges" WHERE id = $1`,
      [input.challengeId]
    );
    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }
    const challenge = challengeResult.rows[0];
    
    if (challenge.status !== 'voting') {
      throw new Error('Challenge is not in voting period');
    }
    if (new Date(challenge.voting_ends_at) < new Date()) {
      throw new Error('Voting period has ended');
    }

    // Calculate vote weight based on reputation
    const weightResult = await pool.query(
      'SELECT calculate_vote_weight($1) as weight',
      [userId]
    );
    const weight = weightResult.rows[0].weight;

    // Insert or update vote
    const voteResult = await pool.query(
      `INSERT INTO public."ChallengeVotes" 
       (challenge_id, user_id, vote, confidence, reason, evidence_evaluation, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (challenge_id, user_id) 
       DO UPDATE SET 
         vote = EXCLUDED.vote,
         confidence = EXCLUDED.confidence,
         reason = EXCLUDED.reason,
         evidence_evaluation = EXCLUDED.evidence_evaluation,
         weight = EXCLUDED.weight,
         updated_at = now()
       RETURNING *`,
      [
        input.challengeId,
        userId,
        input.vote,
        input.confidence || 0.5,
        input.reason || null,
        JSON.stringify(input.evidenceEvaluation || {}),
        weight
      ]
    );

    const vote = voteResult.rows[0];

    // Publish to subscriptions
    await pubSub.publish(CHALLENGE_VOTE_ADDED, vote);

    return vote;
  }

  @Mutation(() => Object)
  async resolveChallenge(
    @Arg('challengeId') challengeId: string,
    @Arg('resolution') resolution: string,
    @Arg('reason') reason: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if user has authority to resolve
    const authResult = await pool.query(
      `SELECT reputation_tier FROM public."UserReputation" WHERE user_id = $1`,
      [userId]
    );
    if (!['expert', 'authority'].includes(authResult.rows[0]?.reputation_tier)) {
      // If not expert/authority, use automatic resolution
      const autoResolveResult = await pool.query(
        'SELECT resolve_challenge($1, $2, $3) as resolution_id',
        [challengeId, userId, reason]
      );
      return { id: autoResolveResult.rows[0].resolution_id };
    }

    // Manual resolution by moderator
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update challenge
      await client.query(
        `UPDATE public."Challenges" 
         SET status = 'resolved', 
             resolution = $1,
             resolution_reason = $2,
             resolved_by = $3,
             resolved_at = now()
         WHERE id = $4`,
        [resolution, reason, userId, challengeId]
      );

      // Create resolution record
      const resolutionResult = await client.query(
        `INSERT INTO public."ChallengeResolutions" 
         (challenge_id, resolution_type, resolution_summary, resolved_by, resolver_role)
         VALUES ($1, $2, $3, $4, 'moderator')
         RETURNING *`,
        [challengeId, resolution, reason, userId]
      );

      await client.query('COMMIT');

      const resolutionRecord = resolutionResult.rows[0];

      // Publish to subscriptions
      await pubSub.publish(CHALLENGE_RESOLVED, resolutionRecord);

      return resolutionRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * SUBSCRIPTIONS
   */

  @Subscription(() => Object, {
    topics: CHALLENGE_CREATED,
    filter: ({ payload, args }) => {
      if (args.targetNodeId && payload.target_node_id !== args.targetNodeId) {
        return false;
      }
      if (args.targetEdgeId && payload.target_edge_id !== args.targetEdgeId) {
        return false;
      }
      return true;
    }
  })
  challengeCreated(
    @Root() challenge: any,
    @Arg('targetNodeId', { nullable: true }) targetNodeId?: string,
    @Arg('targetEdgeId', { nullable: true }) targetEdgeId?: string
  ): any {
    return challenge;
  }

  @Subscription(() => Object, {
    topics: CHALLENGE_VOTE_ADDED,
    filter: ({ payload, args }) => payload.challenge_id === args.challengeId
  })
  challengeVoteAdded(
    @Root() vote: any,
    @Arg('challengeId') challengeId: string
  ): any {
    return vote;
  }

  @Subscription(() => Object, {
    topics: CHALLENGE_RESOLVED,
    filter: ({ payload, args }) => payload.challenge_id === args.challengeId
  })
  challengeResolved(
    @Root() resolution: any,
    @Arg('challengeId') challengeId: string
  ): any {
    return resolution;
  }
}
