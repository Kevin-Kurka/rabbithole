import { Pool } from 'pg';

/**
 * SourceCredibilityService
 *
 * Calculates comprehensive credibility scores for nodes based on multiple factors:
 * - Challenge outcomes (existing database function)
 * - Deception annotations (AI-detected fallacies, exaggerations)
 * - Community votes and engagement
 * - Source verification status
 * - Temporal relevance
 */

export interface CredibilityBreakdown {
  nodeId: string;
  overallScore: number; // 0.0-1.0 (combined score)

  // Individual factors
  challengeScore: number; // From challenge outcomes (0.0-1.0)
  annotationScore: number; // From deception detection (0.0-1.0)
  communityScore: number; // From votes and engagement (0.0-1.0)
  verificationScore: number; // From source verification (0.0-1.0)
  freshnessScore: number; // From publication date (0.0-1.0)

  // Supporting data
  totalChallenges: number;
  sustainedChallenges: number;
  dismissedChallenges: number;
  deceptionCount: number;
  highSeverityDeceptions: number;
  mediumSeverityDeceptions: number;
  lowSeverityDeceptions: number;
  communityVotes: number;
  isVerified: boolean;
  ageInDays: number;

  // Recommendations
  warnings: string[];
  strengths: string[];
}

export interface CredibilityUpdate {
  nodeId: string;
  oldScore: number;
  newScore: number;
  factors: {
    challenge: number;
    annotation: number;
    community: number;
    verification: number;
    freshness: number;
  };
}

