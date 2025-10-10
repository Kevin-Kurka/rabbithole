-- ============================================================================
-- Migration 006: Curator Roles & Permissions System (Phase 3)
-- ============================================================================
-- Description: Implements a comprehensive curator system for Level 0 content
--              management. Includes role definitions, permissions, application
--              workflow, peer reviews, and audit logging for accountability.
--
-- Author: Curator System Architecture Team
-- Date: 2025-10-09
-- Dependencies:
--   - Requires base schema with Users, Nodes, Edges tables
--   - Requires 004_challenge_system.sql for UserReputation integration
-- ============================================================================

-- ============================================================================
-- ER DIAGRAM (ASCII)
-- ============================================================================
--
--  ┌─────────────────┐
--  │      Users      │
--  └─────────────────┘
--          │
--          │ applies for role
--          │
--          ▼
--  ┌──────────────────────────┐
--  │  CuratorApplications     │
--  │  ──────────────────────  │
--  │  + user_id (FK)          │
--  │  + role_id (FK)          │
--  │  + status                │
--  │  + application_statement │
--  │  + expertise_areas       │
--  │  + sample_contributions  │
--  │  + votes_for/against     │
--  │  + decision_reason       │
--  └──────────────────────────┘
--          │
--          │ approved to become
--          │
--          ▼
--  ┌──────────────────────────┐         ┌──────────────────┐
--  │     UserCurators         │◄────────│  CuratorRoles    │
--  │  ──────────────────────  │  has    │  ──────────────  │
--  │  + user_id (FK)          │         │  + role_name     │
--  │  + role_id (FK)          │         │  + description   │
--  │  + assigned_at           │         │  + tier          │
--  │  + status                │         │  + requirements  │
--  └──────────────────────────┘         └──────────────────┘
--          │                                      │
--          │ granted                              │ defines
--          │                                      │
--          ▼                                      ▼
--  ┌──────────────────────────┐         ┌──────────────────────┐
--  │  CuratorPermissions      │         │  RolePermissions     │
--  │  ──────────────────────  │         │  ──────────────────  │
--  │  + user_curator_id (FK)  │         │  + role_id (FK)      │
--  │  + permission_type       │         │  + permission_type   │
--  │  + resource_type         │         │  + resource_type     │
--  │  + can_create            │         │  + can_create        │
--  │  + can_edit              │         │  + can_edit          │
--  │  + can_approve           │         │  + can_approve       │
--  │  + can_delete            │         │  + can_delete        │
--  └──────────────────────────┘         └──────────────────────┘
--          │
--          │ tracked by
--          │
--          ▼
--  ┌──────────────────────────┐
--  │  CuratorAuditLog         │
--  │  ──────────────────────  │
--  │  + curator_id (FK)       │
--  │  + action_type           │
--  │  + resource_type         │
--  │  + resource_id           │
--  │  + changes               │
--  │  + ip_address            │
--  │  + user_agent            │
--  └──────────────────────────┘
--          │
--          │ peer reviewed by
--          │
--          ▼
--  ┌──────────────────────────┐
--  │   CuratorReviews         │
--  │  ──────────────────────  │
--  │  + audit_log_id (FK)     │
--  │  + reviewer_id (FK)      │
--  │  + review_type           │
--  │  + rating                │
--  │  + comments              │
--  └──────────────────────────┘
--
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: CuratorRoles
-- ============================================================================
-- Defines the different curator roles with their responsibilities and tiers
-- Each role has specific expertise areas and permission levels

CREATE TABLE IF NOT EXISTS public."CuratorRoles" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Role identification
    role_name TEXT NOT NULL UNIQUE CHECK (role_name IN (
        'community_curator',
        'domain_expert',
        'methodology_specialist',
        'fact_checker',
        'source_validator'
    )),

    -- Role details
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    responsibilities TEXT[] NOT NULL DEFAULT '{}',

    -- Tier system (higher tier = more authority)
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 5),

    -- Requirements for this role
    min_reputation_required INTEGER NOT NULL DEFAULT 1000,
    min_contributions_required INTEGER NOT NULL DEFAULT 50,
    expertise_areas_required TEXT[] NOT NULL DEFAULT '{}',

    -- Application process
    requires_application BOOLEAN NOT NULL DEFAULT true,
    requires_community_vote BOOLEAN NOT NULL DEFAULT true,
    min_votes_required INTEGER DEFAULT 10,
    approval_threshold REAL DEFAULT 0.7 CHECK (approval_threshold >= 0.5 AND approval_threshold <= 1.0),

    -- Metadata
    icon TEXT,
    color TEXT,
    badge_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_curator_roles_tier ON public."CuratorRoles"(tier);
