import { Pool } from 'pg';

/**
 * Credibility factors for position scoring
 */
export interface CredibilityFactors {
  evidenceQuality: number;      // 0-1, from AI source analysis
  evidenceWeight: number;        // Multiplier based on evidence type (primary=1.0, anecdote=0.2)
  positionCoherence: number;     // Internal consistency via AI (0-1)
}

/**
 * Position with calculated credibility
 */
export interface ScoredPosition {
  id: string;
  inquiryId: string;
  stance: string;
  argument: string;
  credibility: number;
  factors: CredibilityFactors;
  status: 'verified' | 'credible' | 'weak' | 'excluded';
}

/**
 * CredibilityCalculationService
 *
 * Implements DYNAMIC RELIANCE credibility scoring with THRESHOLD FILTERING.
 *
 * Credibility Formula (Objective):
 * FinalScore = IntrinsicScore * StructuralMultiplier
 *
 * 1. IntrinsicScore (Direct):
 *    - Based on Evidence Quality and Position Coherence.
 *    - Represents the node's "base potential".
 *
 * 2. StructuralMultiplier (Recursive):
 *    - Avg(ChildScore * EdgeCredibility) for PASSING dependencies.
 *    - THRESHOLD FILTERING (Default 0.5):
 *      - Exclude Child Nodes where Score < 0.5
 *      - Exclude Edges where Credibility < 0.5
 *    - If NO dependencies pass the filter, Multiplier = 1.0 (Node stands on its own merit).
 *
 * Consensus Score (Subjective):
 * - Formula: Sum(Vote * VoterReputation) / Sum(VoterReputation)
 * - THRESHOLD FILTERING: Exclude votes where VoterReputation < 0.5.
 */
export class CredibilityCalculationService {
  private readonly DEFAULT_THRESHOLD = 0.5;

  constructor(private pool: Pool) { }

