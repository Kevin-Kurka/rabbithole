import { Pool } from 'pg';

/**
 * Credibility factors for position scoring
 */
export interface CredibilityFactors {
  evidenceQuality: number;      // 0-1, from AI source analysis
  evidenceWeight: number;        // Multiplier based on evidence type (primary=1.0, anecdote=0.2)
  sourceCredibility: number;     // Historical accuracy of source (0-1)
  positionCoherence: number;     // Internal consistency via AI (0-1)
  communitySignal: number;       // Minimal weight from votes (0-1), capped at 100 votes
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
 * Evidence item for evaluation
 */
export interface Evidence {
  id: string;
  sourceId?: string;
  url?: string;
  type: string;
  content: string;
  dateCreated?: Date;
}

/**
 * CredibilityCalculationService
 *
 * Implements evidence-weighted credibility scoring where hard facts from credible
 * sources outweigh popularity voting. This ensures the truth emerges from evidence
 * quality rather than public opinion.
 *
 * Credibility Formula:
 * - 50%: Evidence quality × Evidence weight
 * - 25%: Source credibility (historical track record)
 * - 20%: Position coherence (AI-evaluated consistency)
 * - 5%: Community signal (votes with diminishing returns)
 *
 * Evidence Weight Hierarchy:
 * - Primary documents: 1.0
 * - Expert testimony: 0.9
 * - Peer-reviewed: 0.85
 * - Investigative reports: 0.8
 * - Secondary sources: 0.6
 * - Tertiary sources: 0.4
 * - Opinion: 0.3
 * - Anecdotes: 0.2
 */
export class CredibilityCalculationService {
  constructor(private pool: Pool) {}

