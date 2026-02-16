-- ============================================================================
-- GraphRAG Query Templates for "Connect the Dots" AI Assistant
-- ============================================================================
-- This file contains optimized SQL query templates for the GraphRAG system
-- combining vector similarity search with recursive graph traversal.
-- Reference: PRD Section 4.2 - AI Assistant Architecture
-- ============================================================================

-- ============================================================================
-- 1. VECTOR SIMILARITY SEARCH
-- ============================================================================
-- Finds semantically similar nodes using pgvector's HNSW index
-- Returns top-K nodes based on cosine similarity to query embedding

-- Basic vector similarity search
-- Parameters:
--   $1: query_vector (vector) - 1536-dimensional embedding of user query
--   $2: limit (integer) - maximum number of results to return
--   $3: similarity_threshold (float) - minimum similarity score (0.0-1.0)
WITH vector_search AS (
  SELECT 
    n.id,
    n.node_type_id,
    n.props,
    n.meta,
    n.weight as veracity_score,
    -- Calculate cosine similarity (1 - cosine distance)
    1 - (n.ai <=> $1::vector) as similarity_score
  FROM "Nodes" n
  WHERE 
    -- Use KNN operator for efficient HNSW index scan
    n.ai <=> $1::vector < (1 - $3::float)
  ORDER BY 
    n.ai <=> $1::vector ASC
  LIMIT $2::integer
)
SELECT * FROM vector_search;

-- Filtered vector search (Level 0 only - verified facts)
-- Useful for grounding AI responses in verified information
WITH level0_vector_search AS (
  SELECT 
    n.id,
    n.node_type_id,
    n.props,
    n.meta,
    n.weight as veracity_score,
    1 - (n.ai <=> $1::vector) as similarity_score
  FROM "Nodes" n
  WHERE 
    n.weight = 1.0  -- Level 0 nodes only (veracity = 1.0)
    AND n.ai <=> $1::vector < (1 - $3::float)
  ORDER BY 
    n.ai <=> $1::vector ASC
  LIMIT $2::integer
)
SELECT * FROM level0_vector_search;

-- ============================================================================
-- 2. RECURSIVE GRAPH TRAVERSAL
-- ============================================================================
-- Explores graph structure starting from anchor nodes
-- Uses recursive CTEs to traverse relationships up to N degrees

-- Basic recursive traversal from anchor nodes
-- Parameters:
--   $1: anchor_node_ids (uuid[]) - starting nodes for traversal
--   $2: max_depth (integer) - maximum degrees of separation
--   $3: min_veracity (float) - minimum edge weight to traverse
WITH RECURSIVE graph_traversal AS (
  -- Base case: start with anchor nodes
  SELECT 
    n.id,
    n.node_type_id,
    n.props,
    n.meta,
    n.weight as veracity_score,
    0 as depth,
    ARRAY[n.id] as path,
    n.id as root_node_id,
    1.0 as path_score
  FROM "Nodes" n
  WHERE n.id = ANY($1::uuid[])
  
  UNION ALL
  
  -- Recursive case: explore neighbors
  SELECT 
    n.id,
    n.node_type_id,
    n.props,
    n.meta,
    n.weight as veracity_score,
    gt.depth + 1 as depth,
    gt.path || n.id as path,
    gt.root_node_id,
    -- Decay path score based on edge weight and depth
    gt.path_score * e.weight * 0.8 as path_score
  FROM graph_traversal gt
  -- Join on edges (bidirectional)
  JOIN "Edges" e ON (
    e.source_node_id = gt.id 
    OR e.target_node_id = gt.id
  )
  -- Join target nodes
  JOIN "Nodes" n ON n.id = CASE 
    WHEN e.source_node_id = gt.id THEN e.target_node_id
    ELSE e.source_node_id
  END
  WHERE 
    gt.depth < $2::integer  -- Max depth limit
    AND NOT n.id = ANY(gt.path)  -- Prevent cycles
    AND e.weight >= $3::float  -- Minimum edge veracity
    AND cardinality(gt.path) < 100  -- Prevent path explosion
)
SELECT DISTINCT ON (id)
  id,
  node_type_id,
  props,
  meta,
  veracity_score,
  depth,
  path,
  root_node_id,
  path_score
FROM graph_traversal
ORDER BY id, path_score DESC, depth ASC;

