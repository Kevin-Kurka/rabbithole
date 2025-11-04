/**
 * PromotionEligibilityService - Level 0 Promotion Pipeline
 *
 * Evaluates nodes for promotion to Level 0 (verified truth/falsehood) using 4 transparent criteria:
 * 1. Methodology Completion (100% required)
 * 2. Community Consensus (99%+ required)
 * 3. Evidence Quality (95%+ required)
 * 4. Challenge Resolution (0 open challenges required)
 *
 * Provides real-time eligibility tracking and AI-assisted evaluation.
 */

import { Pool } from 'pg';

export interface PromotionCriteria {
  methodologyCompletion: number; // 0.0 - 1.0
  communityConsensus: number; // 0.0 - 1.0
  evidenceQuality: number; // 0.0 - 1.0
  openChallenges: number; // Integer count
}

export interface PromotionEligibility {
  nodeId: string;
  criteria: PromotionCriteria;
  overallScore: number;
  eligible: boolean;
  blockers: string[];
  recommendations: string[];
  lastEvaluated: Date;
}

export class PromotionEligibilityService {
  private pool: Pool;

  // Thresholds for Level 0 promotion
  private readonly METHODOLOGY_THRESHOLD = 1.0; // 100%
  private readonly CONSENSUS_THRESHOLD = 0.99; // 99%
  private readonly EVIDENCE_QUALITY_THRESHOLD = 0.95; // 95%
  private readonly MAX_OPEN_CHALLENGES = 0;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Evaluate node for Level 0 promotion eligibility
   */
  async evaluateEligibility(nodeId: string): Promise<PromotionEligibility> {
    // Calculate each criterion
    const methodologyCompletion = await this.calculateMethodologyCompletion(nodeId);
    const communityConsensus = await this.calculateCommunityConsensus(nodeId);
    const evidenceQuality = await this.calculateEvidenceQuality(nodeId);
    const openChallenges = await this.countOpenChallenges(nodeId);

    const criteria: PromotionCriteria = {
      methodologyCompletion,
      communityConsensus,
      evidenceQuality,
      openChallenges,
    };

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(criteria);

    // Determine eligibility
    const eligible = this.determineEligibility(criteria);

    // Identify blockers
    const blockers = this.identifyBlockers(criteria);

    // Generate recommendations
    const recommendations = this.generateRecommendations(criteria, blockers);

    // Store in database
    await this.storeEligibility(nodeId, criteria, overallScore, eligible);

    return {
      nodeId,
      criteria,
      overallScore,
      eligible,
      blockers,
      recommendations,
      lastEvaluated: new Date(),
    };
  }

