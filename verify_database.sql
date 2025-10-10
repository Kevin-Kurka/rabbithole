-- Rabbit Hole Database Verification Test
-- Run with: docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -f /verify_database.sql
-- Or: cat verify_database.sql | docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db

\echo '========================================='
\echo 'Rabbit Hole Database Verification Test'
\echo '========================================='
\echo ''

\echo '1. Table Count:'
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

\echo ''
\echo '2. Methodology Summary:'
SELECT
    COUNT(*) as total_methodologies,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
    COUNT(CASE WHEN is_system = true THEN 1 END) as system_methodologies
FROM "Methodologies";

\echo ''
\echo '3. Node/Edge Types by Methodology:'
SELECT
    m.name,
    COUNT(DISTINCT nt.id) as node_types,
    COUNT(DISTINCT et.id) as edge_types
FROM "Methodologies" m
LEFT JOIN "MethodologyNodeTypes" nt ON m.id = nt.methodology_id
LEFT JOIN "MethodologyEdgeTypes" et ON m.id = et.methodology_id
GROUP BY m.name
ORDER BY m.name;

\echo ''
\echo '4. Check for Evidence Table:'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Evidence' AND table_schema = 'public')
        THEN 'EXISTS'
        ELSE 'MISSING - CRITICAL ISSUE'
    END as evidence_table_status;

\echo ''
\echo '5. Function Status:'
SELECT
    routine_name,
    CASE
        WHEN routine_name = 'calculate_veracity_score' THEN 'HAS BUG (ambiguous column)'
        WHEN routine_name LIKE '%evidence%' THEN 'UNTESTABLE (no Evidence table)'
        ELSE 'OK'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'calculate_%'
ORDER BY routine_name;

\echo ''
\echo '6. Applied Migrations:'
SELECT version, description, applied_at FROM schema_migrations ORDER BY version;

\echo ''
\echo '7. Row Counts for Key Tables:'
SELECT
    'Users' as table_name, COUNT(*) as rows FROM "Users"
UNION ALL SELECT 'Methodologies', COUNT(*) FROM "Methodologies"
UNION ALL SELECT 'MethodologyNodeTypes', COUNT(*) FROM "MethodologyNodeTypes"
UNION ALL SELECT 'MethodologyEdgeTypes', COUNT(*) FROM "MethodologyEdgeTypes"
UNION ALL SELECT 'MethodologyWorkflows', COUNT(*) FROM "MethodologyWorkflows"
UNION ALL SELECT 'ChallengeTypes', COUNT(*) FROM "ChallengeTypes"
UNION ALL SELECT 'Graphs', COUNT(*) FROM "Graphs"
UNION ALL SELECT 'Nodes', COUNT(*) FROM "Nodes"
UNION ALL SELECT 'Edges', COUNT(*) FROM "Edges"
ORDER BY table_name;

\echo ''
\echo '8. Database Size:'
SELECT pg_size_pretty(pg_database_size('rabbithole_db')) as database_size;

\echo ''
\echo '========================================='
\echo 'Verification Complete'
\echo '========================================='
\echo ''
\echo 'Summary:'
\echo '  - Expected tables: 36+'
\echo '  - Methodologies seeded: 8'
\echo '  - Node types: 28'
\echo '  - Edge types: 22'
\echo '  - Evidence table: CRITICAL if missing'
\echo ''
\echo 'See database_status_report.md for full details'
\echo '========================================='
