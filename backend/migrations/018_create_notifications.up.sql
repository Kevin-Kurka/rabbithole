-- ============================================================================
-- Migration: Create Notifications Table
-- Description: User notification system for real-time alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."Notifications" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read_at TIMESTAMP,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient notification queries
CREATE INDEX idx_notifications_user_id ON public."Notifications"(user_id);
CREATE INDEX idx_notifications_read_at ON public."Notifications"(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON public."Notifications"(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public."Notifications"(user_id, created_at DESC) WHERE read_at IS NULL;

-- Comments
COMMENT ON TABLE public."Notifications" IS 'User notifications for system events and interactions';
COMMENT ON COLUMN public."Notifications".notification_type IS 'Type: mention, reply, challenge, curator_action, etc.';
COMMENT ON COLUMN public."Notifications".read_at IS 'Timestamp when user marked notification as read (NULL = unread)';
COMMENT ON COLUMN public."Notifications".link IS 'Optional deep link to related content';
