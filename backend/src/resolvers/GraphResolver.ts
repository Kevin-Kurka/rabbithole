import { Resolver, Query, Mutation, Arg, Ctx, PubSub, Subscription, Root, FieldResolver, Float } from 'type-graphql';
import { Graph } from '../entities/Graph';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';
import { Comment } from '../entities/Comment';
import { VeracityScore } from '../entities/VeracityScore';
import { NodeInput, EdgeInput, GraphInput } from './GraphInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { CacheService } from '../services/CacheService';
import { Redis } from 'ioredis';

const NODE_UPDATED = "NODE_UPDATED";
const EDGE_UPDATED = "EDGE_UPDATED";

// Helper function to serialize JSONB fields to strings for GraphQL
function serializeNode(node: any): any {
  if (!node) return node;
  return {
    ...node,
    props: typeof node.props === 'object' ? JSON.stringify(node.props) : node.props,
    meta: typeof node.meta === 'object' ? JSON.stringify(node.meta) : node.meta
  };
}

function serializeEdge(edge: any): any {
  if (!edge) return edge;
  return {
    ...edge,
    props: typeof edge.props === 'object' ? JSON.stringify(edge.props) : edge.props,
    meta: typeof edge.meta === 'object' ? JSON.stringify(edge.meta) : edge.meta
  };
}

@Resolver(of => Node)
export class NodeResolver {
  @FieldResolver(() => [Edge])
  async edges(@Root() node: Node, @Ctx() { pool }: { pool: Pool }): Promise<Edge[]> {
    // Get all edges where this node is either source or target
    const result = await pool.query(
      'SELECT * FROM public."Edges" WHERE source_node_id = $1 OR target_node_id = $1',
      [node.id]
    );
    return result.rows.map(serializeEdge);
  }

  @FieldResolver(() => [Comment])
  async comments(@Root() node: Node, @Ctx() { pool }: { pool: Pool }): Promise<Comment[]> {
    const result = await pool.query('SELECT * FROM public."Comments" WHERE target_node_id = $1', [node.id]);
    return result.rows;
  }

  @FieldResolver(() => VeracityScore, { nullable: true })
  async veracity(@Root() node: Node, @Ctx() { pool, redis }: { pool: Pool, redis: Redis }): Promise<VeracityScore | null> {
    // Level 0 nodes have fixed veracity = 1.0
    if (node.is_level_0) {
      return {
        id: node.id,
        target_node_id: node.id,
        target_edge_id: undefined,
        veracity_score: 1.0,
        evidence_weight_sum: 0,
        evidence_count: 0,
        supporting_evidence_weight: 0,
        refuting_evidence_weight: 0,
        consensus_score: 1.0,
        source_count: 0,
        source_agreement_ratio: 1.0,
        challenge_count: 0,
        open_challenge_count: 0,
        challenge_impact: 0,
        temporal_decay_factor: 1.0,
        calculation_method: 'level_0_fixed',
        calculated_at: new Date(),
        calculated_by: 'system',
        updated_at: new Date(),
      };
    }

    // Try cache first
    const cacheService = new CacheService(redis);
    const cached = await cacheService.getVeracityScore(node.id);
    if (cached) {
      return cached;
    }

    // Cache miss - query database
    const result = await pool.query(
      'SELECT * FROM public."VeracityScores" WHERE target_node_id = $1',
      [node.id]
    );
    const score = result.rows[0] || null;

    // Cache the result if found
    if (score) {
      await cacheService.cacheVeracityScore(node.id, score);
    }

    return score;
  }
}

@Resolver(of => Edge)
export class EdgeResolver {
  @FieldResolver(() => Node)
  async from(@Root() edge: any, @Ctx() { pool }: { pool: Pool }): Promise<Node> {
    const result = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [edge.source_node_id]);
    return serializeNode(result.rows[0]);
  }

  @FieldResolver(() => Node)
  async to(@Root() edge: any, @Ctx() { pool }: { pool: Pool }): Promise<Node> {
    const result = await pool.query('SELECT * FROM public."Nodes" WHERE id = $1', [edge.target_node_id]);
    return serializeNode(result.rows[0]);
  }

  @FieldResolver(() => [Comment])
  async comments(@Root() edge: Edge, @Ctx() { pool }: { pool: Pool }): Promise<Comment[]> {
    const result = await pool.query('SELECT * FROM public."Comments" WHERE target_edge_id = $1', [edge.id]);
    return result.rows;
  }

  @FieldResolver(() => VeracityScore, { nullable: true })
  async veracity(@Root() edge: Edge, @Ctx() { pool }: { pool: Pool }): Promise<VeracityScore | null> {
    // Level 0 edges have fixed veracity = 1.0
    if (edge.is_level_0) {
      return {
        id: edge.id,
        target_node_id: undefined,
        target_edge_id: edge.id,
        veracity_score: 1.0,
        evidence_weight_sum: 0,
        evidence_count: 0,
        supporting_evidence_weight: 0,
        refuting_evidence_weight: 0,
        consensus_score: 1.0,
        source_count: 0,
        source_agreement_ratio: 1.0,
        challenge_count: 0,
        open_challenge_count: 0,
        challenge_impact: 0,
        temporal_decay_factor: 1.0,
        calculation_method: 'level_0_fixed',
        calculated_at: new Date(),
        calculated_by: 'system',
        updated_at: new Date(),
      };
    }

    const result = await pool.query(
      'SELECT * FROM public."VeracityScores" WHERE target_edge_id = $1',
      [edge.id]
    );
    return result.rows[0] || null;
  }
}

