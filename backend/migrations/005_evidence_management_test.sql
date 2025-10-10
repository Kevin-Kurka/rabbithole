-- ============================================================================
-- Evidence Management System - Test Suite
-- ============================================================================
-- Description: Comprehensive test queries to validate evidence management
--              schema, functions, triggers, and performance.
--
-- Usage: Run after applying 005_evidence_management.sql migration
-- ============================================================================

-- ============================================================================
-- TEST 1: Basic Evidence File Upload
-- ============================================================================
-- Test inserting evidence files with various types

BEGIN;

-- Create test user
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test_user',
    'test@example.com',
    'hashed_password'
)
ON CONFLICT (username) DO NOTHING;

-- Create test source
INSERT INTO public."Sources" (id, source_type, title, url)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'academic_paper',
    'Test Research Paper',
    'https://example.com/paper.pdf'
)
ON CONFLICT (id) DO NOTHING;

-- Create test graph
INSERT INTO public."Graphs" (id, name, level)
VALUES (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'Test Graph',
    1
)
ON CONFLICT (id) DO NOTHING;

-- Create test node
INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

-- Create test evidence
INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'supporting',
    'This is test evidence content',
    '00000000-0000-0000-0000-000000000001'::uuid
);

-- Upload evidence file
INSERT INTO public."EvidenceFiles" (
    id,
    evidence_id,
    file_type,
    storage_provider,
    storage_key,
    file_hash,
    file_size,
    mime_type,
    original_filename,
    uploaded_by
)
VALUES (
    '00000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid,
    'document',
    'local',
    'test/path/to/file.pdf',
    'abc123def456',
    1024000,  -- 1MB
    'application/pdf',
    'test_document.pdf',
    '00000000-0000-0000-0000-000000000001'::uuid
);

-- Verify file was created
SELECT
    ef.id,
    ef.file_type,
    ef.original_filename,
    ef.processing_status,
    ef.virus_scan_status
FROM public."EvidenceFiles" ef
WHERE ef.id = '00000000-0000-0000-0000-000000000006'::uuid;

-- Expected: 1 row with processing_status = 'pending', virus_scan_status = 'pending'

ROLLBACK;

-- ============================================================================
-- TEST 2: Evidence Attachments
-- ============================================================================
-- Test attaching evidence to multiple nodes

BEGIN;

-- Setup test data
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'attach_test_user', 'attach@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'Attachment Test Graph', 1)
ON CONFLICT (id) DO NOTHING;

-- Create multiple nodes
INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
SELECT
    ('33333333-3333-3333-3333-33333333333' || i::text)::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
FROM generate_series(1, 3) i
ON CONFLICT (id) DO NOTHING;

-- Create evidence
INSERT INTO public."Sources" (id, source_type, title)
VALUES ('44444444-4444-4444-4444-444444444444'::uuid, 'website', 'Test Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    '55555555-5555-5555-5555-555555555555'::uuid,
    '33333333-3333-3333-3333-333333333331'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    'supporting',
    'Shared evidence content',
    '11111111-1111-1111-1111-111111111111'::uuid
);

-- Attach evidence to multiple nodes
INSERT INTO public."EvidenceAttachments" (
    evidence_id,
    target_node_id,
    relevance_score,
    relevance_note,
    attached_by
)
SELECT
    '55555555-5555-5555-5555-555555555555'::uuid,
    ('33333333-3333-3333-3333-33333333333' || i::text)::uuid,
    0.5 + (i * 0.1),
    'Relevance note for node ' || i,
    '11111111-1111-1111-1111-111111111111'::uuid
FROM generate_series(1, 3) i;

-- Verify attachments
SELECT
    ea.id,
    ea.target_node_id,
    ea.relevance_score,
    ea.relevance_note,
    ea.detached_at
FROM public."EvidenceAttachments" ea
WHERE ea.evidence_id = '55555555-5555-5555-5555-555555555555'::uuid
ORDER BY ea.relevance_score DESC;

-- Expected: 3 rows with increasing relevance scores

-- Test unique constraint (should fail)
DO $$
BEGIN
    INSERT INTO public."EvidenceAttachments" (
        evidence_id,
        target_node_id,
        attached_by
    )
    VALUES (
        '55555555-5555-5555-5555-555555555555'::uuid,
        '33333333-3333-3333-3333-333333333331'::uuid,
        '11111111-1111-1111-1111-111111111111'::uuid
    );
    RAISE EXCEPTION 'Should have failed unique constraint';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint working correctly';
END $$;

ROLLBACK;

-- ============================================================================
-- TEST 3: Evidence Metadata
-- ============================================================================
-- Test rich metadata storage

