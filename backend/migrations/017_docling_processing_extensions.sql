-- ============================================================================
-- Migration 017: Docling Processing Extensions
-- ============================================================================
-- Description: Extends EvidenceFiles table with Docling processing results
--              including table extraction, figure extraction, and section
--              analysis capabilities.
--
-- Author: Document Processing Team
-- Date: 2025-11-12
-- Dependencies:
--   - Requires EvidenceFiles table
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EXTEND: EvidenceFiles table with Docling processing fields
-- ============================================================================

-- Add columns for Docling processing results
ALTER TABLE public."EvidenceFiles"
ADD COLUMN IF NOT EXISTS markdown_content TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_service VARCHAR(50) DEFAULT 'docling',
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Add metadata fields for document information
ALTER TABLE public."EvidenceFiles"
ADD COLUMN IF NOT EXISTS document_title TEXT,
ADD COLUMN IF NOT EXISTS document_author TEXT,
ADD COLUMN IF NOT EXISTS document_subject TEXT,
ADD COLUMN IF NOT EXISTS document_creator TEXT,
ADD COLUMN IF NOT EXISTS document_producer TEXT,
ADD COLUMN IF NOT EXISTS document_creation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS document_modification_date TIMESTAMPTZ;

-- ============================================================================
-- TABLE: DocumentTables (extracted tables from documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."DocumentTables" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Table location
    page_number INTEGER NOT NULL,
    bbox_left DECIMAL(10,4),
    bbox_top DECIMAL(10,4),
    bbox_right DECIMAL(10,4),
    bbox_bottom DECIMAL(10,4),

    -- Table content
    caption TEXT,
    rows JSONB NOT NULL, -- Array of arrays: [[cell1, cell2, ...], [cell1, cell2, ...]]
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,

    -- Full-text search on table content
    content_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for DocumentTables
CREATE INDEX idx_document_tables_file ON public."DocumentTables" (file_id);
CREATE INDEX idx_document_tables_page ON public."DocumentTables" (page_number);
CREATE INDEX idx_document_tables_content_search ON public."DocumentTables" USING gin(content_vector);

-- Trigger to auto-update content_vector for full-text search
CREATE OR REPLACE FUNCTION update_document_table_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_vector := to_tsvector('english',
        COALESCE(NEW.caption, '') || ' ' ||
        COALESCE(NEW.rows::text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_table_search_vector_update ON public."DocumentTables";
CREATE TRIGGER document_table_search_vector_update
BEFORE INSERT OR UPDATE ON public."DocumentTables"
FOR EACH ROW
EXECUTE FUNCTION update_document_table_search_vector();

-- ============================================================================
-- TABLE: DocumentFigures (extracted figures/images from documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."DocumentFigures" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Figure location
    page_number INTEGER NOT NULL,
    bbox_left DECIMAL(10,4),
    bbox_top DECIMAL(10,4),
    bbox_right DECIMAL(10,4),
    bbox_bottom DECIMAL(10,4),

    -- Figure content
    caption TEXT,
    image_data TEXT, -- Base64 encoded image or S3 URL
    image_type VARCHAR(20), -- 'png', 'jpeg', 'svg', etc.

    -- Full-text search on caption
    content_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for DocumentFigures
CREATE INDEX idx_document_figures_file ON public."DocumentFigures" (file_id);
CREATE INDEX idx_document_figures_page ON public."DocumentFigures" (page_number);
CREATE INDEX idx_document_figures_content_search ON public."DocumentFigures" USING gin(content_vector);

-- Trigger to auto-update content_vector for full-text search
CREATE OR REPLACE FUNCTION update_document_figure_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_vector := to_tsvector('english', COALESCE(NEW.caption, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_figure_search_vector_update ON public."DocumentFigures";
CREATE TRIGGER document_figure_search_vector_update
BEFORE INSERT OR UPDATE ON public."DocumentFigures"
FOR EACH ROW
EXECUTE FUNCTION update_document_figure_search_vector();

-- ============================================================================
-- TABLE: DocumentSections (document structure and headings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."DocumentSections" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to source file
    file_id uuid NOT NULL REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE,

    -- Section hierarchy
    heading TEXT NOT NULL,
    level INTEGER NOT NULL, -- 1 = top level, 2 = subsection, etc.
    section_order INTEGER NOT NULL, -- Order of appearance in document

    -- Section content
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,

    -- Vector embedding for semantic search
    ai vector(768), -- Using Ollama nomic-embed-text (768-dim)

    -- Full-text search
    content_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for DocumentSections
CREATE INDEX idx_document_sections_file ON public."DocumentSections" (file_id);
CREATE INDEX idx_document_sections_level ON public."DocumentSections" (level);
CREATE INDEX idx_document_sections_order ON public."DocumentSections" (section_order);
CREATE INDEX idx_document_sections_content_search ON public."DocumentSections" USING gin(content_vector);

-- HNSW index for vector similarity search
CREATE INDEX idx_document_sections_ai_hnsw ON public."DocumentSections"
USING hnsw (ai vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Trigger to auto-update content_vector and word_count
CREATE OR REPLACE FUNCTION update_document_section_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_vector := to_tsvector('english',
        COALESCE(NEW.heading, '') || ' ' ||
        COALESCE(NEW.content, '')
    );
    NEW.word_count := array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_section_metadata_update ON public."DocumentSections";
CREATE TRIGGER document_section_metadata_update
BEFORE INSERT OR UPDATE ON public."DocumentSections"
FOR EACH ROW
EXECUTE FUNCTION update_document_section_metadata();

-- ============================================================================
-- VIEW: DocumentProcessingStats
-- ============================================================================
-- Shows document processing statistics per file

CREATE OR REPLACE VIEW public."DocumentProcessingStats" AS
SELECT
    ef.id AS file_id,
    ef.filename,
    ef.file_type,
    ef.file_size,
    ef.processing_service,
    ef.processing_time_ms,
    ef.page_count,
    ef.processing_error,
    ef.processed_at,

    -- Count of extracted elements
    COUNT(DISTINCT dt.id) AS table_count,
    COUNT(DISTINCT df.id) AS figure_count,
    COUNT(DISTINCT ds.id) AS section_count,

    -- Total content metrics
    SUM(ds.word_count) AS total_words,

    -- Processing status
    CASE
        WHEN ef.processing_error IS NOT NULL THEN 'failed'
        WHEN ef.processed_at IS NULL THEN 'pending'
        ELSE 'completed'
    END AS processing_status

FROM public."EvidenceFiles" ef
LEFT JOIN public."DocumentTables" dt ON ef.id = dt.file_id
LEFT JOIN public."DocumentFigures" df ON ef.id = df.file_id
LEFT JOIN public."DocumentSections" ds ON ef.id = ds.file_id
GROUP BY ef.id
ORDER BY ef.processed_at DESC NULLS LAST;

-- ============================================================================
-- FUNCTION: search_document_content
-- ============================================================================
-- Full-text search across all document content (sections, tables, figures)

CREATE OR REPLACE FUNCTION search_document_content(
    p_search_query text,
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    content_type text,
    content_id uuid,
    file_id uuid,
    filename text,
    match_text text,
    relevance real
) AS $$
BEGIN
    RETURN QUERY
    -- Search in sections
    SELECT
        'section'::text AS content_type,
        ds.id AS content_id,
        ds.file_id,
        ef.filename,
        ds.heading || ': ' || LEFT(ds.content, 200) AS match_text,
        ts_rank(ds.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentSections" ds
    JOIN public."EvidenceFiles" ef ON ds.file_id = ef.id
    WHERE ds.content_vector @@ plainto_tsquery('english', p_search_query)

    UNION ALL

    -- Search in tables
    SELECT
        'table'::text AS content_type,
        dt.id AS content_id,
        dt.file_id,
        ef.filename,
        COALESCE(dt.caption, 'Table on page ' || dt.page_number::text) AS match_text,
        ts_rank(dt.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentTables" dt
    JOIN public."EvidenceFiles" ef ON dt.file_id = ef.id
    WHERE dt.content_vector @@ plainto_tsquery('english', p_search_query)

    UNION ALL

    -- Search in figures
    SELECT
        'figure'::text AS content_type,
        df.id AS content_id,
        df.file_id,
        ef.filename,
        COALESCE(df.caption, 'Figure on page ' || df.page_number::text) AS match_text,
        ts_rank(df.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentFigures" df
    JOIN public."EvidenceFiles" ef ON df.file_id = ef.id
    WHERE df.content_vector @@ plainto_tsquery('english', p_search_query)

    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public."DocumentTables" TO backend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."DocumentFigures" TO backend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."DocumentSections" TO backend_app;
GRANT SELECT ON public."DocumentProcessingStats" TO backend_app;
GRANT EXECUTE ON FUNCTION search_document_content TO backend_app;

-- Readonly access for analytics
GRANT SELECT ON public."DocumentTables" TO readonly_user;
GRANT SELECT ON public."DocumentFigures" TO readonly_user;
GRANT SELECT ON public."DocumentSections" TO readonly_user;
GRANT SELECT ON public."DocumentProcessingStats" TO readonly_user;
GRANT EXECUTE ON FUNCTION search_document_content TO readonly_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries:
-- SELECT * FROM public."DocumentProcessingStats" LIMIT 5;
-- SELECT * FROM search_document_content('kennedy assassination', 10);

COMMENT ON TABLE public."DocumentTables" IS 'Extracted tables from documents with structure preservation';
COMMENT ON TABLE public."DocumentFigures" IS 'Extracted figures and images from documents with captions';
COMMENT ON TABLE public."DocumentSections" IS 'Document sections with hierarchical structure and embeddings';
COMMENT ON VIEW public."DocumentProcessingStats" IS 'Document processing statistics and status tracking';
COMMENT ON FUNCTION search_document_content IS 'Full-text search across all document content types';
