-- Drop Nodes table and related objects

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
DROP INDEX IF EXISTS idx_nodes_created_at;
DROP INDEX IF EXISTS idx_nodes_props;
DROP INDEX IF EXISTS idx_nodes_node_type;
DROP TABLE IF EXISTS nodes CASCADE;
