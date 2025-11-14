-- ============================================================================
-- Migration 019: Video Processing System
-- ============================================================================
-- Description: Adds comprehensive video processing capabilities including:
--              - Video metadata storage (duration, resolution, codec, fps)
--              - Frame extraction and storage
--              - Scene detection and segmentation
--              - OCR text extraction from video frames
--              - Full-text search on extracted OCR text
--
-- Author: Video Processing Team
-- Date: 2025-11-13
-- Dependencies:
--   - Requires EvidenceFiles table
--   - Requires pgvector extension (for future embeddings)
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: VideoMetadata
-- ============================================================================
-- Stores comprehensive metadata about video files

CREATE TABLE IF NOT EXISTS public."VideoMetadata" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL UNIQUE REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Video properties
    duration_seconds DECIMAL(12,3) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    fps DECIMAL(8,2) NOT NULL,
    codec VARCHAR(50) NOT NULL,
    bitrate BIGINT, -- bits per second
    file_format VARCHAR(50) NOT NULL,

    -- Processing metadata
    total_frames INTEGER DEFAULT 0,
    extracted_frames INTEGER DEFAULT 0,
    scene_count INTEGER DEFAULT 0,
    ocr_text_length INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for VideoMetadata
CREATE INDEX idx_video_metadata_file ON public."VideoMetadata" (file_id);
CREATE INDEX idx_video_metadata_duration ON public."VideoMetadata" (duration_seconds);
CREATE INDEX idx_video_metadata_resolution ON public."VideoMetadata" (width, height);

-- ============================================================================
-- TABLE: VideoFrames
-- ============================================================================
-- Stores extracted video frames with OCR text and metadata

CREATE TABLE IF NOT EXISTS public."VideoFrames" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Frame identification
    frame_number INTEGER NOT NULL,
    timestamp_seconds DECIMAL(12,3) NOT NULL,
    frame_type VARCHAR(20) NOT NULL, -- 'thumbnail', 'scene_change', 'ocr_extracted', 'key_frame'

    -- Frame storage
    storage_key VARCHAR(500) NOT NULL, -- S3 key or local path for frame image
    storage_provider VARCHAR(50) DEFAULT 'local',
    storage_bucket VARCHAR(255),

    -- OCR extracted text
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,2), -- 0-100
    ocr_language VARCHAR(10) DEFAULT 'eng',

    -- Full-text search vector
    content_vector tsvector,

    -- Frame metadata
    width INTEGER,
    height INTEGER,
    file_size INTEGER, -- bytes

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_file_frame UNIQUE (file_id, frame_number)
);

-- Create indexes for VideoFrames
CREATE INDEX idx_video_frames_file ON public."VideoFrames" (file_id);
CREATE INDEX idx_video_frames_timestamp ON public."VideoFrames" (timestamp_seconds);
CREATE INDEX idx_video_frames_type ON public."VideoFrames" (frame_type);
CREATE INDEX idx_video_frames_content_search ON public."VideoFrames" USING gin(content_vector);

-- Trigger to auto-update content_vector for full-text search on OCR text
CREATE OR REPLACE FUNCTION update_video_frame_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ocr_text IS NOT NULL THEN
        NEW.content_vector := to_tsvector('english', COALESCE(NEW.ocr_text, ''));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_frame_search_vector_update ON public."VideoFrames";
CREATE TRIGGER video_frame_search_vector_update
BEFORE INSERT OR UPDATE ON public."VideoFrames"
FOR EACH ROW
EXECUTE FUNCTION update_video_frame_search_vector();

-- ============================================================================
-- TABLE: VideoScenes
-- ============================================================================
-- Stores detected scenes from video analysis

CREATE TABLE IF NOT EXISTS public."VideoScenes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Scene identification
    scene_number INTEGER NOT NULL,
    start_time DECIMAL(12,3) NOT NULL,
    end_time DECIMAL(12,3) NOT NULL,

    -- Scene thumbnail
    thumbnail_frame_id uuid REFERENCES public."VideoFrames"(id) ON DELETE SET NULL,

    -- Scene description
    description TEXT,
    tags TEXT[], -- Array of tags for categorization

    -- Scene metadata
    frame_count INTEGER DEFAULT 0,
    duration_seconds DECIMAL(12,3) GENERATED ALWAYS AS (end_time - start_time) STORED,

    -- Full-text search on description
    content_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_file_scene UNIQUE (file_id, scene_number),
    CONSTRAINT valid_scene_time CHECK (end_time > start_time)
);