export class SourceCredibilityService {
  /**
   * Calculate comprehensive credibility score for a node
   */
  async calculateCredibility(
    pool: Pool,
    nodeId: string
  ): Promise<CredibilityBreakdown> {
    // Fetch node data
    const nodeResult = await pool.query(
      `SELECT n.*, nt.name as node_type_name
       FROM public."Nodes" n
       LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1`,
      [nodeId]
    );

    if (nodeResult.rows.length === 0) {
      throw new Error('Node not found');
    }

    const node = nodeResult.rows[0];
    const props = typeof node.props === 'string' ? JSON.parse(node.props) : node.props;

    // 1. Challenge-based credibility (from existing database function)
    const challengeResult = await pool.query(
      'SELECT calculate_node_credibility($1) as score',
      [nodeId]
    );
    const challengeScore = challengeResult.rows[0].score;

    // Get challenge breakdown
    const challengeBreakdownResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN resolution = 'challenge_sustained' THEN 1 ELSE 0 END) as sustained,
        SUM(CASE WHEN resolution = 'challenge_dismissed' THEN 1 ELSE 0 END) as dismissed
       FROM public."Challenges"
       WHERE target_node_id = $1
         AND status = 'resolved'`,
      [nodeId]
    );

    const challengeBreakdown = challengeBreakdownResult.rows[0];

    // 2. Annotation-based credibility (deception detection)
    const annotationResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_severity,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_severity
       FROM public."Annotations"
       WHERE target_node_id = $1
         AND annotation_type = 'deception'
         AND status IN ('approved', 'pending_review')`,
      [nodeId]
    );

    const annotations = annotationResult.rows[0];
    const annotationScore = this.calculateAnnotationScore(
      parseInt(annotations.total),
      parseInt(annotations.high_severity),
      parseInt(annotations.medium_severity),
      parseInt(annotations.low_severity)
    );

    // 3. Community-based credibility (votes, engagement)
    const communityResult = await pool.query(
      `SELECT COUNT(DISTINCT cv.user_id) as vote_count
       FROM public."ChallengeVotes" cv
       JOIN public."Challenges" c ON cv.challenge_id = c.id
       WHERE c.target_node_id = $1`,
      [nodeId]
    );

    const voteCount = parseInt(communityResult.rows[0].vote_count);
    const communityScore = this.calculateCommunityScore(voteCount);

    // 4. Verification score (source credibility)
    const isVerified = props.verified === true || props.peer_reviewed === true;
    const verificationScore = isVerified ? 1.0 : 0.5;

    // 5. Freshness score (temporal relevance)
    const createdAt = new Date(node.created_at);
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const freshnessScore = this.calculateFreshnessScore(ageInDays);

    // Calculate overall score (weighted average)
    const weights = {
      challenge: 0.35,
      annotation: 0.30,
      community: 0.15,
      verification: 0.10,
      freshness: 0.10,
    };

    const overallScore =
      challengeScore * weights.challenge +
      annotationScore * weights.annotation +
      communityScore * weights.community +
      verificationScore * weights.verification +
      freshnessScore * weights.freshness;

    // Generate warnings and strengths
    const warnings: string[] = [];
    const strengths: string[] = [];

    if (parseInt(annotations.high_severity) > 0) {
      warnings.push(`Contains ${annotations.high_severity} high-severity deception(s)`);
    }
    if (parseInt(challengeBreakdown.sustained) > 0) {
      warnings.push(`Has ${challengeBreakdown.sustained} sustained challenge(s)`);
    }
    if (!isVerified) {
      warnings.push('Source not verified or peer-reviewed');
    }
    if (ageInDays > 365) {
      warnings.push(`Information is ${Math.floor(ageInDays / 365)} year(s) old`);
    }

    if (parseInt(challengeBreakdown.dismissed) > 0) {
      strengths.push(`Successfully defended against ${challengeBreakdown.dismissed} challenge(s)`);
    }
    if (parseInt(annotations.total) === 0) {
      strengths.push('No deception detected');
    }
    if (isVerified) {
      strengths.push('Verified or peer-reviewed source');
    }
    if (voteCount >= 10) {
      strengths.push(`High community engagement (${voteCount} participants)`);
    }

    return {
      nodeId,
      overallScore: Math.max(0, Math.min(1, overallScore)),
      challengeScore,
      annotationScore,
      communityScore,
      verificationScore,
      freshnessScore,
      totalChallenges: parseInt(challengeBreakdown.total) || 0,
      sustainedChallenges: parseInt(challengeBreakdown.sustained) || 0,
      dismissedChallenges: parseInt(challengeBreakdown.dismissed) || 0,
      deceptionCount: parseInt(annotations.total) || 0,
      highSeverityDeceptions: parseInt(annotations.high_severity) || 0,
      mediumSeverityDeceptions: parseInt(annotations.medium_severity) || 0,
      lowSeverityDeceptions: parseInt(annotations.low_severity) || 0,
      communityVotes: voteCount,
      isVerified,
      ageInDays,
      warnings,
      strengths,
    };
  }

  /**
   * Update node weight with comprehensive credibility score
   */
  async updateNodeCredibility(
    pool: Pool,
    nodeId: string
  ): Promise<CredibilityUpdate> {
    // Get current weight
    const currentResult = await pool.query(
      'SELECT weight FROM public."Nodes" WHERE id = $1',
      [nodeId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Node not found');
    }

    const oldScore = currentResult.rows[0].weight;

    // Calculate new credibility
    const breakdown = await this.calculateCredibility(pool, nodeId);

    // Update node weight
    await pool.query(
      `UPDATE public."Nodes"
       SET weight = $1, updated_at = now()
       WHERE id = $2`,
      [breakdown.overallScore, nodeId]
    );

    return {
      nodeId,
      oldScore,
      newScore: breakdown.overallScore,
      factors: {
        challenge: breakdown.challengeScore,
        annotation: breakdown.annotationScore,
        community: breakdown.communityScore,
        verification: breakdown.verificationScore,
        freshness: breakdown.freshnessScore,
      },
    };
  }

  /**
   * Batch update credibility for multiple nodes
   */
  async batchUpdateCredibility(
    pool: Pool,
    nodeIds: string[]
  ): Promise<CredibilityUpdate[]> {
    const updates: CredibilityUpdate[] = [];

    for (const nodeId of nodeIds) {
      try {
        const update = await this.updateNodeCredibility(pool, nodeId);
        updates.push(update);
      } catch (error) {
        console.error(`Failed to update credibility for node ${nodeId}:`, error);
      }
    }

    return updates;
  }

  /**
   * Recalculate credibility for all nodes affected by a recent change
   */
  async recalculateAffectedNodes(
    pool: Pool,
    options: {
      challengeId?: string;
      annotationId?: string;
      since?: Date;
    }
  ): Promise<CredibilityUpdate[]> {
    let affectedNodeIds: string[] = [];

    // Find affected nodes based on challenge
    if (options.challengeId) {
      const result = await pool.query(
        'SELECT DISTINCT target_node_id FROM public."Challenges" WHERE id = $1',
        [options.challengeId]
      );
      affectedNodeIds.push(...result.rows.map(r => r.target_node_id).filter(Boolean));
    }

    // Find affected nodes based on annotation
    if (options.annotationId) {
      const result = await pool.query(
        'SELECT DISTINCT target_node_id FROM public."Annotations" WHERE id = $1',
        [options.annotationId]
      );
      affectedNodeIds.push(...result.rows.map(r => r.target_node_id).filter(Boolean));
    }

    // Find nodes modified since date
    if (options.since) {
      const result = await pool.query(
        'SELECT DISTINCT id FROM public."Nodes" WHERE updated_at >= $1',
        [options.since]
      );
      affectedNodeIds.push(...result.rows.map(r => r.id));
    }

    // Remove duplicates
    affectedNodeIds = [...new Set(affectedNodeIds)];

    return await this.batchUpdateCredibility(pool, affectedNodeIds);
  }

  /**
   * Calculate annotation score based on deception count and severity
   */
  private calculateAnnotationScore(
    total: number,
    high: number,
    medium: number,
    low: number
  ): number {
    if (total === 0) {
      return 1.0; // Perfect score if no deceptions
    }

    // Weighted penalty based on severity
    const highPenalty = high * 0.15;
    const mediumPenalty = medium * 0.08;
    const lowPenalty = low * 0.03;

    const totalPenalty = highPenalty + mediumPenalty + lowPenalty;

    // Start from 1.0 and subtract penalties
    const score = Math.max(0, 1.0 - totalPenalty);

    return score;
  }

  /**
   * Calculate community score based on engagement
   */
  private calculateCommunityScore(voteCount: number): number {
    if (voteCount === 0) {
      return 0.5; // Neutral score if no votes
    }

    // Logarithmic scaling: more votes = higher score, but diminishing returns
    // 5 votes = 0.7, 10 votes = 0.8, 20 votes = 0.9, 50+ votes = 1.0
    const score = 0.5 + Math.min(0.5, Math.log10(voteCount + 1) / 2);

    return score;
  }

  /**
   * Calculate freshness score based on age
   */
  private calculateFreshnessScore(ageInDays: number): number {
    if (ageInDays <= 30) {
      return 1.0; // Very fresh (< 1 month)
    } else if (ageInDays <= 180) {
      return 0.9; // Recent (< 6 months)
    } else if (ageInDays <= 365) {
      return 0.8; // Moderate (< 1 year)
    } else if (ageInDays <= 730) {
      return 0.6; // Older (1-2 years)
    } else {
      return Math.max(0.3, 0.6 - (ageInDays - 730) / 3650); // Decay over time
    }
  }

  /**
   * Get credibility for multiple nodes (batch query)
   */
  async getBatchCredibility(
    pool: Pool,
    nodeIds: string[]
  ): Promise<CredibilityBreakdown[]> {
    const results: CredibilityBreakdown[] = [];

    for (const nodeId of nodeIds) {
      try {
        const breakdown = await this.calculateCredibility(pool, nodeId);
        results.push(breakdown);
      } catch (error) {
        console.error(`Failed to calculate credibility for node ${nodeId}:`, error);
      }
    }

    return results;
  }
}

// Export singleton instance
export const sourceCredibilityService = new SourceCredibilityService();
