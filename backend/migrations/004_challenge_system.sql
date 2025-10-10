-- ============================================================================
-- Migration 004: Challenge System (Phase 2)
-- ============================================================================
-- Description: Implements a community-driven challenge system for Level 1 nodes
--              and edges. Users can challenge claims with counter-evidence, vote
--              on challenges, and participate in community moderation.
--
-- Author: Challenge System Architecture Team
-- Date: 2025-10-09
-- Dependencies: 
--   - Requires base schema with Nodes, Edges, Users tables
--   - Requires 003_veracity_system.sql for integration with veracity scores
-- ============================================================================

-- ============================================================================
-- ER DIAGRAM (ASCII)
-- ============================================================================
--
--  ┌─────────────────┐
--  │      Users      │◄──────┐
--  └─────────────────┘       │
--          │                  │ challenger/resolver
--          │                  │
--          ▼                  │
--  ┌─────────────────────────┐
--  │   UserReputation        │
--  │  ─────────────────────  │
--  │  + user_id (FK)         │
--  │  + reputation_score     │
--  │  + challenges_submitted │
--  │  + challenges_accepted  │
--  │  + votes_cast           │
--  │  + tier                 │
--  └─────────────────────────┘
--          │
--          │ requires minimum
--          │ reputation
--          ▼
--  ┌─────────────────────────┐         ┌──────────────┐
--  │      Challenges         │◄────────│ Nodes/Edges  │
--  │  ─────────────────────  │  target └──────────────┘
--  │  + target_node_id (FK)  │
--  │  + target_edge_id (FK)  │
--  │  + challenge_type       │
--  │  + status               │
--  │  + challenger_id (FK)   │
--  │  + evidence_ids[]       │
--  │  + voting_deadline      │
--  │  + resolution           │
--  └─────────────────────────┘
--          │
--          │ has multiple
--          ├─────────┬──────────┬───────────┐
--          ▼         ▼          ▼           ▼
--  ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
--  │ Challenge  │ │Challenge │ │Challenge│ │  Challenge   │
--  │  Evidence  │ │  Votes   │ │Comments │ │  Resolution  │
--  └────────────┘ └──────────┘ └─────────┘ └──────────────┘
--
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: ChallengeTypes
-- ============================================================================
-- Defines the types of challenges that can be raised against nodes/edges

CREATE TABLE IF NOT EXISTS public."ChallengeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Type identification
    type_code TEXT NOT NULL UNIQUE CHECK (type_code IN (
        'factual_error',
        'missing_context',
        'bias',
        'source_credibility',
        'logical_fallacy',
        'outdated_information',
        'misleading_representation',
        'conflict_of_interest',
        'methodological_flaw',
        'other'
    )),
    
    -- Display information
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    
    -- Requirements and impact
    min_reputation_required INTEGER DEFAULT 0,
    evidence_required BOOLEAN DEFAULT true,
    max_veracity_impact REAL DEFAULT 0.2 CHECK (max_veracity_impact >= 0 AND max_veracity_impact <= 1),
    
    -- Voting configuration
    min_votes_required INTEGER DEFAULT 5,
    acceptance_threshold REAL DEFAULT 0.6 CHECK (acceptance_threshold >= 0.5 AND acceptance_threshold <= 1.0),
    voting_duration_hours INTEGER DEFAULT 72,
    
    -- Guidelines
    guidelines TEXT,
    example_challenges JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default challenge types
INSERT INTO public."ChallengeTypes" (type_code, display_name, description, min_reputation_required, evidence_required, max_veracity_impact, voting_duration_hours) VALUES
('factual_error', 'Factual Error', 'The claim contains demonstrably false information', 10, true, 0.3, 72),
('missing_context', 'Missing Context', 'Important context is omitted that changes interpretation', 5, true, 0.2, 72),
('bias', 'Bias', 'The claim shows clear bias or one-sided presentation', 15, true, 0.15, 96),
('source_credibility', 'Source Credibility', 'The sources cited are unreliable or misrepresented', 20, true, 0.25, 72),
('logical_fallacy', 'Logical Fallacy', 'The reasoning contains formal or informal logical fallacies', 25, true, 0.2, 48),
('outdated_information', 'Outdated Information', 'The information is no longer current or accurate', 5, true, 0.15, 48),
('misleading_representation', 'Misleading Representation', 'Data or facts are presented in a misleading way', 20, true, 0.25, 72),
('conflict_of_interest', 'Conflict of Interest', 'Undisclosed conflicts affect the credibility', 30, true, 0.2, 96),
('methodological_flaw', 'Methodological Flaw', 'The methodology used to support the claim is flawed', 35, true, 0.3, 96),
('other', 'Other', 'Other type of challenge not covered above', 50, true, 0.1, 120);