-- Create indexes for VideoScenes
CREATE INDEX idx_video_scenes_file ON public."VideoScenes" (file_id);
CREATE INDEX idx_video_scenes_time_range ON public."VideoScenes" (start_time, end_time);
CREATE INDEX idx_video_scenes_thumbnail ON public."VideoScenes" (thumbnail_frame_id);
CREATE INDEX idx_video_scenes_content_search ON public."VideoScenes" USING gin(content_vector);
CREATE INDEX idx_video_scenes_tags ON public."VideoScenes" USING gin(tags);

-- Trigger to auto-update content_vector for full-text search
CREATE OR REPLACE FUNCTION update_video_scene_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.description IS NOT NULL THEN
        NEW.content_vector := to_tsvector('english', COALESCE(NEW.description, ''));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_scene_search_vector_update ON public."VideoScenes";
CREATE TRIGGER video_scene_search_vector_update
BEFORE INSERT OR UPDATE ON public."VideoScenes"
FOR EACH ROW
EXECUTE FUNCTION update_video_scene_search_vector();

-- ============================================================================
-- EXTEND: EvidenceFiles table with video processing fields
-- ============================================================================

-- Add video processing status tracking
ALTER TABLE public."EvidenceFiles"
ADD COLUMN IF NOT EXISTS video_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_processing_error TEXT;

-- ============================================================================
-- VIEW: VideoProcessingStats
-- ============================================================================
-- Comprehensive view of video processing statistics

CREATE OR REPLACE VIEW public."VideoProcessingStats" AS
SELECT
    ef.id AS file_id,
    ef.original_filename AS filename,
    ef.file_size,
    ef.mime_type,
    ef.video_processed,
    ef.video_processing_completed_at,
    ef.video_processing_error,

    -- Video metadata
    vm.duration_seconds,
    vm.width,
    vm.height,
    vm.fps,
    vm.codec,
    vm.bitrate,
    vm.file_format,

    -- Processing counts
    vm.total_frames,
    vm.extracted_frames,
    vm.scene_count,

    -- Extracted content counts
    COUNT(DISTINCT vf.id) AS stored_frame_count,
    COUNT(DISTINCT vf.id) FILTER (WHERE vf.ocr_text IS NOT NULL) AS frames_with_ocr,
    COUNT(DISTINCT vs.id) AS stored_scene_count,

    -- OCR statistics
    SUM(LENGTH(vf.ocr_text)) AS total_ocr_characters,
    AVG(vf.ocr_confidence) AS avg_ocr_confidence,

    -- Processing duration
    EXTRACT(EPOCH FROM (ef.video_processing_completed_at - ef.video_processing_started_at)) AS processing_duration_seconds

FROM public."EvidenceFiles" ef
LEFT JOIN public."VideoMetadata" vm ON ef.id = vm.file_id
LEFT JOIN public."VideoFrames" vf ON ef.id = vf.file_id
LEFT JOIN public."VideoScenes" vs ON ef.id = vs.file_id
WHERE ef.file_type = 'video'
GROUP BY ef.id, vm.id
ORDER BY ef.created_at DESC;

-- ============================================================================
-- FUNCTION: search_video_content
-- ============================================================================
-- Full-text search across video OCR text and scene descriptions

