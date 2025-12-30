import { Pool } from 'pg';

/**
 * Amendment proposal for a node field
 */
export interface Amendment {
  id: string;
  nodeId: string;
  fieldPath: string;          // JSON path like 'title', 'props.casualties', 'props.meta.date'
  originalValue: any;
  amendedValue: any;
  explanation: string;
  inquiryId: string;
  positionId: string;
  proposedBy: string;
  proposedAt: Date;
  status: 'proposed' | 'applied' | 'rejected' | 'superseded';
  appliedBy?: string;
  appliedAt?: Date;
  rejectionReason?: string;
}

/**
 * Node field with amendment information for UI display
 */
export interface AmendedField {
  fieldPath: string;
  currentValue: any;
  hasAmendment: boolean;
  amendment?: {
    originalValue: any;
    amendedValue: any;
    explanation: string;
    inquiryId: string;
    positionId: string;
    appliedAt: Date;
  };
}

/**
 * Node with all amendment markers for inline display
 */
export interface NodeWithAmendments {
  id: string;
  title: AmendedField;
  content: AmendedField;
  props: Record<string, AmendedField>;
  amendmentCount: number;
  lastAmendedAt?: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  if (typeof props === 'string') {
    try {
      return JSON.parse(props);
    } catch {
      return {};
    }
  }
  return props;
}

/**
 * AmendmentService
 *
 * Implements version-controlled node updates triggered by high-credibility inquiry positions.
 * Positions above the auto-amend threshold can automatically propose amendments to node fields,
 * creating a transparent audit trail of how truth evolves with evidence.
 *
 * Key Features:
 * - Automatic amendment proposals when positions reach auto-amend threshold
 * - Version control with original -> amended value tracking
 * - JSON path support for nested field amendments
 * - Inline tooltip data for UI (strikethrough original, show explanation)
 * - Amendment history and rollback capability
 * - Status workflow: proposed -> applied/rejected/superseded
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 * Amendments are stored as Amendment NodeType nodes.
 */
export class AmendmentService {
  // Cache for node type IDs
  private nodeTypeCache: Map<string, string> = new Map();

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
    if (result.rows.length === 0) return null;
    this.nodeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Propose an amendment to a node field
   * Creates an Amendment node in the nodes table
   *
   * Called automatically when a position reaches the auto-amend threshold.
   * Stores the proposed change but doesn't apply it until reviewed.
   *
   * @param nodeId - Target node ID
   * @param fieldPath - JSON path to field (e.g., 'title', 'props.casualties')
   * @param newValue - Proposed new value
   * @param inquiryId - Inquiry that triggered amendment
   * @param positionId - Position that reached threshold
   * @param explanation - Why this amendment is needed
   * @param userId - User who owns the triggering position
   * @returns Created amendment ID
   */
  async proposeAmendment(
    nodeId: string,
    fieldPath: string,
    newValue: any,
    inquiryId: string,
    positionId: string,
    explanation: string,
    userId: string
  ): Promise<string> {
    try {
      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      if (!amendmentTypeId) {
        // If Amendment type doesn't exist, we need to create it dynamically
        // For now, just log and return empty
        console.warn('Amendment node type not found. Run migrations to add it.');
        return '';
      }

      // 1. Get current value from node
      const currentValue = await this.getFieldValue(nodeId, fieldPath);

      // 2. Check if value actually changed
      if (this.valuesEqual(currentValue, newValue)) {
        console.log(`Amendment skipped: value unchanged for ${fieldPath}`);
        return ''; // No amendment needed
      }

      // 3. Check for existing pending amendments on this field
      const existing = await this.pool.query(
        `
        SELECT id FROM nodes
        WHERE node_type_id = $1
          AND props->>'nodeId' = $2
          AND props->>'fieldPath' = $3
          AND props->>'status' = 'proposed'
        `,
        [amendmentTypeId, nodeId, fieldPath]
      );

      if (existing.rows.length > 0) {
        // Supersede existing proposal
        await this.pool.query(
          `
          UPDATE nodes
          SET props = props || '{"status": "superseded"}'::jsonb, updated_at = NOW()
          WHERE id = $1
          `,
          [existing.rows[0].id]
        );
      }

      // 4. Create amendment proposal as a node
      const props = {
        nodeId,
        fieldPath,
        originalValue: currentValue,
        amendedValue: newValue,
        explanation,
        inquiryId,
        positionId,
        proposedByUserId: userId,
        status: 'proposed'
      };

      const result = await this.pool.query(
        `
        INSERT INTO nodes (node_type_id, props, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id
        `,
        [amendmentTypeId, JSON.stringify(props)]
      );

      const amendmentId = result.rows[0].id;
      console.log(`Amendment proposed: ${amendmentId} for ${fieldPath}`);

      return amendmentId;
    } catch (error) {
      console.error('Error proposing amendment:', error);
      throw new Error('Failed to propose amendment');
    }
  }