  /**
   * Calculate credibility score for a single inquiry position
   * Treat this as "Intrinsic Score" calculation for a Position Node.
   */
  async calculatePositionCredibility(positionId: string): Promise<number> {
    try {
      const position = await this.getPositionDetails(positionId);

      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      const factors = await this.calculatePositionFactors(position);

      // Intrinsic Score Formula
      // Evidence Quality (50%) + Position Coherence (50%)
      const intrinsicScore = (
        (factors.evidenceQuality * factors.evidenceWeight * 0.50) +
        (factors.positionCoherence * 0.50)
      );

      const finalScore = Math.min(1.0, Math.max(0.0, intrinsicScore));

      await this.updatePositionCredibility(positionId, finalScore, factors);

      return finalScore;
    } catch (error) {
      console.error(`Error calculating position credibility for ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate credibility score for a node.
   * FinalScore = Intrinsic * StructuralMultiplier
   */
  async calculateNodeCredibility(nodeId: string): Promise<number> {
    try {
      // 1. Intrinsic Score (Direct)
      const intrinsicScore = await this.calculateDirectNodeCredibility(nodeId);

      // If intrinsic score is null (no data), default to 0.5
      const baseScore = intrinsicScore !== null ? intrinsicScore : 0.5;

      // 2. Structural Multiplier (Recursive)
      // Only critical edges affect this multiplier.
      const criticalEdgeTypes = ['CITES_EVIDENCE', 'DEPENDS_ON'];
      const structuralMultiplier = await this.calculateStructuralMultiplier(nodeId, criticalEdgeTypes);

      // 3. Investigation Penalty (Formal Inquiry)
      // High-Credibility Refutations reduce the score.
      const investigationPenaltyMultiplier = await this.calculateInvestigationMultiplier(nodeId);

      // 4. Final Calculation
      // Formula: Intrinsic * Structural * InvestigationPenalty
      const finalScore = baseScore * structuralMultiplier * investigationPenaltyMultiplier;

      const clampedScore = Math.min(1.0, Math.max(0.0, finalScore));

      // Update Node
      await this.pool.query(
        `UPDATE public."Nodes" SET credibility_score = $1, last_credibility_update = NOW() WHERE id = $2`,
        [clampedScore, nodeId]
      );

      return clampedScore;

    } catch (error) {
      console.error(`Error calculating node credibility for ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate Consensus Score (Subjective)
   * Remains completely separate from Credibility.
   * Uses Threshold Filtering for Voters.
   */
  async calculateNodeConsensus(nodeId: string): Promise<number> {
    try {
      const query = `
        SELECT 
          v.props->>'voteType' as vote_type,
          u.reputation as voter_reputation
        FROM public."edges" e
        JOIN public."nodes" v ON e.source_node_id = v.id
        JOIN public."edge_types" et ON e.edge_type_id = et.id
        JOIN public."Users" u ON (v.props->>'voterId')::uuid = u.id
        WHERE e.target_node_id = $1
          AND et.name = 'VOTES_ON'
          AND v.node_type_id = (SELECT id FROM public."node_types" WHERE name = 'ConsensusVote')
      `;

      const result = await this.pool.query(query, [nodeId]);

      if (result.rows.length === 0) {
        await this.updateNodeConsensus(nodeId, 0.5);
        return 0.5;
      }

      let weightedSum = 0.0;
      let totalWeight = 0.0;

      for (const row of result.rows) {
        const reputation = parseFloat(row.voter_reputation || 0.5);

        // THRESHOLD FILTERING
        // Ignore votes from low-reputation users
        if (reputation < this.DEFAULT_THRESHOLD) {
          continue;
        }

        const weight = reputation;

        let value = 0.5;
        if (row.vote_type === 'support') value = 1.0;
        else if (row.vote_type === 'oppose') value = 0.0;
        else value = 0.5;

        weightedSum += value * weight;
        totalWeight += weight;
      }

      // If all votes filtered out, default to 0.5
      const consensusScore = totalWeight > 0 ? (weightedSum / totalWeight) : 0.5;

      await this.updateNodeConsensus(nodeId, consensusScore);

      return consensusScore;

    } catch (error) {
      console.error(`Error calculating consensus for ${nodeId}:`, error);
      return 0.5;
    }
  }

  private async updateNodeConsensus(nodeId: string, score: number): Promise<void> {
    await this.pool.query(
      `UPDATE public."Nodes" SET consensus_score = $1 WHERE id = $2`,
      [score, nodeId]
    );
  }

  /**
   * Helper: Calculate Intrinsic Score (from Inquiries)
   */
  private async calculateDirectNodeCredibility(nodeId: string): Promise<number | null> {
    const inquiries = await this.pool.query(
      `
        SELECT
          i.*,
          t.inclusion_threshold
        FROM public."Inquiries" i
        LEFT JOIN public."CredibilityThresholds" t ON i.inquiry_type = t.inquiry_type
        WHERE i.node_id = $1
          AND i.status = 'active'
          AND i.is_merged = false
        `,
      [nodeId]
    );

    if (inquiries.rows.length === 0) {
      return null;
    }

    let totalWeightedCredibility = 0.0;
    let totalWeight = 0.0;

    for (const inquiry of inquiries.rows) {
      const inclusionThreshold = inquiry.inclusion_threshold || 0.5;

      const positions = await this.pool.query(
        `
          SELECT
            p.*,
            COALESCE(et.weight, 0.5) as evidence_weight_value
          FROM public."InquiryPositions" p
          LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
          WHERE p.inquiry_id = $1
            AND p.status != 'archived'
          `,
        [inquiry.id]
      );

      for (const position of positions.rows) {
        const positionCredibility = position.credibility_score || 0.5;

        // Skip positions below inclusion threshold (already a form of filtering)
        if (positionCredibility < inclusionThreshold) {
          continue;
        }

        const evidenceWeight = parseFloat(position.evidence_weight_value);

        totalWeightedCredibility += positionCredibility * evidenceWeight;
        totalWeight += evidenceWeight;
      }
    }

    if (totalWeight > 0) {
      return totalWeightedCredibility / totalWeight;
    } else {
      return null; // No valid positions found
    }
  }

  /**
   * Helper: Calculate Structural Multiplier
   * Returns a value between 0.0 and 1.0.
   * THRESHOLD FILTERING APPLIED.
   */
  private async calculateStructuralMultiplier(nodeId: string, edgeTypes: string[]): Promise<number> {
    const children = await this.pool.query(
      `
         SELECT 
            target.credibility_score as child_score,
            e.credibility_score as edge_score
         FROM public."edges" e
         JOIN public."edge_types" et ON e.edge_type_id = et.id
         JOIN public."nodes" target ON e.target_node_id = target.id
         WHERE e.source_node_id = $1
           AND et.name = ANY($2)
           AND target.archived_at IS NULL
         `,
      [nodeId, edgeTypes]
    );

    if (children.rows.length === 0) {
      return 1.0; // Stand on own merit
    }

    let sumEffectiveScores = 0.0;
    let count = 0;

    for (const row of children.rows) {
      const childScore = row.child_score !== null ? row.child_score : 0.5;
      const edgeScore = row.edge_score !== null ? row.edge_score : 1.0;

      // THRESHOLD FILTERING
      // If either the child node OR the edge is untrustworthy (< 0.5), ignore it.
      // This prevents "junk" from affecting the score up or down.
      if (childScore < this.DEFAULT_THRESHOLD || edgeScore < this.DEFAULT_THRESHOLD) {
        continue;
      }

      // Effective Score = Child * Connection Strength
      const effectiveScore = childScore * edgeScore;

      sumEffectiveScores += effectiveScore;
      count++;
    }

    // Determine Multiplier
    // If we had dependencies but ALL were filtered out (all junk), what is the multiplier?
    // Policy: If you attempt to cite junk, does it hurt you, or is it ignored?
    // "Default threshold is .5... excluded" implies ignored.
    // If all excluded, we revert to 1.0 (Intrinsic Only) or penalize?
    return count > 0 ? (sumEffectiveScores / count) : 1.0;
  }

  /**
   * Helper: Calculate Investigation Penalty Multiplier
   * Checks for Formal Inquiries (LogicLens) that have investigated this node.
   * If a Logic Fallacy is detected (aiDetermination) with high confidence, it applies a penalty.
   */
  private async calculateInvestigationMultiplier(nodeId: string): Promise<number> {
    const investigations = await this.pool.query(
      `
         SELECT 
            inquiry.consensus_score, 
            inquiry.props->>'aiDetermination' as ai_determination,
            e.weight as edge_weight
         FROM public."edges" e
         JOIN public."edge_types" et ON e.edge_type_id = et.id
         JOIN public."nodes" inquiry ON e.source_node_id = inquiry.id
         WHERE e.target_node_id = $1
           AND et.name = 'INVESTIGATES'
           AND inquiry.archived_at IS NULL
         `,
      [nodeId]
    );

    if (investigations.rows.length === 0) {
      return 1.0; // No investigations
    }

    let totalPenalty = 0.0;

    for (const row of investigations.rows) {
      // Use the Consensus Score (Subjective Agreement) as the weight of this investigation
      const confidence = row.consensus_score !== null ? parseFloat(row.consensus_score) : 0.5;
      const determination = row.ai_determination;

      // THRESHOLD FILTERING
      // 1. Must have a valid Fallacy/Determination (not null/empty)
      // 2. Must have High Confidence (> 0.5 default, potentially higher for strict penalties)

      if (!determination || determination === 'Valid' || determination === 'Sound') {
        continue; // No fallacy detected, or explicitly valid.
      }

      if (confidence < this.DEFAULT_THRESHOLD) {
        continue; // Low confidence in the fallacy detection.
      }

      // Penalty Calculation
      // A High Confidence Fallacy is damaging.
      // Impact = Confidence (0.5-1.0) * EdgeWeight
      const penalty = confidence * (row.edge_weight || 1.0);

      totalPenalty += penalty;
    }

    // Final Multiplier can't go below 0.
    const multiplier = Math.max(0.0, 1.0 - totalPenalty);

    return multiplier;
  }

  private async getPositionDetails(positionId: string): Promise<any> {
    const result = await this.pool.query(
      `
      SELECT
        p.*,
      et.weight as evidence_type_weight,
      et.code as evidence_type_code
      FROM public."InquiryPositions" p
      LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
      WHERE p.id = $1
      `,
      [positionId]
    );

    return result.rows[0] || null;
  }

  private async calculatePositionFactors(position: any): Promise<CredibilityFactors> {
    const evidenceQuality = position.evidence_quality_score || 0.5;
    const evidenceWeight = parseFloat(position.evidence_type_weight || 0.5);
    const positionCoherence = position.coherence_score || 0.5;

    return {
      evidenceQuality,
      evidenceWeight,
      positionCoherence
    };
  }

  private async updatePositionCredibility(
    positionId: string,
    credibility: number,
    factors: CredibilityFactors
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE public."InquiryPositions"
      SET
        credibility_score = $1,
      evidence_quality_score = $2,
      coherence_score = $3,
      last_credibility_update = NOW(),
      updated_at = NOW()
      WHERE id = $4
      `,
      [
        credibility,
        factors.evidenceQuality,
        factors.positionCoherence,
        positionId
      ]
    );
  }

  async recalculateInquiryPositions(inquiryId: string): Promise<ScoredPosition[]> {
    const positions = await this.pool.query(
      `
      SELECT id FROM public."InquiryPositions"
      WHERE inquiry_id = $1 AND status != 'archived'
      `,
      [inquiryId]
    );

    const scoredPositions: ScoredPosition[] = [];

    for (const position of positions.rows) {
      const credibility = await this.calculatePositionCredibility(position.id);
      const details = await this.getPositionDetails(position.id);
      const factors = await this.calculatePositionFactors(details);

      let status: 'verified' | 'credible' | 'weak' | 'excluded' = 'credible';
      if (credibility >= 0.85) status = 'verified';
      else if (credibility >= 0.60) status = 'credible';
      else if (credibility >= 0.30) status = 'weak';
      else status = 'excluded';

      scoredPositions.push({
        id: position.id,
        inquiryId,
        stance: details.stance,
        argument: details.argument,
        credibility,
        factors,
        status
      });
    }
    return scoredPositions;
  }

  async recalculateAllNodeCredibility(limit: number = 100): Promise<number> {
    const nodes = await this.pool.query(
      `
      SELECT id FROM public."Nodes"
      ORDER BY last_credibility_update ASC NULLS FIRST
      LIMIT $1
      `,
      [limit]
    );

    let updated = 0;
    for (const node of nodes.rows) {
      try {
        const credibility = await this.calculateNodeCredibility(node.id);

        await this.pool.query(
          `UPDATE public."Nodes" SET credibility_score = $1, last_credibility_update = NOW() WHERE id = $2`,
          [credibility, node.id]
        );
        updated++;
      } catch (error) {
        console.error(`Failed to update node ${node.id}: `, error);
      }
    }
    return updated;
  }
}
