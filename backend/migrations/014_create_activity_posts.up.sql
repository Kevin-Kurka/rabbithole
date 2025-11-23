-- ============================================================================
-- Migration: Create Activity Posts Table
-- Description: Twitter-like activity feed with posts, replies, and shares
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."ActivityPosts" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_post_id UUID REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE,
    shared_post_id UUID REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE,
    mentioned_node_ids UUID[] DEFAULT ARRAY[]::UUID[],
    attachment_ids UUID[] DEFAULT ARRAY[]::UUID[],
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- Prevent self-referencing posts
    CONSTRAINT check_not_self_parent CHECK (id != parent_post_id),
    CONSTRAINT check_not_self_share CHECK (id != shared_post_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_activity_posts_author_id ON public."ActivityPosts"(author_id);
CREATE INDEX idx_activity_posts_parent_post_id ON public."ActivityPosts"(parent_post_id) WHERE parent_post_id IS NOT NULL;
CREATE INDEX idx_activity_posts_shared_post_id ON public."ActivityPosts"(shared_post_id) WHERE shared_post_id IS NOT NULL;
CREATE INDEX idx_activity_posts_created_at ON public."ActivityPosts"(created_at DESC);
CREATE INDEX idx_activity_posts_deleted_at ON public."ActivityPosts"(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for array searches
CREATE INDEX idx_activity_posts_mentioned_nodes ON public."ActivityPosts" USING GIN(mentioned_node_ids);
CREATE INDEX idx_activity_posts_attachments ON public."ActivityPosts" USING GIN(attachment_ids);

-- Comments
COMMENT ON TABLE public."ActivityPosts" IS 'Activity feed posts with support for replies and shares';
COMMENT ON COLUMN public."ActivityPosts".parent_post_id IS 'Reference to parent post for replies/threads';
COMMENT ON COLUMN public."ActivityPosts".shared_post_id IS 'Reference to shared/retweeted post';
COMMENT ON COLUMN public."ActivityPosts".mentioned_node_ids IS 'Array of node IDs mentioned in the post';
COMMENT ON COLUMN public."ActivityPosts".attachment_ids IS 'Array of evidence file IDs attached to post';
COMMENT ON COLUMN public."ActivityPosts".deleted_at IS 'Soft delete timestamp';
