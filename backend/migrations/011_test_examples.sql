-- Test Examples for Graph Versioning System (Migration 011)
-- Run these queries to test the functionality

-- ============================================
-- SETUP: Create a test graph and user
-- ============================================

-- Insert test user
INSERT INTO public."Users" (id, username, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'test_user', 'test@example.com', 'hash')
ON CONFLICT (id) DO NOTHING;

-- Insert a test graph (Level 1)
INSERT INTO public."Graphs" (id, name, description, level, methodology, privacy, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test Investigation',
    'Testing version control',
    1,
    'scientific_method',
    'private',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Get a node type ID
DO $$
DECLARE
    node_type_id uuid;
BEGIN
    SELECT id INTO node_type_id FROM public."NodeTypes" LIMIT 1;

    -- Insert test nodes
    INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, weight, is_level_0, created_by)
    VALUES
        (
            '22222222-2222-2222-2222-222222222221',
            '11111111-1111-1111-1111-111111111111',
            node_type_id,
            '{"label": "Hypothesis", "content": "Water boils at 100°C"}',
            0.5,
            false,
            '00000000-0000-0000-0000-000000000001'
        ),
        (
            '22222222-2222-2222-2222-222222222222',
            '11111111-1111-1111-1111-111111111111',
            node_type_id,
            '{"label": "Evidence", "content": "Experimental data"}',
            0.7,
            false,
            '00000000-0000-0000-0000-000000000001'
        )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================
-- TEST 1: Manual Snapshot Creation
-- ============================================

SELECT '=== TEST 1: Creating Manual Snapshot ===' AS test;

-- Create a snapshot
INSERT INTO public."GraphVersions" (
    graph_id,
    version_number,
    snapshot_data,
    snapshot_metadata,
    created_by
)
SELECT
    '11111111-1111-1111-1111-111111111111',
    COALESCE(MAX(version_number), 0) + 1,
    jsonb_build_object(
        'graph', jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'description', g.description,
            'level', g.level
        ),
        'nodes', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('id', n.id, 'props', n.props, 'weight', n.weight)
            ), '[]'::jsonb)
            FROM public."Nodes" n
            WHERE n.graph_id = g.id
        ),
        'edges', '[]'::jsonb
    ),
    '{"test": "manual_snapshot"}',
    '00000000-0000-0000-0000-000000000001'
FROM public."Graphs" g
LEFT JOIN public."GraphVersions" gv ON gv.graph_id = g.id
WHERE g.id = '11111111-1111-1111-1111-111111111111'
GROUP BY g.id, g.name, g.description, g.level;

-- Verify snapshot was created
SELECT
    version_number,
    created_at,
    snapshot_metadata,
    snapshot_data->'nodes' as nodes_count
FROM public."GraphVersions"
WHERE graph_id = '11111111-1111-1111-1111-111111111111'
ORDER BY version_number DESC
LIMIT 1;

-- ============================================
-- TEST 2: Automatic Snapshot Trigger
-- ============================================

SELECT '=== TEST 2: Testing Auto-Snapshot Trigger ===' AS test;

-- Update the graph (should trigger automatic snapshot)
UPDATE public."Graphs"
SET description = 'Updated description - testing auto-snapshot'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Check if new version was created
SELECT
    version_number,
    created_at,
    snapshot_metadata->>'trigger_type' as trigger_type
FROM public."GraphVersions"
WHERE graph_id = '11111111-1111-1111-1111-111111111111'
ORDER BY version_number DESC
LIMIT 1;

-- ============================================
-- TEST 3: Get Version History Function
-- ============================================

SELECT '=== TEST 3: Version History Function ===' AS test;

SELECT * FROM get_graph_version_history('11111111-1111-1111-1111-111111111111');

-- ============================================
-- TEST 4: Fork Graph
-- ============================================

SELECT '=== TEST 4: Creating Graph Fork ===' AS test;

-- Create a fork
DO $$
DECLARE
    new_graph_id uuid := '33333333-3333-3333-3333-333333333333';
    source_graph_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Create forked graph
    INSERT INTO public."Graphs" (
        id, name, description, level, methodology, privacy,
        parent_graph_id, fork_metadata, created_by
    )
    SELECT
        new_graph_id,
        name || ' (Fork)',
        description,
        1,
        methodology,
        'private',
        source_graph_id,
        jsonb_build_object(
            'forked_from', source_graph_id,
            'forked_at', now(),
            'fork_reason', 'Testing fork functionality',
            'original_name', name
        ),
        created_by
    FROM public."Graphs"
    WHERE id = source_graph_id
    ON CONFLICT (id) DO NOTHING;

    -- Copy nodes
    INSERT INTO public."Nodes" (graph_id, node_type_id, props, meta, weight, is_level_0, created_by)
    SELECT
        new_graph_id,
        node_type_id,
        props,
        meta,
        weight,
        false,
        created_by
    FROM public."Nodes"
    WHERE graph_id = source_graph_id;

    RAISE NOTICE 'Fork created with ID: %', new_graph_id;
