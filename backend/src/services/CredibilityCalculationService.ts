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
 * Helper to safely parse JSONB props
 */
function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  return typeof props === 'string' ? JSON.parse(props) : props;
}

/**
 * CredibilityCalculationService
 *
 * Implements DYNAMIC RELIANCE credibility scoring with THRESHOLD FILTERING.
 *
 * ARCHITECTURE: Uses strict 4-table schema (node_types, edge_types, nodes, edges)
 * All data is stored in JSONB props field - no standalone tables.
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

  // Cache for node type IDs to avoid repeated lookups
  private nodeTypeCache: Map<string, string> = new Map();
  private edgeTypeCache: Map<string, string> = new Map();

  constructor(private pool: Pool) { }

  /**
   * Get node type ID by name (cached)
   */
  private async getNodeTypeId(name: string): Promise<string | null> {
    if (this.nodeTypeCache.has(name)) {
      return this.nodeTypeCache.get(name)!;
    }

    const result = await this.pool.query(
      `SELECT id FROM node_types WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    this.nodeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Get edge type ID by name (cached)
   */
  private async getEdgeTypeId(name: string): Promise<string | null> {
    if (this.edgeTypeCache.has(name)) {
      return this.edgeTypeCache.get(name)!;
    }

    const result = await this.pool.query(
      `SELECT id FROM edge_types WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    this.edgeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

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

      // Update Node props with credibility score
      await this.pool.query(
        `UPDATE nodes
         SET props = props || $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [
          JSON.stringify({
            credibilityScore: clampedScore,
            lastCredibilityUpdate: new Date().toISOString()
          }),
          nodeId
        ]
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
      // Get required type IDs
      const consensusVoteTypeId = await this.getNodeTypeId('ConsensusVote');
      const votesOnEdgeTypeId = await this.getEdgeTypeId('VOTES_ON');
      const userProfileTypeId = await this.getNodeTypeId('UserProfile');
      const authoredByEdgeTypeId = await this.getEdgeTypeId('AUTHORED_BY');

      if (!consensusVoteTypeId || !votesOnEdgeTypeId) {
        console.warn('Required node/edge types not found for consensus calculation');
        return 0.5;
      }

      // Query votes with voter reputation from UserProfile nodes
      const query = `
        SELECT
          v.id,
          v.props as vote_props,
          COALESCE((up.props->>'reputation')::real, 0.5) as voter_reputation
        FROM edges e
        JOIN nodes v ON e.source_node_id = v.id
        LEFT JOIN edges author_edge ON v.id = author_edge.source_node_id
          AND author_edge.edge_type_id = $4
        LEFT JOIN nodes up ON author_edge.target_node_id = up.id
          AND up.node_type_id = $5
        WHERE e.target_node_id = $1
          AND e.edge_type_id = $2
          AND v.node_type_id = $3
          AND v.archived_at IS NULL
      `;

      const result = await this.pool.query(query, [
        nodeId,
        votesOnEdgeTypeId,
        consensusVoteTypeId,
        authoredByEdgeTypeId,
        userProfileTypeId
      ]);

      if (result.rows.length === 0) {
        await this.updateNodeConsensus(nodeId, 0.5);
        return 0.5;
      }

      let weightedSum = 0.0;
      let totalWeight = 0.0;

      for (const row of result.rows) {
        const reputation = parseFloat(row.voter_reputation || '0.5');
        const voteProps = parseProps(row.vote_props);

        // THRESHOLD FILTERING
        // Ignore votes from low-reputation users
        if (reputation < this.DEFAULT_THRESHOLD) {
          continue;
        }

        const weight = reputation;

        let value = 0.5;
        if (voteProps.voteType === 'support' || voteProps.voteType === 'agree' || voteProps.voteType === 'VALID') {
          value = 1.0;
        } else if (voteProps.voteType === 'oppose' || voteProps.voteType === 'disagree' || voteProps.voteType === 'INVALID') {
          value = 0.0;
        } else {
          value = 0.5;
        }

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
      `UPDATE nodes
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ consensusScore: score }), nodeId]
    );
  }

  /**
   * Helper: Calculate Intrinsic Score (from FormalInquiry nodes)
   */
  private async calculateDirectNodeCredibility(nodeId: string): Promise<number | null> {
    // Get required type IDs
    const formalInquiryTypeId = await this.getNodeTypeId('FormalInquiry');
    const investigatesEdgeTypeId = await this.getEdgeTypeId('INVESTIGATES');
    const credibilityThresholdTypeId = await this.getNodeTypeId('CredibilityThreshold');

    if (!formalInquiryTypeId || !investigatesEdgeTypeId) {
      return null;
    }

    // Query FormalInquiry nodes that target this node
    const inquiriesQuery = `
      SELECT
        inquiry.id,
        inquiry.props as inquiry_props,
        COALESCE((threshold.props->>'inclusionThreshold')::real, 0.5) as inclusion_threshold
      FROM nodes inquiry
      JOIN edges e ON inquiry.id = e.source_node_id
      LEFT JOIN nodes threshold ON threshold.node_type_id = $4
        AND (threshold.props->>'inquiryType')::text = COALESCE((inquiry.props->>'inquiryType')::text, 'default')
      WHERE inquiry.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.target_node_id = $3
        AND (inquiry.props->>'status')::text IN ('active', 'open', 'evaluating')
        AND COALESCE((inquiry.props->>'isMerged')::boolean, false) = false
        AND inquiry.archived_at IS NULL
    `;

    const inquiries = await this.pool.query(inquiriesQuery, [
      formalInquiryTypeId,
      investigatesEdgeTypeId,
      nodeId,
      credibilityThresholdTypeId
    ]);

    if (inquiries.rows.length === 0) {
      return null;
    }

    let totalWeightedCredibility = 0.0;
    let totalWeight = 0.0;

    for (const inquiry of inquiries.rows) {
      const inclusionThreshold = inquiry.inclusion_threshold || 0.5;

      // Get positions for this inquiry
      const positions = await this.getInquiryPositions(inquiry.id);

      for (const position of positions) {
        const positionCredibility = position.credibilityScore || 0.5;

        // Skip positions below inclusion threshold
        if (positionCredibility < inclusionThreshold) {
          continue;
        }

        const evidenceWeight = position.evidenceWeight || 0.5;

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
   * Get positions for an inquiry using node/edge pattern
   */
  private async getInquiryPositions(inquiryId: string): Promise<any[]> {
    const positionTypeId = await this.getNodeTypeId('Position');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');
    const evidenceTypeNodeTypeId = await this.getNodeTypeId('EvidenceType');
    const hasEvidenceTypeEdgeId = await this.getEdgeTypeId('HAS_EVIDENCE_TYPE');

    if (!positionTypeId || !hasPositionEdgeTypeId) {
      return [];
    }

    const query = `
      SELECT
        pos.id,
        pos.props as position_props,
        COALESCE((et.props->>'weight')::real, 0.5) as evidence_weight
      FROM nodes pos
      JOIN edges e ON pos.id = e.target_node_id
      LEFT JOIN edges et_edge ON pos.id = et_edge.source_node_id
        AND et_edge.edge_type_id = $4
      LEFT JOIN nodes et ON et_edge.target_node_id = et.id
        AND et.node_type_id = $5
      WHERE pos.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.source_node_id = $3
        AND COALESCE((pos.props->>'status')::text, 'active') != 'archived'
        AND pos.archived_at IS NULL
    `;

    const result = await this.pool.query(query, [
      positionTypeId,
      hasPositionEdgeTypeId,
      inquiryId,
      hasEvidenceTypeEdgeId,
      evidenceTypeNodeTypeId
    ]);

    return result.rows.map(row => {
      const props = parseProps(row.position_props);
      return {
        id: row.id,
        credibilityScore: props.credibilityScore || 0.5,
        evidenceWeight: row.evidence_weight || 0.5,
        ...props
      };
    });
  }

  /**
   * Helper: Calculate Structural Multiplier
   * Returns a value between 0.0 and 1.0.
   * THRESHOLD FILTERING APPLIED.
   */
  private async calculateStructuralMultiplier(nodeId: string, edgeTypeNames: string[]): Promise<number> {
    // Get edge type IDs
    const edgeTypeIds: string[] = [];
    for (const name of edgeTypeNames) {
      const id = await this.getEdgeTypeId(name);
      if (id) edgeTypeIds.push(id);
    }

    if (edgeTypeIds.length === 0) {
      return 1.0;
    }

    const query = `
       SELECT
          COALESCE((target.props->>'credibilityScore')::real, 0.5) as child_score,
          COALESCE((e.props->>'credibilityScore')::real, 1.0) as edge_score
       FROM edges e
       JOIN nodes target ON e.target_node_id = target.id
       WHERE e.source_node_id = $1
         AND e.edge_type_id = ANY($2)
         AND target.archived_at IS NULL
         AND e.archived_at IS NULL
    `;

    const children = await this.pool.query(query, [nodeId, edgeTypeIds]);

    if (children.rows.length === 0) {
      return 1.0; // Stand on own merit
    }

    let sumEffectiveScores = 0.0;
    let count = 0;

    for (const row of children.rows) {
      const childScore = parseFloat(row.child_score);
      const edgeScore = parseFloat(row.edge_score);

      // THRESHOLD FILTERING
      // If either the child node OR the edge is untrustworthy (< 0.5), ignore it.
      if (childScore < this.DEFAULT_THRESHOLD || edgeScore < this.DEFAULT_THRESHOLD) {
        continue;
      }

      // Effective Score = Child * Connection Strength
      const effectiveScore = childScore * edgeScore;

      sumEffectiveScores += effectiveScore;
      count++;
    }

    return count > 0 ? (sumEffectiveScores / count) : 1.0;
  }

  /**
   * Helper: Calculate Investigation Penalty Multiplier
   * Checks for Formal Inquiries (LogicLens) that have investigated this node.
   * If a Logic Fallacy is detected (aiDetermination) with high confidence, it applies a penalty.
   */
  private async calculateInvestigationMultiplier(nodeId: string): Promise<number> {
    const formalInquiryTypeId = await this.getNodeTypeId('FormalInquiry');
    const investigatesEdgeTypeId = await this.getEdgeTypeId('INVESTIGATES');

    if (!formalInquiryTypeId || !investigatesEdgeTypeId) {
      return 1.0;
    }

    const query = `
       SELECT
          COALESCE((inquiry.props->>'consensusScore')::real, 0.5) as consensus_score,
          inquiry.props->>'aiDetermination' as ai_determination,
          COALESCE((e.props->>'weight')::real, 1.0) as edge_weight
       FROM edges e
       JOIN nodes inquiry ON e.source_node_id = inquiry.id
       WHERE e.target_node_id = $1
         AND e.edge_type_id = $2
         AND inquiry.node_type_id = $3
         AND inquiry.archived_at IS NULL
    `;

    const investigations = await this.pool.query(query, [
      nodeId,
      investigatesEdgeTypeId,
      formalInquiryTypeId
    ]);

    if (investigations.rows.length === 0) {
      return 1.0; // No investigations
    }

    let totalPenalty = 0.0;

    for (const row of investigations.rows) {
      const confidence = parseFloat(row.consensus_score);
      const determination = row.ai_determination;

      // THRESHOLD FILTERING
      // 1. Must have a valid Fallacy/Determination (not null/empty)
      // 2. Must have High Confidence (> 0.5)
      if (!determination || determination === 'Valid' || determination === 'Sound') {
        continue; // No fallacy detected, or explicitly valid.
      }

      if (confidence < this.DEFAULT_THRESHOLD) {
        continue; // Low confidence in the fallacy detection.
      }

      // Penalty Calculation
      const penalty = confidence * parseFloat(row.edge_weight);

      totalPenalty += penalty;
    }

    // Final Multiplier can't go below 0.
    const multiplier = Math.max(0.0, 1.0 - totalPenalty);

    return multiplier;
  }

  private async getPositionDetails(positionId: string): Promise<any> {
    const positionTypeId = await this.getNodeTypeId('Position');
    const evidenceTypeNodeTypeId = await this.getNodeTypeId('EvidenceType');
    const hasEvidenceTypeEdgeId = await this.getEdgeTypeId('HAS_EVIDENCE_TYPE');

    if (!positionTypeId) {
      return null;
    }

    const query = `
      SELECT
        pos.id,
        pos.props as position_props,
        COALESCE((et.props->>'weight')::real, 0.5) as evidence_type_weight,
        (et.props->>'code')::text as evidence_type_code
      FROM nodes pos
      LEFT JOIN edges et_edge ON pos.id = et_edge.source_node_id
        AND et_edge.edge_type_id = $3
      LEFT JOIN nodes et ON et_edge.target_node_id = et.id
        AND et.node_type_id = $4
      WHERE pos.id = $1
        AND pos.node_type_id = $2
    `;

    const result = await this.pool.query(query, [
      positionId,
      positionTypeId,
      hasEvidenceTypeEdgeId,
      evidenceTypeNodeTypeId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const props = parseProps(row.position_props);

    return {
      id: row.id,
      ...props,
      evidence_type_weight: row.evidence_type_weight,
      evidence_type_code: row.evidence_type_code
    };
  }

  private async calculatePositionFactors(position: any): Promise<CredibilityFactors> {
    const evidenceQuality = position.evidenceQualityScore || position.evidence_quality_score || 0.5;
    const evidenceWeight = parseFloat(position.evidence_type_weight || '0.5');
    const positionCoherence = position.coherenceScore || position.coherence_score || 0.5;

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
      `UPDATE nodes
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [
        JSON.stringify({
          credibilityScore: credibility,
          evidenceQualityScore: factors.evidenceQuality,
          coherenceScore: factors.positionCoherence,
          lastCredibilityUpdate: new Date().toISOString()
        }),
        positionId
      ]
    );
  }

  async recalculateInquiryPositions(inquiryId: string): Promise<ScoredPosition[]> {
    const positions = await this.getInquiryPositions(inquiryId);

    const scoredPositions: ScoredPosition[] = [];

    for (const position of positions) {
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
        stance: details?.stance || '',
        argument: details?.argument || '',
        credibility,
        factors,
        status
      });
    }
    return scoredPositions;
  }

  async recalculateAllNodeCredibility(limit: number = 100): Promise<number> {
    // Get nodes ordered by last credibility update
    const nodes = await this.pool.query(
      `SELECT id FROM nodes
       WHERE archived_at IS NULL
       ORDER BY (props->>'lastCredibilityUpdate')::timestamp ASC NULLS FIRST
       LIMIT $1`,
      [limit]
    );

    let updated = 0;
    for (const node of nodes.rows) {
      try {
        await this.calculateNodeCredibility(node.id);
        updated++;
      } catch (error) {
        console.error(`Failed to update node ${node.id}: `, error);
      }
    }
    return updated;
  }
}
