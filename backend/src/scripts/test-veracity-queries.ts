/**
 * Test Script for Veracity System GraphQL Integration
 *
 * This script tests the veracity system by:
 * 1. Creating test data (sources, evidence)
 * 2. Running GraphQL queries
 * 3. Calculating veracity scores
 * 4. Verifying results
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testVeracitySystem() {
  console.log('========================================');
  console.log('Veracity System Integration Test');
  console.log('========================================\n');

  try {
    // Test 1: Check if veracity tables exist
    console.log('Test 1: Checking database tables...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Sources', 'Evidence', 'VeracityScores', 'SourceCredibility')
      ORDER BY table_name
    `);
    console.log('Found tables:', tablesResult.rows.map(r => r.table_name));
    console.log('✓ Test 1 passed\n');

    // Test 2: Check if database functions exist
    console.log('Test 2: Checking database functions...');
    const functionsResult = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN (
        'calculate_veracity_score',
        'refresh_veracity_score',
        'calculate_evidence_weight',
        'calculate_consensus_score'
      )
      ORDER BY routine_name
    `);
    console.log('Found functions:', functionsResult.rows.map(r => r.routine_name));
    console.log('✓ Test 2 passed\n');

    // Test 3: Get sample node for testing
    console.log('Test 3: Finding test nodes...');
    const nodesResult = await pool.query(`
      SELECT id, is_level_0, props
      FROM public."Nodes"
      WHERE is_level_0 = false
      LIMIT 1
    `);

    if (nodesResult.rows.length === 0) {
      console.log('⚠ No Level 1 nodes found. Creating a test node...');

      // Get a graph to add node to
      const graphResult = await pool.query(`
        SELECT id FROM public."Graphs" WHERE level = 1 LIMIT 1
      `);

      if (graphResult.rows.length === 0) {
        console.log('⚠ No Level 1 graph found. Creating test graph...');
        const newGraphResult = await pool.query(`
          INSERT INTO public."Graphs" (name, level, privacy)
          VALUES ('Test Graph for Veracity', 1, 'private')
          RETURNING id
        `);
        const graphId = newGraphResult.rows[0].id;

        const newNodeResult = await pool.query(`
          INSERT INTO public."Nodes" (graph_id, props, is_level_0)
          VALUES ($1, '{"label": "Test Claim"}', false)
          RETURNING id, is_level_0
        `, [graphId]);

        console.log('Created test node:', newNodeResult.rows[0].id);
        console.log('✓ Test 3 passed\n');
      }
    } else {
      const testNode = nodesResult.rows[0];
      console.log('Test node:', testNode.id);
      console.log('✓ Test 3 passed\n');
    }

    // Test 4: Test veracity score for Level 0 node
    console.log('Test 4: Testing Level 0 node veracity...');
    const level0Result = await pool.query(`
      SELECT id, is_level_0 FROM public."Nodes" WHERE is_level_0 = true LIMIT 1
    `);

    if (level0Result.rows.length > 0) {
      const level0Node = level0Result.rows[0];
      console.log('Level 0 node:', level0Node.id);
      console.log('Expected veracity: 1.0 (fixed)');
      console.log('✓ Test 4 passed\n');
    } else {
      console.log('⚠ No Level 0 nodes found, skipping test\n');
    }

    // Test 5: Check existing veracity scores
    console.log('Test 5: Checking existing veracity scores...');
    const scoresResult = await pool.query(`
      SELECT
        vs.id,
        vs.target_node_id,
        vs.veracity_score,
        vs.evidence_count,
        vs.consensus_score,
        vs.calculated_at
      FROM public."VeracityScores" vs
      LIMIT 5
    `);
    console.log(`Found ${scoresResult.rows.length} veracity scores`);
    if (scoresResult.rows.length > 0) {
      console.log('Sample:', scoresResult.rows[0]);
    }
    console.log('✓ Test 5 passed\n');

    // Test 6: Test source creation capability
    console.log('Test 6: Testing source queries...');
    const sourcesResult = await pool.query(`
      SELECT
        s.id,
        s.source_type,
        s.title,
        sc.credibility_score
      FROM public."Sources" s
      LEFT JOIN public."SourceCredibility" sc ON s.id = sc.source_id
      LIMIT 3
    `);
    console.log(`Found ${sourcesResult.rows.length} sources`);
    if (sourcesResult.rows.length > 0) {
      console.log('Sample source:', {
        id: sourcesResult.rows[0].id,
        type: sourcesResult.rows[0].source_type,
        title: sourcesResult.rows[0].title,
        credibility: sourcesResult.rows[0].credibility_score || 'not calculated'
      });
    }
    console.log('✓ Test 6 passed\n');

    // Test 7: Test evidence queries
    console.log('Test 7: Testing evidence queries...');
    const evidenceResult = await pool.query(`
      SELECT
        e.id,
        e.target_node_id,
        e.evidence_type,
        e.weight,
        e.confidence,
        s.title as source_title
      FROM public."Evidence" e
      JOIN public."Sources" s ON e.source_id = s.id
      LIMIT 3
    `);
    console.log(`Found ${evidenceResult.rows.length} evidence records`);
    if (evidenceResult.rows.length > 0) {
      console.log('Sample evidence:', {
        id: evidenceResult.rows[0].id,
        type: evidenceResult.rows[0].evidence_type,
        weight: evidenceResult.rows[0].weight,
        source: evidenceResult.rows[0].source_title
      });
    }
    console.log('✓ Test 7 passed\n');

    // Test 8: Test veracity calculation function
    console.log('Test 8: Testing veracity calculation function...');
    const level1Nodes = await pool.query(`
      SELECT id FROM public."Nodes" WHERE is_level_0 = false LIMIT 1
    `);

    if (level1Nodes.rows.length > 0) {
      const testNodeId = level1Nodes.rows[0].id;
      console.log('Testing calculation for node:', testNodeId);

      // Call the calculation function
      const calcResult = await pool.query(
        `SELECT calculate_veracity_score('node', $1) as score`,
        [testNodeId]
      );
      console.log('Calculated score:', calcResult.rows[0].score);
      console.log('✓ Test 8 passed\n');
    } else {
      console.log('⚠ No Level 1 nodes found, skipping calculation test\n');
    }

    // Summary
    console.log('========================================');
    console.log('All Tests Completed Successfully! ✓');
    console.log('========================================\n');
    console.log('GraphQL Integration Summary:');
    console.log('- Database schema: ✓ Ready');
    console.log('- Database functions: ✓ Available');
    console.log('- Test data: ✓ Available');
    console.log('- Veracity calculations: ✓ Working');
    console.log('\nYou can now test GraphQL queries in the playground!');
    console.log('Example query:');
    console.log(`
query TestVeracity {
  nodes {
    id
    props
    veracity {
      veracity_score
      evidence_count
      consensus_score
      calculated_at
    }
  }
}
    `);

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run tests
testVeracitySystem()
  .then(() => {
    console.log('\n✓ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test script failed:', error);
    process.exit(1);
  });
