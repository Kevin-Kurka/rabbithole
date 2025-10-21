import { Resolver, Query, Mutation, Arg, Ctx, FieldResolver, Root, ID } from 'type-graphql';
import { NodeType } from '../entities/NodeType';
import { NodeTypeInput, UpdateNodeTypeInput } from './TypeInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { CacheService } from '../services/CacheService';
import { Redis } from 'ioredis';

@Resolver(of => NodeType)
export class NodeTypeResolver {
  @FieldResolver(() => NodeType, { nullable: true })
  async parentNodeType(
    @Root() nodeType: NodeType,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<NodeType | null> {
    if (!nodeType.parent_node_type_id) {
      return null;
    }
    
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE id = $1',
      [nodeType.parent_node_type_id]
    );
    return result.rows[0] || null;
  }

  @Query(() => [NodeType])
  async nodeTypes(@Ctx() { pool }: { pool: Pool }): Promise<NodeType[]> {
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" ORDER BY name ASC'
    );
    return result.rows;
  }

  @Query(() => NodeType, { nullable: true })
  async nodeType(
    @Arg("id", () => ID) id: string,
    @Ctx() { pool, redis }: { pool: Pool, redis: Redis }
  ): Promise<NodeType | null> {
    // Try cache first
    const cacheService = new CacheService(redis);
    const cacheKey = `nodeType:\${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - query database
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE id = $1',
      [id]
    );
    const nodeType = result.rows[0];
    
    if (!nodeType) {
      return null;
    }

    // Cache the result for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(nodeType));
    
    return nodeType;
  }

  @Query(() => NodeType, { nullable: true })
  async nodeTypeByName(
    @Arg("name") name: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<NodeType | null> {
    const result = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE name = $1',
      [name]
    );
    return result.rows[0] || null;
  }

  @Mutation(() => NodeType)
  async createNodeType(
    @Arg("input") input: NodeTypeInput,
    @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
  ): Promise<NodeType> {
    const { name, description, props, meta, parent_node_type_id } = input;

    // Check if a node type with this name already exists
    const existingCheck = await pool.query(
      'SELECT id FROM public."NodeTypes" WHERE name = $1',
      [name]
    );
    
    if (existingCheck.rows.length > 0) {
      throw new Error(`NodeType with name "\${name}" already exists`);
    }

    // Validate parent_node_type_id if provided
    if (parent_node_type_id) {
      const parentCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE id = $1',
        [parent_node_type_id]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error(`Parent NodeType with id "\${parent_node_type_id}" does not exist`);
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
      `INSERT INTO public."NodeTypes" 
       (name, description, props, meta, parent_node_type_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        name,
        description || null,
        props || null,
        meta || null,
        parent_node_type_id || null
      ]
    );

    const newNodeType = result.rows[0];
    
    // Publish event for subscriptions if needed
    await pubSub.publish('NODE_TYPE_CREATED', newNodeType);
    
    return newNodeType;
  }

  @Mutation(() => NodeType)
  async updateNodeType(
    @Arg("id", () => ID) id: string,
    @Arg("input") input: UpdateNodeTypeInput,
    @Ctx() { pool, pubSub, redis }: { pool: Pool, pubSub: PubSubEngine, redis: Redis }
  ): Promise<NodeType> {
    // Check if the node type exists
    const existingResult = await pool.query(
      'SELECT * FROM public."NodeTypes" WHERE id = $1',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      throw new Error(`NodeType with id "\${id}" does not exist`);
    }

    const existing = existingResult.rows[0];
    const { name, description, props, meta, parent_node_type_id } = input;

    // Check if new name conflicts with another node type
    if (name && name !== existing.name) {
      const nameCheck = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameCheck.rows.length > 0) {
        throw new Error(`NodeType with name "\${name}" already exists`);
      }
    }

    // Validate parent_node_type_id if provided
    if (parent_node_type_id !== undefined) {
      if (parent_node_type_id === id) {
        throw new Error('A NodeType cannot be its own parent');
      }
      if (parent_node_type_id) {
        const parentCheck = await pool.query(
          'SELECT id FROM public."NodeTypes" WHERE id = $1',
          [parent_node_type_id]
        );
        if (parentCheck.rows.length === 0) {
          throw new Error(`Parent NodeType with id "\${parent_node_type_id}" does not exist`);
        }
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
    if (description !== undefined) {
      updateFields.push(`description = \$\${paramCount++}`);
      values.push(description);
    }
    if (props !== undefined) {
      updateFields.push(`props = \$\${paramCount++}`);
      values.push(props);
    }
    if (meta !== undefined) {
      updateFields.push(`meta = \$\${paramCount++}`);
      values.push(meta);
    }
    if (parent_node_type_id !== undefined) {
      updateFields.push(`parent_node_type_id = \$\${paramCount++}`);
      values.push(parent_node_type_id);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    values.push(id);
    const fieldsStr = updateFields.join(', ');
    const updateQuery = `UPDATE public."NodeTypes" SET \${fieldsStr} WHERE id = \$\${paramCount} RETURNING *`;
    const result = await pool.query(updateQuery, values);

    const updatedNodeType = result.rows[0];

    // Invalidate cache
    const cacheService = new CacheService(redis);
    await redis.del(`nodeType:\${id}`);

    // Publish event for subscriptions if needed
    await pubSub.publish('NODE_TYPE_UPDATED', updatedNodeType);

    return updatedNodeType;
  }

  @Mutation(() => Boolean)
  async deleteNodeType(
    @Arg("id", () => ID) id: string,
    @Ctx() { pool, pubSub, redis }: { pool: Pool, pubSub: PubSubEngine, redis: Redis }
  ): Promise<boolean> {
    // Check if any nodes use this type
    const nodesCheck = await pool.query(
      'SELECT COUNT(*) FROM public."Nodes" WHERE node_type_id = $1',
      [id]
    );
    
    if (parseInt(nodesCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete NodeType that is in use by existing nodes');
    }

    // Check if any edge types reference this node type
    const edgeTypesCheck = await pool.query(
      'SELECT COUNT(*) FROM public."EdgeTypes" WHERE source_node_type_id = $1 OR target_node_type_id = $1',
      [id]
    );
    
    if (parseInt(edgeTypesCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete NodeType that is referenced by EdgeTypes');
    }

    // Check if any node types have this as parent
    const childrenCheck = await pool.query(
      'SELECT COUNT(*) FROM public."NodeTypes" WHERE parent_node_type_id = $1',
      [id]
    );
    
    if (parseInt(childrenCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete NodeType that has child NodeTypes');
    }

    const result = await pool.query(
      'DELETE FROM public."NodeTypes" WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error(`NodeType with id "\${id}" does not exist`);
    }

    // Invalidate cache
    await redis.del(`nodeType:\${id}`);

    // Publish event for subscriptions if needed
    await pubSub.publish('NODE_TYPE_DELETED', { nodeTypeId: id });

    return true;
  }
}
