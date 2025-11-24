-- Down migration for 022_methodologies.up.sql
-- Drops Methodologies system objects and reverses schema changes

-- Drop triggers that reference methodology objects
DROP TRIGGER IF EXISTS trigger_update_methodology_usage ON public."Graphs";
DROP TRIGGER IF EXISTS trigger_validate_node_methodology ON public."Nodes";
DROP TRIGGER IF EXISTS trigger_validate_edge_methodology ON public."Edges";

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_methodology_usage() CASCADE;
DROP FUNCTION IF EXISTS validate_node_methodology_type() CASCADE;
DROP FUNCTION IF EXISTS validate_edge_methodology_type() CASCADE;

-- Remove methodology-related columns from core tables
ALTER TABLE IF EXISTS public."Edges" DROP COLUMN IF EXISTS methodology_edge_type_id;
ALTER TABLE IF EXISTS public."Nodes" DROP COLUMN IF EXISTS methodology_node_type_id;
ALTER TABLE IF EXISTS public."Graphs" DROP COLUMN IF EXISTS methodology_compliance_score;
ALTER TABLE IF EXISTS public."Graphs" DROP COLUMN IF EXISTS methodology_id;

-- Drop methodology-related tables (reverse order of creation)
DROP TABLE IF EXISTS public."MethodologyPermissions" CASCADE;
DROP TABLE IF EXISTS public."UserMethodologyProgress" CASCADE;
DROP TABLE IF EXISTS public."MethodologyTemplates" CASCADE;
DROP TABLE IF EXISTS public."MethodologyWorkflows" CASCADE;
DROP TABLE IF EXISTS public."MethodologyEdgeTypes" CASCADE;
DROP TABLE IF EXISTS public."MethodologyNodeTypes" CASCADE;
DROP TABLE IF EXISTS public."Methodologies" CASCADE;

-- Drop indexes if they remain
DROP INDEX IF EXISTS idx_methodologies_category;
DROP INDEX IF EXISTS idx_methodologies_status;
DROP INDEX IF EXISTS idx_methodologies_created_by;
DROP INDEX IF EXISTS idx_methodologies_is_system;
DROP INDEX IF EXISTS idx_methodologies_tags;

DROP INDEX IF EXISTS idx_methodology_node_types_methodology;
DROP INDEX IF EXISTS idx_methodology_edge_types_methodology;
DROP INDEX IF EXISTS idx_methodology_workflows_methodology;
DROP INDEX IF EXISTS idx_user_progress_user;
DROP INDEX IF EXISTS idx_user_progress_graph;
DROP INDEX IF EXISTS idx_user_progress_methodology;
DROP INDEX IF EXISTS idx_user_progress_status;
DROP INDEX IF EXISTS idx_methodology_permissions_methodology;
DROP INDEX IF EXISTS idx_methodology_permissions_user;
DROP INDEX IF EXISTS idx_graphs_methodology;
DROP INDEX IF EXISTS idx_nodes_methodology_type;
DROP INDEX IF EXISTS idx_edges_methodology_type;

-- Drop custom types
DROP TYPE IF EXISTS methodology_status;
DROP TYPE IF EXISTS methodology_category;