-- Traversal with edge details (includes relationship information)
-- Returns both nodes and the edges connecting them
WITH RECURSIVE graph_with_edges AS (
  -- Base case
  SELECT 
    n.id as node_id,
    NULL::uuid as edge_id,
    NULL::uuid as source_id,
    NULL::uuid as target_id,
    NULL::uuid as edge_type_id,
    0 as depth,
    ARRAY[n.id] as path,
    'node'::text as result_type
  FROM "Nodes" n
  WHERE n.id = ANY($1::uuid[])
  
  UNION ALL
  
  -- Recursive case with edge tracking
  SELECT 
    n.id as node_id,
    e.id as edge_id,
    e.source_node_id as source_id,
    e.target_node_id as target_id,
    e.edge_type_id,
    gwe.depth + 1 as depth,
    gwe.path || n.id as path,
    'node'::text as result_type
  FROM graph_with_edges gwe
  JOIN "Edges" e ON (
    e.source_node_id = gwe.node_id 
    OR e.target_node_id = gwe.node_id
  )
  JOIN "Nodes" n ON n.id = CASE 
    WHEN e.source_node_id = gwe.node_id THEN e.target_node_id
    ELSE e.source_node_id
  END
  WHERE 
    gwe.depth < $2::integer
    AND NOT n.id = ANY(gwe.path)
    AND e.weight >= $3::float
),
-- Collect unique edges
collected_edges AS (
  SELECT DISTINCT edge_id
  FROM graph_with_edges
  WHERE edge_id IS NOT NULL
)
-- Return both nodes and edges
SELECT 
  'node' as entity_type,
  n.id,
  n.node_type_id as type_id,
  n.props,
  n.meta,
  n.weight,
  NULL::uuid as source_node_id,
  NULL::uuid as target_node_id
FROM "Nodes" n
WHERE n.id IN (SELECT DISTINCT node_id FROM graph_with_edges)

UNION ALL

SELECT 
  'edge' as entity_type,
  e.id,
  e.edge_type_id as type_id,
  e.props,
  e.meta,
  e.weight,
  e.source_node_id,
  e.target_node_id
FROM "Edges" e
WHERE e.id IN (SELECT edge_id FROM collected_edges);

-- ============================================================================
-- 3. COMBINED GRAPHRAG QUERY
-- ============================================================================
-- Performs vector search and graph traversal in a single optimized query
-- This is the main query used by the AI assistant

-- Combined vector similarity + graph traversal
-- Parameters:
--   $1: query_vector (vector) - embedding of user query
--   $2: vector_limit (integer) - number of anchor nodes from vector search
--   $3: similarity_threshold (float) - minimum similarity for anchors
--   $4: max_depth (integer) - maximum traversal depth
--   $5: min_veracity (float) - minimum edge weight
--   $6: max_nodes (integer) - maximum total nodes to return
WITH vector_anchors AS (
  -- Step 1: Find semantically similar anchor nodes
  SELECT 
    n.id,
    n.node_type_id,
    n.props,
    n.meta,
    n.weight as veracity_score,
    1 - (n.ai <=> $1::vector) as similarity_score
  FROM "Nodes" n
  WHERE n.ai <=> $1::vector < (1 - $3::float)
  ORDER BY n.ai <=> $1::vector ASC
  LIMIT $2::integer
),
recursive_expansion AS (
  -- Step 2: Recursive graph traversal from anchors
  WITH RECURSIVE traversal AS (
    -- Start with vector search results
    SELECT 
      va.id,
      va.node_type_id,
      va.props,
      va.meta,
      va.veracity_score,
      va.similarity_score,
      0 as depth,
      ARRAY[va.id] as path,
      va.id as anchor_id,
      va.similarity_score as path_score,
      'anchor'::text as node_source
    FROM vector_anchors va
    
    UNION ALL
    
    -- Expand to neighbors
    SELECT 
      n.id,
      n.node_type_id,
      n.props,
      n.meta,
      n.weight as veracity_score,
      t.similarity_score * 0.8 as similarity_score,  -- Decay similarity
      t.depth + 1 as depth,
      t.path || n.id as path,
      t.anchor_id,
      t.path_score * e.weight * 0.8 as path_score,
      'traversal'::text as node_source
    FROM traversal t
    JOIN "Edges" e ON (
      (e.source_node_id = t.id OR e.target_node_id = t.id)
      AND e.weight >= $5::float
    )
    JOIN "Nodes" n ON n.id = CASE 
      WHEN e.source_node_id = t.id THEN e.target_node_id
      ELSE e.source_node_id
    END
    WHERE 
      t.depth < $4::integer
      AND NOT n.id = ANY(t.path)
      AND cardinality(t.path) < 50  -- Path length limit
  )
  SELECT * FROM traversal
),
-- Collect all relevant edges
relevant_edges AS (
  SELECT DISTINCT
    e.id as edge_id,
    e.edge_type_id,
    e.source_node_id,
    e.target_node_id,
    e.props as edge_props,
    e.meta as edge_meta,
    e.weight as edge_weight
  FROM recursive_expansion re1
  JOIN recursive_expansion re2 ON true
  JOIN "Edges" e ON (
    (e.source_node_id = re1.id AND e.target_node_id = re2.id)
    OR (e.source_node_id = re2.id AND e.target_node_id = re1.id)
  )
  WHERE e.weight >= $5::float
),
-- Combine and rank results
ranked_results AS (
  SELECT 
    id,
    node_type_id,
    props,
    meta,
    veracity_score,
    MAX(similarity_score) as max_similarity,
    MIN(depth) as min_depth,
    MAX(path_score) as max_path_score,
    STRING_AGG(DISTINCT node_source, ',') as sources,
    ARRAY_AGG(DISTINCT anchor_id) as anchor_ids
  FROM recursive_expansion
  GROUP BY id, node_type_id, props, meta, veracity_score
  ORDER BY 
    MAX(similarity_score) DESC,
    MIN(depth) ASC,
    veracity_score DESC
  LIMIT $6::integer
)
-- Final output with nodes and edges
SELECT 
  'node'::text as entity_type,
  r.id,
  r.node_type_id as type_id,
  nt.name as type_name,
  r.props,
  r.meta,
  r.veracity_score,
  r.max_similarity as relevance_score,
  r.min_depth as graph_distance,
  r.sources,
  NULL::uuid as source_node_id,
  NULL::uuid as target_node_id,
  NULL::jsonb as edge_props
