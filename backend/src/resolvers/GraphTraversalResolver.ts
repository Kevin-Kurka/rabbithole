import { Resolver, Query, Arg, Ctx, Int, Float } from 'type-graphql';
import { Pool } from 'pg';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';
import { GraphTraversalService } from '../services/GraphTraversalService';
import { ObjectType, Field, ID } from 'type-graphql';

/**
 * GraphQL Types for Traversal Results
 */

@ObjectType()
export class PathResult {
  @Field(() => [Node])
  nodes!: Node[];

  @Field(() => [Edge])
  edges!: Edge[];

  @Field(() => Int)
  pathLength!: number;

  @Field(() => Float)
  totalWeight!: number;

  @Field()
  found!: boolean;
}

@ObjectType()
export class SubgraphResult {
  @Field(() => [Node])
  nodes!: Node[];

  @Field(() => [Edge])
  edges!: Edge[];

  @Field(() => Node, { nullable: true })
  centerNode!: Node | null;
}

@ObjectType()
export class TraversalPath {
  @Field(() => [ID])
  nodes!: string[];

  @Field(() => [ID])
  edges!: string[];

  @Field(() => Float)
  weight!: number;
}

@ObjectType()
export class RelatedNodesResult {
  @Field(() => [Node])
  nodes!: Node[];

  @Field(() => [Edge])
  edges!: Edge[];

  @Field(() => [TraversalPath])
  paths!: TraversalPath[];
}

@ObjectType()
export class AncestorChainItem {
  @Field(() => Node)
  node!: Node;

  @Field(() => Int)
  depth!: number;
}

@ObjectType()
export class AncestorChainResult {
  @Field(() => [Node])
  nodes!: Node[];

  @Field(() => [AncestorChainItem])
  chain!: AncestorChainItem[];
}

/**
 * GraphTraversalResolver
 *
 * Provides GraphQL queries for advanced graph traversal operations.
 * All operations use optimized PostgreSQL recursive CTEs for performance.
 *
 * Query complexity limits:
 * - findPath: max depth 10
 * - getSubgraph: max depth 5, max nodes 1000
 * - findRelatedNodes: max depth 5
 * - getNodeAncestors: max depth 20
 */