  /**
   * Calculate credibility score for a single inquiry position
   *
   * @param positionId - Position ID to score
   * @returns Credibility score between 0.0 and 1.0
   */
  async calculatePositionCredibility(positionId: string): Promise<number> {
    try {
      const position = await this.getPositionDetails(positionId);

      if (!position) {
        throw new Error(`Position not found: ${positionId}`);
      }

      const factors = await this.calculatePositionFactors(position);

      // Apply evidence-weighted formula
      const credibility = (
        factors.evidenceQuality * factors.evidenceWeight * 0.50 + // 50% evidence
        factors.sourceCredibility * 0.25 +                         // 25% source
        factors.positionCoherence * 0.20 +                         // 20% coherence
        factors.communitySignal * 0.05                             // 5% votes (minimal)
      );

      // Clamp to valid range [0, 1]
      const finalScore = Math.min(1.0, Math.max(0.0, credibility));

      // Update position in database
      await this.updatePositionCredibility(positionId, finalScore, factors);

      return finalScore;
    } catch (error) {
      console.error(`Error calculating position credibility for ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate credibility score for a node based on all inquiry positions
   *
   * Aggregates credible positions (above threshold) to determine overall node credibility.
   * Positions below the inquiry type's inclusion threshold are excluded.
   *
   * @param nodeId - Node ID to score
   * @returns Credibility score between 0.0 and 1.0
   */
  async calculateNodeCredibility(nodeId: string): Promise<number> {
    try {
      // Get all active inquiries for this node
      const inquiries = await this.pool.query(
        `
        SELECT
          i.*,
          t.inclusion_threshold,
          t.auto_amend_threshold
        FROM public."Inquiries" i
        LEFT JOIN public."CredibilityThresholds" t ON i.inquiry_type = t.inquiry_type
        WHERE i.node_id = $1
          AND i.status = 'active'
          AND i.is_merged = false
        `,
        [nodeId]
      );

      if (inquiries.rows.length === 0) {
        return 0.5; // No inquiries = neutral credibility
      }

      let totalWeightedCredibility = 0.0;
      let totalWeight = 0.0;

      // Loop through each inquiry
      for (const inquiry of inquiries.rows) {
        const inclusionThreshold = inquiry.inclusion_threshold || 0.5;

        // Get positions for this inquiry
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

        // Process each position
        for (const position of positions.rows) {
          const positionCredibility = position.credibility_score || 0.5;

          // Skip positions below inclusion threshold
          if (positionCredibility < inclusionThreshold) {
            continue;
          }

          const evidenceWeight = parseFloat(position.evidence_weight_value);

          // Accumulate weighted credibility
          totalWeightedCredibility += positionCredibility * evidenceWeight;
          totalWeight += evidenceWeight;
        }
      }

      // Return weighted average, or 0.5 if no credible positions
      if (totalWeight > 0) {
        const finalScore = totalWeightedCredibility / totalWeight;
        return Math.min(1.0, Math.max(0.0, finalScore));
      } else {
        return 0.5;
      }
    } catch (error) {
      console.error(`Error calculating node credibility for ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Get position details with evidence
   *
   * @private
   */
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

  /**
   * Calculate all credibility factors for a position
   *
   * @private
   */
  private async calculatePositionFactors(position: any): Promise<CredibilityFactors> {
    // Factor 1: Evidence quality (AI-evaluated, stored in DB)
    const evidenceQuality = position.evidence_quality_score || 0.5;

    // Factor 2: Evidence weight (from evidence type hierarchy)
    const evidenceWeight = parseFloat(position.evidence_type_weight || 0.5);

    // Factor 3: Source credibility (historical track record)
    const sourceCredibility = await this.calculateSourceCredibility(position.evidence_links);

    // Factor 4: Position coherence (AI-evaluated, stored in DB)
    const positionCoherence = position.coherence_score || 0.5;

    // Factor 5: Community signal (votes with diminishing returns)
    const communitySignal = this.calculateCommunitySignal(
      position.upvotes || 0,
      position.downvotes || 0
    );

    return {
      evidenceQuality,
      evidenceWeight,
      sourceCredibility,
      positionCoherence,
      communitySignal
    };
  }

  /**
   * Calculate source credibility from historical track record
   *
   * Evaluates sources based on their past accuracy and reliability.
   *
   * @private
   */
  private async calculateSourceCredibility(evidenceLinks: string[] = []): Promise<number> {
    if (!evidenceLinks || evidenceLinks.length === 0) {
      return 0.2; // No sources = very low credibility
    }

    try {
      // Extract source IDs from evidence links (if available)
      // For now, use a simplified approach
      // In future: track source performance in database

      // TODO: Implement source tracking system
      // - Track historical accuracy of each source
      // - Weight by recency (time decay)
      // - Consider independence (multiple independent sources > single source)

      // Placeholder: Assume moderate credibility if sources provided
      return 0.6;
    } catch (error) {
      console.error('Error calculating source credibility:', error);
      return 0.5;
    }
  }

  /**
   * Calculate community signal from votes (minimal impact)
   *
   * Implements diminishing returns to cap vote influence at 100 votes.
   * Vote ratio matters more than absolute count.
   *
   * Formula:
   * - Vote ratio: upvotes / total_votes
   * - Diminishing returns: min(1.0, total_votes / 100)
   * - Final: ratio × diminishing_factor
   *
   * Examples:
   * - 10 upvotes, 0 downvotes: 1.0 × 0.1 = 0.10
   * - 100 upvotes, 0 downvotes: 1.0 × 1.0 = 1.00
   * - 150 upvotes, 50 downvotes: 0.75 × 1.0 = 0.75 (capped at 200 votes)
   *
   * @private
   */
  private calculateCommunitySignal(upvotes: number, downvotes: number): number {
    const totalVotes = upvotes + downvotes;

    if (totalVotes === 0) {
      return 0.5; // Neutral if no votes
    }

    // Vote ratio (0.0 to 1.0)
    const voteRatio = upvotes / totalVotes;

    // Diminishing returns: cap influence at 100 votes
    const diminishingFactor = Math.min(1.0, totalVotes / 100.0);

    // Final community signal
    return voteRatio * diminishingFactor;
  }

  /**
   * Update position credibility in database
   *
   * @private
   */
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
        source_credibility_score = $3,
        coherence_score = $4,
        last_credibility_update = NOW(),
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        credibility,
        factors.evidenceQuality,
        factors.sourceCredibility,
        factors.positionCoherence,
        positionId
      ]
    );
  }

  /**
   * Recalculate credibility for all positions in an inquiry
   *
   * @param inquiryId - Inquiry ID
   * @returns Array of updated positions with new scores
   */
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

      // Determine status based on credibility (will be refined by ThresholdFilteringService)
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

  /**
   * Recalculate credibility for all nodes (batch operation)
   *
   * Use this for migrations or system-wide recalculation.
   *
   * @param limit - Maximum nodes to process per batch (default: 100)
   * @returns Number of nodes updated
   */
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
          `
          UPDATE public."Nodes"
          SET
            credibility_score = $1,
            last_credibility_update = NOW()
          WHERE id = $2
          `,
          [credibility, node.id]
        );

        updated++;
      } catch (error) {
        console.error(`Failed to update node ${node.id}:`, error);
      }
    }

    return updated;
  }
}
