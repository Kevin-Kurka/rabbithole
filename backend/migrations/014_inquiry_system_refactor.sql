-- Migration 014: Inquiry System Refactor
-- Implements universal credibility scoring, removes Level 0/Level 1 distinction,
-- adds fuzzy matching for inquiry deduplication, and establishes threshold-based filtering

-- ============================================================================
-- PART 1: Update Nodes table
-- ============================================================================

-- Add credibility_score column (replaces is_level_0 concept)
ALTER TABLE public."Nodes"
  ADD COLUMN IF NOT EXISTS credibility_score DECIMAL(3,2) DEFAULT 0.50 CHECK (credibility_score >= 0.0 AND credibility_score <= 1.0),
  ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20) DEFAULT 'private' CHECK (privacy_level IN ('private', 'shared', 'public')),
  ADD COLUMN IF NOT EXISTS shared_with_user_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS embedding vector(1536), -- For semantic similarity
  ADD COLUMN IF NOT EXISTS last_credibility_update TIMESTAMPTZ DEFAULT NOW();

-- Create index for credibility filtering
CREATE INDEX IF NOT EXISTS idx_nodes_credibility ON public."Nodes"(credibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_privacy ON public."Nodes"(privacy_level);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_nodes_embedding ON public."Nodes"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Migrate existing Level 0 nodes to credibility 1.0
UPDATE public."Nodes"
SET credibility_score = 1.0,
    privacy_level = 'public',
    last_credibility_update = NOW()
WHERE is_level_0 = true;

-- ============================================================================
-- PART 2: Rename Challenges to Inquiries
-- ============================================================================

-- Create new Inquiries table (renamed from Challenges)
CREATE TABLE IF NOT EXISTS public."Inquiries" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES public."Users"(id),

  -- Inquiry details
  inquiry_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_outcome TEXT,

  -- Deduplication support
  embedding vector(1536),
  merged_into_id UUID REFERENCES public."Inquiries"(id),
  merge_justification TEXT,
  is_merged BOOLEAN DEFAULT FALSE,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'merged', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_inquiries_node ON public."Inquiries"(node_id);
CREATE INDEX idx_inquiries_type ON public."Inquiries"(inquiry_type);
CREATE INDEX idx_inquiries_creator ON public."Inquiries"(created_by_user_id);
CREATE INDEX idx_inquiries_status ON public."Inquiries"(status);

-- HNSW index for fuzzy matching
CREATE INDEX idx_inquiries_embedding ON public."Inquiries"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- PART 3: Evidence Type Hierarchy
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."EvidenceTypes" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0.0 AND weight <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert evidence type hierarchy
INSERT INTO public."EvidenceTypes" (code, name, description, weight) VALUES
  ('primary_document', 'Primary Document', 'Original documents, firsthand accounts', 1.0),
  ('expert_testimony', 'Expert Testimony', 'Testimony from verified domain experts', 0.9),
  ('peer_reviewed', 'Peer-Reviewed Study', 'Academic papers with peer review', 0.85),
  ('investigative_report', 'Investigative Report', 'Professional journalistic investigation', 0.8),
  ('secondary_source', 'Secondary Source', 'Analysis or commentary on primary sources', 0.6),
  ('tertiary_source', 'Tertiary Source', 'Summaries, encyclopedias, textbooks', 0.4),
  ('opinion', 'Expert Opinion', 'Professional opinion without formal study', 0.3),
  ('anecdote', 'Anecdotal Evidence', 'Personal experiences or stories', 0.2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 4: Inquiry Positions (replaces challenge votes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."InquiryPositions" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES public."Inquiries"(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES public."Users"(id),

  -- Position details
  stance VARCHAR(20) NOT NULL CHECK (stance IN ('supporting', 'opposing', 'neutral')),
  argument TEXT NOT NULL,
  evidence_type_id UUID REFERENCES public."EvidenceTypes"(id),
  evidence_links TEXT[] DEFAULT '{}',

  -- Credibility scoring
  credibility_score DECIMAL(3,2) DEFAULT 0.50 CHECK (credibility_score >= 0.0 AND credibility_score <= 1.0),
  evidence_quality_score DECIMAL(3,2) DEFAULT 0.50,
  source_credibility_score DECIMAL(3,2) DEFAULT 0.50,
  coherence_score DECIMAL(3,2) DEFAULT 0.50,

  -- Community feedback (minimal weight)
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('verified', 'credible', 'weak', 'excluded', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_credibility_update TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_positions_inquiry ON public."InquiryPositions"(inquiry_id);
CREATE INDEX idx_positions_creator ON public."InquiryPositions"(created_by_user_id);
CREATE INDEX idx_positions_credibility ON public."InquiryPositions"(credibility_score DESC);
CREATE INDEX idx_positions_status ON public."InquiryPositions"(status);

-- ============================================================================
-- PART 5: Credibility Thresholds
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."CredibilityThresholds" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_type VARCHAR(50) UNIQUE NOT NULL,

  -- Three threshold levels
  inclusion_threshold DECIMAL(3,2) NOT NULL CHECK (inclusion_threshold >= 0.0 AND inclusion_threshold <= 1.0),
  display_threshold DECIMAL(3,2) NOT NULL CHECK (display_threshold >= 0.0 AND display_threshold <= 1.0),
  auto_amend_threshold DECIMAL(3,2) NOT NULL CHECK (auto_amend_threshold >= 0.0 AND auto_amend_threshold <= 1.0),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT threshold_order CHECK (display_threshold <= inclusion_threshold AND inclusion_threshold <= auto_amend_threshold)
);

-- Insert default thresholds for all 12 inquiry types
INSERT INTO public."CredibilityThresholds" (inquiry_type, inclusion_threshold, display_threshold, auto_amend_threshold) VALUES
  -- Challenge Types (7)
  ('factual_accuracy', 0.70, 0.30, 0.85),
  ('logical_fallacy', 0.60, 0.25, 0.80),
  ('missing_context', 0.55, 0.25, 0.75),
  ('source_reliability', 0.65, 0.30, 0.82),
  ('bias_detection', 0.50, 0.20, 0.70),
  ('statistical_validity', 0.75, 0.40, 0.88),
  ('causal_relationship', 0.65, 0.30, 0.82),

  -- Inquiry Types (5)
  ('scientific_inquiry', 0.75, 0.35, 0.90),
  ('historical_interpretation', 0.60, 0.30, 0.80),
  ('legal_analysis', 0.70, 0.35, 0.85),
  ('ethical_evaluation', 0.55, 0.25, 0.75),
  ('definition_dispute', 0.60, 0.25, 0.78)
ON CONFLICT (inquiry_type) DO NOTHING;

-- ============================================================================
-- PART 6: Node Amendments (Version Control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."NodeAmendments" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES public."Nodes"(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES public."Inquiries"(id),
  position_id UUID NOT NULL REFERENCES public."InquiryPositions"(id),

  -- Amendment details
  field_path TEXT NOT NULL, -- JSON path to amended field (e.g., 'props.casualties')
  original_value TEXT,
  amended_value TEXT NOT NULL,
  explanation TEXT NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'applied', 'rejected', 'superseded')),
  applied_at TIMESTAMPTZ,
  applied_by_user_id UUID REFERENCES public."Users"(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_amendments_node ON public."NodeAmendments"(node_id);
CREATE INDEX idx_amendments_inquiry ON public."NodeAmendments"(inquiry_id);
CREATE INDEX idx_amendments_position ON public."NodeAmendments"(position_id);
CREATE INDEX idx_amendments_status ON public."NodeAmendments"(status);

-- ============================================================================
-- PART 7: Position Votes (Minimal Impact)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."PositionVotes" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES public."InquiryPositions"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id),
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(position_id, user_id)
);

CREATE INDEX idx_position_votes_position ON public."PositionVotes"(position_id);
CREATE INDEX idx_position_votes_user ON public."PositionVotes"(user_id);

-- ============================================================================
-- PART 8: Functions for Credibility Calculation
-- ============================================================================

-- Function to calculate position credibility score
CREATE OR REPLACE FUNCTION calculate_position_credibility(position_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  position RECORD;
  evidence_weight DECIMAL(3,2);
  community_signal DECIMAL(3,2);
  total_votes INTEGER;
  vote_ratio DECIMAL(3,2);
  final_score DECIMAL(3,2);
BEGIN
  -- Get position details
  SELECT
    p.*,
    COALESCE(et.weight, 0.5) as evidence_weight_value
  INTO position
  FROM public."InquiryPositions" p
  LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
  WHERE p.id = position_id;

  IF NOT FOUND THEN
    RETURN 0.5;
  END IF;

  evidence_weight := position.evidence_weight_value;

  -- Calculate community signal (minimal impact)
  total_votes := position.upvotes + position.downvotes;
  IF total_votes > 0 THEN
    vote_ratio := position.upvotes::DECIMAL / total_votes;
    -- Diminishing returns: cap at 100 votes
    community_signal := vote_ratio * LEAST(1.0, total_votes::DECIMAL / 100.0);
  ELSE
    community_signal := 0.5;
  END IF;

  -- FORMULA: Evidence-weighted credibility
  -- 50% evidence quality × weight
  -- 25% source credibility
  -- 20% coherence
  -- 5% community signal (minimal)
  final_score := (
    position.evidence_quality_score * evidence_weight * 0.50 +
    position.source_credibility_score * 0.25 +
    position.coherence_score * 0.20 +
    community_signal * 0.05
  );

  -- Clamp to valid range
  final_score := LEAST(1.0, GREATEST(0.0, final_score));

  RETURN final_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate node credibility from inquiry positions
CREATE OR REPLACE FUNCTION calculate_node_credibility(target_node_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  inquiry RECORD;
  position RECORD;
  threshold RECORD;
  total_weighted_credibility DECIMAL := 0.0;
  total_weight DECIMAL := 0.0;
  position_credibility DECIMAL;
  evidence_weight DECIMAL;
BEGIN
  -- Loop through all active inquiries for this node
  FOR inquiry IN
    SELECT * FROM public."Inquiries"
    WHERE node_id = target_node_id
      AND status = 'active'
      AND is_merged = false
  LOOP
    -- Get threshold for this inquiry type
    SELECT * INTO threshold
    FROM public."CredibilityThresholds"
    WHERE inquiry_type = inquiry.inquiry_type;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Loop through positions for this inquiry
    FOR position IN
      SELECT
        p.*,
        COALESCE(et.weight, 0.5) as evidence_weight_value
      FROM public."InquiryPositions" p
      LEFT JOIN public."EvidenceTypes" et ON p.evidence_type_id = et.id
      WHERE p.inquiry_id = inquiry.id
        AND p.status != 'archived'
    LOOP
      -- Calculate position credibility
      position_credibility := calculate_position_credibility(position.id);

      -- Skip positions below inclusion threshold
      IF position_credibility < threshold.inclusion_threshold THEN
        CONTINUE;
      END IF;

      evidence_weight := position.evidence_weight_value;

      -- Accumulate weighted credibility
      total_weighted_credibility := total_weighted_credibility + (position_credibility * evidence_weight);
      total_weight := total_weight + evidence_weight;
    END LOOP;
  END LOOP;

  -- Return weighted average, or 0.5 if no credible positions
  IF total_weight > 0 THEN
    RETURN LEAST(1.0, GREATEST(0.0, total_weighted_credibility / total_weight));
  ELSE
    RETURN 0.5;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 9: Triggers for Automatic Updates
-- ============================================================================

-- Trigger to update position credibility when votes change
CREATE OR REPLACE FUNCTION update_position_credibility_on_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate and update position credibility
  UPDATE public."InquiryPositions"
  SET
    credibility_score = calculate_position_credibility(NEW.position_id),
    last_credibility_update = NOW()
  WHERE id = NEW.position_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_position_credibility ON public."PositionVotes";
CREATE TRIGGER trigger_update_position_credibility
  AFTER INSERT OR UPDATE OR DELETE ON public."PositionVotes"
  FOR EACH ROW
  EXECUTE FUNCTION update_position_credibility_on_vote();

-- Trigger to update node credibility when positions change
CREATE OR REPLACE FUNCTION update_node_credibility_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
  target_node_id UUID;
BEGIN
  -- Get node_id from inquiry
  SELECT node_id INTO target_node_id
  FROM public."Inquiries"
  WHERE id = COALESCE(NEW.inquiry_id, OLD.inquiry_id);

  IF target_node_id IS NOT NULL THEN
    -- Recalculate and update node credibility
    UPDATE public."Nodes"
    SET
      credibility_score = calculate_node_credibility(target_node_id),
      last_credibility_update = NOW()
    WHERE id = target_node_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_node_credibility ON public."InquiryPositions";
CREATE TRIGGER trigger_update_node_credibility
  AFTER INSERT OR UPDATE OR DELETE ON public."InquiryPositions"
  FOR EACH ROW
  EXECUTE FUNCTION update_node_credibility_on_position_change();

-- ============================================================================
-- PART 10: Migrate Existing Data
-- ============================================================================

-- Migrate Challenges to Inquiries (if Challenges table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Challenges') THEN
    INSERT INTO public."Inquiries" (
      id,
      node_id,
      created_by_user_id,
      inquiry_type,
      title,
      description,
      status,
      created_at,
      updated_at
    )
    SELECT
      id,
      node_id,
      challenger_user_id as created_by_user_id,
      challenge_type as inquiry_type,
      reason as title,
      evidence as description,
      CASE
        WHEN status = 'resolved' THEN 'archived'
        ELSE 'active'
      END as status,
      created_at,
      updated_at
    FROM public."Challenges"
    WHERE NOT EXISTS (SELECT 1 FROM public."Inquiries" i WHERE i.id = public."Challenges".id);
  END IF;
END $$;

-- Migrate ChallengeVotes to PositionVotes (if ChallengeVotes table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ChallengeVotes') THEN
    -- This is a simplified migration; actual positions need to be created from votes
    -- For now, we'll mark this as a manual migration task
    RAISE NOTICE 'ChallengeVotes migration requires manual review - create positions from aggregated votes';
  END IF;
END $$;

-- ============================================================================
-- PART 11: Comments and Documentation
-- ============================================================================

COMMENT ON TABLE public."Inquiries" IS 'Formal inquiry processes (formerly Challenges) for questioning or exploring node claims';
COMMENT ON TABLE public."InquiryPositions" IS 'Debate positions within inquiries, scored by evidence quality rather than popularity';
COMMENT ON TABLE public."CredibilityThresholds" IS 'Type-specific thresholds for filtering positions and triggering amendments';
COMMENT ON TABLE public."NodeAmendments" IS 'Version-controlled amendments to nodes based on credible inquiry outcomes';
COMMENT ON TABLE public."EvidenceTypes" IS 'Hierarchical evidence type classification with quality weights';

COMMENT ON COLUMN public."Nodes".credibility_score IS 'Universal credibility score (0.0=false, 1.0=true) calculated from inquiry positions';
COMMENT ON COLUMN public."Nodes".privacy_level IS 'Visibility control: private (owner only), shared (specific users), public (everyone)';
COMMENT ON COLUMN public."Nodes".embedding IS 'Semantic embedding for similarity search and AI operations';

COMMENT ON COLUMN public."Inquiries".embedding IS 'Semantic embedding for fuzzy duplicate detection (similarity threshold: 0.85)';
COMMENT ON COLUMN public."Inquiries".merged_into_id IS 'Reference to inquiry this was merged into (deduplication)';

COMMENT ON FUNCTION calculate_position_credibility IS 'Calculates position credibility: 50% evidence, 25% source, 20% coherence, 5% votes';
COMMENT ON FUNCTION calculate_node_credibility IS 'Aggregates credible positions (above threshold) to determine node credibility';