FROM ranked_results r
JOIN "NodeTypes" nt ON nt.id = r.node_type_id

UNION ALL

SELECT 
  'edge'::text as entity_type,
  re.edge_id as id,
  re.edge_type_id as type_id,
  et.name as type_name,
  re.edge_props as props,
  re.edge_meta as meta,
  re.edge_weight as veracity_score,
  NULL::float as relevance_score,
  NULL::integer as graph_distance,
  'traversal'::text as sources,
  re.source_node_id,
  re.target_node_id,
  re.edge_props
FROM relevant_edges re
JOIN "EdgeTypes" et ON et.id = re.edge_type_id
WHERE EXISTS (
  SELECT 1 FROM ranked_results r1 WHERE r1.id = re.source_node_id
) AND EXISTS (
  SELECT 1 FROM ranked_results r2 WHERE r2.id = re.target_node_id
);

-- ============================================================================
-- 4. SPECIALIZED QUERIES
-- ============================================================================

-- Find paths between two nodes (useful for connection discovery)
-- Parameters:
--   $1: start_node_id (uuid)
--   $2: end_node_id (uuid)
--   $3: max_depth (integer)
--   $4: min_veracity (float)
WITH RECURSIVE path_finder AS (
  SELECT 
    n.id,
    0 as depth,
    ARRAY[n.id] as path,
    1.0 as path_score,
    FALSE as found
  FROM "Nodes" n
  WHERE n.id = $1::uuid
  
  UNION ALL
  
  SELECT 
    n.id,
    pf.depth + 1,
    pf.path || n.id,
    pf.path_score * e.weight,
    n.id = $2::uuid as found
  FROM path_finder pf
  JOIN "Edges" e ON (
    (e.source_node_id = pf.id OR e.target_node_id = pf.id)
    AND e.weight >= $4::float
  )
  JOIN "Nodes" n ON n.id = CASE 
    WHEN e.source_node_id = pf.id THEN e.target_node_id
    ELSE e.source_node_id
  END
  WHERE 
    pf.depth < $3::integer
    AND NOT pf.found
    AND NOT n.id = ANY(pf.path)
)
SELECT 
  path,
  depth,
  path_score
FROM path_finder
WHERE found = TRUE
ORDER BY path_score DESC, depth ASC
LIMIT 5;

-- ============================================================================
-- 5. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Analyze vector index efficiency
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE '%hnsw%'
ORDER BY idx_scan DESC;

-- Check query performance statistics
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%vector%' OR query LIKE '%RECURSIVE%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================================================
-- 6. MAINTENANCE QUERIES
-- ============================================================================

-- Vacuum and analyze tables with vector indexes
VACUUM ANALYZE "Nodes";
VACUUM ANALYZE "Edges";

-- Reindex HNSW indexes (run during maintenance windows)
REINDEX INDEX CONCURRENTLY idx_nodes_ai_hnsw;
REINDEX INDEX CONCURRENTLY idx_nodes_level0_ai_hnsw;

-- Update table statistics for query planner
ANALYZE "Nodes" (ai);
ANALYZE "Edges" (weight);

-- ============================================================================
-- Notes:
-- 1. All queries use parameterized inputs to prevent SQL injection
-- 2. Vector operations use pgvector's <=> operator for KNN search
-- 3. Recursive CTEs include cycle detection and depth limits
-- 4. Path scores decay with depth to prioritize closer connections
-- 5. Results combine relevance (vector similarity) with trust (veracity scores)
-- ============================================================================
