-- ============================================================================
-- Migration 003: Veracity Score System (Phase 1.3)
-- ============================================================================
-- Description: Implements dynamic veracity scoring for Level 1 nodes/edges
--              based on evidence aggregation, consensus, challenges, source
--              credibility, and temporal decay.
--
-- Author: Veracity System Design Team
-- Date: 2025-10-09
-- Dependencies: Requires base schema with Nodes, Edges, Users, Challenges tables
-- ============================================================================

-- ============================================================================
-- ER DIAGRAM (ASCII)
-- ============================================================================
--
--  ┌─────────────┐
--  │   Sources   │───┐
--  └─────────────┘   │
--        │           │
--        │           │ credibility_score
--        │           │
--        ▼           ▼
--  ┌─────────────────────────┐
--  │  SourceCredibility      │
--  │  ─────────────────────  │
--  │  + source_id (FK)       │
--  │  + credibility_score    │
--  │  + evidence_count       │
--  │  + challenge_ratio      │
--  │  + consensus_alignment  │
--  │  + last_calculated_at   │
--  └─────────────────────────┘
--        │
--        │ provides
--        │
--        ▼
--  ┌─────────────────────────┐         ┌──────────────┐
--  │      Evidence           │◄────────│ Nodes/Edges  │
--  │  ─────────────────────  │  support└──────────────┘
--  │  + target_node_id (FK)  │
--  │  + target_edge_id (FK)  │
--  │  + source_id (FK)       │
--  │  + evidence_type        │
--  │  + weight               │
--  │  + confidence           │
--  │  + content              │
--  │  + temporal_relevance   │
--  │  + created_at           │
--  └─────────────────────────┘
--        │
--        │ aggregates into
--        │
--        ▼
--  ┌─────────────────────────┐
--  │  VeracityScores         │
--  │  ─────────────────────  │
--  │  + target_node_id (FK)  │
--  │  + target_edge_id (FK)  │
--  │  + veracity_score       │
--  │  + confidence_interval  │
--  │  + evidence_weight_sum  │
--  │  + consensus_score      │
--  │  + challenge_impact     │
--  │  + temporal_decay       │
--  │  + calculation_method   │
--  │  + calculated_at        │
--  └─────────────────────────┘
--        │
--        │ history tracked by
--        │
--        ▼
--  ┌─────────────────────────┐
--  │ VeracityScoreHistory    │
--  │  ─────────────────────  │
--  │  + veracity_score_id    │
--  │  + old_score            │
--  │  + new_score            │
--  │  + change_reason        │
--  │  + changed_at           │
--  └─────────────────────────┘
--
-- ============================================================================

-- ============================================================================
-- TABLE: Sources
-- ============================================================================
-- Tracks sources that provide evidence for claims
-- Sources can be: academic papers, news articles, datasets, expert testimony,
-- government reports, etc.

CREATE TABLE IF NOT EXISTS public."Sources" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source identification
    source_type TEXT NOT NULL CHECK (source_type IN (
        'academic_paper',
        'news_article',
        'government_report',
        'dataset',
        'expert_testimony',
        'book',
        'website',
        'video',
        'image',
        'other'
    )),

    -- Source details
    title TEXT NOT NULL,
    authors TEXT[],  -- Array of author names
    url TEXT,
    doi TEXT,  -- Digital Object Identifier for academic sources
    isbn TEXT,  -- For books
    publication_date DATE,
    publisher TEXT,

    -- Content metadata
    abstract TEXT,
    content_hash TEXT,  -- Hash of source content for deduplication

    -- Source verification
    is_verified BOOLEAN DEFAULT false,
    verified_by uuid REFERENCES public."Users"(id),
    verified_at TIMESTAMPTZ,

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    submitted_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT unique_content_hash UNIQUE (content_hash),
    CONSTRAINT valid_url CHECK (url IS NULL OR url ~ '^https?://'),
    CONSTRAINT valid_doi CHECK (doi IS NULL OR doi ~ '^10\.\d{4,9}/[-._;()/:A-Z0-9]+$')
);

-- ============================================================================
-- TABLE: SourceCredibility
-- ============================================================================
-- Maintains dynamic credibility scores for each source
-- Scores are recalculated based on evidence accuracy, peer validation,
-- and historical performance