-- ============================================================================
-- TABLE: UserReputation
-- ============================================================================
-- Tracks user reputation scores for challenge system participation

CREATE TABLE IF NOT EXISTS public."UserReputation" (
    user_id uuid PRIMARY KEY REFERENCES public."Users"(id) ON DELETE CASCADE,
    
    -- Core reputation metrics
    reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0),
    reputation_tier TEXT DEFAULT 'novice' CHECK (reputation_tier IN (
        'novice',      -- 0-99 points
        'contributor', -- 100-499 points
        'trusted',     -- 500-1999 points
        'expert',      -- 2000-9999 points
        'authority'    -- 10000+ points
    )),
    
    -- Challenge statistics
    challenges_submitted INTEGER DEFAULT 0 CHECK (challenges_submitted >= 0),
    challenges_accepted INTEGER DEFAULT 0 CHECK (challenges_accepted >= 0),
    challenges_rejected INTEGER DEFAULT 0 CHECK (challenges_rejected >= 0),
    challenges_pending INTEGER DEFAULT 0 CHECK (challenges_pending >= 0),
    
    -- Voting statistics
    votes_cast INTEGER DEFAULT 0 CHECK (votes_cast >= 0),
    votes_agreed_with_outcome INTEGER DEFAULT 0 CHECK (votes_agreed_with_outcome >= 0),
    
    -- Resolution statistics
    resolutions_performed INTEGER DEFAULT 0 CHECK (resolutions_performed >= 0),
    resolutions_overturned INTEGER DEFAULT 0 CHECK (resolutions_overturned >= 0),
    
    -- Quality metrics
    accuracy_rate REAL DEFAULT 0.0 CHECK (accuracy_rate >= 0.0 AND accuracy_rate <= 1.0),
    participation_rate REAL DEFAULT 0.0 CHECK (participation_rate >= 0.0 AND participation_rate <= 1.0),
    
    -- Restrictions and penalties
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    banned_until TIMESTAMPTZ,
    warning_count INTEGER DEFAULT 0,
    last_warning_at TIMESTAMPTZ,
    
    -- Rate limiting
    challenges_today INTEGER DEFAULT 0,
    last_challenge_at TIMESTAMPTZ,
    daily_limit INTEGER DEFAULT 5,
    
    -- Achievements and badges
    badges JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]',
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: Challenges (Enhanced from existing table)
-- ============================================================================
-- Main table for tracking challenges against nodes and edges

-- Drop existing Challenges table constraints to rebuild it
ALTER TABLE IF EXISTS public."Challenges" DROP CONSTRAINT IF EXISTS either_node_or_edge;

-- Add new columns to existing Challenges table
ALTER TABLE public."Challenges"
    ADD COLUMN IF NOT EXISTS challenge_type_id uuid REFERENCES public."ChallengeTypes"(id),
    ADD COLUMN IF NOT EXISTS challenger_id uuid REFERENCES public."Users"(id),
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS evidence_ids uuid[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS supporting_sources JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ADD COLUMN IF NOT EXISTS voting_starts_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS voting_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS support_votes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reject_votes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS support_percentage REAL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS resolution TEXT CHECK (resolution IN ('pending', 'accepted', 'rejected', 'modified', 'withdrawn')),
    ADD COLUMN IF NOT EXISTS resolution_reason TEXT,
    ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public."Users"(id),
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS veracity_impact REAL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS spam_reports INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'restricted', 'hidden')),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update status column check constraint
ALTER TABLE public."Challenges" 
    DROP CONSTRAINT IF EXISTS challenges_status_check,
    ADD CONSTRAINT challenges_status_check CHECK (status IN ('open', 'voting', 'closed', 'resolved', 'withdrawn'));

-- Re-add the either_node_or_edge constraint
ALTER TABLE public."Challenges"
    ADD CONSTRAINT either_node_or_edge CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    );

