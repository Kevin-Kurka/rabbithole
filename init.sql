-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CORE GRAPH DATABASE (4 tables)
-- ============================================================================

-- Table for defining types of nodes (Article, Document, Evidence, Event, Person, Source)
CREATE TABLE IF NOT EXISTS public."NodeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    parent_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Table for defining types of edges (cites, supports, contradicts, relates-to, authored-by)
CREATE TABLE IF NOT EXISTS public."EdgeTypes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    props JSONB,
    meta JSONB,
    ai VECTOR(1536),
    source_node_type_id uuid REFERENCES public."NodeTypes"(id),
    target_node_type_id uuid REFERENCES public."NodeTypes"(id)
);

-- Main table for storing all node instances
-- NOTE: Removed graph_id (simplified to single namespace) and is_level_0 (no longer using Level 0/1 system)
CREATE TABLE IF NOT EXISTS public."Nodes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type_id uuid NOT NULL REFERENCES public."NodeTypes"(id),

    -- Content stored in JSONB (title, content, tags, etc.)
    props JSONB,

    -- System metadata (created_at, updated_at, version, etc.)
    meta JSONB,

    -- Vector embedding for AI similarity search (1536 dimensions for OpenAI)
    ai VECTOR(1536),

    -- Credibility score (0.0-1.0) calculated from challenge outcomes
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),

    -- Content hash for deduplication
    content_hash TEXT,

    -- Reference to primary source node (if this is derived content)
    primary_source_id uuid REFERENCES public."Nodes"(id),

    -- Visibility: 'public', 'unlisted', 'private'
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),

    -- Creator
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Main table for storing all edge instances (relationships between nodes)
-- NOTE: Removed graph_id and is_level_0
CREATE TABLE IF NOT EXISTS public."Edges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_type_id uuid NOT NULL REFERENCES public."EdgeTypes"(id),
    source_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,

    -- Edge properties (strength, confidence, notes, etc.)
    props JSONB,

    -- System metadata
    meta JSONB,

    -- Vector embedding for edge (optional)
    ai VECTOR(1536),

    -- Edge weight/confidence (0.0-1.0)
    weight REAL DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),

    -- Creator
    created_by uuid REFERENCES public."Users"(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- USER & AUTHENTICATION
-- ============================================================================

-- Table for storing users
CREATE TABLE IF NOT EXISTS public."Users" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    -- User profile (bio, avatar, etc.)
    profile JSONB,

    -- Reputation score (from contributions and challenge participation)
    reputation INTEGER DEFAULT 0,

    -- User role: 'user', 'expert', 'moderator', 'admin'
    role TEXT NOT NULL DEFAULT 'user',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SOCIAL LAYER - Simple Comments (like Twitter)
-- ============================================================================

-- Table for storing informal comments/discussions
CREATE TABLE IF NOT EXISTS public."Comments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    author_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Can comment on nodes or edges
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Parent comment for threaded discussions
    parent_comment_id uuid REFERENCES public."Comments"(id) ON DELETE CASCADE,

    -- Upvotes/downvotes
    votes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT either_node_or_edge_comment CHECK (
        target_node_id IS NOT NULL OR target_edge_id IS NOT NULL
    )
);

-- ============================================================================
-- TRUTH-SEEKING LAYER - Formal Inquiry System (Court + Scientific Method)
-- ============================================================================

