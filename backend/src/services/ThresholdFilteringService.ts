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
 * Helper to parse JSONB props safely
 */
function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  return typeof props === 'string' ? JSON.parse(props) : props;
}

/**
 * ThresholdFilteringService
 *
 * Implements threshold-based filtering of inquiry positions to ensure only credible
 * arguments influence node credibility. Positions below configurable thresholds are
 * excluded from calculations, preventing non-credible positions from affecting truth.
 *
 * ARCHITECTURE: Uses strict 4-table schema (node_types, edge_types, nodes, edges)
 * All data is stored in JSONB props field - no standalone tables.
 *
 * Three Threshold Levels:
 * 1. **Auto-Amend Threshold**: Highest bar - triggers automatic node amendments
 * 2. **Inclusion Threshold**: Medium bar - included in node credibility calculation
 * 3. **Display Threshold**: Lowest bar - visible in UI but not used in calculations
 * 4. **Below Display**: Completely excluded (hidden by default)
 */
export class ThresholdFilteringService {
  // Cache for node type IDs
  private nodeTypeCache: Map<string, string> = new Map();
  private edgeTypeCache: Map<string, string> = new Map();

  constructor(private pool: Pool) {}

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
   * Get threshold configuration for an inquiry type
   *
   * @param inquiryType - Type of inquiry (e.g., 'factual_accuracy', 'scientific_inquiry')
   * @returns Threshold configuration
   */
  async getThreshold(inquiryType: string): Promise<CredibilityThreshold> {
    const thresholdTypeId = await this.getNodeTypeId('CredibilityThreshold');

    if (!thresholdTypeId) {
      // Return defaults if type not defined
      return this.getDefaultThreshold(inquiryType);
    }

    const result = await this.pool.query(
      `SELECT props FROM nodes
       WHERE node_type_id = $1
         AND (props->>'inquiryType')::text = $2
         AND archived_at IS NULL
       LIMIT 1`,
      [thresholdTypeId, inquiryType]
    );

    if (result.rows.length === 0) {
      return this.getDefaultThreshold(inquiryType);
    }

    const props = parseProps(result.rows[0].props);

    return {
      inquiryType,
      inclusionThreshold: props.inclusionThreshold || 0.60,
      displayThreshold: props.displayThreshold || 0.30,
      autoAmendThreshold: props.verifiedThreshold || props.autoAmendThreshold || 0.80
    };
  }

  /**
   * Get default threshold for unknown inquiry types
   */
  private getDefaultThreshold(inquiryType: string): CredibilityThreshold {
    return {
      inquiryType,
      inclusionThreshold: 0.60,
      displayThreshold: 0.30,
      autoAmendThreshold: 0.80
    };
  }

