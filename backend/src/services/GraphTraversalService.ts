import { Pool } from 'pg';
import { Node } from '../entities/Node';
import { Edge } from '../entities/Edge';

/**
 * GraphTraversalService
 *
 * Provides optimized graph traversal operations using PostgreSQL recursive CTEs.
 * All queries leverage indexes and prevent infinite cycles through path tracking.
 *
 * Performance Considerations:
 * - Max depth limits prevent runaway queries
 * - Veracity thresholds filter low-quality paths
 * - Path arrays ensure cycle detection
 * - Prepared statement patterns for query plan caching
 */
export class GraphTraversalService {
  constructor(private pool: Pool) {}

  /**
   * Find shortest path between two nodes using bidirectional BFS
   *
   * @param sourceNodeId - Starting node UUID
   * @param targetNodeId - Destination node UUID
   * @param maxDepth - Maximum path length (default: 6)
   * @param minVeracity - Minimum edge weight threshold (default: 0.5)
   * @returns Object containing path nodes, edges, and total weight
   *
   * Algorithm: Bidirectional breadth-first search from both source and target
   * Performance: O(b^(d/2)) where b=branching factor, d=depth
   */
  async findPath(
    sourceNodeId: string,
    targetNodeId: string,
    maxDepth: number = 6,
    minVeracity: number = 0.5
  ): Promise<{
    nodes: Node[];
    edges: Edge[];
    pathLength: number;
    totalWeight: number;
    found: boolean;
  }> {
    const query = `
      WITH RECURSIVE
      -- Forward search from source
      forward_search AS (
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          0 as depth,
          ARRAY[n.id] as path,
          NULL::uuid as edge_id,
          ARRAY[]::uuid[] as edge_path,
          1.0 as accumulated_weight
        FROM public."Nodes" n
        WHERE n.id = $1

        UNION ALL

        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          fs.depth + 1,
          fs.path || n.id,
          e.id,
          fs.edge_path || e.id,
          fs.accumulated_weight * e.weight
        FROM forward_search fs
        JOIN public."Edges" e ON e.source_node_id = fs.id
        JOIN public."Nodes" n ON n.id = e.target_node_id
        WHERE fs.depth < $3
          AND NOT n.id = ANY(fs.path)  -- Prevent cycles
          AND e.weight >= $4  -- Veracity threshold
          AND n.id != $2  -- Don't include target yet
      ),
      -- Backward search from target
      backward_search AS (
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          0 as depth,
          ARRAY[n.id] as path,
          NULL::uuid as edge_id,
          ARRAY[]::uuid[] as edge_path,
          1.0 as accumulated_weight
        FROM public."Nodes" n
        WHERE n.id = $2

        UNION ALL

        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          bs.depth + 1,
          bs.path || n.id,
          e.id,
          bs.edge_path || e.id,
          bs.accumulated_weight * e.weight
        FROM backward_search bs
        JOIN public."Edges" e ON e.target_node_id = bs.id
        JOIN public."Nodes" n ON n.id = e.source_node_id
        WHERE bs.depth < $3
          AND NOT n.id = ANY(bs.path)
          AND e.weight >= $4
          AND n.id != $1
      ),
      -- Find intersection point
      meeting_point AS (
        SELECT
          fs.id as meeting_node_id,
          fs.path as forward_path,
          fs.edge_path as forward_edges,
          bs.path as backward_path,
          bs.edge_path as backward_edges,
          (fs.depth + bs.depth) as total_depth,
          (fs.accumulated_weight * bs.accumulated_weight) as total_weight
        FROM forward_search fs
        JOIN backward_search bs ON fs.id = bs.id
        ORDER BY total_depth ASC, total_weight DESC
        LIMIT 1
      )
      SELECT
        mp.meeting_node_id,
        mp.forward_path,
        mp.backward_path,
        mp.forward_edges,
        mp.backward_edges,
        mp.total_depth,
        mp.total_weight
      FROM meeting_point mp;
    `;

    const result = await this.pool.query(query, [
      sourceNodeId,
      targetNodeId,
      maxDepth,
      minVeracity
    ]);

    if (result.rows.length === 0) {
      return {
        nodes: [],
        edges: [],
        pathLength: 0,
        totalWeight: 0,
        found: false
      };
    }

    const row = result.rows[0];

    // Reconstruct full path by combining forward and backward paths
    const forwardPath: string[] = row.forward_path;
    const backwardPath: string[] = row.backward_path.slice(1).reverse(); // Remove meeting point duplicate
    const fullPath = [...forwardPath, ...backwardPath];

    const forwardEdges: string[] = row.forward_edges || [];
    const backwardEdges: string[] = (row.backward_edges || []).reverse();
    const fullEdgePath = [...forwardEdges, ...backwardEdges];

    // Fetch full node and edge data
    const nodes = await this.fetchNodesByIds(fullPath);
    const edges = await this.fetchEdgesByIds(fullEdgePath);

    return {
      nodes,
      edges,
      pathLength: row.total_depth,
      totalWeight: row.total_weight,
      found: true
    };
  }