END $$;

-- Verify fork was created
SELECT
    id,
    name,
    parent_graph_id,
    fork_metadata->>'fork_reason' as fork_reason
FROM public."Graphs"
WHERE id = '33333333-3333-3333-3333-333333333333';

-- ============================================
-- TEST 5: Get Graph Forks Function
-- ============================================

SELECT '=== TEST 5: Get Forks Function ===' AS test;

SELECT * FROM get_graph_forks('11111111-1111-1111-1111-111111111111');

-- ============================================
-- TEST 6: Get Graph Ancestry Function
-- ============================================

SELECT '=== TEST 6: Get Ancestry Function ===' AS test;

-- Test ancestry of the fork
SELECT * FROM get_graph_ancestry('33333333-3333-3333-3333-333333333333');

-- ============================================
-- TEST 7: Version Comparison
-- ============================================

SELECT '=== TEST 7: Comparing Versions ===' AS test;

-- Compare node counts between versions
SELECT
    version_number,
    jsonb_array_length(snapshot_data->'nodes') as node_count,
    jsonb_array_length(snapshot_data->'edges') as edge_count,
    created_at
FROM public."GraphVersions"
WHERE graph_id = '11111111-1111-1111-1111-111111111111'
ORDER BY version_number;

-- ============================================
-- TEST 8: Verify Indexes
-- ============================================

SELECT '=== TEST 8: Checking Indexes ===' AS test;

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('GraphVersions', 'Graphs')
    AND indexname LIKE '%version%' OR indexname LIKE '%parent%'
ORDER BY tablename, indexname;

-- ============================================
-- TEST 9: Verify Constraints
-- ============================================

SELECT '=== TEST 9: Checking Constraints ===' AS test;

SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public."GraphVersions"'::regclass;

-- ============================================
-- TEST 10: Performance Test (Large Snapshot)
-- ============================================

SELECT '=== TEST 10: Performance Test ===' AS test;

-- Show snapshot data size
SELECT
    version_number,
    pg_size_pretty(pg_column_size(snapshot_data)) as snapshot_size,
    jsonb_array_length(snapshot_data->'nodes') as node_count,
    created_at
FROM public."GraphVersions"
WHERE graph_id = '11111111-1111-1111-1111-111111111111'
ORDER BY version_number DESC;

-- ============================================
-- TEST 11: Trigger Behavior
-- ============================================

SELECT '=== TEST 11: Testing Trigger Edge Cases ===' AS test;

-- Test that Level 0 graphs don't create versions
INSERT INTO public."Graphs" (id, name, level, privacy)
VALUES ('44444444-4444-4444-4444-444444444444', 'Level 0 Test', 0, 'public')
ON CONFLICT (id) DO NOTHING;

UPDATE public."Graphs"
SET description = 'This should NOT create a version'
WHERE id = '44444444-4444-4444-4444-444444444444';

-- Verify no version was created for Level 0
SELECT COUNT(*) as level_0_versions_should_be_zero
FROM public."GraphVersions"
WHERE graph_id = '44444444-4444-4444-4444-444444444444';

-- ============================================
-- TEST 12: Version History Summary
-- ============================================

SELECT '=== TEST 12: Version History Summary ===' AS test;

SELECT
    g.name as graph_name,
    g.level,
    COUNT(gv.id) as version_count,
    MIN(gv.created_at) as first_version,
    MAX(gv.created_at) as latest_version
FROM public."Graphs" g
LEFT JOIN public."GraphVersions" gv ON gv.graph_id = g.id
WHERE g.id IN ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
GROUP BY g.id, g.name, g.level;

-- ============================================
-- CLEANUP (Optional - uncomment to run)
-- ============================================

-- Uncomment below to clean up test data
/*
DELETE FROM public."Graphs" WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

DELETE FROM public."Users" WHERE id = '00000000-0000-0000-0000-000000000001';
*/

-- ============================================
-- SUMMARY
-- ============================================

SELECT '=== TEST SUITE COMPLETE ===' AS summary;

SELECT
    'GraphVersions' as table_name,
    COUNT(*) as total_versions
FROM public."GraphVersions"
UNION ALL
SELECT
    'Graphs with parent_graph_id',
    COUNT(*)
FROM public."Graphs"
WHERE parent_graph_id IS NOT NULL;