CREATE INDEX idx_curator_roles_active ON public."CuratorRoles"(is_active);

-- ============================================================================
-- TABLE: RolePermissions
-- ============================================================================
-- Defines what each curator role is allowed to do
-- Granular permission system for different resource types

CREATE TABLE IF NOT EXISTS public."RolePermissions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id uuid NOT NULL REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE,

    -- Permission scope
    permission_type TEXT NOT NULL CHECK (permission_type IN (
        'level_0_content',
        'level_0_nodes',
        'level_0_edges',
        'veracity_approval',
        'methodology_validation',
        'source_validation',
        'curator_review',
        'user_moderation',
        'application_review'
    )),

    -- Resource type this permission applies to
    resource_type TEXT CHECK (resource_type IN (
        'node',
        'edge',
        'source',
        'methodology',
        'user',
        'application',
        'challenge',
        'all'
    )),

    -- CRUD permissions
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_reject BOOLEAN NOT NULL DEFAULT false,

    -- Advanced permissions
    can_promote_to_level_0 BOOLEAN NOT NULL DEFAULT false,
    can_demote_from_level_0 BOOLEAN NOT NULL DEFAULT false,
    can_assign_veracity_score BOOLEAN NOT NULL DEFAULT false,
    can_override_consensus BOOLEAN NOT NULL DEFAULT false,

    -- Constraints and limits
    max_daily_actions INTEGER,
    requires_peer_review BOOLEAN NOT NULL DEFAULT false,
    requires_second_approval BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique permission per role and type
    UNIQUE(role_id, permission_type, resource_type)
);

-- Create indexes for permission checks
CREATE INDEX idx_role_permissions_role ON public."RolePermissions"(role_id);
CREATE INDEX idx_role_permissions_type ON public."RolePermissions"(permission_type);

-- ============================================================================
-- TABLE: UserCurators
-- ============================================================================
-- Links users to their curator roles
-- Tracks curator status, performance, and accountability metrics

CREATE TABLE IF NOT EXISTS public."UserCurators" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'suspended',
        'under_review',
        'retired',
        'revoked'
    )),

    -- Assignment details
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by_user_id uuid REFERENCES public."Users"(id),
    expires_at TIMESTAMPTZ, -- NULL means no expiration

    -- Expertise areas for this curator
    expertise_areas TEXT[] NOT NULL DEFAULT '{}',
    specialization_tags TEXT[] DEFAULT '{}',

    -- Performance metrics
    total_actions INTEGER NOT NULL DEFAULT 0,
    approved_actions INTEGER NOT NULL DEFAULT 0,
    rejected_actions INTEGER NOT NULL DEFAULT 0,
    overturned_actions INTEGER NOT NULL DEFAULT 0,

    -- Quality scores
    peer_review_score REAL DEFAULT 0.0 CHECK (peer_review_score >= 0.0 AND peer_review_score <= 1.0),
    community_trust_score REAL DEFAULT 0.0 CHECK (community_trust_score >= 0.0 AND community_trust_score <= 1.0),
    accuracy_rate REAL DEFAULT 0.0 CHECK (accuracy_rate >= 0.0 AND accuracy_rate <= 1.0),

    -- Accountability tracking
    warnings_received INTEGER NOT NULL DEFAULT 0,
    last_warning_at TIMESTAMPTZ,
    suspension_count INTEGER NOT NULL DEFAULT 0,
    last_suspended_at TIMESTAMPTZ,

    -- Review and renewal
    last_review_date TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    review_notes TEXT,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure a user can only have one active role of each type
    UNIQUE(user_id, role_id, status)
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_curators_user ON public."UserCurators"(user_id);
CREATE INDEX idx_user_curators_role ON public."UserCurators"(role_id);
CREATE INDEX idx_user_curators_status ON public."UserCurators"(status);
CREATE INDEX idx_user_curators_active ON public."UserCurators"(user_id, status) WHERE status = 'active';
CREATE INDEX idx_user_curators_review_due ON public."UserCurators"(next_review_date) WHERE status = 'active';

-- ============================================================================
-- TABLE: CuratorApplications
-- ============================================================================
-- Manages the application process for becoming a curator
-- Includes community voting and approval workflow

