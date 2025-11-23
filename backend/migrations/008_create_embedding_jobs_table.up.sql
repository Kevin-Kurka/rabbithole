-- Create embedding jobs queue table in sys schema
-- This table manages async embedding generation for nodes

CREATE TABLE sys.embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL,  -- Reference to nodes(id), no FK for performance
    props JSONB NOT NULL,   -- Snapshot of props at queue time
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_id TEXT,  -- Identifier of worker that processed this job
    processing_duration_ms INT,  -- Duration in milliseconds for monitoring

    CONSTRAINT chk_embedding_jobs_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Index for polling pending jobs (most important query)
CREATE INDEX idx_embedding_jobs_status ON sys.embedding_jobs(status)
WHERE status IN ('pending', 'processing');

-- Index for looking up jobs by node_id
CREATE INDEX idx_embedding_jobs_node_id ON sys.embedding_jobs(node_id);

-- Index for cleanup queries
CREATE INDEX idx_embedding_jobs_created_at ON sys.embedding_jobs(created_at);

-- Partial index for active jobs only (saves space)
CREATE INDEX idx_embedding_jobs_active ON sys.embedding_jobs(created_at, status)
WHERE status IN ('pending', 'processing');

-- Unique constraint to prevent duplicate pending/processing jobs for same node
CREATE UNIQUE INDEX idx_embedding_jobs_node_active
ON sys.embedding_jobs(node_id)
WHERE status IN ('pending', 'processing');

-- Comments
COMMENT ON TABLE sys.embedding_jobs IS 'Queue for asynchronous embedding generation jobs';
COMMENT ON COLUMN sys.embedding_jobs.props IS 'Snapshot of node props at time of queueing';
COMMENT ON COLUMN sys.embedding_jobs.status IS 'Job status: pending, processing, completed, failed';
COMMENT ON COLUMN sys.embedding_jobs.worker_id IS 'Identifier of worker that processed this job';
COMMENT ON COLUMN sys.embedding_jobs.processing_duration_ms IS 'Processing time in milliseconds for monitoring';

-- Function to cleanup old completed/failed jobs (run periodically)
CREATE OR REPLACE FUNCTION sys.cleanup_old_embedding_jobs(retention_days INT DEFAULT 30)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
    rows_deleted BIGINT;
BEGIN
    DELETE FROM sys.embedding_jobs
    WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RETURN QUERY SELECT rows_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sys.cleanup_old_embedding_jobs IS 'Cleanup old completed/failed jobs to prevent unbounded growth';
