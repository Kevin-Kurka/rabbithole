-- Drop embedding-related triggers
DROP TRIGGER IF EXISTS trigger_queue_embedding_job ON nodes;
DROP TRIGGER IF EXISTS trigger_update_node_meta ON nodes;
