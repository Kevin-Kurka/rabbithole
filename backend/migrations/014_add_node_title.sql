-- Migration: Add title column to Nodes table
-- Date: 2025-11-06
-- Description: Add a required title field to nodes for better display and UX

-- Add title column to Nodes table
ALTER TABLE public."Nodes"
ADD COLUMN IF NOT EXISTS title TEXT;

-- Set default titles for existing nodes based on their type
-- This is a temporary solution - in production, you'd want to generate meaningful titles
UPDATE public."Nodes"
SET title = COALESCE(
    props->>'name',
    props->>'title',
    'Untitled ' || (SELECT name FROM public."NodeTypes" WHERE id = node_type_id)
)
WHERE title IS NULL;

-- Make title required going forward
ALTER TABLE public."Nodes"
ALTER COLUMN title SET NOT NULL;

-- Add index on title for searching
CREATE INDEX IF NOT EXISTS idx_nodes_title ON public."Nodes" (title);

-- Add full-text search index for title
CREATE INDEX IF NOT EXISTS idx_nodes_title_fulltext ON public."Nodes" USING gin(to_tsvector('english', title));

COMMENT ON COLUMN public."Nodes".title IS 'Human-readable title for the node, contextual based on node type';
