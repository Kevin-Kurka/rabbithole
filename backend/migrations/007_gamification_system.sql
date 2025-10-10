-- ============================================================================
-- Migration 007: Gamification System
-- ============================================================================
-- Description: Creates tables for achievements, user achievements, and reputation
-- Author: Backend Engineering Team
-- Date: 2025-10-09
-- Wave: 5, Phase 5.3
-- ============================================================================

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- Table for storing achievement definitions
CREATE TABLE IF NOT EXISTS public."Achievements" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    category VARCHAR(50) NOT NULL CHECK (category IN ('evidence', 'methodology', 'consensus', 'collaboration')),
    points INT DEFAULT 0 CHECK (points >= 0),
    criteria JSONB NOT NULL, -- { type: 'count', metric: 'evidence_submitted', threshold: 10 }
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking user achievements
CREATE TABLE IF NOT EXISTS public."UserAchievements" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public."Achievements"(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    progress JSONB, -- { current: 7, total: 10 }
    UNIQUE(user_id, achievement_id)
);

-- Table for tracking user reputation and points
CREATE TABLE IF NOT EXISTS public."UserReputation" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE UNIQUE,
    total_points INT DEFAULT 0 CHECK (total_points >= 0),
    evidence_points INT DEFAULT 0 CHECK (evidence_points >= 0),
    methodology_points INT DEFAULT 0 CHECK (methodology_points >= 0),
    consensus_points INT DEFAULT 0 CHECK (consensus_points >= 0),
    collaboration_points INT DEFAULT 0 CHECK (collaboration_points >= 0),
    level INT DEFAULT 1 CHECK (level >= 1),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public."Achievements" (category);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON public."Achievements" (key);

-- UserAchievements indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public."UserAchievements" (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public."UserAchievements" (achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON public."UserAchievements" (earned_at);

-- UserReputation indexes
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON public."UserReputation" (user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_total_points ON public."UserReputation" (total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON public."UserReputation" (level DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_evidence_points ON public."UserReputation" (evidence_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_methodology_points ON public."UserReputation" (methodology_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_consensus_points ON public."UserReputation" (consensus_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_collaboration_points ON public."UserReputation" (collaboration_points DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate user level based on total points
-- Level formula: floor(sqrt(total_points / 100))
CREATE OR REPLACE FUNCTION calculate_user_level(points INT)
RETURNS INT AS $$
BEGIN
    RETURN FLOOR(SQRT(points::NUMERIC / 100));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user level when points change
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level := GREATEST(1, calculate_user_level(NEW.total_points));
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update level when total_points changes
DROP TRIGGER IF EXISTS trigger_update_user_level ON public."UserReputation";
CREATE TRIGGER trigger_update_user_level
    BEFORE UPDATE OF total_points ON public."UserReputation"
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for leaderboard with user details
CREATE OR REPLACE VIEW public."Leaderboard" AS
SELECT
    ur.user_id,
    u.username,
    u.email,
    ur.total_points,
    ur.evidence_points,
    ur.methodology_points,
    ur.consensus_points,
    ur.collaboration_points,
    ur.level,
    RANK() OVER (ORDER BY ur.total_points DESC) as rank,
    ur.updated_at
FROM public."UserReputation" ur
JOIN public."Users" u ON ur.user_id = u.id
ORDER BY ur.total_points DESC;

-- View for user achievement progress
CREATE OR REPLACE VIEW public."UserAchievementProgress" AS
SELECT
    u.id as user_id,
    u.username,
    a.id as achievement_id,
    a.key as achievement_key,
    a.name as achievement_name,
    a.category,
    a.points,
    ua.earned_at,
    ua.progress,
    CASE
        WHEN ua.id IS NOT NULL THEN true
        ELSE false
    END as is_earned
FROM public."Users" u
CROSS JOIN public."Achievements" a
LEFT JOIN public."UserAchievements" ua ON ua.user_id = u.id AND ua.achievement_id = a.id;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default reputation for existing users (if any)
INSERT INTO public."UserReputation" (user_id, total_points, level)
SELECT id, 0, 1 FROM public."Users"
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public."Achievements" IS 'Stores achievement definitions with criteria for unlocking';
COMMENT ON TABLE public."UserAchievements" IS 'Tracks which achievements users have earned and their progress';
COMMENT ON TABLE public."UserReputation" IS 'Stores user reputation points, level, and category-specific points';
COMMENT ON COLUMN public."Achievements".criteria IS 'JSON object defining achievement unlock conditions, e.g., { "type": "count", "metric": "evidence_submitted", "threshold": 10 }';
COMMENT ON COLUMN public."UserAchievements".progress IS 'JSON object tracking current progress towards achievement, e.g., { "current": 7, "total": 10 }';
COMMENT ON FUNCTION calculate_user_level(INT) IS 'Calculates user level using formula: floor(sqrt(total_points / 100))';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
