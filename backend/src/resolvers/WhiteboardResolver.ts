import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  InputType,
  Field,
  ID,
  Float,
  ObjectType,
} from 'type-graphql';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';
import { Context } from '../types/context';
import { GraphQLJSONObject } from 'graphql-type-json';

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class PositionInput {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@InputType()
class DimensionsInput {
  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;
}

@InputType()
class CreateTextBoxNodeInput {
  @Field(() => ID)
  graphId!: string;

  @Field()
  type!: string; // 'Thesis', 'Citation', or 'Reference'

  @Field()
  title!: string;

  @Field()
  content!: string; // Main text content

  @Field(() => PositionInput)
  position!: PositionInput;

  @Field(() => DimensionsInput, { nullable: true })
  dimensions?: DimensionsInput;

  @Field(() => GraphQLJSONObject, { nullable: true })
  additionalProps?: any; // For type-specific properties (citations, references, etc.)
}

@InputType()
class UpdateNodePositionInput {
  @Field(() => ID)
  nodeId!: string;

  @Field(() => PositionInput)
  position!: PositionInput;

  @Field(() => DimensionsInput, { nullable: true })
  dimensions?: DimensionsInput;
}

@InputType()
class NodePermissionInput {
  @Field(() => ID)
  userId!: string;

  @Field()
  role!: string; // 'owner', 'editor', 'viewer', 'commenter'

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
class UpdateNodePermissionsInput {
  @Field(() => ID)
  nodeId!: string;

  @Field(() => [NodePermissionInput])
  permissions!: NodePermissionInput[];
}

@InputType()
class BulkUpdatePositionsInput {
  @Field(() => [UpdateNodePositionInput])
  updates!: UpdateNodePositionInput[];
}

@InputType()
class CreateEdgeWithDetailsInput {
  @Field(() => ID)
  graphId!: string;

  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => ID)
  targetNodeId!: string;

  @Field()
  relationshipType!: string; // e.g., 'supports', 'contradicts', 'related', 'cites'

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  properties?: any;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

@ObjectType()
class CanvasNode {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graphId!: string;

  @Field()
  nodeType!: string;

  @Field()
  title!: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  position?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  dimensions?: any;

  @Field(() => Float, { nullable: true })
  zIndex?: number;

  @Field(() => GraphQLJSONObject, { nullable: true })
  props?: any;

  @Field(() => GraphQLJSONObject, { nullable: true })
  meta?: any;

  @Field(() => Float, { nullable: true })
  weight?: number;

  @Field()
  isLevel0!: boolean;
}

@ObjectType()
class BulkUpdateResult {
  @Field()
  success!: boolean;

  @Field()
  updatedCount!: number;

  @Field(() => [String], { nullable: true })
  errors?: string[];
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver(() => Node)
export class WhiteboardResolver {
  // Helper function to serialize nodes
  private serializeNode(row: any): Node {
    return {
      ...row,
      props: typeof row.props === 'object' ? JSON.stringify(row.props) : row.props,
      meta: typeof row.meta === 'object' ? JSON.stringify(row.meta) : row.meta,
      permissions: typeof row.permissions === 'object' ? JSON.stringify(row.permissions) : row.permissions,
    };
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  @Query(() => [CanvasNode])
  async getCanvasNodes(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<CanvasNode[]> {
    try {
      const sql = `
        SELECT
          n.id,
          n.graph_id,
          nt.name as node_type,
          n.title,
          n.props->>'position' as position_json,
          n.props->>'dimensions' as dimensions_json,
          COALESCE((n.props->>'zIndex')::numeric, n.weight) as z_index,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.graph_id = $1 AND n.props ? 'position'
        ORDER BY z_index ASC
      `;

      const result = await pool.query(sql, [graphId]);

      return result.rows.map((row) => ({
        id: row.id,
        graphId: row.graph_id,
        nodeType: row.node_type,
        title: row.title,
        position: row.position_json ? JSON.parse(row.position_json) : null,
        dimensions: row.dimensions_json ? JSON.parse(row.dimensions_json) : null,
        zIndex: row.z_index,
        props: row.props,
        meta: row.meta,
        weight: row.weight,
        isLevel0: row.is_level_0,
      }));
    } catch (error) {
      console.error('Error fetching canvas nodes:', error);
      throw new Error('Failed to fetch canvas nodes');
    }
  }

  @Query(() => [Node])
  async getTextBoxNodes(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<Node[]> {
    try {
      const sql = `
        SELECT n.*
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.graph_id = $1 AND nt.name IN ('Thesis', 'Citation', 'Reference')
        ORDER BY n.created_at DESC
      `;

      const result = await pool.query(sql, [graphId]);
      return result.rows.map((row) => this.serializeNode(row));
    } catch (error) {
      console.error('Error fetching text box nodes:', error);
      throw new Error('Failed to fetch text box nodes');
    }
  }

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  @Mutation(() => Node)
  async createTextBoxNode(
    @Arg('input') input: CreateTextBoxNodeInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to create text box nodes');
    }

    // Validate node type
    const validTypes = ['Thesis', 'Citation', 'Reference'];
    if (!validTypes.includes(input.type)) {
      throw new Error(`Invalid node type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if graph is Level 0 (read-only)
    const graphCheck = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [
      input.graphId,
    ]);
    if (graphCheck.rows[0]?.level === 0) {
      throw new Error('Cannot create nodes in Level 0 (immutable) graphs');
    }

    try {
      // Get node type ID
      const nodeTypeResult = await pool.query(
        'SELECT id FROM public."NodeTypes" WHERE name = $1',
        [input.type]
      );

      if (nodeTypeResult.rows.length === 0) {
        throw new Error(`Node type '${input.type}' not found`);
      }

      const nodeTypeId = nodeTypeResult.rows[0].id;

      // Build props object with position and content
      const props = {
        content: input.content,
        position: input.position,
        dimensions: input.dimensions || { width: 300, height: 200 },
        ...(input.additionalProps || {}),
      };

      // Build meta object with initial version history
      const meta = {
        isTextBox: true,
        versionHistory: [
          {
            timestamp: new Date().toISOString(),
            userId,
            operation: 'create',
            changes: { content: { old: null, new: input.content } },
            position: input.position,
          },
        ],
      };

      // Create the text box node (no credibility score - weight is NULL)
      const sql = `
        INSERT INTO public."Nodes" (
          graph_id,
          node_type_id,
          title,
          props,
          meta,
          created_by,
          is_level_0,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.graphId,
        nodeTypeId,
        input.title,
        JSON.stringify(props),
        JSON.stringify(meta),
        userId,
      ]);

      return this.serializeNode(result.rows[0]);
    } catch (error) {
      console.error('Error creating text box node:', error);
      throw new Error('Failed to create text box node');
    }
  }

  @Mutation(() => Node)
  async updateNodePosition(
    @Arg('input') input: UpdateNodePositionInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to update node position');
    }

    try {
      // Get current node
      const nodeResult = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [
        input.nodeId,
      ]);

      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found');
      }

      const node = nodeResult.rows[0];

      // Check if node is Level 0 (immutable)
      if (node.is_level_0) {
        throw new Error('Cannot update position of Level 0 (immutable) nodes');
      }

      // Update props with new position
      const currentProps = node.props || {};
      const updatedProps = {
        ...currentProps,
        position: input.position,
        ...(input.dimensions ? { dimensions: input.dimensions } : {}),
      };

      // Use the database function to append version history
      await pool.query(
        'SELECT append_node_version_history($1, $2, $3, $4, $5)',
        [
          input.nodeId,
          userId,
          'move',
          JSON.stringify({
            position: {
              old: currentProps.position,
              new: input.position,
            },
          }),
          JSON.stringify(input.position),
        ]
      );

      // Update node
      const updateResult = await pool.query(
        'UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(updatedProps), input.nodeId]
      );

      return this.serializeNode(updateResult.rows[0]);
    } catch (error) {
      console.error('Error updating node position:', error);
      throw new Error('Failed to update node position');
    }
  }

  @Mutation(() => BulkUpdateResult)
  async bulkUpdateNodePositions(
    @Arg('input') input: BulkUpdatePositionsInput,
    @Ctx() { pool, userId }: Context
  ): Promise<BulkUpdateResult> {
    if (!userId) {
      throw new Error('Authentication required to update node positions');
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of input.updates) {
      try {
        await this.updateNodePosition(update, { pool, userId } as any);
        updatedCount++;
      } catch (error) {
        errors.push(`Failed to update node ${update.nodeId}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  @Mutation(() => Node)
  async updateNodePermissions(
    @Arg('input') input: UpdateNodePermissionsInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Node> {
    if (!userId) {
      throw new Error('Authentication required to update permissions');
    }

    try {
      // Get current node
      const nodeResult = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [
        input.nodeId,
      ]);

      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found');
      }

      const node = nodeResult.rows[0];

      // Check if user is the owner or has admin permissions
      // TODO: Implement proper permission checking
      if (node.created_by !== userId && node.author_id !== userId) {
        throw new Error('Only the node owner can update permissions');
      }

      // Build permissions array
      const permissions = input.permissions.map((p) => ({
        userId: p.userId,
        role: p.role,
        grantedBy: userId,
        grantedAt: new Date().toISOString(),
        expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      }));

      // Update node permissions
      const updateResult = await pool.query(
        'UPDATE public."Nodes" SET permissions = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(permissions), input.nodeId]
      );

      return this.serializeNode(updateResult.rows[0]);
    } catch (error) {
      console.error('Error updating node permissions:', error);
      throw new Error('Failed to update node permissions');
    }
  }

  @Mutation(() => Edge)
  async createEdgeWithDetails(
    @Arg('input') input: CreateEdgeWithDetailsInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Edge> {
    if (!userId) {
      throw new Error('Authentication required to create edges');
    }

    // Check if graph is Level 0 (read-only)
    const graphCheck = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [
      input.graphId,
    ]);
    if (graphCheck.rows[0]?.level === 0) {
      throw new Error('Cannot create edges in Level 0 (immutable) graphs');
    }

    try {
      // Get edge type ID by name, or create a default one
      let edgeTypeResult = await pool.query(
        'SELECT id FROM public."EdgeTypes" WHERE name = $1',
        [input.relationshipType]
      );

      let edgeTypeId: string;

      if (edgeTypeResult.rows.length === 0) {
        // Create new edge type if it doesn't exist
        const createEdgeType = await pool.query(
          'INSERT INTO public."EdgeTypes" (name) VALUES ($1) RETURNING id',
          [input.relationshipType]
        );
        edgeTypeId = createEdgeType.rows[0].id;
      } else {
        edgeTypeId = edgeTypeResult.rows[0].id;
      }

      // Build edge props
      const props = {
        description: input.description || '',
        relationshipType: input.relationshipType,
        ...(input.properties || {}),
      };

      // Create the edge
      const sql = `
        INSERT INTO public."Edges" (
          graph_id,
          edge_type_id,
          source_node_id,
          target_node_id,
          props,
          created_by,
          is_level_0,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.graphId,
        edgeTypeId,
        input.sourceNodeId,
        input.targetNodeId,
        JSON.stringify(props),
        userId,
      ]);

      const edge = result.rows[0];
      return {
        ...edge,
        props: typeof edge.props === 'object' ? JSON.stringify(edge.props) : edge.props,
        meta: typeof edge.meta === 'object' ? JSON.stringify(edge.meta) : edge.meta,
      };
    } catch (error) {
      console.error('Error creating edge with details:', error);
      throw new Error('Failed to create edge');
    }
  }

  @Mutation(() => Boolean)
  async deleteNode(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to delete nodes');
    }

    try {
      // Get node to check permissions
      const nodeResult = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [nodeId]);

      if (nodeResult.rows.length === 0) {
        throw new Error('Node not found');
      }

      const node = nodeResult.rows[0];

      // Check if node is Level 0 (immutable)
      if (node.is_level_0) {
        throw new Error('Cannot delete Level 0 (immutable) nodes');
      }

      // Check permissions (owner or admin)
      if (node.created_by !== userId && node.author_id !== userId) {
        throw new Error('Only the node owner can delete this node');
      }

      // Delete the node (cascading deletes will handle edges)
      await pool.query('DELETE FROM public."Nodes" WHERE id = $1', [nodeId]);

      return true;
    } catch (error) {
      console.error('Error deleting node:', error);
      throw new Error('Failed to delete node');
    }
  }
}
