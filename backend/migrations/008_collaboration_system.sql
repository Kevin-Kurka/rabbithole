-- =====================================================
-- Collaboration System Migration
-- Wave 5, Phase 5.1
-- Real-time collaboration features for Rabbit Hole
-- =====================================================

-- =====================================================
-- Chat Messages Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public."ChatMessages" (
  id UUID PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  archived_at TIMESTAMP,
  CONSTRAINT chat_message_not_empty CHECK (LENGTH(TRIM(message)) > 0),
  CONSTRAINT chat_message_length CHECK (LENGTH(message) <= 1000)
);

-- Indexes for efficient queries
CREATE INDEX idx_chat_messages_graph_id ON public."ChatMessages"(graph_id);
CREATE INDEX idx_chat_messages_user_id ON public."ChatMessages"(user_id);
CREATE INDEX idx_chat_messages_created_at ON public."ChatMessages"(created_at DESC);
CREATE INDEX idx_chat_messages_active ON public."ChatMessages"(graph_id, created_at DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- User Presence Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public."UserPresence" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'online',
  cursor_position JSONB,
  selected_nodes UUID[],
  selected_edges UUID[],
  viewport JSONB,
  last_heartbeat TIMESTAMP NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  CONSTRAINT unique_user_graph_session UNIQUE (user_id, graph_id, session_id),
  CONSTRAINT valid_status CHECK (status IN ('online', 'idle', 'offline'))
);

-- Indexes for presence queries
CREATE INDEX idx_user_presence_graph_id ON public."UserPresence"(graph_id);
CREATE INDEX idx_user_presence_user_id ON public."UserPresence"(user_id);
CREATE INDEX idx_user_presence_status ON public."UserPresence"(status);
CREATE INDEX idx_user_presence_last_heartbeat ON public."UserPresence"(last_heartbeat);
CREATE INDEX idx_user_presence_active ON public."UserPresence"(graph_id, status, last_heartbeat)
  WHERE status != 'offline';

-- =====================================================
-- Graph Shares Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public."GraphShares" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL,
  shared_by UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  shared_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  CONSTRAINT unique_graph_user_share UNIQUE (graph_id, user_id),
  CONSTRAINT valid_permission CHECK (permission IN ('view', 'edit', 'admin'))
);

-- Indexes for share queries
CREATE INDEX idx_graph_shares_graph_id ON public."GraphShares"(graph_id);
CREATE INDEX idx_graph_shares_user_id ON public."GraphShares"(user_id);
CREATE INDEX idx_graph_shares_permission ON public."GraphShares"(permission);
CREATE INDEX idx_graph_shares_active ON public."GraphShares"(graph_id, user_id)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- =====================================================
-- Graph Invitations Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public."GraphInvitations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  permission VARCHAR(50) NOT NULL,
  token UUID NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP,
  CONSTRAINT valid_invitation_permission CHECK (permission IN ('view', 'edit', 'admin')),
  CONSTRAINT valid_invitation_status CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'))
);

-- Indexes for invitation queries
CREATE INDEX idx_graph_invitations_graph_id ON public."GraphInvitations"(graph_id);
CREATE INDEX idx_graph_invitations_email ON public."GraphInvitations"(email);
CREATE INDEX idx_graph_invitations_token ON public."GraphInvitations"(token);
CREATE INDEX idx_graph_invitations_status ON public."GraphInvitations"(status);
CREATE INDEX idx_graph_invitations_pending ON public."GraphInvitations"(graph_id, email, status)
  WHERE status = 'pending' AND expires_at > NOW();

-- =====================================================
-- Graph Activity Table (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS public."GraphActivity" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP
);

-- Indexes for activity queries
CREATE INDEX idx_graph_activity_graph_id ON public."GraphActivity"(graph_id);
CREATE INDEX idx_graph_activity_user_id ON public."GraphActivity"(user_id);
CREATE INDEX idx_graph_activity_action_type ON public."GraphActivity"(action_type);
CREATE INDEX idx_graph_activity_created_at ON public."GraphActivity"(created_at DESC);
CREATE INDEX idx_graph_activity_recent ON public."GraphActivity"(graph_id, created_at DESC)
  WHERE archived_at IS NULL;

-- =====================================================
-- Collaboration Sessions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public."CollaborationSessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL UNIQUE,
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  websocket_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  operations_count INTEGER NOT NULL DEFAULT 0,
  bytes_sent BIGINT NOT NULL DEFAULT 0,
  bytes_received BIGINT NOT NULL DEFAULT 0
);

-- Indexes for session queries
CREATE INDEX idx_collaboration_sessions_session_id ON public."CollaborationSessions"(session_id);
CREATE INDEX idx_collaboration_sessions_graph_id ON public."CollaborationSessions"(graph_id);
CREATE INDEX idx_collaboration_sessions_user_id ON public."CollaborationSessions"(user_id);
CREATE INDEX idx_collaboration_sessions_active ON public."CollaborationSessions"(graph_id, user_id)
  WHERE ended_at IS NULL;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to clean up expired presence records
CREATE OR REPLACE FUNCTION cleanup_expired_presence()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Mark users as offline after 2 minutes of inactivity
  UPDATE public."UserPresence"
  SET status = 'offline', disconnected_at = NOW()
  WHERE status != 'offline'
    AND last_heartbeat < NOW() - INTERVAL '2 minutes';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public."GraphInvitations"
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old activities
CREATE OR REPLACE FUNCTION archive_old_activities(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public."GraphActivity"
  SET archived_at = NOW()
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND archived_at IS NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update last_activity on presence heartbeat
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."CollaborationSessions"
  SET last_activity = NOW()
  WHERE session_id = NEW.session_id
    AND ended_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
AFTER UPDATE OF last_heartbeat ON public."UserPresence"
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- =====================================================
-- Permissions
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ChatMessages" TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."UserPresence" TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."GraphShares" TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."GraphInvitations" TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."GraphActivity" TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."CollaborationSessions" TO postgres;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public."ChatMessages" IS 'Real-time chat messages for graph collaboration';
COMMENT ON TABLE public."UserPresence" IS 'Tracks active users and their cursor positions in graphs';
COMMENT ON TABLE public."GraphShares" IS 'Manages graph sharing and access permissions';
COMMENT ON TABLE public."GraphInvitations" IS 'Handles graph collaboration invitations';
COMMENT ON TABLE public."GraphActivity" IS 'Logs all activities and changes in graphs';
COMMENT ON TABLE public."CollaborationSessions" IS 'Tracks WebSocket collaboration sessions';

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Collaboration system migration completed successfully!';
  RAISE NOTICE 'Tables created: ChatMessages, UserPresence, GraphShares, GraphInvitations, GraphActivity, CollaborationSessions';
  RAISE NOTICE 'Indexes created for optimal query performance';
  RAISE NOTICE 'Helper functions and triggers installed';
END $$;
