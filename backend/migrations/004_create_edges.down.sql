-- Drop Edges table and related objects

DROP TRIGGER IF EXISTS update_edges_updated_at ON edges;
DROP INDEX IF EXISTS idx_edges_created_at;
DROP INDEX IF EXISTS idx_edges_props;
DROP INDEX IF EXISTS idx_edges_target_type;
DROP INDEX IF EXISTS idx_edges_source_type;
DROP INDEX IF EXISTS idx_edges_edge_type;
DROP INDEX IF EXISTS idx_edges_target;
DROP INDEX IF EXISTS idx_edges_source;
DROP TABLE IF EXISTS edges CASCADE;