  /**
   * Get all credible positions for an inquiry (above inclusion threshold)
   *
   * @param inquiryId - Inquiry ID
   * @returns Array of positions that meet inclusion threshold
   */
  async getCrediblePositions(inquiryId: string): Promise<FilteredPosition[]> {
    const inquiry = await this.getInquiry(inquiryId);
    const inquiryProps = parseProps(inquiry.props);
    const threshold = await this.getThreshold(inquiryProps.inquiryType || 'default');

    const positionTypeId = await this.getNodeTypeId('Position');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');
    const evidenceTypeNodeTypeId = await this.getNodeTypeId('EvidenceType');
    const hasEvidenceTypeEdgeId = await this.getEdgeTypeId('HAS_EVIDENCE_TYPE');

    if (!positionTypeId || !hasPositionEdgeTypeId) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT
        p.id,
        p.props as position_props,
        p.created_at,
        p.updated_at,
        (et.props->>'code')::text as evidence_type_code
      FROM nodes p
      JOIN edges e ON p.id = e.target_node_id
      LEFT JOIN edges et_edge ON p.id = et_edge.source_node_id
        AND et_edge.edge_type_id = $5
      LEFT JOIN nodes et ON et_edge.target_node_id = et.id
        AND et.node_type_id = $6
      WHERE p.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.source_node_id = $3
        AND COALESCE((p.props->>'credibilityScore')::real, 0.5) >= $4
        AND COALESCE((p.props->>'status')::text, 'active') != 'archived'
        AND p.archived_at IS NULL
      ORDER BY (p.props->>'credibilityScore')::real DESC`,
      [
        positionTypeId,
        hasPositionEdgeTypeId,
        inquiryId,
        threshold.inclusionThreshold,
        hasEvidenceTypeEdgeId,
        evidenceTypeNodeTypeId
      ]
    );

    return result.rows.map(row => this.mapToFilteredPosition(row, inquiryId, threshold));
  }

  /**
   * Get all positions for an inquiry, grouped by threshold status
   *
   * @param inquiryId - Inquiry ID
   * @returns Positions grouped into verified, credible, weak, and excluded
   */
  async getGroupedPositions(inquiryId: string): Promise<GroupedPositions> {
    const inquiry = await this.getInquiry(inquiryId);
    const inquiryProps = parseProps(inquiry.props);
    const threshold = await this.getThreshold(inquiryProps.inquiryType || 'default');

    const positionTypeId = await this.getNodeTypeId('Position');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');
    const evidenceTypeNodeTypeId = await this.getNodeTypeId('EvidenceType');
    const hasEvidenceTypeEdgeId = await this.getEdgeTypeId('HAS_EVIDENCE_TYPE');

    if (!positionTypeId || !hasPositionEdgeTypeId) {
      return { verified: [], credible: [], weak: [], excluded: [] };
    }

    const result = await this.pool.query(
      `SELECT
        p.id,
        p.props as position_props,
        p.created_at,
        p.updated_at,
        (et.props->>'code')::text as evidence_type_code
      FROM nodes p
      JOIN edges e ON p.id = e.target_node_id
      LEFT JOIN edges et_edge ON p.id = et_edge.source_node_id
        AND et_edge.edge_type_id = $4
      LEFT JOIN nodes et ON et_edge.target_node_id = et.id
        AND et.node_type_id = $5
      WHERE p.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.source_node_id = $3
        AND COALESCE((p.props->>'status')::text, 'active') != 'archived'
        AND p.archived_at IS NULL
      ORDER BY (p.props->>'credibilityScore')::real DESC`,
      [
        positionTypeId,
        hasPositionEdgeTypeId,
        inquiryId,
        hasEvidenceTypeEdgeId,
        evidenceTypeNodeTypeId
      ]
    );

    const verified: FilteredPosition[] = [];
    const credible: FilteredPosition[] = [];
    const weak: FilteredPosition[] = [];
    const excluded: FilteredPosition[] = [];

    for (const row of result.rows) {
      const position = this.mapToFilteredPosition(row, inquiryId, threshold);

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
    const positionTypeId = await this.getNodeTypeId('Position');
    const formalInquiryTypeId = await this.getNodeTypeId('FormalInquiry');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');

    if (!positionTypeId || !formalInquiryTypeId || !hasPositionEdgeTypeId) {
      throw new Error('Required node/edge types not found');
    }

    // Get position with inquiry type
    const result = await this.pool.query(
      `SELECT
        p.props as position_props,
        inquiry.props as inquiry_props
      FROM nodes p
      JOIN edges e ON p.id = e.target_node_id
      JOIN nodes inquiry ON e.source_node_id = inquiry.id
      WHERE p.id = $1
        AND p.node_type_id = $2
        AND e.edge_type_id = $3
        AND inquiry.node_type_id = $4`,
      [positionId, positionTypeId, hasPositionEdgeTypeId, formalInquiryTypeId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const positionProps = parseProps(result.rows[0].position_props);
    const inquiryProps = parseProps(result.rows[0].inquiry_props);

    const credibilityScore = positionProps.credibilityScore || 0.5;
    const threshold = await this.getThreshold(inquiryProps.inquiryType || 'default');

    // Determine new status
    let newStatus: string;
    if (credibilityScore >= threshold.autoAmendThreshold) {
      newStatus = 'verified';
    } else if (credibilityScore >= threshold.inclusionThreshold) {
      newStatus = 'credible';
    } else if (credibilityScore >= threshold.displayThreshold) {
      newStatus = 'weak';
    } else {
      newStatus = 'excluded';
    }

    // Update status in props
    await this.pool.query(
      `UPDATE nodes
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ status: newStatus }), positionId]
    );
  }

  /**
   * Batch update statuses for all positions in an inquiry
   *
   * @param inquiryId - Inquiry ID
   * @returns Number of positions updated
   */
  async updateAllPositionStatuses(inquiryId: string): Promise<number> {
    const positionTypeId = await this.getNodeTypeId('Position');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');

    if (!positionTypeId || !hasPositionEdgeTypeId) {
      return 0;
    }

    const positions = await this.pool.query(
      `SELECT p.id FROM nodes p
       JOIN edges e ON p.id = e.target_node_id
       WHERE p.node_type_id = $1
         AND e.edge_type_id = $2
         AND e.source_node_id = $3
         AND COALESCE((p.props->>'status')::text, 'active') != 'archived'
         AND p.archived_at IS NULL`,
      [positionTypeId, hasPositionEdgeTypeId, inquiryId]
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
    const positionTypeId = await this.getNodeTypeId('Position');
    const formalInquiryTypeId = await this.getNodeTypeId('FormalInquiry');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');

    if (!positionTypeId || !formalInquiryTypeId || !hasPositionEdgeTypeId) {
      return false;
    }

    const result = await this.pool.query(
      `SELECT
        p.props as position_props,
        inquiry.props as inquiry_props
      FROM nodes p
      JOIN edges e ON p.id = e.target_node_id
      JOIN nodes inquiry ON e.source_node_id = inquiry.id
      WHERE p.id = $1
        AND p.node_type_id = $2
        AND e.edge_type_id = $3
        AND inquiry.node_type_id = $4`,
      [positionId, positionTypeId, hasPositionEdgeTypeId, formalInquiryTypeId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const positionProps = parseProps(result.rows[0].position_props);
    const inquiryProps = parseProps(result.rows[0].inquiry_props);

    const credibilityScore = positionProps.credibilityScore || 0.5;
    const threshold = await this.getThreshold(inquiryProps.inquiryType || 'default');

    return credibilityScore >= threshold.autoAmendThreshold;
  }

  /**
   * Get inquiry details using node/edge pattern
   *
   * @private
   */
  private async getInquiry(inquiryId: string): Promise<any> {
    const formalInquiryTypeId = await this.getNodeTypeId('FormalInquiry');

    if (!formalInquiryTypeId) {
      throw new Error('FormalInquiry node type not found');
    }

    const result = await this.pool.query(
      `SELECT id, props, created_at, updated_at
       FROM nodes
       WHERE id = $1
         AND node_type_id = $2
         AND archived_at IS NULL`,
      [inquiryId, formalInquiryTypeId]
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
    inquiryId: string,
    threshold: CredibilityThreshold
  ): FilteredPosition {
    const props = parseProps(row.position_props);
    const credibility = props.credibilityScore || 0.5;

    return {
      id: row.id,
      inquiryId,
      createdBy: props.authorId || props.createdBy || '',
      stance: props.stance || 'neutral',
      argument: props.argument || '',
      evidenceType: row.evidence_type_code || props.evidenceType || 'unknown',
      evidenceLinks: props.evidenceLinks || [],

      credibilityScore: credibility,
      evidenceQualityScore: props.evidenceQualityScore || 0.5,
      sourceCredibilityScore: props.sourceCredibilityScore || 0.5,
      coherenceScore: props.coherenceScore || 0.5,

      upvotes: props.upvotes || 0,
      downvotes: props.downvotes || 0,

      status: props.status || 'credible',
      includedInCalculation: credibility >= threshold.inclusionThreshold,
      visibleInUI: credibility >= threshold.displayThreshold,
      canAmendNode: credibility >= threshold.autoAmendThreshold,

      createdAt: row.created_at,
      updatedAt: row.updated_at
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
    const inquiryProps = parseProps(inquiry.props);
    const threshold = await this.getThreshold(inquiryProps.inquiryType || 'default');

    const positionTypeId = await this.getNodeTypeId('Position');
    const hasPositionEdgeTypeId = await this.getEdgeTypeId('HAS_POSITION');

    if (!positionTypeId || !hasPositionEdgeTypeId) {
      return {
        total: 0,
        verified: 0,
        credible: 0,
        weak: 0,
        excluded: 0,
        thresholds: threshold
      };
    }

    const result = await this.pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE COALESCE((p.props->>'credibilityScore')::real, 0.5) >= $1) as verified,
        COUNT(*) FILTER (WHERE COALESCE((p.props->>'credibilityScore')::real, 0.5) >= $2
          AND COALESCE((p.props->>'credibilityScore')::real, 0.5) < $1) as credible,
        COUNT(*) FILTER (WHERE COALESCE((p.props->>'credibilityScore')::real, 0.5) >= $3
          AND COALESCE((p.props->>'credibilityScore')::real, 0.5) < $2) as weak,
        COUNT(*) FILTER (WHERE COALESCE((p.props->>'credibilityScore')::real, 0.5) < $3) as excluded,
        COUNT(*) as total
      FROM nodes p
      JOIN edges e ON p.id = e.target_node_id
      WHERE p.node_type_id = $4
        AND e.edge_type_id = $5
        AND e.source_node_id = $6
        AND COALESCE((p.props->>'status')::text, 'active') != 'archived'
        AND p.archived_at IS NULL`,
      [
        threshold.autoAmendThreshold,
        threshold.inclusionThreshold,
        threshold.displayThreshold,
        positionTypeId,
        hasPositionEdgeTypeId,
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