  /**
   * Get subgraph expanding from a node up to specified depth
   *
   * @param nodeId - Center node UUID
   * @param depth - Expansion depth (default: 2)
   * @param direction - 'outgoing', 'incoming', or 'both' (default: 'both')
   * @param minVeracity - Minimum edge weight (default: 0.5)
   * @param maxNodes - Maximum nodes to return (default: 500)
   * @returns Subgraph with nodes and edges
   *
   * Use cases: Evidence chains, context expansion, neighborhood analysis
   */
  async getSubgraph(
    nodeId: string,
    depth: number = 2,
    direction: 'outgoing' | 'incoming' | 'both' = 'both',
    minVeracity: number = 0.5,
    maxNodes: number = 500
  ): Promise<{
    nodes: Node[];
    edges: Edge[];
    centerNode: Node | null;
  }> {
    let traversalCondition = '';

    if (direction === 'outgoing') {
      traversalCondition = 'e.source_node_id = gt.id AND n.id = e.target_node_id';
    } else if (direction === 'incoming') {
      traversalCondition = 'e.target_node_id = gt.id AND n.id = e.source_node_id';
    } else {
      traversalCondition = `(
        (e.source_node_id = gt.id AND n.id = e.target_node_id) OR
        (e.target_node_id = gt.id AND n.id = e.source_node_id)
      )`;
    }

    const query = `
      WITH RECURSIVE graph_traversal AS (
        -- Anchor node
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          0 as depth,
          ARRAY[n.id] as path,
          NULL::uuid as via_edge_id,
          1.0 as relevance_score
        FROM public."Nodes" n
        WHERE n.id = $1

        UNION ALL

        -- Recursive expansion
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          gt.depth + 1,
          gt.path || n.id,
          e.id,
          gt.relevance_score * e.weight * 0.85  -- Decay factor for relevance
        FROM graph_traversal gt
        JOIN public."Edges" e ON ${traversalCondition}
        JOIN public."Nodes" n
        WHERE gt.depth < $2
          AND NOT n.id = ANY(gt.path)
          AND e.weight >= $3
      ),
      -- Collect unique nodes with best relevance score
      unique_nodes AS (
        SELECT DISTINCT ON (id)
          id, graph_id, node_type_id, props, meta, weight,
          is_level_0, created_by, created_at, updated_at,
          depth, relevance_score
        FROM graph_traversal
        ORDER BY id, relevance_score DESC, depth ASC
        LIMIT $4
      ),
      -- Collect edges between nodes in subgraph
      subgraph_edges AS (
        SELECT DISTINCT e.*
        FROM public."Edges" e
        WHERE e.source_node_id IN (SELECT id FROM unique_nodes)
          AND e.target_node_id IN (SELECT id FROM unique_nodes)
          AND e.weight >= $3
      )
      SELECT
        json_build_object(
          'nodes', (SELECT json_agg(row_to_json(un.*)) FROM unique_nodes un),
          'edges', (SELECT json_agg(row_to_json(se.*)) FROM subgraph_edges se)
        ) as subgraph;
    `;

    const result = await this.pool.query(query, [
      nodeId,
      depth,
      minVeracity,
      maxNodes
    ]);

    if (result.rows.length === 0 || !result.rows[0].subgraph) {
      return { nodes: [], edges: [], centerNode: null };
    }

    const subgraph = result.rows[0].subgraph;
    const nodes = this.mapToNodes(subgraph.nodes || []);
    const edges = this.mapToEdges(subgraph.edges || []);
    const centerNode = nodes.find(n => n.id === nodeId) || null;

    return { nodes, edges, centerNode };
  }