@Resolver(Graph)
export class GraphResolver {
  @FieldResolver(() => [Node])
  async nodes(@Root() graph: Graph, @Ctx() { pool }: { pool: Pool }): Promise<Node[]> {
    const result = await pool.query(
      'SELECT * FROM public."Nodes" WHERE graph_id = $1',
      [graph.id]
    );
    return result.rows.map(serializeNode);
  }

  @FieldResolver(() => [Edge])
  async edges(@Root() graph: Graph, @Ctx() { pool }: { pool: Pool }): Promise<Edge[]> {
    const result = await pool.query(
      'SELECT * FROM public."Edges" WHERE graph_id = $1',
      [graph.id]
    );
    return result.rows.map(serializeEdge);
  }

  @Query(() => [Graph])
  async graphs(@Ctx() { pool, userId }: { pool: Pool, userId: string | null }): Promise<Graph[]> {
    let query: string;
    let params: any[] = [];

    if (userId) {
      // Authenticated users see all public graphs, Level 0 graphs, and their own private graphs
      // TODO: Also include graphs shared with the user
      query = 'SELECT id, name, description, level, methodology, privacy, created_at, updated_at FROM public."Graphs" WHERE level = 0 OR privacy = $1 ORDER BY created_at DESC';
      params = ['public'];
    } else {
      // Unauthenticated users only see Level 0 graphs and public graphs
      query = 'SELECT id, name, description, level, methodology, privacy, created_at, updated_at FROM public."Graphs" WHERE level = 0 OR privacy = $1 ORDER BY created_at DESC';
      params = ['public'];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  @Query(() => Graph, { nullable: true })
  async graph(@Arg("id") id: string, @Ctx() { pool, redis, userId }: { pool: Pool, redis: Redis, userId: string | null }): Promise<Graph | null> {
    // First check the graph's level and privacy settings
    const graphCheck = await pool.query('SELECT * FROM public."Graphs" WHERE id = $1', [id]);
    const graph = graphCheck.rows[0];
    if (!graph) {
      return null;
    }

    // Level 0 graphs are always publicly accessible
    if (graph.level === 0) {
      // Continue with normal processing
    }
    // Private graphs require authentication and ownership/sharing check
    else if (graph.privacy === 'private') {
      if (!userId) {
        throw new Error('Authentication required to view private graphs');
      }
      // TODO: Check if user owns or has access to the graph
      // For now, we'll allow authenticated users to access
    }
    // Public Level 1 graphs are accessible to everyone

    // Try cache for the complete graph data
    const cacheService = new CacheService(redis);
    const cached = await cacheService.getGraph(id);
    if (cached) {
      return cached;
    }
    const nodesResult = await pool.query('SELECT * FROM public."Nodes" WHERE graph_id = $1', [id]);
    const edgesResult = await pool.query('SELECT * FROM public."Edges" WHERE graph_id = $1', [id]);

    // Convert JSONB to strings for GraphQL
    graph.nodes = nodesResult.rows.map(serializeNode);
    graph.edges = edgesResult.rows.map(serializeEdge);

    // Cache the result
    await cacheService.cacheGraph(id, graph);

    return graph;
  }

  @Mutation(() => Node)
  async createNode(
    @Arg("input") { graphId, props }: NodeInput,
    @Ctx() { pool, pubSub, redis, userId }: { pool: Pool, pubSub: PubSubEngine, redis: Redis, userId: string | null }
  ): Promise<Node> {
    // Require authentication to create nodes
    if (!userId) {
      throw new Error('Authentication required to create nodes');
    }
    // Check if the graph is Level 0 (read-only)
    const graphCheck = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [graphId]);
    if (graphCheck.rows[0]?.level === 0) {
      throw new Error('Cannot create nodes in Level 0 (immutable) graphs');
    }

    // Get a default node type if not specified
    const nodeTypeResult = await pool.query('SELECT id FROM public."NodeTypes" LIMIT 1');
    const defaultNodeTypeId = nodeTypeResult.rows[0]?.id;

    // All user-created nodes in Level 1 graphs have is_level_0 = false
    const result = await pool.query(
      'INSERT INTO public."Nodes" (graph_id, node_type_id, props, is_level_0) VALUES ($1, $2, $3, $4) RETURNING *',
      [graphId, defaultNodeTypeId, props, false]
    );
    const newNode = serializeNode(result.rows[0]);
    await pubSub.publish(NODE_UPDATED, newNode);

    // Invalidate graph cache
    const cacheService = new CacheService(redis);
    await cacheService.invalidateGraph(graphId);

    return newNode;
  }

  @Mutation(() => Edge)
  async createEdge(
    @Arg("input") { graphId, from, to, props }: EdgeInput,
    @Ctx() { pool, pubSub, redis, userId }: { pool: Pool, pubSub: PubSubEngine, redis: Redis, userId: string | null }
  ): Promise<Edge> {
    // Require authentication to create edges
    if (!userId) {
      throw new Error('Authentication required to create edges');
    }
    // Check if the graph is Level 0 (read-only)
    const graphCheck = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [graphId]);
    if (graphCheck.rows[0]?.level === 0) {
      throw new Error('Cannot create edges in Level 0 (immutable) graphs');
    }

    // Get a default edge type if not specified
    const edgeTypeResult = await pool.query('SELECT id FROM public."EdgeTypes" LIMIT 1');
    const defaultEdgeTypeId = edgeTypeResult.rows[0]?.id;

    // All user-created edges in Level 1 graphs have is_level_0 = false
    const result = await pool.query(
      'INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, props, is_level_0) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [graphId, defaultEdgeTypeId, from, to, props, false]
    );
    const newEdge = serializeEdge(result.rows[0]);
    await pubSub.publish(EDGE_UPDATED, newEdge);

    // Invalidate graph cache
    const cacheService = new CacheService(redis);
    await cacheService.invalidateGraph(graphId);

    return newEdge;
  }

