-- ============================================================================
-- Test Script for Veracity System Migration
-- ============================================================================
-- This script tests the veracity system to ensure it works correctly
-- Run this AFTER applying 003_veracity_system.sql
-- ============================================================================

-- Start transaction for test isolation
BEGIN;

-- ============================================================================
-- SETUP: Create test data
-- ============================================================================

-- Create test user
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'test_user_1', 'test1@example.com', 'hash1'),
    ('00000000-0000-0000-0000-000000000002', 'test_user_2', 'test2@example.com', 'hash2')
ON CONFLICT (username) DO NOTHING;

-- Create test graph
INSERT INTO public."Graphs" (id, name, level, privacy, created_by)
VALUES
    ('00000000-0000-0000-0000-000000000010', 'Test Graph Level 1', 1, 'public', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Create test node type
INSERT INTO public."NodeTypes" (id, name, description)
VALUES
    ('00000000-0000-0000-0000-000000000020', 'TestClaim', 'Test claim type')
ON CONFLICT (name) DO NOTHING;

-- Create test nodes (Level 1)
INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, weight, is_level_0, created_by)
VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '{"claim": "Test Claim A"}', 0.5, false, '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '{"claim": "Test Claim B"}', 0.5, false, '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '{"claim": "Test Claim C - Level 0"}', 1.0, true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST 1: Level 0 nodes should always have veracity = 1.0
-- ============================================================================

DO $$
DECLARE
    test_score REAL;
BEGIN
    -- Calculate score for Level 0 node
    test_score := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000032');

    IF test_score = 1.0 THEN
        RAISE NOTICE '✓ TEST 1 PASSED: Level 0 node has veracity = 1.0';
    ELSE
        RAISE EXCEPTION '✗ TEST 1 FAILED: Level 0 node has veracity = % (expected 1.0)', test_score;
    END IF;
END $$;

-- ============================================================================
-- TEST 2: Create sources and verify insertion
-- ============================================================================

INSERT INTO public."Sources" (id, source_type, title, authors, url, submitted_by)
VALUES
    ('00000000-0000-0000-0000-000000000040', 'academic_paper', 'Test Paper 1', ARRAY['Dr. Smith'], 'https://example.com/paper1', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000041', 'news_article', 'Test Article 1', ARRAY['Reporter Jones'], 'https://example.com/article1', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000042', 'academic_paper', 'Test Paper 2', ARRAY['Dr. Brown'], 'https://example.com/paper2', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    source_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO source_count FROM public."Sources"
    WHERE id IN ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000042');

    IF source_count >= 3 THEN
        RAISE NOTICE '✓ TEST 2 PASSED: Sources created successfully (count: %)', source_count;
    ELSE
        RAISE EXCEPTION '✗ TEST 2 FAILED: Expected 3 sources, found %', source_count;
    END IF;
END $$;

-- ============================================================================
-- TEST 3: Add supporting evidence and verify score increases
-- ============================================================================

-- Get initial score (should be 0.5 with no evidence)
DO $$
DECLARE
    initial_score REAL;
BEGIN
    initial_score := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000030');
    RAISE NOTICE 'Initial score for node A: %', initial_score;

    IF initial_score = 0.5 THEN
        RAISE NOTICE '✓ TEST 3a PASSED: Initial score is 0.5 (neutral)';
    ELSE
        RAISE WARNING '⚠ TEST 3a WARNING: Initial score is % (expected 0.5)', initial_score;
    END IF;
END $$;

-- Add supporting evidence
INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    weight,
    confidence,
    content,
    is_verified,
    submitted_by
)
VALUES
    ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040', 'supporting', 0.9, 0.9, 'Strong supporting evidence from peer-reviewed paper', true, '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000041', 'supporting', 0.8, 0.7, 'Supporting evidence from news article', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Give triggers time to execute
PERFORM pg_sleep(0.1);

-- Verify score increased
DO $$
DECLARE
    new_score REAL;
    score_from_table REAL;
BEGIN
    -- Calculate score
    new_score := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000030');

    -- Get score from table (should be auto-updated by trigger)
    SELECT veracity_score INTO score_from_table
    FROM public."VeracityScores"
    WHERE target_node_id = '00000000-0000-0000-0000-000000000030';

    RAISE NOTICE 'Score after adding supporting evidence: %', new_score;
    RAISE NOTICE 'Score in VeracityScores table: %', score_from_table;

    IF new_score > 0.5 THEN
        RAISE NOTICE '✓ TEST 3b PASSED: Score increased with supporting evidence (%.2f > 0.5)', new_score;
    ELSE
        RAISE EXCEPTION '✗ TEST 3b FAILED: Score did not increase (%.2f)', new_score;
    END IF;

    IF score_from_table IS NOT NULL THEN
        RAISE NOTICE '✓ TEST 3c PASSED: Trigger auto-updated VeracityScores table';
    ELSE
        RAISE WARNING '⚠ TEST 3c WARNING: VeracityScores table not updated by trigger';
    END IF;