  /**
   * Find related nodes filtered by edge type
   *
   * @param nodeId - Starting node UUID
   * @param edgeTypeId - Edge type UUID to filter by
   * @param depth - Traversal depth (default: 3)
   * @param minVeracity - Minimum edge weight (default: 0.5)
   * @returns Related nodes connected via specified edge type
   *
   * Example: Find all "SUPPORTS" evidence for a claim
   */
  async findRelatedNodes(
    nodeId: string,
    edgeTypeId: string,
    depth: number = 3,
    minVeracity: number = 0.5
  ): Promise<{
    nodes: Node[];
    edges: Edge[];
    paths: Array<{ nodes: string[]; edges: string[]; weight: number }>;
  }> {
    const query = `
      WITH RECURSIVE related_traversal AS (
        -- Start node
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          0 as depth,
          ARRAY[n.id] as node_path,
          ARRAY[]::uuid[] as edge_path,
          1.0 as path_weight
        FROM public."Nodes" n
        WHERE n.id = $1

        UNION ALL

        -- Follow edges of specified type
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          rt.depth + 1,
          rt.node_path || n.id,
          rt.edge_path || e.id,
          rt.path_weight * e.weight
        FROM related_traversal rt
        JOIN public."Edges" e ON (
          e.source_node_id = rt.id OR e.target_node_id = rt.id
        )
        JOIN public."Nodes" n ON (
          CASE
            WHEN e.source_node_id = rt.id THEN e.target_node_id
            ELSE e.source_node_id
          END = n.id
        )
        WHERE rt.depth < $3
          AND e.edge_type_id = $2
          AND NOT n.id = ANY(rt.node_path)
          AND e.weight >= $4
      )
      SELECT
        json_build_object(
          'nodes', (
            SELECT json_agg(DISTINCT row_to_json(rt.*))
            FROM related_traversal rt
          ),
          'paths', (
            SELECT json_agg(
              json_build_object(
                'node_path', node_path,
                'edge_path', edge_path,
                'path_weight', path_weight,
                'depth', depth
              )
            )
            FROM related_traversal
            WHERE depth > 0
            ORDER BY path_weight DESC, depth ASC
          )
        ) as result;
    `;

    const result = await this.pool.query(query, [
      nodeId,
      edgeTypeId,
      depth,
      minVeracity
    ]);

    if (result.rows.length === 0 || !result.rows[0].result) {
      return { nodes: [], edges: [], paths: [] };
    }

    const data = result.rows[0].result;
    const nodes = this.mapToNodes(data.nodes || []);

    // Fetch edges
    const allEdgeIds = new Set<string>();
    (data.paths || []).forEach((path: any) => {
      (path.edge_path || []).forEach((eid: string) => allEdgeIds.add(eid));
    });
    const edges = await this.fetchEdgesByIds(Array.from(allEdgeIds));

    const paths = (data.paths || []).map((p: any) => ({
      nodes: p.node_path,
      edges: p.edge_path,
      weight: p.path_weight
    }));

    return { nodes, edges, paths };
  }

