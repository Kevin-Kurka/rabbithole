-- Migration: Document Processing Results Table
-- Description: Store extracted text and processing results from documents

-- ============================================================================
-- DOCUMENT PROCESSING RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."DocumentProcessingResults" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Extracted content
    extracted_text TEXT,
    extracted_at TIMESTAMPTZ,

    -- AI-generated summary
    summary TEXT,
    summary_generated_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Processing statistics
    processing_stats JSONB DEFAULT '{}', -- { entities_found: 10, nodes_created: 5, etc. }

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE (file_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_doc_processing_file_id
    ON public."DocumentProcessingResults"(file_id);

CREATE INDEX IF NOT EXISTS idx_doc_processing_extracted_at
    ON public."DocumentProcessingResults"(extracted_at DESC);

-- Full-text search on extracted text
CREATE INDEX IF NOT EXISTS idx_doc_processing_text_search
    ON public."DocumentProcessingResults"
    USING gin(to_tsvector('english', extracted_text));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public."DocumentProcessingResults" IS
    'Stores extracted text and processing results from uploaded document files';

COMMENT ON COLUMN public."DocumentProcessingResults".extracted_text IS
    'Full text extracted from the document';

COMMENT ON COLUMN public."DocumentProcessingResults".summary IS
    'AI-generated summary of the document';

COMMENT ON COLUMN public."DocumentProcessingResults".processing_stats IS
    'Statistics about the processing (entities found, nodes created, etc.)';
