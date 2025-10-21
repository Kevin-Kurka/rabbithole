-- Migration: Add Graph Traversal Optimization Indexes
-- Date: 2025-10-10
-- Purpose: Optimize recursive CTE queries for graph traversal operations
-- Performance Impact: Significant improvement for depth > 2 queries

-- ============================================================================
-- Core Traversal Indexes
-- ============================================================================

-- Optimize forward traversal (following outgoing edges)
-- Used by: findPath, getSubgraph(direction=outgoing), findRelatedNodes
CREATE INDEX IF NOT EXISTS idx_edges_source_node
ON public."Edges"(source_node_id)
WHERE weight >= 0.5;

-- Optimize backward traversal (following incoming edges)
-- Used by: findPath, getSubgraph(direction=incoming), findRelatedNodes
CREATE INDEX IF NOT EXISTS idx_edges_target_node
ON public."Edges"(target_node_id)
WHERE weight >= 0.5;

-- ============================================================================
-- Veracity-Weighted Traversal Indexes
-- ============================================================================

-- Composite index for high-quality forward traversal
-- Allows index-only scans for veracity-sorted results
CREATE INDEX IF NOT EXISTS idx_edges_source_weight
ON public."Edges"(source_node_id, weight DESC)
WHERE weight >= 0.5;

-- Composite index for high-quality backward traversal
CREATE INDEX IF NOT EXISTS idx_edges_target_weight
ON public."Edges"(target_node_id, weight DESC)
WHERE weight >= 0.5;

-- ============================================================================
-- Edge Type Filtering Indexes
-- ============================================================================

-- Optimize filtered traversal by edge type
-- Used by: findRelatedNodes with edgeTypeId filter
CREATE INDEX IF NOT EXISTS idx_edges_type_source
ON public."Edges"(edge_type_id, source_node_id)
WHERE weight >= 0.5;

CREATE INDEX IF NOT EXISTS idx_edges_type_target
ON public."Edges"(edge_type_id, target_node_id)
WHERE weight >= 0.5;

-- Comprehensive index for type-filtered bidirectional traversal
CREATE INDEX IF NOT EXISTS idx_edges_type_nodes
ON public."Edges"(edge_type_id, source_node_id, target_node_id);

-- ============================================================================
-- Provenance/Ancestry Indexes
-- ============================================================================

-- Optimize ancestor chain queries
-- Used by: getNodeAncestors
CREATE INDEX IF NOT EXISTS idx_nodes_primary_source
ON public."Nodes"(primary_source_id)
WHERE primary_source_id IS NOT NULL;

-- Reverse lookup: find all nodes derived from a source
CREATE INDEX IF NOT EXISTS idx_nodes_derived_from
ON public."Nodes"(id)
WHERE primary_source_id IS NOT NULL;

-- ============================================================================
-- High-Veracity Query Indexes
-- ============================================================================

-- Optimize queries for Level 0 (verified) data
CREATE INDEX IF NOT EXISTS idx_nodes_level0_weight
ON public."Nodes"(weight DESC)
WHERE is_level_0 = true;

-- Optimize high-confidence node queries
CREATE INDEX IF NOT EXISTS idx_nodes_high_veracity
ON public."Nodes"(weight DESC)
WHERE weight >= 0.7;

-- Optimize high-confidence edge queries
CREATE INDEX IF NOT EXISTS idx_edges_high_veracity
ON public."Edges"(weight DESC)
WHERE weight >= 0.7;

-- ============================================================================
-- Graph Isolation Indexes
-- ============================================================================

-- Optimize per-graph queries (multi-tenant isolation)
CREATE INDEX IF NOT EXISTS idx_nodes_graph_id
ON public."Nodes"(graph_id);

CREATE INDEX IF NOT EXISTS idx_edges_graph_id
ON public."Edges"(graph_id);

-- Composite index for graph-scoped traversal
CREATE INDEX IF NOT EXISTS idx_edges_graph_source
ON public."Edges"(graph_id, source_node_id);

CREATE INDEX IF NOT EXISTS idx_edges_graph_target
ON public."Edges"(graph_id, target_node_id);

-- ============================================================================
-- Statistics and Monitoring Indexes
-- ============================================================================

-- Optimize node degree calculations
-- Used by: getNodeStatistics
CREATE INDEX IF NOT EXISTS idx_edges_node_degree
ON public."Edges"(source_node_id, target_node_id);

-- ============================================================================
-- Maintenance
-- ============================================================================

-- Update table statistics for query planner
ANALYZE public."Nodes";
ANALYZE public."Edges";

-- ============================================================================
-- Performance Validation Queries
-- ============================================================================

-- Run these queries to verify index usage:

-- Check index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('Nodes', 'Edges')
-- ORDER BY idx_scan DESC;

-- Check table scan vs index scan ratio:
-- SELECT schemaname, tablename, seq_scan, idx_scan,
--        seq_scan::float / NULLIF(seq_scan + idx_scan, 0) as seq_scan_ratio
-- FROM pg_stat_user_tables
-- WHERE tablename IN ('Nodes', 'Edges');

-- Verify index bloat:
-- SELECT schemaname, tablename, indexname,
--        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('Nodes', 'Edges')
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Expected Performance Improvements
-- ============================================================================

-- Before indexes (estimated):
-- - findPath(depth=3): ~800ms
-- - getSubgraph(depth=2): ~1200ms
-- - findRelatedNodes(depth=3): ~900ms

-- After indexes (estimated):
-- - findPath(depth=3): ~200ms (4x improvement)
-- - getSubgraph(depth=2): ~400ms (3x improvement)
-- - findRelatedNodes(depth=3): ~250ms (3.6x improvement)

-- ============================================================================
-- Index Maintenance Schedule
-- ============================================================================

-- Weekly: ANALYZE tables to update statistics
-- Monthly: REINDEX CONCURRENTLY to rebuild indexes
-- Quarterly: Review index usage and drop unused indexes

-- Example maintenance commands:
-- REINDEX INDEX CONCURRENTLY idx_edges_source_weight;
-- VACUUM ANALYZE public."Nodes";
-- VACUUM ANALYZE public."Edges";

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

-- To remove all indexes created by this migration:
/*
DROP INDEX IF EXISTS public.idx_edges_source_node;
DROP INDEX IF EXISTS public.idx_edges_target_node;
DROP INDEX IF EXISTS public.idx_edges_source_weight;
DROP INDEX IF EXISTS public.idx_edges_target_weight;
DROP INDEX IF EXISTS public.idx_edges_type_source;
DROP INDEX IF EXISTS public.idx_edges_type_target;
DROP INDEX IF EXISTS public.idx_edges_type_nodes;
DROP INDEX IF EXISTS public.idx_nodes_primary_source;
DROP INDEX IF EXISTS public.idx_nodes_derived_from;
DROP INDEX IF EXISTS public.idx_nodes_level0_weight;
DROP INDEX IF EXISTS public.idx_nodes_high_veracity;
DROP INDEX IF EXISTS public.idx_edges_high_veracity;
DROP INDEX IF EXISTS public.idx_nodes_graph_id;
DROP INDEX IF EXISTS public.idx_edges_graph_id;
DROP INDEX IF EXISTS public.idx_edges_graph_source;
DROP INDEX IF EXISTS public.idx_edges_graph_target;
DROP INDEX IF EXISTS public.idx_edges_node_degree;
*/
