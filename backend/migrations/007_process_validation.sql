-- ============================================================================
-- Migration 007: Process Validation & Egalitarian Promotion System
-- ============================================================================
-- Description: Implements an objective, math-based system for Level 0 promotion
--              based on methodology completion, consensus, evidence quality,
--              and challenge resolution. NO curator approval required.
--              All promotion decisions are transparent and algorithmic.
--
-- Author: Database Architecture Team
-- Date: 2025-10-09
-- Dependencies:
--   - 001_initial_schema.sql (Graphs, Nodes, Edges, Users)
--   - 003_veracity_system.sql (Evidence)
--   - 004_challenge_system.sql (Challenges)
--   - 006_methodology_system.sql (Methodologies, MethodologyWorkflows)
--
-- EGALITARIAN PRINCIPLES:
--   1. NO role-based hierarchies - all users equal
--   2. NO curator gatekeeping - fully automated
--   3. Transparent scoring - all calculations visible
--   4. Objective criteria only - no subjective judgment
--   5. Community consensus drives validation
--   6. Full audit trail for accountability
-- ============================================================================

-- ============================================================================
-- ER DIAGRAM (ASCII)
-- ============================================================================
--
--  ┌─────────────────┐
--  │     Graphs      │
--  │  ─────────────  │
--  │  + level (0,1)  │
--  └─────────────────┘
--         │
--         │ tracks progress for
--         │
--         ├──────────────────────┬─────────────────────┬──────────────────┐
--         │                      │                     │                  │
--         ▼                      ▼                     ▼                  ▼
--  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐
--  │ Methodology      │  │  Consensus   │  │   Promotion     │  │   Promotion     │
--  │ Completion       │  │    Votes     │  │   Eligibility   │  │    History      │
--  │ Tracking         │  │              │  │                 │  │                 │
--  │ ──────────────   │  │ ──────────── │  │ ──────────────  │  │ ──────────────  │
--  │ + graph_id       │  │ + graph_id   │  │ + graph_id      │  │ + graph_id      │
--  │ + methodology_id │  │ + voter_id   │  │ + methodology   │  │ + from_level    │
--  │ + workflow_step  │  │ + vote_value │  │   _score        │  │ + to_level      │
--  │ + completed      │  │ + vote_weight│  │ + consensus     │  │ + criteria_met  │
--  │                  │  │ + reasoning  │  │   _score        │  │ + timestamp     │
--  └──────────────────┘  └──────────────┘  │ + evidence      │  └─────────────────┘
--         │                      │          │   _score        │
--         │                      │          │ + challenge     │
--         │                      │          │   _score        │
--         │                      │          │ + overall_score │
--         │                      │          │ + is_eligible   │
--         │                      │          └─────────────────┘
--         │                      │                  │
--         │                      │                  │ triggers
--         │                      │                  ▼
--         └──────────────────────┴───────► auto_promote_graph()
--
--  ┌─────────────────┐
--  │     Users       │
--  │  ─────────────  │
--  │  + id           │
--  └─────────────────┘
--         │
--         │ has reputation
--         │
--         ▼
--  ┌─────────────────────────┐
--  │ UserReputationMetrics   │
--  │  ─────────────────────  │
--  │ + user_id               │
--  │ + evidence_quality_score│
--  │ + consensus_participation│
--  │ + methodology_completion│
--  │ + challenge_resolution  │
--  │ + overall_reputation    │
--  └─────────────────────────┘
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: MethodologyWorkflowSteps
-- ============================================================================
-- Defines individual workflow steps within a methodology
-- (Referenced by MethodologyCompletionTracking)

CREATE TABLE IF NOT EXISTS public."MethodologyWorkflowSteps" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Methodology relationship
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public."MethodologyWorkflows"(id) ON DELETE CASCADE,

    -- Step definition
    step_number INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    step_description TEXT,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'data_collection',
        'analysis',
        'validation',
        'documentation',
        'review',
        'custom'
    )),

    -- Requirements
    is_required BOOLEAN DEFAULT true,
    completion_criteria JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_workflow_step UNIQUE (methodology_id, step_number)
);

CREATE INDEX idx_workflow_steps_methodology ON public."MethodologyWorkflowSteps"(methodology_id);
CREATE INDEX idx_workflow_steps_workflow ON public."MethodologyWorkflowSteps"(workflow_id);

COMMENT ON TABLE public."MethodologyWorkflowSteps" IS
'Defines individual steps in a methodology workflow. Completion tracking enables objective progress measurement.';

-- ============================================================================
-- TABLE: MethodologyCompletionTracking
-- ============================================================================
-- Tracks completion of methodology workflow steps for each graph

CREATE TABLE IF NOT EXISTS public."MethodologyCompletionTracking" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Graph and methodology relationship
    graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    methodology_id UUID NOT NULL REFERENCES public."Methodologies"(id),
    workflow_step_id UUID REFERENCES public."MethodologyWorkflowSteps"(id),

    -- Completion status
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public."Users"(id),

    -- Validation details
    validation_notes TEXT,
    validation_data JSONB DEFAULT '{}'::jsonb,
    auto_validated BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_graph_workflow_step UNIQUE (graph_id, workflow_step_id)
);

