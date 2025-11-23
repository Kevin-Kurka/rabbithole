-- ============================================================================
-- Migration: Create Curator System Tables
-- Description: Four-tier curator system with roles, assignments, applications, and audit logs
-- ============================================================================

-- Curator Roles Table
CREATE TABLE IF NOT EXISTS public."CuratorRoles" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL UNIQUE,
    role_level INTEGER NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_curator_roles_role_name ON public."CuratorRoles"(role_name);
CREATE INDEX idx_curator_roles_role_level ON public."CuratorRoles"(role_level);

COMMENT ON TABLE public."CuratorRoles" IS 'Defines curator role types and their permissions';
COMMENT ON COLUMN public."CuratorRoles".role_level IS 'Hierarchical level: 1=Moderator, 2=Curator, 3=Senior Curator, 4=Admin';

-- User Curators Table
CREATE TABLE IF NOT EXISTS public."UserCurators" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by UUID,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Prevent duplicate role assignments
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_curators_user_id ON public."UserCurators"(user_id);
CREATE INDEX idx_user_curators_role_id ON public."UserCurators"(role_id);
CREATE INDEX idx_user_curators_assigned_by ON public."UserCurators"(assigned_by);

COMMENT ON TABLE public."UserCurators" IS 'Tracks which users have curator roles';

-- Curator Applications Table
CREATE TABLE IF NOT EXISTS public."CuratorApplications" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE,
    application_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_curator_applications_user_id ON public."CuratorApplications"(user_id);
CREATE INDEX idx_curator_applications_role_id ON public."CuratorApplications"(role_id);
CREATE INDEX idx_curator_applications_status ON public."CuratorApplications"(status);
CREATE INDEX idx_curator_applications_created_at ON public."CuratorApplications"(created_at DESC);

COMMENT ON TABLE public."CuratorApplications" IS 'Stores curator role applications';
COMMENT ON COLUMN public."CuratorApplications".status IS 'Application status: pending, approved, rejected';

-- Curator Audit Logs Table
CREATE TABLE IF NOT EXISTS public."CuratorAuditLogs" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curator_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_curator_audit_logs_curator_id ON public."CuratorAuditLogs"(curator_id);
CREATE INDEX idx_curator_audit_logs_action_type ON public."CuratorAuditLogs"(action_type);
CREATE INDEX idx_curator_audit_logs_target_type ON public."CuratorAuditLogs"(target_type);
CREATE INDEX idx_curator_audit_logs_target_id ON public."CuratorAuditLogs"(target_id);
CREATE INDEX idx_curator_audit_logs_created_at ON public."CuratorAuditLogs"(created_at DESC);

COMMENT ON TABLE public."CuratorAuditLogs" IS 'Immutable audit trail of curator actions';
COMMENT ON COLUMN public."CuratorAuditLogs".action_type IS 'Action performed: approve, reject, delete, edit, etc.';
COMMENT ON COLUMN public."CuratorAuditLogs".target_type IS 'Type of entity affected: node, edge, user, etc.';
