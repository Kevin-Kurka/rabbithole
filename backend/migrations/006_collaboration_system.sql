-- Migration: Real-Time Collaboration System
-- Date: 2024-10-09
-- Description: Adds tables for graph sharing, permissions, presence tracking, and activity logging

-- =====================================================
-- Graph Sharing and Permissions
-- =====================================================

-- Table for graph sharing permissions
CREATE TABLE IF NOT EXISTS public."GraphShares" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    shared_by uuid NOT NULL REFERENCES public."Users"(id),
    shared_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE(graph_id, user_id)
);

-- Table for pending graph invitations
CREATE TABLE IF NOT EXISTS public."GraphInvitations" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    token TEXT NOT NULL UNIQUE,
    invited_by uuid NOT NULL REFERENCES public."Users"(id),
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'))
);

-- =====================================================
-- Activity and Audit Logging
-- =====================================================

-- Table for graph activity feed
CREATE TABLE IF NOT EXISTS public."GraphActivity" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'node_created', 'node_updated', 'node_deleted',
        'edge_created', 'edge_updated', 'edge_deleted',
        'comment_added', 'comment_updated', 'comment_deleted',
        'graph_shared', 'permission_changed', 'user_joined', 'user_left'
    )),
    entity_type TEXT CHECK (entity_type IN ('node', 'edge', 'comment', 'graph', 'user')),
    entity_id uuid,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB, -- Additional context like cursor position, selection, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Real-Time Presence and Collaboration
-- =====================================================

-- Table for tracking user presence in graphs
CREATE TABLE IF NOT EXISTS public."UserPresence" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'idle', 'offline')),
    cursor_position JSONB, -- {nodeId: uuid, x: number, y: number}
    selected_nodes uuid[], -- Array of selected node IDs
    selected_edges uuid[], -- Array of selected edge IDs
    viewport JSONB, -- {x: number, y: number, zoom: number}
    last_heartbeat TIMESTAMPTZ DEFAULT now(),
    connected_at TIMESTAMPTZ DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    UNIQUE(user_id, graph_id, session_id)
);

-- =====================================================
-- Optimistic Locking and Conflict Resolution
-- =====================================================

-- Table for graph-level locks (for batch operations)
CREATE TABLE IF NOT EXISTS public."GraphLocks" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),
    lock_type TEXT NOT NULL CHECK (lock_type IN ('read', 'write', 'exclusive')),
    entity_type TEXT CHECK (entity_type IN ('graph', 'node', 'edge')),
    entity_id uuid,
    acquired_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 seconds',
    released_at TIMESTAMPTZ,
    UNIQUE(graph_id, entity_type, entity_id)
);

-- =====================================================
-- Operational Transform History
-- =====================================================

-- Table for storing OT operations for conflict resolution
CREATE TABLE IF NOT EXISTS public."OperationHistory" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),
    session_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN (
        'insert', 'delete', 'update', 'move', 'transform'
    )),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('node', 'edge', 'property')),
    entity_id uuid,
    operation JSONB NOT NULL, -- The actual OT operation
    version BIGINT NOT NULL, -- Version number for ordering
    parent_version BIGINT, -- For branching operations
    transformed_from uuid REFERENCES public."OperationHistory"(id),
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Notification Preferences
-- =====================================================

-- Table for user notification preferences
CREATE TABLE IF NOT EXISTS public."NotificationPreferences" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    graph_id uuid REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    notification_types JSONB DEFAULT '{"mentions": true, "comments": true, "changes": true, "shares": true}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, graph_id)
);

-- =====================================================
-- Collaboration Sessions
-- =====================================================

-- Table for tracking collaboration sessions
CREATE TABLE IF NOT EXISTS public."CollaborationSessions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL UNIQUE,
    graph_id uuid NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),
    websocket_id TEXT,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT now(),
    operations_count INTEGER DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- GraphShares indexes
CREATE INDEX idx_graph_shares_graph_id ON public."GraphShares"(graph_id);
CREATE INDEX idx_graph_shares_user_id ON public."GraphShares"(user_id);
CREATE INDEX idx_graph_shares_permission ON public."GraphShares"(permission);

-- GraphInvitations indexes
CREATE INDEX idx_graph_invitations_graph_id ON public."GraphInvitations"(graph_id);
CREATE INDEX idx_graph_invitations_email ON public."GraphInvitations"(email);
CREATE INDEX idx_graph_invitations_token ON public."GraphInvitations"(token);
CREATE INDEX idx_graph_invitations_status ON public."GraphInvitations"(status);
CREATE INDEX idx_graph_invitations_expires ON public."GraphInvitations"(expires_at);

