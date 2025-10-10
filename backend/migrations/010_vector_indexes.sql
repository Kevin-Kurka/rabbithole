-- =================================================================
-- Migration 010: Vector Indexes (HNSW)
-- =================================================================
-- Description: Creates HNSW vector indexes on AI columns for semantic
--              search and similarity matching across core graph entities
-- Created: 2025-10-09
-- PRD Reference: Section 2.2 - AI Vector Search Functionality
-- =================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =================================================================
-- HNSW Vector Indexes
-- =================================================================
-- HNSW (Hierarchical Navigable Small World) provides efficient
-- approximate nearest neighbor search for high-dimensional vectors.
--
-- vector_cosine_ops: Uses cosine distance for similarity measurement
-- - Cosine distance = 1 - cosine similarity
-- - Optimal for normalized embeddings (e.g., OpenAI embeddings)
-- - Range: [0, 2] where 0 = identical, 2 = opposite direction
-- =================================================================

-- Nodes table: AI embeddings for semantic node search
-- Enables: Finding similar nodes by content/meaning across the graph
CREATE INDEX IF NOT EXISTS idx_nodes_ai_hnsw
  ON public."Nodes"
  USING hnsw (ai vector_cosine_ops);

COMMENT ON INDEX idx_nodes_ai_hnsw IS
  'HNSW index for fast cosine similarity search on node AI embeddings. Supports semantic search and content-based node matching.';

-- Edges table: AI embeddings for semantic edge/relationship search
-- Enables: Finding similar relationships by type and context
CREATE INDEX IF NOT EXISTS idx_edges_ai_hnsw
  ON public."Edges"
  USING hnsw (ai vector_cosine_ops);

COMMENT ON INDEX idx_edges_ai_hnsw IS
  'HNSW index for fast cosine similarity search on edge AI embeddings. Supports semantic relationship discovery.';

-- NodeTypes table: AI embeddings for node type classification
-- Enables: Type-based semantic search and auto-classification
CREATE INDEX IF NOT EXISTS idx_node_types_ai_hnsw
  ON public."NodeTypes"
  USING hnsw (ai vector_cosine_ops);

COMMENT ON INDEX idx_node_types_ai_hnsw IS
  'HNSW index for fast cosine similarity search on node type AI embeddings. Supports type classification and semantic type matching.';

-- EdgeTypes table: AI embeddings for edge type classification
-- Enables: Relationship type discovery and auto-classification
CREATE INDEX IF NOT EXISTS idx_edge_types_ai_hnsw
  ON public."EdgeTypes"
  USING hnsw (ai vector_cosine_ops);

COMMENT ON INDEX idx_edge_types_ai_hnsw IS
  'HNSW index for fast cosine similarity search on edge type AI embeddings. Supports relationship type discovery and classification.';

-- =================================================================
-- Performance Tuning (Optional)
-- =================================================================
-- HNSW index parameters can be tuned at creation time:
-- - m: Maximum number of connections per layer (default: 16)
--      Higher = better recall, larger index
-- - ef_construction: Size of dynamic candidate list (default: 64)
--      Higher = better index quality, slower build time
--
-- Example with custom parameters:
-- CREATE INDEX idx_nodes_ai_hnsw ON public."Nodes"
--   USING hnsw (ai vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
-- =================================================================

-- Analyze tables for query planner optimization
ANALYZE public."Nodes";
ANALYZE public."Edges";
ANALYZE public."NodeTypes";
ANALYZE public."EdgeTypes";

-- =================================================================
-- Usage Examples
-- =================================================================
-- Find 10 most similar nodes to a given embedding:
--   SELECT id, ai <=> '[0.1, 0.2, ..., 0.5]'::vector AS distance
--   FROM "Nodes"
--   ORDER BY ai <=> '[0.1, 0.2, ..., 0.5]'::vector
--   LIMIT 10;
--
-- Find nodes similar to a specific node:
--   SELECT n2.id, n2.ai <=> n1.ai AS distance
--   FROM "Nodes" n1
--   CROSS JOIN "Nodes" n2
--   WHERE n1.id = 'target-node-uuid'
--   AND n2.id != n1.id
--   ORDER BY n2.ai <=> n1.ai
--   LIMIT 10;
-- =================================================================

-- =================================================================
-- Rollback Section
-- =================================================================
-- To rollback this migration, run the following DROP statements:
--
-- DROP INDEX IF EXISTS public.idx_nodes_ai_hnsw;
-- DROP INDEX IF EXISTS public.idx_edges_ai_hnsw;
-- DROP INDEX IF EXISTS public.idx_node_types_ai_hnsw;
-- DROP INDEX IF EXISTS public.idx_edge_types_ai_hnsw;
-- =================================================================

-- =================================================================
-- Installation Notes
-- =================================================================
-- Run this migration with:
--   psql -U user -d rabbithole_db -f 010_vector_indexes.sql
--
-- Prerequisites:
--   - PostgreSQL 11+ with pgvector extension installed
--   - Sufficient memory for index building (depends on table size)
--   - All AI columns must contain valid vector(1536) data or NULL
--
-- Expected performance improvements:
--   - Semantic search: 100-1000x faster than sequential scan
--   - Typical query time: <10ms for k-NN queries on millions of rows
--   - Index build time: ~1-5 minutes per million rows
--
-- Monitoring index usage:
--   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
--   FROM pg_stat_user_indexes
--   WHERE indexname LIKE '%_ai_hnsw';
-- =================================================================
