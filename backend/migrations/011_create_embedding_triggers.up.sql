-- ============================================================================
-- Trigger: Update meta.diff_log on props changes (BEFORE UPDATE - SYNCHRONOUS)
-- ============================================================================
-- This trigger runs BEFORE the update, so it can modify NEW.meta before writing
-- Performance: Very fast, just JSONB manipulation, no external calls

DROP TRIGGER IF EXISTS trigger_update_node_meta ON nodes;

CREATE TRIGGER trigger_update_node_meta
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_node_meta_diff_log();

COMMENT ON TRIGGER trigger_update_node_meta ON nodes IS
    'Maintains audit log of property changes in meta.diff_log field';

-- ============================================================================
-- Trigger: Queue embedding jobs (AFTER INSERT/UPDATE - ASYNCHRONOUS)
-- ============================================================================
-- This trigger runs AFTER insert/update to queue the node for embedding
-- Performance: Fast INSERT into job queue + non-blocking NOTIFY
-- Only triggers on props changes, not on meta or ai changes

DROP TRIGGER IF EXISTS trigger_queue_embedding_job ON nodes;

CREATE TRIGGER trigger_queue_embedding_job
    AFTER INSERT OR UPDATE OF props ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION queue_embedding_job();

COMMENT ON TRIGGER trigger_queue_embedding_job ON nodes IS
    'Queues nodes for async embedding generation when props change';

-- ============================================================================
-- Grant permissions for triggers to work properly
-- ============================================================================
GRANT INSERT, UPDATE, SELECT ON sys.embedding_jobs TO sentient_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sys TO sentient_user;
