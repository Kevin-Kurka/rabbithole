-- Graph Traversal SQL Templates
-- These queries are used by GraphTraversalService.ts
-- All queries use recursive CTEs for efficient graph traversal

-- ============================================================================
-- QUERY 1: Bidirectional Shortest Path (BFS)
-- ============================================================================
-- Finds shortest path between two nodes using bidirectional breadth-first search
-- Parameters: $1=sourceNodeId, $2=targetNodeId, $3=maxDepth, $4=minVeracity
-- Performance: O(b^(d/2)) where b=branching factor, d=depth
-- Index Requirements: PRIMARY KEY on Nodes(id), INDEX on Edges(source_node_id, target_node_id)

WITH RECURSIVE
forward_search AS (
  SELECT
    n.id,
    0 as depth,
    ARRAY[n.id] as path,
    ARRAY[]::uuid[] as edge_path,
    1.0 as accumulated_weight
  FROM public."Nodes" n
  WHERE n.id = $1

  UNION ALL

  SELECT
    n.id,
    fs.depth + 1,
    fs.path || n.id,
    fs.edge_path || e.id,
    fs.accumulated_weight * e.weight
  FROM forward_search fs
  JOIN public."Edges" e ON e.source_node_id = fs.id
  JOIN public."Nodes" n ON n.id = e.target_node_id
  WHERE fs.depth < $3
    AND NOT n.id = ANY(fs.path)
    AND e.weight >= $4
),
backward_search AS (
  SELECT
    n.id,
    0 as depth,
    ARRAY[n.id] as path,
    ARRAY[]::uuid[] as edge_path,
    1.0 as accumulated_weight
  FROM public."Nodes" n
  WHERE n.id = $2

  UNION ALL

  SELECT
    n.id,
    bs.depth + 1,
    bs.path || n.id,
    bs.edge_path || e.id,
    bs.accumulated_weight * e.weight
  FROM backward_search bs
  JOIN public."Edges" e ON e.target_node_id = bs.id
  JOIN public."Nodes" n ON n.id = e.source_node_id
  WHERE bs.depth < $3
    AND NOT n.id = ANY(bs.path)
    AND e.weight >= $4
),
meeting_point AS (
  SELECT
    fs.id as meeting_node_id,
    fs.path as forward_path,
    bs.path as backward_path,
    fs.edge_path as forward_edges,
    bs.edge_path as backward_edges,
    (fs.depth + bs.depth) as total_depth,
    (fs.accumulated_weight * bs.accumulated_weight) as total_weight
  FROM forward_search fs
  JOIN backward_search bs ON fs.id = bs.id
  ORDER BY total_depth ASC, total_weight DESC
  LIMIT 1
)
SELECT * FROM meeting_point;

-- ============================================================================
-- QUERY 2: Subgraph Expansion (BFS with Direction Control)
-- ============================================================================
-- Expands from a center node up to specified depth
-- Parameters: $1=nodeId, $2=depth, $3=minVeracity, $4=maxNodes
-- Direction controlled via WHERE clause variation (outgoing/incoming/both)
-- Performance: O(b^d) bounded by maxNodes limit

WITH RECURSIVE graph_traversal AS (
  -- Anchor node
  SELECT
    n.*,
    0 as depth,
    ARRAY[n.id] as path,
    1.0 as relevance_score
  FROM public."Nodes" n
  WHERE n.id = $1

  UNION ALL

  -- Recursive expansion (BOTH directions shown)
  SELECT
    n.*,
    gt.depth + 1,
    gt.path || n.id,
    gt.relevance_score * e.weight * 0.85  -- Decay factor
  FROM graph_traversal gt
  JOIN public."Edges" e ON (
    e.source_node_id = gt.id OR e.target_node_id = gt.id
  )
  JOIN public."Nodes" n ON (
    CASE
      WHEN e.source_node_id = gt.id THEN e.target_node_id
      ELSE e.source_node_id
    END = n.id
  )
  WHERE gt.depth < $2
    AND NOT n.id = ANY(gt.path)
    AND e.weight >= $3
),
unique_nodes AS (
  SELECT DISTINCT ON (id) *
  FROM graph_traversal
  ORDER BY id, relevance_score DESC, depth ASC
  LIMIT $4
),
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

-- ============================================================================
-- QUERY 3: Filtered Traversal by Edge Type
-- ============================================================================
-- Finds related nodes via specific edge type (e.g., SUPPORTS, CHALLENGES)
-- Parameters: $1=nodeId, $2=edgeTypeId, $3=depth, $4=minVeracity
-- Use Case: "Find all evidence supporting this claim"