BEGIN;

-- Create test evidence
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'meta_user', 'meta@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'academic_paper', 'Metadata Test Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Meta Test Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'supporting',
    'Evidence with rich metadata',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
);

-- Add comprehensive metadata
INSERT INTO public."EvidenceMetadata" (
    evidence_id,
    authors,
    author_affiliations,
    publication_date,
    journal,
    doi,
    keywords,
    topics,
    abstract,
    language,
    geolocation,
    sample_size,
    peer_reviewed,
    citation_count,
    funding_sources
)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    ARRAY['John Doe', 'Jane Smith'],
    ARRAY['University A', 'Institute B'],
    '2024-01-15',
    'Journal of Test Studies',
    '10.1234/test.2024.001',
    ARRAY['testing', 'evidence', 'metadata'],
    ARRAY['research', 'validation'],
    'This is a comprehensive test of metadata storage capabilities.',
    'en',
    '{"lat": 37.7749, "lon": -122.4194, "name": "San Francisco"}'::jsonb,
    1000,
    true,
    42,
    ARRAY['National Science Foundation', 'Private Foundation']
);

-- Verify metadata
SELECT
    em.authors,
    em.publication_date,
    em.doi,
    em.keywords,
    em.geolocation,
    em.sample_size,
    em.citation_count
FROM public."EvidenceMetadata" em
WHERE em.evidence_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid;

-- Expected: 1 row with all metadata fields populated

-- Test full-text search on abstract
SELECT
    em.evidence_id,
    em.abstract,
    ts_rank(
        to_tsvector('english', em.abstract),
        plainto_tsquery('english', 'comprehensive test')
    ) AS rank
FROM public."EvidenceMetadata" em
WHERE to_tsvector('english', em.abstract) @@ plainto_tsquery('english', 'comprehensive test');

-- Expected: 1 row with rank > 0

ROLLBACK;

-- ============================================================================
-- TEST 4: Evidence Reviews
-- ============================================================================
-- Test community review system

BEGIN;

-- Setup test data
INSERT INTO public."Users" (id, username, email, password_hash)
SELECT
    ('f0000000-0000-0000-0000-00000000000' || i::text)::uuid,
    'reviewer_' || i,
    'reviewer' || i || '@example.com',
    'hash'
FROM generate_series(1, 5) i
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title)
VALUES ('f1111111-1111-1111-1111-111111111111'::uuid, 'website', 'Review Test Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('f2222222-2222-2222-2222-222222222222'::uuid, 'Review Test Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    'f3333333-3333-3333-3333-333333333333'::uuid,
    'f2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    'f4444444-4444-4444-4444-444444444444'::uuid,
    'f3333333-3333-3333-3333-333333333333'::uuid,
    'f1111111-1111-1111-1111-111111111111'::uuid,
    'supporting',
    'Evidence to be reviewed',
    'f0000000-0000-0000-0000-000000000001'::uuid
);

-- Add multiple reviews with varying scores
INSERT INTO public."EvidenceReviews" (
    evidence_id,
    reviewer_id,
    quality_score,
    credibility_score,
    relevance_score,
    clarity_score,
    overall_rating,
    recommendation,
    review_text,
    reviewer_expertise_level
)
SELECT
    'f4444444-4444-4444-4444-444444444444'::uuid,
    ('f0000000-0000-0000-0000-00000000000' || i::text)::uuid,
    0.5 + (i * 0.1),
    0.6 + (i * 0.08),
    0.7 + (i * 0.06),
    0.8 + (i * 0.04),
    CASE WHEN i <= 2 THEN 3 WHEN i <= 4 THEN 4 ELSE 5 END,
    CASE WHEN i <= 3 THEN 'accept' ELSE 'accept_with_revisions' END,
    'Review text from reviewer ' || i,
    CASE WHEN i = 1 THEN 'expert' WHEN i = 2 THEN 'professional' ELSE 'knowledgeable' END
FROM generate_series(1, 5) i;

-- Verify reviews
SELECT
    er.reviewer_id,
    er.quality_score,
    er.overall_rating,
    er.recommendation,
    er.reviewer_expertise_level
FROM public."EvidenceReviews" er
WHERE er.evidence_id = 'f4444444-4444-4444-4444-444444444444'::uuid
ORDER BY er.quality_score DESC;

-- Expected: 5 rows with increasing quality scores

-- Test quality score calculation
SELECT
    calculate_evidence_quality_score('f4444444-4444-4444-4444-444444444444'::uuid) AS quality_score;

-- Expected: Score between 0.6 and 0.8 (weighted average with confidence adjustment)

