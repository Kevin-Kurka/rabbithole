import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  Int,
  Float,
  InputType,
  Field,
  ObjectType,
  ID,
} from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';

// Subscription topics
const CHALLENGE_CREATED = 'CHALLENGE_CREATED';
const CHALLENGE_UPDATED = 'CHALLENGE_UPDATED';
const CHALLENGE_RESOLVED = 'CHALLENGE_RESOLVED';
const EVIDENCE_SUBMITTED = 'EVIDENCE_SUBMITTED';

/**
 * INPUT TYPES - Toulmin Argumentation Model
 */

@InputType()
class CreateChallengeInput {
  @Field({ nullable: true })
  targetNodeId?: string;

  @Field({ nullable: true })
  targetEdgeId?: string;

  @Field()
  claim!: string; // What is being disputed

  @Field(() => String, { nullable: true })
  grounds?: string; // Evidence/reasoning (can be JSONB in DB)

  @Field({ nullable: true })
  warrant?: string; // Why grounds support claim

  @Field({ nullable: true })
  backing?: string; // Additional support for warrant

  @Field({ nullable: true })
  qualifier?: string; // Degree of certainty

  @Field({ defaultValue: false })
  requestAIResearch?: boolean; // User wants AI to research first
}

@InputType()
class SubmitEvidenceInput {
  @Field()
  challengeId!: string;

  @Field()
  evidenceNodeId!: string;

  @Field()
  side!: string; // 'challenger' | 'defender'

  @Field({ nullable: true })
  role?: string; // 'primary' | 'supporting' | 'rebuttal' | 'expert_opinion'
}

@InputType()
class JoinChallengeInput {
  @Field()
  challengeId!: string;

  @Field()
  side!: string; // 'challenger' | 'defender' | 'neutral'

  @Field()
  contributionType!: string; // 'evidence' | 'analysis' | 'expert_opinion' | 'vote'

  @Field()
  contribution!: string; // The actual contribution (JSONB in DB)
}

@InputType()
class VoteOnChallengeInput {
  @Field()
  challengeId!: string;

  @Field()
  vote!: string; // 'sustain_challenge' | 'dismiss_challenge' | 'partial' | 'needs_more_evidence'

  @Field({ nullable: true })
  reasoning?: string;

  @Field(() => Float, { defaultValue: 1.0 })
  weight?: number; // Based on user expertise/reputation
}

@InputType()
class RebutChallengeInput {
  @Field()
  challengeId!: string;

  @Field()
  rebuttalClaim!: string;

  @Field({ nullable: true })
  rebuttalGrounds?: string;

  @Field({ nullable: true })
  rebuttalWarrant?: string;
}

/**
 * OUTPUT TYPES
 */

@ObjectType()
class Challenge {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field(() => ID)
  challenger_id!: string;

  @Field()
  claim!: string;

  @Field({ nullable: true })
  grounds?: string;

  @Field({ nullable: true })
  warrant?: string;

  @Field({ nullable: true })
  backing?: string;

  @Field({ nullable: true })
  qualifier?: string;

  @Field({ nullable: true })
  rebuttal_claim?: string;

  @Field({ nullable: true })
  rebuttal_grounds?: string;

  @Field({ nullable: true })
  rebuttal_warrant?: string;

  @Field()
  status!: string;

  @Field({ nullable: true })
  resolution?: string;

  @Field({ nullable: true })
  resolution_summary?: string;

  @Field({ nullable: true })
  resolution_reasoning?: string;

  @Field({ nullable: true })
  ai_analysis?: string; // JSONB

  @Field({ nullable: true })
  ai_recommendations?: string; // JSONB

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  resolved_at?: Date;
}

@ObjectType()
class ChallengeEvidence {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field(() => ID)
  evidence_node_id!: string;

  @Field(() => ID)
  submitted_by!: string;

  @Field()
  side!: string;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  ai_fact_check?: string; // JSONB

  @Field()
  created_at!: Date;
}

@ObjectType()
class ChallengeVote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  challenge_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field()
  vote!: string;

  @Field({ nullable: true })
  reasoning?: string;

  @Field(() => Float)
  weight!: number;

  @Field()
  created_at!: Date;
}

/**
 * CHALLENGE RESOLVER
 */

@Resolver(() => Challenge)
export class ChallengeResolver {
  /**
   * QUERIES
   */

