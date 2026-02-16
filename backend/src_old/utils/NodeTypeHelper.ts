import { Pool } from 'pg';
import SchemaService, { NodeTypeSchema, EdgeTypeSchema } from '../services/SchemaService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Node {
    id: string;
    nodeTypeId: string;
    props: Record<string, any>;
    meta: Record<string, any>;
    ai: number[] | null;
    textSearch: any;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Edge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeTypeId: string;
    props: Record<string, any>;
    meta: Record<string, any>;
    ai: number[] | null;
    textSearch: any;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// NodeTypeHelper
// ============================================================================

export class NodeTypeHelper {
    private schemaService: SchemaService;

    constructor(schemaService: SchemaService) {
        this.schemaService = schemaService;
    }

    /**
     * Get node_type_id by name (throws if not found)
     */
    async getNodeTypeId(name: string): Promise<string> {
        const nodeType = await this.schemaService.getNodeType(name);
        if (!nodeType) {
            throw new Error(`Node type '${name}' not found`);
        }
        return nodeType.id;
    }

    /**
     * Get edge_type_id by name (throws if not found)
     */
    async getEdgeTypeId(name: string): Promise<string> {
        const edgeType = await this.schemaService.getEdgeType(name);
        if (!edgeType) {
            throw new Error(`Edge type '${name}' not found`);
        }
        return edgeType.id;
    }