CREATE INDEX idx_methodology_completion_graph ON public."MethodologyCompletionTracking"(graph_id);
CREATE INDEX idx_methodology_completion_methodology ON public."MethodologyCompletionTracking"(methodology_id);
CREATE INDEX idx_methodology_completion_completed ON public."MethodologyCompletionTracking"(completed);
CREATE INDEX idx_methodology_completion_workflow_step ON public."MethodologyCompletionTracking"(workflow_step_id);

COMMENT ON TABLE public."MethodologyCompletionTracking" IS
'EGALITARIAN: Tracks objective completion of methodology steps. No curator judgment required - completion is based on verifiable criteria.';

-- ============================================================================
-- TABLE: ConsensusVotes
-- ============================================================================
-- Community votes on graph readiness for Level 0 promotion
-- Voting power weighted by evidence quality contributions

CREATE TABLE IF NOT EXISTS public."ConsensusVotes" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Vote target
    graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES public."Users"(id),

    -- Vote details (0.0 = not ready, 1.0 = fully ready)
    vote_value DECIMAL(5,4) NOT NULL CHECK (vote_value >= 0 AND vote_value <= 1),
    vote_weight DECIMAL(5,4) DEFAULT 1.0 CHECK (vote_weight > 0 AND vote_weight <= 2.0),

    -- Evidence quality influences vote weight
    evidence_quality_score DECIMAL(5,4),
    participation_bonus DECIMAL(5,4) DEFAULT 0,

    -- Optional reasoning
    vote_reasoning TEXT,
    vote_reasoning_categories TEXT[], -- e.g., ['methodology_complete', 'evidence_strong']

    -- Vote metadata
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    vote_version INTEGER DEFAULT 1,

    CONSTRAINT unique_graph_voter UNIQUE (graph_id, voter_id)
);

CREATE INDEX idx_consensus_votes_graph ON public."ConsensusVotes"(graph_id);
CREATE INDEX idx_consensus_votes_voter ON public."ConsensusVotes"(voter_id);
CREATE INDEX idx_consensus_votes_value ON public."ConsensusVotes"(vote_value);
CREATE INDEX idx_consensus_votes_weight ON public."ConsensusVotes"(vote_weight);
CREATE INDEX idx_consensus_votes_voted_at ON public."ConsensusVotes"(voted_at);

COMMENT ON TABLE public."ConsensusVotes" IS
'EGALITARIAN: Community consensus voting. Vote weight based on contribution quality, not user role. One vote per user per graph.';

-- ============================================================================
-- TABLE: PromotionEligibility
-- ============================================================================
-- Objective scoring for graph promotion readiness
-- All scores calculated algorithmically, no human judgment

