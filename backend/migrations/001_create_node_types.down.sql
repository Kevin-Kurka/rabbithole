-- Drop NodeTypes table and related objects

DROP TRIGGER IF EXISTS update_node_types_updated_at ON node_types;
DROP INDEX IF EXISTS idx_node_types_props;
DROP INDEX IF EXISTS idx_node_types_parent;
DROP TABLE IF EXISTS node_types CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column;