    /**
     * Query nodes by type name
     */
    async getNodesByType(
        pool: Pool,
        typeName: string,
        filters?: Record<string, any>,
        limit: number = 100,
        offset: number = 0
    ): Promise<Node[]> {
        const nodeTypeId = await this.getNodeTypeId(typeName);

        let query = `
      SELECT 
        id, node_type_id as "nodeTypeId", props, meta, ai, text_search as "textSearch",
        archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
      FROM nodes
      WHERE node_type_id = $1 AND archived_at IS NULL
    `;

        const params: any[] = [nodeTypeId];
        let paramIndex = 2;

        // Add filters
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                query += ` AND props->>'${key}' = $${paramIndex}`;
                params.push(value);
                paramIndex++;
            }
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get single node by type and ID
     */
    async getNodeByTypeAndId(
        pool: Pool,
        typeName: string,
        nodeId: string
    ): Promise<Node | null> {
        const nodeTypeId = await this.getNodeTypeId(typeName);

        const result = await pool.query(
            `SELECT 
        id, node_type_id as "nodeTypeId", props, meta, ai, text_search as "textSearch",
        archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM nodes
       WHERE id = $1 AND node_type_id = $2 AND archived_at IS NULL`,
            [nodeId, nodeTypeId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Create node with validation
     */
    async createNode(
        pool: Pool,
        typeName: string,
        props: any,
        meta?: any
    ): Promise<Node> {
        const nodeTypeId = await this.getNodeTypeId(typeName);

        // Validate props against schema
        const validation = await this.schemaService.validateNodeProps(nodeTypeId, props);
        if (!validation.valid) {
            const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
        }

        const result = await pool.query(
            `INSERT INTO nodes (node_type_id, props, meta)
       VALUES ($1, $2, $3)
       RETURNING 
         id, node_type_id as "nodeTypeId", props, meta, ai, text_search as "textSearch",
         archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"`,
            [nodeTypeId, JSON.stringify(props), JSON.stringify(meta || {})]
        );

        return result.rows[0];
    }

    /**
     * Update node with validation
     */
    async updateNode(
        pool: Pool,
        nodeId: string,
        props: any
    ): Promise<Node> {
        // Get existing node to get its type
        const existing = await pool.query(
            'SELECT node_type_id FROM nodes WHERE id = $1',
            [nodeId]
        );

        if (existing.rows.length === 0) {
            throw new Error(`Node ${nodeId} not found`);
        }

        const nodeTypeId = existing.rows[0].node_type_id;

        // Validate props
        const validation = await this.schemaService.validateNodeProps(nodeTypeId, props);
        if (!validation.valid) {
            const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
        }

        const result = await pool.query(
            `UPDATE nodes 
       SET props = $1
       WHERE id = $2
       RETURNING 
         id, node_type_id as "nodeTypeId", props, meta, ai, text_search as "textSearch",
         archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"`,
            [JSON.stringify(props), nodeId]
        );

        return result.rows[0];
    }

    /**
     * Create edge with validation
     */
    async createEdge(
        pool: Pool,
        edgeTypeName: string,
        sourceNodeId: string,
        targetNodeId: string,
        props?: any
    ): Promise<Edge> {
        const edgeTypeId = await this.getEdgeTypeId(edgeTypeName);

        // Validate props if provided
        if (props) {
            const validation = await this.schemaService.validateEdgeProps(edgeTypeId, props);
            if (!validation.valid) {
                const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
                throw new Error(`Validation failed: ${errorMessages}`);
            }
        }

        const result = await pool.query(
            `INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props)
       VALUES ($1, $2, $3, $4)
       RETURNING 
         id, source_node_id as "sourceNodeId", target_node_id as "targetNodeId",
         edge_type_id as "edgeTypeId", props, meta, ai, text_search as "textSearch",
         archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"`,
            [sourceNodeId, targetNodeId, edgeTypeId, JSON.stringify(props || {})]
        );

        return result.rows[0];
    }

    /**
     * Check if node is of type (including inheritance)
     */
    async isNodeOfType(
        pool: Pool,
        nodeId: string,
        typeName: string
    ): Promise<boolean> {
        const targetTypeId = await this.getNodeTypeId(typeName);

        // Get node's type
        const nodeResult = await pool.query(
            'SELECT node_type_id FROM nodes WHERE id = $1',
            [nodeId]
        );

        if (nodeResult.rows.length === 0) {
            return false;
        }

        const nodeTypeId = nodeResult.rows[0].node_type_id;

        // Direct match
        if (nodeTypeId === targetTypeId) {
            return true;
        }

        // Check inheritance chain
        return await this.isTypeInheritedFrom(nodeTypeId, targetTypeId);
    }

    /**
     * Check if a type inherits from another type
     */
    private async isTypeInheritedFrom(
        childTypeId: string,
        parentTypeId: string
    ): Promise<boolean> {
        const childType = await this.schemaService.getNodeTypeById(childTypeId);
        if (!childType || !childType.parentNodeTypeId) {
            return false;
        }

        if (childType.parentNodeTypeId === parentTypeId) {
            return true;
        }

        // Recursively check parent chain
        return await this.isTypeInheritedFrom(childType.parentNodeTypeId, parentTypeId);
    }

    /**
     * Get edges of a specific type from a node
     */
    async getEdgesFromNode(
        pool: Pool,
        nodeId: string,
        edgeTypeName: string
    ): Promise<Edge[]> {
        const edgeTypeId = await this.getEdgeTypeId(edgeTypeName);

        const result = await pool.query(
            `SELECT 
        id, source_node_id as "sourceNodeId", target_node_id as "targetNodeId",
        edge_type_id as "edgeTypeId", props, meta, ai, text_search as "textSearch",
        archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM edges
       WHERE source_node_id = $1 AND edge_type_id = $2 AND archived_at IS NULL`,
            [nodeId, edgeTypeId]
        );

        return result.rows;
    }

    /**
     * Get edges of a specific type to a node
     */
    async getEdgesToNode(
        pool: Pool,
        nodeId: string,
        edgeTypeName: string
    ): Promise<Edge[]> {
        const edgeTypeId = await this.getEdgeTypeId(edgeTypeName);

        const result = await pool.query(
            `SELECT 
        id, source_node_id as "sourceNodeId", target_node_id as "targetNodeId",
        edge_type_id as "edgeTypeId", props, meta, ai, text_search as "textSearch",
        archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM edges
       WHERE target_node_id = $1 AND edge_type_id = $2 AND archived_at IS NULL`,
            [nodeId, edgeTypeId]
        );

        return result.rows;
    }

    /**
     * Soft delete a node
     */
    async archiveNode(pool: Pool, nodeId: string): Promise<void> {
        await pool.query(
            'UPDATE nodes SET archived_at = NOW() WHERE id = $1',
            [nodeId]
        );
    }

    /**
     * Soft delete an edge
     */
    async archiveEdge(pool: Pool, edgeId: string): Promise<void> {
        await pool.query(
            'UPDATE edges SET archived_at = NOW() WHERE id = $1',
            [edgeId]
        );
    }

    /**
     * Count nodes by type
     */
    async countNodesByType(
        pool: Pool,
        typeName: string,
        filters?: Record<string, any>
    ): Promise<number> {
        const nodeTypeId = await this.getNodeTypeId(typeName);

        let query = 'SELECT COUNT(*) FROM nodes WHERE node_type_id = $1 AND archived_at IS NULL';
        const params: any[] = [nodeTypeId];
        let paramIndex = 2;

        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                query += ` AND props->>'${key}' = $${paramIndex}`;
                params.push(value);
                paramIndex++;
            }
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    }
}

export default NodeTypeHelper;