END $$;

-- ============================================================================
-- TEST 4: Add refuting evidence and verify score decreases
-- ============================================================================

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    weight,
    confidence,
    content,
    is_verified,
    submitted_by
)
VALUES
    ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000042', 'refuting', 0.95, 0.9, 'Strong refuting evidence from peer-reviewed paper', true, '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

PERFORM pg_sleep(0.1);

DO $$
DECLARE
    score_with_refutation REAL;
BEGIN
    score_with_refutation := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000030');
    RAISE NOTICE 'Score after adding refuting evidence: %', score_with_refutation;

    IF score_with_refutation < 0.7 THEN
        RAISE NOTICE '✓ TEST 4 PASSED: Score decreased with refuting evidence (%.2f)', score_with_refutation;
    ELSE
        RAISE WARNING '⚠ TEST 4 WARNING: Score did not decrease as expected (%.2f)', score_with_refutation;
    END IF;
END $$;

-- ============================================================================
-- TEST 5: Create challenge and verify score decreases
-- ============================================================================

DO $$
DECLARE
    score_before_challenge REAL;
    score_after_challenge REAL;
BEGIN
    -- Get score before challenge
    score_before_challenge := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000031');
    RAISE NOTICE 'Score before challenge: %', score_before_challenge;

    -- Add challenge
    INSERT INTO public."Challenges" (id, target_node_id, status, rebuttal_claim)
    VALUES ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000031', 'open', 'This claim is disputed')
    ON CONFLICT DO NOTHING;

    -- Give trigger time to execute
    PERFORM pg_sleep(0.1);

    -- Get score after challenge
    score_after_challenge := calculate_veracity_score('node', '00000000-0000-0000-0000-000000000031');
    RAISE NOTICE 'Score after challenge: %', score_after_challenge;

    IF score_after_challenge < score_before_challenge THEN
        RAISE NOTICE '✓ TEST 5 PASSED: Score decreased with challenge (%.2f → %.2f)', score_before_challenge, score_after_challenge;
    ELSE
        RAISE EXCEPTION '✗ TEST 5 FAILED: Score did not decrease with challenge';
    END IF;
END $$;

-- ============================================================================
-- TEST 6: Source credibility calculation
-- ============================================================================

-- Update source credibility
PERFORM update_source_credibility('00000000-0000-0000-0000-000000000040');

DO $$
DECLARE
    credibility REAL;
BEGIN
    SELECT credibility_score INTO credibility
    FROM public."SourceCredibility"
    WHERE source_id = '00000000-0000-0000-0000-000000000040';

    IF credibility IS NOT NULL AND credibility > 0 AND credibility <= 1 THEN
        RAISE NOTICE '✓ TEST 6 PASSED: Source credibility calculated (%.2f)', credibility;
    ELSE
        RAISE EXCEPTION '✗ TEST 6 FAILED: Invalid source credibility: %', credibility;
    END IF;
END $$;

-- ============================================================================
-- TEST 7: Evidence weight calculation
-- ============================================================================

DO $$
DECLARE
    eff_weight REAL;
BEGIN
    eff_weight := calculate_evidence_weight('00000000-0000-0000-0000-000000000050');

    IF eff_weight IS NOT NULL AND eff_weight > 0 AND eff_weight <= 1 THEN
        RAISE NOTICE '✓ TEST 7 PASSED: Evidence weight calculated (%.4f)', eff_weight;
    ELSE
        RAISE EXCEPTION '✗ TEST 7 FAILED: Invalid evidence weight: %', eff_weight;
    END IF;
END $$;

-- ============================================================================
-- TEST 8: Verify indexes exist
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('Sources', 'Evidence', 'VeracityScores')
      AND indexname LIKE 'idx_%';

    IF index_count >= 10 THEN
        RAISE NOTICE '✓ TEST 8 PASSED: Indexes created (count: %)', index_count;
    ELSE
        RAISE WARNING '⚠ TEST 8 WARNING: Expected at least 10 indexes, found %', index_count;
    END IF;
END $$;

-- ============================================================================
-- TEST 9: Verify triggers exist
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table IN ('Evidence', 'Challenges', 'Sources', 'VeracityScores');

    IF trigger_count >= 6 THEN
        RAISE NOTICE '✓ TEST 9 PASSED: Triggers created (count: %)', trigger_count;
    ELSE
        RAISE WARNING '⚠ TEST 9 WARNING: Expected at least 6 triggers, found %', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- TEST 10: Verify views exist and work
-- ============================================================================

