-- ============================================================================
-- Migration Rollback: Drop Achievements Tables
-- ============================================================================

DROP TABLE IF EXISTS public."UserAchievements" CASCADE;
DROP TABLE IF EXISTS public."Achievements" CASCADE;
