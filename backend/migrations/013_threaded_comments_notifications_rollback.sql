-- ============================================================================
-- Migration 013 Rollback: Remove Threaded Comments and Notifications
-- ============================================================================
-- Description: Rolls back threaded comments and notification system
-- Author: Backend Team
-- Date: 2025-10-10
-- ============================================================================

BEGIN;

RAISE NOTICE 'Starting Migration 013 rollback...';

-- ============================================================================
-- 1. DROP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_comment_thread(uuid);
RAISE NOTICE 'Dropped get_comment_thread function';

-- ============================================================================
-- 2. DROP TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS update_comments_updated_at ON public."Comments";
RAISE NOTICE 'Dropped update_comments_updated_at trigger';

-- ============================================================================
-- 3. DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS public.idx_comments_parent_id;
DROP INDEX IF EXISTS public.idx_comments_root;
RAISE NOTICE 'Dropped Comments indexes';

DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_unread;
DROP INDEX IF EXISTS public.idx_notifications_feed;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
RAISE NOTICE 'Dropped Notifications indexes';

-- ============================================================================
-- 4. DROP NOTIFICATIONS TABLE
-- ============================================================================

DROP TABLE IF EXISTS public."Notifications" CASCADE;
RAISE NOTICE 'Dropped Notifications table';

-- ============================================================================
-- 5. DROP COLUMNS FROM COMMENTS
-- ============================================================================

ALTER TABLE public."Comments" DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public."Comments" DROP COLUMN IF EXISTS parent_comment_id;
RAISE NOTICE 'Dropped columns from Comments table';

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

RAISE NOTICE 'Migration 013 rollback completed successfully';

COMMIT;