CREATE TABLE IF NOT EXISTS public."CuratorApplications" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Applicant details
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE,

    -- Application status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'draft',
        'submitted',
        'under_review',
        'voting',
        'approved',
        'rejected',
        'withdrawn'
    )),

    -- Application content
    application_statement TEXT NOT NULL,
    motivation TEXT NOT NULL,
    expertise_areas TEXT[] NOT NULL DEFAULT '{}',
    relevant_experience TEXT,
    sample_contributions TEXT[], -- IDs of nodes/edges they've contributed

    -- Supporting information
    reputation_at_application INTEGER NOT NULL,
    contributions_at_application INTEGER NOT NULL,
    challenges_won INTEGER DEFAULT 0,
    methodologies_completed INTEGER DEFAULT 0,

    -- Voting mechanism
    voting_started_at TIMESTAMPTZ,
    voting_deadline TIMESTAMPTZ,
    votes_for INTEGER NOT NULL DEFAULT 0,
    votes_against INTEGER NOT NULL DEFAULT 0,
    votes_abstain INTEGER NOT NULL DEFAULT 0,
    total_voting_weight REAL NOT NULL DEFAULT 0.0,

    -- Review and decision
    reviewed_by_user_id uuid REFERENCES public."Users"(id),
    reviewed_at TIMESTAMPTZ,
    decision TEXT CHECK (decision IN ('approved', 'rejected', 'needs_revision', NULL)),
    decision_reason TEXT,
    reviewer_notes TEXT,

    -- Conditions and requirements
    conditions_for_approval TEXT,
    probation_period_days INTEGER,

    -- Timeline
    submitted_at TIMESTAMPTZ,
    decision_made_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate applications
    UNIQUE(user_id, role_id, status)
);

-- Create indexes for efficient querying
CREATE INDEX idx_curator_applications_user ON public."CuratorApplications"(user_id);
CREATE INDEX idx_curator_applications_role ON public."CuratorApplications"(role_id);
CREATE INDEX idx_curator_applications_status ON public."CuratorApplications"(status);
CREATE INDEX idx_curator_applications_voting ON public."CuratorApplications"(status, voting_deadline)
    WHERE status = 'voting';

-- ============================================================================
-- TABLE: CuratorApplicationVotes
-- ============================================================================
-- Tracks community votes on curator applications

CREATE TABLE IF NOT EXISTS public."CuratorApplicationVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES public."CuratorApplications"(id) ON DELETE CASCADE,
    voter_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Vote details
    vote TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
    vote_weight REAL NOT NULL DEFAULT 1.0,

    -- Rationale (optional but encouraged)
    rationale TEXT,

    -- Metadata
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,

    -- Ensure one vote per user per application
    UNIQUE(application_id, voter_id)
);

-- Create indexes for vote aggregation
CREATE INDEX idx_application_votes_application ON public."CuratorApplicationVotes"(application_id);
CREATE INDEX idx_application_votes_voter ON public."CuratorApplicationVotes"(voter_id);

-- ============================================================================
-- TABLE: CuratorAuditLog
-- ============================================================================
-- Comprehensive audit trail of all curator actions
-- Critical for transparency and accountability

CREATE TABLE IF NOT EXISTS public."CuratorAuditLog" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Actor identification
    curator_id uuid NOT NULL REFERENCES public."UserCurators"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN (
        'create_node',
        'edit_node',
        'delete_node',
        'create_edge',
        'edit_edge',
        'delete_edge',
        'approve_veracity',
        'reject_veracity',
        'promote_to_level_0',
        'demote_from_level_0',
        'validate_source',
        'invalidate_source',
        'validate_methodology',
        'approve_application',
        'reject_application',
        'assign_curator_role',
        'revoke_curator_role',
        'moderate_content',
        'override_consensus',
        'other'
    )),

    -- Resource affected
    resource_type TEXT NOT NULL CHECK (resource_type IN (
        'node',
        'edge',
        'source',
        'methodology',
        'application',
        'user',
        'curator',
        'challenge',
        'veracity_score'
    )),
    resource_id uuid NOT NULL,

    -- Change details
    old_value JSONB,
    new_value JSONB,
    changes JSONB, -- Structured diff of changes

    -- Context and justification
    reason TEXT,
    notes TEXT,
    related_evidence_ids uuid[],

    -- Review status
    requires_peer_review BOOLEAN NOT NULL DEFAULT false,
    peer_reviewed BOOLEAN NOT NULL DEFAULT false,
    peer_review_status TEXT CHECK (peer_review_status IN (
        'pending',
        'approved',
        'flagged',
        'overturned',
        NULL
    )),

    -- Technical metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    -- Timestamp
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for audit queries
CREATE INDEX idx_curator_audit_curator ON public."CuratorAuditLog"(curator_id);
CREATE INDEX idx_curator_audit_user ON public."CuratorAuditLog"(user_id);
CREATE INDEX idx_curator_audit_action ON public."CuratorAuditLog"(action_type);
CREATE INDEX idx_curator_audit_resource ON public."CuratorAuditLog"(resource_type, resource_id);
CREATE INDEX idx_curator_audit_time ON public."CuratorAuditLog"(performed_at DESC);
CREATE INDEX idx_curator_audit_review ON public."CuratorAuditLog"(requires_peer_review, peer_reviewed)
    WHERE requires_peer_review = true AND peer_reviewed = false;

