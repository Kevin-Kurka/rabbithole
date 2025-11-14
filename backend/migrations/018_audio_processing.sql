-- ============================================================================
-- Migration 018: Audio Processing System
-- ============================================================================
-- Description: Adds audio transcription capabilities using OpenAI Whisper API
--              with support for timestamped segments and full-text search.
--              Future-ready for speaker diarization via AssemblyAI.
--
-- Author: Audio Processing Team
-- Date: 2025-11-13
-- Dependencies:
--   - Requires EvidenceFiles table
--   - Requires pgvector extension (for semantic search)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity search

-- ============================================================================
-- TABLE: AudioTranscriptions (main transcription results)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."AudioTranscriptions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source audio file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Transcription content
    transcript_text TEXT NOT NULL,
    transcript_json JSONB NOT NULL, -- Full API response with metadata

    -- Audio metadata
    language VARCHAR(10) NOT NULL DEFAULT 'en', -- ISO-639-1 language code
    duration_seconds DECIMAL(10,2) NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    speaker_count INTEGER, -- Nullable, for future diarization

    -- Processing metadata
    processing_service VARCHAR(50) NOT NULL DEFAULT 'whisper', -- 'whisper' or 'assemblyai'
    processing_time_ms INTEGER NOT NULL,
    processing_error TEXT, -- Error message if processing failed
    processed_at TIMESTAMPTZ DEFAULT now(),

    -- Full-text search vector
    content_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_language CHECK (language ~ '^[a-z]{2,3}$'),
    CONSTRAINT valid_duration CHECK (duration_seconds >= 0),
    CONSTRAINT valid_word_count CHECK (word_count >= 0),
    CONSTRAINT valid_speaker_count CHECK (speaker_count IS NULL OR speaker_count > 0),
    CONSTRAINT valid_processing_service CHECK (processing_service IN ('whisper', 'assemblyai'))
);

-- Create indexes for AudioTranscriptions
CREATE INDEX idx_audio_transcriptions_file ON public."AudioTranscriptions" (file_id);
CREATE INDEX idx_audio_transcriptions_language ON public."AudioTranscriptions" (language);
CREATE INDEX idx_audio_transcriptions_processed ON public."AudioTranscriptions" (processed_at);
CREATE INDEX idx_audio_transcriptions_search ON public."AudioTranscriptions" USING gin(content_vector);

-- Ensure only one transcription per file (can be updated/replaced)
CREATE UNIQUE INDEX idx_audio_transcriptions_file_unique ON public."AudioTranscriptions" (file_id);

