import { Resolver, Query, Mutation, Arg, Ctx, Subscription, Root, FieldResolver, Int, ID } from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { Methodology, MethodologyStatus } from '../entities/Methodology';
import { MethodologyNodeType } from '../entities/MethodologyNodeType';
import { MethodologyEdgeType } from '../entities/MethodologyEdgeType';
import { MethodologyWorkflow } from '../entities/MethodologyWorkflow';
import { UserMethodologyProgress, MethodologyPermission } from '../entities/UserMethodology';
import { User } from '../entities/User';
import { Graph } from '../entities/Graph';
import {
  CreateMethodologyInput,
  UpdateMethodologyInput,
  CreateMethodologyNodeTypeInput,
  UpdateMethodologyNodeTypeInput,
  CreateMethodologyEdgeTypeInput,
  UpdateMethodologyEdgeTypeInput,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  MethodologyFilterInput,
  ShareMethodologyInput,
  UpdateWorkflowProgressInput
} from './MethodologyInput';

const METHODOLOGY_UPDATED = 'METHODOLOGY_UPDATED';
const METHODOLOGY_NODE_TYPE_ADDED = 'METHODOLOGY_NODE_TYPE_ADDED';
const METHODOLOGY_EDGE_TYPE_ADDED = 'METHODOLOGY_EDGE_TYPE_ADDED';
const WORKFLOW_PROGRESS_UPDATED = 'WORKFLOW_PROGRESS_UPDATED';
const NEW_METHODOLOGY_PUBLISHED = 'NEW_METHODOLOGY_PUBLISHED';

interface Context {
  pool: Pool;
  pubSub: PubSubEngine;
  userId?: string; // Add authentication context when implemented
}

@Resolver(Methodology)
export class MethodologyResolver {
  // ================================================
  // Field Resolvers
  // ================================================

  @FieldResolver(() => User, { nullable: true })
  async creator(@Root() methodology: Methodology, @Ctx() { pool }: Context): Promise<User | null> {
    if (!methodology.created_by) return null;
    const result = await pool.query('SELECT * FROM public."Users" WHERE id = $1', [methodology.created_by]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => Methodology, { nullable: true })
  async parent_methodology(@Root() methodology: Methodology, @Ctx() { pool }: Context): Promise<Methodology | null> {
    if (!methodology.parent_methodology_id) return null;
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [methodology.parent_methodology_id]);
    return result.rows[0] || null;
  }

  @FieldResolver(() => [MethodologyNodeType])
  async node_types(@Root() methodology: Methodology, @Ctx() { pool }: Context): Promise<MethodologyNodeType[]> {
    const result = await pool.query(
      'SELECT * FROM public."MethodologyNodeTypes" WHERE methodology_id = $1 ORDER BY display_order ASC',
      [methodology.id]
    );
    return result.rows;
  }

  @FieldResolver(() => [MethodologyEdgeType])
  async edge_types(@Root() methodology: Methodology, @Ctx() { pool }: Context): Promise<MethodologyEdgeType[]> {
    const result = await pool.query(
      'SELECT * FROM public."MethodologyEdgeTypes" WHERE methodology_id = $1 ORDER BY display_order ASC',
      [methodology.id]
    );
    return result.rows;
  }

  @FieldResolver(() => MethodologyWorkflow, { nullable: true })
  async workflow(@Root() methodology: Methodology, @Ctx() { pool }: Context): Promise<MethodologyWorkflow | null> {
    const result = await pool.query(
      'SELECT * FROM public."MethodologyWorkflows" WHERE methodology_id = $1',
      [methodology.id]
    );
    return result.rows[0] || null;
  }

  // ================================================
  // Queries
  // ================================================

