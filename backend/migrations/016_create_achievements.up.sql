-- ============================================================================
-- Migration: Create Achievements Tables
-- Description: Gamification system with achievements and user progress tracking
-- ============================================================================

-- Achievements Definition Table
CREATE TABLE IF NOT EXISTS public."Achievements" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    category TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_achievement_key ON public."Achievements"(achievement_key);
CREATE INDEX idx_achievements_category ON public."Achievements"(category);
CREATE INDEX idx_achievements_points ON public."Achievements"(points DESC);

COMMENT ON TABLE public."Achievements" IS 'Defines available achievements and their requirements';
COMMENT ON COLUMN public."Achievements".achievement_key IS 'Unique identifier for programmatic access';
COMMENT ON COLUMN public."Achievements".category IS 'Achievement category: contribution, curation, social, etc.';
COMMENT ON COLUMN public."Achievements".requirements IS 'JSON object defining unlock criteria';

-- User Achievements Table
CREATE TABLE IF NOT EXISTS public."UserAchievements" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL REFERENCES public."Achievements"(id) ON DELETE CASCADE,
    earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Prevent duplicate achievements
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON public."UserAchievements"(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public."UserAchievements"(achievement_id);
CREATE INDEX idx_user_achievements_earned_at ON public."UserAchievements"(earned_at DESC);

COMMENT ON TABLE public."UserAchievements" IS 'Tracks which achievements users have earned';
COMMENT ON COLUMN public."UserAchievements".earned_at IS 'Timestamp when achievement was unlocked';
