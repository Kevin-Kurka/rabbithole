import { Resolver, Query, Mutation, Arg, Ctx, PubSub, Subscription, Root, FieldResolver, Float, ObjectType, Field, ID, Int } from 'type-graphql';
import { NodeInput, EdgeInput, GraphInput } from './GraphInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { CacheService } from '../services/CacheService';
import { Redis } from 'ioredis';
import { Node, Edge, Graph, VeracityScore, Comment } from '../types/GraphTypes';

const NODE_UPDATED = "NODE_UPDATED";
const EDGE_UPDATED = "EDGE_UPDATED";

// ===========================================================================
// HELPERS
// ===========================================================================

function serializeNode(row: any, typeName?: string): Node {
  if (!row) return row;
  return {
    id: row.id,
    type: typeName || row.type_name || 'Unknown',
    props: typeof row.props === 'string' ? row.props : JSON.stringify(row.props || {}),
    meta: typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta || {}),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function serializeEdge(row: any, typeName?: string): Edge {
  if (!row) return row;
  return {
    id: row.id,
    type: typeName || row.type_name || 'Unknown',
    source_node_id: row.source_node_id,
    target_node_id: row.target_node_id,
    props: typeof row.props === 'string' ? row.props : JSON.stringify(row.props || {}),
    meta: typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta || {}),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// ===========================================================================
// RESOLVERS
// ===========================================================================

@Resolver(of => Node)
export class NodeResolver {
  @FieldResolver(() => [Edge])
  async edges(@Root() node: Node, @Ctx() { pool }: { pool: Pool }): Promise<Edge[]> {
    const result = await pool.query(
      `SELECT e.*, et.name as type_name 
       FROM public."Edges" e
       JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
       WHERE source_node_id = $1 OR target_node_id = $1`,
      [node.id]
    );
    return result.rows.map(r => serializeEdge(r, r.type_name));
  }

  @FieldResolver(() => [Comment])
  async comments(@Root() node: Node, @Ctx() { pool }: { pool: Pool }): Promise<Comment[]> {
    // Comments are nodes linked to this node
    const result = await pool.query(
      `SELECT n.*, n.props->>'content' as content, n.props->>'createdBy' as createdBy,
              u.id as author_id, u.username, u.email
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       JOIN public."Edges" e ON e.target_node_id = n.id
       LEFT JOIN public."Users" u ON (n.props->>'createdBy')::uuid = u.id
       WHERE nt.name = 'Comment' AND e.source_node_id = $1`,
      [node.id]
    );

    return result.rows.map(r => ({
      id: r.id,
      text: r.content,
      created_at: r.created_at,
      createdBy: r.createdBy,
      author: {
        id: r.author_id,
        username: r.username,
        email: r.email,
        created_at: r.created_at, // Approximate if not joined
        updated_at: r.created_at
      } as any,
      parentCommentId: null // TODO: Implement hierarchy if needed
    }));
  }

  @FieldResolver(() => VeracityScore, { nullable: true })
  async veracity(@Root() node: Node): Promise<VeracityScore | null> {
    const props = JSON.parse(node.props || '{}');
    if (props.veracityScore !== undefined) {
      return {
        id: node.id,
        veracity_score: props.veracityScore,
        confidence: props.confidence || 0.5,
        evidence_count: props.evidenceCount || 0
      };
    }
    return null;
  }
}

@Resolver(of => Edge)
export class EdgeResolver {
  @FieldResolver(() => Node)
  async from(@Root() edge: Edge, @Ctx() { pool }: { pool: Pool }): Promise<Node> {
    const result = await pool.query(
      `SELECT n.*, nt.name as type_name 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1`,
      [edge.source_node_id]
    );
    return serializeNode(result.rows[0], result.rows[0].type_name);
  }

  @FieldResolver(() => Node)
  async to(@Root() edge: Edge, @Ctx() { pool }: { pool: Pool }): Promise<Node> {
    const result = await pool.query(
      `SELECT n.*, nt.name as type_name 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1`,
      [edge.target_node_id]
    );
    return serializeNode(result.rows[0], result.rows[0].type_name);
  }
}

@Resolver(Graph)
export class GraphResolver {
  @FieldResolver(() => [Node])
  async nodes(@Root() graph: Graph, @Ctx() { pool }: { pool: Pool }): Promise<Node[]> {
    // Get all nodes associated with this graph (via props.graphId)
    const result = await pool.query(
      `SELECT n.*, nt.name as type_name 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.props->>'graphId' = $1`,
      [graph.id]
    );
    return result.rows.map(r => serializeNode(r, r.type_name));
  }

  @FieldResolver(() => [Edge])
  async edges(@Root() graph: Graph, @Ctx() { pool }: { pool: Pool }): Promise<Edge[]> {
    const result = await pool.query(
      `SELECT e.*, et.name as type_name 
       FROM public."Edges" e
       JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
       WHERE e.props->>'graphId' = $1`,
      [graph.id]
    );
    return result.rows.map(r => serializeEdge(r, r.type_name));
  }

  @Query(() => [Graph])
  async graphs(@Ctx() { pool }: { pool: Pool }): Promise<Graph[]> {
    // Query nodes of type 'Graph'
    const result = await pool.query(
      `SELECT n.*, n.props->>'name' as name, n.props->>'description' as description
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE nt.name = 'Graph'
       ORDER BY n.created_at DESC`
    );

    return result.rows.map(r => ({
      id: r.id,
      name: r.name || 'Untitled Graph',
      description: r.description,
      nodes: [],
      edges: [],
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  @Query(() => Graph, { nullable: true })
  async graph(@Arg("id") id: string, @Ctx() { pool }: { pool: Pool }): Promise<Graph | null> {
    const result = await pool.query(
      `SELECT n.*, n.props->>'name' as name, n.props->>'description' as description
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Graph'`,
      [id]
    );

    if (result.rows.length === 0) return null;
    const r = result.rows[0];

    return {
      id: r.id,
      name: r.name || 'Untitled Graph',
      description: r.description,
      nodes: [],
      edges: [],
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }

  @Mutation(() => Graph)
  async createGraph(
    @Arg("input") { name, description, privacy }: GraphInput,
    @Ctx() { pool, userId }: { pool: Pool; userId: string | null }
  ): Promise<Graph> {
    if (!userId) throw new Error('Authentication required');

    const typeResult = await pool.query('SELECT id FROM public."NodeTypes" WHERE name = $1', ['Graph']);
    if (typeResult.rows.length === 0) throw new Error('Graph node type not found');
    const typeId = typeResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props) 
       VALUES ($1, $2) RETURNING *`,
      [typeId, JSON.stringify({ name, description, privacy, createdBy: userId })]
    );

    const r = result.rows[0];
    return {
      id: r.id,
      name: name,
      description: description,
      nodes: [],
      edges: [],
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }
}
