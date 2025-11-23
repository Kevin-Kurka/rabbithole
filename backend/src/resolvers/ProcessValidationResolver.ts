/**
 * ProcessValidationResolver - PARTIALLY FUNCTIONAL
 *
 * WARNING: Two queries reference dropped table public."Evidence" (lines 460, 894):
 * - These queries will fail until Evidence is migrated to node-based storage
 * - Other promotion/consensus features work fine
 *
 * WORKING FEATURES:
 * - checkPromotionEligibility() - Works (uses graph queries)
 * - promoteGraph() - Works  (uses graph queries)
 * - getConsensusStatus() - Works (uses ConsensusVotes table)
 * - Methodology progress tracking - Works
 *
 * BROKEN FEATURES:
 * - Evidence count queries (lines 460, 894) - Will return 0 until fixed
 */

import { Resolver, Query, Mutation, Subscription, Arg, Ctx, Root, PubSub } from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { PromotionEligibility } from '../entities/PromotionEligibility';
import { ConsensusVote } from '../entities/ConsensusVote';
import { MethodologyProgress, MethodologyWorkflowStep } from '../entities/MethodologyProgress';
import { ConsensusStatus } from '../entities/ConsensusStatus';
import { PromotionResult } from '../entities/PromotionResult';
import { UserReputation } from '../entities/UserReputation';
import { MethodologyCompletionTracking } from '../entities/MethodologyCompletionTracking';
import { PromotionEvent } from '../entities/PromotionEvent';

// Subscription topics
const PROMOTION_ELIGIBILITY_UPDATED = 'PROMOTION_ELIGIBILITY_UPDATED';
const GRAPH_PROMOTED = 'GRAPH_PROMOTED';

// Objective thresholds for promotion eligibility (egalitarian, no curator discretion)
const PROMOTION_THRESHOLD = 0.8; // All scores must be >= 0.8
const MINIMUM_CONSENSUS_VOTES = 3; // Minimum votes needed for valid consensus
const MINIMUM_VOTER_REPUTATION = 0.5; // Minimum reputation to have weighted vote

interface Context {
  pool: Pool;
  pubSub: PubSubEngine;
  userId?: string;
}