-- ============================================================================
-- TABLE: CuratorReviews
-- ============================================================================
-- Peer reviews of curator actions for quality control and accountability

CREATE TABLE IF NOT EXISTS public."CuratorReviews" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Review target
    audit_log_id uuid NOT NULL REFERENCES public."CuratorAuditLog"(id) ON DELETE CASCADE,

    -- Reviewer identification
    reviewer_id uuid NOT NULL REFERENCES public."UserCurators"(id) ON DELETE CASCADE,
    reviewer_user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Review details
    review_type TEXT NOT NULL CHECK (review_type IN (
        'routine_review',
        'flag_investigation',
        'quality_check',
        'appeal_review',
        'audit_review'
    )),

    -- Assessment
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    verdict TEXT NOT NULL CHECK (verdict IN (
        'approved',
        'approved_with_notes',
        'flagged_minor',
        'flagged_major',
        'recommend_overturn',
        'recommend_warning'
    )),

    -- Detailed feedback
    comments TEXT NOT NULL,
    specific_concerns TEXT[],
    recommendations TEXT[],

    -- Follow-up actions
    action_required BOOLEAN NOT NULL DEFAULT false,
    action_taken TEXT,
    escalated BOOLEAN NOT NULL DEFAULT false,
    escalated_to_user_id uuid REFERENCES public."Users"(id),

    -- Metadata
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one review per reviewer per audit log entry
    UNIQUE(audit_log_id, reviewer_id)
);

-- Create indexes for review queries
CREATE INDEX idx_curator_reviews_audit ON public."CuratorReviews"(audit_log_id);
CREATE INDEX idx_curator_reviews_reviewer ON public."CuratorReviews"(reviewer_id);
CREATE INDEX idx_curator_reviews_verdict ON public."CuratorReviews"(verdict);
CREATE INDEX idx_curator_reviews_time ON public."CuratorReviews"(reviewed_at DESC);

-- ============================================================================
-- TABLE: CuratorPermissions
-- ============================================================================
-- User-specific permission overrides (for fine-grained control)

CREATE TABLE IF NOT EXISTS public."CuratorPermissions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_curator_id uuid NOT NULL REFERENCES public."UserCurators"(id) ON DELETE CASCADE,

    -- Permission details (mirrors RolePermissions structure)
    permission_type TEXT NOT NULL CHECK (permission_type IN (
        'level_0_content',
        'level_0_nodes',
        'level_0_edges',
        'veracity_approval',
        'methodology_validation',
        'source_validation',
        'curator_review',
        'user_moderation',
        'application_review'
    )),

    resource_type TEXT CHECK (resource_type IN (
        'node',
        'edge',
        'source',
        'methodology',
        'user',
        'application',
        'challenge',
        'all'
    )),

    -- Override type
    override_type TEXT NOT NULL CHECK (override_type IN (
        'grant', -- Grants permission not in role
        'revoke', -- Revokes permission from role
        'modify' -- Modifies limits/constraints
    )),

    -- CRUD permissions (when override_type = 'grant' or 'revoke')
    can_create BOOLEAN,
    can_read BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    can_approve BOOLEAN,
    can_reject BOOLEAN,
    can_promote_to_level_0 BOOLEAN,
    can_demote_from_level_0 BOOLEAN,

    -- Constraints (when override_type = 'modify')
    max_daily_actions INTEGER,

    -- Justification and metadata
    granted_by_user_id uuid NOT NULL REFERENCES public."Users"(id),
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique override per curator and permission type
    UNIQUE(user_curator_id, permission_type, resource_type)
);

-- Create indexes for permission checks
CREATE INDEX idx_curator_permissions_curator ON public."CuratorPermissions"(user_curator_id);
CREATE INDEX idx_curator_permissions_type ON public."CuratorPermissions"(permission_type);
CREATE INDEX idx_curator_permissions_expires ON public."CuratorPermissions"(expires_at)
    WHERE expires_at IS NOT NULL;