-- Add constraint to prevent challenges on Level 0 nodes/edges
ALTER TABLE public."Challenges"
    ADD CONSTRAINT no_challenge_level_0 CHECK (
        (target_node_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public."Nodes" WHERE id = target_node_id AND is_level_0 = true
        )) AND
        (target_edge_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public."Edges" WHERE id = target_edge_id AND is_level_0 = true
        ))
    );

-- ============================================================================
-- TABLE: ChallengeEvidence
-- ============================================================================
-- Links evidence to challenges (separate from main Evidence table)

CREATE TABLE IF NOT EXISTS public."ChallengeEvidence" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    evidence_id uuid REFERENCES public."Evidence"(id) ON DELETE SET NULL,
    
    -- Evidence details if not linking to existing evidence
    evidence_type TEXT CHECK (evidence_type IN ('supporting', 'refuting', 'clarifying')),
    source_url TEXT,
    source_title TEXT,
    content TEXT NOT NULL,
    excerpt TEXT,
    
    -- Evidence metadata
    credibility_score REAL DEFAULT 0.5 CHECK (credibility_score >= 0.0 AND credibility_score <= 1.0),
    relevance_score REAL DEFAULT 0.5 CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by uuid REFERENCES public."Users"(id),
    verified_at TIMESTAMPTZ,
    
    -- Audit fields
    submitted_by uuid NOT NULL REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate evidence per challenge
    CONSTRAINT unique_challenge_evidence UNIQUE (challenge_id, evidence_id)
);

-- ============================================================================
-- TABLE: ChallengeVotes
-- ============================================================================
-- Tracks community votes on challenges

CREATE TABLE IF NOT EXISTS public."ChallengeVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    
    -- Vote details
    vote TEXT NOT NULL CHECK (vote IN ('support', 'reject', 'abstain')),
    confidence REAL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    
    -- Optional reasoning
    reason TEXT,
    evidence_evaluation JSONB DEFAULT '{}', -- Per-evidence evaluation
    
    -- Vote weight (based on user reputation)
    weight REAL DEFAULT 1.0 CHECK (weight >= 0.0),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- One vote per user per challenge
    CONSTRAINT unique_user_challenge_vote UNIQUE (challenge_id, user_id)
);

-- ============================================================================
-- TABLE: ChallengeComments
-- ============================================================================
-- Discussion thread for challenges

CREATE TABLE IF NOT EXISTS public."ChallengeComments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public."ChallengeComments"(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    
    -- Moderation
    is_hidden BOOLEAN DEFAULT false,
    hidden_reason TEXT,
    hidden_by uuid REFERENCES public."Users"(id),
    
    -- Reactions
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: ChallengeResolutions
-- ============================================================================
-- Detailed resolution records for challenges

CREATE TABLE IF NOT EXISTS public."ChallengeResolutions" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    
    -- Resolution details
    resolution_type TEXT NOT NULL CHECK (resolution_type IN (
        'accepted',           -- Challenge accepted, veracity reduced
        'rejected',          -- Challenge rejected, no impact
        'partially_accepted', -- Some points valid, partial impact
        'modified',          -- Node/edge modified based on challenge
        'withdrawn',         -- Challenge withdrawn by submitter
        'expired'           -- Voting period expired without consensus
    )),
    
    -- Resolution reasoning
    resolution_summary TEXT NOT NULL,
    detailed_reasoning TEXT,
    evidence_assessment JSONB DEFAULT '{}',
    
    -- Impact on target
    veracity_impact REAL DEFAULT 0.0 CHECK (veracity_impact >= -1.0 AND veracity_impact <= 0.0),
    modifications_made JSONB DEFAULT '{}',
    
    -- Voting results
    total_votes INTEGER DEFAULT 0,
    support_votes INTEGER DEFAULT 0,
    reject_votes INTEGER DEFAULT 0,
    abstain_votes INTEGER DEFAULT 0,
    weighted_support_percentage REAL,
    
    -- Resolution authority
    resolved_by uuid NOT NULL REFERENCES public."Users"(id),
    resolver_role TEXT CHECK (resolver_role IN ('moderator', 'admin', 'automated', 'community')),
    
    -- Appeals
    is_appealable BOOLEAN DEFAULT true,
    appeal_deadline TIMESTAMPTZ,
    was_appealed BOOLEAN DEFAULT false,
    appeal_id uuid REFERENCES public."Challenges"(id),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: ChallengeNotifications
