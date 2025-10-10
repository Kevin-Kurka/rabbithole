-- Process Validation System Migration
-- Implements objective, egalitarian promotion criteria
-- No curator authority - math-based decisions only

-- =====================================================
-- Consensus Voting System
-- =====================================================

-- Table: ConsensusVotes
-- Anyone can vote on graph promotion
-- Votes weighted by user reputation (objective calculation)
CREATE TABLE IF NOT EXISTS public."ConsensusVotes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
  vote_value DECIMAL(3,2) NOT NULL CHECK (vote_value >= 0 AND vote_value <= 1),
  reasoning TEXT,
  vote_weight DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  voter_reputation_score DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(graph_id, user_id)
);

CREATE INDEX idx_consensus_votes_graph ON public."ConsensusVotes"(graph_id);
CREATE INDEX idx_consensus_votes_user ON public."ConsensusVotes"(user_id);
CREATE INDEX idx_consensus_votes_created ON public."ConsensusVotes"(created_at DESC);

COMMENT ON TABLE public."ConsensusVotes" IS 'Egalitarian voting system - anyone can vote, weighted by reputation';
COMMENT ON COLUMN public."ConsensusVotes".vote_value IS 'Vote value: 0.0 = reject, 1.0 = approve';
COMMENT ON COLUMN public."ConsensusVotes".vote_weight IS 'Calculated weight based on voter reputation';

-- =====================================================
-- Methodology Workflow Steps
-- =====================================================

-- Table: MethodologyWorkflowSteps
-- Defines individual steps within a methodology workflow
CREATE TABLE IF NOT EXISTS public."MethodologyWorkflowSteps" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public."MethodologyWorkflows"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_methodology_workflow_steps_workflow ON public."MethodologyWorkflowSteps"(workflow_id);
CREATE INDEX idx_methodology_workflow_steps_order ON public."MethodologyWorkflowSteps"(workflow_id, step_order);

COMMENT ON TABLE public."MethodologyWorkflowSteps" IS 'Individual steps within methodology workflows';

-- =====================================================
-- Methodology Step Completions
-- =====================================================

-- Table: MethodologyStepCompletions
-- Tracks objective completion of methodology steps
CREATE TABLE IF NOT EXISTS public."MethodologyStepCompletions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public."MethodologyWorkflowSteps"(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES public."Users"(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public."Users"(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  UNIQUE(graph_id, step_id)
);

CREATE INDEX idx_methodology_completions_graph ON public."MethodologyStepCompletions"(graph_id);
CREATE INDEX idx_methodology_completions_step ON public."MethodologyStepCompletions"(step_id);
CREATE INDEX idx_methodology_completions_completed_by ON public."MethodologyStepCompletions"(completed_by);

COMMENT ON TABLE public."MethodologyStepCompletions" IS 'Objective tracking of methodology step completion';

-- =====================================================
-- Promotion Events Log
-- =====================================================

-- Table: PromotionEvents
-- Auditable log of all graph promotions
CREATE TABLE IF NOT EXISTS public."PromotionEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  graph_name VARCHAR(255) NOT NULL,
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  promoted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  promotion_reason TEXT,
  methodology_completion_score DECIMAL(5,4),
  consensus_score DECIMAL(5,4),
  evidence_quality_score DECIMAL(5,4),
  challenge_resolution_score DECIMAL(5,4),
  overall_score DECIMAL(5,4)
);

CREATE INDEX idx_promotion_events_graph ON public."PromotionEvents"(graph_id);
CREATE INDEX idx_promotion_events_promoted_at ON public."PromotionEvents"(promoted_at DESC);
CREATE INDEX idx_promotion_events_level ON public."PromotionEvents"(new_level);

COMMENT ON TABLE public."PromotionEvents" IS 'Auditable log of automatic promotions';
COMMENT ON COLUMN public."PromotionEvents".promotion_reason IS 'Always automatic - no curator discretion';

-- =====================================================
-- User Reputation Cache
-- =====================================================