-- ============================================================================
-- TABLE: TranscriptSegments (time-aligned transcript segments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."TranscriptSegments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to parent transcription
    transcription_id uuid NOT NULL REFERENCES public."AudioTranscriptions"(id) ON DELETE CASCADE,

    -- Segment metadata
    segment_order INTEGER NOT NULL, -- Order of segment in transcript
    start_time DECIMAL(10,3) NOT NULL, -- Start time in seconds (with millisecond precision)
    end_time DECIMAL(10,3) NOT NULL, -- End time in seconds
    text TEXT NOT NULL,

    -- Speaker diarization (nullable, for future use)
    speaker_id INTEGER, -- Speaker identifier (1, 2, 3, etc.)
    speaker_label VARCHAR(100), -- Human-readable label (e.g., "Speaker A", "John Doe")

    -- Quality metrics
    confidence DECIMAL(5,4), -- 0.0000-1.0000, when available

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_segment_order CHECK (segment_order > 0),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

-- Create indexes for TranscriptSegments
CREATE INDEX idx_transcript_segments_transcription ON public."TranscriptSegments" (transcription_id);
CREATE INDEX idx_transcript_segments_order ON public."TranscriptSegments" (segment_order);
CREATE INDEX idx_transcript_segments_time_range ON public."TranscriptSegments" (start_time, end_time);
CREATE INDEX idx_transcript_segments_speaker ON public."TranscriptSegments" (speaker_id) WHERE speaker_id IS NOT NULL;

-- Full-text search on segment text
CREATE INDEX idx_transcript_segments_text_search ON public."TranscriptSegments" USING gin(to_tsvector('english', text));

-- Ensure unique segment order per transcription
CREATE UNIQUE INDEX idx_transcript_segments_order_unique ON public."TranscriptSegments" (transcription_id, segment_order);

-- ============================================================================
-- TRIGGER: Auto-update content_vector for full-text search
-- ============================================================================

CREATE OR REPLACE FUNCTION update_audio_transcription_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_vector := to_tsvector('english', COALESCE(NEW.transcript_text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audio_transcription_search_vector_update ON public."AudioTranscriptions";
CREATE TRIGGER audio_transcription_search_vector_update
BEFORE INSERT OR UPDATE ON public."AudioTranscriptions"
FOR EACH ROW
EXECUTE FUNCTION update_audio_transcription_search_vector();

-- ============================================================================
-- TRIGGER: Auto-update word_count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_audio_transcription_word_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transcript_text IS NOT NULL THEN
        NEW.word_count := array_length(
            regexp_split_to_array(trim(NEW.transcript_text), '\s+'),
            1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audio_transcription_word_count_update ON public."AudioTranscriptions";
CREATE TRIGGER audio_transcription_word_count_update
BEFORE INSERT OR UPDATE OF transcript_text ON public."AudioTranscriptions"
FOR EACH ROW
EXECUTE FUNCTION update_audio_transcription_word_count();

-- ============================================================================
-- TRIGGER: Update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_audio_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audio_transcription_timestamps ON public."AudioTranscriptions";
CREATE TRIGGER audio_transcription_timestamps
BEFORE UPDATE ON public."AudioTranscriptions"
FOR EACH ROW
EXECUTE FUNCTION update_audio_timestamps();

DROP TRIGGER IF EXISTS transcript_segment_timestamps ON public."TranscriptSegments";
CREATE TRIGGER transcript_segment_timestamps
BEFORE UPDATE ON public."TranscriptSegments"
FOR EACH ROW
EXECUTE FUNCTION update_audio_timestamps();

-- ============================================================================
-- VIEW: AudioProcessingStats
-- ============================================================================
-- Shows audio processing statistics and status

CREATE OR REPLACE VIEW public."AudioProcessingStats" AS
SELECT
    ef.id AS file_id,
    ef.original_filename AS filename,
    ef.file_size,
    ef.mime_type,

    -- Transcription data
    at.id AS transcription_id,
    at.language,
    at.duration_seconds,
    at.word_count,
    at.speaker_count,
    at.processing_service,
    at.processing_time_ms,
    at.processing_error,
    at.processed_at,

    -- Segment statistics
    COUNT(ts.id) AS segment_count,
    AVG(ts.confidence) AS avg_confidence,
    COUNT(DISTINCT ts.speaker_id) AS detected_speakers,

    -- Processing status
    CASE
        WHEN at.processing_error IS NOT NULL THEN 'failed'
        WHEN at.id IS NULL THEN 'pending'
        ELSE 'completed'
    END AS processing_status

FROM public."EvidenceFiles" ef
LEFT JOIN public."AudioTranscriptions" at ON ef.id = at.file_id
LEFT JOIN public."TranscriptSegments" ts ON at.id = ts.transcription_id
WHERE ef.file_type = 'audio'
GROUP BY ef.id, at.id
ORDER BY at.processed_at DESC NULLS LAST;

-- ============================================================================
-- FUNCTION: search_audio_transcripts
-- ============================================================================
-- Full-text search across audio transcriptions with relevance ranking

CREATE OR REPLACE FUNCTION search_audio_transcripts(
    p_search_query text,
    p_language text DEFAULT NULL,
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    transcription_id uuid,
    file_id uuid,
    filename text,
    language varchar,
    duration_seconds decimal,
    match_snippet text,
    relevance real,
    processed_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.id AS transcription_id,
        at.file_id,
        ef.original_filename AS filename,
        at.language,
        at.duration_seconds,
        ts_headline('english', at.transcript_text, plainto_tsquery('english', p_search_query),
            'MaxWords=50, MinWords=25') AS match_snippet,
        ts_rank(at.content_vector, plainto_tsquery('english', p_search_query)) AS relevance,
        at.processed_at
    FROM public."AudioTranscriptions" at
    JOIN public."EvidenceFiles" ef ON at.file_id = ef.id
    WHERE at.content_vector @@ plainto_tsquery('english', p_search_query)
        AND (p_language IS NULL OR at.language = p_language)
    ORDER BY relevance DESC, at.processed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: search_transcript_segments_by_time
-- ============================================================================
-- Search for segments within a specific time range

CREATE OR REPLACE FUNCTION search_transcript_segments_by_time(
    p_transcription_id uuid,
    p_start_time decimal,
    p_end_time decimal
)
RETURNS TABLE (
    segment_id uuid,
    segment_order integer,
    start_time decimal,
    end_time decimal,
    text text,
    speaker_id integer,
    speaker_label varchar
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ts.id AS segment_id,
        ts.segment_order,
        ts.start_time,
        ts.end_time,
        ts.text,
        ts.speaker_id,
        ts.speaker_label
    FROM public."TranscriptSegments" ts
    WHERE ts.transcription_id = p_transcription_id
        AND ts.start_time <= p_end_time
        AND ts.end_time >= p_start_time
    ORDER BY ts.segment_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_transcript_statistics
-- ============================================================================
-- Calculate detailed statistics for a transcription

CREATE OR REPLACE FUNCTION get_transcript_statistics(p_transcription_id uuid)
RETURNS TABLE (
    total_segments integer,
    total_words integer,
    avg_segment_duration decimal,
    avg_words_per_segment decimal,
    total_duration decimal,
    speaker_count integer,
    avg_confidence decimal,
    language varchar,
    processing_time_ms integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(ts.id)::integer AS total_segments,
        at.word_count AS total_words,
        AVG(ts.end_time - ts.start_time) AS avg_segment_duration,
        (at.word_count::decimal / NULLIF(COUNT(ts.id), 0)) AS avg_words_per_segment,
        at.duration_seconds AS total_duration,
        COUNT(DISTINCT ts.speaker_id)::integer AS speaker_count,
        AVG(ts.confidence) AS avg_confidence,
        at.language,
        at.processing_time_ms
    FROM public."AudioTranscriptions" at
    LEFT JOIN public."TranscriptSegments" ts ON at.id = ts.transcription_id
    WHERE at.id = p_transcription_id
    GROUP BY at.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- EXTEND: EvidenceFiles table with audio processing fields
-- ============================================================================

ALTER TABLE public."EvidenceFiles"
ADD COLUMN IF NOT EXISTS audio_duration_seconds DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS audio_sample_rate INTEGER,
ADD COLUMN IF NOT EXISTS audio_channels INTEGER,
ADD COLUMN IF NOT EXISTS audio_bitrate INTEGER;

COMMENT ON COLUMN public."EvidenceFiles".audio_duration_seconds IS 'Duration of audio file in seconds';
COMMENT ON COLUMN public."EvidenceFiles".audio_sample_rate IS 'Audio sample rate in Hz (e.g., 44100)';
COMMENT ON COLUMN public."EvidenceFiles".audio_channels IS 'Number of audio channels (1=mono, 2=stereo)';
COMMENT ON COLUMN public."EvidenceFiles".audio_bitrate IS 'Audio bitrate in kbps';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public."AudioTranscriptions" TO backend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."TranscriptSegments" TO backend_app;
GRANT SELECT ON public."AudioProcessingStats" TO backend_app;
GRANT EXECUTE ON FUNCTION search_audio_transcripts TO backend_app;
GRANT EXECUTE ON FUNCTION search_transcript_segments_by_time TO backend_app;
GRANT EXECUTE ON FUNCTION get_transcript_statistics TO backend_app;

-- Readonly access for analytics
GRANT SELECT ON public."AudioTranscriptions" TO readonly_user;
GRANT SELECT ON public."TranscriptSegments" TO readonly_user;
GRANT SELECT ON public."AudioProcessingStats" TO readonly_user;
GRANT EXECUTE ON FUNCTION search_audio_transcripts TO readonly_user;
GRANT EXECUTE ON FUNCTION search_transcript_segments_by_time TO readonly_user;
GRANT EXECUTE ON FUNCTION get_transcript_statistics TO readonly_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries:
-- SELECT * FROM public."AudioProcessingStats" LIMIT 5;
-- SELECT * FROM search_audio_transcripts('kennedy assassination', NULL, 10);
-- SELECT * FROM get_transcript_statistics('<transcription-id>');

COMMENT ON TABLE public."AudioTranscriptions" IS 'Audio transcription results from Whisper/AssemblyAI with full-text search';
COMMENT ON TABLE public."TranscriptSegments" IS 'Time-aligned transcript segments with optional speaker diarization';
COMMENT ON VIEW public."AudioProcessingStats" IS 'Audio processing statistics and status tracking';
COMMENT ON FUNCTION search_audio_transcripts IS 'Full-text search across audio transcriptions with relevance ranking';
COMMENT ON FUNCTION search_transcript_segments_by_time IS 'Search transcript segments within a time range';
COMMENT ON FUNCTION get_transcript_statistics IS 'Calculate detailed statistics for a transcription';
