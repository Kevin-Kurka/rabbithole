-- Drop EdgeTypes table and related objects

DROP TRIGGER IF EXISTS update_edge_types_updated_at ON edge_types;
DROP INDEX IF EXISTS idx_edge_types_props;
DROP INDEX IF EXISTS idx_edge_types_target;
DROP INDEX IF EXISTS idx_edge_types_source;
DROP TABLE IF EXISTS edge_types CASCADE;
