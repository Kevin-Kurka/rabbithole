-- Drop all embedding-related functions
DROP FUNCTION IF EXISTS queue_embedding_job CASCADE;
DROP FUNCTION IF EXISTS update_node_meta_diff_log CASCADE;
DROP FUNCTION IF EXISTS get_embedding_config CASCADE;