-- Table: UserReputationCache
-- Cached reputation scores for performance
CREATE TABLE IF NOT EXISTS public."UserReputationCache" (
  user_id UUID PRIMARY KEY REFERENCES public."Users"(id) ON DELETE CASCADE,
  evidence_quality_score DECIMAL(5,4) DEFAULT 0,
  total_evidence_submitted INTEGER DEFAULT 0,
  verified_evidence_count INTEGER DEFAULT 0,
  rejected_evidence_count INTEGER DEFAULT 0,
  total_votes_cast INTEGER DEFAULT 0,
  vote_alignment_score DECIMAL(5,4) DEFAULT 0,
  methodology_completions INTEGER DEFAULT 0,
  challenges_raised INTEGER DEFAULT 0,
  challenges_resolved INTEGER DEFAULT 0,
  overall_reputation_score DECIMAL(5,4) DEFAULT 0.5,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_reputation_overall ON public."UserReputationCache"(overall_reputation_score DESC);
CREATE INDEX idx_user_reputation_updated ON public."UserReputationCache"(updated_at DESC);

COMMENT ON TABLE public."UserReputationCache" IS 'Cached reputation scores - recalculated on demand';
COMMENT ON COLUMN public."UserReputationCache".overall_reputation_score IS 'Used for vote weighting - objective calculation';

-- =====================================================
-- Promotion Eligibility Cache
-- =====================================================

-- Table: PromotionEligibilityCache
-- Cached eligibility calculations for quick lookups
CREATE TABLE IF NOT EXISTS public."PromotionEligibilityCache" (
  graph_id UUID PRIMARY KEY REFERENCES public."Graphs"(id) ON DELETE CASCADE,
  methodology_completion_score DECIMAL(5,4) DEFAULT 0,
  consensus_score DECIMAL(5,4) DEFAULT 0,
  evidence_quality_score DECIMAL(5,4) DEFAULT 0,
  challenge_resolution_score DECIMAL(5,4) DEFAULT 0,
  overall_score DECIMAL(5,4) DEFAULT 0,
  is_eligible BOOLEAN DEFAULT false,
  blocking_reason TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promotion_eligibility_eligible ON public."PromotionEligibilityCache"(is_eligible);
CREATE INDEX idx_promotion_eligibility_updated ON public."PromotionEligibilityCache"(updated_at DESC);

COMMENT ON TABLE public."PromotionEligibilityCache" IS 'Cached eligibility - recalculated on criteria changes';

-- =====================================================
-- Functions for Automatic Updates
-- =====================================================

-- Function: Update vote weight on reputation change
CREATE OR REPLACE FUNCTION update_vote_weights_on_reputation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all votes by this user with new reputation score
  UPDATE public."ConsensusVotes"
  SET vote_weight = GREATEST(NEW.overall_reputation_score, 0.5),
      voter_reputation_score = NEW.overall_reputation_score,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_weights
AFTER UPDATE ON public."UserReputationCache"
FOR EACH ROW
WHEN (OLD.overall_reputation_score IS DISTINCT FROM NEW.overall_reputation_score)
EXECUTE FUNCTION update_vote_weights_on_reputation_change();

-- Function: Invalidate eligibility cache on criteria change
CREATE OR REPLACE FUNCTION invalidate_eligibility_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete cached eligibility to force recalculation
  DELETE FROM public."PromotionEligibilityCache"
  WHERE graph_id = COALESCE(NEW.graph_id, OLD.graph_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to invalidate cache
CREATE TRIGGER trigger_invalidate_on_vote
AFTER INSERT OR UPDATE OR DELETE ON public."ConsensusVotes"
FOR EACH ROW
EXECUTE FUNCTION invalidate_eligibility_cache();

CREATE TRIGGER trigger_invalidate_on_completion
AFTER INSERT OR UPDATE OR DELETE ON public."MethodologyStepCompletions"
FOR EACH ROW
EXECUTE FUNCTION invalidate_eligibility_cache();

-- =====================================================
-- Sample Workflow Steps for Testing
-- =====================================================

-- Insert sample workflow steps for existing methodologies
-- This assumes at least one methodology workflow exists
DO $$
DECLARE
  workflow_record RECORD;
BEGIN
  FOR workflow_record IN
    SELECT id FROM public."MethodologyWorkflows" LIMIT 1
  LOOP
    -- Insert sample steps
    INSERT INTO public."MethodologyWorkflowSteps" (workflow_id, name, description, step_order, is_required)
    VALUES
      (workflow_record.id, 'Define Research Question', 'Clearly state the research question or hypothesis', 1, true),
      (workflow_record.id, 'Literature Review', 'Review existing research and identify gaps', 2, true),
      (workflow_record.id, 'Methodology Design', 'Design the research methodology and approach', 3, true),
      (workflow_record.id, 'Data Collection', 'Collect relevant data and evidence', 4, true),
      (workflow_record.id, 'Analysis', 'Analyze collected data using appropriate methods', 5, true),
      (workflow_record.id, 'Peer Review', 'Submit work for community peer review', 6, true),
      (workflow_record.id, 'Revision', 'Address feedback and revise as needed', 7, false),
      (workflow_record.id, 'Final Documentation', 'Complete final documentation and citations', 8, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- Views for Easy Querying
-- =====================================================

-- View: Graphs Ready for Promotion
CREATE OR REPLACE VIEW public."GraphsReadyForPromotion" AS
SELECT
  g.id,
  g.name,
  g.level,
  pec.overall_score,
  pec.methodology_completion_score,
  pec.consensus_score,
  pec.evidence_quality_score,
  pec.challenge_resolution_score,
  pec.is_eligible,
  pec.calculated_at
FROM public."Graphs" g
JOIN public."PromotionEligibilityCache" pec ON g.id = pec.graph_id
WHERE pec.is_eligible = true
  AND g.level > 0  -- Level 0 graphs cannot be promoted
ORDER BY pec.overall_score DESC;

COMMENT ON VIEW public."GraphsReadyForPromotion" IS 'Graphs that meet all objective promotion criteria';

-- View: Recent Promotions
CREATE OR REPLACE VIEW public."RecentPromotions" AS
SELECT
  pe.id,
  pe.graph_id,
  pe.graph_name,
  pe.previous_level,
  pe.new_level,
  pe.promoted_at,
  pe.overall_score
FROM public."PromotionEvents" pe
ORDER BY pe.promoted_at DESC
LIMIT 100;

COMMENT ON VIEW public."RecentPromotions" IS 'Recent graph promotions for transparency';

-- View: Top Contributors by Reputation
CREATE OR REPLACE VIEW public."TopContributors" AS
SELECT
  u.id,
  u.username,
  urc.overall_reputation_score,
  urc.evidence_quality_score,
  urc.total_evidence_submitted,
  urc.total_votes_cast,
  urc.methodology_completions,
  urc.calculated_at
FROM public."Users" u
JOIN public."UserReputationCache" urc ON u.id = urc.user_id
ORDER BY urc.overall_reputation_score DESC
LIMIT 100;

COMMENT ON VIEW public."TopContributors" IS 'Top contributors by objective reputation score';

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant read access to all authenticated users
GRANT SELECT ON public."ConsensusVotes" TO PUBLIC;
GRANT SELECT ON public."MethodologyWorkflowSteps" TO PUBLIC;
GRANT SELECT ON public."MethodologyStepCompletions" TO PUBLIC;
GRANT SELECT ON public."PromotionEvents" TO PUBLIC;
GRANT SELECT ON public."UserReputationCache" TO PUBLIC;
GRANT SELECT ON public."PromotionEligibilityCache" TO PUBLIC;
GRANT SELECT ON public."GraphsReadyForPromotion" TO PUBLIC;
GRANT SELECT ON public."RecentPromotions" TO PUBLIC;
GRANT SELECT ON public."TopContributors" TO PUBLIC;

-- Grant insert/update for authenticated operations
GRANT INSERT, UPDATE ON public."ConsensusVotes" TO PUBLIC;
GRANT INSERT ON public."MethodologyStepCompletions" TO PUBLIC;

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_consensus_votes_graph_value ON public."ConsensusVotes"(graph_id, vote_value);
CREATE INDEX idx_methodology_completions_graph_step ON public."MethodologyStepCompletions"(graph_id, step_id);
CREATE INDEX idx_promotion_events_graph_level ON public."PromotionEvents"(graph_id, new_level);

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Process Validation System migration completed successfully';
  RAISE NOTICE 'Egalitarian promotion criteria are now active';
  RAISE NOTICE 'No curator authority required - all decisions math-based';
END $$;