  @Query(() => Methodology, { nullable: true })
  async methodology(@Arg('id', () => ID) id: string, @Ctx() { pool }: Context): Promise<Methodology | null> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  @Query(() => [Methodology])
  async methodologies(
    @Arg('filter', () => MethodologyFilterInput, { nullable: true }) filter: MethodologyFilterInput | null,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<Methodology[]> {
    let query = 'SELECT * FROM public."Methodologies" WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filter) {
      if (filter.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filter.category);
      }
      if (filter.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filter.status);
      }
      if (filter.is_system !== undefined) {
        query += ` AND is_system = $${paramIndex++}`;
        params.push(filter.is_system);
      }
      if (filter.creator_id) {
        query += ` AND created_by = $${paramIndex++}`;
        params.push(filter.creator_id);
      }
      if (filter.tags && filter.tags.length > 0) {
        query += ` AND tags && $${paramIndex++}`;
        params.push(filter.tags);
      }
      if (filter.search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filter.search}%`);
        paramIndex++;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  @Query(() => Methodology, { nullable: true })
  async methodologyByName(@Arg('name') name: string, @Ctx() { pool }: Context): Promise<Methodology | null> {
    const result = await pool.query('SELECT * FROM public."Methodologies" WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  @Query(() => [Methodology])
  async systemMethodologies(@Ctx() { pool }: Context): Promise<Methodology[]> {
    const result = await pool.query(
      'SELECT * FROM public."Methodologies" WHERE is_system = true AND status = $1 ORDER BY name ASC',
      [MethodologyStatus.PUBLISHED]
    );
    return result.rows;
  }

  @Query(() => [Methodology])
  async myMethodologies(@Ctx() { pool, userId }: Context): Promise<Methodology[]> {
    if (!userId) {
      throw new Error('Authentication required');
    }
    const result = await pool.query(
      'SELECT * FROM public."Methodologies" WHERE created_by = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  @Query(() => [Methodology])
  async sharedWithMe(@Ctx() { pool, userId }: Context): Promise<Methodology[]> {
    if (!userId) {
      throw new Error('Authentication required');
    }
    const result = await pool.query(
      `SELECT m.* FROM public."Methodologies" m
       INNER JOIN public."MethodologyPermissions" mp ON m.id = mp.methodology_id
       WHERE mp.user_id = $1 AND mp.can_view = true
       ORDER BY mp.shared_at DESC`,
      [userId]
    );
    return result.rows;
  }

  @Query(() => [Methodology])
  async trendingMethodologies(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 10 }) limit: number,
    @Ctx() { pool }: Context
  ): Promise<Methodology[]> {
    const result = await pool.query(
      `SELECT * FROM public."Methodologies"
       WHERE status = $1 AND is_system = false
       ORDER BY usage_count DESC, rating DESC NULLS LAST
       LIMIT $2`,
      [MethodologyStatus.PUBLISHED, limit]
    );
    return result.rows;
  }

  // ================================================
  // Mutations - Methodology CRUD
  // ================================================

  @Mutation(() => Methodology)
  async createMethodology(
    @Arg('input') input: CreateMethodologyInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Methodology> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      `INSERT INTO public."Methodologies"
       (name, description, category, status, icon, color, tags, config, created_by, is_system)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.name,
        input.description || null,
        input.category,
        MethodologyStatus.DRAFT,
        input.icon || null,
        input.color || null,
        input.tags || [],
        input.config || '{}',
        userId,
        false
      ]
    );

    return result.rows[0];
  }

  @Mutation(() => Methodology)
  async updateMethodology(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateMethodologyInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<Methodology> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }
    if (input.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      params.push(input.icon);
    }
    if (input.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      params.push(input.color);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(input.tags);
    }
    if (input.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      params.push(input.config);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE public."Methodologies" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedMethodology = result.rows[0];
    await pubSub.publish(METHODOLOGY_UPDATED, updatedMethodology);

    return updatedMethodology;
  }

  @Mutation(() => Boolean)
  async deleteMethodology(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT created_by, is_system FROM public."Methodologies" WHERE id = $1',
      [id]
    );
    if (!ownerCheck.rows[0]) {
      throw new Error('Methodology not found');
    }
    if (ownerCheck.rows[0].is_system) {
      throw new Error('Cannot delete system methodologies');
    }
    if (ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    await pool.query('DELETE FROM public."Methodologies" WHERE id = $1', [id]);
    return true;
  }

  @Mutation(() => Methodology)
  async publishMethodology(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<Methodology> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT created_by, category FROM public."Methodologies" WHERE id = $1',
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const result = await pool.query(
      `UPDATE public."Methodologies"
       SET status = $1, published_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [MethodologyStatus.PUBLISHED, id]
    );

    const publishedMethodology = result.rows[0];
    await pubSub.publish(NEW_METHODOLOGY_PUBLISHED, publishedMethodology);

    return publishedMethodology;
  }

  @Mutation(() => Methodology)
  async forkMethodology(
    @Arg('id', () => ID) id: string,
    @Arg('newName') newName: string,
    @Ctx() { pool, userId }: Context
  ): Promise<Methodology> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get original methodology
    const originalResult = await pool.query('SELECT * FROM public."Methodologies" WHERE id = $1', [id]);
    const original = originalResult.rows[0];
    if (!original) {
      throw new Error('Methodology not found');
    }

    // Create fork
    const forkResult = await pool.query(
      `INSERT INTO public."Methodologies"
       (name, description, category, status, icon, color, tags, config, created_by, parent_methodology_id, is_system, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        newName,
        original.description,
        original.category,
        MethodologyStatus.DRAFT,
        original.icon,
        original.color,
        original.tags,
        original.config,
        userId,
        id,
        false,
        1
      ]
    );

    const forkedMethodology = forkResult.rows[0];

    // Copy node types
    const nodeTypes = await pool.query(
      'SELECT * FROM public."MethodologyNodeTypes" WHERE methodology_id = $1',
      [id]
    );
    for (const nodeType of nodeTypes.rows) {
      await pool.query(
        `INSERT INTO public."MethodologyNodeTypes"
         (methodology_id, name, display_name, description, icon, color, properties_schema,
          default_properties, required_properties, constraints, suggestions, visual_config, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          forkedMethodology.id,
          nodeType.name,
          nodeType.display_name,
          nodeType.description,
          nodeType.icon,
          nodeType.color,
          nodeType.properties_schema,
          nodeType.default_properties,
          nodeType.required_properties,
          nodeType.constraints,
          nodeType.suggestions,
          nodeType.visual_config,
          nodeType.display_order
        ]
      );
    }

    // Copy edge types
    const edgeTypes = await pool.query(
      'SELECT * FROM public."MethodologyEdgeTypes" WHERE methodology_id = $1',
      [id]
    );
    for (const edgeType of edgeTypes.rows) {
      await pool.query(
        `INSERT INTO public."MethodologyEdgeTypes"
         (methodology_id, name, display_name, description, is_directed, is_bidirectional,
          valid_source_types, valid_target_types, source_cardinality, target_cardinality,
          line_style, line_color, arrow_style, properties_schema, default_properties, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          forkedMethodology.id,
          edgeType.name,
          edgeType.display_name,
          edgeType.description,
          edgeType.is_directed,
          edgeType.is_bidirectional,
          edgeType.valid_source_types,
          edgeType.valid_target_types,
          edgeType.source_cardinality,
          edgeType.target_cardinality,
          edgeType.line_style,
          edgeType.line_color,
          edgeType.arrow_style,
          edgeType.properties_schema,
          edgeType.default_properties,
          edgeType.display_order
        ]
      );
    }

    // Copy workflow if exists
    const workflow = await pool.query(
      'SELECT * FROM public."MethodologyWorkflows" WHERE methodology_id = $1',
      [id]
    );
    if (workflow.rows[0]) {
      const wf = workflow.rows[0];
      await pool.query(
        `INSERT INTO public."MethodologyWorkflows"
         (methodology_id, steps, initial_canvas_state, is_linear, allow_skip,
          require_completion, instructions, tutorial_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          forkedMethodology.id,
          wf.steps,
          wf.initial_canvas_state,
          wf.is_linear,
          wf.allow_skip,
          wf.require_completion,
          wf.instructions,
          wf.tutorial_url
        ]
      );
    }

    return forkedMethodology;
  }

  // ================================================
  // Mutations - Node Types
  // ================================================

  @Mutation(() => MethodologyNodeType)
  async createMethodologyNodeType(
    @Arg('input') input: CreateMethodologyNodeTypeInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<MethodologyNodeType> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check methodology ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [input.methodology_id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const result = await pool.query(
      `INSERT INTO public."MethodologyNodeTypes"
       (methodology_id, name, display_name, description, icon, color, properties_schema,
        default_properties, required_properties, constraints, suggestions, visual_config, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.methodology_id,
        input.name,
        input.display_name,
        input.description || null,
        input.icon || null,
        input.color || null,
        input.properties_schema,
        input.default_properties || '{}',
        input.required_properties || [],
        input.constraints || '{}',
        input.suggestions || '{}',
        input.visual_config || '{}',
        input.display_order || 0
      ]
    );

    const nodeType = result.rows[0];
    await pubSub.publish(METHODOLOGY_NODE_TYPE_ADDED, nodeType);

    return nodeType;
  }

  @Mutation(() => MethodologyNodeType)
  async updateMethodologyNodeType(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateMethodologyNodeTypeInput,
    @Ctx() { pool, userId }: Context
  ): Promise<MethodologyNodeType> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership through methodology
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyNodeTypes" mnt ON m.id = mnt.methodology_id
       WHERE mnt.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE public."MethodologyNodeTypes" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  @Mutation(() => Boolean)
  async deleteMethodologyNodeType(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyNodeTypes" mnt ON m.id = mnt.methodology_id
       WHERE mnt.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    await pool.query('DELETE FROM public."MethodologyNodeTypes" WHERE id = $1', [id]);
    return true;
  }

  // ================================================
  // Mutations - Edge Types
  // ================================================

  @Mutation(() => MethodologyEdgeType)
  async createMethodologyEdgeType(
    @Arg('input') input: CreateMethodologyEdgeTypeInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<MethodologyEdgeType> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check methodology ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [input.methodology_id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const result = await pool.query(
      `INSERT INTO public."MethodologyEdgeTypes"
       (methodology_id, name, display_name, description, is_directed, is_bidirectional,
        valid_source_types, valid_target_types, source_cardinality, target_cardinality,
        line_style, line_color, arrow_style, properties_schema, default_properties, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        input.methodology_id,
        input.name,
        input.display_name,
        input.description || null,
        input.is_directed,
        input.is_bidirectional || false,
        input.valid_source_types,
        input.valid_target_types,
        input.source_cardinality || '{"min": 0, "max": null}',
        input.target_cardinality || '{"min": 0, "max": null}',
        input.line_style || 'solid',
        input.line_color || null,
        input.arrow_style || 'arrow',
        input.properties_schema || '{}',
        input.default_properties || '{}',
        input.display_order || 0
      ]
    );

    const edgeType = result.rows[0];
    await pubSub.publish(METHODOLOGY_EDGE_TYPE_ADDED, edgeType);

    return edgeType;
  }

  @Mutation(() => MethodologyEdgeType)
  async updateMethodologyEdgeType(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateMethodologyEdgeTypeInput,
    @Ctx() { pool, userId }: Context
  ): Promise<MethodologyEdgeType> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyEdgeTypes" met ON m.id = met.methodology_id
       WHERE met.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE public."MethodologyEdgeTypes" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  @Mutation(() => Boolean)
  async deleteMethodologyEdgeType(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyEdgeTypes" met ON m.id = met.methodology_id
       WHERE met.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    await pool.query('DELETE FROM public."MethodologyEdgeTypes" WHERE id = $1', [id]);
    return true;
  }

  // ================================================
  // Mutations - Workflows
  // ================================================

  @Mutation(() => MethodologyWorkflow)
  async createWorkflow(
    @Arg('input') input: CreateWorkflowInput,
    @Ctx() { pool, userId }: Context
  ): Promise<MethodologyWorkflow> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check methodology ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [input.methodology_id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const result = await pool.query(
      `INSERT INTO public."MethodologyWorkflows"
       (methodology_id, steps, initial_canvas_state, is_linear, allow_skip,
        require_completion, instructions, tutorial_url, example_graph_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.methodology_id,
        input.steps,
        input.initial_canvas_state || '{}',
        input.is_linear || false,
        input.allow_skip !== undefined ? input.allow_skip : true,
        input.require_completion || false,
        input.instructions || null,
        input.tutorial_url || null,
        input.example_graph_id || null
      ]
    );

    return result.rows[0];
  }

  @Mutation(() => MethodologyWorkflow)
  async updateWorkflow(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateWorkflowInput,
    @Ctx() { pool, userId }: Context
  ): Promise<MethodologyWorkflow> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyWorkflows" mw ON m.id = mw.methodology_id
       WHERE mw.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE public."MethodologyWorkflows" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  @Mutation(() => Boolean)
  async deleteWorkflow(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      `SELECT m.created_by FROM public."Methodologies" m
       INNER JOIN public."MethodologyWorkflows" mw ON m.id = mw.methodology_id
       WHERE mw.id = $1`,
      [id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    await pool.query('DELETE FROM public."MethodologyWorkflows" WHERE id = $1', [id]);
    return true;
  }

  // ================================================
  // Mutations - Sharing & Permissions
  // ================================================

  @Mutation(() => MethodologyPermission)
  async shareMethodology(
    @Arg('input') input: ShareMethodologyInput,
    @Ctx() { pool, userId }: Context
  ): Promise<MethodologyPermission> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [input.methodology_id]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized: You do not own this methodology');
    }

    const result = await pool.query(
      `INSERT INTO public."MethodologyPermissions"
       (methodology_id, user_id, can_view, can_fork, can_edit, can_delete, shared_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (methodology_id, user_id)
       DO UPDATE SET can_view = $3, can_fork = $4, can_edit = $5, can_delete = $6,
                     shared_by = $7, expires_at = $8, shared_at = NOW()
       RETURNING *`,
      [
        input.methodology_id,
        input.user_id,
        input.can_view !== undefined ? input.can_view : true,
        input.can_fork !== undefined ? input.can_fork : true,
        input.can_edit || false,
        input.can_delete || false,
        userId,
        input.expires_at || null
      ]
    );

    return result.rows[0];
  }

  @Mutation(() => Boolean)
  async revokeMethodologyAccess(
    @Arg('methodology_id', () => ID) methodologyId: string,
    @Arg('user_id', () => ID) targetUserId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT created_by FROM public."Methodologies" WHERE id = $1',
      [methodologyId]
    );
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].created_by !== userId) {
      throw new Error('Unauthorized');
    }

    await pool.query(
      'DELETE FROM public."MethodologyPermissions" WHERE methodology_id = $1 AND user_id = $2',
      [methodologyId, targetUserId]
    );

    return true;
  }

  @Mutation(() => Methodology)
  async rateMethodology(
    @Arg('methodology_id', () => ID) methodologyId: string,
    @Arg('rating') rating: number,
    @Ctx() { pool, userId }: Context
  ): Promise<Methodology> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    // Calculate new average rating
    const currentRating = await pool.query(
      'SELECT rating, usage_count FROM public."Methodologies" WHERE id = $1',
      [methodologyId]
    );

    const current = currentRating.rows[0];
    const newRating = current.rating
      ? ((current.rating * current.usage_count) + rating) / (current.usage_count + 1)
      : rating;

    const result = await pool.query(
      'UPDATE public."Methodologies" SET rating = $1 WHERE id = $2 RETURNING *',
      [newRating, methodologyId]
    );

    return result.rows[0];
  }

  // ================================================
  // Subscriptions
  // ================================================

  @Subscription(() => Methodology, {
    topics: METHODOLOGY_UPDATED,
    filter: ({ payload, args }) => payload.id === args.id
  })
  methodologyUpdated(
    @Arg('id', () => ID) id: string,
    @Root() methodology: Methodology
  ): Methodology {
    return methodology;
  }

  @Subscription(() => MethodologyNodeType, {
    topics: METHODOLOGY_NODE_TYPE_ADDED,
    filter: ({ payload, args }) => payload.methodology_id === args.methodologyId
  })
  methodologyNodeTypeAdded(
    @Arg('methodologyId', () => ID) methodologyId: string,
    @Root() nodeType: MethodologyNodeType
  ): MethodologyNodeType {
    return nodeType;
  }

  @Subscription(() => MethodologyEdgeType, {
    topics: METHODOLOGY_EDGE_TYPE_ADDED,
    filter: ({ payload, args }) => payload.methodology_id === args.methodologyId
  })
  methodologyEdgeTypeAdded(
    @Arg('methodologyId', () => ID) methodologyId: string,
    @Root() edgeType: MethodologyEdgeType
  ): MethodologyEdgeType {
    return edgeType;
  }

  @Subscription(() => Methodology, {
    topics: NEW_METHODOLOGY_PUBLISHED,
    filter: ({ payload, args }) => !args.category || payload.category === args.category
  })
  newMethodologyPublished(
    @Arg('category', () => String, { nullable: true }) category: string | null,
    @Root() methodology: Methodology
  ): Methodology {
    return methodology;
  }
}