-- ============================================================================
-- SEED DATA: Curator Roles
-- ============================================================================
-- Insert the five core curator roles

INSERT INTO public."CuratorRoles" (
    role_name,
    display_name,
    description,
    responsibilities,
    tier,
    min_reputation_required,
    min_contributions_required,
    expertise_areas_required
) VALUES
(
    'community_curator',
    'Community Curator',
    'General-purpose curator responsible for reviewing community contributions and maintaining platform quality standards.',
    ARRAY[
        'Review community-submitted content for promotion to Level 0',
        'Moderate discussions and resolve disputes',
        'Ensure adherence to community guidelines',
        'Provide feedback on user contributions'
    ],
    1,
    500,
    25,
    ARRAY['community_moderation', 'content_review']
),
(
    'domain_expert',
    'Domain Expert',
    'Subject matter expert with deep knowledge in specific fields, responsible for validating domain-specific claims.',
    ARRAY[
        'Validate claims within their area of expertise',
        'Assess the quality and relevance of domain-specific evidence',
        'Provide expert judgment on complex topics',
        'Mentor other curators in their domain'
    ],
    3,
    1500,
    75,
    ARRAY['domain_expertise', 'advanced_research']
),
(
    'methodology_specialist',
    'Methodology Specialist',
    'Expert in research methodologies who ensures investigations follow rigorous, systematic approaches.',
    ARRAY[
        'Validate that investigations follow proper methodologies',
        'Assess the rigor of research approaches',
        'Guide users in applying formal inquiry methods',
        'Review and approve methodology templates'
    ],
    3,
    1500,
    75,
    ARRAY['methodology', 'research_methods', 'logic']
),
(
    'fact_checker',
    'Fact Checker',
    'Specialist in verifying factual claims using primary sources and established verification techniques.',
    ARRAY[
        'Verify factual accuracy of claims using primary sources',
        'Cross-reference information across multiple sources',
        'Identify misinformation and disinformation',
        'Document verification processes thoroughly'
    ],
    2,
    1000,
    50,
    ARRAY['fact_checking', 'source_verification']
),
(
    'source_validator',
    'Source Validator',
    'Expert in assessing source credibility, authenticity, and identifying primary sources vs derivatives.',
    ARRAY[
        'Assess credibility and reliability of sources',
        'Identify primary sources and distinguish from derivatives',
        'Detect manipulated or fabricated media',
        'Maintain source quality standards'
    ],
    2,
    1000,
    50,
    ARRAY['source_analysis', 'media_verification']
);

-- ============================================================================
-- SEED DATA: Role Permissions
-- ============================================================================
-- Define permissions for each curator role

-- Community Curator Permissions
INSERT INTO public."RolePermissions" (
    role_id,
    permission_type,
    resource_type,
    can_create,
    can_read,
    can_edit,
    can_approve,
    can_reject,
    requires_peer_review,
    description
) VALUES
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'community_curator'),
    'level_0_content',
    'all',
    false,
    true,
    false,
    false,
    false,
    false,
    'Can view Level 0 content but not modify'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'community_curator'),
    'veracity_approval',
    'all',
    false,
    true,
    false,
    true,
    true,
    true,
    'Can approve/reject veracity score increases with peer review'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'community_curator'),
    'application_review',
    'application',
    false,
    true,
    true,
    false,
    false,
    false,
    'Can review and comment on curator applications'
);

-- Domain Expert Permissions
INSERT INTO public."RolePermissions" (
    role_id,
    permission_type,
    resource_type,
    can_create,
    can_read,
    can_edit,
    can_approve,
    can_reject,
    can_promote_to_level_0,
    requires_peer_review,
    description
) VALUES
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'domain_expert'),
    'level_0_content',
    'all',
    true,
    true,
    true,
    true,
    true,
    false,
    true,
    'Can create and edit Level 0 content with peer review'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'domain_expert'),
    'veracity_approval',
    'all',
    false,
    true,
    false,
    true,
    true,
    false,
    false,
    'Can approve/reject veracity scores in their domain'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'domain_expert'),
    'source_validation',
    'source',
    false,
    true,
    true,
    true,
    true,
    false,
    false,
    'Can validate sources related to their expertise'
);