  /**
   * Apply a proposed amendment to the node
   *
   * Updates the node field and marks the amendment as applied.
   *
   * @param amendmentId - Amendment to apply
   * @param userId - User applying the amendment
   */
  async applyAmendment(amendmentId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      if (!amendmentTypeId) {
        throw new Error('Amendment node type not found');
      }

      // 1. Get amendment details
      const amendmentResult = await client.query(
        `
        SELECT id, props
        FROM nodes
        WHERE id = $1 AND node_type_id = $2
        `,
        [amendmentId, amendmentTypeId]
      );

      if (amendmentResult.rows.length === 0) {
        throw new Error(`Amendment not found: ${amendmentId}`);
      }

      const amendmentProps = parseProps(amendmentResult.rows[0].props);

      if (amendmentProps.status !== 'proposed') {
        throw new Error(`Amendment cannot be applied (status: ${amendmentProps.status})`);
      }

      // 2. Update node field
      await this.setFieldValue(
        client,
        amendmentProps.nodeId,
        amendmentProps.fieldPath,
        amendmentProps.amendedValue
      );

      // 3. Mark amendment as applied
      await client.query(
        `
        UPDATE nodes
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2
        `,
        [
          JSON.stringify({
            status: 'applied',
            appliedByUserId: userId,
            appliedAt: new Date().toISOString()
          }),
          amendmentId
        ]
      );

      // 4. Update node's lastAmendmentAt in props
      await client.query(
        `
        UPDATE nodes
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2
        `,
        [
          JSON.stringify({ lastAmendmentAt: new Date().toISOString() }),
          amendmentProps.nodeId
        ]
      );

      await client.query('COMMIT');
      console.log(`Amendment applied: ${amendmentId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error applying amendment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a proposed amendment
   *
   * @param amendmentId - Amendment to reject
   * @param reason - Explanation for rejection
   * @param userId - User rejecting the amendment
   */
  async rejectAmendment(
    amendmentId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    try {
      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      if (!amendmentTypeId) {
        throw new Error('Amendment node type not found');
      }

      const result = await this.pool.query(
        `
        UPDATE nodes
        SET props = props || $1::jsonb, updated_at = NOW()
        WHERE id = $2
          AND node_type_id = $3
          AND props->>'status' = 'proposed'
        RETURNING id
        `,
        [
          JSON.stringify({
            status: 'rejected',
            rejectionReason: reason,
            appliedByUserId: userId
          }),
          amendmentId,
          amendmentTypeId
        ]
      );

      if (result.rows.length === 0) {
        throw new Error(`Amendment not found or already processed: ${amendmentId}`);
      }

      console.log(`Amendment rejected: ${amendmentId}`);
    } catch (error) {
      console.error('Error rejecting amendment:', error);
      throw error;
    }
  }

  /**
   * Get amendment history for a node or specific field
   *
   * @param nodeId - Node ID
   * @param fieldPath - Optional field path to filter by
   * @returns Array of amendments sorted by most recent first
   */
  async getAmendmentHistory(
    nodeId: string,
    fieldPath?: string
  ): Promise<Amendment[]> {
    try {
      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      if (!amendmentTypeId) {
        return [];
      }

      const query = fieldPath
        ? `
          SELECT id, props, created_at
          FROM nodes
          WHERE node_type_id = $1
            AND props->>'nodeId' = $2
            AND props->>'fieldPath' = $3
          ORDER BY created_at DESC
        `
        : `
          SELECT id, props, created_at
          FROM nodes
          WHERE node_type_id = $1
            AND props->>'nodeId' = $2
          ORDER BY created_at DESC
        `;

      const params = fieldPath
        ? [amendmentTypeId, nodeId, fieldPath]
        : [amendmentTypeId, nodeId];

      const result = await this.pool.query(query, params);

      return result.rows.map(row => {
        const props = parseProps(row.props);
        return {
          id: row.id,
          nodeId: props.nodeId,
          fieldPath: props.fieldPath,
          originalValue: props.originalValue,
          amendedValue: props.amendedValue,
          explanation: props.explanation,
          inquiryId: props.inquiryId,
          positionId: props.positionId,
          proposedBy: props.proposedByUserId,
          proposedAt: new Date(row.created_at),
          status: props.status,
          appliedBy: props.appliedByUserId,
          appliedAt: props.appliedAt ? new Date(props.appliedAt) : undefined,
          rejectionReason: props.rejectionReason
        };
      });
    } catch (error) {
      console.error('Error fetching amendment history:', error);
      throw error;
    }
  }

  /**
   * Get node with all amendment information for UI display
   *
   * Returns structured data showing which fields have been amended,
   * with original and amended values for strikethrough rendering.
   *
   * @param nodeId - Node ID
   * @returns Node with amendment markers
   */
  async getNodeWithAmendments(nodeId: string): Promise<NodeWithAmendments> {
    try {
      // 1. Get node data
      const nodeResult = await this.pool.query(
        `
        SELECT id, props
        FROM nodes
        WHERE id = $1
        `,
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      const nodeProps = parseProps(nodeResult.rows[0].props);

      // 2. Get all applied amendments
      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      let amendments: any[] = [];

      if (amendmentTypeId) {
        const amendmentResult = await this.pool.query(
          `
          SELECT id, props
          FROM nodes
          WHERE node_type_id = $1
            AND props->>'nodeId' = $2
            AND props->>'status' = 'applied'
          ORDER BY (props->>'appliedAt')::timestamp DESC
          `,
          [amendmentTypeId, nodeId]
        );
        amendments = amendmentResult.rows;
      }

      // 3. Build amendment map
      const amendmentMap: Record<string, any> = {};
      for (const row of amendments) {
        const props = parseProps(row.props);
        amendmentMap[props.fieldPath] = {
          originalValue: props.originalValue,
          amendedValue: props.amendedValue,
          explanation: props.explanation,
          inquiryId: props.inquiryId,
          positionId: props.positionId,
          appliedAt: props.appliedAt ? new Date(props.appliedAt) : null
        };
      }

      // 4. Build response with amendment markers
      const result: NodeWithAmendments = {
        id: nodeResult.rows[0].id,
        title: this.buildAmendedField('title', nodeProps.title, amendmentMap),
        content: this.buildAmendedField('content', nodeProps.content, amendmentMap),
        props: this.buildAmendedProps(nodeProps, amendmentMap),
        amendmentCount: amendments.length,
        lastAmendedAt: nodeProps.lastAmendmentAt ? new Date(nodeProps.lastAmendmentAt) : undefined
      };

      return result;
    } catch (error) {
      console.error('Error fetching node with amendments:', error);
      throw error;
    }
  }

  /**
   * Check for automatic amendment triggers
   *
   * Called after position credibility updates to see if amendments should be proposed.
   *
   * @param positionId - Position that was updated
   */
  async checkAmendmentTriggers(positionId: string): Promise<void> {
    try {
      const positionTypeId = await this.getNodeTypeId('Position');
      const inquiryTypeId = await this.getNodeTypeId('Inquiry');
      const thresholdTypeId = await this.getNodeTypeId('CredibilityThreshold');

      if (!positionTypeId || !inquiryTypeId) {
        console.warn('Position or Inquiry node type not found');
        return;
      }

      // Get position details
      const positionResult = await this.pool.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2`,
        [positionId, positionTypeId]
      );

      if (positionResult.rows.length === 0) return;

      const positionProps = parseProps(positionResult.rows[0].props);

      // Get inquiry details
      const inquiryResult = await this.pool.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2`,
        [positionProps.inquiryId, inquiryTypeId]
      );

      if (inquiryResult.rows.length === 0) return;

      const inquiryProps = parseProps(inquiryResult.rows[0].props);

      // Get threshold if available
      let threshold = 0.85; // Default
      if (thresholdTypeId && inquiryProps.inquiryType) {
        const thresholdResult = await this.pool.query(
          `SELECT props FROM nodes WHERE node_type_id = $1 AND props->>'inquiryType' = $2`,
          [thresholdTypeId, inquiryProps.inquiryType]
        );
        if (thresholdResult.rows.length > 0) {
          const thresholdProps = parseProps(thresholdResult.rows[0].props);
          threshold = thresholdProps.autoAmendThreshold || 0.85;
        }
      }

      const credibilityScore = positionProps.credibilityScore || 0;

      // Check if position reached threshold
      if (credibilityScore >= threshold) {
        console.log(`Position ${positionId} reached auto-amend threshold (${credibilityScore} >= ${threshold})`);

        // TODO: Implement automatic amendment proposal logic
        // This would require analyzing the position's argument and evidence
        // to determine which node fields to amend and what values to propose.
        // For now, amendments must be proposed manually via the API.
      }
    } catch (error) {
      console.error('Error checking amendment triggers:', error);
    }
  }

  /**
   * Get current value of a node field by JSON path
   *
   * @private
   */
  private async getFieldValue(nodeId: string, fieldPath: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT id, props FROM nodes WHERE id = $1`,
      [nodeId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const nodeProps = parseProps(result.rows[0].props);
    return this.resolveFieldPath(nodeProps, fieldPath);
  }

  /**
   * Set value of a node field by JSON path
   *
   * @private
   */
  private async setFieldValue(
    client: any,
    nodeId: string,
    fieldPath: string,
    value: any
  ): Promise<void> {
    // Handle top-level fields stored in props
    if (fieldPath === 'title' || fieldPath === 'content') {
      await client.query(
        `UPDATE nodes SET props = props || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ [fieldPath]: value }), nodeId]
      );
      return;
    }

    // Handle nested JSONB fields (props.*)
    if (fieldPath.startsWith('props.')) {
      const jsonPath = fieldPath.substring(6); // Remove 'props.' prefix
      const pathParts = jsonPath.split('.');

      // Build PostgreSQL jsonb_set path
      const pgPath = `{${pathParts.join(',')}}`;

      await client.query(
        `
        UPDATE nodes
        SET
          props = jsonb_set(props, $1, $2, true),
          updated_at = NOW()
        WHERE id = $3
        `,
        [pgPath, JSON.stringify(value), nodeId]
      );
      return;
    }

    // For simple field paths, update directly in props
    await client.query(
      `UPDATE nodes SET props = props || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ [fieldPath]: value }), nodeId]
    );
  }

  /**
   * Resolve JSON path to get nested value
   *
   * @private
   */
  private resolveFieldPath(node: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = node;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Compare two values for equality
   *
   * @private
   */
  private valuesEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Build AmendedField structure for a single field
   *
   * @private
   */
  private buildAmendedField(
    fieldPath: string,
    currentValue: any,
    amendmentMap: Record<string, any>
  ): AmendedField {
    const amendment = amendmentMap[fieldPath];

    return {
      fieldPath,
      currentValue,
      hasAmendment: !!amendment,
      amendment: amendment ? {
        originalValue: amendment.originalValue,
        amendedValue: amendment.amendedValue,
        explanation: amendment.explanation,
        inquiryId: amendment.inquiryId,
        positionId: amendment.positionId,
        appliedAt: amendment.appliedAt
      } : undefined
    };
  }

  /**
   * Build AmendedField structure for all props
   *
   * @private
   */
  private buildAmendedProps(
    props: Record<string, any>,
    amendmentMap: Record<string, any>
  ): Record<string, AmendedField> {
    const result: Record<string, any> = {};

    // Iterate through all props keys
    for (const key in props) {
      const fieldPath = `props.${key}`;
      result[key] = this.buildAmendedField(fieldPath, props[key], amendmentMap);
    }

    // Add any amended props that don't exist in current props
    for (const fieldPath in amendmentMap) {
      if (fieldPath.startsWith('props.')) {
        const propKey = fieldPath.substring(6);
        if (!result[propKey]) {
          result[propKey] = this.buildAmendedField(fieldPath, null, amendmentMap);
        }
      }
    }

    return result;
  }

  /**
   * Get all pending amendment proposals for a node
   *
   * @param nodeId - Node ID
   * @returns Array of proposed amendments
   */
  async getPendingAmendments(nodeId: string): Promise<Amendment[]> {
    try {
      const amendmentTypeId = await this.getNodeTypeId('Amendment');
      if (!amendmentTypeId) {
        return [];
      }

      const result = await this.pool.query(
        `
        SELECT id, props, created_at
        FROM nodes
        WHERE node_type_id = $1
          AND props->>'nodeId' = $2
          AND props->>'status' = 'proposed'
        ORDER BY created_at DESC
        `,
        [amendmentTypeId, nodeId]
      );

      return result.rows.map(row => {
        const props = parseProps(row.props);
        return {
          id: row.id,
          nodeId: props.nodeId,
          fieldPath: props.fieldPath,
          originalValue: props.originalValue,
          amendedValue: props.amendedValue,
          explanation: props.explanation,
          inquiryId: props.inquiryId,
          positionId: props.positionId,
          proposedBy: props.proposedByUserId,
          proposedAt: new Date(row.created_at),
          status: props.status as 'proposed'
        };
      });
    } catch (error) {
      console.error('Error fetching pending amendments:', error);
      throw error;
    }
  }
}