  /**
   * Calculate methodology completion percentage
   */
  private async calculateMethodologyCompletion(nodeId: string): Promise<number> {
    // Get node's methodology and required steps
    const nodeResult = await this.pool.query(
      `SELECT n.graph_id, g.methodology
       FROM public."Nodes" n
       JOIN public."Graphs" g ON n.graph_id = g.id
       WHERE n.id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      return 0;
    }

    const { graph_id, methodology } = nodeResult.rows[0];

    if (!methodology) {
      return 0.5; // No methodology selected, partial credit
    }

    // Get methodology workflow steps
    const workflowResult = await this.pool.query(
      `SELECT step_order, is_required, completion_criteria
       FROM public."MethodologyWorkflows"
       WHERE methodology_id = (
         SELECT id FROM public."Methodologies" WHERE name = $1
       )
       ORDER BY step_order`,
      [methodology]
    );

    const steps = workflowResult.rows;
    if (steps.length === 0) {
      return 1.0; // No steps defined, consider complete
    }

    // Check user progress for each step
    const progressResult = await this.pool.query(
      `SELECT step_order, is_completed, completion_percentage
       FROM public."UserMethodologyProgress"
       WHERE node_id = $1`,
      [nodeId]
    );

    const progressMap = new Map(
      progressResult.rows.map(row => [row.step_order, row])
    );

    let totalWeight = 0;
    let completedWeight = 0;

    for (const step of steps) {
      const weight = step.is_required ? 1.0 : 0.5;
      totalWeight += weight;

      const progress = progressMap.get(step.step_order);
      if (progress) {
        completedWeight += weight * (progress.completion_percentage || 0);
      }
    }

    return totalWeight > 0 ? completedWeight / totalWeight : 0;
  }

  /**
   * Calculate community consensus percentage
   */
  private async calculateCommunityConsensus(nodeId: string): Promise<number> {
    // Get all votes on this node (via challenges and direct votes)
    const voteResult = await this.pool.query(
      `SELECT
         cv.vote_type,
         cv.confidence,
         u.reputation
       FROM public."Challenges" c
       JOIN public."ChallengeVotes" cv ON cv.challenge_id = c.id
       JOIN public."Users" u ON u.id = cv.voter_id
       WHERE c.target_node_id = $1
         AND c.status = 'resolved'`,
      [nodeId]
    );

    if (voteResult.rows.length === 0) {
      return 0; // No votes yet
    }

    // Calculate reputation-weighted consensus
    let totalWeight = 0;
    let supportWeight = 0;

    for (const vote of voteResult.rows) {
      // Vote weight = sqrt(reputation) * confidence
      const voteWeight = Math.sqrt(vote.reputation || 50) * (vote.confidence || 1.0);
      totalWeight += voteWeight;

      if (vote.vote_type === 'uphold') {
        supportWeight += voteWeight;
      }
    }

    return totalWeight > 0 ? supportWeight / totalWeight : 0;
  }

  /**
   * Calculate evidence quality score
   */
  private async calculateEvidenceQuality(nodeId: string): Promise<number> {
    // Get all evidence for this node
    const evidenceResult = await this.pool.query(
      `SELECT
         e.quality_tier,
         e.confidence,
         s.credibility_score,
         ev.overall_score as validation_score
       FROM public."Evidence" e
       LEFT JOIN public."Sources" s ON s.id = e.source_id
       LEFT JOIN public."EvidenceValidation" ev ON ev.node_id = e.node_id
       WHERE e.node_id = $1`,
      [nodeId]
    );

    if (evidenceResult.rows.length === 0) {
      return 0; // No evidence
    }

    let totalScore = 0;
    let evidenceCount = evidenceResult.rows.length;

    for (const evidence of evidenceResult.rows) {
      // Quality tier mapping
      const tierScores: Record<string, number> = {
        'high': 1.0,
        'medium': 0.7,
        'low': 0.4,
      };

      const tierScore = tierScores[evidence.quality_tier] || 0.5;
      const credibilityScore = evidence.credibility_score || 0.5;
      const validationScore = evidence.validation_score || 0.5;

      // Combined score for this evidence
      const evidenceScore = (tierScore + credibilityScore + validationScore) / 3;
      totalScore += evidenceScore;
    }

    return evidenceCount > 0 ? totalScore / evidenceCount : 0;
  }

  /**
   * Count open challenges on this node
   */
  private async countOpenChallenges(nodeId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM public."Challenges"
       WHERE target_node_id = $1
         AND status IN ('open', 'under_review')`,
      [nodeId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(criteria: PromotionCriteria): number {
    // Weighted average
    const weights = {
      methodology: 0.25,
      consensus: 0.40, // Highest weight (community is key)
      evidence: 0.30,
      challenges: 0.05,
    };

    const challengeScore = criteria.openChallenges === 0 ? 1.0 : 0.0;

    return (
      criteria.methodologyCompletion * weights.methodology +
      criteria.communityConsensus * weights.consensus +
      criteria.evidenceQuality * weights.evidence +
      challengeScore * weights.challenges
    );
  }

  /**
   * Determine if node is eligible for promotion
   */
  private determineEligibility(criteria: PromotionCriteria): boolean {
    return (
      criteria.methodologyCompletion >= this.METHODOLOGY_THRESHOLD &&
      criteria.communityConsensus >= this.CONSENSUS_THRESHOLD &&
      criteria.evidenceQuality >= this.EVIDENCE_QUALITY_THRESHOLD &&
      criteria.openChallenges <= this.MAX_OPEN_CHALLENGES
    );
  }

  /**
   * Identify what's blocking promotion
   */
  private identifyBlockers(criteria: PromotionCriteria): string[] {
    const blockers: string[] = [];

    if (criteria.methodologyCompletion < this.METHODOLOGY_THRESHOLD) {
      const missing = ((this.METHODOLOGY_THRESHOLD - criteria.methodologyCompletion) * 100).toFixed(1);
      blockers.push(`Methodology incomplete (need ${missing}% more completion)`);
    }

    if (criteria.communityConsensus < this.CONSENSUS_THRESHOLD) {
      const missing = ((this.CONSENSUS_THRESHOLD - criteria.communityConsensus) * 100).toFixed(1);
      blockers.push(`Consensus too low (need ${missing}% more support, currently ${(criteria.communityConsensus * 100).toFixed(1)}%)`);
    }

    if (criteria.evidenceQuality < this.EVIDENCE_QUALITY_THRESHOLD) {
      const missing = ((this.EVIDENCE_QUALITY_THRESHOLD - criteria.evidenceQuality) * 100).toFixed(1);
      blockers.push(`Evidence quality insufficient (need ${missing}% improvement)`);
    }

    if (criteria.openChallenges > this.MAX_OPEN_CHALLENGES) {
      blockers.push(`${criteria.openChallenges} open challenge(s) must be resolved`);
    }

    return blockers;
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(criteria: PromotionCriteria, blockers: string[]): string[] {
    const recommendations: string[] = [];

    if (criteria.methodologyCompletion < 1.0) {
      recommendations.push('Complete all required methodology steps with supporting evidence.');
    }

    if (criteria.communityConsensus < 0.99) {
      recommendations.push('Address community concerns and improve argument clarity to gain more support.');
    }

    if (criteria.evidenceQuality < 0.95) {
      recommendations.push('Add higher-quality evidence from credible primary sources.');
      recommendations.push('Ensure all evidence passes FRE validation checks.');
    }

    if (criteria.openChallenges > 0) {
      recommendations.push('Respond to open challenges with evidence and resolve debates.');
    }

    if (blockers.length === 0) {
      recommendations.push('Ready for curator review! Submit for Level 0 promotion.');
    }

    return recommendations;
  }

  /**
   * Store eligibility assessment in database
   */
  private async storeEligibility(
    nodeId: string,
    criteria: PromotionCriteria,
    overallScore: number,
    eligible: boolean
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO public."PromotionEligibility"
       (node_id, methodology_completion, community_consensus, evidence_quality, open_challenges, overall_score, eligible, last_evaluated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (node_id)
       DO UPDATE SET
         methodology_completion = EXCLUDED.methodology_completion,
         community_consensus = EXCLUDED.community_consensus,
         evidence_quality = EXCLUDED.evidence_quality,
         open_challenges = EXCLUDED.open_challenges,
         overall_score = EXCLUDED.overall_score,
         eligible = EXCLUDED.eligible,
         last_evaluated_at = NOW()`,
      [
        nodeId,
        criteria.methodologyCompletion,
        criteria.communityConsensus,
        criteria.evidenceQuality,
        criteria.openChallenges,
        overallScore,
        eligible,
      ]
    );
  }

  /**
   * Promote node to Level 0
   */
  async promoteToLevel0(
    nodeId: string,
    curatorId: string,
    promotionType: 'verified_truth' | 'verified_false',
    curatorNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    // Re-check eligibility
    const eligibility = await this.evaluateEligibility(nodeId);

    if (!eligibility.eligible) {
      return {
        success: false,
        message: `Node not eligible for promotion. Blockers: ${eligibility.blockers.join(', ')}`,
      };
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current node data
      const nodeResult = await client.query(
        `SELECT * FROM public."Nodes" WHERE id = $1`,
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found');
      }

      const node = nodeResult.rows[0];
      const finalWeight = promotionType === 'verified_truth' ? 1.0 : 0.0;

      // Update node to Level 0
      await client.query(
        `UPDATE public."Nodes"
         SET is_level_0 = true,
             weight = $1,
             meta = jsonb_set(
               COALESCE(meta, '{}'::jsonb),
               '{promoted_at}',
               to_jsonb(NOW())
             ),
             updated_at = NOW()
         WHERE id = $2`,
        [finalWeight, nodeId]
      );

      // Record promotion event in public ledger
      await client.query(
        `INSERT INTO public."PromotionEvents"
         (node_id, promoted_from_graph_id, promotion_type, final_weight,
          methodology_completion, community_consensus, evidence_quality,
          curator_id, curator_notes, promoted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          nodeId,
          node.graph_id,
          promotionType,
          finalWeight,
          eligibility.criteria.methodologyCompletion,
          eligibility.criteria.communityConsensus,
          eligibility.criteria.evidenceQuality,
          curatorId,
          curatorNotes,
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: `Node promoted to Level 0 as ${promotionType}`,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Promotion failed: ${error.message}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all nodes eligible for promotion
   */
  async getEligibleNodes(limit: number = 50): Promise<PromotionEligibility[]> {
    const result = await this.pool.query(
      `SELECT
         pe.*,
         n.props,
         g.name as graph_name
       FROM public."PromotionEligibility" pe
       JOIN public."Nodes" n ON n.id = pe.node_id
       JOIN public."Graphs" g ON g.id = n.graph_id
       WHERE pe.eligible = true
         AND n.is_level_0 = false
       ORDER BY pe.overall_score DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      nodeId: row.node_id,
      criteria: {
        methodologyCompletion: row.methodology_completion,
        communityConsensus: row.community_consensus,
        evidenceQuality: row.evidence_quality,
        openChallenges: row.open_challenges,
      },
      overallScore: row.overall_score,
      eligible: row.eligible,
      blockers: [],
      recommendations: [],
      lastEvaluated: new Date(row.last_evaluated_at),
    }));
  }
}

export default PromotionEligibilityService;