-- Main challenges table (formal inquiries)
CREATE TABLE IF NOT EXISTS public."Challenges" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target of the challenge
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Challenger
    challenger_id uuid NOT NULL REFERENCES public."Users"(id),

    -- TOULMIN ARGUMENTATION MODEL
    -- Challenger's argument
    claim TEXT NOT NULL,                    -- What is being disputed
    grounds JSONB,                          -- Evidence/reasoning supporting the claim
    warrant TEXT,                           -- Why grounds support claim
    backing TEXT,                           -- Additional support for warrant
    qualifier TEXT,                         -- Degree of certainty

    -- Defender's rebuttal
    rebuttal_claim TEXT,                    -- Counter-claim
    rebuttal_grounds JSONB,                 -- Evidence for rebuttal
    rebuttal_warrant TEXT,                  -- Reasoning for rebuttal

    -- Process state
    status TEXT NOT NULL DEFAULT 'open',    -- 'open', 'in_review', 'resolved', 'closed'

    -- Resolution
    resolution TEXT,                        -- 'challenge_sustained', 'challenge_dismissed', 'partial', 'inconclusive'
    resolution_summary TEXT,                -- AI-generated summary of outcome
    resolution_reasoning TEXT,              -- Explanation of decision

    -- AI facilitation
    ai_analysis JSONB,                      -- AI's ongoing analysis
    ai_recommendations JSONB,               -- AI suggestions

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,

    CONSTRAINT either_node_or_edge CHECK (
        target_node_id IS NOT NULL OR target_edge_id IS NOT NULL
    )
);

-- Evidence submitted for challenges
CREATE TABLE IF NOT EXISTS public."ChallengeEvidence" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    evidence_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    submitted_by uuid NOT NULL REFERENCES public."Users"(id),

    -- Which side is this evidence for
    side TEXT NOT NULL CHECK (side IN ('challenger', 'defender')),

    -- Role of this evidence
    role TEXT CHECK (role IN ('primary', 'supporting', 'rebuttal', 'expert_opinion')),

    -- Community credibility votes on this specific evidence
    credibility_votes JSONB,

    -- AI fact-check results
    ai_fact_check JSONB,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Community participation in challenges (amicus brief style)
CREATE TABLE IF NOT EXISTS public."ChallengeParticipants" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),

    -- Which side they're supporting
    side TEXT NOT NULL CHECK (side IN ('challenger', 'defender', 'neutral')),

    -- Type of contribution
    contribution_type TEXT CHECK (contribution_type IN ('evidence', 'analysis', 'expert_opinion', 'vote')),

    -- The contribution content
    contribution JSONB,

    created_at TIMESTAMPTZ DEFAULT now(),

    -- Users can participate multiple times with different contributions
    UNIQUE(challenge_id, user_id, contribution_type, created_at)
);

