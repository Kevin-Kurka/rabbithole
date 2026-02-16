import { Resolver, Query, Mutation, Arg, Ctx, FieldResolver, Root, ID } from 'type-graphql';
import { EdgeType } from '../entities/EdgeType';
import { NodeType } from '../entities/NodeType';
import { EdgeTypeInput, UpdateEdgeTypeInput } from './TypeInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { CacheService } from '../services/CacheService';
import { Redis } from 'ioredis';

@Resolver(of => EdgeType)
export class EdgeTypeResolver {
  @FieldResolver(() => NodeType, { nullable: true })
  async sourceNodeType(
    @Root() edgeType: EdgeType,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<NodeType | null> {
    if (!edgeType.source_node_type_id) {
      return null;
    }
    
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE id = $1',
      [edgeType.source_node_type_id]
    );
    return result.rows[0] || null;
  }

  @FieldResolver(() => NodeType, { nullable: true })
  async targetNodeType(
    @Root() edgeType: EdgeType,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<NodeType | null> {
    if (!edgeType.target_node_type_id) {
      return null;
    }
    
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE id = $1',
      [edgeType.target_node_type_id]
    );
    return result.rows[0] || null;
  }

  @Query(() => [EdgeType])
  async edgeTypes(@Ctx() { pool }: { pool: Pool }): Promise<EdgeType[]> {
    const result = await pool.query(
      'SELECT * FROM public."EdgeTypes" ORDER BY name ASC'
    );
    return result.rows;
  }

  @Query(() => EdgeType, { nullable: true })
  async edgeType(
    @Arg("id", () => ID) id: string,
    @Ctx() { pool, redis }: { pool: Pool, redis: Redis }
  ): Promise<EdgeType | null> {
    // Try cache first
    const cacheService = new CacheService(redis);
    const cacheKey = `edgeType:\${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - query database
    const result = await pool.query(
      'SELECT * FROM public."EdgeTypes" WHERE id = $1',
      [id]
    );
    const edgeType = result.rows[0];
    
    if (!edgeType) {
      return null;
    }

    // Cache the result for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(edgeType));
    
    return edgeType;
  }

  @Query(() => EdgeType, { nullable: true })
  async edgeTypeByName(
    @Arg("name") name: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<EdgeType | null> {
    const result = await pool.query(
      'SELECT * FROM public."EdgeTypes" WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  @Query(() => [EdgeType])
  async edgeTypesByNodeTypes(
    @Arg("sourceNodeTypeId", () => ID, { nullable: true }) sourceNodeTypeId: string | null,
    @Arg("targetNodeTypeId", () => ID, { nullable: true }) targetNodeTypeId: string | null,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<EdgeType[]> {
    let query = 'SELECT * FROM public."EdgeTypes" WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (sourceNodeTypeId) {
      query += ` AND source_node_type_id = \$\${paramCount++}`;
      params.push(sourceNodeTypeId);
    }

    if (targetNodeTypeId) {
      query += ` AND target_node_type_id = \$\${paramCount}`;
      params.push(targetNodeTypeId);
    }

    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  @Mutation(() => EdgeType)
  async createEdgeType(
    @Arg("input") input: EdgeTypeInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
  ): Promise<EdgeType> {
    const { name, props, meta, source_node_type_id, target_node_type_id } = input;

    // Check if an edge type with this name already exists
    const existingCheck = await pool.query(
      'SELECT id FROM public."EdgeTypes" WHERE name = $1',
      [name]
    );
    
    if (existingCheck.rows.length > 0) {
      throw new Error(`EdgeType with name "\${name}" already exists`);
    }

    // Validate source_node_type_id if provided
    if (source_node_type_id) {
      const sourceCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE id = $1',
        [source_node_type_id]
      );
      if (sourceCheck.rows.length === 0) {
        throw new Error(`Source NodeType with id "\${source_node_type_id}" does not exist`);
      }
    }

    // Validate target_node_type_id if provided
    if (target_node_type_id) {
      const targetCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE id = $1',
        [target_node_type_id]
      );
      if (targetCheck.rows.length === 0) {
        throw new Error(`Target NodeType with id "\${target_node_type_id}" does not exist`);
      }
    }

    // Validate JSON if provided
    if (props) {
      try {
        JSON.parse(props);
      } catch (e) {
        throw new Error('Invalid JSON in props field');
      }
    }
    if (meta) {
      try {
        JSON.parse(meta);
      } catch (e) {
        throw new Error('Invalid JSON in meta field');
      }
    }

    const result = await pool.query(
      `INSERT INTO public."EdgeTypes" 
       (name, props, meta, source_node_type_id, target_node_type_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        name,
        props || null,
        meta || null,
        source_node_type_id || null,
        target_node_type_id || null
      ]
    );