  @Query(() => [Challenge])
  async challenges(
    @Arg('targetNodeId', { nullable: true }) targetNodeId?: string,
    @Arg('status', () => [String], { nullable: true }) status?: string[],
    @Arg('limit', () => Int, { defaultValue: 20 }) limit: number = 20,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number = 0,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Challenge[]> {
    let query = 'SELECT * FROM public."Challenges"';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (targetNodeId) {
      conditions.push(`target_node_id = $${paramCount}`);
      params.push(targetNodeId);
      paramCount++;
    }

    if (status && status.length > 0) {
      conditions.push(`status = ANY($${paramCount})`);
      params.push(status);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  @Query(() => Challenge, { nullable: true })
  async challenge(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Challenge | null> {
    const result = await pool.query(
      'SELECT * FROM public."Challenges" WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  @Query(() => [ChallengeEvidence])
  async challengeEvidence(
    @Arg('challengeId', () => ID) challengeId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<ChallengeEvidence[]> {
    const result = await pool.query(
      'SELECT * FROM public."ChallengeEvidence" WHERE challenge_id = $1 ORDER BY created_at ASC',
      [challengeId]
    );
    return result.rows;
  }

  @Query(() => [ChallengeVote])
  async challengeVotes(
    @Arg('challengeId', () => ID) challengeId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<ChallengeVote[]> {
    const result = await pool.query(
      'SELECT * FROM public."ChallengeVotes" WHERE challenge_id = $1 ORDER BY created_at DESC',
      [challengeId]
    );
    return result.rows;
  }

  /**
   * MUTATIONS
   */

  @Mutation(() => Challenge)
  async createChallenge(
    @Arg('input') input: CreateChallengeInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId?: string; pubSub: PubSubEngine }
  ): Promise<Challenge> {
    if (!userId) {
      throw new Error('Authentication required to create challenges');
    }

    // Validate either node or edge is targeted
    if (!input.targetNodeId && !input.targetEdgeId) {
      throw new Error('Must specify either targetNodeId or targetEdgeId');
    }
    if (input.targetNodeId && input.targetEdgeId) {
      throw new Error('Cannot challenge both node and edge simultaneously');
    }

    // Validate target exists
    if (input.targetNodeId) {
      const nodeCheck = await pool.query(
        'SELECT id FROM public."Nodes" WHERE id = $1',
        [input.targetNodeId]
      );
      if (nodeCheck.rows.length === 0) {
        throw new Error('Target node not found');
      }
    }

    if (input.targetEdgeId) {
      const edgeCheck = await pool.query(
        'SELECT id FROM public."Edges" WHERE id = $1',
        [input.targetEdgeId]
      );
      if (edgeCheck.rows.length === 0) {
        throw new Error('Target edge not found');
      }
    }

    // If AI research requested, call AI service first
    let aiAnalysis = null;
    if (input.requestAIResearch) {
      // AI research will be implemented in AIAssistantResolver
      // For now, store request
      aiAnalysis = { research_requested: true, pending: true };
    }

    // Prepare grounds (can be JSONB for structured data)
    const grounds = input.grounds ? { text: input.grounds } : null;

    // Create challenge
    const result = await pool.query(
      `INSERT INTO public."Challenges" (
        target_node_id,
        target_edge_id,
        challenger_id,
        claim,
        grounds,
        warrant,
        backing,
        qualifier,
        status,
        ai_analysis,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      RETURNING *`,
      [
        input.targetNodeId || null,
        input.targetEdgeId || null,
        userId,
        input.claim,
        JSON.stringify(grounds),
        input.warrant,
        input.backing,
        input.qualifier,
        'open',
        JSON.stringify(aiAnalysis)
      ]
    );

    const challenge = result.rows[0];

    // Publish to subscriptions
    await pubSub.publish(CHALLENGE_CREATED, challenge);

    return challenge;
  }

  @Mutation(() => Challenge)
  async submitRebuttal(
    @Arg('input') input: RebutChallengeInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId?: string; pubSub: PubSubEngine }
  ): Promise<Challenge> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get challenge and verify target owner is submitting rebuttal
    const challengeResult = await pool.query(
      'SELECT * FROM public."Challenges" WHERE id = $1',
      [input.challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = challengeResult.rows[0];

    // Check if user is the target owner or has rebuttal permission
    let isTargetOwner = false;
    if (challenge.target_node_id) {
      const nodeOwner = await pool.query(
        'SELECT created_by FROM public."Nodes" WHERE id = $1',
        [challenge.target_node_id]
      );
      isTargetOwner = nodeOwner.rows[0]?.created_by === userId;
    } else if (challenge.target_edge_id) {
      const edgeOwner = await pool.query(
        'SELECT created_by FROM public."Edges" WHERE id = $1',
        [challenge.target_edge_id]
      );
      isTargetOwner = edgeOwner.rows[0]?.created_by === userId;
    }

    if (!isTargetOwner) {
      throw new Error('Only the target owner can submit a rebuttal');
    }

    // Prepare rebuttal grounds
    const rebuttalGrounds = input.rebuttalGrounds ? { text: input.rebuttalGrounds } : null;

    // Update challenge with rebuttal
    const result = await pool.query(
      `UPDATE public."Challenges"
       SET rebuttal_claim = $1,
           rebuttal_grounds = $2,
           rebuttal_warrant = $3,
           status = 'in_review',
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [
        input.rebuttalClaim,
        JSON.stringify(rebuttalGrounds),
        input.rebuttalWarrant,
        input.challengeId
      ]
    );

    const updatedChallenge = result.rows[0];

    // Publish to subscriptions
    await pubSub.publish(CHALLENGE_UPDATED, updatedChallenge);

    return updatedChallenge;
  }

  @Mutation(() => ChallengeEvidence)
  async submitEvidence(
    @Arg('input') input: SubmitEvidenceInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId?: string; pubSub: PubSubEngine }
  ): Promise<ChallengeEvidence> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Validate challenge exists
    const challengeCheck = await pool.query(
      'SELECT id FROM public."Challenges" WHERE id = $1',
      [input.challengeId]
    );
    if (challengeCheck.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    // Validate evidence node exists
    const evidenceCheck = await pool.query(
      'SELECT id FROM public."Nodes" WHERE id = $1',
      [input.evidenceNodeId]
    );
    if (evidenceCheck.rows.length === 0) {
      throw new Error('Evidence node not found');
    }

    // Create evidence submission
    const result = await pool.query(
      `INSERT INTO public."ChallengeEvidence" (
        challenge_id,
        evidence_node_id,
        submitted_by,
        side,
        role,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, now())
      RETURNING *`,
      [
        input.challengeId,
        input.evidenceNodeId,
        userId,
        input.side,
        input.role || 'supporting'
      ]
    );

    const evidence = result.rows[0];

    // Publish to subscriptions
    await pubSub.publish(EVIDENCE_SUBMITTED, evidence);

    return evidence;
  }

  @Mutation(() => Boolean)
  async joinChallenge(
    @Arg('input') input: JoinChallengeInput,
    @Ctx() { pool, userId }: { pool: Pool; userId?: string }
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Parse contribution
    const contribution = { text: input.contribution };

    // Add participant
    await pool.query(
      `INSERT INTO public."ChallengeParticipants" (
        challenge_id,
        user_id,
        side,
        contribution_type,
        contribution,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, now())`,
      [
        input.challengeId,
        userId,
        input.side,
        input.contributionType,
        JSON.stringify(contribution)
      ]
    );

    return true;
  }

  @Mutation(() => ChallengeVote)
  async voteOnChallenge(
    @Arg('input') input: VoteOnChallengeInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId?: string; pubSub: PubSubEngine }
  ): Promise<ChallengeVote> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get user's reputation for vote weighting (if reputation system exists)
    const userRep = await pool.query(
      'SELECT reputation FROM public."Users" WHERE id = $1',
      [userId]
    );
    const weight = input.weight || (userRep.rows[0]?.reputation ? userRep.rows[0].reputation / 100 : 1.0);

    // Insert or update vote
    const result = await pool.query(
      `INSERT INTO public."ChallengeVotes" (
        challenge_id,
        user_id,
        vote,
        reasoning,
        weight,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (challenge_id, user_id)
      DO UPDATE SET
        vote = EXCLUDED.vote,
        reasoning = EXCLUDED.reasoning,
        weight = EXCLUDED.weight,
        created_at = now()
      RETURNING *`,
      [
        input.challengeId,
        userId,
        input.vote,
        input.reasoning,
        weight
      ]
    );

    const vote = result.rows[0];

    return vote;
  }

  @Mutation(() => Challenge)
  async resolveChallenge(
    @Arg('challengeId', () => ID) challengeId: string,
    @Arg('resolution') resolution: string,
    @Arg('summary') summary: string,
    @Arg('reasoning', { nullable: true }) reasoning?: string,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId?: string; pubSub: PubSubEngine }
  ): Promise<Challenge> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get challenge
    const challengeResult = await pool.query(
      'SELECT * FROM public."Challenges" WHERE id = $1',
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    // Calculate vote outcome if resolution is based on votes
    // This would check ChallengeVotes table and determine consensus

    // Update challenge status
    const result = await pool.query(
      `UPDATE public."Challenges"
       SET status = 'resolved',
           resolution = $1,
           resolution_summary = $2,
           resolution_reasoning = $3,
           resolved_at = now(),
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [resolution, summary, reasoning, challengeId]
    );

    const resolvedChallenge = result.rows[0];

    // Update target node credibility
    if (resolvedChallenge.target_node_id) {
      // This will trigger the database function to recalculate credibility
      await pool.query(
        `UPDATE public."Nodes"
         SET weight = calculate_node_credibility($1),
             updated_at = now()
         WHERE id = $1`,
        [resolvedChallenge.target_node_id]
      );
    }

    // Publish to subscriptions
    await pubSub.publish(CHALLENGE_RESOLVED, resolvedChallenge);

    return resolvedChallenge;
  }

  /**
   * SUBSCRIPTIONS
   */

  @Subscription(() => Challenge, {
    topics: CHALLENGE_CREATED
  })
  challengeCreated(
    @Root() challenge: Challenge
  ): Challenge {
    return challenge;
  }

  @Subscription(() => Challenge, {
    topics: CHALLENGE_UPDATED
  })
  challengeUpdated(
    @Root() challenge: Challenge
  ): Challenge {
    return challenge;
  }

  @Subscription(() => Challenge, {
    topics: CHALLENGE_RESOLVED
  })
  challengeResolved(
    @Root() challenge: Challenge
  ): Challenge {
    return challenge;
  }

  @Subscription(() => ChallengeEvidence, {
    topics: EVIDENCE_SUBMITTED
  })
  evidenceSubmitted(
    @Root() evidence: ChallengeEvidence
  ): ChallengeEvidence {
    return evidence;
  }
}
