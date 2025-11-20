import { Pool } from 'pg';

/**
 * Credibility thresholds for an inquiry type
 */
export interface CredibilityThreshold {
  inquiryType: string;
  inclusionThreshold: number;    // Minimum credibility to affect node (e.g., 0.70)
  displayThreshold: number;      // Minimum credibility to show in UI (e.g., 0.30)
  autoAmendThreshold: number;    // Minimum credibility to trigger amendments (e.g., 0.85)
}

/**
 * Position with threshold-based status
 */
export interface FilteredPosition {
  id: string;
  inquiryId: string;
  createdBy: string;
  stance: 'supporting' | 'opposing' | 'neutral';
  argument: string;
  evidenceType: string;
  evidenceLinks: string[];

  // Credibility scoring
  credibilityScore: number;
  evidenceQualityScore: number;
  sourceCredibilityScore: number;
  coherenceScore: number;

  // Community feedback
  upvotes: number;
  downvotes: number;

  // Threshold-based classification
  status: 'verified' | 'credible' | 'weak' | 'excluded' | 'archived';
  includedInCalculation: boolean; // True if >= inclusion threshold
  visibleInUI: boolean;           // True if >= display threshold
  canAmendNode: boolean;          // True if >= auto-amend threshold

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Grouped positions by threshold status
 */
export interface GroupedPositions {
  verified: FilteredPosition[];    // >= auto_amend_threshold
  credible: FilteredPosition[];    // >= inclusion_threshold
  weak: FilteredPosition[];        // >= display_threshold
  excluded: FilteredPosition[];    // < display_threshold
}

/**
 * ThresholdFilteringService
 *
 * Implements threshold-based filtering of inquiry positions to ensure only credible
 * arguments influence node credibility. Positions below configurable thresholds are
 * excluded from calculations, preventing non-credible positions from affecting truth.
 *
 * Three Threshold Levels:
 * 1. **Auto-Amend Threshold**: Highest bar - triggers automatic node amendments
 * 2. **Inclusion Threshold**: Medium bar - included in node credibility calculation
 * 3. **Display Threshold**: Lowest bar - visible in UI but not used in calculations
 * 4. **Below Display**: Completely excluded (hidden by default)
 *
 * Type-Specific Thresholds:
 * - Scientific inquiries: Highest thresholds (0.75/0.35/0.90)
 * - Statistical validity: High standards (0.75/0.40/0.88)
 * - Factual accuracy: High standards (0.70/0.30/0.85)
 * - Ethical evaluation: Lower thresholds (0.55/0.25/0.75)
 * - Bias detection: Lowest thresholds (0.50/0.20/0.70)
 */
export class ThresholdFilteringService {
  constructor(private pool: Pool) {}

  /**
   * Get threshold configuration for an inquiry type
   *
   * @param inquiryType - Type of inquiry (e.g., 'factual_accuracy', 'scientific_inquiry')
   * @returns Threshold configuration
   */
  async getThreshold(inquiryType: string): Promise<CredibilityThreshold> {
    const result = await this.pool.query(
      `
      SELECT
        inquiry_type as "inquiryType",
        inclusion_threshold as "inclusionThreshold",
        display_threshold as "displayThreshold",
        auto_amend_threshold as "autoAmendThreshold"
      FROM public."CredibilityThresholds"
      WHERE inquiry_type = $1
      `,
      [inquiryType]
    );

    if (result.rows.length === 0) {
      // Default thresholds if type not found
      return {
        inquiryType,
        inclusionThreshold: 0.60,
        displayThreshold: 0.30,
        autoAmendThreshold: 0.80
      };
    }

    return result.rows[0];
  }

