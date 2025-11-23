-- ====================================================================
-- DATABASE SCHEMA CLEANUP SCRIPT
-- Drops all tables that violate the strict 4-table schema requirement
-- ====================================================================
--
-- REQUIRED SCHEMA (from /backend/migrations/):
--   1. node_types (schema graph)
--   2. edge_types (schema graph)
--   3. nodes (data graph)
--   4. edges (data graph)
--   5. schema_migrations (system table - allowed)
--
-- This script drops the 56 violation tables.
-- ====================================================================

\echo '======================================================================'
\echo 'DATABASE SCHEMA CLEANUP - Dropping 56 Violation Tables'
\echo '======================================================================'
\echo ''

-- Drop all violation tables in reverse dependency order (CASCADE handles dependencies)

\echo 'Dropping Activity & Social tables...'
DROP TABLE IF EXISTS public."ActivityReactions" CASCADE;
DROP TABLE IF EXISTS public."ActivityPosts" CASCADE;
DROP TABLE IF EXISTS public."SpamReports" CASCADE;
DROP TABLE IF EXISTS public."Comments" CASCADE;

\echo 'Dropping Evidence System tables...'
DROP TABLE IF EXISTS public."EvidenceVotes" CASCADE;
DROP TABLE IF EXISTS public."EvidenceReviewVotes" CASCADE;
DROP TABLE IF EXISTS public."EvidenceReviews" CASCADE;
DROP TABLE IF EXISTS public."EvidenceSearchIndex" CASCADE;
DROP TABLE IF EXISTS public."EvidenceDuplicates" CASCADE;
DROP TABLE IF EXISTS public."EvidenceAuditLog" CASCADE;
DROP TABLE IF EXISTS public."EvidenceMetadata" CASCADE;
DROP TABLE IF EXISTS public."EvidenceFiles" CASCADE;
DROP TABLE IF EXISTS public."Evidence" CASCADE;
DROP TABLE IF EXISTS public."SourceCredibility" CASCADE;
DROP TABLE IF EXISTS public."Sources" CASCADE;

\echo 'Dropping Challenge System tables...'
DROP TABLE IF EXISTS public."ChallengeNotifications" CASCADE;
DROP TABLE IF EXISTS public."ChallengeResolutions" CASCADE;
DROP TABLE IF EXISTS public."ChallengeVotes" CASCADE;
DROP TABLE IF EXISTS public."ChallengeComments" CASCADE;
DROP TABLE IF EXISTS public."Challenges" CASCADE;
DROP TABLE IF EXISTS public."ChallengeTypes" CASCADE;

\echo 'Dropping Veracity tables...'
DROP TABLE IF EXISTS public."VeracityScoreHistory" CASCADE;
DROP TABLE IF EXISTS public."VeracityScores" CASCADE;
DROP TABLE IF EXISTS public."ConsensusSnapshots" CASCADE;

\echo 'Dropping Claims & Inquiries tables...'
DROP TABLE IF EXISTS public."ClaimVerifications" CASCADE;
DROP TABLE IF EXISTS public."ClaimNodeMatches" CASCADE;
DROP TABLE IF EXISTS public."ExtractedClaims" CASCADE;
DROP TABLE IF EXISTS public."InquiryVotes" CASCADE;
DROP TABLE IF EXISTS public."FormalInquiries" CASCADE;

\echo 'Dropping Document Processing tables...'
DROP TABLE IF EXISTS public."NodeReferences" CASCADE;
DROP TABLE IF EXISTS public."DocumentTables" CASCADE;
DROP TABLE IF EXISTS public."DocumentFigures" CASCADE;
DROP TABLE IF EXISTS public."DocumentSections" CASCADE;
DROP TABLE IF EXISTS public."DocumentProcessingResults" CASCADE;

\echo 'Dropping Media Processing tables...'
DROP TABLE IF EXISTS public."MediaProcessingJobs" CASCADE;
DROP TABLE IF EXISTS public."TranscriptSegments" CASCADE;
DROP TABLE IF EXISTS public."AudioTranscriptions" CASCADE;
DROP TABLE IF EXISTS public."VideoScenes" CASCADE;
DROP TABLE IF EXISTS public."VideoFrames" CASCADE;
DROP TABLE IF EXISTS public."VideoMetadata" CASCADE;

\echo 'Dropping AI & Conversation tables...'
DROP TABLE IF EXISTS public."ConversationMessages" CASCADE;
DROP TABLE IF EXISTS public."Conversations" CASCADE;

\echo 'Dropping User & Notification tables...'
DROP TABLE IF EXISTS public."Notifications" CASCADE;
DROP TABLE IF EXISTS public."UserMethodologyProgress" CASCADE;
DROP TABLE IF EXISTS public."UserReputation" CASCADE;
DROP TABLE IF EXISTS public."Users" CASCADE;

\echo 'Dropping Methodology tables...'
DROP TABLE IF EXISTS public."MethodologyWorkflows" CASCADE;
DROP TABLE IF EXISTS public."MethodologyPermissions" CASCADE;
DROP TABLE IF EXISTS public."MethodologyEdgeTypes" CASCADE;
DROP TABLE IF EXISTS public."MethodologyNodeTypes" CASCADE;
DROP TABLE IF EXISTS public."Methodologies" CASCADE;

\echo 'Dropping Configuration tables...'
DROP TABLE IF EXISTS public."ConfigurationAuditLog" CASCADE;
DROP TABLE IF EXISTS public."ConfigurationDefaults" CASCADE;
DROP TABLE IF EXISTS public."SystemConfiguration" CASCADE;

\echo 'Dropping Graph Container table...'
DROP TABLE IF EXISTS public."Graphs" CASCADE;

\echo ''
\echo '======================================================================'
\echo 'Verifying remaining tables...'
\echo '======================================================================'
\echo ''

\dt public.*

\echo ''
\echo '======================================================================'
\echo 'Expected tables (should be 5 or fewer):'
\echo '  1. nodes'
\echo '  2. edges'
\echo '  3. node_types'
\echo '  4. edge_types'
\echo '  5. schema_migrations (optional - system table)'
\echo '======================================================================'
\echo ''