CREATE OR REPLACE FUNCTION search_video_content(
    p_search_query text,
    p_file_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    content_type text,
    content_id uuid,
    file_id uuid,
    filename text,
    match_text text,
    timestamp_seconds decimal,
    relevance real
) AS $$
BEGIN
    RETURN QUERY
    -- Search in frame OCR text
    SELECT
        'frame_ocr'::text AS content_type,
        vf.id AS content_id,
        vf.file_id,
        ef.original_filename AS filename,
        LEFT(vf.ocr_text, 200) AS match_text,
        vf.timestamp_seconds,
        ts_rank(vf.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."VideoFrames" vf
    JOIN public."EvidenceFiles" ef ON vf.file_id = ef.id
    WHERE vf.content_vector @@ plainto_tsquery('english', p_search_query)
      AND (p_file_id IS NULL OR vf.file_id = p_file_id)

    UNION ALL

    -- Search in scene descriptions
    SELECT
        'scene_description'::text AS content_type,
        vs.id AS content_id,
        vs.file_id,
        ef.original_filename AS filename,
        COALESCE(vs.description, 'Scene ' || vs.scene_number::text) AS match_text,
        vs.start_time AS timestamp_seconds,
        ts_rank(vs.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."VideoScenes" vs
    JOIN public."EvidenceFiles" ef ON vs.file_id = ef.id
    WHERE vs.content_vector @@ plainto_tsquery('english', p_search_query)
      AND (p_file_id IS NULL OR vs.file_id = p_file_id)

    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_video_timeline
-- ============================================================================
-- Get chronological timeline of frames and scenes for a video

CREATE OR REPLACE FUNCTION get_video_timeline(
    p_file_id uuid,
    p_include_all_frames boolean DEFAULT false
)
RETURNS TABLE (
    event_type text,
    event_id uuid,
    timestamp_seconds decimal,
    description text,
    has_ocr_text boolean
) AS $$
BEGIN
    RETURN QUERY
    -- Include scenes
    SELECT
        'scene'::text AS event_type,
        vs.id AS event_id,
        vs.start_time AS timestamp_seconds,
        COALESCE(vs.description, 'Scene ' || vs.scene_number::text) AS description,
        false AS has_ocr_text
    FROM public."VideoScenes" vs
    WHERE vs.file_id = p_file_id

    UNION ALL

    -- Include frames (all or only with OCR)
    SELECT
        'frame'::text AS event_type,
        vf.id AS event_id,
        vf.timestamp_seconds,
        COALESCE(LEFT(vf.ocr_text, 100), 'Frame ' || vf.frame_number::text) AS description,
        (vf.ocr_text IS NOT NULL) AS has_ocr_text
    FROM public."VideoFrames" vf
    WHERE vf.file_id = p_file_id
      AND (p_include_all_frames OR vf.ocr_text IS NOT NULL)

    ORDER BY timestamp_seconds ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: update_video_metadata_counts
-- ============================================================================
-- Update aggregate counts in VideoMetadata table

CREATE OR REPLACE FUNCTION update_video_metadata_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update VideoMetadata counts when frames or scenes change
    UPDATE public."VideoMetadata" vm
    SET
        extracted_frames = (
            SELECT COUNT(*) FROM public."VideoFrames" vf WHERE vf.file_id = vm.file_id
        ),
        scene_count = (
            SELECT COUNT(*) FROM public."VideoScenes" vs WHERE vs.file_id = vm.file_id
        ),
        ocr_text_length = (
            SELECT COALESCE(SUM(LENGTH(ocr_text)), 0)
            FROM public."VideoFrames" vf
            WHERE vf.file_id = vm.file_id
        ),
        updated_at = now()
    WHERE vm.file_id = COALESCE(NEW.file_id, OLD.file_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update metadata counts
DROP TRIGGER IF EXISTS video_frames_metadata_update ON public."VideoFrames";
CREATE TRIGGER video_frames_metadata_update
AFTER INSERT OR UPDATE OR DELETE ON public."VideoFrames"
FOR EACH ROW
EXECUTE FUNCTION update_video_metadata_counts();

DROP TRIGGER IF EXISTS video_scenes_metadata_update ON public."VideoScenes";
CREATE TRIGGER video_scenes_metadata_update
AFTER INSERT OR UPDATE OR DELETE ON public."VideoScenes"
FOR EACH ROW
EXECUTE FUNCTION update_video_metadata_counts();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public."VideoMetadata" TO backend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."VideoFrames" TO backend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."VideoScenes" TO backend_app;
GRANT SELECT ON public."VideoProcessingStats" TO backend_app;
GRANT EXECUTE ON FUNCTION search_video_content TO backend_app;
GRANT EXECUTE ON FUNCTION get_video_timeline TO backend_app;

-- Readonly access for analytics
GRANT SELECT ON public."VideoMetadata" TO readonly_user;
GRANT SELECT ON public."VideoFrames" TO readonly_user;
GRANT SELECT ON public."VideoScenes" TO readonly_user;
GRANT SELECT ON public."VideoProcessingStats" TO readonly_user;
GRANT EXECUTE ON FUNCTION search_video_content TO readonly_user;
GRANT EXECUTE ON FUNCTION get_video_timeline TO readonly_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries:
-- SELECT * FROM public."VideoProcessingStats" LIMIT 5;
-- SELECT * FROM search_video_content('kennedy', NULL, 10);
-- SELECT * FROM get_video_timeline('<file_id>', true);

COMMENT ON TABLE public."VideoMetadata" IS 'Comprehensive video file metadata including codec, resolution, and duration';
COMMENT ON TABLE public."VideoFrames" IS 'Extracted video frames with OCR text and full-text search';
COMMENT ON TABLE public."VideoScenes" IS 'Detected video scenes with time ranges and descriptions';
COMMENT ON VIEW public."VideoProcessingStats" IS 'Video processing statistics and status tracking';
COMMENT ON FUNCTION search_video_content IS 'Full-text search across video OCR text and scene descriptions';
COMMENT ON FUNCTION get_video_timeline IS 'Chronological timeline of frames and scenes for a video';
