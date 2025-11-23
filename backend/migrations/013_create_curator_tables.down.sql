-- ============================================================================
-- Migration Rollback: Drop Curator System Tables
-- ============================================================================

DROP TABLE IF EXISTS public."CuratorAuditLogs" CASCADE;
DROP TABLE IF EXISTS public."CuratorApplications" CASCADE;
DROP TABLE IF EXISTS public."UserCurators" CASCADE;
DROP TABLE IF EXISTS public."CuratorRoles" CASCADE;