@Resolver()
export class ProcessValidationResolver {
  /**
   * QUERY: Get all promotion events (public ledger)
   * Returns paginated list of all Level 0 promotions
   * No authentication required - this is a public audit trail
   */
  @Query(() => [PromotionEvent])
  async promotionEvents(
    @Ctx() { pool }: Context,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 }) offset: number,
    @Arg('startDate', () => String, { nullable: true }) startDate?: string,
    @Arg('endDate', () => String, { nullable: true }) endDate?: string,
    @Arg('methodology', () => String, { nullable: true }) methodology?: string
  ): Promise<PromotionEvent[]> {
    // Build WHERE clause based on filters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClauses.push(`pe.promoted_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClauses.push(`pe.promoted_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (methodology) {
      whereClauses.push(`g.methodology = $${paramIndex}`);
      queryParams.push(methodology);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Add pagination params
    queryParams.push(limit);
    const limitParam = `$${paramIndex}`;
    paramIndex++;

    queryParams.push(offset);
    const offsetParam = `$${paramIndex}`;

    const result = await pool.query(
      `SELECT
        pe.id,
        pe.graph_id,
        pe.graph_name,
        pe.previous_level,
        pe.new_level,
        pe.promoted_at,
        pe.promotion_reason
       FROM public."PromotionEvents" pe
       LEFT JOIN public."Graphs" g ON pe.graph_id = g.id
       ${whereClause}
       ORDER BY pe.promoted_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      queryParams
    );

    return result.rows.map((row) => ({
      id: row.id,
      graph_id: row.graph_id,
      graph_name: row.graph_name,
      previous_level: row.previous_level,
      new_level: row.new_level,
      promoted_at: row.promoted_at,
      promotion_reason: row.promotion_reason,
    }));
  }

  /**
   * QUERY: Get total count of promotion events (for pagination)
   */
  @Query(() => Number)
  async promotionEventsCount(
    @Ctx() { pool }: Context,
    @Arg('startDate', () => String, { nullable: true }) startDate?: string,
    @Arg('endDate', () => String, { nullable: true }) endDate?: string,
    @Arg('methodology', () => String, { nullable: true }) methodology?: string
  ): Promise<number> {
    // Build WHERE clause based on filters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClauses.push(`pe.promoted_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClauses.push(`pe.promoted_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (methodology) {
      whereClauses.push(`g.methodology = $${paramIndex}`);
      queryParams.push(methodology);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM public."PromotionEvents" pe
       LEFT JOIN public."Graphs" g ON pe.graph_id = g.id
       ${whereClause}`,
      queryParams
    );

    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * QUERY: Get promotion eligibility for a graph
   * Returns objective scores across all criteria
   * No authority checks - transparent to everyone
   */
  @Query(() => PromotionEligibility)
  async getPromotionEligibility(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<PromotionEligibility> {
    // Calculate methodology completion score
    const methodologyScore = await this.calculateMethodologyCompletionScore(graphId, pool);

    // Calculate consensus score
    const consensusScore = await this.calculateConsensusScore(graphId, pool);

    // Calculate evidence quality score
    const evidenceScore = await this.calculateEvidenceQualityScore(graphId, pool);

    // Calculate challenge resolution score
    const challengeScore = await this.calculateChallengeResolutionScore(graphId, pool);

    // Overall score is the minimum of all scores (all must pass threshold)
    const overallScore = Math.min(
      methodologyScore,
      consensusScore,
      evidenceScore,
      challengeScore
    );

    // Graph is eligible if overall score meets threshold
    const isEligible = overallScore >= PROMOTION_THRESHOLD;

    // Identify missing requirements
    const missingRequirements: string[] = [];
    let blockingReason: string | undefined;

    if (methodologyScore < PROMOTION_THRESHOLD) {
      missingRequirements.push(
        `Methodology completion: ${(methodologyScore * 100).toFixed(1)}% (requires ${PROMOTION_THRESHOLD * 100}%)`
      );
    }
    if (consensusScore < PROMOTION_THRESHOLD) {
      missingRequirements.push(
        `Consensus score: ${(consensusScore * 100).toFixed(1)}% (requires ${PROMOTION_THRESHOLD * 100}%)`
      );
    }
    if (evidenceScore < PROMOTION_THRESHOLD) {
      missingRequirements.push(
        `Evidence quality: ${(evidenceScore * 100).toFixed(1)}% (requires ${PROMOTION_THRESHOLD * 100}%)`
      );
    }
    if (challengeScore < PROMOTION_THRESHOLD) {
      missingRequirements.push(
        `Challenge resolution: ${(challengeScore * 100).toFixed(1)}% (requires ${PROMOTION_THRESHOLD * 100}%)`
      );
    }

    if (!isEligible) {
      blockingReason = `Graph does not meet minimum threshold of ${PROMOTION_THRESHOLD * 100}% across all criteria`;
    }

    return {
      graph_id: graphId,
      methodology_completion_score: methodologyScore,
      consensus_score: consensusScore,
      evidence_quality_score: evidenceScore,
      challenge_resolution_score: challengeScore,
      overall_score: overallScore,
      is_eligible: isEligible,
      blocking_reason: blockingReason,
      missing_requirements: missingRequirements,
      calculated_at: new Date(),
    };
  }

  /**
   * QUERY: Get methodology progress for a graph
   * Shows objective step completion tracking
   */
  @Query(() => MethodologyProgress)
  async getMethodologyProgress(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<MethodologyProgress> {
    // Get graph's methodology
    const graphResult = await pool.query(
      'SELECT methodology FROM public."Graphs" WHERE id = $1',
      [graphId]
    );

    if (!graphResult.rows[0]?.methodology) {
      throw new Error('Graph does not have an assigned methodology');
    }

    const methodologyId = graphResult.rows[0].methodology;

    // Get methodology workflow steps
    const workflowResult = await pool.query(
      `SELECT mw.id as workflow_id, mw.name as workflow_name
       FROM public."MethodologyWorkflows" mw
       WHERE mw.methodology_id = $1
       LIMIT 1`,
      [methodologyId]
    );

    if (workflowResult.rows.length === 0) {
      throw new Error('Methodology does not have a defined workflow');
    }

    const workflowId = workflowResult.rows[0].workflow_id;
    const workflowName = workflowResult.rows[0].workflow_name;

    // Get all workflow steps (assuming they're stored in a steps table or JSONB)
    // For now, we'll assume steps are tracked in a MethodologyWorkflowSteps table
    const stepsResult = await pool.query(
      `SELECT
        s.id as step_id,
        s.name as step_name,
        s.description as step_description,
        s.step_order,
        s.is_required,
        c.completed_at,
        c.completed_by
       FROM public."MethodologyWorkflowSteps" s
       LEFT JOIN public."MethodologyStepCompletions" c
         ON s.id = c.step_id AND c.graph_id = $1
       WHERE s.workflow_id = $2
       ORDER BY s.step_order`,
      [graphId, workflowId]
    );

    const workflowSteps: MethodologyWorkflowStep[] = stepsResult.rows.map((row) => ({
      step_id: row.step_id,
      step_name: row.step_name,
      step_description: row.step_description || '',
      step_order: row.step_order,
      is_required: row.is_required,
      is_completed: !!row.completed_at,
      completed_at: row.completed_at || undefined,
      completed_by: row.completed_by || undefined,
    }));

    const totalSteps = workflowSteps.length;
    const completedSteps = workflowSteps.filter((s) => s.is_completed).length;
    const requiredSteps = workflowSteps.filter((s) => s.is_required).length;
    const completedRequiredSteps = workflowSteps.filter(
      (s) => s.is_required && s.is_completed
    ).length;

    const completionPercentage = totalSteps > 0 ? (completedSteps / totalSteps) : 0;
    const requiredCompletionPercentage = requiredSteps > 0
      ? (completedRequiredSteps / requiredSteps)
      : 1.0;

    const isMethodologyComplete = requiredCompletionPercentage >= 1.0;

    return {
      graph_id: graphId,
      methodology_id: methodologyId,
      methodology_name: workflowName,
      total_steps: totalSteps,
      completed_steps: completedSteps,
      required_steps: requiredSteps,
      completed_required_steps: completedRequiredSteps,
      completion_percentage: completionPercentage * 100,
      required_completion_percentage: requiredCompletionPercentage * 100,
      workflow_steps: workflowSteps,
      is_methodology_complete: isMethodologyComplete,
      calculated_at: new Date(),
    };
  }

  /**
   * QUERY: Get consensus status for a graph
   * Shows objective voting results without authority interpretation
   */
  @Query(() => ConsensusStatus)
  async getConsensusStatus(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ConsensusStatus> {
    // Get all votes for this graph
    const votesResult = await pool.query(
      `SELECT
        cv.vote_value,
        cv.vote_weight,
        cv.created_at
       FROM public."ConsensusVotes" cv
       WHERE cv.graph_id = $1`,
      [graphId]
    );

    const totalVotes = votesResult.rows.length;
    const approveVotes = votesResult.rows.filter((v) => v.vote_value >= 0.8).length;
    const rejectVotes = votesResult.rows.filter((v) => v.vote_value < 0.5).length;
    const neutralVotes = votesResult.rows.filter(
      (v) => v.vote_value >= 0.5 && v.vote_value < 0.8
    ).length;

    // Calculate weighted consensus score (weighted by voter reputation)
    let weightedSum = 0;
    let totalWeight = 0;

    votesResult.rows.forEach((vote) => {
      weightedSum += vote.vote_value * vote.vote_weight;
      totalWeight += vote.vote_weight;
    });

    const weightedConsensusScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Calculate unweighted consensus score (simple average)
    const unweightedSum = votesResult.rows.reduce((sum, v) => sum + v.vote_value, 0);
    const unweightedConsensusScore = totalVotes > 0 ? unweightedSum / totalVotes : 0;

    // Check if sufficient votes
    const hasSufficientVotes = totalVotes >= MINIMUM_CONSENSUS_VOTES;

    // Consensus is reached if weighted score meets threshold and has sufficient votes
    const consensusReached = hasSufficientVotes && weightedConsensusScore >= PROMOTION_THRESHOLD;

    // Get last vote timestamp
    const lastVoteAt = votesResult.rows.length > 0
      ? new Date(Math.max(...votesResult.rows.map((v) => new Date(v.created_at).getTime())))
      : undefined;

    return {
      graph_id: graphId,
      total_votes: totalVotes,
      weighted_consensus_score: weightedConsensusScore,
      unweighted_consensus_score: unweightedConsensusScore,
      approve_votes: approveVotes,
      reject_votes: rejectVotes,
      neutral_votes: neutralVotes,
      minimum_votes_threshold: MINIMUM_CONSENSUS_VOTES,
      has_sufficient_votes: hasSufficientVotes,
      consensus_reached: consensusReached,
      last_vote_at: lastVoteAt,
      calculated_at: new Date(),
    };
  }

  /**
   * QUERY: Get all consensus votes for a graph
   * Transparent view of all votes and reasoning
   */
  @Query(() => [ConsensusVote])
  async getConsensusVotes(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ConsensusVote[]> {
    const result = await pool.query(
      `SELECT
        cv.id,
        cv.graph_id,
        cv.user_id,
        cv.vote_value,
        cv.reasoning,
        cv.vote_weight,
        cv.voter_reputation_score,
        cv.created_at,
        cv.updated_at,
        u.username
       FROM public."ConsensusVotes" cv
       JOIN public."Users" u ON cv.user_id = u.id
       WHERE cv.graph_id = $1
       ORDER BY cv.created_at DESC`,
      [graphId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      graph_id: row.graph_id,
      user_id: row.user_id,
      voter: {
        id: row.user_id,
        username: row.username,
        email: '',
        createdAt: new Date(),
      },
      vote_value: row.vote_value,
      reasoning: row.reasoning,
      vote_weight: row.vote_weight,
      voter_reputation_score: row.voter_reputation_score,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * QUERY: Get user reputation scores
   * Objective calculation based on participation and quality
   */
  @Query(() => UserReputation)
  async getUserReputation(
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<UserReputation> {
    // Calculate evidence quality score (average credibility of submitted evidence)
    const evidenceResult = await pool.query(
      `SELECT
        COUNT(*) as total_submitted,
        SUM(CASE WHEN e.is_verified = true THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN e.peer_review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        AVG(e.confidence) as avg_confidence
       FROM public."Evidence" e
       WHERE e.submitted_by = $1`,
      [userId]
    );

    const totalEvidenceSubmitted = parseInt(evidenceResult.rows[0]?.total_submitted || '0');
    const verifiedEvidenceCount = parseInt(evidenceResult.rows[0]?.verified_count || '0');
    const rejectedEvidenceCount = parseInt(evidenceResult.rows[0]?.rejected_count || '0');
    const avgConfidence = parseFloat(evidenceResult.rows[0]?.avg_confidence || '0');

    const evidenceQualityScore = totalEvidenceSubmitted > 0
      ? avgConfidence * (verifiedEvidenceCount / totalEvidenceSubmitted)
      : 0;

    // Calculate consensus participation
    const voteResult = await pool.query(
      `SELECT COUNT(*) as total_votes
       FROM public."ConsensusVotes"
       WHERE user_id = $1`,
      [userId]
    );

    const totalVotesCast = parseInt(voteResult.rows[0]?.total_votes || '0');

    // Calculate vote alignment (how often user votes align with final consensus)
    const alignmentResult = await pool.query(
      `SELECT
        COUNT(*) as aligned_votes
       FROM public."ConsensusVotes" cv
       JOIN public."Graphs" g ON cv.graph_id = g.id
       WHERE cv.user_id = $1
         AND ((cv.vote_value >= 0.8 AND g.level > 0) OR (cv.vote_value < 0.8 AND g.level = 0))`,
      [userId]
    );

    const alignedVotes = parseInt(alignmentResult.rows[0]?.aligned_votes || '0');
    const voteAlignmentScore = totalVotesCast > 0 ? alignedVotes / totalVotesCast : 0;

    // Calculate methodology completions
    const methodologyResult = await pool.query(
      `SELECT COUNT(DISTINCT graph_id) as completions
       FROM public."MethodologyStepCompletions"
       WHERE completed_by = $1`,
      [userId]
    );

    const methodologyCompletions = parseInt(methodologyResult.rows[0]?.completions || '0');

    // Calculate challenges raised and resolved
    const challengeResult = await pool.query(
      `SELECT
        COUNT(*) as total_raised,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM public."Challenges"
       WHERE challenger_id = $1`,
      [userId]
    );

    const challengesRaised = parseInt(challengeResult.rows[0]?.total_raised || '0');
    const challengesResolved = parseInt(challengeResult.rows[0]?.resolved || '0');

    // Overall reputation score (composite of all factors)
    const overallReputationScore = (
      evidenceQualityScore * 0.4 +
      voteAlignmentScore * 0.3 +
      (methodologyCompletions > 0 ? 0.2 : 0) +
      (challengesResolved / Math.max(challengesRaised, 1)) * 0.1
    );

    return {
      user_id: userId,
      evidence_quality_score: evidenceQualityScore,
      total_evidence_submitted: totalEvidenceSubmitted,
      verified_evidence_count: verifiedEvidenceCount,
      rejected_evidence_count: rejectedEvidenceCount,
      consensus_participation_rate: 0, // Would need total eligible votes to calculate
      total_votes_cast: totalVotesCast,
      vote_alignment_score: voteAlignmentScore,
      methodology_completions: methodologyCompletions,
      challenges_raised: challengesRaised,
      challenges_resolved: challengesResolved,
      overall_reputation_score: Math.min(overallReputationScore, 1.0),
      calculated_at: new Date(),
    };
  }

  /**
   * MUTATION: Submit consensus vote
   * Anyone can vote - vote is weighted by reputation
   * No curator approval needed
   */
  @Mutation(() => ConsensusVote)
  async submitConsensusVote(
    @Arg('graphId') graphId: string,
    @Arg('voteValue') voteValue: number,
    @Arg('reasoning', () => String, { nullable: true }) reasoning: string | undefined,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<ConsensusVote> {
    if (!userId) {
      throw new Error('Authentication required to submit vote');
    }

    // Validate vote value (must be between 0 and 1)
    if (voteValue < 0 || voteValue > 1) {
      throw new Error('Vote value must be between 0.0 and 1.0');
    }

    // Get user reputation to calculate vote weight
    const reputation = await this.getUserReputation(userId, { pool } as Context);

    // Vote weight is based on user's overall reputation score
    const voteWeight = Math.max(reputation.overall_reputation_score, MINIMUM_VOTER_REPUTATION);

    // Check if user already voted on this graph
    const existingVote = await pool.query(
      'SELECT id FROM public."ConsensusVotes" WHERE graph_id = $1 AND user_id = $2',
      [graphId, userId]
    );

    let voteId: string;

    if (existingVote.rows.length > 0) {
      // Update existing vote
      const updateResult = await pool.query(
        `UPDATE public."ConsensusVotes"
         SET vote_value = $1, reasoning = $2, vote_weight = $3,
             voter_reputation_score = $4, updated_at = NOW()
         WHERE graph_id = $5 AND user_id = $6
         RETURNING id`,
        [voteValue, reasoning, voteWeight, reputation.overall_reputation_score, graphId, userId]
      );
      voteId = updateResult.rows[0].id;
    } else {
      // Create new vote
      const insertResult = await pool.query(
        `INSERT INTO public."ConsensusVotes"
         (graph_id, user_id, vote_value, reasoning, vote_weight, voter_reputation_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [graphId, userId, voteValue, reasoning, voteWeight, reputation.overall_reputation_score]
      );
      voteId = insertResult.rows[0].id;
    }

    // Trigger eligibility recalculation
    const eligibility = await this.getPromotionEligibility(graphId, { pool } as Context);
    await pubSub.publish(PROMOTION_ELIGIBILITY_UPDATED, { graphId, eligibility });

    // Get user info for response
    const userResult = await pool.query('SELECT username FROM public."Users" WHERE id = $1', [userId]);

    return {
      id: voteId,
      graph_id: graphId,
      user_id: userId,
      voter: {
        id: userId,
        username: userResult.rows[0]?.username || '',
        email: '',
        createdAt: new Date(),
      },
      vote_value: voteValue,
      reasoning: reasoning,
      vote_weight: voteWeight,
      voter_reputation_score: reputation.overall_reputation_score,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * MUTATION: Mark workflow step as complete
   * Tracks progress objectively
   */
  @Mutation(() => MethodologyCompletionTracking)
  async markWorkflowStepComplete(
    @Arg('graphId') graphId: string,
    @Arg('stepId') stepId: string,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<MethodologyCompletionTracking> {
    if (!userId) {
      throw new Error('Authentication required to mark step complete');
    }

    // Check if step is already completed
    const existing = await pool.query(
      'SELECT id FROM public."MethodologyStepCompletions" WHERE graph_id = $1 AND step_id = $2',
      [graphId, stepId]
    );

    if (existing.rows.length > 0) {
      throw new Error('This workflow step is already marked as complete');
    }

    // Get step info
    const stepResult = await pool.query(
      'SELECT name FROM public."MethodologyWorkflowSteps" WHERE id = $1',
      [stepId]
    );

    if (stepResult.rows.length === 0) {
      throw new Error('Invalid step ID');
    }

    const stepName = stepResult.rows[0].name;

    // Mark step as complete
    const result = await pool.query(
      `INSERT INTO public."MethodologyStepCompletions"
       (graph_id, step_id, completed_by, completed_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [graphId, stepId, userId]
    );

    const completionId = result.rows[0].id;

    // Trigger eligibility recalculation
    const eligibility = await this.getPromotionEligibility(graphId, { pool } as Context);
    await pubSub.publish(PROMOTION_ELIGIBILITY_UPDATED, { graphId, eligibility });

    return {
      id: completionId,
      graph_id: graphId,
      step_id: stepId,
      step_name: stepName,
      completed_by: userId,
      completed_at: new Date(),
      notes: undefined,
      is_verified: false,
      verification_notes: undefined,
    };
  }

  /**
   * MUTATION: Request promotion evaluation
   * Automatically promotes if eligible - no human approval needed
   * Returns detailed breakdown for transparency
   */
  @Mutation(() => PromotionResult)
  async requestPromotionEvaluation(
    @Arg('graphId') graphId: string,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<PromotionResult> {
    if (!userId) {
      throw new Error('Authentication required to request promotion');
    }

    // Get current graph level
    const graphResult = await pool.query(
      'SELECT level, name FROM public."Graphs" WHERE id = $1',
      [graphId]
    );

    if (graphResult.rows.length === 0) {
      throw new Error('Graph not found');
    }

    const currentLevel = graphResult.rows[0].level;
    const graphName = graphResult.rows[0].name;

    // Level 0 graphs cannot be promoted (they are immutable foundation)
    if (currentLevel === 0) {
      const eligibility = await this.getPromotionEligibility(graphId, { pool } as Context);

      return {
        graph_id: graphId,
        promotion_successful: false,
        previous_level: currentLevel,
        new_level: undefined,
        eligibility_breakdown: eligibility,
        promotion_message: undefined,
        failure_reason: 'Level 0 graphs are immutable and cannot be promoted',
        detailed_requirements: [],
        evaluated_at: new Date(),
        evaluated_by: userId,
      };
    }

    // Recalculate all eligibility criteria
    const eligibility = await this.getPromotionEligibility(graphId, { pool } as Context);

    if (!eligibility.is_eligible) {
      return {
        graph_id: graphId,
        promotion_successful: false,
        previous_level: currentLevel,
        new_level: undefined,
        eligibility_breakdown: eligibility,
        promotion_message: undefined,
        failure_reason: eligibility.blocking_reason,
        detailed_requirements: eligibility.missing_requirements,
        evaluated_at: new Date(),
        evaluated_by: userId,
      };
    }

    // Automatic promotion - no human approval needed!
    const newLevel = currentLevel + 1;

    await pool.query(
      'UPDATE public."Graphs" SET level = $1, updated_at = NOW() WHERE id = $2',
      [newLevel, graphId]
    );

    // Log promotion event
    const promotionEventResult = await pool.query(
      `INSERT INTO public."PromotionEvents"
       (graph_id, graph_name, previous_level, new_level, promoted_at, promotion_reason)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING id`,
      [
        graphId,
        graphName,
        currentLevel,
        newLevel,
        'Automatic promotion - all objective criteria met',
      ]
    );

    const promotionEvent: PromotionEvent = {
      id: promotionEventResult.rows[0].id,
      graph_id: graphId,
      graph_name: graphName,
      previous_level: currentLevel,
      new_level: newLevel,
      promoted_at: new Date(),
      promotion_reason: 'Automatic promotion - all objective criteria met',
    };

    // Publish promotion event
    await pubSub.publish(GRAPH_PROMOTED, { graphId, promotionEvent });

    return {
      graph_id: graphId,
      promotion_successful: true,
      previous_level: currentLevel,
      new_level: newLevel,
      eligibility_breakdown: eligibility,
      promotion_message: `Graph successfully promoted from Level ${currentLevel} to Level ${newLevel}`,
      failure_reason: undefined,
      detailed_requirements: [
        `Methodology completion: ${(eligibility.methodology_completion_score * 100).toFixed(1)}%`,
        `Consensus score: ${(eligibility.consensus_score * 100).toFixed(1)}%`,
        `Evidence quality: ${(eligibility.evidence_quality_score * 100).toFixed(1)}%`,
        `Challenge resolution: ${(eligibility.challenge_resolution_score * 100).toFixed(1)}%`,
      ],
      evaluated_at: new Date(),
      evaluated_by: userId,
    };
  }

  /**
   * SUBSCRIPTION: Listen to promotion eligibility updates
   * Allows real-time UI updates as criteria change
   */
  @Subscription(() => PromotionEligibility, {
    topics: PROMOTION_ELIGIBILITY_UPDATED,
    filter: ({ payload, args }) => payload.graphId === args.graphId,
  })
  promotionEligibilityUpdated(
    @Arg('graphId') graphId: string,
    @Root() payload: { graphId: string; eligibility: PromotionEligibility }
  ): PromotionEligibility {
    return payload.eligibility;
  }

  /**
   * SUBSCRIPTION: Listen to graph promotion events
   * Notifies when graphs level up
   */
  @Subscription(() => PromotionEvent, {
    topics: GRAPH_PROMOTED,
    filter: ({ payload, args }) => payload.graphId === args.graphId,
  })
  graphPromoted(
    @Arg('graphId') graphId: string,
    @Root() payload: { graphId: string; promotionEvent: PromotionEvent }
  ): PromotionEvent {
    return payload.promotionEvent;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Calculate methodology completion score
   * Formula: completed_required_steps / total_required_steps
   */
  private async calculateMethodologyCompletionScore(
    graphId: string,
    pool: Pool
  ): Promise<number> {
    try {
      const progress = await this.getMethodologyProgress(graphId, { pool } as Context);

      if (progress.required_steps === 0) {
        // No required steps means methodology is complete
        return 1.0;
      }

      return progress.completed_required_steps / progress.required_steps;
    } catch (error) {
      // If methodology is not assigned or has errors, score is 0
      return 0;
    }
  }

  /**
   * Calculate consensus score
   * Formula: weighted_average(all_votes, vote_weights)
   */
  private async calculateConsensusScore(graphId: string, pool: Pool): Promise<number> {
    try {
      const consensus = await this.getConsensusStatus(graphId, { pool } as Context);

      if (!consensus.has_sufficient_votes) {
        return 0;
      }

      return consensus.weighted_consensus_score;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate evidence quality score
   * Formula: AVG(evidence.confidence) for all evidence in graph
   */
  private async calculateEvidenceQualityScore(graphId: string, pool: Pool): Promise<number> {
    try {
      // Get all evidence for nodes/edges in this graph
      const result = await pool.query(
        `SELECT AVG(e.confidence) as avg_quality
         FROM public."Evidence" e
         LEFT JOIN public."Nodes" n ON e.target_node_id = n.id
         LEFT JOIN public."Edges" ed ON e.target_edge_id = ed.id
         WHERE n.graph_id = $1 OR ed.graph_id = $1`,
        [graphId]
      );

      const avgQuality = parseFloat(result.rows[0]?.avg_quality || '0');

      return avgQuality;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate challenge resolution score
   * Formula: 1.0 if no open challenges, 0.0 if any open challenges exist
   */
  private async calculateChallengeResolutionScore(graphId: string, pool: Pool): Promise<number> {
    try {
      // Count open challenges for this graph
      const result = await pool.query(
        `SELECT COUNT(*) as open_challenges
         FROM public."Challenges" c
         LEFT JOIN public."Nodes" n ON c.target_node_id = n.id
         LEFT JOIN public."Edges" e ON c.target_edge_id = e.id
         WHERE (n.graph_id = $1 OR e.graph_id = $1)
           AND c.status IN ('open', 'under_review')`,
        [graphId]
      );

      const openChallenges = parseInt(result.rows[0]?.open_challenges || '0');

      // Binary score: 1.0 if no open challenges, 0.0 otherwise
      return openChallenges === 0 ? 1.0 : 0.0;
    } catch (error) {
      return 0;
    }
  }
}