    const newEdgeType = result.rows[0];
    
    // Publish event for subscriptions if needed
    await pubSub.publish('EDGE_TYPE_CREATED', newEdgeType);
    
    return newEdgeType;
  }

  @Mutation(() => EdgeType)
  async updateEdgeType(
    @Arg("id", () => ID) id: string,
    @Arg("input") input: UpdateEdgeTypeInput,
    @Ctx() { pool, pubSub, redis }: { pool: Pool, pubSub: PubSubEngine, redis: Redis }
  ): Promise<EdgeType> {
    // Check if the edge type exists
    const existingResult = await pool.query(
      'SELECT * FROM public."EdgeTypes" WHERE id = $1',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      throw new Error(`EdgeType with id "\${id}" does not exist`);
    }

    const existing = existingResult.rows[0];
    const { name, props, meta, source_node_type_id, target_node_type_id } = input;

    // Check if new name conflicts with another edge type
    if (name && name !== existing.name) {
      const nameCheck = await pool.query(
        'SELECT id FROM public."EdgeTypes" WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameCheck.rows.length > 0) {
        throw new Error(`EdgeType with name "\${name}" already exists`);
      }
    }

    // Validate source_node_type_id if provided
    if (source_node_type_id !== undefined && source_node_type_id) {
      const sourceCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE id = $1',
        [source_node_type_id]
      );
      if (sourceCheck.rows.length === 0) {
        throw new Error(`Source NodeType with id "\${source_node_type_id}" does not exist`);
      }
    }

    // Validate target_node_type_id if provided
    if (target_node_type_id !== undefined && target_node_type_id) {
      const targetCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE id = $1',
        [target_node_type_id]
      );
      if (targetCheck.rows.length === 0) {
        throw new Error(`Target NodeType with id "\${target_node_type_id}" does not exist`);
      }
    }

    // Validate JSON if provided
    if (props) {
      try {
        JSON.parse(props);
      } catch (e) {
        throw new Error('Invalid JSON in props field');
      }
    }
    if (meta) {
      try {
        JSON.parse(meta);
      } catch (e) {
        throw new Error('Invalid JSON in meta field');
      }
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = \$\${paramCount++}`);
      values.push(name);
    }
    if (props !== undefined) {
      updateFields.push(`props = \$\${paramCount++}`);
      values.push(props);
    }
    if (meta !== undefined) {
      updateFields.push(`meta = \$\${paramCount++}`);
      values.push(meta);
    }
    if (source_node_type_id !== undefined) {
      updateFields.push(`source_node_type_id = \$\${paramCount++}`);
      values.push(source_node_type_id);
    }
    if (target_node_type_id !== undefined) {
      updateFields.push(`target_node_type_id = \$\${paramCount++}`);
      values.push(target_node_type_id);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    values.push(id);
    const fieldsStr = updateFields.join(', ');
    const updateQuery = `UPDATE public."EdgeTypes" SET \${fieldsStr} WHERE id = \$\${paramCount} RETURNING *`;
    const result = await pool.query(updateQuery, values);

    const updatedEdgeType = result.rows[0];

    // Invalidate cache
    const cacheService = new CacheService(redis);
    await redis.del(`edgeType:\${id}`);

    // Publish event for subscriptions if needed
    await pubSub.publish('EDGE_TYPE_UPDATED', updatedEdgeType);

    return updatedEdgeType;
  }

  @Mutation(() => Boolean)
  async deleteEdgeType(
    @Arg("id", () => ID) id: string,
    @Ctx() { pool, pubSub, redis }: { pool: Pool, pubSub: PubSubEngine, redis: Redis }
  ): Promise<boolean> {
    // Check if any edges use this type
    const edgesCheck = await pool.query(
      'SELECT COUNT(*) FROM public."Edges" WHERE edge_type_id = $1',
      [id]
    );
    
    if (parseInt(edgesCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete EdgeType that is in use by existing edges');
    }

    const result = await pool.query(
      'DELETE FROM public."EdgeTypes" WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error(`EdgeType with id "\${id}" does not exist`);
    }

    // Invalidate cache
    await redis.del(`edgeType:\${id}`);

    // Publish event for subscriptions if needed
    await pubSub.publish('EDGE_TYPE_DELETED', { edgeTypeId: id });

    return true;
  }
}