-- Methodology Specialist Permissions
INSERT INTO public."RolePermissions" (
    role_id,
    permission_type,
    resource_type,
    can_create,
    can_read,
    can_edit,
    can_approve,
    can_reject,
    description
) VALUES
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'methodology_specialist'),
    'methodology_validation',
    'methodology',
    true,
    true,
    true,
    true,
    true,
    'Can create, edit, and validate methodologies'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'methodology_specialist'),
    'veracity_approval',
    'all',
    false,
    true,
    false,
    true,
    true,
    'Can approve/reject based on methodology rigor'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'methodology_specialist'),
    'level_0_content',
    'all',
    false,
    true,
    false,
    false,
    false,
    'Read-only access to Level 0 for methodology review'
);

-- Fact Checker Permissions
INSERT INTO public."RolePermissions" (
    role_id,
    permission_type,
    resource_type,
    can_create,
    can_read,
    can_edit,
    can_approve,
    can_reject,
    can_assign_veracity_score,
    description
) VALUES
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'fact_checker'),
    'veracity_approval',
    'all',
    false,
    true,
    false,
    true,
    true,
    true,
    'Can verify facts and assign veracity scores'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'fact_checker'),
    'level_0_nodes',
    'node',
    false,
    true,
    true,
    true,
    true,
    false,
    'Can edit Level 0 nodes after fact verification'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'fact_checker'),
    'source_validation',
    'source',
    false,
    true,
    false,
    true,
    true,
    false,
    'Can validate sources used for fact checking'
);

-- Source Validator Permissions
INSERT INTO public."RolePermissions" (
    role_id,
    permission_type,
    resource_type,
    can_create,
    can_read,
    can_edit,
    can_approve,
    can_reject,
    description
) VALUES
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'source_validator'),
    'source_validation',
    'source',
    true,
    true,
    true,
    true,
    true,
    'Full control over source validation'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'source_validator'),
    'level_0_content',
    'all',
    false,
    true,
    false,
    false,
    false,
    'Read-only access to Level 0 for source validation'
),
(
    (SELECT id FROM public."CuratorRoles" WHERE role_name = 'source_validator'),
    'veracity_approval',
    'all',
    false,
    true,
    false,
    true,
    true,
    'Can approve/reject based on source quality'
);

-- ============================================================================
-- FUNCTIONS: Helper Functions
-- ============================================================================