  /**
   * Get recursive parent chain (ancestors) for a node
   *
   * @param nodeId - Child node UUID
   * @param maxDepth - Maximum ancestor levels (default: 10)
   * @returns Ancestor chain from root to node
   *
   * Use case: Provenance tracking, citation chains
   */
  async getNodeAncestors(
    nodeId: string,
    maxDepth: number = 10
  ): Promise<{
    nodes: Node[];
    chain: Array<{ node: Node; depth: number }>;
  }> {
    const query = `
      WITH RECURSIVE ancestor_chain AS (
        -- Start with the node itself
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          n.primary_source_id,
          0 as depth,
          ARRAY[n.id] as path
        FROM public."Nodes" n
        WHERE n.id = $1

        UNION ALL

        -- Recursively find parent via primary_source_id
        SELECT
          n.id,
          n.graph_id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          n.is_level_0,
          n.created_by,
          n.created_at,
          n.updated_at,
          n.primary_source_id,
          ac.depth + 1,
          ac.path || n.id
        FROM ancestor_chain ac
        JOIN public."Nodes" n ON n.id = ac.primary_source_id
        WHERE ac.depth < $2
          AND NOT n.id = ANY(ac.path)  -- Prevent cycles
      )
      SELECT
        id, graph_id, node_type_id, props, meta, weight,
        is_level_0, created_by, created_at, updated_at, depth
      FROM ancestor_chain
      ORDER BY depth DESC;  -- Root first
    `;

    const result = await this.pool.query(query, [nodeId, maxDepth]);

    const nodes = this.mapToNodes(result.rows);
    const chain = result.rows.map((row: any) => ({
      node: this.mapToNode(row),
      depth: row.depth
    }));

    return { nodes, chain };
  }

  /**
   * Get nodes by veracity-weighted relevance
   * Combines vector similarity (if available) with graph structure
   *
   * @param nodeId - Reference node
   * @param limit - Max results (default: 20)
   * @param minVeracity - Minimum weight threshold (default: 0.7)
   * @returns Ranked related nodes
   */
  async getHighVeracityRelatedNodes(
    nodeId: string,
    limit: number = 20,
    minVeracity: number = 0.7
  ): Promise<Node[]> {
    const query = `
      WITH direct_connections AS (
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id = $1 THEN e.target_node_id
            ELSE e.source_node_id
          END as related_node_id,
          e.weight as edge_weight
        FROM public."Edges" e
        WHERE (e.source_node_id = $1 OR e.target_node_id = $1)
          AND e.weight >= $3
      )
      SELECT
        n.*,
        dc.edge_weight,
        (n.weight * dc.edge_weight) as combined_score
      FROM direct_connections dc
      JOIN public."Nodes" n ON n.id = dc.related_node_id
      WHERE n.weight >= $3
      ORDER BY combined_score DESC, n.weight DESC
      LIMIT $2;
    `;

    const result = await this.pool.query(query, [nodeId, limit, minVeracity]);
    return this.mapToNodes(result.rows);
  }

  // Helper methods for data transformation

  private async fetchNodesByIds(ids: string[]): Promise<Node[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT id, graph_id, node_type_id, props, meta, weight,
             is_level_0, created_by, created_at, updated_at
      FROM public."Nodes"
      WHERE id = ANY($1);
    `;

    const result = await this.pool.query(query, [ids]);
    return this.mapToNodes(result.rows);
  }

  private async fetchEdgesByIds(ids: string[]): Promise<Edge[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT id, graph_id, edge_type_id, source_node_id, target_node_id,
             props, meta, weight, is_level_0, created_by, created_at, updated_at
      FROM public."Edges"
      WHERE id = ANY($1);
    `;

    const result = await this.pool.query(query, [ids]);
    return this.mapToEdges(result.rows);
  }

  private mapToNodes(rows: any[]): Node[] {
    return rows.map(row => this.mapToNode(row));
  }

  private mapToNode(row: any): Node {
    return {
      id: row.id,
      title: row.title || '',
      weight: row.weight,
      props: typeof row.props === 'string' ? row.props : JSON.stringify(row.props || {}),
      meta: typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta || {}),
      is_level_0: row.is_level_0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      edges: [],
      comments: []
    };
  }

  private mapToEdges(rows: any[]): Edge[] {
    return rows.map(row => ({
      id: row.id,
      from: { id: row.source_node_id } as Node,
      to: { id: row.target_node_id } as Node,
      weight: row.weight,
      props: typeof row.props === 'string' ? row.props : JSON.stringify(row.props || {}),
      meta: typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta || {}),
      is_level_0: row.is_level_0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      comments: []
    }));
  }
}
