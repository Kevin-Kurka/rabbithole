import { Pool } from 'pg';
import Redis from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NodeTypeSchema {
    id: string;
    name: string;
    parentNodeTypeId: string | null;
    props: {
        description?: string;
        schema_org_url?: string;
        fields?: Record<string, FieldSchema>;
        [key: string]: any;
    };
    meta: Record<string, any>;
    ai: number[] | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface EdgeTypeSchema {
    id: string;
    name: string;
    sourceNodeTypeId: string | null;
    targetNodeTypeId: string | null;
    props: {
        description?: string;
        schema_org_url?: string;
        cardinality?: string;
        fields?: Record<string, FieldSchema>;
        [key: string]: any;
    };
    meta: Record<string, any>;
    ai: number[] | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface FieldSchema {
    type: string;
    required?: boolean;
    default?: any;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    values?: any[];
    unique?: boolean;
    format?: string;
    description?: string;
    items?: any;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    rule: string;
}

// ============================================================================
// SchemaService
// ============================================================================

export class SchemaService {
    private pool: Pool;
    private redis: Redis;
    private nodeTypeCache: Map<string, NodeTypeSchema>;
    private edgeTypeCache: Map<string, EdgeTypeSchema>;
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly CACHE_PREFIX = 'schema:';

    constructor(pool: Pool, redis: Redis) {
        this.pool = pool;
        this.redis = redis;
        this.nodeTypeCache = new Map();
        this.edgeTypeCache = new Map();
    }

    /**
     * Get node type by name (cached)
     */
    async getNodeType(name: string): Promise<NodeTypeSchema | null> {
        // Check memory cache
        if (this.nodeTypeCache.has(name)) {
            return this.nodeTypeCache.get(name)!;
        }

        // Check Redis cache
        const cacheKey = `${this.CACHE_PREFIX}node_type:${name}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            const schema = JSON.parse(cached);
            this.nodeTypeCache.set(name, schema);
            return schema;
        }

        // Query database
        const result = await this.pool.query(
            `SELECT id, name, parent_node_type_id as "parentNodeTypeId", props, meta, ai, 
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM node_types 
       WHERE name = $1 AND archived_at IS NULL`,
            [name]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const schema: NodeTypeSchema = result.rows[0];

        // Cache in memory and Redis
        this.nodeTypeCache.set(name, schema);
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(schema));

        return schema;
    }

    /**
     * Get node type by ID
     */
    async getNodeTypeById(id: string): Promise<NodeTypeSchema | null> {
        const result = await this.pool.query(
            `SELECT id, name, parent_node_type_id as "parentNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM node_types 
       WHERE id = $1 AND archived_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Get edge type by name
     */
    async getEdgeType(name: string): Promise<EdgeTypeSchema | null> {
        // Check memory cache
        if (this.edgeTypeCache.has(name)) {
            return this.edgeTypeCache.get(name)!;
        }

        // Check Redis cache
        const cacheKey = `${this.CACHE_PREFIX}edge_type:${name}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            const schema = JSON.parse(cached);
            this.edgeTypeCache.set(name, schema);
            return schema;
        }

        // Query database
        const result = await this.pool.query(
            `SELECT id, name, source_node_type_id as "sourceNodeTypeId", 
              target_node_type_id as "targetNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM edge_types 
       WHERE name = $1 AND archived_at IS NULL`,
            [name]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const schema: EdgeTypeSchema = result.rows[0];

        // Cache
        this.edgeTypeCache.set(name, schema);
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(schema));

        return schema;
    }

    /**
     * Validate node props against schema
     */
    async validateNodeProps(nodeTypeId: string, props: any): Promise<ValidationResult> {
        const nodeType = await this.getNodeTypeById(nodeTypeId);
        if (!nodeType) {
            return {
                valid: false,
                errors: [{ field: '_type', message: 'Node type not found', rule: 'existence' }]
            };
        }

        const errors: ValidationError[] = [];
        const fields = nodeType.props.fields || {};

        // Check required fields
        for (const [fieldName, fieldSchema] of Object.entries(fields)) {
            if (fieldSchema.required && !(fieldName in props)) {
                errors.push({
                    field: fieldName,
                    message: `Required field '${fieldName}' is missing`,
                    rule: 'required'
                });
            }
        }

        // Validate field values
        for (const [fieldName, value] of Object.entries(props)) {
            const fieldSchema = fields[fieldName];
            if (!fieldSchema) continue; // Allow extra fields

            const fieldErrors = this.validateField(fieldName, value, fieldSchema);
            errors.push(...fieldErrors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate edge props against schema
     */
    async validateEdgeProps(edgeTypeId: string, props: any): Promise<ValidationResult> {
        const edgeType = await this.getEdgeTypeById(edgeTypeId);
        if (!edgeType) {
            return {
                valid: false,
                errors: [{ field: '_type', message: 'Edge type not found', rule: 'existence' }]
            };
        }

        const errors: ValidationError[] = [];
        const fields = edgeType.props.fields || {};

        // Check required fields
        for (const [fieldName, fieldSchema] of Object.entries(fields)) {
            if (fieldSchema.required && !(fieldName in props)) {
                errors.push({
                    field: fieldName,
                    message: `Required field '${fieldName}' is missing`,
                    rule: 'required'
                });
            }
        }

        // Validate field values
        for (const [fieldName, value] of Object.entries(props)) {
            const fieldSchema = fields[fieldName];
            if (!fieldSchema) continue;

            const fieldErrors = this.validateField(fieldName, value, fieldSchema);
            errors.push(...fieldErrors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get edge type by ID
     */
    private async getEdgeTypeById(id: string): Promise<EdgeTypeSchema | null> {
        const result = await this.pool.query(
            `SELECT id, name, source_node_type_id as "sourceNodeTypeId",
              target_node_type_id as "targetNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM edge_types 
       WHERE id = $1 AND archived_at IS NULL`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Validate individual field
     */
    private validateField(fieldName: string, value: any, schema: FieldSchema): ValidationError[] {
        const errors: ValidationError[] = [];

        // Type validation
        const actualType = typeof value;
        if (schema.type === 'string' && actualType !== 'string') {
            errors.push({ field: fieldName, message: `Expected string, got ${actualType}`, rule: 'type' });
        }
        if (schema.type === 'number' && actualType !== 'number') {
            errors.push({ field: fieldName, message: `Expected number, got ${actualType}`, rule: 'type' });
        }
        if (schema.type === 'boolean' && actualType !== 'boolean') {
            errors.push({ field: fieldName, message: `Expected boolean, got ${actualType}`, rule: 'type' });
        }

        // String validations
        if (schema.type === 'string' && typeof value === 'string') {
            if (schema.minLength && value.length < schema.minLength) {
                errors.push({ field: fieldName, message: `Minimum length is ${schema.minLength}`, rule: 'minLength' });
            }
            if (schema.maxLength && value.length > schema.maxLength) {
                errors.push({ field: fieldName, message: `Maximum length is ${schema.maxLength}`, rule: 'maxLength' });
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                errors.push({ field: fieldName, message: `Does not match pattern ${schema.pattern}`, rule: 'pattern' });
            }
        }

        // Number validations
        if (schema.type === 'number' && typeof value === 'number') {
            if (schema.min !== undefined && value < schema.min) {
                errors.push({ field: fieldName, message: `Minimum value is ${schema.min}`, rule: 'min' });
            }
            if (schema.max !== undefined && value > schema.max) {
                errors.push({ field: fieldName, message: `Maximum value is ${schema.max}`, rule: 'max' });
            }
        }

        // Enum validation
        if (schema.values && !schema.values.includes(value)) {
            errors.push({
                field: fieldName,
                message: `Value must be one of: ${schema.values.join(', ')}`,
                rule: 'enum'
            });
        }

        return errors;
    }

    /**
     * Get all node types
     */
    async getAllNodeTypes(): Promise<NodeTypeSchema[]> {
        const result = await this.pool.query(
            `SELECT id, name, parent_node_type_id as "parentNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM node_types 
       WHERE archived_at IS NULL
       ORDER BY name`
        );

        return result.rows;
    }

    /**
     * Get all edge types
     */
    async getAllEdgeTypes(): Promise<EdgeTypeSchema[]> {
        const result = await this.pool.query(
            `SELECT id, name, source_node_type_id as "sourceNodeTypeId",
              target_node_type_id as "targetNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM edge_types 
       WHERE archived_at IS NULL
       ORDER BY name`
        );

        return result.rows;
    }

    /**
     * Get child types (for hierarchy queries)
     */
    async getChildTypes(parentTypeId: string): Promise<NodeTypeSchema[]> {
        const result = await this.pool.query(
            `SELECT id, name, parent_node_type_id as "parentNodeTypeId", props, meta, ai,
              archived_at as "archivedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM node_types 
       WHERE parent_node_type_id = $1 AND archived_at IS NULL
       ORDER BY name`,
            [parentTypeId]
        );

        return result.rows;
    }

    /**
     * Clear cache (call after migrations or schema changes)
     */
    clearCache(): void {
        this.nodeTypeCache.clear();
        this.edgeTypeCache.clear();
        // Clear Redis cache
        this.redis.keys(`${this.CACHE_PREFIX}*`).then(keys => {
            if (keys.length > 0) {
                this.redis.del(...keys);
            }
        });
    }
}

export default SchemaService;