-- Function to check if a user has a specific curator permission
CREATE OR REPLACE FUNCTION public.check_curator_permission(
    p_user_id uuid,
    p_permission_type TEXT,
    p_resource_type TEXT,
    p_action TEXT -- 'create', 'read', 'edit', 'delete', 'approve', 'reject'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_curator_id uuid;
    v_role_id uuid;
BEGIN
    -- Get active curator record
    SELECT uc.id, uc.role_id INTO v_curator_id, v_role_id
    FROM public."UserCurators" uc
    WHERE uc.user_id = p_user_id
      AND uc.status = 'active'
    LIMIT 1;

    IF v_curator_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check for user-specific permission overrides first
    SELECT
        CASE p_action
            WHEN 'create' THEN COALESCE(cp.can_create, false)
            WHEN 'read' THEN COALESCE(cp.can_read, false)
            WHEN 'edit' THEN COALESCE(cp.can_edit, false)
            WHEN 'delete' THEN COALESCE(cp.can_delete, false)
            WHEN 'approve' THEN COALESCE(cp.can_approve, false)
            WHEN 'reject' THEN COALESCE(cp.can_reject, false)
            ELSE false
        END INTO v_has_permission
    FROM public."CuratorPermissions" cp
    WHERE cp.user_curator_id = v_curator_id
      AND cp.permission_type = p_permission_type
      AND (cp.resource_type = p_resource_type OR cp.resource_type = 'all')
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
      AND cp.override_type IN ('grant', 'modify')
    LIMIT 1;

    IF v_has_permission THEN
        RETURN true;
    END IF;

    -- Check revocations
    SELECT
        CASE p_action
            WHEN 'create' THEN COALESCE(cp.can_create, false)
            WHEN 'read' THEN COALESCE(cp.can_read, false)
            WHEN 'edit' THEN COALESCE(cp.can_edit, false)
            WHEN 'delete' THEN COALESCE(cp.can_delete, false)
            WHEN 'approve' THEN COALESCE(cp.can_approve, false)
            WHEN 'reject' THEN COALESCE(cp.can_reject, false)
            ELSE false
        END INTO v_has_permission
    FROM public."CuratorPermissions" cp
    WHERE cp.user_curator_id = v_curator_id
      AND cp.permission_type = p_permission_type
      AND (cp.resource_type = p_resource_type OR cp.resource_type = 'all')
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
      AND cp.override_type = 'revoke'
    LIMIT 1;

    IF v_has_permission THEN
        RETURN false; -- Explicitly revoked
    END IF;

    -- Check role-based permissions
    SELECT
        CASE p_action
            WHEN 'create' THEN rp.can_create
            WHEN 'read' THEN rp.can_read
            WHEN 'edit' THEN rp.can_edit
            WHEN 'delete' THEN rp.can_delete
            WHEN 'approve' THEN rp.can_approve
            WHEN 'reject' THEN rp.can_reject
            ELSE false
        END INTO v_has_permission
    FROM public."RolePermissions" rp
    WHERE rp.role_id = v_role_id
      AND rp.permission_type = p_permission_type
      AND (rp.resource_type = p_resource_type OR rp.resource_type = 'all')
    LIMIT 1;

    RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Function to log curator actions
CREATE OR REPLACE FUNCTION public.log_curator_action(
    p_curator_id uuid,
    p_user_id uuid,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id uuid,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_audit_id uuid;
    v_requires_review BOOLEAN := false;
BEGIN
    -- Determine if this action requires peer review
    SELECT rp.requires_peer_review INTO v_requires_review
    FROM public."UserCurators" uc
    JOIN public."RolePermissions" rp ON rp.role_id = uc.role_id
    WHERE uc.id = p_curator_id
      AND uc.status = 'active'
    LIMIT 1;

    -- Insert audit log entry
    INSERT INTO public."CuratorAuditLog" (
        curator_id,
        user_id,
        action_type,
        resource_type,
        resource_id,
        old_value,
        new_value,
        changes,
        reason,
        requires_peer_review,
        ip_address,
        user_agent
    ) VALUES (
        p_curator_id,
        p_user_id,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_old_value,
        p_new_value,
        jsonb_build_object('old', p_old_value, 'new', p_new_value),
        p_reason,
        COALESCE(v_requires_review, false),
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_audit_id;

    -- Update curator metrics
    UPDATE public."UserCurators"
    SET total_actions = total_actions + 1,
        updated_at = NOW()
    WHERE id = p_curator_id;

    RETURN v_audit_id;
END;
$$;

-- Function to calculate curator performance metrics
CREATE OR REPLACE FUNCTION public.update_curator_metrics(p_curator_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INTEGER;
    v_approved INTEGER;
    v_overturned INTEGER;
    v_avg_rating REAL;
BEGIN
    -- Get action counts
    SELECT COUNT(*) INTO v_total
    FROM public."CuratorAuditLog"
    WHERE curator_id = p_curator_id;

    -- Get approved actions (those with positive peer reviews)
    SELECT COUNT(DISTINCT cal.id) INTO v_approved
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.verdict IN ('approved', 'approved_with_notes');

    -- Get overturned actions
    SELECT COUNT(DISTINCT cal.id) INTO v_overturned
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.verdict = 'recommend_overturn';

    -- Get average peer review rating
    SELECT AVG(cr.rating) INTO v_avg_rating
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.rating IS NOT NULL;

    -- Update metrics
    UPDATE public."UserCurators"
    SET
        total_actions = v_total,
        approved_actions = COALESCE(v_approved, 0),
        overturned_actions = COALESCE(v_overturned, 0),
        accuracy_rate = CASE
            WHEN v_total > 0 THEN
                GREATEST(0.0, LEAST(1.0, (v_total - COALESCE(v_overturned, 0))::REAL / v_total))
            ELSE 0.0
        END,
        peer_review_score = COALESCE(v_avg_rating / 5.0, 0.0),
        updated_at = NOW()
    WHERE id = p_curator_id;
END;
$$;

-- ============================================================================
-- TRIGGERS: Automatic Updates
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_curator_roles_updated_at
    BEFORE UPDATE ON public."CuratorRoles"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_curators_updated_at
    BEFORE UPDATE ON public."UserCurators"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curator_applications_updated_at
    BEFORE UPDATE ON public."CuratorApplications"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public."RolePermissions"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curator_permissions_updated_at
    BEFORE UPDATE ON public."CuratorPermissions"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update application vote counts
CREATE OR REPLACE FUNCTION public.update_application_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public."CuratorApplications"
    SET
        votes_for = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'for'
        ),
        votes_against = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'against'
        ),
        votes_abstain = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'abstain'
        ),
        total_voting_weight = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id
        ),
        updated_at = NOW()
    WHERE id = NEW.application_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER update_application_votes_trigger
    AFTER INSERT OR UPDATE ON public."CuratorApplicationVotes"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_application_vote_counts();

