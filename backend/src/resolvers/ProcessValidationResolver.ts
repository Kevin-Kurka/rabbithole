import { Resolver, Query, Mutation, Subscription, Arg, Ctx, Root, PubSub } from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  PromotionEligibility,
  ConsensusVote,
  MethodologyProgress,
  ConsensusStatus,
  PromotionResult,
  UserReputation,
  MethodologyCompletionTracking,
  PromotionEvent,
  MethodologyWorkflowStep,
  User
} from '../types/GraphTypes';

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

  // Helper methods to calculate scores (placeholder implementations for now)
  private async calculateMethodologyCompletionScore(graphId: string, pool: Pool): Promise<number> {
    // Logic to calculate score based on methodology progress
    // For now, return a mock score or query the graph props
    return 0.9;
  }

  private async calculateConsensusScore(graphId: string, pool: Pool): Promise<number> {
    return 0.85;
  }

  private async calculateEvidenceQualityScore(graphId: string, pool: Pool): Promise<number> {
    return 0.92;
  }

  private async calculateChallengeResolutionScore(graphId: string, pool: Pool): Promise<number> {
    return 1.0;
  }

  @Query(() => [PromotionEvent])
  async promotionEvents(
    @Ctx() { pool }: Context,
    @Arg('limit', () => Number, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Number, { nullable: true, defaultValue: 0 }) offset: number
  ): Promise<PromotionEvent[]> {
    // Query Nodes of type 'PromotionEvent'
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'PromotionEvent'
       ORDER BY n.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => {
      const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
      return {
        id: row.id,
        ...props,
        promoted_at: row.created_at
      };
    });
  }

  @Query(() => Number)
  async promotionEventsCount(@Ctx() { pool }: Context): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'PromotionEvent'`
    );
    return parseInt(result.rows[0].count);
  }

  @Query(() => PromotionEligibility)
  async getPromotionEligibility(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<PromotionEligibility> {
    const methodologyScore = await this.calculateMethodologyCompletionScore(graphId, pool);
    const consensusScore = await this.calculateConsensusScore(graphId, pool);
    const evidenceScore = await this.calculateEvidenceQualityScore(graphId, pool);
    const challengeScore = await this.calculateChallengeResolutionScore(graphId, pool);

    const overallScore = Math.min(methodologyScore, consensusScore, evidenceScore, challengeScore);
    const isEligible = overallScore >= PROMOTION_THRESHOLD;

    const missingRequirements: string[] = [];
    if (methodologyScore < PROMOTION_THRESHOLD) missingRequirements.push('Methodology completion insufficient');
    if (consensusScore < PROMOTION_THRESHOLD) missingRequirements.push('Consensus score insufficient');
    if (evidenceScore < PROMOTION_THRESHOLD) missingRequirements.push('Evidence quality insufficient');
    if (challengeScore < PROMOTION_THRESHOLD) missingRequirements.push('Challenge resolution insufficient');

    return {
      graph_id: graphId,
      methodology_completion_score: methodologyScore,
      consensus_score: consensusScore,
      evidence_quality_score: evidenceScore,
      challenge_resolution_score: challengeScore,
      overall_score: overallScore,
      is_eligible: isEligible,
      blocking_reason: isEligible ? undefined : 'Does not meet threshold',
      missing_requirements: missingRequirements,
      calculated_at: new Date()
    };
  }

  @Query(() => MethodologyProgress)
  async getMethodologyProgress(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<MethodologyProgress> {
    // Fetch graph to get methodology_id
    const graphResult = await pool.query(
      `SELECT n.* FROM public."Nodes" n WHERE id = $1`,
      [graphId]
    );
    if (!graphResult.rows[0]) throw new Error('Graph not found');

    const graphNode = graphResult.rows[0];
    const graphProps = typeof graphNode.props === 'string' ? JSON.parse(graphNode.props) : graphNode.props;
    const methodologyId = graphProps.methodology_id;

    if (!methodologyId) throw new Error('Graph has no methodology');

    // Fetch methodology to get steps
    const methResult = await pool.query(
      `SELECT n.* FROM public."Nodes" n WHERE id = $1`,
      [methodologyId]
    );
    const methNode = methResult.rows[0];
    const methProps = typeof methNode.props === 'string' ? JSON.parse(methNode.props) : methNode.props;

    const steps = methProps.workflow?.steps || [];

    // Fetch completion status (assuming stored in Graph props or separate nodes)
    // For now assuming Graph props has 'completed_steps'
    const completedStepIds: string[] = graphProps.completed_steps || [];

    const workflowSteps: MethodologyWorkflowStep[] = steps.map((step: any, index: number) => ({
      step_id: step.id,
      step_name: step.label || step.name,
      step_description: step.description || '',
      step_order: index,
      is_required: !step.optional,
      is_completed: completedStepIds.includes(step.id),
      completed_at: undefined, // Need to track this
      completed_by: undefined
    }));

    const totalSteps = workflowSteps.length;
    const completedSteps = workflowSteps.filter(s => s.is_completed).length;
    const requiredSteps = workflowSteps.filter(s => s.is_required).length;
    const completedRequiredSteps = workflowSteps.filter(s => s.is_required && s.is_completed).length;

    return {
      graph_id: graphId,
      methodology_id: methodologyId,
      methodology_name: methProps.name,
      total_steps: totalSteps,
      completed_steps: completedSteps,
      required_steps: requiredSteps,
      completed_required_steps: completedRequiredSteps,
      completion_percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      required_completion_percentage: requiredSteps > 0 ? (completedRequiredSteps / requiredSteps) * 100 : 100,
      workflow_steps: workflowSteps,
      is_methodology_complete: completedRequiredSteps === requiredSteps,
      calculated_at: new Date()
    };
  }

  @Query(() => ConsensusStatus)
  async getConsensusStatus(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ConsensusStatus> {
    // Query 'ConsensusVote' nodes linked to graph
    // Assuming we store votes as Nodes of type 'ConsensusVote' with props.graph_id
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'ConsensusVote'
       AND n.props->>'graph_id' = $1`,
      [graphId]
    );

    const votes = result.rows.map(row => typeof row.props === 'string' ? JSON.parse(row.props) : row.props);
    const totalVotes = votes.length;
    const approveVotes = votes.filter((v: any) => v.vote_value >= 0.8).length;
    const rejectVotes = votes.filter((v: any) => v.vote_value < 0.5).length;
    const neutralVotes = totalVotes - approveVotes - rejectVotes;

    return {
      graph_id: graphId,
      total_votes: totalVotes,
      weighted_consensus_score: 0.5, // Implement logic
      unweighted_consensus_score: 0.5, // Implement logic
      approve_votes: approveVotes,
      reject_votes: rejectVotes,
      neutral_votes: neutralVotes,
      minimum_votes_threshold: MINIMUM_CONSENSUS_VOTES,
      has_sufficient_votes: totalVotes >= MINIMUM_CONSENSUS_VOTES,
      consensus_reached: false,
      calculated_at: new Date()
    };
  }

  @Query(() => [ConsensusVote])
  async getConsensusVotes(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ConsensusVote[]> {
    const result = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'ConsensusVote'
       AND n.props->>'graph_id' = $1`,
      [graphId]
    );

    const votes = await Promise.all(result.rows.map(async row => {
      const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
      // Fetch user
      const userRes = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [props.user_id]);
      const user = User.fromNode(userRes.rows[0]);
      return {
        id: row.id,
        ...props,
        voter: user,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    }));

    return votes;
  }

  @Query(() => UserReputation)
  async getUserReputation(
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<UserReputation> {
    // Mock implementation or query user props if reputation is stored there
    return {
      user_id: userId,
      evidence_quality_score: 0.8,
      total_evidence_submitted: 10,
      verified_evidence_count: 8,
      rejected_evidence_count: 1,
      consensus_participation_rate: 0.5,
      total_votes_cast: 5,
      vote_alignment_score: 0.9,
      methodology_completions: 2,
      challenges_raised: 1,
      challenges_resolved: 1,
      overall_reputation_score: 0.85,
      calculated_at: new Date()
    };
  }

  @Mutation(() => ConsensusVote)
  async submitConsensusVote(
    @Arg('graphId') graphId: string,
    @Arg('voteValue') voteValue: number,
    @Arg('reasoning', () => String, { nullable: true }) reasoning: string | undefined,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<ConsensusVote> {
    if (!userId) throw new Error('Authentication required');

    // Create or update 'ConsensusVote' node
    // Check existing
    const existing = await pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'ConsensusVote'
       AND n.props->>'graph_id' = $1
       AND n.props->>'user_id' = $2`,
      [graphId, userId]
    );

    let node;
    const props = {
      graph_id: graphId,
      user_id: userId,
      vote_value: voteValue,
      reasoning,
      vote_weight: 1.0, // Calculate based on reputation
      voter_reputation_score: 0.8 // Fetch actual
    };

    if (existing.rows.length > 0) {
      node = existing.rows[0];
      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ ...JSON.parse(node.props), ...props }), node.id]
      );
    } else {
      // Get type id
      const typeRes = await pool.query(`SELECT id FROM public."NodeTypes" WHERE name = 'ConsensusVote'`);
      let typeId = typeRes.rows[0]?.id;
      if (!typeId) {
        const newType = await pool.query(`INSERT INTO public."NodeTypes" (name) VALUES ('ConsensusVote') RETURNING id`);
        typeId = newType.rows[0].id;
      }

      const res = await pool.query(
        `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
        [typeId, JSON.stringify(props)]
      );
      node = res.rows[0];
    }

    const userRes = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [userId]);
    const user = User.fromNode(userRes.rows[0]);

    return {
      id: node.id,
      ...props,
      voter: user,
      created_at: node.created_at,
      updated_at: new Date()
    };
  }

  @Mutation(() => MethodologyCompletionTracking)
  async markWorkflowStepComplete(
    @Arg('graphId') graphId: string,
    @Arg('stepId') stepId: string,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<MethodologyCompletionTracking> {
    if (!userId) throw new Error('Authentication required');

    // Update Graph props to add stepId to completed_steps
    const graphRes = await pool.query(`SELECT * FROM public."Nodes" WHERE id = $1`, [graphId]);
    if (!graphRes.rows[0]) throw new Error('Graph not found');

    const node = graphRes.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    const completedSteps = props.completed_steps || [];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
      props.completed_steps = completedSteps;
      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), graphId]
      );
    }

    return {
      id: `${graphId}-${stepId}`,
      graph_id: graphId,
      step_id: stepId,
      step_name: 'Unknown', // Need to fetch from methodology
      completed_by: userId,
      completed_at: new Date(),
      is_verified: false
    };
  }

  @Mutation(() => PromotionResult)
  async requestPromotionEvaluation(
    @Arg('graphId') graphId: string,
    @Ctx() { pool, pubSub, userId }: Context
  ): Promise<PromotionResult> {
    if (!userId) throw new Error('Authentication required');

    const eligibility = await this.getPromotionEligibility(graphId, { pool } as Context);

    // Logic to promote if eligible
    // Update Graph props level

    return {
      graph_id: graphId,
      promotion_successful: eligibility.is_eligible,
      previous_level: 0,
      new_level: eligibility.is_eligible ? 1 : undefined,
      eligibility_breakdown: eligibility,
      detailed_requirements: eligibility.missing_requirements,
      evaluated_at: new Date(),
      evaluated_by: userId
    };
  }
}