-- Add review votes
INSERT INTO public."EvidenceReviewVotes" (review_id, user_id, vote_type)
SELECT
    er.id,
    'f0000000-0000-0000-0000-000000000005'::uuid,
    CASE WHEN random() > 0.3 THEN 'helpful' ELSE 'not_helpful' END
FROM public."EvidenceReviews" er
WHERE er.evidence_id = 'f4444444-4444-4444-4444-444444444444'::uuid;

-- Verify vote counts updated
SELECT
    er.id,
    er.helpful_count,
    er.not_helpful_count
FROM public."EvidenceReviews" er
WHERE er.evidence_id = 'f4444444-4444-4444-4444-444444444444'::uuid;

-- Expected: Vote counts > 0

ROLLBACK;

-- ============================================================================
-- TEST 5: Duplicate Detection
-- ============================================================================
-- Test file hash-based duplicate detection

BEGIN;

-- Create test evidence items with duplicate files
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('d0000000-0000-0000-0000-000000000000'::uuid, 'dup_user', 'dup@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title)
VALUES ('d1111111-1111-1111-1111-111111111111'::uuid, 'website', 'Dup Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('d2222222-2222-2222-2222-222222222222'::uuid, 'Dup Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    'd3333333-3333-3333-3333-333333333333'::uuid,
    'd2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

-- Create two evidence items
INSERT INTO public."Evidence" (id, target_node_id, source_id, evidence_type, content, submitted_by)
VALUES
    ('d4444444-4444-4444-4444-444444444444'::uuid, 'd3333333-3333-3333-3333-333333333333'::uuid,
     'd1111111-1111-1111-1111-111111111111'::uuid, 'supporting', 'Evidence 1', 'd0000000-0000-0000-0000-000000000000'::uuid),
    ('d5555555-5555-5555-5555-555555555555'::uuid, 'd3333333-3333-3333-3333-333333333333'::uuid,
     'd1111111-1111-1111-1111-111111111111'::uuid, 'supporting', 'Evidence 2', 'd0000000-0000-0000-0000-000000000000'::uuid);

-- Upload same file twice (same hash)
INSERT INTO public."EvidenceFiles" (
    evidence_id,
    file_type,
    storage_provider,
    storage_key,
    file_hash,
    file_size,
    mime_type,
    original_filename,
    uploaded_by
)
VALUES
    ('d4444444-4444-4444-4444-444444444444'::uuid, 'document', 'local', 'path1/file.pdf',
     'duplicate_hash_123', 1024, 'application/pdf', 'file1.pdf', 'd0000000-0000-0000-0000-000000000000'::uuid),
    ('d5555555-5555-5555-5555-555555555555'::uuid, 'document', 'local', 'path2/file.pdf',
     'duplicate_hash_123', 1024, 'application/pdf', 'file2.pdf', 'd0000000-0000-0000-0000-000000000000'::uuid);

-- Verify duplicate detection triggered
SELECT
    ed.evidence_id_1,
    ed.evidence_id_2,
    ed.file_hash_match,
    ed.detection_method,
    ed.status
FROM public."EvidenceDuplicates" ed
WHERE ed.file_hash_match = true;

-- Expected: 1 row with file_hash_match = true, detection_method = 'file_hash'

-- Test duplicate detection function
SELECT * FROM detect_duplicate_evidence(
    'd4444444-4444-4444-4444-444444444444'::uuid,
    'duplicate_hash_123'
);

-- Expected: 1 row with evidence_id = 'd5555555-5555-5555-5555-555555555555'

ROLLBACK;

-- ============================================================================
-- TEST 6: Search Index
-- ============================================================================
-- Test full-text search functionality

BEGIN;

-- Create searchable evidence
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('s0000000-0000-0000-0000-000000000000'::uuid, 'search_user', 'search@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title, abstract)
VALUES (
    's1111111-1111-1111-1111-111111111111'::uuid,
    'academic_paper',
    'Climate Change Research Study',
    'A comprehensive analysis of climate change impacts on coastal regions'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('s2222222-2222-2222-2222-222222222222'::uuid, 'Search Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    's3333333-3333-3333-3333-333333333333'::uuid,
    's2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    's4444444-4444-4444-4444-444444444444'::uuid,
    's3333333-3333-3333-3333-333333333333'::uuid,
    's1111111-1111-1111-1111-111111111111'::uuid,
    'supporting',
    'Evidence about climate change and environmental impact on marine ecosystems',
    's0000000-0000-0000-0000-000000000000'::uuid
);

INSERT INTO public."EvidenceMetadata" (
    evidence_id,
    keywords,
    topics,
    abstract
)
VALUES (
    's4444444-4444-4444-4444-444444444444'::uuid,
    ARRAY['climate', 'environment', 'marine', 'ecosystem'],
    ARRAY['climate change', 'marine biology'],
    'Detailed study of climate change effects on ocean temperatures and marine life'
);

-- Trigger search index update
PERFORM update_evidence_search_index('s4444444-4444-4444-4444-444444444444'::uuid);

-- Verify search index created
SELECT
    esi.evidence_id,
    esi.keywords,
    esi.topics,
    esi.search_content IS NOT NULL AS has_search_content,
    esi.search_vector IS NOT NULL AS has_search_vector
FROM public."EvidenceSearchIndex" esi
WHERE esi.evidence_id = 's4444444-4444-4444-4444-444444444444'::uuid;

-- Expected: 1 row with keywords and topics populated

-- Test full-text search
SELECT
    esi.evidence_id,
    ts_rank(esi.search_vector, plainto_tsquery('english', 'climate marine')) AS rank
FROM public."EvidenceSearchIndex" esi
WHERE esi.search_vector @@ plainto_tsquery('english', 'climate marine')
ORDER BY rank DESC;

-- Expected: 1 row with rank > 0

ROLLBACK;

-- ============================================================================
-- TEST 7: Audit Logging
-- ============================================================================
-- Test audit trail functionality

BEGIN;

-- Create test data
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('a0000000-0000-0000-0000-000000000000'::uuid, 'audit_user', 'audit@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title)
VALUES ('a1111111-1111-1111-1111-111111111111'::uuid, 'website', 'Audit Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('a2222222-2222-2222-2222-222222222222'::uuid, 'Audit Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    'a4444444-4444-4444-4444-444444444444'::uuid,
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'supporting',
    'Audit test evidence',
    'a0000000-0000-0000-0000-000000000000'::uuid
);

-- Upload file (should trigger audit log)
INSERT INTO public."EvidenceFiles" (
    evidence_id,
    file_type,
    storage_provider,
    storage_key,
    file_hash,
    file_size,
    mime_type,
    original_filename,
    uploaded_by
)
VALUES (
    'a4444444-4444-4444-4444-444444444444'::uuid,
    'document',
    'local',
    'audit/test.pdf',
    'audit_hash_123',
    2048,
    'application/pdf',
    'audit_file.pdf',
    'a0000000-0000-0000-0000-000000000000'::uuid
);

-- Verify audit log entry
SELECT
    eal.evidence_id,
    eal.action,
    eal.actor_id,
    eal.changes IS NOT NULL AS has_changes
FROM public."EvidenceAuditLog" eal
WHERE eal.evidence_id = 'a4444444-4444-4444-4444-444444444444'::uuid
ORDER BY eal.created_at DESC
LIMIT 1;

-- Expected: 1 row with action = 'created'

-- Test manual audit logging
SELECT log_evidence_audit(
    'a4444444-4444-4444-4444-444444444444'::uuid,
    'verified'::evidence_audit_action,
    'a0000000-0000-0000-0000-000000000000'::uuid,
    '{"verification": "passed"}'::jsonb,
    'Evidence verified by admin'
);

-- Verify manual log entry
SELECT
    eal.action,
    eal.action_description,
    eal.changes
FROM public."EvidenceAuditLog" eal
WHERE eal.evidence_id = 'a4444444-4444-4444-4444-444444444444'::uuid
    AND eal.action = 'verified';

-- Expected: 1 row with description

ROLLBACK;

-- ============================================================================
-- TEST 8: Views and Aggregations
-- ============================================================================
-- Test comprehensive views

BEGIN;

-- Create comprehensive test data
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('v0000000-0000-0000-0000-000000000000'::uuid, 'view_user', 'view@example.com', 'hash')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public."Sources" (id, source_type, title)
VALUES ('v1111111-1111-1111-1111-111111111111'::uuid, 'academic_paper', 'View Test Source')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Graphs" (id, name, level)
VALUES ('v2222222-2222-2222-2222-222222222222'::uuid, 'View Graph', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Nodes" (id, graph_id, node_type_id, is_level_0)
VALUES (
    'v3333333-3333-3333-3333-333333333333'::uuid,
    'v2222222-2222-2222-2222-222222222222'::uuid,
    (SELECT id FROM public."NodeTypes" LIMIT 1),
    false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Evidence" (
    id,
    target_node_id,
    source_id,
    evidence_type,
    content,
    submitted_by
)
VALUES (
    'v4444444-4444-4444-4444-444444444444'::uuid,
    'v3333333-3333-3333-3333-333333333333'::uuid,
    'v1111111-1111-1111-1111-111111111111'::uuid,
    'supporting',
    'View test evidence',
    'v0000000-0000-0000-0000-000000000000'::uuid
);

-- Add file, metadata, and reviews
INSERT INTO public."EvidenceFiles" (
    evidence_id, file_type, storage_provider, storage_key,
    file_hash, file_size, mime_type, original_filename, uploaded_by
)
VALUES (
    'v4444444-4444-4444-4444-444444444444'::uuid, 'document', 'local', 'view/test.pdf',
    'view_hash', 5000, 'application/pdf', 'view.pdf', 'v0000000-0000-0000-0000-000000000000'::uuid
);

INSERT INTO public."EvidenceMetadata" (
    evidence_id, authors, keywords, publication_date
)
VALUES (
    'v4444444-4444-4444-4444-444444444444'::uuid,
    ARRAY['Test Author'],
    ARRAY['test', 'view'],
    '2024-01-01'
);

INSERT INTO public."EvidenceReviews" (
    evidence_id, reviewer_id, quality_score, credibility_score,
    relevance_score, overall_rating, recommendation
)
VALUES (
    'v4444444-4444-4444-4444-444444444444'::uuid,
    'v0000000-0000-0000-0000-000000000000'::uuid,
    0.85, 0.90, 0.80, 5, 'accept'
);

-- Test EvidenceFullDetails view
SELECT
    efd.id,
    efd.source_title,
    efd.evidence_type,
    efd.review_count,
    efd.avg_quality_score
FROM public."EvidenceFullDetails" efd
WHERE efd.id = 'v4444444-4444-4444-4444-444444444444'::uuid;

-- Expected: 1 row with review_count = 1, avg_quality_score = 0.85

-- Test EvidenceQualityReport view
SELECT
    eqr.evidence_id,
    eqr.file_count,
    eqr.review_count,
    eqr.avg_quality_score,
    eqr.calculated_quality_score
FROM public."EvidenceQualityReport" eqr
WHERE eqr.evidence_id = 'v4444444-4444-4444-4444-444444444444'::uuid;

-- Expected: 1 row with file_count = 1, review_count = 1

ROLLBACK;

-- ============================================================================
-- TEST 9: Performance Testing
-- ============================================================================
-- Test query performance with indexes

-- Note: Run with EXPLAIN ANALYZE to see actual performance
-- Example:
-- EXPLAIN ANALYZE
-- SELECT * FROM public."EvidenceSearchIndex"
-- WHERE search_vector @@ plainto_tsquery('english', 'test query')
-- LIMIT 100;

-- Test index usage on EvidenceFiles
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public."EvidenceFiles"
WHERE file_hash = 'test_hash'
    AND deleted_at IS NULL;

-- Expected: Index Scan on idx_evidence_files_hash

-- Test composite index on attachments
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public."EvidenceAttachments"
WHERE target_node_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND detached_at IS NULL;

-- Expected: Index Scan on idx_evidence_attachments_node

-- Test GIN index on keywords
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public."EvidenceMetadata"
WHERE keywords @> ARRAY['climate'];

-- Expected: Bitmap Index Scan on idx_evidence_metadata_keywords

-- ============================================================================
-- TEST 10: Constraint Validation
-- ============================================================================
-- Test all constraints are enforced

-- Test: Cannot attach to both node and edge
DO $$
BEGIN
    BEGIN
        INSERT INTO public."EvidenceAttachments" (
            evidence_id,
            target_node_id,
            target_edge_id,
            attached_by
        )
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid
        );
        RAISE EXCEPTION 'Should have failed CHECK constraint';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'CHECK constraint working: cannot attach to both node and edge';
    END;
END $$;

-- Test: Quality score must be between 0 and 1
DO $$
BEGIN
    BEGIN
        INSERT INTO public."EvidenceReviews" (
            evidence_id,
            reviewer_id,
            quality_score
        )
        VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            1.5  -- Invalid
        );
        RAISE EXCEPTION 'Should have failed CHECK constraint';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'CHECK constraint working: quality_score must be <= 1.0';
    END;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

-- Run all tests and summarize results
DO $$
DECLARE
    test_count INTEGER := 0;
    passed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Evidence Management System Test Summary';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All constraint and functional tests completed.';
    RAISE NOTICE 'Review output above for detailed test results.';
    RAISE NOTICE '';
    RAISE NOTICE 'To run performance tests, use EXPLAIN ANALYZE';
    RAISE NOTICE 'on the performance testing section (TEST 9).';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
END $$;