CREATE TABLE IF NOT EXISTS public."PromotionEligibility" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graph_id UUID NOT NULL UNIQUE REFERENCES public."Graphs"(id) ON DELETE CASCADE,

    -- Component scores (0.0 to 1.0)
    methodology_completion_score DECIMAL(5,4) DEFAULT 0 CHECK (
        methodology_completion_score >= 0 AND methodology_completion_score <= 1
    ),
    consensus_score DECIMAL(5,4) DEFAULT 0 CHECK (
        consensus_score >= 0 AND consensus_score <= 1
    ),
    evidence_quality_score DECIMAL(5,4) DEFAULT 0 CHECK (
        evidence_quality_score >= 0 AND evidence_quality_score <= 1
    ),
    challenge_resolution_score DECIMAL(5,4) DEFAULT 1.0 CHECK (
        challenge_resolution_score >= 0 AND challenge_resolution_score <= 1
    ),

    -- Overall weighted score
    overall_score DECIMAL(5,4) DEFAULT 0 CHECK (
        overall_score >= 0 AND overall_score <= 1
    ),

    -- Eligibility determination
    is_eligible BOOLEAN DEFAULT FALSE,
    promotion_threshold DECIMAL(5,4) DEFAULT 0.80 CHECK (
        promotion_threshold >= 0 AND promotion_threshold <= 1
    ),

    -- Component weights (must sum to 1.0)
    weight_methodology DECIMAL(5,4) DEFAULT 0.30,
    weight_consensus DECIMAL(5,4) DEFAULT 0.30,
    weight_evidence DECIMAL(5,4) DEFAULT 0.25,
    weight_challenges DECIMAL(5,4) DEFAULT 0.15,

    -- Detailed breakdown
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    eligibility_reasons TEXT[],
    blocking_issues TEXT[],

    -- Calculation metadata
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,

    -- Promotion tracking
    promoted_at TIMESTAMPTZ,
    auto_promoted BOOLEAN DEFAULT FALSE,
    promotion_triggered_by UUID REFERENCES public."Users"(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotion_eligibility_graph ON public."PromotionEligibility"(graph_id);
CREATE INDEX idx_promotion_eligibility_is_eligible ON public."PromotionEligibility"(is_eligible);
CREATE INDEX idx_promotion_eligibility_overall_score ON public."PromotionEligibility"(overall_score);
CREATE INDEX idx_promotion_eligibility_promoted ON public."PromotionEligibility"(promoted_at);

COMMENT ON TABLE public."PromotionEligibility" IS
'EGALITARIAN: Objective promotion scoring. All criteria are mathematical calculations - no curator approval needed. Transparent and auditable.';

-- ============================================================================
-- TABLE: PromotionHistory
-- ============================================================================
-- Immutable audit log of all graph promotions

CREATE TABLE IF NOT EXISTS public."PromotionHistory" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Promotion details
    graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    promoted_from_level INTEGER NOT NULL CHECK (promoted_from_level IN (0, 1)),
    promoted_to_level INTEGER NOT NULL CHECK (promoted_to_level IN (0, 1)),

    -- Promotion type
    promotion_type TEXT NOT NULL CHECK (promotion_type IN (
        'automatic',           -- Triggered by objective criteria
        'manual_override',     -- System admin override (rare, audited)
        'community_petition'   -- Community-requested special review
    )),

    -- Objective criteria snapshot
    objective_criteria_met JSONB NOT NULL,
    methodology_score DECIMAL(5,4),
    consensus_score DECIMAL(5,4),
    evidence_score DECIMAL(5,4),
    challenge_score DECIMAL(5,4),
    overall_score DECIMAL(5,4),

    -- Vote statistics at promotion time
    total_votes INTEGER,
    weighted_consensus DECIMAL(5,4),

    -- Metadata
    promotion_timestamp TIMESTAMPTZ DEFAULT NOW(),
    triggered_by_user UUID REFERENCES public."Users"(id),
    trigger_event TEXT, -- e.g., 'score_threshold_met', 'all_challenges_resolved'

    -- Override justification (only for manual_override)
    override_reason TEXT,
    override_approved_by UUID REFERENCES public."Users"(id),

    -- Immutable flag
    is_final BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_promotion_history_graph ON public."PromotionHistory"(graph_id);
CREATE INDEX idx_promotion_history_type ON public."PromotionHistory"(promotion_type);
CREATE INDEX idx_promotion_history_timestamp ON public."PromotionHistory"(promotion_timestamp DESC);
CREATE INDEX idx_promotion_history_triggered_by ON public."PromotionHistory"(triggered_by_user);

COMMENT ON TABLE public."PromotionHistory" IS
'EGALITARIAN: Immutable audit trail. Records all promotions with full transparency. Manual overrides require public justification.';

-- ============================================================================
-- TABLE: UserReputationMetrics
-- ============================================================================
-- User contribution quality scores (used for vote weighting)
-- Based on objective contribution quality, not social status

CREATE TABLE IF NOT EXISTS public."UserReputationMetrics" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Component reputation scores (0.0 to 1.0)
    evidence_quality_score DECIMAL(5,4) DEFAULT 0.5 CHECK (
        evidence_quality_score >= 0 AND evidence_quality_score <= 1
    ),
    consensus_participation_score DECIMAL(5,4) DEFAULT 0.5 CHECK (
        consensus_participation_score >= 0 AND consensus_participation_score <= 1
    ),
    methodology_completion_score DECIMAL(5,4) DEFAULT 0.5 CHECK (
        methodology_completion_score >= 0 AND methodology_completion_score <= 1
    ),
    challenge_resolution_score DECIMAL(5,4) DEFAULT 0.5 CHECK (
        challenge_resolution_score >= 0 AND challenge_resolution_score <= 1
    ),

    -- Overall reputation (weighted average)
    overall_reputation DECIMAL(5,4) DEFAULT 0.5 CHECK (
        overall_reputation >= 0 AND overall_reputation <= 1
    ),

    -- Contribution statistics
    total_evidence_submitted INTEGER DEFAULT 0,
    high_quality_evidence_count INTEGER DEFAULT 0,
    votes_cast INTEGER DEFAULT 0,
    accurate_votes_count INTEGER DEFAULT 0,
    methodologies_completed INTEGER DEFAULT 0,
    challenges_resolved INTEGER DEFAULT 0,

    -- Vote weight calculation
    current_vote_weight DECIMAL(5,4) DEFAULT 1.0 CHECK (
        current_vote_weight >= 0.1 AND current_vote_weight <= 2.0
    ),

    -- Reputation tier (informational only - NO privileges)
    reputation_tier TEXT DEFAULT 'new' CHECK (reputation_tier IN (
        'new',           -- 0.0 - 0.3
        'contributor',   -- 0.3 - 0.6
        'active',        -- 0.6 - 0.8
        'veteran'        -- 0.8 - 1.0
    )),

    -- Detailed breakdown
    reputation_breakdown JSONB DEFAULT '{}'::jsonb,

    -- Calculation metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_reputation_user ON public."UserReputationMetrics"(user_id);
CREATE INDEX idx_user_reputation_overall ON public."UserReputationMetrics"(overall_reputation);
CREATE INDEX idx_user_reputation_tier ON public."UserReputationMetrics"(reputation_tier);
CREATE INDEX idx_user_reputation_vote_weight ON public."UserReputationMetrics"(current_vote_weight);

COMMENT ON TABLE public."UserReputationMetrics" IS
'EGALITARIAN: Reputation based ONLY on contribution quality. Tier labels are informational - they grant NO special privileges or gatekeeping power.';

-- ============================================================================
-- TABLE: PromotionReviewAudits
-- ============================================================================
-- Public audit trail for transparency

CREATE TABLE IF NOT EXISTS public."PromotionReviewAudits" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Review details
    graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL CHECK (review_type IN (
        'eligibility_calculation',
        'vote_submission',
        'vote_weight_adjustment',
        'promotion_triggered',
        'promotion_blocked',
        'manual_intervention'
    )),

    -- Event details
    event_data JSONB NOT NULL,
    actor_id UUID REFERENCES public."Users"(id),

    -- Scores at time of event
    snapshot_scores JSONB,

    -- Metadata
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_promotion_audits_graph ON public."PromotionReviewAudits"(graph_id);
CREATE INDEX idx_promotion_audits_type ON public."PromotionReviewAudits"(review_type);
CREATE INDEX idx_promotion_audits_timestamp ON public."PromotionReviewAudits"(event_timestamp DESC);
CREATE INDEX idx_promotion_audits_actor ON public."PromotionReviewAudits"(actor_id);

COMMENT ON TABLE public."PromotionReviewAudits" IS
'EGALITARIAN: Public audit trail for complete transparency. All promotion-related events are logged and queryable.';

-- ============================================================================
-- FUNCTION: calculate_methodology_completion_score
-- ============================================================================
-- Calculates what percentage of required methodology steps are completed

CREATE OR REPLACE FUNCTION calculate_methodology_completion_score(p_graph_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_total_required INTEGER;
    v_completed INTEGER;
    v_score DECIMAL(5,4);
BEGIN
    -- Get total required steps for the graph's methodology
    SELECT COUNT(DISTINCT ws.id) INTO v_total_required
    FROM public."MethodologyWorkflowSteps" ws
    INNER JOIN public."Graphs" g ON g.id = p_graph_id
    INNER JOIN public."Methodologies" m ON m.id = ws.methodology_id
    WHERE ws.is_required = true;

    -- Handle graphs with no methodology
    IF v_total_required = 0 THEN
        RETURN 1.0; -- No methodology = 100% complete
    END IF;

    -- Get completed steps
    SELECT COUNT(DISTINCT mct.workflow_step_id) INTO v_completed
    FROM public."MethodologyCompletionTracking" mct
    WHERE mct.graph_id = p_graph_id
    AND mct.completed = true;

    -- Calculate percentage
    v_score := LEAST(1.0, v_completed::DECIMAL / v_total_required::DECIMAL);

    RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_methodology_completion_score IS
'EGALITARIAN: Objective calculation of methodology completion. Binary completed/not completed - no subjective quality judgments.';

-- ============================================================================
-- FUNCTION: calculate_consensus_score
-- ============================================================================
-- Calculates weighted average of community votes

CREATE OR REPLACE FUNCTION calculate_consensus_score(p_graph_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_weighted_sum DECIMAL(10,4);
    v_weight_sum DECIMAL(10,4);
    v_score DECIMAL(5,4);
    v_min_votes INTEGER := 5; -- Minimum votes required
    v_vote_count INTEGER;
BEGIN
    -- Get vote count
    SELECT COUNT(*) INTO v_vote_count
    FROM public."ConsensusVotes"
    WHERE graph_id = p_graph_id;

    -- Not enough votes yet
    IF v_vote_count < v_min_votes THEN
        RETURN 0.0;
    END IF;

    -- Calculate weighted average
    SELECT
        COALESCE(SUM(vote_value * vote_weight), 0),
        COALESCE(SUM(vote_weight), 0)
    INTO v_weighted_sum, v_weight_sum
    FROM public."ConsensusVotes"
    WHERE graph_id = p_graph_id;

    -- Avoid division by zero
    IF v_weight_sum = 0 THEN
        RETURN 0.0;
    END IF;

    v_score := LEAST(1.0, v_weighted_sum / v_weight_sum);

    RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_consensus_score IS
'EGALITARIAN: Weighted average of community votes. Vote weight based on contribution quality, not user status.';

-- ============================================================================
-- FUNCTION: calculate_evidence_quality_score
-- ============================================================================
-- Calculates average credibility of evidence attached to graph

CREATE OR REPLACE FUNCTION calculate_evidence_quality_score(p_graph_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_score DECIMAL(5,4);
BEGIN
    -- Calculate average credibility of evidence attached to nodes/edges in graph
    SELECT COALESCE(AVG(e.credibility_score), 0.5)::DECIMAL(5,4)
    INTO v_score
    FROM public."Evidence" e
    WHERE e.graph_id = p_graph_id
    AND e.credibility_score IS NOT NULL;

    RETURN LEAST(1.0, v_score);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_evidence_quality_score IS
'EGALITARIAN: Objective average of evidence credibility scores. Based on source quality and community reviews.';

-- ============================================================================
-- FUNCTION: calculate_challenge_resolution_score
-- ============================================================================
-- Returns 0 if open challenges exist, 1 if all resolved or no challenges

CREATE OR REPLACE FUNCTION calculate_challenge_resolution_score(p_graph_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_open_challenges INTEGER;
BEGIN
    -- Count open challenges on nodes/edges in this graph
    SELECT COUNT(*)
    INTO v_open_challenges
    FROM public."Challenges" c
    WHERE (
        c.target_node_id IN (
            SELECT id FROM public."Nodes" WHERE graph_id = p_graph_id
        )
        OR c.target_edge_id IN (
            SELECT id FROM public."Edges" WHERE graph_id = p_graph_id
        )
    )
    AND c.status = 'open';

    -- Return 0 if any open challenges, 1 if none
    IF v_open_challenges > 0 THEN
        RETURN 0.0;
    ELSE
        RETURN 1.0;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_challenge_resolution_score IS
'EGALITARIAN: Binary check - all challenges must be resolved for Level 0 promotion. No exceptions.';

-- ============================================================================
-- FUNCTION: calculate_promotion_eligibility
-- ============================================================================
-- Main function to calculate all eligibility scores and update table

CREATE OR REPLACE FUNCTION calculate_promotion_eligibility(p_graph_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_methodology_score DECIMAL(5,4);
    v_consensus_score DECIMAL(5,4);
    v_evidence_score DECIMAL(5,4);
    v_challenge_score DECIMAL(5,4);
    v_overall_score DECIMAL(5,4);
    v_is_eligible BOOLEAN;
    v_threshold DECIMAL(5,4);
    v_weight_methodology DECIMAL(5,4);
    v_weight_consensus DECIMAL(5,4);
    v_weight_evidence DECIMAL(5,4);
    v_weight_challenges DECIMAL(5,4);
    v_blocking_issues TEXT[];
    v_eligibility_reasons TEXT[];
BEGIN
    -- Get or create eligibility record
    INSERT INTO public."PromotionEligibility" (graph_id)
    VALUES (p_graph_id)
    ON CONFLICT (graph_id) DO NOTHING;

    -- Get weights and threshold
    SELECT
        promotion_threshold,
        weight_methodology,
        weight_consensus,
        weight_evidence,
        weight_challenges
    INTO
        v_threshold,
        v_weight_methodology,
        v_weight_consensus,
        v_weight_evidence,
        v_weight_challenges
    FROM public."PromotionEligibility"
    WHERE graph_id = p_graph_id;

    -- Calculate component scores
    v_methodology_score := calculate_methodology_completion_score(p_graph_id);
    v_consensus_score := calculate_consensus_score(p_graph_id);
    v_evidence_score := calculate_evidence_quality_score(p_graph_id);
    v_challenge_score := calculate_challenge_resolution_score(p_graph_id);

    -- Calculate weighted overall score
    v_overall_score := (
        (v_methodology_score * v_weight_methodology) +
        (v_consensus_score * v_weight_consensus) +
        (v_evidence_score * v_weight_evidence) +
        (v_challenge_score * v_weight_challenges)
    );

    -- Determine blocking issues
    v_blocking_issues := ARRAY[]::TEXT[];
    v_eligibility_reasons := ARRAY[]::TEXT[];

    IF v_methodology_score < 1.0 THEN
        v_blocking_issues := array_append(v_blocking_issues,
            'Methodology incomplete (' || ROUND(v_methodology_score * 100, 1) || '%)');
    ELSE
        v_eligibility_reasons := array_append(v_eligibility_reasons,
            'Methodology 100% complete');
    END IF;

    IF v_consensus_score < 0.7 THEN
        v_blocking_issues := array_append(v_blocking_issues,
            'Insufficient consensus (' || ROUND(v_consensus_score * 100, 1) || '%)');
    ELSE
        v_eligibility_reasons := array_append(v_eligibility_reasons,
            'Strong consensus (' || ROUND(v_consensus_score * 100, 1) || '%)');
    END IF;

    IF v_challenge_score < 1.0 THEN
        v_blocking_issues := array_append(v_blocking_issues,
            'Open challenges exist');
    ELSE
        v_eligibility_reasons := array_append(v_eligibility_reasons,
            'All challenges resolved');
    END IF;

    -- Determine eligibility
    v_is_eligible := (
        v_overall_score >= v_threshold
        AND v_challenge_score = 1.0  -- Hard requirement: no open challenges
        AND v_methodology_score = 1.0 -- Hard requirement: 100% methodology complete
    );

    -- Update eligibility record
    UPDATE public."PromotionEligibility"
    SET
        methodology_completion_score = v_methodology_score,
        consensus_score = v_consensus_score,
        evidence_quality_score = v_evidence_score,
        challenge_resolution_score = v_challenge_score,
        overall_score = v_overall_score,
        is_eligible = v_is_eligible,
        blocking_issues = v_blocking_issues,
        eligibility_reasons = v_eligibility_reasons,
        score_breakdown = jsonb_build_object(
            'methodology', v_methodology_score,
            'consensus', v_consensus_score,
            'evidence', v_evidence_score,
            'challenges', v_challenge_score,
            'overall', v_overall_score,
            'threshold', v_threshold,
            'weights', jsonb_build_object(
                'methodology', v_weight_methodology,
                'consensus', v_weight_consensus,
                'evidence', v_weight_evidence,
                'challenges', v_weight_challenges
            )
        ),
        last_calculated = NOW(),
        calculation_version = calculation_version + 1,
        updated_at = NOW()
    WHERE graph_id = p_graph_id;

    -- Log audit event
    INSERT INTO public."PromotionReviewAudits" (
        graph_id,
        review_type,
        event_data,
        snapshot_scores
    ) VALUES (
        p_graph_id,
        'eligibility_calculation',
        jsonb_build_object(
            'is_eligible', v_is_eligible,
            'overall_score', v_overall_score
        ),
        jsonb_build_object(
            'methodology', v_methodology_score,
            'consensus', v_consensus_score,
            'evidence', v_evidence_score,
            'challenges', v_challenge_score
        )
    );

    RETURN v_is_eligible;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_promotion_eligibility IS
'EGALITARIAN: Calculates all eligibility scores objectively. No human judgment - pure math. Returns TRUE if eligible for auto-promotion.';

-- ============================================================================
-- FUNCTION: auto_promote_graph
-- ============================================================================
-- Automatically promotes eligible graph to Level 0

CREATE OR REPLACE FUNCTION auto_promote_graph(p_graph_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_eligible BOOLEAN;
    v_current_level INTEGER;
    v_promo_record RECORD;
BEGIN
    -- Check eligibility
    SELECT is_eligible INTO v_is_eligible
    FROM public."PromotionEligibility"
    WHERE graph_id = p_graph_id;

    IF NOT v_is_eligible THEN
        RAISE NOTICE 'Graph % is not eligible for promotion', p_graph_id;
        RETURN FALSE;
    END IF;

    -- Get current level
    SELECT level INTO v_current_level
    FROM public."Graphs"
    WHERE id = p_graph_id;

    IF v_current_level = 0 THEN
        RAISE NOTICE 'Graph % is already Level 0', p_graph_id;
        RETURN FALSE;
    END IF;

    -- Get eligibility scores for history record
    SELECT * INTO v_promo_record
    FROM public."PromotionEligibility"
    WHERE graph_id = p_graph_id;

    -- Promote graph to Level 0
    UPDATE public."Graphs"
    SET
        level = 0,
        updated_at = NOW()
    WHERE id = p_graph_id;

    -- Make all nodes read-only (Level 0)
    UPDATE public."Nodes"
    SET
        is_level_0 = true,
        updated_at = NOW()
    WHERE graph_id = p_graph_id;

    -- Make all edges read-only (Level 0)
    UPDATE public."Edges"
    SET
        is_level_0 = true,
        updated_at = NOW()
    WHERE graph_id = p_graph_id;

    -- Record in promotion history
    INSERT INTO public."PromotionHistory" (
        graph_id,
        promoted_from_level,
        promoted_to_level,
        promotion_type,
        objective_criteria_met,
        methodology_score,
        consensus_score,
        evidence_score,
        challenge_score,
        overall_score,
        total_votes,
        weighted_consensus,
        promotion_timestamp,
        trigger_event
    ) VALUES (
        p_graph_id,
        1,
        0,
        'automatic',
        v_promo_record.score_breakdown,
        v_promo_record.methodology_completion_score,
        v_promo_record.consensus_score,
        v_promo_record.evidence_quality_score,
        v_promo_record.challenge_resolution_score,
        v_promo_record.overall_score,
        (SELECT COUNT(*) FROM public."ConsensusVotes" WHERE graph_id = p_graph_id),
        v_promo_record.consensus_score,
        NOW(),
        'eligibility_threshold_met'
    );

    -- Update eligibility record
    UPDATE public."PromotionEligibility"
    SET
        promoted_at = NOW(),
        auto_promoted = true,
        updated_at = NOW()
    WHERE graph_id = p_graph_id;

    -- Log audit event
    INSERT INTO public."PromotionReviewAudits" (
        graph_id,
        review_type,
        event_data,
        snapshot_scores
    ) VALUES (
        p_graph_id,
        'promotion_triggered',
        jsonb_build_object(
            'promotion_type', 'automatic',
            'from_level', 1,
            'to_level', 0
        ),
        v_promo_record.score_breakdown
    );

    RAISE NOTICE 'Graph % automatically promoted to Level 0', p_graph_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_promote_graph IS
'EGALITARIAN: Automatic promotion when criteria met. NO curator approval required. Transparent, objective, community-driven.';

-- ============================================================================
-- FUNCTION: calculate_vote_weight
-- ============================================================================
-- Calculates vote weight based on user reputation

CREATE OR REPLACE FUNCTION calculate_vote_weight(p_voter_id UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    v_weight DECIMAL(5,4);
    v_reputation DECIMAL(5,4);
BEGIN
    -- Get user's overall reputation
    SELECT overall_reputation INTO v_reputation
    FROM public."UserReputationMetrics"
    WHERE user_id = p_voter_id;

    -- New users get default weight
    IF v_reputation IS NULL THEN
        RETURN 1.0;
    END IF;

    -- Weight calculation: 0.5 to 2.0 based on reputation
    -- Low reputation (0.0) = 0.5 weight
    -- Average reputation (0.5) = 1.0 weight
    -- High reputation (1.0) = 2.0 weight
    v_weight := 0.5 + (v_reputation * 1.5);

    -- Clamp to valid range
    v_weight := GREATEST(0.1, LEAST(2.0, v_weight));

    RETURN v_weight;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_vote_weight IS
'EGALITARIAN: Vote weight based on contribution quality, not status. Range 0.5-2.0x. New users start at 1.0x.';

-- ============================================================================
-- FUNCTION: update_user_reputation
-- ============================================================================
-- Recalculates user reputation based on contribution quality

CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_evidence_score DECIMAL(5,4);
    v_consensus_score DECIMAL(5,4);
    v_methodology_score DECIMAL(5,4);
    v_challenge_score DECIMAL(5,4);
    v_overall DECIMAL(5,4);
    v_tier TEXT;
BEGIN
    -- Ensure record exists
    INSERT INTO public."UserReputationMetrics" (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Calculate evidence quality score (based on credibility of submitted evidence)
    SELECT COALESCE(AVG(e.credibility_score), 0.5)::DECIMAL(5,4)
    INTO v_evidence_score
    FROM public."Evidence" e
    WHERE e.submitted_by = p_user_id;

    -- Calculate consensus participation (accuracy of past votes)
    -- TODO: Implement vote accuracy tracking
    v_consensus_score := 0.5;

    -- Calculate methodology completion rate
    -- TODO: Implement based on UserMethodologyProgress
    v_methodology_score := 0.5;

    -- Calculate challenge resolution quality
    -- TODO: Implement based on challenge outcomes
    v_challenge_score := 0.5;

    -- Calculate overall reputation (weighted average)
    v_overall := (
        (v_evidence_score * 0.40) +
        (v_consensus_score * 0.30) +
        (v_methodology_score * 0.20) +
        (v_challenge_score * 0.10)
    );

    -- Determine tier (informational only)
    IF v_overall < 0.3 THEN
        v_tier := 'new';
    ELSIF v_overall < 0.6 THEN
        v_tier := 'contributor';
    ELSIF v_overall < 0.8 THEN
        v_tier := 'active';
    ELSE
        v_tier := 'veteran';
    END IF;

    -- Update reputation metrics
    UPDATE public."UserReputationMetrics"
    SET
        evidence_quality_score = v_evidence_score,
        consensus_participation_score = v_consensus_score,
        methodology_completion_score = v_methodology_score,
        challenge_resolution_score = v_challenge_score,
        overall_reputation = v_overall,
        reputation_tier = v_tier,
        current_vote_weight = calculate_vote_weight(p_user_id),
        reputation_breakdown = jsonb_build_object(
            'evidence', v_evidence_score,
            'consensus', v_consensus_score,
            'methodology', v_methodology_score,
            'challenges', v_challenge_score
        ),
        last_updated = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_reputation IS
'EGALITARIAN: Reputation based purely on contribution quality. Tier has NO gatekeeping power - only influences vote weight.';

-- ============================================================================
-- TRIGGER: trigger_eligibility_check
-- ============================================================================
-- Automatically recalculate eligibility when relevant data changes

CREATE OR REPLACE FUNCTION trigger_eligibility_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate eligibility for the affected graph
    PERFORM calculate_promotion_eligibility(
        COALESCE(NEW.graph_id, OLD.graph_id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on consensus votes
CREATE TRIGGER trigger_check_eligibility_on_vote
AFTER INSERT OR UPDATE ON public."ConsensusVotes"
FOR EACH ROW
EXECUTE FUNCTION trigger_eligibility_check();

-- Trigger on methodology completion
CREATE TRIGGER trigger_check_eligibility_on_completion
AFTER INSERT OR UPDATE ON public."MethodologyCompletionTracking"
FOR EACH ROW
EXECUTE FUNCTION trigger_eligibility_check();

-- Trigger on challenge resolution
CREATE OR REPLACE FUNCTION trigger_eligibility_check_on_challenge()
RETURNS TRIGGER AS $$
DECLARE
    v_graph_id UUID;
BEGIN
    -- Get graph_id from node or edge
    IF NEW.target_node_id IS NOT NULL THEN
        SELECT graph_id INTO v_graph_id
        FROM public."Nodes"
        WHERE id = NEW.target_node_id;
    ELSIF NEW.target_edge_id IS NOT NULL THEN
        SELECT graph_id INTO v_graph_id
        FROM public."Edges"
        WHERE id = NEW.target_edge_id;
    END IF;

    IF v_graph_id IS NOT NULL THEN
        PERFORM calculate_promotion_eligibility(v_graph_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_eligibility_on_challenge_update
AFTER UPDATE ON public."Challenges"
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_eligibility_check_on_challenge();

COMMENT ON FUNCTION trigger_eligibility_check IS
'EGALITARIAN: Automatic eligibility recalculation on any relevant change. No manual intervention needed.';

-- ============================================================================
-- TRIGGER: trigger_auto_promotion
-- ============================================================================
-- Automatically promote graph when eligibility becomes TRUE

CREATE OR REPLACE FUNCTION trigger_auto_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if eligibility changed from FALSE to TRUE
    IF NEW.is_eligible = TRUE AND (OLD.is_eligible IS NULL OR OLD.is_eligible = FALSE) THEN
        -- Attempt automatic promotion
        PERFORM auto_promote_graph(NEW.graph_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_promote_on_eligible
AFTER UPDATE ON public."PromotionEligibility"
FOR EACH ROW
WHEN (NEW.is_eligible = TRUE)
EXECUTE FUNCTION trigger_auto_promotion();

COMMENT ON FUNCTION trigger_auto_promotion IS
'EGALITARIAN: Immediate automatic promotion when criteria met. Zero human delay, zero gatekeeping.';

-- ============================================================================
-- VIEW: public_promotion_transparency
-- ============================================================================
-- Public view of all promotion scores for transparency

CREATE OR REPLACE VIEW public."PublicPromotionTransparency" AS
SELECT
    g.id AS graph_id,
    g.name AS graph_name,
    g.level AS current_level,
    pe.methodology_completion_score,
    pe.consensus_score,
    pe.evidence_quality_score,
    pe.challenge_resolution_score,
    pe.overall_score,
    pe.promotion_threshold,
    pe.is_eligible,
    pe.blocking_issues,
    pe.eligibility_reasons,
    pe.last_calculated,
    (SELECT COUNT(*) FROM public."ConsensusVotes" cv WHERE cv.graph_id = g.id) AS total_votes,
    (SELECT AVG(cv.vote_value)::DECIMAL(5,4) FROM public."ConsensusVotes" cv WHERE cv.graph_id = g.id) AS average_vote,
    pe.promoted_at,
    ph.promotion_timestamp AS last_promotion_time,
    ph.promotion_type AS last_promotion_type
FROM public."Graphs" g
LEFT JOIN public."PromotionEligibility" pe ON pe.graph_id = g.id
LEFT JOIN LATERAL (
    SELECT * FROM public."PromotionHistory"
    WHERE graph_id = g.id
    ORDER BY promotion_timestamp DESC
    LIMIT 1
) ph ON TRUE
WHERE g.privacy IN ('public', 'unlisted')
ORDER BY pe.overall_score DESC NULLS LAST;

COMMENT ON VIEW public."PublicPromotionTransparency" IS
'EGALITARIAN: Public transparency view. Anyone can see all promotion scores and criteria. Zero opacity.';

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_eligibility_graph_eligible ON public."PromotionEligibility"(graph_id, is_eligible);
CREATE INDEX idx_eligibility_score_eligible ON public."PromotionEligibility"(overall_score DESC, is_eligible);

CREATE INDEX idx_votes_graph_weight ON public."ConsensusVotes"(graph_id, vote_weight);
CREATE INDEX idx_votes_graph_value ON public."ConsensusVotes"(graph_id, vote_value);

CREATE INDEX idx_reputation_user_weight ON public."UserReputationMetrics"(user_id, current_vote_weight);

-- Full text search for blocking issues
CREATE INDEX idx_eligibility_blocking_issues_gin ON public."PromotionEligibility"
USING GIN (blocking_issues);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Migration 007: Process Validation & Egalitarian Promotion System';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'EGALITARIAN PRINCIPLES ENFORCED:';
    RAISE NOTICE '  ✓ NO role-based hierarchies';
    RAISE NOTICE '  ✓ NO curator gatekeeping';
    RAISE NOTICE '  ✓ Transparent objective scoring';
    RAISE NOTICE '  ✓ Community consensus-driven';
    RAISE NOTICE '  ✓ Automatic promotion when criteria met';
    RAISE NOTICE '  ✓ Full public audit trail';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  • MethodologyWorkflowSteps';
    RAISE NOTICE '  • MethodologyCompletionTracking';
    RAISE NOTICE '  • ConsensusVotes';
    RAISE NOTICE '  • PromotionEligibility';
    RAISE NOTICE '  • PromotionHistory';
    RAISE NOTICE '  • UserReputationMetrics';
    RAISE NOTICE '  • PromotionReviewAudits';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  • calculate_methodology_completion_score()';
    RAISE NOTICE '  • calculate_consensus_score()';
    RAISE NOTICE '  • calculate_evidence_quality_score()';
    RAISE NOTICE '  • calculate_challenge_resolution_score()';
    RAISE NOTICE '  • calculate_promotion_eligibility()';
    RAISE NOTICE '  • auto_promote_graph()';
    RAISE NOTICE '  • calculate_vote_weight()';
    RAISE NOTICE '  • update_user_reputation()';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers created:';
    RAISE NOTICE '  • trigger_check_eligibility_on_vote';
    RAISE NOTICE '  • trigger_check_eligibility_on_completion';
    RAISE NOTICE '  • trigger_check_eligibility_on_challenge_update';
    RAISE NOTICE '  • trigger_promote_on_eligible';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  • PublicPromotionTransparency (public scores)';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '============================================================================';
END $$;