CREATE TABLE IF NOT EXISTS public."SourceCredibility" (
    source_id uuid PRIMARY KEY REFERENCES public."Sources"(id) ON DELETE CASCADE,

    -- Core credibility metrics (0.0 to 1.0)
    credibility_score REAL NOT NULL DEFAULT 0.5 CHECK (
        credibility_score >= 0.0 AND credibility_score <= 1.0
    ),

    -- Component scores that feed into credibility
    evidence_accuracy_score REAL DEFAULT 0.5 CHECK (
        evidence_accuracy_score >= 0.0 AND evidence_accuracy_score <= 1.0
    ),
    peer_validation_score REAL DEFAULT 0.5 CHECK (
        peer_validation_score >= 0.0 AND peer_validation_score <= 1.0
    ),
    historical_reliability_score REAL DEFAULT 0.5 CHECK (
        historical_reliability_score >= 0.0 AND historical_reliability_score <= 1.0
    ),

    -- Statistical metrics
    total_evidence_count INTEGER DEFAULT 0 CHECK (total_evidence_count >= 0),
    verified_evidence_count INTEGER DEFAULT 0 CHECK (verified_evidence_count >= 0),
    challenged_evidence_count INTEGER DEFAULT 0 CHECK (challenged_evidence_count >= 0),

    -- Challenge ratio: challenged / total (lower is better)
    challenge_ratio REAL DEFAULT 0.0 CHECK (
        challenge_ratio >= 0.0 AND challenge_ratio <= 1.0
    ),

    -- Consensus alignment: how often source agrees with consensus
    consensus_alignment_score REAL DEFAULT 0.5 CHECK (
        consensus_alignment_score >= 0.0 AND consensus_alignment_score <= 1.0
    ),

    -- Temporal factors
    last_calculated_at TIMESTAMPTZ DEFAULT now(),
    calculation_metadata JSONB DEFAULT '{}',

    -- Audit fields
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: Evidence
-- ============================================================================
-- Links sources to nodes/edges as supporting or refuting evidence
-- Each piece of evidence has a weight, confidence, and temporal relevance

CREATE TABLE IF NOT EXISTS public."Evidence" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target: either a Node or Edge (mutually exclusive)
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Source reference
    source_id uuid NOT NULL REFERENCES public."Sources"(id) ON DELETE CASCADE,

    -- Evidence classification
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'supporting',
        'refuting',
        'neutral',
        'clarifying'
    )),

    -- Evidence strength metrics (0.0 to 1.0)
    weight REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),
    confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),

    -- Content
    content TEXT NOT NULL,
    content_excerpt TEXT,  -- Specific excerpt from source
    page_reference TEXT,   -- Page number or section reference

    -- Temporal relevance (decays over time for time-sensitive claims)
    temporal_relevance REAL DEFAULT 1.0 CHECK (
        temporal_relevance >= 0.0 AND temporal_relevance <= 1.0
    ),
    decay_rate REAL DEFAULT 0.0 CHECK (decay_rate >= 0.0),
    relevant_date DATE,  -- The date this evidence is most relevant to

    -- Verification status
    is_verified BOOLEAN DEFAULT false,
    verified_by uuid REFERENCES public."Users"(id),
    verified_at TIMESTAMPTZ,

    -- Peer review
    peer_review_status TEXT DEFAULT 'pending' CHECK (peer_review_status IN (
        'pending',
        'accepted',
        'rejected',
        'disputed'
    )),
    peer_review_count INTEGER DEFAULT 0,

    -- Additional metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    submitted_by uuid NOT NULL REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT evidence_target_check CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    )
);

-- Add constraint for Level 0 prevention via trigger instead of CHECK
CREATE OR REPLACE FUNCTION check_evidence_level_0()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent evidence for Level 0 nodes (they have fixed veracity = 1.0)
    IF NEW.target_node_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Nodes" WHERE id = NEW.target_node_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot add evidence to Level 0 nodes (they have fixed veracity = 1.0)';
        END IF;
    END IF;

    -- Prevent evidence for Level 0 edges (they have fixed veracity = 1.0)
    IF NEW.target_edge_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Edges" WHERE id = NEW.target_edge_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot add evidence to Level 0 edges (they have fixed veracity = 1.0)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_level_0_check
    BEFORE INSERT OR UPDATE ON public."Evidence"
    FOR EACH ROW
    EXECUTE FUNCTION check_evidence_level_0();

-- ============================================================================
-- TABLE: VeracityScores
-- ============================================================================
-- Stores calculated veracity scores for Level 1 nodes and edges
-- Level 0 nodes/edges have fixed veracity = 1.0 and are not stored here

CREATE TABLE IF NOT EXISTS public."VeracityScores" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target: either a Node or Edge (mutually exclusive)
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Core veracity score (0.0 to 1.0)
    veracity_score REAL NOT NULL DEFAULT 0.5 CHECK (
        veracity_score >= 0.0 AND veracity_score <= 1.0
    ),

    -- Confidence interval for the score
    confidence_interval_lower REAL CHECK (
        confidence_interval_lower >= 0.0 AND confidence_interval_lower <= 1.0
    ),
    confidence_interval_upper REAL CHECK (
        confidence_interval_upper >= 0.0 AND confidence_interval_upper <= 1.0
    ),

    -- Component scores used in calculation
    evidence_weight_sum REAL DEFAULT 0.0,
    evidence_count INTEGER DEFAULT 0,
    supporting_evidence_weight REAL DEFAULT 0.0,
    refuting_evidence_weight REAL DEFAULT 0.0,

    -- Consensus metrics
    consensus_score REAL DEFAULT 0.5 CHECK (
        consensus_score >= 0.0 AND consensus_score <= 1.0
    ),
    source_count INTEGER DEFAULT 0,
    source_agreement_ratio REAL DEFAULT 0.0,

    -- Challenge impact
    challenge_count INTEGER DEFAULT 0,
    open_challenge_count INTEGER DEFAULT 0,
    challenge_impact REAL DEFAULT 0.0 CHECK (
        challenge_impact >= -1.0 AND challenge_impact <= 0.0
    ),

    -- Temporal decay (for time-sensitive claims)
    temporal_decay_factor REAL DEFAULT 1.0 CHECK (
        temporal_decay_factor >= 0.0 AND temporal_decay_factor <= 1.0
    ),

    -- Calculation metadata
    calculation_method TEXT NOT NULL DEFAULT 'weighted_evidence_v1',
    calculation_metadata JSONB DEFAULT '{}',

    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,  -- When score should be recalculated

    -- Audit fields
    calculated_by TEXT DEFAULT 'system',  -- 'system' or user_id
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT veracity_target_check CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    ),
    CONSTRAINT confidence_interval_valid CHECK (
        confidence_interval_lower IS NULL OR
        confidence_interval_upper IS NULL OR
        confidence_interval_lower <= confidence_interval_upper
    ),
    CONSTRAINT confidence_interval_contains_score CHECK (
        confidence_interval_lower IS NULL OR
        confidence_interval_upper IS NULL OR
        (veracity_score >= confidence_interval_lower AND
         veracity_score <= confidence_interval_upper)
    ),
    -- Only one active score per target
    CONSTRAINT unique_active_score_per_node UNIQUE (target_node_id),
    CONSTRAINT unique_active_score_per_edge UNIQUE (target_edge_id)
);