  /**
   * Get all credible positions for an inquiry (above inclusion threshold)
   *
   * @param inquiryId - Inquiry ID
   * @returns Array of positions that meet inclusion threshold
   */
  async getCrediblePositions(inquiryId: string): Promise<FilteredPosition[]> {
    const inquiry = await this.getInquiry(inquiryId);
    const threshold = await this.getThreshold(inquiry.inquiryType);

    const result = await this.pool.query(
      `
      SELECT
        p.id,
        p.inquiry_id as "inquiryId",
        p.created_by_user_id as "createdBy",
        p.stance,
        p.argument,
        p.evidence_links as "evidenceLinks",
        p.credibility_score as "credibilityScore",
        p.evidence_quality_score as "evidenceQualityScore",
        p.source_credibility_score as "sourceCredibilityScore",
        p.coherence_score as "coherenceScore",
        p.upvotes,
        p.downvotes,
        p.status,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        et.code as "evidenceType"
      FROM public."InquiryPositions" p
      LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
      WHERE p.inquiry_id = $1
        AND p.credibility_score >= $2
      ORDER BY p.credibility_score DESC
      `,
      [inquiryId, threshold.inclusionThreshold]
    );

    return result.rows.map(row => this.mapToFilteredPosition(row, threshold));
  }

  /**
   * Get all positions for an inquiry, grouped by threshold status
   *
   * @param inquiryId - Inquiry ID
   * @returns Positions grouped into verified, credible, weak, and excluded
   */
  async getGroupedPositions(inquiryId: string): Promise<GroupedPositions> {
    const inquiry = await this.getInquiry(inquiryId);
    const threshold = await this.getThreshold(inquiry.inquiryType);

    const result = await this.pool.query(
      `
      SELECT
        p.id,
        p.inquiry_id as "inquiryId",
        p.created_by_user_id as "createdBy",
        p.stance,
        p.argument,
        p.evidence_links as "evidenceLinks",
        p.credibility_score as "credibilityScore",
        p.evidence_quality_score as "evidenceQualityScore",
        p.source_credibility_score as "sourceCredibilityScore",
        p.coherence_score as "coherenceScore",
        p.upvotes,
        p.downvotes,
        p.status,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        et.code as "evidenceType"
      FROM public."InquiryPositions" p
      LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
      WHERE p.inquiry_id = $1
        AND p.status != 'archived'
      ORDER BY p.credibility_score DESC
      `,
      [inquiryId]
    );

    const verified: FilteredPosition[] = [];
    const credible: FilteredPosition[] = [];
    const weak: FilteredPosition[] = [];
    const excluded: FilteredPosition[] = [];

    for (const row of result.rows) {
      const position = this.mapToFilteredPosition(row, threshold);

      if (position.canAmendNode) {
        verified.push(position);
      } else if (position.includedInCalculation) {
        credible.push(position);
      } else if (position.visibleInUI) {
        weak.push(position);
      } else {
        excluded.push(position);
      }
    }

    return { verified, credible, weak, excluded };
  }

