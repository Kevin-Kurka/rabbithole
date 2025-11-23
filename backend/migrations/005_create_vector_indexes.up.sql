-- Create HNSW vector indexes for semantic search
-- Using HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search

-- HNSW index on node_types.ai for semantic node type search
CREATE INDEX idx_node_types_ai_hnsw ON node_types
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- HNSW index on edge_types.ai for semantic edge type search
CREATE INDEX idx_edge_types_ai_hnsw ON edge_types
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- HNSW index on nodes.ai for semantic node search (most important for RAG)
CREATE INDEX idx_nodes_ai_hnsw ON nodes
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index on edges.ai for semantic relationship search
CREATE INDEX idx_edges_ai_hnsw ON edges
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add comments
COMMENT ON INDEX idx_node_types_ai_hnsw IS 'HNSW index for fast vector similarity search on node types';
COMMENT ON INDEX idx_edge_types_ai_hnsw IS 'HNSW index for fast vector similarity search on edge types';
COMMENT ON INDEX idx_nodes_ai_hnsw IS 'HNSW index for fast vector similarity search on nodes (RAG)';
COMMENT ON INDEX idx_edges_ai_hnsw IS 'HNSW index for fast vector similarity search on edges';

-- Note on HNSW parameters:
-- m: Maximum number of connections per node (higher = better recall, more memory)
-- ef_construction: Size of dynamic candidate list during construction (higher = better index quality, slower build)
-- For nodes/edges we use smaller ef_construction (64) as they will have many more records
-- For types we use higher ef_construction (200) as they have fewer records