  @Mutation(() => Node)
  async updateNodeWeight(
    @Arg("id") id: string,
    @Arg("weight", () => Float) weight: number,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<Node> {
    // Require authentication to update nodes
    if (!userId) {
      throw new Error('Authentication required to update nodes');
    }
    // Check if the node is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Nodes" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot modify Level 0 (immutable) nodes');
    }

    const result = await pool.query(
      'UPDATE public."Nodes" SET weight = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [weight, id]
    );
    const updatedNode = serializeNode(result.rows[0]);
    await pubSub.publish(NODE_UPDATED, updatedNode);
    return updatedNode;
  }

  @Mutation(() => Edge)
  async updateEdgeWeight(
    @Arg("id") id: string,
    @Arg("weight", () => Float) weight: number,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<Edge> {
    // Require authentication to update edges
    if (!userId) {
      throw new Error('Authentication required to update edges');
    }
    // Check if the edge is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Edges" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot modify Level 0 (immutable) edges');
    }

    const result = await pool.query(
      'UPDATE public."Edges" SET weight = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [weight, id]
    );
    const updatedEdge = serializeEdge(result.rows[0]);
    await pubSub.publish(EDGE_UPDATED, updatedEdge);
    return updatedEdge;
  }

  @Mutation(() => Boolean)
  async deleteNode(
    @Arg("id") id: string,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<boolean> {
    // Require authentication to delete nodes
    if (!userId) {
      throw new Error('Authentication required to delete nodes');
    }
    // Check if the node is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Nodes" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot delete Level 0 (immutable) nodes');
    }

    await pool.query('DELETE FROM public."Nodes" WHERE id = $1', [id]);
    await pubSub.publish('NODE_DELETED', { nodeId: id });
    return true;
  }

  @Mutation(() => Boolean)
  async deleteEdge(
    @Arg("id") id: string,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<boolean> {
    // Require authentication to delete edges
    if (!userId) {
      throw new Error('Authentication required to delete edges');
    }
    // Check if the edge is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Edges" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot delete Level 0 (immutable) edges');
    }

    await pool.query('DELETE FROM public."Edges" WHERE id = $1', [id]);
    await pubSub.publish('EDGE_DELETED', { edgeId: id });
    return true;
  }