WITH RECURSIVE related_traversal AS (
  -- Start node
  SELECT
    n.*,
    0 as depth,
    ARRAY[n.id] as node_path,
    ARRAY[]::uuid[] as edge_path,
    1.0 as path_weight
  FROM public."Nodes" n
  WHERE n.id = $1

  UNION ALL

  -- Follow edges of specified type only
  SELECT
    n.*,
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
    AND e.edge_type_id = $2  -- Filter by edge type
    AND NOT n.id = ANY(rt.node_path)
    AND e.weight >= $4
)
SELECT * FROM related_traversal
WHERE depth > 0
ORDER BY path_weight DESC, depth ASC;

-- ============================================================================
-- QUERY 4: Ancestor Chain (Provenance Tracking)
-- ============================================================================
-- Recursively follows primary_source_id to find origin
-- Parameters: $1=nodeId, $2=maxDepth
-- Use Case: Citation chains, data lineage

WITH RECURSIVE ancestor_chain AS (
  -- Start with the node itself
  SELECT
    n.*,
    0 as depth,
    ARRAY[n.id] as path
  FROM public."Nodes" n
  WHERE n.id = $1

  UNION ALL

  -- Follow primary_source_id backward
  SELECT
    n.*,
    ac.depth + 1,
    ac.path || n.id
  FROM ancestor_chain ac
  JOIN public."Nodes" n ON n.id = ac.primary_source_id
  WHERE ac.depth < $2
    AND NOT n.id = ANY(ac.path)
)
SELECT * FROM ancestor_chain
ORDER BY depth DESC;  -- Root first

-- ============================================================================
-- QUERY 5: Veracity-Weighted Direct Connections
-- ============================================================================
-- Finds high-quality direct neighbors ranked by combined score
-- Parameters: $1=nodeId, $2=limit, $3=minVeracity
-- Use Case: "What are the most reliable related claims?"

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

-- ============================================================================
-- INDEX RECOMMENDATIONS
-- ============================================================================

-- Core indexes (should already exist)
-- CREATE INDEX idx_edges_source ON public."Edges"(source_node_id) WHERE weight >= 0.5;
-- CREATE INDEX idx_edges_target ON public."Edges"(target_node_id) WHERE weight >= 0.5;
-- CREATE INDEX idx_edges_type ON public."Edges"(edge_type_id);
-- CREATE INDEX idx_nodes_primary_source ON public."Nodes"(primary_source_id) WHERE primary_source_id IS NOT NULL;

-- Composite indexes for traversal optimization
-- CREATE INDEX idx_edges_source_weight ON public."Edges"(source_node_id, weight DESC);
-- CREATE INDEX idx_edges_target_weight ON public."Edges"(target_node_id, weight DESC);

-- For graph traversal with edge type filtering
-- CREATE INDEX idx_edges_type_source_target ON public."Edges"(edge_type_id, source_node_id, target_node_id);

-- For veracity-weighted queries
-- CREATE INDEX idx_nodes_weight ON public."Nodes"(weight DESC) WHERE weight >= 0.7;
-- CREATE INDEX idx_edges_weight ON public."Edges"(weight DESC) WHERE weight >= 0.7;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- 1. Cycle Prevention: All queries use path arrays (NOT n.id = ANY(path))
--    This prevents infinite loops but adds memory overhead.
--    For very deep traversals, consider bloom filters instead.

-- 2. Depth Limits: Always enforce maxDepth to prevent runaway queries.
--    Recommended limits:
--    - Interactive queries: depth <= 3
--    - Background analysis: depth <= 6
--    - System queries: depth <= 10

-- 3. Veracity Thresholds: Higher thresholds dramatically reduce result sets.
--    - 0.5: General exploration
--    - 0.7: High-confidence paths
--    - 0.95: Near-certain Level 0 data

-- 4. Query Plan Caching: Use prepared statements to cache query plans.
--    PostgreSQL will optimize recursive CTE execution after first run.

-- 5. Monitoring: Track these metrics:
--    - Query execution time (target: <500ms for depth 3)
--    - Rows scanned vs returned
--    - Temp space usage for recursive CTEs
--    - Index hit ratios

-- 6. Optimization Tips:
--    - Add WHERE weight >= threshold to inner recursive term
--    - Use DISTINCT ON for deduplication instead of DISTINCT
--    - Materialize intermediate results for very large graphs (10M+ nodes)
--    - Consider partitioning Edges table by graph_id for multi-tenant scenarios