-- ============================================================================
-- TABLE: VeracityScoreHistory
-- ============================================================================
-- Maintains audit trail of veracity score changes
-- Enables analysis of score evolution and debugging

CREATE TABLE IF NOT EXISTS public."VeracityScoreHistory" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference to current veracity score
    veracity_score_id uuid NOT NULL REFERENCES public."VeracityScores"(id) ON DELETE CASCADE,

    -- Score change
    old_score REAL NOT NULL CHECK (old_score >= 0.0 AND old_score <= 1.0),
    new_score REAL NOT NULL CHECK (new_score >= 0.0 AND new_score <= 1.0),
    score_delta REAL NOT NULL,

    -- Change context
    change_reason TEXT NOT NULL CHECK (change_reason IN (
        'new_evidence',
        'evidence_removed',
        'challenge_created',
        'challenge_resolved',
        'source_credibility_updated',
        'temporal_decay',
        'consensus_shift',
        'manual_recalculation',
        'scheduled_recalculation',
        'system_update'
    )),

    -- Additional context
    triggering_entity_type TEXT CHECK (triggering_entity_type IN (
        'evidence',
        'challenge',
        'source',
        'system',
        'user'
    )),
    triggering_entity_id uuid,  -- ID of evidence, challenge, source, or user

    -- Snapshot of calculation details
    calculation_snapshot JSONB DEFAULT '{}',

    -- Audit fields
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by TEXT  -- 'system' or user_id
);

-- ============================================================================
-- TABLE: EvidenceVotes
-- ============================================================================
-- Allows community voting on evidence quality and relevance
-- Influences evidence weight and source credibility

CREATE TABLE IF NOT EXISTS public."EvidenceVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    evidence_id uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Vote value
    vote_type TEXT NOT NULL CHECK (vote_type IN (
        'helpful',
        'not_helpful',
        'misleading',
        'outdated'
    )),

    -- Optional feedback
    comment TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints: one vote per user per evidence
    CONSTRAINT unique_user_evidence_vote UNIQUE (evidence_id, user_id)
);

-- ============================================================================
-- TABLE: ConsensusSnapshots
-- ============================================================================
-- Periodic snapshots of consensus scores for trending analysis
-- Helps identify emerging consensus or growing disputes

CREATE TABLE IF NOT EXISTS public."ConsensusSnapshots" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Consensus metrics at snapshot time
    consensus_score REAL NOT NULL CHECK (consensus_score >= 0.0 AND consensus_score <= 1.0),
    source_count INTEGER NOT NULL,
    evidence_count INTEGER NOT NULL,
    supporting_ratio REAL NOT NULL,

    -- Snapshot metadata
    snapshot_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT consensus_target_check CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Sources indexes
CREATE INDEX idx_sources_source_type ON public."Sources" (source_type);
CREATE INDEX idx_sources_publication_date ON public."Sources" (publication_date DESC);
CREATE INDEX idx_sources_is_verified ON public."Sources" (is_verified);
CREATE INDEX idx_sources_submitted_by ON public."Sources" (submitted_by);
CREATE INDEX idx_sources_content_hash ON public."Sources" (content_hash) WHERE content_hash IS NOT NULL;

-- Evidence indexes
CREATE INDEX idx_evidence_target_node ON public."Evidence" (target_node_id) WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_evidence_target_edge ON public."Evidence" (target_edge_id) WHERE target_edge_id IS NOT NULL;
CREATE INDEX idx_evidence_source ON public."Evidence" (source_id);
CREATE INDEX idx_evidence_type ON public."Evidence" (evidence_type);
CREATE INDEX idx_evidence_verified ON public."Evidence" (is_verified);
CREATE INDEX idx_evidence_submitted_by ON public."Evidence" (submitted_by);
CREATE INDEX idx_evidence_created_at ON public."Evidence" (created_at DESC);
CREATE INDEX idx_evidence_temporal ON public."Evidence" (temporal_relevance) WHERE temporal_relevance < 1.0;

-- Composite index for evidence queries by target and type
CREATE INDEX idx_evidence_target_node_type ON public."Evidence" (target_node_id, evidence_type)
    WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_evidence_target_edge_type ON public."Evidence" (target_edge_id, evidence_type)
    WHERE target_edge_id IS NOT NULL;

