-- ============================================================================
-- Migration 015: Article & Inquiry System
-- ============================================================================
-- Description: Adds support for Articles (special NodeType) and public Inquiries
-- Author: Database Architecture Team
-- Date: 2025-01-11
-- ============================================================================

-- ============================================================================
-- ALTER NODES TABLE FOR ARTICLE SUPPORT
-- ============================================================================

-- Add article-specific columns to Nodes table
ALTER TABLE public."Nodes"
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS narrative TEXT, -- Markdown/rich text content for articles
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ, -- When article was published (NULL = draft)
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb, -- Array of user IDs with edit permissions
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public."Users"(id); -- Primary author

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_nodes_title ON public."Nodes" (title);
CREATE INDEX IF NOT EXISTS idx_nodes_published_at ON public."Nodes" (published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_author_id ON public."Nodes" (author_id);

-- Add full-text search index on title and narrative
CREATE INDEX IF NOT EXISTS idx_nodes_title_search ON public."Nodes" USING gin(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_nodes_narrative_search ON public."Nodes" USING gin(to_tsvector('english', COALESCE(narrative, '')));

-- ============================================================================
-- CREATE INQUIRIES TABLE
-- ============================================================================

-- Table for storing public inquiries on nodes/edges
CREATE TABLE IF NOT EXISTS public."Inquiries" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved', 'challenged')),
    parent_inquiry_id uuid REFERENCES public."Inquiries"(id) ON DELETE CASCADE, -- For threaded responses
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure inquiry targets either a node OR edge, not both or neither
    CONSTRAINT either_node_or_edge_inquiry CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    )
);

-- Indexes for inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_target_node_id ON public."Inquiries" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_target_edge_id ON public."Inquiries" (target_edge_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON public."Inquiries" (user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public."Inquiries" (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_parent_id ON public."Inquiries" (parent_inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public."Inquiries" (created_at DESC);

-- Full-text search on inquiry content
CREATE INDEX IF NOT EXISTS idx_inquiries_content_search ON public."Inquiries" USING gin(to_tsvector('english', content));

-- ============================================================================
-- SEED ARTICLE NODE TYPE
-- ============================================================================

-- Insert "Article" as a special NodeType if it doesn't exist
INSERT INTO public."NodeTypes" (name, description, props, meta)
VALUES (
    'Article',
    'A narrative document that references and connects multiple nodes with additional context and author commentary',
    jsonb_build_object(
        'schema', jsonb_build_object(
            'narrative', jsonb_build_object('type', 'string', 'required', true, 'description', 'Markdown content of the article'),
            'published', jsonb_build_object('type', 'boolean', 'required', true, 'default', false),
            'permissions', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'), 'description', 'User IDs with edit permissions'),
            'author_id', jsonb_build_object('type', 'string', 'format', 'uuid', 'description', 'Primary author user ID')
        )
    ),
    jsonb_build_object('isSpecialType', true, 'category', 'document')
)
ON CONFLICT (name) DO NOTHING;

-- Insert other common NodeTypes if they don't exist
INSERT INTO public."NodeTypes" (name, description, props, meta)
VALUES
    ('Fact', 'A verifiable piece of information backed by evidence',
     jsonb_build_object('schema', jsonb_build_object('verified', jsonb_build_object('type', 'boolean'))),
     jsonb_build_object('category', 'evidence')),

    ('Claim', 'An assertion that may be true or false, subject to verification',
     jsonb_build_object('schema', jsonb_build_object('confidence', jsonb_build_object('type', 'number', 'min', 0, 'max', 1))),
     jsonb_build_object('category', 'assertion')),

    ('Person', 'An individual person involved in events or relationships',
     jsonb_build_object('schema', jsonb_build_object('fullName', jsonb_build_object('type', 'string'), 'birthDate', jsonb_build_object('type', 'string', 'format', 'date'))),
     jsonb_build_object('category', 'entity', 'schemaOrg', 'Person')),

    ('Place', 'A physical or geographic location',
     jsonb_build_object('schema', jsonb_build_object('latitude', jsonb_build_object('type', 'number'), 'longitude', jsonb_build_object('type', 'number'), 'address', jsonb_build_object('type', 'string'))),
     jsonb_build_object('category', 'entity', 'schemaOrg', 'Place')),

    ('Event', 'A temporal occurrence with participants and location',
     jsonb_build_object('schema', jsonb_build_object('startDate', jsonb_build_object('type', 'string', 'format', 'date'), 'endDate', jsonb_build_object('type', 'string', 'format', 'date'), 'location', jsonb_build_object('type', 'string'))),
     jsonb_build_object('category', 'entity', 'schemaOrg', 'Event')),

    ('Thing', 'An object, document, or other physical/digital item',
     jsonb_build_object('schema', jsonb_build_object('itemType', jsonb_build_object('type', 'string'))),
     jsonb_build_object('category', 'entity', 'schemaOrg', 'Thing'))
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public."Nodes".title IS 'Human-readable title for the node (especially important for articles)';
COMMENT ON COLUMN public."Nodes".narrative IS 'Rich text narrative content for article nodes';
COMMENT ON COLUMN public."Nodes".published_at IS 'Timestamp when article was published (NULL means draft)';
COMMENT ON COLUMN public."Nodes".permissions IS 'JSONB array of user IDs with edit permissions';
COMMENT ON COLUMN public."Nodes".author_id IS 'User ID of the primary author';

COMMENT ON TABLE public."Inquiries" IS 'Public inquiries/questions about nodes or edges that cannot be hidden or deleted by authors';
COMMENT ON COLUMN public."Inquiries".status IS 'Status: open (unanswered), answered (has response), resolved (accepted), challenged (disputed)';
COMMENT ON COLUMN public."Inquiries".parent_inquiry_id IS 'Parent inquiry for threaded responses';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