DO $$
DECLARE
    summary_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO summary_count
    FROM public."VeracityScoresSummary"
    WHERE target_node_id = '00000000-0000-0000-0000-000000000030';

    IF summary_count > 0 THEN
        RAISE NOTICE '✓ TEST 10a PASSED: VeracityScoresSummary view works';
    ELSE
        RAISE WARNING '⚠ TEST 10a WARNING: VeracityScoresSummary view returned no results';
    END IF;

    SELECT COUNT(*) INTO summary_count
    FROM public."EvidenceSummary"
    WHERE target_node_id = '00000000-0000-0000-0000-000000000030';

    IF summary_count > 0 THEN
        RAISE NOTICE '✓ TEST 10b PASSED: EvidenceSummary view works';
    ELSE
        RAISE WARNING '⚠ TEST 10b WARNING: EvidenceSummary view returned no results';
    END IF;
END $$;

-- ============================================================================
-- TEST 11: Verify history tracking
-- ============================================================================

DO $$
DECLARE
    history_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO history_count
    FROM public."VeracityScoreHistory"
    WHERE veracity_score_id IN (
        SELECT id FROM public."VeracityScores"
        WHERE target_node_id IN ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000031')
    );

    IF history_count > 0 THEN
        RAISE NOTICE '✓ TEST 11 PASSED: History tracking works (% entries)', history_count;
    ELSE
        RAISE WARNING '⚠ TEST 11 WARNING: No history entries found';
    END IF;
END $$;

-- ============================================================================
-- TEST 12: Consensus score calculation
-- ============================================================================

DO $$
DECLARE
    consensus REAL;
BEGIN
    consensus := calculate_consensus_score('node', '00000000-0000-0000-0000-000000000030');

    IF consensus IS NOT NULL AND consensus >= 0 AND consensus <= 1 THEN
        RAISE NOTICE '✓ TEST 12 PASSED: Consensus score calculated (%.2f)', consensus;
    ELSE
        RAISE EXCEPTION '✗ TEST 12 FAILED: Invalid consensus score: %', consensus;
    END IF;
END $$;

-- ============================================================================
-- TEST 13: Challenge impact calculation
-- ============================================================================

DO $$
DECLARE
    impact REAL;
BEGIN
    impact := calculate_challenge_impact('node', '00000000-0000-0000-0000-000000000031');

    IF impact IS NOT NULL AND impact <= 0 AND impact >= -0.5 THEN
        RAISE NOTICE '✓ TEST 13 PASSED: Challenge impact calculated (%.2f)', impact;
    ELSE
        RAISE EXCEPTION '✗ TEST 13 FAILED: Invalid challenge impact: %', impact;
    END IF;
END $$;

-- ============================================================================
-- TEST 14: Refresh veracity score function
-- ============================================================================

DO $$
DECLARE
    score_id uuid;
BEGIN
    score_id := refresh_veracity_score('node', '00000000-0000-0000-0000-000000000030', 'manual_recalculation');

    IF score_id IS NOT NULL THEN
        RAISE NOTICE '✓ TEST 14 PASSED: Refresh veracity score function works (score_id: %)', score_id;
    ELSE
        RAISE EXCEPTION '✗ TEST 14 FAILED: Refresh function returned NULL';
    END IF;
END $$;

-- ============================================================================
-- TEST 15: Evidence votes
-- ============================================================================

INSERT INTO public."EvidenceVotes" (evidence_id, user_id, vote_type)
VALUES ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000002', 'helpful')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    vote_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vote_count
    FROM public."EvidenceVotes"
    WHERE evidence_id = '00000000-0000-0000-0000-000000000050';

    IF vote_count > 0 THEN
        RAISE NOTICE '✓ TEST 15 PASSED: Evidence votes work';
    ELSE
        RAISE EXCEPTION '✗ TEST 15 FAILED: Evidence vote not inserted';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY: Display test results
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '  VERACITY SYSTEM TEST SUITE COMPLETE';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Review the output above for test results.';
    RAISE NOTICE 'Look for ✓ (passed) and ✗ (failed) markers.';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Data Created:';
    RAISE NOTICE '  - 2 Users';
    RAISE NOTICE '  - 1 Graph';
    RAISE NOTICE '  - 3 Nodes (2 Level 1, 1 Level 0)';
    RAISE NOTICE '  - 3 Sources';
    RAISE NOTICE '  - 3 Evidence entries';
    RAISE NOTICE '  - 1 Challenge';
    RAISE NOTICE '  - 1 Evidence vote';
    RAISE NOTICE '';
    RAISE NOTICE 'To clean up test data, run: ROLLBACK;';
    RAISE NOTICE 'To keep test data, run: COMMIT;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- CLEANUP: Rollback by default (comment out ROLLBACK to keep test data)
-- ============================================================================

-- Uncomment to keep test data:
-- COMMIT;

-- Default: rollback to clean up
ROLLBACK;

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