-- GraphActivity indexes
CREATE INDEX idx_graph_activity_graph_id ON public."GraphActivity"(graph_id);
CREATE INDEX idx_graph_activity_user_id ON public."GraphActivity"(user_id);
CREATE INDEX idx_graph_activity_action_type ON public."GraphActivity"(action_type);
CREATE INDEX idx_graph_activity_entity ON public."GraphActivity"(entity_type, entity_id);
CREATE INDEX idx_graph_activity_created_at ON public."GraphActivity"(created_at DESC);

-- UserPresence indexes
CREATE INDEX idx_user_presence_graph_id ON public."UserPresence"(graph_id);
CREATE INDEX idx_user_presence_user_id ON public."UserPresence"(user_id);
CREATE INDEX idx_user_presence_status ON public."UserPresence"(status);
CREATE INDEX idx_user_presence_heartbeat ON public."UserPresence"(last_heartbeat);

-- GraphLocks indexes
CREATE INDEX idx_graph_locks_graph_id ON public."GraphLocks"(graph_id);
CREATE INDEX idx_graph_locks_entity ON public."GraphLocks"(entity_type, entity_id);
CREATE INDEX idx_graph_locks_expires ON public."GraphLocks"(expires_at);

-- OperationHistory indexes
CREATE INDEX idx_operation_history_graph_id ON public."OperationHistory"(graph_id);
CREATE INDEX idx_operation_history_version ON public."OperationHistory"(graph_id, version);
CREATE INDEX idx_operation_history_user ON public."OperationHistory"(user_id, session_id);

-- CollaborationSessions indexes
CREATE INDEX idx_collab_sessions_graph_id ON public."CollaborationSessions"(graph_id);
CREATE INDEX idx_collab_sessions_user_id ON public."CollaborationSessions"(user_id);
CREATE INDEX idx_collab_sessions_active ON public."CollaborationSessions"(ended_at) WHERE ended_at IS NULL;

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to automatically expire old presence records
CREATE OR REPLACE FUNCTION cleanup_expired_presence() RETURNS void AS $$
BEGIN
    UPDATE public."UserPresence"
    SET status = 'offline', disconnected_at = now()
    WHERE status != 'offline'
    AND last_heartbeat < now() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Function to expire old locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks() RETURNS void AS $$
BEGIN
    UPDATE public."GraphLocks"
    SET released_at = now()
    WHERE released_at IS NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update graph's updated_at when activity occurs
CREATE OR REPLACE FUNCTION update_graph_timestamp() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public."Graphs"
    SET updated_at = now()
    WHERE id = NEW.graph_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_graph_on_activity
    AFTER INSERT ON public."GraphActivity"
    FOR EACH ROW
    EXECUTE FUNCTION update_graph_timestamp();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE public."GraphShares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GraphInvitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GraphActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserPresence" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would be defined based on application's authentication context
-- Example policies (to be customized based on auth implementation):

-- Users can see shares for graphs they have access to
-- CREATE POLICY graph_shares_select ON public."GraphShares"
--     FOR SELECT
--     USING (user_id = current_user_id() OR graph_id IN (
--         SELECT graph_id FROM public."GraphShares" WHERE user_id = current_user_id()
--     ));

-- =====================================================
-- Initial Data and Configuration
-- =====================================================

-- Add collaboration-related fields to existing Users table if not present
ALTER TABLE public."Users"
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add collaboration fields to Graphs table
ALTER TABLE public."Graphs"
ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_collaborators INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{"allowInvites": true, "requireApproval": false}';

-- =====================================================
-- Maintenance Jobs (to be scheduled via cron or similar)
-- =====================================================

-- Job 1: Clean up expired presence (run every minute)
-- SELECT cleanup_expired_presence();

-- Job 2: Clean up expired locks (run every 30 seconds)
-- SELECT cleanup_expired_locks();

-- Job 3: Archive old activity logs (run daily)
-- INSERT INTO public."GraphActivityArchive" SELECT * FROM public."GraphActivity" WHERE created_at < now() - INTERVAL '90 days';
-- DELETE FROM public."GraphActivity" WHERE created_at < now() - INTERVAL '90 days';

COMMENT ON TABLE public."GraphShares" IS 'Stores graph access permissions for users';
COMMENT ON TABLE public."GraphInvitations" IS 'Pending invitations to collaborate on graphs';
COMMENT ON TABLE public."GraphActivity" IS 'Audit log of all graph-related activities';
COMMENT ON TABLE public."UserPresence" IS 'Real-time presence tracking for collaborative editing';
COMMENT ON TABLE public."GraphLocks" IS 'Pessimistic locking for conflict prevention';
COMMENT ON TABLE public."OperationHistory" IS 'Operational Transform history for conflict resolution';
COMMENT ON TABLE public."CollaborationSessions" IS 'WebSocket session tracking and analytics';