  @Mutation(() => Node)
  async updateNode(
    @Arg("id") id: string,
    @Arg("props") props: string,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<Node> {
    // Require authentication to update nodes
    if (!userId) {
      throw new Error('Authentication required to update nodes');
    }
    // Check if the node is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Nodes" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot modify Level 0 (immutable) nodes');
    }

    const result = await pool.query(
      'UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [props, id]
    );
    const updatedNode = serializeNode(result.rows[0]);
    await pubSub.publish(NODE_UPDATED, updatedNode);
    return updatedNode;
  }

  @Mutation(() => Edge)
  async updateEdge(
    @Arg("id") id: string,
    @Arg("props") props: string,
    @Ctx() { pool, pubSub, userId }: { pool: Pool, pubSub: PubSubEngine, userId: string | null }
  ): Promise<Edge> {
    // Require authentication to update edges
    if (!userId) {
      throw new Error('Authentication required to update edges');
    }
    // Check if the edge is Level 0 (read-only)
    const checkResult = await pool.query('SELECT is_level_0 FROM public."Edges" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.is_level_0) {
      throw new Error('Cannot modify Level 0 (immutable) edges');
    }

    const result = await pool.query(
      'UPDATE public."Edges" SET props = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [props, id]
    );
    const updatedEdge = serializeEdge(result.rows[0]);
    await pubSub.publish(EDGE_UPDATED, updatedEdge);
    return updatedEdge;
  }

  @Mutation(() => Graph)
  async createGraph(
    @Arg("input") { name, description, level, methodology, privacy }: GraphInput,
    @Ctx() { pool, userId }: { pool: Pool; userId: string | null }
  ): Promise<Graph> {
    // Require authentication to create graphs
    if (!userId) {
      throw new Error('Authentication required to create graphs');
    }
    const result = await pool.query(
      'INSERT INTO public."Graphs" (name, description, level, methodology, privacy) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description || null, level || 1, methodology || null, privacy || 'private']
    );
    const graph = result.rows[0];
    graph.nodes = [];
    graph.edges = [];
    return graph;
  }

  @Mutation(() => Graph)
  async updateGraph(
    @Arg("id") id: string,
    @Arg("input") { name, description, level, methodology, privacy }: GraphInput,
    @Ctx() { pool, userId }: { pool: Pool; userId: string | null }
  ): Promise<Graph> {
    // Require authentication to update graphs
    if (!userId) {
      throw new Error('Authentication required to update graphs');
    }
    // First check if the graph is Level 0 (read-only)
    const checkResult = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.level === 0) {
      throw new Error('Cannot modify Level 0 (immutable) graphs');
    }

    // Prevent changing graph level after creation (Level 0 graphs are immutable, Level 1 should not be downgraded)
    if (level !== undefined && level !== checkResult.rows[0]?.level) {
      throw new Error('Cannot change graph level after creation');
    }

    const result = await pool.query(
      'UPDATE public."Graphs" SET name = $1, description = $2, methodology = $3, privacy = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, description || null, methodology || null, privacy || 'private', id]
    );
    const graph = result.rows[0];
    const nodesResult = await pool.query('SELECT * FROM public."Nodes" WHERE graph_id = $1', [id]);
    const edgesResult = await pool.query('SELECT * FROM public."Edges" WHERE graph_id = $1', [id]);

    // Convert JSONB to strings for GraphQL
    graph.nodes = nodesResult.rows.map(serializeNode);
    graph.edges = edgesResult.rows.map(serializeEdge);
    return graph;
  }

  @Mutation(() => Boolean)
  async deleteGraph(
    @Arg("id") id: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string | null }
  ): Promise<boolean> {
    // Require authentication to delete graphs
    if (!userId) {
      throw new Error('Authentication required to delete graphs');
    }
    // Check if the graph is Level 0 (read-only)
    const checkResult = await pool.query('SELECT level FROM public."Graphs" WHERE id = $1', [id]);
    if (checkResult.rows[0]?.level === 0) {
      throw new Error('Cannot delete Level 0 (immutable) graphs');
    }

    await pool.query('DELETE FROM public."Graphs" WHERE id = $1', [id]);
    return true;
  }

  @Subscription(() => Node, {
    topics: NODE_UPDATED,
  })
  nodeUpdated(@Root() node: Node): Node {
    return node;
  }

  @Subscription(() => Edge, {
    topics: EDGE_UPDATED,
  })
  edgeUpdated(@Root() edge: Edge): Edge {
    return edge;
  }
}