-- Votes on challenge outcomes
CREATE TABLE IF NOT EXISTS public."ChallengeVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id uuid NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id),

    -- Vote: 'sustain_challenge', 'dismiss_challenge', 'partial', 'needs_more_evidence'
    vote TEXT NOT NULL CHECK (vote IN ('sustain_challenge', 'dismiss_challenge', 'partial', 'needs_more_evidence')),

    -- Reasoning for the vote
    reasoning TEXT,

    -- Vote weight (based on user expertise/reputation)
    weight REAL DEFAULT 1.0,

    created_at TIMESTAMPTZ DEFAULT now(),

    -- One vote per user per challenge
    UNIQUE(challenge_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- NodeTypes indexes
CREATE INDEX IF NOT EXISTS idx_nodetypes_name ON public."NodeTypes" (name);
CREATE INDEX IF NOT EXISTS idx_nodetypes_parent ON public."NodeTypes" (parent_node_type_id);

-- EdgeTypes indexes
CREATE INDEX IF NOT EXISTS idx_edgetypes_name ON public."EdgeTypes" (name);
CREATE INDEX IF NOT EXISTS idx_edgetypes_source ON public."EdgeTypes" (source_node_type_id);
CREATE INDEX IF NOT EXISTS idx_edgetypes_target ON public."EdgeTypes" (target_node_type_id);

-- Nodes indexes
CREATE INDEX IF NOT EXISTS idx_nodes_type ON public."Nodes" (node_type_id);
CREATE INDEX IF NOT EXISTS idx_nodes_source ON public."Nodes" (primary_source_id);
CREATE INDEX IF NOT EXISTS idx_nodes_creator ON public."Nodes" (created_by);
CREATE INDEX IF NOT EXISTS idx_nodes_visibility ON public."Nodes" (visibility);
CREATE INDEX IF NOT EXISTS idx_nodes_created_at ON public."Nodes" (created_at DESC);

-- Full-text search on node title and content
CREATE INDEX IF NOT EXISTS idx_nodes_fulltext ON public."Nodes"
    USING GIN (to_tsvector('english', COALESCE(props->>'title', '') || ' ' || COALESCE(props->>'content', '')));

-- Vector similarity search (HNSW index for pgvector)
CREATE INDEX IF NOT EXISTS idx_nodes_vector ON public."Nodes"
    USING hnsw (ai vector_cosine_ops);

-- Edges indexes
CREATE INDEX IF NOT EXISTS idx_edges_type ON public."Edges" (edge_type_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON public."Edges" (source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON public."Edges" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_target ON public."Edges" (source_node_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_creator ON public."Edges" (created_by);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON public."Users" (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public."Users" (email);
CREATE INDEX IF NOT EXISTS idx_users_reputation ON public."Users" (reputation DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_author ON public."Comments" (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_node ON public."Comments" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_comments_target_edge ON public."Comments" (target_edge_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public."Comments" (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public."Comments" (created_at DESC);

-- Challenges indexes
CREATE INDEX IF NOT EXISTS idx_challenges_target_node ON public."Challenges" (target_node_id);
CREATE INDEX IF NOT EXISTS idx_challenges_target_edge ON public."Challenges" (target_edge_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON public."Challenges" (challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public."Challenges" (status);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public."Challenges" (created_at DESC);

-- Challenge evidence indexes
CREATE INDEX IF NOT EXISTS idx_challenge_evidence_challenge ON public."ChallengeEvidence" (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_evidence_node ON public."ChallengeEvidence" (evidence_node_id);
CREATE INDEX IF NOT EXISTS idx_challenge_evidence_submitter ON public."ChallengeEvidence" (submitted_by);

-- Challenge participants indexes
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON public."ChallengeParticipants" (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON public."ChallengeParticipants" (user_id);

-- Challenge votes indexes
CREATE INDEX IF NOT EXISTS idx_challenge_votes_challenge ON public."ChallengeVotes" (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_votes_user ON public."ChallengeVotes" (user_id);

-- ============================================================================
-- SEED DATA (Node Types and Edge Types)
-- ============================================================================

-- Insert default node types
INSERT INTO public."NodeTypes" (name, description, props) VALUES
('Article', 'Primary content node, like Wikipedia articles', '{"icon": "file-text", "color": "#3b82f6"}'::jsonb),
('Document', 'Supporting documents (PDFs, papers, reports)', '{"icon": "file", "color": "#8b5cf6"}'::jsonb),
('Evidence', 'Factual evidence submitted in challenges', '{"icon": "shield-check", "color": "#10b981"}'::jsonb),
('Event', 'Historical or current events', '{"icon": "calendar", "color": "#f59e0b"}'::jsonb),
('Person', 'People referenced in content', '{"icon": "user", "color": "#ec4899"}'::jsonb),
('Source', 'Original sources (books, websites, publications)', '{"icon": "link", "color": "#6366f1"}'::jsonb),
('Organization', 'Organizations, companies, institutions', '{"icon": "building", "color": "#14b8a6"}'::jsonb),
('Concept', 'Abstract concepts or theories', '{"icon": "lightbulb", "color": "#f97316"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default edge types
INSERT INTO public."EdgeTypes" (name, props) VALUES
('cites', '{"description": "Cites as source", "icon": "quote", "color": "#3b82f6"}'::jsonb),
('supports', '{"description": "Provides supporting evidence", "icon": "arrow-up-right", "color": "#10b981"}'::jsonb),
('contradicts', '{"description": "Contradicts or disputes", "icon": "x", "color": "#ef4444"}'::jsonb),
('relates-to', '{"description": "Related to", "icon": "link-2", "color": "#6b7280"}'::jsonb),
('authored-by', '{"description": "Authored or created by", "icon": "pen-tool", "color": "#8b5cf6"}'::jsonb),
('occurred-at', '{"description": "Occurred at (time/place)", "icon": "map-pin", "color": "#f59e0b"}'::jsonb),
('part-of', '{"description": "Part of larger whole", "icon": "layers", "color": "#14b8a6"}'::jsonb),
('causes', '{"description": "Causes or leads to", "icon": "arrow-right", "color": "#ec4899"}'::jsonb),
('derived-from', '{"description": "Derived from or based on", "icon": "git-branch", "color": "#6366f1"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FUNCTIONS FOR CREDIBILITY CALCULATION
-- ============================================================================

-- Function to calculate node credibility based on challenge outcomes
CREATE OR REPLACE FUNCTION calculate_node_credibility(node_id_param uuid)
RETURNS REAL AS $$
DECLARE
    total_challenges INTEGER;
    sustained_challenges INTEGER;
    dismissed_challenges INTEGER;
    challenge_factor REAL;
    source_factor REAL;
    credibility_score REAL;
BEGIN
    -- Count challenges for this node
    SELECT
        COUNT(*),
        SUM(CASE WHEN resolution = 'challenge_sustained' THEN 1 ELSE 0 END),
        SUM(CASE WHEN resolution = 'challenge_dismissed' THEN 1 ELSE 0 END)
    INTO total_challenges, sustained_challenges, dismissed_challenges
    FROM public."Challenges"
    WHERE target_node_id = node_id_param
      AND status = 'resolved';

    -- If no challenges, default credibility based on source
    IF total_challenges = 0 THEN
        RETURN 0.5; -- Neutral score until challenged
    END IF;

    -- Calculate challenge factor (dismissed challenges increase credibility)
    IF dismissed_challenges > 0 THEN
        challenge_factor := LEAST(1.0, (dismissed_challenges::REAL / total_challenges::REAL) * 1.2);
    ELSE
        challenge_factor := GREATEST(0.0, 1.0 - (sustained_challenges::REAL / total_challenges::REAL));
    END IF;

    -- Final credibility (0.0 - 1.0)
    credibility_score := GREATEST(0.0, LEAST(1.0, challenge_factor));

    RETURN credibility_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update node credibility when challenge is resolved
CREATE OR REPLACE FUNCTION update_node_credibility_on_challenge_resolution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        -- Update target node's weight (credibility score)
        IF NEW.target_node_id IS NOT NULL THEN
            UPDATE public."Nodes"
            SET weight = calculate_node_credibility(NEW.target_node_id),
                updated_at = now()
            WHERE id = NEW.target_node_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credibility_on_resolution
AFTER UPDATE ON public."Challenges"
FOR EACH ROW
EXECUTE FUNCTION update_node_credibility_on_challenge_resolution();

-- ============================================================================
-- ARTICLE ANNOTATIONS & DECEPTION DETECTION
-- ============================================================================

-- Table for storing annotations on article text (highlights, tags, notes)
CREATE TABLE IF NOT EXISTS public."Annotations" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target article/node
    target_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,

    -- Text selection (character offsets in article content)
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,

    -- The actual highlighted text (for display)
    highlighted_text TEXT NOT NULL,

    -- Annotation type: 'highlight', 'deception', 'note', 'question', 'correction'
    annotation_type TEXT NOT NULL DEFAULT 'highlight',

    -- For deception annotations: type of deception
    -- Values: 'ad_hominem', 'straw_man', 'false_dichotomy', 'slippery_slope',
    --         'appeal_to_authority', 'appeal_to_emotion', 'red_herring',
    --         'exaggeration', 'false_comparison', 'cherry_picking',
    --         'misleading_statistic', 'out_of_context', 'hasty_generalization'
    deception_type TEXT,

    -- Confidence score from AI (0.0-1.0)
    confidence REAL CHECK (confidence >= 0.0 AND confidence <= 1.0),

    -- AI explanation of the deception
    explanation TEXT,

    -- User notes/comments
    user_notes TEXT,

    -- Color for highlighting (hex color)
    color TEXT DEFAULT '#FFFF00',

    -- Severity for deception: 'low', 'medium', 'high'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),

    -- Created by (can be NULL for AI-generated annotations)
    created_by uuid REFERENCES public."Users"(id),

    -- Whether this annotation was AI-generated
    is_ai_generated BOOLEAN DEFAULT false,

    -- Status: 'pending_review', 'approved', 'rejected', 'disputed'
    status TEXT DEFAULT 'pending_review',

    -- Upvotes/downvotes from community
    votes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding annotations by node
CREATE INDEX IF NOT EXISTS idx_annotations_node ON public."Annotations"(target_node_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON public."Annotations"(annotation_type);
CREATE INDEX IF NOT EXISTS idx_annotations_deception_type ON public."Annotations"(deception_type) WHERE deception_type IS NOT NULL;

-- Table for storing detailed AI analysis of deceptive content
CREATE TABLE IF NOT EXISTS public."DeceptionAnalysis" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to annotation
    annotation_id uuid NOT NULL REFERENCES public."Annotations"(id) ON DELETE CASCADE,

    -- Target article/node
    target_node_id uuid NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,

    -- Type of logical fallacy or deception
    fallacy_type TEXT NOT NULL,

    -- AI's detailed explanation
    explanation TEXT NOT NULL,

    -- Supporting evidence/context
    supporting_context TEXT,

    -- Suggested correction or rewrite
    suggested_correction TEXT,

    -- Related sources that contradict this claim
    contradicting_sources JSONB,

    -- Related sources that support this claim
    supporting_sources JSONB,

    -- Severity score (0.0-1.0)
    severity_score REAL NOT NULL CHECK (severity_score >= 0.0 AND severity_score <= 1.0),

    -- Confidence in this analysis (0.0-1.0)
    confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),

    -- AI model used for analysis
    ai_model TEXT,

    -- Raw AI response (for debugging)
    ai_raw_response JSONB,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analysis queries
CREATE INDEX IF NOT EXISTS idx_deception_analysis_annotation ON public."DeceptionAnalysis"(annotation_id);
CREATE INDEX IF NOT EXISTS idx_deception_analysis_node ON public."DeceptionAnalysis"(target_node_id);
CREATE INDEX IF NOT EXISTS idx_deception_analysis_fallacy ON public."DeceptionAnalysis"(fallacy_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

/*
SCHEMA SUMMARY:

4 CORE TABLES (Graph Database):
- NodeTypes: Define types of content (Article, Document, Evidence, etc.)
- EdgeTypes: Define types of relationships (cites, supports, contradicts, etc.)
- Nodes: All content nodes
- Edges: All relationships between nodes

3 SUPPORTING TABLES:
- Users: Authentication and user profiles
- Comments: Informal social discussions (Twitter-like)
- Challenges: Formal inquiry system (Court + Scientific Method)

3 CHALLENGE SYSTEM TABLES:
- ChallengeEvidence: Evidence submitted in challenges
- ChallengeParticipants: Community participation (amicus brief style)
- ChallengeVotes: Votes on challenge outcomes

2 DECEPTION DETECTION TABLES:
- Annotations: Highlights, tags, and annotations on article text
- DeceptionAnalysis: AI-powered logical fallacy and deception detection

TOTAL: 12 tables (down from 50+)

KEY FEATURES:
- Simplified to single namespace (no Graphs table)
- Two-layer interaction: Comments (social) + Challenges (formal)
- Evidence-based credibility scoring
- AI-facilitated truth-seeking process
- Vector search for related articles
- Full-text search on content
- Community participation in formal inquiries

REMOVED:
- Graphs table (simplified to single namespace)
- Level 0/1 system (is_level_0 field removed)
- Methodology templates
- Curator roles
- Gamification tables
- Graph versioning
*/
