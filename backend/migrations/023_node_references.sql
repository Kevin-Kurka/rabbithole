-- ============================================================================
-- MIGRATION 023: Node References System
-- ============================================================================
-- Purpose: Add support for external references and citations that can be
--          processed with AI to create verified nodes with confidence scores
-- Author: Claude Code
-- Date: 2025-01-13
-- ============================================================================

-- Create NodeReferences table
CREATE TABLE IF NOT EXISTS public."NodeReferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'reference', -- 'reference' or 'citation'
  confidence NUMERIC(3,2), -- Optional confidence score if processed
  processed_node_id UUID, -- If AI processed this into a node
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (author, date, etc.)
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_node_references_node
    FOREIGN KEY (node_id)
    REFERENCES public."Nodes"(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_node_references_processed_node
    FOREIGN KEY (processed_node_id)
    REFERENCES public."Nodes"(id)
    ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT check_reference_type
    CHECK (type IN ('reference', 'citation')),

  CONSTRAINT check_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  CONSTRAINT check_valid_url
    CHECK (url ~* '^https?://')
);

-- Create indexes for performance
CREATE INDEX idx_node_references_node_id ON public."NodeReferences"(node_id);
CREATE INDEX idx_node_references_type ON public."NodeReferences"(type);
CREATE INDEX idx_node_references_processed_node ON public."NodeReferences"(processed_node_id);
CREATE INDEX idx_node_references_created_at ON public."NodeReferences"(created_at DESC);
CREATE INDEX idx_node_references_url ON public."NodeReferences"(url);

-- Create GIN index for metadata JSONB field
CREATE INDEX idx_node_references_metadata ON public."NodeReferences" USING GIN(metadata);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_node_references_updated_at
  BEFORE UPDATE ON public."NodeReferences"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public."NodeReferences" IS 'External references and citations associated with nodes. Can be processed with AI to create verified nodes.';

-- Add comments to columns
COMMENT ON COLUMN public."NodeReferences".id IS 'Unique identifier for the reference';
COMMENT ON COLUMN public."NodeReferences".node_id IS 'ID of the node this reference is attached to';
COMMENT ON COLUMN public."NodeReferences".url IS 'URL of the external reference';
COMMENT ON COLUMN public."NodeReferences".title IS 'Title or description of the reference';
COMMENT ON COLUMN public."NodeReferences".description IS 'Optional additional description or notes';
COMMENT ON COLUMN public."NodeReferences".type IS 'Type of reference: reference or citation';
COMMENT ON COLUMN public."NodeReferences".confidence IS 'Confidence score (0-1) if processed by AI';
COMMENT ON COLUMN public."NodeReferences".processed_node_id IS 'ID of node created from processing this reference';
COMMENT ON COLUMN public."NodeReferences".metadata IS 'Additional metadata (author, publish date, domain, etc.)';
COMMENT ON COLUMN public."NodeReferences".created_by IS 'User who added this reference';
COMMENT ON COLUMN public."NodeReferences".created_at IS 'Timestamp when reference was added';
COMMENT ON COLUMN public."NodeReferences".updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN public."NodeReferences".deleted_at IS 'Soft delete timestamp';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to add sample references
/*
INSERT INTO public."NodeReferences" (node_id, url, title, type, created_by)
SELECT
  n.id,
  'https://www.archives.gov/research/jfk/warren-commission-report',
  'Warren Commission Report - Full Document',
  'reference',
  n.created_by
FROM public."Nodes" n
WHERE n.title LIKE '%JFK%'
LIMIT 1;

INSERT INTO public."NodeReferences" (node_id, url, title, description, type, created_by)
SELECT
  n.id,
  'https://en.wikipedia.org/wiki/Assassination_of_John_F._Kennedy',
  'Wikipedia: JFK Assassination',
  'Comprehensive Wikipedia article on the JFK assassination',
  'citation',
  n.created_by
FROM public."Nodes" n
WHERE n.title LIKE '%JFK%'
LIMIT 1;
*/

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_node_references_updated_at ON public."NodeReferences";
-- DROP INDEX IF EXISTS idx_node_references_metadata;
-- DROP INDEX IF EXISTS idx_node_references_url;
-- DROP INDEX IF EXISTS idx_node_references_created_at;
-- DROP INDEX IF EXISTS idx_node_references_processed_node;
-- DROP INDEX IF EXISTS idx_node_references_type;
-- DROP INDEX IF EXISTS idx_node_references_node_id;
-- DROP TABLE IF EXISTS public."NodeReferences";
