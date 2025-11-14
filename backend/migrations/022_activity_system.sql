-- Migration 022: Twitter-like Activity System
-- Creates a comprehensive social activity system with posts, reactions, replies, and shares

-- ============================================================================
-- ACTIVITY POSTS TABLE
-- ============================================================================
-- Main posts table supporting node-based posts, replies, and shares
CREATE TABLE IF NOT EXISTS public."ActivityPosts" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Node association (what this post is about)
    node_id UUID NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,

    -- Author information
    author_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,

    -- Mentions and attachments
    mentioned_node_ids UUID[] DEFAULT '{}',  -- Array of node IDs mentioned in post
    attachment_ids UUID[] DEFAULT '{}',      -- Array of EvidenceFile IDs

    -- Reply functionality
    is_reply BOOLEAN DEFAULT FALSE,
    parent_post_id UUID REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE,

    -- Share/repost functionality
    is_share BOOLEAN DEFAULT FALSE,
    shared_post_id UUID REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete

    -- Constraints
    CONSTRAINT valid_parent_post CHECK (
        (is_reply = FALSE AND parent_post_id IS NULL) OR
        (is_reply = TRUE AND parent_post_id IS NOT NULL)
    ),
    CONSTRAINT valid_shared_post CHECK (
        (is_share = FALSE AND shared_post_id IS NULL) OR
        (is_share = TRUE AND shared_post_id IS NOT NULL)
    ),
    CONSTRAINT not_reply_and_share CHECK (
        NOT (is_reply = TRUE AND is_share = TRUE)
    )
);

-- ============================================================================
-- ACTIVITY REACTIONS TABLE
-- ============================================================================
-- Reactions to posts (likes, loves, etc.)
CREATE TABLE IF NOT EXISTS public."ActivityReactions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Post and user
    post_id UUID NOT NULL REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Reaction type (like, love, laugh, wow, sad, angry, etc.)
    reaction_type VARCHAR(50) NOT NULL DEFAULT 'like',

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one reaction type per user per post
    CONSTRAINT unique_user_post_reaction UNIQUE (post_id, user_id, reaction_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Activity Posts Indexes
CREATE INDEX idx_activity_posts_node_id ON public."ActivityPosts"(node_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_posts_author_id ON public."ActivityPosts"(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_posts_parent_id ON public."ActivityPosts"(parent_post_id) WHERE is_reply = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_activity_posts_shared_id ON public."ActivityPosts"(shared_post_id) WHERE is_share = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_activity_posts_created_at ON public."ActivityPosts"(created_at DESC) WHERE deleted_at IS NULL;

-- GIN index for array searches (mentions)
CREATE INDEX idx_activity_posts_mentioned_nodes ON public."ActivityPosts" USING GIN(mentioned_node_ids);

-- Composite index for node timeline
CREATE INDEX idx_activity_posts_node_timeline ON public."ActivityPosts"(node_id, created_at DESC) WHERE deleted_at IS NULL;

-- Activity Reactions Indexes
CREATE INDEX idx_activity_reactions_post_id ON public."ActivityReactions"(post_id);
CREATE INDEX idx_activity_reactions_user_id ON public."ActivityReactions"(user_id);
CREATE INDEX idx_activity_reactions_type ON public."ActivityReactions"(reaction_type);

-- Composite index for aggregations
CREATE INDEX idx_activity_reactions_post_type ON public."ActivityReactions"(post_id, reaction_type);

-- ============================================================================
-- FUNCTIONS FOR AGGREGATIONS
-- ============================================================================

-- Function to get reply count for a post
CREATE OR REPLACE FUNCTION get_reply_count(post_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public."ActivityPosts"
        WHERE parent_post_id = post_uuid
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get share count for a post
CREATE OR REPLACE FUNCTION get_share_count(post_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public."ActivityPosts"
        WHERE shared_post_id = post_uuid
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get reaction counts by type for a post
CREATE OR REPLACE FUNCTION get_reaction_counts(post_uuid UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_object_agg(reaction_type, count), '{}'::jsonb)
        FROM (
            SELECT reaction_type, COUNT(*)::int as count
            FROM public."ActivityReactions"
            WHERE post_id = post_uuid
            GROUP BY reaction_type
        ) counts
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has reacted to a post
CREATE OR REPLACE FUNCTION user_has_reacted(post_uuid UUID, user_uuid UUID, reaction VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public."ActivityReactions"
        WHERE post_id = post_uuid
        AND user_id = user_uuid
        AND reaction_type = reaction
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_post_timestamp
    BEFORE UPDATE ON public."ActivityPosts"
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_post_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public."ActivityPosts" IS 'Twitter-like activity posts for nodes with support for replies and shares';
COMMENT ON TABLE public."ActivityReactions" IS 'Reactions (likes, loves, etc.) to activity posts';

COMMENT ON COLUMN public."ActivityPosts".mentioned_node_ids IS 'Array of node UUIDs mentioned in the post content';
COMMENT ON COLUMN public."ActivityPosts".attachment_ids IS 'Array of EvidenceFile UUIDs attached to the post';
COMMENT ON COLUMN public."ActivityPosts".is_reply IS 'True if this post is a reply to another post';
COMMENT ON COLUMN public."ActivityPosts".parent_post_id IS 'Reference to parent post if this is a reply';
COMMENT ON COLUMN public."ActivityPosts".is_share IS 'True if this post is a share/repost of another post';
COMMENT ON COLUMN public."ActivityPosts".shared_post_id IS 'Reference to original post if this is a share';

COMMENT ON FUNCTION get_reply_count IS 'Returns count of replies for a given post';
COMMENT ON FUNCTION get_share_count IS 'Returns count of shares for a given post';
COMMENT ON FUNCTION get_reaction_counts IS 'Returns JSONB object with reaction type counts for a post';
COMMENT ON FUNCTION user_has_reacted IS 'Check if a user has reacted with a specific reaction type to a post';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Note: Sample data would go here, but should only be inserted in dev/test environments
-- Example:
-- INSERT INTO public."ActivityPosts" (node_id, author_id, content)
-- SELECT n.id, u.id, 'This is a sample post about ' || n.title
-- FROM public."Nodes" n
-- CROSS JOIN public."Users" u
-- LIMIT 1;
