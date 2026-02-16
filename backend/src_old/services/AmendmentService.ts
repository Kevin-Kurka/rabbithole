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

/**
 * AmendmentService
 *
 * Implements version-controlled node updates triggered by high-credibility inquiry positions.
 * Positions above the auto-amend threshold can automatically propose amendments to node fields,
 * creating a transparent audit trail of how truth evolves with evidence.
 *
 * Key Features:
 * - Automatic amendment proposals when positions reach auto-amend threshold
 * - Version control with original → amended value tracking
 * - JSON path support for nested field amendments
 * - Inline tooltip data for UI (strikethrough original, show explanation)
 * - Amendment history and rollback capability
 * - Status workflow: proposed → applied/rejected/superseded
 */
export class AmendmentService {
  constructor(private pool: Pool) {}

  /**
   * Propose an amendment to a node field
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
        SELECT id FROM public."NodeAmendments"
        WHERE node_id = $1
          AND field_path = $2
          AND status = 'proposed'
        `,
        [nodeId, fieldPath]
      );

      if (existing.rows.length > 0) {
        // Supersede existing proposal
        await this.pool.query(
          `
          UPDATE public."NodeAmendments"
          SET status = 'superseded', updated_at = NOW()
          WHERE id = $1
          `,
          [existing.rows[0].id]
        );
      }

      // 4. Create amendment proposal
      const result = await this.pool.query(
        `
        INSERT INTO public."NodeAmendments" (
          node_id,
          field_path,
          original_value,
          amended_value,
          explanation,
          inquiry_id,
          position_id,
          proposed_by_user_id,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'proposed')
        RETURNING id
        `,
        [
          nodeId,
          fieldPath,
          JSON.stringify(currentValue),
          JSON.stringify(newValue),
          explanation,
          inquiryId,
          positionId,
          userId
        ]
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

      // 1. Get amendment details
      const amendmentResult = await client.query(
        `
        SELECT
          node_id,
          field_path,
          amended_value,
          status
        FROM public."NodeAmendments"
        WHERE id = $1
        `,
        [amendmentId]
      );

      if (amendmentResult.rows.length === 0) {
        throw new Error(`Amendment not found: ${amendmentId}`);
      }

      const amendment = amendmentResult.rows[0];

      if (amendment.status !== 'proposed') {
        throw new Error(`Amendment cannot be applied (status: ${amendment.status})`);
      }

      // 2. Update node field
      const newValue = JSON.parse(amendment.amended_value);
      await this.setFieldValue(
        client,
        amendment.node_id,
        amendment.field_path,
        newValue
      );

      // 3. Mark amendment as applied
      await client.query(
        `
        UPDATE public."NodeAmendments"
        SET
          status = 'applied',
          applied_by_user_id = $1,
          applied_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        `,
        [userId, amendmentId]
      );

      // 4. Update node's last_amendment timestamp
      await client.query(
        `
        UPDATE public."Nodes"
        SET
          last_amendment_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        `,
        [amendment.node_id]
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
      const result = await this.pool.query(
        `
        UPDATE public."NodeAmendments"
        SET
          status = 'rejected',
          rejection_reason = $1,
          applied_by_user_id = $2,
          updated_at = NOW()
        WHERE id = $3 AND status = 'proposed'
        RETURNING id
        `,
        [reason, userId, amendmentId]
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
      const query = fieldPath
        ? `
          SELECT
            id,
            node_id as "nodeId",
            field_path as "fieldPath",
            original_value as "originalValue",
            amended_value as "amendedValue",
            explanation,
            inquiry_id as "inquiryId",
            position_id as "positionId",
            proposed_by_user_id as "proposedBy",
            proposed_at as "proposedAt",
            status,
            applied_by_user_id as "appliedBy",
            applied_at as "appliedAt",
            rejection_reason as "rejectionReason"
          FROM public."NodeAmendments"
          WHERE node_id = $1 AND field_path = $2
          ORDER BY proposed_at DESC
        `
        : `
          SELECT
            id,
            node_id as "nodeId",
            field_path as "fieldPath",
            original_value as "originalValue",
            amended_value as "amendedValue",
            explanation,
            inquiry_id as "inquiryId",
            position_id as "positionId",
            proposed_by_user_id as "proposedBy",
            proposed_at as "proposedAt",
            status,
            applied_by_user_id as "appliedBy",
            applied_at as "appliedAt",
            rejection_reason as "rejectionReason"
          FROM public."NodeAmendments"
          WHERE node_id = $1
          ORDER BY proposed_at DESC
        `;

      const params = fieldPath ? [nodeId, fieldPath] : [nodeId];
      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        ...row,
        originalValue: JSON.parse(row.originalValue),
        amendedValue: JSON.parse(row.amendedValue)
      }));
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
        SELECT
          id,
          title,
          content,
          props,
          last_amendment_at
        FROM public."Nodes"
        WHERE id = $1
        `,
        [nodeId]
      );

      if (nodeResult.rows.length === 0) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      const node = nodeResult.rows[0];

      // 2. Get all applied amendments
      const amendments = await this.pool.query(
        `
        SELECT
          field_path,
          original_value,
          amended_value,
          explanation,
          inquiry_id,
          position_id,
          applied_at
        FROM public."NodeAmendments"
        WHERE node_id = $1 AND status = 'applied'
        ORDER BY applied_at DESC
        `,
        [nodeId]
      );

      // 3. Build amendment map
      const amendmentMap: Record<string, any> = {};
      for (const amendment of amendments.rows) {
        amendmentMap[amendment.field_path] = {
          originalValue: JSON.parse(amendment.original_value),
          amendedValue: JSON.parse(amendment.amended_value),
          explanation: amendment.explanation,
          inquiryId: amendment.inquiry_id,
          positionId: amendment.position_id,
          appliedAt: amendment.applied_at
        };
      }

      // 4. Build response with amendment markers
      const result: NodeWithAmendments = {
        id: node.id,
        title: this.buildAmendedField('title', node.title, amendmentMap),
        content: this.buildAmendedField('content', node.content, amendmentMap),
        props: this.buildAmendedProps(node.props, amendmentMap),
        amendmentCount: amendments.rows.length,
        lastAmendedAt: node.last_amendment_at
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
      // Get position details with threshold
      const result = await this.pool.query(
        `
        SELECT
          p.id,
          p.inquiry_id,
          p.credibility_score,
          p.created_by_user_id,
          i.node_id,
          i.inquiry_type,
          t.auto_amend_threshold
        FROM public."InquiryPositions" p
        JOIN public."Inquiries" i ON p.inquiry_id = i.id
        LEFT JOIN public."CredibilityThresholds" t ON i.inquiry_type = t.inquiry_type
        WHERE p.id = $1
        `,
        [positionId]
      );

      if (result.rows.length === 0) return;

      const position = result.rows[0];
      const threshold = position.auto_amend_threshold || 0.85;

      // Check if position reached threshold
      if (position.credibility_score >= threshold) {
        console.log(`Position ${positionId} reached auto-amend threshold (${position.credibility_score} >= ${threshold})`);

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
      `SELECT id, title, content, props FROM public."Nodes" WHERE id = $1`,
      [nodeId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const node = result.rows[0];
    return this.resolveFieldPath(node, fieldPath);
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
    // Handle top-level fields
    if (fieldPath === 'title' || fieldPath === 'content') {
      await client.query(
        `UPDATE public."Nodes" SET ${fieldPath} = $1, updated_at = NOW() WHERE id = $2`,
        [value, nodeId]
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
        UPDATE public."Nodes"
        SET
          props = jsonb_set(props, $1, $2, true),
          updated_at = NOW()
        WHERE id = $3
        `,
        [pgPath, JSON.stringify(value), nodeId]
      );
      return;
    }

    throw new Error(`Unsupported field path: ${fieldPath}`);
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
      const result = await this.pool.query(
        `
        SELECT
          id,
          node_id as "nodeId",
          field_path as "fieldPath",
          original_value as "originalValue",
          amended_value as "amendedValue",
          explanation,
          inquiry_id as "inquiryId",
          position_id as "positionId",
          proposed_by_user_id as "proposedBy",
          proposed_at as "proposedAt",
          status
        FROM public."NodeAmendments"
        WHERE node_id = $1 AND status = 'proposed'
        ORDER BY proposed_at DESC
        `,
        [nodeId]
      );

      return result.rows.map(row => ({
        ...row,
        originalValue: JSON.parse(row.originalValue),
        amendedValue: JSON.parse(row.amendedValue)
      }));
    } catch (error) {
      console.error('Error fetching pending amendments:', error);
      throw error;
    }
  }
}
