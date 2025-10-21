-- ============================================================================
-- Migration 013: Threaded Comments and Notifications (FIXED VERSION)
-- ============================================================================
-- Description: Adds comment threading and user notification system
-- Dependencies: Requires Users and Comments tables from migration 001
-- Author: Backend Team
-- Date: 2025-10-10
-- Version: 2.0 (Fixed)
-- ============================================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ADD THREADING TO COMMENTS
-- ============================================================================

-- Add parent_comment_id for reply chains
ALTER TABLE public."Comments"
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public."Comments"(id) ON DELETE CASCADE;

-- Add updated_at for tracking edits
ALTER TABLE public."Comments"
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for efficient thread traversal
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public."Comments" (parent_comment_id);

-- Index for finding root comments (WHERE parent_comment_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_comments_root ON public."Comments" (target_node_id, target_edge_id)
WHERE parent_comment_id IS NULL;

-- ============================================================================
-- 2. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."Notifications" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('mention', 'reply', 'challenge', 'promotion', 'vote')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    entity_type TEXT CHECK (entity_type IN ('node', 'edge', 'comment', 'graph', 'challenge')),
    entity_id uuid,
    related_user_id uuid REFERENCES public."Users"(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- User's notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public."Notifications" (user_id);

-- Unread notifications (for badge count)
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public."Notifications" (user_id, read) WHERE read = false;

-- Notification feed (user + chronological)
CREATE INDEX IF NOT EXISTS idx_notifications_feed ON public."Notifications" (user_id, created_at DESC);

-- Cleanup old notifications (for maintenance jobs)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public."Notifications" (created_at DESC);

-- ============================================================================
-- 4. CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
-- ============================================================================

-- Note: update_updated_at_column() function already exists from migration 006
-- We're just creating the trigger here

DROP TRIGGER IF EXISTS update_comments_updated_at ON public."Comments";

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public."Comments"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ADD HELPER FUNCTION FOR THREADING
-- ============================================================================

-- Function to get all replies recursively
CREATE OR REPLACE FUNCTION get_comment_thread(root_comment_id uuid)
RETURNS TABLE (
    id uuid,
    text TEXT,
    author_id uuid,
    parent_comment_id uuid,
    depth INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: root comment
        SELECT
            c.id,
            c.text,
            c.author_id,
            c.parent_comment_id,
            0 AS depth,
            c.created_at
        FROM public."Comments" c
        WHERE c.id = root_comment_id

        UNION ALL

        -- Recursive case: replies
        SELECT
            c.id,
            c.text,
            c.author_id,
            c.parent_comment_id,
            ct.depth + 1,
            c.created_at
        FROM public."Comments" c
        INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
    )
    SELECT * FROM comment_tree ORDER BY depth, created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To rollback, run: 013_threaded_comments_notifications_rollback.sql