-- VeracityScores indexes
CREATE INDEX idx_veracity_target_node ON public."VeracityScores" (target_node_id) WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_veracity_target_edge ON public."VeracityScores" (target_edge_id) WHERE target_edge_id IS NOT NULL;
CREATE INDEX idx_veracity_score ON public."VeracityScores" (veracity_score);
CREATE INDEX idx_veracity_expires_at ON public."VeracityScores" (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_veracity_calculated_at ON public."VeracityScores" (calculated_at DESC);

-- Composite index for finding low-confidence scores
CREATE INDEX idx_veracity_low_confidence ON public."VeracityScores" (veracity_score, evidence_count)
    WHERE evidence_count < 3;

-- VeracityScoreHistory indexes
CREATE INDEX idx_history_veracity_score ON public."VeracityScoreHistory" (veracity_score_id);
CREATE INDEX idx_history_changed_at ON public."VeracityScoreHistory" (changed_at DESC);
CREATE INDEX idx_history_change_reason ON public."VeracityScoreHistory" (change_reason);
CREATE INDEX idx_history_triggering_entity ON public."VeracityScoreHistory" (triggering_entity_type, triggering_entity_id)
    WHERE triggering_entity_id IS NOT NULL;

-- EvidenceVotes indexes
CREATE INDEX idx_evidence_votes_evidence ON public."EvidenceVotes" (evidence_id);
CREATE INDEX idx_evidence_votes_user ON public."EvidenceVotes" (user_id);
CREATE INDEX idx_evidence_votes_type ON public."EvidenceVotes" (vote_type);

-- ConsensusSnapshots indexes
CREATE INDEX idx_consensus_target_node ON public."ConsensusSnapshots" (target_node_id) WHERE target_node_id IS NOT NULL;
CREATE INDEX idx_consensus_target_edge ON public."ConsensusSnapshots" (target_edge_id) WHERE target_edge_id IS NOT NULL;
CREATE INDEX idx_consensus_snapshot_at ON public."ConsensusSnapshots" (snapshot_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: calculate_temporal_decay
-- ----------------------------------------------------------------------------
-- Calculates temporal decay factor based on evidence age and decay rate
-- Used for time-sensitive claims where older evidence becomes less relevant

CREATE OR REPLACE FUNCTION calculate_temporal_decay(
    relevant_date DATE,
    decay_rate REAL,
    reference_date TIMESTAMPTZ DEFAULT now()
) RETURNS REAL AS $$
DECLARE
    days_elapsed INTEGER;
    decay_factor REAL;
BEGIN
    -- If no relevant date or no decay, return 1.0 (no decay)
    IF relevant_date IS NULL OR decay_rate = 0.0 THEN
        RETURN 1.0;
    END IF;

    -- Calculate days elapsed
    days_elapsed := EXTRACT(DAY FROM reference_date - relevant_date::TIMESTAMPTZ);

    -- Apply exponential decay: e^(-decay_rate * days)
    decay_factor := EXP(-decay_rate * days_elapsed);

    -- Clamp to [0, 1]
    RETURN GREATEST(0.0, LEAST(1.0, decay_factor));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- Function: calculate_evidence_weight
-- ----------------------------------------------------------------------------
-- Calculates effective weight of evidence considering:
-- - Base weight
-- - Source credibility
-- - Temporal decay
-- - Peer review status

CREATE OR REPLACE FUNCTION calculate_evidence_weight(
    evidence_id uuid
) RETURNS REAL AS $$
DECLARE
    base_weight REAL;
    confidence REAL;
    temporal_relevance REAL;
    source_credibility REAL;
    peer_review_multiplier REAL;
    effective_weight REAL;
BEGIN
    -- Fetch evidence details with source credibility
    SELECT
        e.weight,
        e.confidence,
        e.temporal_relevance,
        COALESCE(sc.credibility_score, 0.5),
        CASE e.peer_review_status
            WHEN 'accepted' THEN 1.2
            WHEN 'disputed' THEN 0.8
            WHEN 'rejected' THEN 0.5
            ELSE 1.0
        END
    INTO
        base_weight,
        confidence,
        temporal_relevance,
        source_credibility,
        peer_review_multiplier
    FROM public."Evidence" e
    LEFT JOIN public."SourceCredibility" sc ON e.source_id = sc.source_id
    WHERE e.id = evidence_id;

    -- Calculate effective weight
    effective_weight := base_weight * confidence * temporal_relevance *
                       source_credibility * peer_review_multiplier;

    -- Clamp to [0, 1]
    RETURN GREATEST(0.0, LEAST(1.0, effective_weight));
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: calculate_consensus_score
-- ----------------------------------------------------------------------------
-- Calculates consensus score based on source agreement
-- Higher score = more sources agree

CREATE OR REPLACE FUNCTION calculate_consensus_score(
    target_type TEXT,  -- 'node' or 'edge'
    target_id uuid
) RETURNS REAL AS $$
DECLARE
    supporting_weight REAL;
    refuting_weight REAL;
    total_weight REAL;
    consensus REAL;
BEGIN
    -- Sum evidence weights by type
    IF target_type = 'node' THEN
        SELECT
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO supporting_weight, refuting_weight
        FROM public."Evidence"
        WHERE target_node_id = target_id AND is_verified = true;
    ELSE
        SELECT
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO supporting_weight, refuting_weight
        FROM public."Evidence"
        WHERE target_edge_id = target_id AND is_verified = true;
    END IF;

    total_weight := supporting_weight + refuting_weight;

    -- If no evidence, return neutral 0.5
    IF total_weight = 0 THEN
        RETURN 0.5;
    END IF;

    -- Calculate consensus: ratio of supporting to total
    consensus := supporting_weight / total_weight;

    RETURN consensus;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: calculate_challenge_impact
-- ----------------------------------------------------------------------------
-- Calculates negative impact of open challenges on veracity score
-- More challenges = lower score

CREATE OR REPLACE FUNCTION calculate_challenge_impact(
    target_type TEXT,
    target_id uuid
) RETURNS REAL AS $$
DECLARE
    open_challenges INTEGER;
    impact REAL;
BEGIN
    -- Count open challenges
    IF target_type = 'node' THEN
        SELECT COUNT(*) INTO open_challenges
        FROM public."Challenges"
        WHERE target_node_id = target_id AND status = 'open';
    ELSE
        SELECT COUNT(*) INTO open_challenges
        FROM public."Challenges"
        WHERE target_edge_id = target_id AND status = 'open';
    END IF;

    -- Each challenge reduces score by 0.05, max -0.5
    impact := GREATEST(-0.5, -0.05 * open_challenges);

    RETURN impact;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: calculate_veracity_score
-- ----------------------------------------------------------------------------
-- Main function to calculate veracity score for a node or edge
-- Aggregates evidence, consensus, challenges, and temporal factors

CREATE OR REPLACE FUNCTION calculate_veracity_score(
    target_type TEXT,  -- 'node' or 'edge'
    target_id uuid
) RETURNS REAL AS $$
DECLARE
    target_is_level_0 BOOLEAN;
    base_score REAL;
    consensus_score REAL;
    challenge_impact REAL;
    final_score REAL;
BEGIN
    -- Check if target is Level 0 (immutable truth)
    IF target_type = 'node' THEN
        SELECT is_level_0 INTO target_is_level_0
        FROM public."Nodes" WHERE id = target_id;
    ELSE
        SELECT is_level_0 INTO target_is_level_0
        FROM public."Edges" WHERE id = target_id;
    END IF;

    -- Level 0 always has veracity = 1.0
    IF target_is_level_0 THEN
        RETURN 1.0;
    END IF;

    -- Calculate component scores
    consensus_score := calculate_consensus_score(target_type, target_id);
    challenge_impact := calculate_challenge_impact(target_type, target_id);

    -- Base score from consensus
    base_score := consensus_score;

    -- Apply challenge impact
    final_score := base_score + challenge_impact;

    -- Clamp to [0, 1]
    final_score := GREATEST(0.0, LEAST(1.0, final_score));

    RETURN final_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: update_source_credibility
-- ----------------------------------------------------------------------------
-- Recalculates credibility score for a source based on evidence performance

CREATE OR REPLACE FUNCTION update_source_credibility(
    p_source_id uuid
) RETURNS VOID AS $$
DECLARE
    v_total_evidence INTEGER;
    v_verified_evidence INTEGER;
    v_challenged_evidence INTEGER;
    v_challenge_ratio REAL;
    v_consensus_alignment REAL;
    v_credibility_score REAL;
BEGIN
    -- Count evidence statistics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_verified = true),
        COUNT(*) FILTER (WHERE id IN (
            SELECT DISTINCT evidence_id
            FROM public."EvidenceVotes"
            WHERE vote_type = 'misleading'
        ))
    INTO v_total_evidence, v_verified_evidence, v_challenged_evidence
    FROM public."Evidence"
    WHERE source_id = p_source_id;

    -- Calculate challenge ratio
    IF v_total_evidence > 0 THEN
        v_challenge_ratio := v_challenged_evidence::REAL / v_total_evidence;
    ELSE
        v_challenge_ratio := 0.0;
    END IF;

    -- Calculate consensus alignment (simplified)
    -- In production, this would compare source's evidence against consensus
    v_consensus_alignment := 0.5;  -- Placeholder

    -- Calculate credibility score
    -- Formula: (verified_ratio * 0.4) + ((1 - challenge_ratio) * 0.3) + (consensus_alignment * 0.3)
    v_credibility_score :=
        (CASE WHEN v_total_evidence > 0
         THEN (v_verified_evidence::REAL / v_total_evidence) * 0.4
         ELSE 0.2 END) +
        ((1.0 - v_challenge_ratio) * 0.3) +
        (v_consensus_alignment * 0.3);

    -- Clamp to [0, 1]
    v_credibility_score := GREATEST(0.0, LEAST(1.0, v_credibility_score));

    -- Upsert credibility score
    INSERT INTO public."SourceCredibility" (
        source_id,
        credibility_score,
        total_evidence_count,
        verified_evidence_count,
        challenged_evidence_count,
        challenge_ratio,
        consensus_alignment_score,
        last_calculated_at
    ) VALUES (
        p_source_id,
        v_credibility_score,
        v_total_evidence,
        v_verified_evidence,
        v_challenged_evidence,
        v_challenge_ratio,
        v_consensus_alignment,
        now()
    )
    ON CONFLICT (source_id) DO UPDATE SET
        credibility_score = EXCLUDED.credibility_score,
        total_evidence_count = EXCLUDED.total_evidence_count,
        verified_evidence_count = EXCLUDED.verified_evidence_count,
        challenged_evidence_count = EXCLUDED.challenged_evidence_count,
        challenge_ratio = EXCLUDED.challenge_ratio,
        consensus_alignment_score = EXCLUDED.consensus_alignment_score,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: refresh_veracity_score
-- ----------------------------------------------------------------------------
-- Recalculates and updates veracity score for a node or edge
-- Creates history entry if score changed

CREATE OR REPLACE FUNCTION refresh_veracity_score(
    target_type TEXT,
    target_id uuid,
    change_reason TEXT DEFAULT 'scheduled_recalculation',
    triggering_entity_type TEXT DEFAULT NULL,
    triggering_entity_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    new_score REAL;
    old_score REAL;
    v_score_id uuid;
    v_evidence_count INTEGER;
    v_supporting_weight REAL;
    v_refuting_weight REAL;
    v_consensus REAL;
    v_challenge_impact REAL;
    v_challenge_count INTEGER;
BEGIN
    -- Calculate new score
    new_score := calculate_veracity_score(target_type, target_id);

    -- Gather additional metrics
    IF target_type = 'node' THEN
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO v_evidence_count, v_supporting_weight, v_refuting_weight
        FROM public."Evidence"
        WHERE target_node_id = target_id;

        SELECT COUNT(*) INTO v_challenge_count
        FROM public."Challenges"
        WHERE target_node_id = target_id AND status = 'open';
    ELSE
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO v_evidence_count, v_supporting_weight, v_refuting_weight
        FROM public."Evidence"
        WHERE target_edge_id = target_id;

        SELECT COUNT(*) INTO v_challenge_count
        FROM public."Challenges"
        WHERE target_edge_id = target_id AND status = 'open';
    END IF;

    v_consensus := calculate_consensus_score(target_type, target_id);
    v_challenge_impact := calculate_challenge_impact(target_type, target_id);

    -- Upsert veracity score
    IF target_type = 'node' THEN
        INSERT INTO public."VeracityScores" (
            target_node_id,
            veracity_score,
            evidence_count,
            supporting_evidence_weight,
            refuting_evidence_weight,
            evidence_weight_sum,
            consensus_score,
            challenge_count,
            open_challenge_count,
            challenge_impact,
            calculated_at
        ) VALUES (
            target_id,
            new_score,
            v_evidence_count,
            v_supporting_weight,
            v_refuting_weight,
            v_supporting_weight + v_refuting_weight,
            v_consensus,
            v_challenge_count,
            v_challenge_count,
            v_challenge_impact,
            now()
        )
        ON CONFLICT (target_node_id) DO UPDATE SET
            veracity_score = EXCLUDED.veracity_score,
            evidence_count = EXCLUDED.evidence_count,
            supporting_evidence_weight = EXCLUDED.supporting_evidence_weight,
            refuting_evidence_weight = EXCLUDED.refuting_evidence_weight,
            evidence_weight_sum = EXCLUDED.evidence_weight_sum,
            consensus_score = EXCLUDED.consensus_score,
            challenge_count = EXCLUDED.challenge_count,
            open_challenge_count = EXCLUDED.open_challenge_count,
            challenge_impact = EXCLUDED.challenge_impact,
            calculated_at = EXCLUDED.calculated_at,
            updated_at = now()
        RETURNING id, veracity_score INTO v_score_id, old_score;

        -- Get old score for history
        old_score := COALESCE(
            (SELECT veracity_score FROM public."VeracityScores" WHERE target_node_id = target_id),
            0.5
        );
    ELSE
        INSERT INTO public."VeracityScores" (
            target_edge_id,
            veracity_score,
            evidence_count,
            supporting_evidence_weight,
            refuting_evidence_weight,
            evidence_weight_sum,
            consensus_score,
            challenge_count,
            open_challenge_count,
            challenge_impact,
            calculated_at
        ) VALUES (
            target_id,
            new_score,
            v_evidence_count,
            v_supporting_weight,
            v_refuting_weight,
            v_supporting_weight + v_refuting_weight,
            v_consensus,
            v_challenge_count,
            v_challenge_count,
            v_challenge_impact,
            now()
        )
        ON CONFLICT (target_edge_id) DO UPDATE SET
            veracity_score = EXCLUDED.veracity_score,
            evidence_count = EXCLUDED.evidence_count,
            supporting_evidence_weight = EXCLUDED.supporting_evidence_weight,
            refuting_evidence_weight = EXCLUDED.refuting_evidence_weight,
            evidence_weight_sum = EXCLUDED.evidence_weight_sum,
            consensus_score = EXCLUDED.consensus_score,
            challenge_count = EXCLUDED.challenge_count,
            open_challenge_count = EXCLUDED.open_challenge_count,
            challenge_impact = EXCLUDED.challenge_impact,
            calculated_at = EXCLUDED.calculated_at,
            updated_at = now()
        RETURNING id, veracity_score INTO v_score_id, old_score;

        old_score := COALESCE(
            (SELECT veracity_score FROM public."VeracityScores" WHERE target_edge_id = target_id),
            0.5
        );
    END IF;

    -- Create history entry if score changed significantly
    IF ABS(new_score - old_score) > 0.01 THEN
        INSERT INTO public."VeracityScoreHistory" (
            veracity_score_id,
            old_score,
            new_score,
            score_delta,
            change_reason,
            triggering_entity_type,
            triggering_entity_id,
            changed_by
        ) VALUES (
            v_score_id,
            old_score,
            new_score,
            new_score - old_score,
            change_reason,
            triggering_entity_type,
            triggering_entity_id,
            'system'
        );
    END IF;

    RETURN v_score_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public."Sources"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_credibility_updated_at BEFORE UPDATE ON public."SourceCredibility"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON public."Evidence"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_veracity_scores_updated_at BEFORE UPDATE ON public."VeracityScores"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_votes_updated_at BEFORE UPDATE ON public."EvidenceVotes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Trigger: Auto-refresh veracity score when evidence changes
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_veracity_refresh_on_evidence()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh score for affected node or edge
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'new_evidence', 'evidence', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'new_evidence', 'evidence', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', OLD.target_node_id, 'evidence_removed', 'evidence', OLD.id);
        ELSIF OLD.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', OLD.target_edge_id, 'evidence_removed', 'evidence', OLD.id);
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_veracity_refresh AFTER INSERT OR UPDATE OR DELETE ON public."Evidence"
    FOR EACH ROW EXECUTE FUNCTION trigger_veracity_refresh_on_evidence();

-- ----------------------------------------------------------------------------
-- Trigger: Auto-refresh veracity score when challenge changes
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_veracity_refresh_on_challenge()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'challenge_created', 'challenge', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'challenge_created', 'challenge', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'challenge_resolved', 'challenge', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'challenge_resolved', 'challenge', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', OLD.target_node_id, 'challenge_resolved', 'challenge', OLD.id);
        ELSIF OLD.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', OLD.target_edge_id, 'challenge_resolved', 'challenge', OLD.id);
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_veracity_refresh AFTER INSERT OR UPDATE OR DELETE ON public."Challenges"
    FOR EACH ROW EXECUTE FUNCTION trigger_veracity_refresh_on_challenge();

-- ----------------------------------------------------------------------------
-- Trigger: Update source credibility when evidence changes
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_source_credibility_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_source_credibility(NEW.source_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_source_credibility(OLD.source_id);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_credibility_update AFTER INSERT OR UPDATE OR DELETE ON public."Evidence"
    FOR EACH ROW EXECUTE FUNCTION trigger_source_credibility_update();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: VeracityScoresSummary
-- ----------------------------------------------------------------------------
-- Convenient view combining veracity scores with target details

CREATE OR REPLACE VIEW public."VeracityScoresSummary" AS
SELECT
    vs.id,
    vs.target_node_id,
    vs.target_edge_id,
    CASE
        WHEN vs.target_node_id IS NOT NULL THEN 'node'
        ELSE 'edge'
    END AS target_type,
    COALESCE(vs.target_node_id, vs.target_edge_id) AS target_id,
    vs.veracity_score,
    vs.confidence_interval_lower,
    vs.confidence_interval_upper,
    vs.evidence_count,
    vs.consensus_score,
    vs.challenge_count,
    vs.open_challenge_count,
    vs.challenge_impact,
    vs.temporal_decay_factor,
    vs.calculated_at,
    vs.expires_at,
    CASE
        WHEN n.is_level_0 IS NOT NULL THEN n.is_level_0
        WHEN e.is_level_0 IS NOT NULL THEN e.is_level_0
        ELSE false
    END AS is_level_0,
    n.graph_id AS node_graph_id,
    e.graph_id AS edge_graph_id
FROM public."VeracityScores" vs
LEFT JOIN public."Nodes" n ON vs.target_node_id = n.id
LEFT JOIN public."Edges" e ON vs.target_edge_id = e.id;

-- ----------------------------------------------------------------------------
-- View: EvidenceSummary
-- ----------------------------------------------------------------------------
-- Convenient view combining evidence with source details and credibility

CREATE OR REPLACE VIEW public."EvidenceSummary" AS
SELECT
    e.id,
    e.target_node_id,
    e.target_edge_id,
    CASE
        WHEN e.target_node_id IS NOT NULL THEN 'node'
        ELSE 'edge'
    END AS target_type,
    e.source_id,
    s.source_type,
    s.title AS source_title,
    s.authors AS source_authors,
    s.url AS source_url,
    sc.credibility_score AS source_credibility,
    e.evidence_type,
    e.weight,
    e.confidence,
    e.temporal_relevance,
    calculate_evidence_weight(e.id) AS effective_weight,
    e.content,
    e.is_verified,
    e.peer_review_status,
    e.submitted_by,
    e.created_at
FROM public."Evidence" e
JOIN public."Sources" s ON e.source_id = s.id
LEFT JOIN public."SourceCredibility" sc ON s.id = sc.source_id;

-- ============================================================================
-- SAMPLE QUERIES AND QUERY PATTERNS
-- ============================================================================

-- Pattern 1: Get veracity score for a specific node
-- SELECT * FROM public."VeracityScoresSummary" WHERE target_node_id = '<uuid>';

-- Pattern 2: Get all evidence for a node with effective weights
-- SELECT * FROM public."EvidenceSummary" WHERE target_node_id = '<uuid>' ORDER BY effective_weight DESC;

-- Pattern 3: Find nodes with low veracity scores (disputed claims)
-- SELECT target_node_id, veracity_score, evidence_count, challenge_count
-- FROM public."VeracityScoresSummary"
-- WHERE target_type = 'node' AND veracity_score < 0.5 AND evidence_count >= 3
-- ORDER BY veracity_score ASC;

-- Pattern 4: Get veracity score history for a node
-- SELECT h.*, vs.target_node_id
-- FROM public."VeracityScoreHistory" h
-- JOIN public."VeracityScores" vs ON h.veracity_score_id = vs.id
-- WHERE vs.target_node_id = '<uuid>'
-- ORDER BY h.changed_at DESC;

-- Pattern 5: Find sources with low credibility
-- SELECT s.*, sc.credibility_score, sc.challenge_ratio, sc.total_evidence_count
-- FROM public."Sources" s
-- JOIN public."SourceCredibility" sc ON s.id = sc.source_id
-- WHERE sc.credibility_score < 0.4 AND sc.total_evidence_count > 5
-- ORDER BY sc.credibility_score ASC;

-- Pattern 6: Calculate consensus for a node (without using function)
-- WITH evidence_weights AS (
--     SELECT
--         evidence_type,
--         calculate_evidence_weight(id) as eff_weight
--     FROM public."Evidence"
--     WHERE target_node_id = '<uuid>' AND is_verified = true
-- )
-- SELECT
--     SUM(CASE WHEN evidence_type = 'supporting' THEN eff_weight ELSE 0 END) / NULLIF(SUM(eff_weight), 0) AS consensus_score
-- FROM evidence_weights;

-- Pattern 7: Find nodes with expired veracity scores (need recalculation)
-- SELECT * FROM public."VeracityScoresSummary"
-- WHERE expires_at IS NOT NULL AND expires_at < now()
-- ORDER BY expires_at ASC;

-- Pattern 8: Get top sources by credibility
-- SELECT s.*, sc.*
-- FROM public."Sources" s
-- JOIN public."SourceCredibility" sc ON s.id = sc.source_id
-- WHERE sc.total_evidence_count >= 10
-- ORDER BY sc.credibility_score DESC
-- LIMIT 20;

-- Pattern 9: Trending consensus changes
-- WITH recent_snapshots AS (
--     SELECT
--         target_node_id,
--         consensus_score,
--         snapshot_at,
--         LAG(consensus_score) OVER (PARTITION BY target_node_id ORDER BY snapshot_at) AS prev_consensus
--     FROM public."ConsensusSnapshots"
--     WHERE snapshot_at > now() - INTERVAL '30 days'
-- )
-- SELECT
--     target_node_id,
--     consensus_score - prev_consensus AS consensus_change,
--     snapshot_at
-- FROM recent_snapshots
-- WHERE ABS(consensus_score - COALESCE(prev_consensus, 0.5)) > 0.1
-- ORDER BY ABS(consensus_score - COALESCE(prev_consensus, 0.5)) DESC;

-- Pattern 10: Evidence quality analysis
-- SELECT
--     e.source_id,
--     s.source_type,
--     COUNT(*) as evidence_count,
--     AVG(e.weight) as avg_weight,
--     AVG(e.confidence) as avg_confidence,
--     AVG(sc.credibility_score) as avg_credibility,
--     COUNT(*) FILTER (WHERE e.is_verified = true) as verified_count
-- FROM public."Evidence" e
-- JOIN public."Sources" s ON e.source_id = s.id
-- LEFT JOIN public."SourceCredibility" sc ON s.id = sc.source_id
-- GROUP BY e.source_id, s.source_type
-- HAVING COUNT(*) >= 5
-- ORDER BY AVG(sc.credibility_score) DESC;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================

-- 1. Index Strategy:
--    - All foreign keys are indexed for fast joins
--    - Composite indexes on (target, type) for evidence queries
--    - Partial indexes for common WHERE clauses (e.g., is_verified, expires_at IS NOT NULL)
--    - Indexes on score ranges for finding disputed/verified claims
--
-- 2. Query Optimization:
--    - Use views for complex joins to simplify queries
--    - Functions are marked STABLE/IMMUTABLE for query optimization
--    - Evidence weight calculations are cached in VeracityScores table
--    - Consensus snapshots reduce need for real-time calculation
--
-- 3. Caching Strategy:
--    - VeracityScores table acts as materialized cache
--    - expires_at field enables scheduled recalculation
--    - Triggers auto-update scores on evidence/challenge changes
--    - SourceCredibility is cached and recalculated on demand
--
-- 4. Scalability Considerations:
--    - Partition VeracityScoreHistory by date for large datasets
--    - Archive old ConsensusSnapshots periodically
--    - Use EXPLAIN ANALYZE to identify slow queries
--    - Consider read replicas for analytics queries
--
-- 5. Recommended Maintenance:
--    - VACUUM ANALYZE weekly for accurate query plans
--    - Reindex monthly for large tables
--    - Archive history tables quarterly
--    - Monitor slow query log for optimization opportunities
--
-- 6. Expected Query Performance (with proper indexes):
--    - Get veracity score for node: < 1ms (indexed lookup)
--    - Get evidence for node: < 10ms (indexed scan)
--    - Calculate new veracity score: < 100ms (depends on evidence count)
--    - Find disputed claims: < 50ms (indexed scan with WHERE)
--    - Get score history: < 10ms (indexed scan)
--
-- 7. Bottleneck Prevention:
--    - Batch evidence inserts to reduce trigger overhead
--    - Use async workers for non-critical score updates
--    - Cache frequently accessed scores in application layer
--    - Rate limit score recalculation requests
--
-- 8. Monitoring Metrics:
--    - Track average evidence count per node/edge
--    - Monitor veracity score distribution
--    - Alert on high challenge rates
--    - Track source credibility trends
--    - Monitor trigger execution time

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO backend_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- End of migration
