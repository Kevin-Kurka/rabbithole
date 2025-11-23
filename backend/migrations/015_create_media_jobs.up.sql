-- ============================================================================
-- Migration: Create Media Jobs Table
-- Description: Track media processing jobs for documents, audio, and video
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."MediaJobs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result JSONB,
    error TEXT,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Validate progress percentage
    CONSTRAINT check_progress_range CHECK (progress >= 0 AND progress <= 100)
);

-- Indexes for efficient job queries
CREATE INDEX idx_media_jobs_status ON public."MediaJobs"(status);
CREATE INDEX idx_media_jobs_job_type ON public."MediaJobs"(job_type);
CREATE INDEX idx_media_jobs_created_at ON public."MediaJobs"(created_at DESC);
CREATE INDEX idx_media_jobs_completed_at ON public."MediaJobs"(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public."MediaJobs" IS 'Tracks asynchronous media processing jobs';
COMMENT ON COLUMN public."MediaJobs".job_type IS 'Type of processing: document, audio, video, image';
COMMENT ON COLUMN public."MediaJobs".status IS 'Job status: pending, processing, completed, failed';
COMMENT ON COLUMN public."MediaJobs".progress IS 'Percentage complete (0-100)';
COMMENT ON COLUMN public."MediaJobs".result IS 'Processing results (extracted text, metadata, etc.)';