  /**
   * Update position status based on credibility and thresholds
   *
   * Called after credibility recalculation to update status field.
   *
   * @param positionId - Position ID
   */
  async updatePositionStatus(positionId: string): Promise<void> {
    // Get position with inquiry type
    const result = await this.pool.query(
      `
      SELECT
        p.credibility_score,
        i.inquiry_type
      FROM public."InquiryPositions" p
      JOIN public."Inquiries" i ON p.inquiry_id = i.id
      WHERE p.id = $1
      `,
      [positionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const { credibility_score, inquiry_type } = result.rows[0];
    const threshold = await this.getThreshold(inquiry_type);

    // Determine new status
    let newStatus: string;
    if (credibility_score >= threshold.autoAmendThreshold) {
      newStatus = 'verified';
    } else if (credibility_score >= threshold.inclusionThreshold) {
      newStatus = 'credible';
    } else if (credibility_score >= threshold.displayThreshold) {
      newStatus = 'weak';
    } else {
      newStatus = 'excluded';
    }

    // Update status in database
    await this.pool.query(
      `
      UPDATE public."InquiryPositions"
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [newStatus, positionId]
    );
  }

  /**
   * Batch update statuses for all positions in an inquiry
   *
   * @param inquiryId - Inquiry ID
   * @returns Number of positions updated
   */
  async updateAllPositionStatuses(inquiryId: string): Promise<number> {
    const positions = await this.pool.query(
      `
      SELECT id FROM public."InquiryPositions"
      WHERE inquiry_id = $1 AND status != 'archived'
      `,
      [inquiryId]
    );

    let updated = 0;

    for (const position of positions.rows) {
      try {
        await this.updatePositionStatus(position.id);
        updated++;
      } catch (error) {
        console.error(`Failed to update position ${position.id}:`, error);
      }
    }

    return updated;
  }

  /**
   * Check if a position qualifies for node amendment
   *
   * @param positionId - Position ID
   * @returns True if position meets auto-amend threshold
   */
  async canAmendNode(positionId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      SELECT
        p.credibility_score,
        i.inquiry_type
      FROM public."InquiryPositions" p
      JOIN public."Inquiries" i ON p.inquiry_id = i.id
      WHERE p.id = $1
      `,
      [positionId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { credibility_score, inquiry_type } = result.rows[0];
    const threshold = await this.getThreshold(inquiry_type);

    return credibility_score >= threshold.autoAmendThreshold;
  }

  /**
   * Get inquiry details
   *
   * @private
   */
  private async getInquiry(inquiryId: string): Promise<any> {
    const result = await this.pool.query(
      `
      SELECT * FROM public."Inquiries"
      WHERE id = $1
      `,
      [inquiryId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Inquiry not found: ${inquiryId}`);
    }

    return result.rows[0];
  }

  /**
   * Map database row to FilteredPosition
   *
   * @private
   */
  private mapToFilteredPosition(
    row: any,
    threshold: CredibilityThreshold
  ): FilteredPosition {
    const credibility = row.credibilityScore || 0.5;

    return {
      id: row.id,
      inquiryId: row.inquiryId,
      createdBy: row.createdBy,
      stance: row.stance,
      argument: row.argument,
      evidenceType: row.evidenceType || 'unknown',
      evidenceLinks: row.evidenceLinks || [],

      credibilityScore: credibility,
      evidenceQualityScore: row.evidenceQualityScore || 0.5,
      sourceCredibilityScore: row.sourceCredibilityScore || 0.5,
      coherenceScore: row.coherenceScore || 0.5,

      upvotes: row.upvotes || 0,
      downvotes: row.downvotes || 0,

      status: row.status,
      includedInCalculation: credibility >= threshold.inclusionThreshold,
      visibleInUI: credibility >= threshold.displayThreshold,
      canAmendNode: credibility >= threshold.autoAmendThreshold,

      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Get threshold statistics for an inquiry
   *
   * Returns count of positions in each threshold tier.
   *
   * @param inquiryId - Inquiry ID
   */
  async getThresholdStatistics(inquiryId: string): Promise<{
    total: number;
    verified: number;
    credible: number;
    weak: number;
    excluded: number;
    thresholds: CredibilityThreshold;
  }> {
    const inquiry = await this.getInquiry(inquiryId);
    const threshold = await this.getThreshold(inquiry.inquiry_type);

    const result = await this.pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE credibility_score >= $1) as verified,
        COUNT(*) FILTER (WHERE credibility_score >= $2 AND credibility_score < $1) as credible,
        COUNT(*) FILTER (WHERE credibility_score >= $3 AND credibility_score < $2) as weak,
        COUNT(*) FILTER (WHERE credibility_score < $3) as excluded,
        COUNT(*) as total
      FROM public."InquiryPositions"
      WHERE inquiry_id = $4 AND status != 'archived'
      `,
      [
        threshold.autoAmendThreshold,
        threshold.inclusionThreshold,
        threshold.displayThreshold,
        inquiryId
      ]
    );

    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      verified: parseInt(stats.verified),
      credible: parseInt(stats.credible),
      weak: parseInt(stats.weak),
      excluded: parseInt(stats.excluded),
      thresholds: threshold
    };
  }
}