-- ============================================================================
-- VIEWS: Convenient Data Access
-- ============================================================================

-- View: Active curators with their roles and permissions
CREATE OR REPLACE VIEW public."ActiveCuratorsView" AS
SELECT
    uc.id as curator_id,
    uc.user_id,
    u.username,
    u.email,
    cr.role_name,
    cr.display_name as role_display_name,
    cr.tier,
    uc.status,
    uc.expertise_areas,
    uc.total_actions,
    uc.accuracy_rate,
    uc.peer_review_score,
    uc.community_trust_score,
    uc.assigned_at,
    uc.next_review_date
FROM public."UserCurators" uc
JOIN public."Users" u ON u.id = uc.user_id
JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
WHERE uc.status = 'active';

-- View: Pending curator applications
CREATE OR REPLACE VIEW public."PendingApplicationsView" AS
SELECT
    ca.id as application_id,
    ca.user_id,
    u.username,
    u.email,
    cr.role_name,
    cr.display_name as role_display_name,
    ca.status,
    ca.application_statement,
    ca.expertise_areas,
    ca.reputation_at_application,
    ca.votes_for,
    ca.votes_against,
    ca.voting_deadline,
    ca.submitted_at,
    CASE
        WHEN ca.total_voting_weight > 0
        THEN ca.votes_for / ca.total_voting_weight
        ELSE 0
    END as approval_ratio
FROM public."CuratorApplications" ca
JOIN public."Users" u ON u.id = ca.user_id
JOIN public."CuratorRoles" cr ON cr.id = ca.role_id
WHERE ca.status IN ('submitted', 'under_review', 'voting');

-- View: Curator audit log with details
CREATE OR REPLACE VIEW public."CuratorAuditLogView" AS
SELECT
    cal.id as audit_id,
    cal.curator_id,
    uc.user_id,
    u.username as curator_username,
    cr.role_name as curator_role,
    cal.action_type,
    cal.resource_type,
    cal.resource_id,
    cal.reason,
    cal.requires_peer_review,
    cal.peer_reviewed,
    cal.peer_review_status,
    cal.performed_at,
    COUNT(cr2.id) as review_count
FROM public."CuratorAuditLog" cal
JOIN public."UserCurators" uc ON uc.id = cal.curator_id
JOIN public."Users" u ON u.id = uc.user_id
JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
LEFT JOIN public."CuratorReviews" cr2 ON cr2.audit_log_id = cal.id
GROUP BY cal.id, uc.user_id, u.username, cr.role_name;

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public."CuratorRoles" IS
'Defines curator roles with their responsibilities, requirements, and permission levels';

COMMENT ON TABLE public."UserCurators" IS
'Links users to curator roles and tracks their performance and accountability metrics';

COMMENT ON TABLE public."CuratorApplications" IS
'Manages the curator application workflow including community voting';

COMMENT ON TABLE public."CuratorAuditLog" IS
'Comprehensive audit trail of all curator actions for transparency and accountability';

COMMENT ON TABLE public."CuratorReviews" IS
'Peer reviews of curator actions for quality control';

COMMENT ON FUNCTION public.check_curator_permission IS
'Checks if a user has a specific curator permission, considering role permissions and overrides';

COMMENT ON FUNCTION public.log_curator_action IS
'Logs a curator action to the audit trail and updates curator metrics';

-- ============================================================================
-- INDEXES: Performance Optimization
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_user_curators_user_role_active
    ON public."UserCurators"(user_id, role_id)
    WHERE status = 'active';

CREATE INDEX idx_curator_audit_curator_action_time
    ON public."CuratorAuditLog"(curator_id, action_type, performed_at DESC);

CREATE INDEX idx_curator_reviews_audit_verdict
    ON public."CuratorReviews"(audit_log_id, verdict);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Output confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Migration 006: Curator System completed successfully';
    RAISE NOTICE 'Created tables: CuratorRoles, UserCurators, CuratorApplications, CuratorApplicationVotes, CuratorAuditLog, CuratorReviews, RolePermissions, CuratorPermissions';
    RAISE NOTICE 'Created functions: check_curator_permission, log_curator_action, update_curator_metrics';
    RAISE NOTICE 'Created views: ActiveCuratorsView, PendingApplicationsView, CuratorAuditLogView';
    RAISE NOTICE 'Seeded 5 curator roles with appropriate permissions';
END $$;