-- ============================================================================
-- Notification queue for challenge-related events

CREATE TABLE IF NOT EXISTS public."ChallengeNotifications" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'challenge_created',
        'challenge_voting_started',
        'challenge_voting_ending',
        'challenge_resolved',
        'challenge_commented',
        'vote_requested',
        'evidence_added',
        'resolution_appealed'
    )),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    
    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: SpamReports
-- ============================================================================
-- Track spam/abuse reports for challenges

CREATE TABLE IF NOT EXISTS public."SpamReports" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    reporter_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    
    -- Report details
    report_type TEXT NOT NULL CHECK (report_type IN (
        'spam',
        'harassment',
        'false_information',
        'duplicate',
        'off_topic',
        'other'
    )),
    
    description TEXT,
    
    -- Review status
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by uuid REFERENCES public."Users"(id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- One report per user per challenge
    CONSTRAINT unique_user_challenge_report UNIQUE (challenge_id, reporter_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- ChallengeTypes indexes
CREATE INDEX idx_challenge_types_active ON public."ChallengeTypes" (is_active) WHERE is_active = true;
CREATE INDEX idx_challenge_types_code ON public."ChallengeTypes" (type_code);

-- UserReputation indexes
CREATE INDEX idx_user_reputation_score ON public."UserReputation" (reputation_score DESC);
CREATE INDEX idx_user_reputation_tier ON public."UserReputation" (reputation_tier);
CREATE INDEX idx_user_reputation_banned ON public."UserReputation" (is_banned) WHERE is_banned = true;

-- Challenges indexes
CREATE INDEX idx_challenges_target_node ON public."Challenges" (target_node_id) WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_challenges_target_edge ON public."Challenges" (target_edge_id) WHERE target_edge_id IS NOT NULL;
CREATE INDEX idx_challenges_type ON public."Challenges" (challenge_type_id);
CREATE INDEX idx_challenges_challenger ON public."Challenges" (challenger_id);
CREATE INDEX idx_challenges_status ON public."Challenges" (status);
CREATE INDEX idx_challenges_resolution ON public."Challenges" (resolution) WHERE resolution IS NOT NULL;
CREATE INDEX idx_challenges_voting_ends ON public."Challenges" (voting_ends_at) WHERE status = 'voting';
CREATE INDEX idx_challenges_created ON public."Challenges" (created_at DESC);

-- Composite index for finding active challenges
CREATE INDEX idx_challenges_active ON public."Challenges" (status, voting_ends_at) 
    WHERE status IN ('open', 'voting');

-- ChallengeEvidence indexes
CREATE INDEX idx_challenge_evidence_challenge ON public."ChallengeEvidence" (challenge_id);
CREATE INDEX idx_challenge_evidence_evidence ON public."ChallengeEvidence" (evidence_id) WHERE evidence_id IS NOT NULL;
CREATE INDEX idx_challenge_evidence_submitter ON public."ChallengeEvidence" (submitted_by);

-- ChallengeVotes indexes
CREATE INDEX idx_challenge_votes_challenge ON public."ChallengeVotes" (challenge_id);
CREATE INDEX idx_challenge_votes_user ON public."ChallengeVotes" (user_id);
CREATE INDEX idx_challenge_votes_vote ON public."ChallengeVotes" (vote);

-- ChallengeComments indexes
CREATE INDEX idx_challenge_comments_challenge ON public."ChallengeComments" (challenge_id);
CREATE INDEX idx_challenge_comments_parent ON public."ChallengeComments" (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_challenge_comments_user ON public."ChallengeComments" (user_id);
CREATE INDEX idx_challenge_comments_created ON public."ChallengeComments" (created_at DESC);

-- ChallengeResolutions indexes
CREATE INDEX idx_challenge_resolutions_challenge ON public."ChallengeResolutions" (challenge_id);
CREATE INDEX idx_challenge_resolutions_type ON public."ChallengeResolutions" (resolution_type);
CREATE INDEX idx_challenge_resolutions_appealable ON public."ChallengeResolutions" (is_appealable, appeal_deadline) 
    WHERE is_appealable = true;

-- ChallengeNotifications indexes
CREATE INDEX idx_notifications_user ON public."ChallengeNotifications" (user_id);
CREATE INDEX idx_notifications_challenge ON public."ChallengeNotifications" (challenge_id);
CREATE INDEX idx_notifications_unread ON public."ChallengeNotifications" (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_unsent ON public."ChallengeNotifications" (is_sent, created_at) WHERE is_sent = false;

-- SpamReports indexes
CREATE INDEX idx_spam_reports_challenge ON public."SpamReports" (challenge_id);
CREATE INDEX idx_spam_reports_unreviewed ON public."SpamReports" (is_reviewed) WHERE is_reviewed = false;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: calculate_user_reputation_tier
-- ----------------------------------------------------------------------------
-- Calculates user tier based on reputation score

CREATE OR REPLACE FUNCTION calculate_user_reputation_tier(reputation_score INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF reputation_score < 100 THEN
        RETURN 'novice';
    ELSIF reputation_score < 500 THEN
        RETURN 'contributor';
    ELSIF reputation_score < 2000 THEN
        RETURN 'trusted';
    ELSIF reputation_score < 10000 THEN
        RETURN 'expert';
    ELSE
        RETURN 'authority';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- Function: calculate_vote_weight
-- ----------------------------------------------------------------------------
-- Calculates vote weight based on user reputation

CREATE OR REPLACE FUNCTION calculate_vote_weight(user_id uuid)
RETURNS REAL AS $$
DECLARE
    v_reputation INTEGER;
    v_tier TEXT;
    v_weight REAL;
BEGIN
    -- Get user reputation
    SELECT reputation_score, reputation_tier 
    INTO v_reputation, v_tier
    FROM public."UserReputation"
    WHERE UserReputation.user_id = calculate_vote_weight.user_id;
    
    -- Default weight for users without reputation record
    IF v_reputation IS NULL THEN
        RETURN 1.0;
    END IF;
    
    -- Calculate weight based on tier
    CASE v_tier
        WHEN 'novice' THEN v_weight := 1.0;
        WHEN 'contributor' THEN v_weight := 1.5;
        WHEN 'trusted' THEN v_weight := 2.0;
        WHEN 'expert' THEN v_weight := 3.0;
        WHEN 'authority' THEN v_weight := 5.0;
        ELSE v_weight := 1.0;
    END CASE;
    
    RETURN v_weight;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: can_user_challenge
-- ----------------------------------------------------------------------------
-- Checks if a user can submit a challenge

CREATE OR REPLACE FUNCTION can_user_challenge(
    p_user_id uuid,
    p_challenge_type_id uuid
) RETURNS BOOLEAN AS $$
DECLARE
    v_reputation INTEGER;
    v_is_banned BOOLEAN;
    v_challenges_today INTEGER;
    v_daily_limit INTEGER;
    v_min_reputation INTEGER;
BEGIN
    -- Get user reputation status
    SELECT 
        reputation_score,
        is_banned,
        challenges_today,
        daily_limit
    INTO 
        v_reputation,
        v_is_banned,
        v_challenges_today,
        v_daily_limit
    FROM public."UserReputation"
    WHERE user_id = p_user_id;
    
    -- Check if user is banned
    IF v_is_banned THEN
        RETURN FALSE;
    END IF;
    
    -- Check daily limit
    IF v_challenges_today >= v_daily_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Get minimum reputation required for challenge type
    SELECT min_reputation_required 
    INTO v_min_reputation
    FROM public."ChallengeTypes"
    WHERE id = p_challenge_type_id;
    
    -- Check reputation requirement
    IF COALESCE(v_reputation, 0) < COALESCE(v_min_reputation, 0) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: update_challenge_voting_stats
-- ----------------------------------------------------------------------------
-- Updates voting statistics for a challenge

CREATE OR REPLACE FUNCTION update_challenge_voting_stats(p_challenge_id uuid)
RETURNS VOID AS $$
DECLARE
    v_total_votes INTEGER;
    v_support_votes INTEGER;
    v_reject_votes INTEGER;
    v_support_percentage REAL;
    v_weighted_support REAL;
    v_weighted_total REAL;
BEGIN
    -- Count votes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE vote = 'support'),
        COUNT(*) FILTER (WHERE vote = 'reject'),
        COALESCE(SUM(weight) FILTER (WHERE vote = 'support'), 0),
        COALESCE(SUM(weight), 0)
    INTO 
        v_total_votes,
        v_support_votes,
        v_reject_votes,
        v_weighted_support,
        v_weighted_total
    FROM public."ChallengeVotes"
    WHERE challenge_id = p_challenge_id AND vote != 'abstain';
    
    -- Calculate support percentage
    IF v_weighted_total > 0 THEN
        v_support_percentage := v_weighted_support / v_weighted_total;
    ELSE
        v_support_percentage := 0;
    END IF;
    
    -- Update challenge stats
    UPDATE public."Challenges"
    SET 
        vote_count = v_total_votes,
        support_votes = v_support_votes,
        reject_votes = v_reject_votes,
        support_percentage = v_support_percentage,
        updated_at = now()
    WHERE id = p_challenge_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: resolve_challenge
-- ----------------------------------------------------------------------------
-- Resolves a challenge based on voting results

CREATE OR REPLACE FUNCTION resolve_challenge(
    p_challenge_id uuid,
    p_resolver_id uuid,
    p_resolution_reason TEXT DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_challenge RECORD;
    v_resolution TEXT;
    v_veracity_impact REAL;
    v_resolution_id uuid;
    v_acceptance_threshold REAL;
BEGIN
    -- Get challenge details
    SELECT c.*, ct.acceptance_threshold, ct.max_veracity_impact
    INTO v_challenge
    FROM public."Challenges" c
    JOIN public."ChallengeTypes" ct ON c.challenge_type_id = ct.id
    WHERE c.id = p_challenge_id;
    
    -- Determine resolution based on support percentage
    IF v_challenge.support_percentage >= v_challenge.acceptance_threshold THEN
        v_resolution := 'accepted';
        v_veracity_impact := -v_challenge.max_veracity_impact * v_challenge.support_percentage;
    ELSIF v_challenge.support_percentage >= (v_challenge.acceptance_threshold * 0.5) THEN
        v_resolution := 'partially_accepted';
        v_veracity_impact := -v_challenge.max_veracity_impact * v_challenge.support_percentage * 0.5;
    ELSE
        v_resolution := 'rejected';
        v_veracity_impact := 0;
    END IF;
    
    -- Update challenge status
    UPDATE public."Challenges"
    SET 
        status = 'resolved',
        resolution = v_resolution,
        resolution_reason = p_resolution_reason,
        resolved_by = p_resolver_id,
        resolved_at = now(),
        veracity_impact = v_veracity_impact,
        updated_at = now()
    WHERE id = p_challenge_id;
    
    -- Create resolution record
    INSERT INTO public."ChallengeResolutions" (
        challenge_id,
        resolution_type,
        resolution_summary,
        detailed_reasoning,
        veracity_impact,
        total_votes,
        support_votes,
        reject_votes,
        weighted_support_percentage,
        resolved_by,
        resolver_role
    ) VALUES (
        p_challenge_id,
        v_resolution,
        COALESCE(p_resolution_reason, 'Resolved based on community voting'),
        NULL,
        v_veracity_impact,
        v_challenge.vote_count,
        v_challenge.support_votes,
        v_challenge.reject_votes,
        v_challenge.support_percentage,
        p_resolver_id,
        'community'
    ) RETURNING id INTO v_resolution_id;
    
    -- Update veracity score if challenge was accepted
    IF v_veracity_impact < 0 THEN
        IF v_challenge.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', v_challenge.target_node_id, 'challenge_resolved', 'challenge', p_challenge_id);
        ELSIF v_challenge.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', v_challenge.target_edge_id, 'challenge_resolved', 'challenge', p_challenge_id);
        END IF;
    END IF;
    
    -- Update challenger reputation
    IF v_resolution IN ('accepted', 'partially_accepted') THEN
        UPDATE public."UserReputation"
        SET 
            reputation_score = reputation_score + 10,
            challenges_accepted = challenges_accepted + 1,
            accuracy_rate = challenges_accepted::REAL / NULLIF(challenges_submitted, 0),
            updated_at = now()
        WHERE user_id = v_challenge.challenger_id;
    ELSE
        UPDATE public."UserReputation"
        SET 
            challenges_rejected = challenges_rejected + 1,
            accuracy_rate = challenges_accepted::REAL / NULLIF(challenges_submitted, 0),
            updated_at = now()
        WHERE user_id = v_challenge.challenger_id;
    END IF;
    
    RETURN v_resolution_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: award_reputation_points
-- ----------------------------------------------------------------------------
-- Awards reputation points for various actions

CREATE OR REPLACE FUNCTION award_reputation_points(
    p_user_id uuid,
    p_action TEXT,
    p_points INTEGER
) RETURNS VOID AS $$
DECLARE
    v_new_score INTEGER;
    v_new_tier TEXT;
BEGIN
    -- Initialize user reputation if not exists
    INSERT INTO public."UserReputation" (user_id, reputation_score)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update reputation score
    UPDATE public."UserReputation"
    SET 
        reputation_score = GREATEST(0, reputation_score + p_points),
        last_active_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING reputation_score INTO v_new_score;
    
    -- Update tier
    v_new_tier := calculate_user_reputation_tier(v_new_score);
    UPDATE public."UserReputation"
    SET reputation_tier = v_new_tier
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: Update updated_at timestamp
-- ----------------------------------------------------------------------------

-- Apply to new tables
CREATE TRIGGER update_challenge_types_updated_at BEFORE UPDATE ON public."ChallengeTypes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public."UserReputation"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public."Challenges"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_evidence_updated_at BEFORE UPDATE ON public."ChallengeEvidence"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_votes_updated_at BEFORE UPDATE ON public."ChallengeVotes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_comments_updated_at BEFORE UPDATE ON public."ChallengeComments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Trigger: Update challenge voting stats on vote
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_update_challenge_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_challenge_voting_stats(NEW.challenge_id);
    
    -- Update voter reputation for participation
    PERFORM award_reputation_points(NEW.user_id, 'vote_cast', 1);
    
    UPDATE public."UserReputation"
    SET 
        votes_cast = votes_cast + 1,
        participation_rate = LEAST(1.0, participation_rate + 0.01),
        last_active_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_vote_stats_update 
    AFTER INSERT OR UPDATE ON public."ChallengeVotes"
    FOR EACH ROW EXECUTE FUNCTION trigger_update_challenge_stats();

-- ----------------------------------------------------------------------------
-- Trigger: Set voting deadline when challenge created
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_voting_deadline()
RETURNS TRIGGER AS $$
DECLARE
    v_voting_hours INTEGER;
BEGIN
    -- Get voting duration from challenge type
    SELECT voting_duration_hours 
    INTO v_voting_hours
    FROM public."ChallengeTypes"
    WHERE id = NEW.challenge_type_id;
    
    -- Set voting deadline
    NEW.voting_ends_at := now() + (v_voting_hours || ' hours')::INTERVAL;
    
    -- Initialize user reputation if needed
    INSERT INTO public."UserReputation" (user_id)
    VALUES (NEW.challenger_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update challenger statistics
    UPDATE public."UserReputation"
    SET 
        challenges_submitted = challenges_submitted + 1,
        challenges_pending = challenges_pending + 1,
        challenges_today = challenges_today + 1,
        last_challenge_at = now(),
        last_active_at = now()
    WHERE user_id = NEW.challenger_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_challenge_voting_deadline 
    BEFORE INSERT ON public."Challenges"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_voting_deadline();

-- ----------------------------------------------------------------------------
-- Trigger: Reset daily challenge count
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reset_daily_challenge_count()
RETURNS VOID AS $$
BEGIN
    UPDATE public."UserReputation"
    SET challenges_today = 0
    WHERE last_challenge_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: ActiveChallengesView
-- ----------------------------------------------------------------------------
-- Shows all active challenges with details

CREATE OR REPLACE VIEW public."ActiveChallengesView" AS
SELECT 
    c.id,
    c.target_node_id,
    c.target_edge_id,
    CASE 
        WHEN c.target_node_id IS NOT NULL THEN 'node'
        ELSE 'edge'
    END AS target_type,
    c.title,
    c.description,
    ct.display_name AS challenge_type,
    ct.type_code,
    c.status,
    c.severity,
    c.challenger_id,
    u.username AS challenger_username,
    ur.reputation_score AS challenger_reputation,
    ur.reputation_tier AS challenger_tier,
    c.vote_count,
    c.support_votes,
    c.reject_votes,
    c.support_percentage,
    c.voting_starts_at,
    c.voting_ends_at,
    c.voting_ends_at - now() AS time_remaining,
    c.created_at,
    array_length(c.evidence_ids, 1) AS evidence_count
FROM public."Challenges" c
JOIN public."ChallengeTypes" ct ON c.challenge_type_id = ct.id
JOIN public."Users" u ON c.challenger_id = u.id
LEFT JOIN public."UserReputation" ur ON c.challenger_id = ur.user_id
WHERE c.status IN ('open', 'voting')
ORDER BY c.created_at DESC;

-- ----------------------------------------------------------------------------
-- View: ChallengeLeaderboard
-- ----------------------------------------------------------------------------
-- Shows top contributors to the challenge system

CREATE OR REPLACE VIEW public."ChallengeLeaderboard" AS
SELECT 
    u.id AS user_id,
    u.username,
    ur.reputation_score,
    ur.reputation_tier,
    ur.challenges_submitted,
    ur.challenges_accepted,
    ur.challenges_rejected,
    ur.accuracy_rate,
    ur.votes_cast,
    ur.participation_rate,
    ur.badges,
    ur.achievements,
    RANK() OVER (ORDER BY ur.reputation_score DESC) AS rank
FROM public."Users" u
JOIN public."UserReputation" ur ON u.id = ur.user_id
WHERE ur.is_banned = false
ORDER BY ur.reputation_score DESC;

-- ----------------------------------------------------------------------------
-- View: ChallengeImpactSummary
-- ----------------------------------------------------------------------------
-- Shows the impact of challenges on veracity scores

CREATE OR REPLACE VIEW public."ChallengeImpactSummary" AS
SELECT 
    c.id AS challenge_id,
    c.target_node_id,
    c.target_edge_id,
    c.resolution,
    c.veracity_impact,
    vs_before.veracity_score AS veracity_before,
    vs_after.veracity_score AS veracity_after,
    vs_after.veracity_score - vs_before.veracity_score AS veracity_change,
    c.resolved_at
FROM public."Challenges" c
LEFT JOIN public."VeracityScoreHistory" vsh_before ON 
    vsh_before.triggering_entity_id = c.id AND 
    vsh_before.triggering_entity_type = 'challenge' AND
    vsh_before.change_reason = 'challenge_created'
LEFT JOIN public."VeracityScores" vs_before ON 
    vsh_before.veracity_score_id = vs_before.id
LEFT JOIN public."VeracityScoreHistory" vsh_after ON 
    vsh_after.triggering_entity_id = c.id AND 
    vsh_after.triggering_entity_type = 'challenge' AND
    vsh_after.change_reason = 'challenge_resolved'
LEFT JOIN public."VeracityScores" vs_after ON 
    vsh_after.veracity_score_id = vs_after.id
WHERE c.status = 'resolved' AND c.resolution IN ('accepted', 'partially_accepted', 'modified');

-- ============================================================================
-- SECURITY POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE public."UserReputation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChallengeVotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChallengeComments" ENABLE ROW LEVEL SECURITY;

-- UserReputation: Users can see all, but only modify their own
CREATE POLICY user_reputation_select ON public."UserReputation"
    FOR SELECT TO backend_app
    USING (true);

CREATE POLICY user_reputation_update ON public."UserReputation"
    FOR UPDATE TO backend_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- ChallengeVotes: Users can only create/update their own votes
CREATE POLICY challenge_votes_insert ON public."ChallengeVotes"
    FOR INSERT TO backend_app
    WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY challenge_votes_update ON public."ChallengeVotes"
    FOR UPDATE TO backend_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create system user for automated actions
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system',
    'system@rabbithole.app',
    'NO_LOGIN'
) ON CONFLICT (id) DO NOTHING;

-- Initialize system user reputation
INSERT INTO public."UserReputation" (user_id, reputation_score, reputation_tier)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    1000000,
    'authority'
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO backend_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration verification queries:
-- SELECT COUNT(*) FROM public."ChallengeTypes";
-- SELECT COUNT(*) FROM public."UserReputation";
-- SELECT * FROM public."ActiveChallengesView" LIMIT 5;