@Resolver()
export class GraphTraversalResolver {
  /**
   * Find shortest path between two nodes
   *
   * Use cases:
   * - "How are these two claims connected?"
   * - "What's the evidence chain from A to B?"
   * - "Find trust path between entities"
   *
   * Example:
   * ```graphql
   * query {
   *   findPath(
   *     sourceNodeId: "abc-123"
   *     targetNodeId: "def-456"
   *     maxDepth: 4
   *     minVeracity: 0.7
   *   ) {
   *     found
   *     pathLength
   *     totalWeight
   *     nodes { id props weight }
   *     edges { id props weight }
   *   }
   * }
   * ```
   */
  @Query(() => PathResult)
  async findPath(
    @Arg('sourceNodeId', () => ID) sourceNodeId: string,
    @Arg('targetNodeId', () => ID) targetNodeId: string,
    @Arg('maxDepth', () => Int, { defaultValue: 6, nullable: true }) maxDepth: number,
    @Arg('minVeracity', () => Float, { defaultValue: 0.5, nullable: true }) minVeracity: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<PathResult> {
    // Validate inputs
    if (maxDepth > 10) {
      throw new Error('Maximum depth for path finding is 10');
    }
    if (minVeracity < 0 || minVeracity > 1) {
      throw new Error('minVeracity must be between 0 and 1');
    }
    if (sourceNodeId === targetNodeId) {
      throw new Error('Source and target nodes must be different');
    }

    const service = new GraphTraversalService(pool);
    return await service.findPath(sourceNodeId, targetNodeId, maxDepth, minVeracity);
  }

  /**
   * Get subgraph expanding from a center node
   *
   * Use cases:
   * - "Show me all evidence related to this claim"
   * - "Expand this node's context"
   * - "What's connected to this entity?"
   *
   * Example:
   * ```graphql
   * query {
   *   getSubgraph(
   *     nodeId: "abc-123"
   *     depth: 2
   *     direction: BOTH
   *     minVeracity: 0.6
   *     maxNodes: 100
   *   ) {
   *     centerNode { id props }
   *     nodes { id props weight }
   *     edges { id props weight }
   *   }
   * }
   * ```
   */
  @Query(() => SubgraphResult)
  async getSubgraph(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('depth', () => Int, { defaultValue: 2, nullable: true }) depth: number,
    @Arg('direction', { defaultValue: 'both', nullable: true }) direction: string,
    @Arg('minVeracity', () => Float, { defaultValue: 0.5, nullable: true }) minVeracity: number,
    @Arg('maxNodes', () => Int, { defaultValue: 500, nullable: true }) maxNodes: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<SubgraphResult> {
    // Validate inputs
    if (depth > 5) {
      throw new Error('Maximum depth for subgraph expansion is 5');
    }
    if (maxNodes > 1000) {
      throw new Error('Maximum nodes for subgraph is 1000');
    }
    if (!['outgoing', 'incoming', 'both'].includes(direction)) {
      throw new Error('Direction must be one of: outgoing, incoming, both');
    }
    if (minVeracity < 0 || minVeracity > 1) {
      throw new Error('minVeracity must be between 0 and 1');
    }

    const service = new GraphTraversalService(pool);
    return await service.getSubgraph(
      nodeId,
      depth,
      direction as 'outgoing' | 'incoming' | 'both',
      minVeracity,
      maxNodes
    );
  }

  /**
   * Find nodes related via specific edge type
   *
   * Use cases:
   * - "Find all SUPPORTS edges from this claim"
   * - "What CHALLENGES this hypothesis?"
   * - "Show DERIVED_FROM lineage"
   *
   * Example:
   * ```graphql
   * query {
   *   findRelatedNodes(
   *     nodeId: "abc-123"
   *     edgeTypeId: "supports-edge-type-id"
   *     depth: 3
   *     minVeracity: 0.7
   *   ) {
   *     nodes { id props weight }
   *     edges { id props weight }
   *     paths {
   *       nodes
   *       edges
   *       weight
   *     }
   *   }
   * }
   * ```
   */
  @Query(() => RelatedNodesResult)
  async findRelatedNodes(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('edgeTypeId', () => ID) edgeTypeId: string,
    @Arg('depth', () => Int, { defaultValue: 3, nullable: true }) depth: number,
    @Arg('minVeracity', () => Float, { defaultValue: 0.5, nullable: true }) minVeracity: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<RelatedNodesResult> {
    // Validate inputs
    if (depth > 5) {
      throw new Error('Maximum depth for related nodes is 5');
    }
    if (minVeracity < 0 || minVeracity > 1) {
      throw new Error('minVeracity must be between 0 and 1');
    }

    const service = new GraphTraversalService(pool);
    return await service.findRelatedNodes(nodeId, edgeTypeId, depth, minVeracity);
  }

  /**
   * Get ancestor chain (provenance) for a node
   *
   * Use cases:
   * - "Where did this data originate?"
   * - "Show citation chain to Level 0"
   * - "Trace data lineage"
   *
   * Example:
   * ```graphql
   * query {
   *   getNodeAncestors(
   *     nodeId: "abc-123"
   *     maxDepth: 10
   *   ) {
   *     nodes { id props weight is_level_0 }
   *     chain {
   *       node { id props }
   *       depth
   *     }
   *   }
   * }
   * ```
   */
  @Query(() => AncestorChainResult)
  async getNodeAncestors(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('maxDepth', () => Int, { defaultValue: 10, nullable: true }) maxDepth: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<AncestorChainResult> {
    // Validate inputs
    if (maxDepth > 20) {
      throw new Error('Maximum depth for ancestor chain is 20');
    }

    const service = new GraphTraversalService(pool);
    return await service.getNodeAncestors(nodeId, maxDepth);
  }

  /**
   * Get high-veracity related nodes (direct connections only)
   *
   * Use cases:
   * - "What are the most reliable connections?"
   * - "Show trusted neighbors"
   * - "Find Level 0 connections"
   *
   * Example:
   * ```graphql
   * query {
   *   getHighVeracityRelatedNodes(
   *     nodeId: "abc-123"
   *     limit: 20
   *     minVeracity: 0.8
   *   ) {
   *     id
   *     props
   *     weight
   *   }
   * }
   * ```
   */
  @Query(() => [Node])
  async getHighVeracityRelatedNodes(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('limit', () => Int, { defaultValue: 20, nullable: true }) limit: number,
    @Arg('minVeracity', () => Float, { defaultValue: 0.7, nullable: true }) minVeracity: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Node[]> {
    // Validate inputs
    if (limit > 100) {
      throw new Error('Maximum limit is 100');
    }
    if (minVeracity < 0 || minVeracity > 1) {
      throw new Error('minVeracity must be between 0 and 1');
    }

    const service = new GraphTraversalService(pool);
    return await service.getHighVeracityRelatedNodes(nodeId, limit, minVeracity);
  }

  /**
   * Get graph statistics for a node
   *
   * Use case: Dashboard metrics, graph analysis
   *
   * Example:
   * ```graphql
   * query {
   *   getNodeStatistics(nodeId: "abc-123") {
   *     nodeId
   *     outgoingEdges
   *     incomingEdges
   *     totalDegree
   *     averageEdgeWeight
   *     connectedComponents
   *   }
   * }
   * ```
   */
  @Query(() => NodeStatistics)
  async getNodeStatistics(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<NodeStatistics> {
    const query = `
      WITH node_stats AS (
        SELECT
          $1::uuid as node_id,
          COUNT(CASE WHEN e.source_node_id = $1 THEN 1 END) as outgoing,
          COUNT(CASE WHEN e.target_node_id = $1 THEN 1 END) as incoming,
          AVG(e.weight) as avg_weight,
          COUNT(DISTINCT e.graph_id) as graph_count
        FROM public."Edges" e
        WHERE e.source_node_id = $1 OR e.target_node_id = $1
      )
      SELECT
        node_id,
        COALESCE(outgoing, 0) as outgoing_edges,
        COALESCE(incoming, 0) as incoming_edges,
        COALESCE(outgoing, 0) + COALESCE(incoming, 0) as total_degree,
        COALESCE(avg_weight, 0.0) as average_edge_weight,
        COALESCE(graph_count, 0) as connected_components
      FROM node_stats;
    `;

    const result = await pool.query(query, [nodeId]);

    if (result.rows.length === 0) {
      return {
        nodeId,
        outgoingEdges: 0,
        incomingEdges: 0,
        totalDegree: 0,
        averageEdgeWeight: 0,
        connectedComponents: 0
      };
    }

    const row = result.rows[0];
    return {
      nodeId: row.node_id,
      outgoingEdges: row.outgoing_edges,
      incomingEdges: row.incoming_edges,
      totalDegree: row.total_degree,
      averageEdgeWeight: row.average_edge_weight,
      connectedComponents: row.connected_components
    };
  }
}

@ObjectType()
export class NodeStatistics {
  @Field(() => ID)
  nodeId!: string;

  @Field(() => Int)
  outgoingEdges!: number;

  @Field(() => Int)
  incomingEdges!: number;

  @Field(() => Int)
  totalDegree!: number;

  @Field(() => Float)
  averageEdgeWeight!: number;

  @Field(() => Int)
  connectedComponents!: number;
}
