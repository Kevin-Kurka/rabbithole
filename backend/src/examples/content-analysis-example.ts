/**
 * Content Analysis Service - Usage Examples
 *
 * This file demonstrates how to use the ContentAnalysisService
 * for perceptual fingerprinting and duplicate detection.
 *
 * Run with: ts-node src/examples/content-analysis-example.ts
 */

import { Pool } from 'pg';
import { ContentAnalysisService } from '../services/ContentAnalysisService';
import { FileStorageService } from '../services/FileStorageService';
import { promises as fs } from 'fs';
import * as path from 'path';

// ============================================================================
// SETUP
// ============================================================================

async function setupServices() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rabbithole_db',
  });

  const fileStorage = new FileStorageService(pool);
  const contentAnalysis = new ContentAnalysisService(pool, fileStorage);

  return { pool, fileStorage, contentAnalysis };
}

// ============================================================================
// EXAMPLE 1: Analyze Image Content
// ============================================================================

async function example1_analyzeImage() {
  console.log('\n=== EXAMPLE 1: Analyze Image Content ===\n');

  const { pool, contentAnalysis } = await setupServices();

  try {
    // Assume we have a node with an image
    const nodeId = '550e8400-e29b-41d4-a716-446655440000';

    // Analyze the image
    console.log('Analyzing image content...');
    const result = await contentAnalysis.analyzeContent(nodeId);

    console.log('Fingerprint Result:');
    console.log(`- Content Type: ${result.contentType}`);
    console.log(`- Fingerprint Type: ${result.fingerprintType}`);
    console.log(`- Hash: ${result.hash}`);
    if ('width' in result && 'height' in result) {
      console.log(`- Dimensions: ${result.width}x${result.height}`);
    }

    // Check for duplicates
    console.log('\nChecking for duplicates...');
    const duplicates = await contentAnalysis.findDuplicates(nodeId);

    if (duplicates.isDuplicate) {
      console.log(`Found ${duplicates.matches.length} similar images!`);
      console.log(`Primary source: ${duplicates.primarySourceId}`);

      duplicates.matches.forEach((match, i) => {
        console.log(`  ${i + 1}. Node ${match.nodeId}:`);
        console.log(`     Similarity: ${(match.similarity * 100).toFixed(1)}%`);
        console.log(`     Hamming Distance: ${match.hammingDistance}`);
      });
    } else {
      console.log('No duplicates found. This is a unique image.');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXAMPLE 2: Batch Processing
// ============================================================================

async function example2_batchProcessing() {
  console.log('\n=== EXAMPLE 2: Batch Processing ===\n');

  const { pool, contentAnalysis } = await setupServices();

  try {
    // Get all unprocessed nodes from a graph
    const graphId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await pool.query(
      `SELECT id FROM public."Nodes"
       WHERE graph_id = $1
         AND content_hash IS NULL
         AND deleted_at IS NULL
       LIMIT 10`,
      [graphId]
    );

    const nodeIds = result.rows.map((row) => row.id);

    console.log(`Processing ${nodeIds.length} nodes...`);

    // Batch analyze
    const results = await contentAnalysis.batchAnalyze(nodeIds);

    console.log(`\nSuccessfully processed ${results.size} nodes:\n`);

    results.forEach((fingerprint, nodeId) => {
      console.log(`- ${nodeId.substring(0, 8)}...`);
      console.log(`  Type: ${fingerprint.contentType}`);
      console.log(`  Hash: ${fingerprint.hash.substring(0, 16)}...`);
    });

    // Now find all duplicates in the graph
    console.log('\nSearching for duplicates...');
    const duplicatesMap = await contentAnalysis.findAllDuplicatesInGraph(graphId);

    if (duplicatesMap.size > 0) {
      console.log(`\nFound ${duplicatesMap.size} nodes with duplicates:\n`);

      duplicatesMap.forEach((duplicateResult, nodeId) => {
        console.log(`- ${nodeId.substring(0, 8)}... has ${duplicateResult.matches.length} duplicate(s)`);
        console.log(`  Primary: ${duplicateResult.primarySourceId?.substring(0, 8)}...`);
      });
    } else {
      console.log('No duplicates found in this graph.');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXAMPLE 3: Text Duplicate Detection
// ============================================================================

async function example3_textDuplicates() {
  console.log('\n=== EXAMPLE 3: Text Duplicate Detection ===\n');

  const { pool, contentAnalysis } = await setupServices();

  try {
    // Create test nodes with similar text
    const text1 = `
      The quick brown fox jumps over the lazy dog.
      This is a test of the text fingerprinting system.
      We use MinHash to detect similar documents.
    `;

    const text2 = `
      The quick brown fox jumps over the lazy dog.
      This is a test of text fingerprinting.
      MinHash helps us detect similar documents efficiently.
    `;

    console.log('Creating test nodes with similar text...');

    // Node 1
    const result1 = await pool.query(
      `INSERT INTO public."Nodes" (graph_id, node_type_id, props)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['550e8400-e29b-41d4-a716-446655440000', '1', JSON.stringify({ text: text1, contentType: 'text' })]
    );
    const nodeId1 = result1.rows[0].id;

    // Node 2
    const result2 = await pool.query(
      `INSERT INTO public."Nodes" (graph_id, node_type_id, props)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['550e8400-e29b-41d4-a716-446655440000', '1', JSON.stringify({ text: text2, contentType: 'text' })]
    );
    const nodeId2 = result2.rows[0].id;

    // Analyze both texts
    console.log('\nAnalyzing text content...');
    const fingerprint1 = await contentAnalysis.analyzeContent(nodeId1);
    const fingerprint2 = await contentAnalysis.analyzeContent(nodeId2);

    console.log('Node 1:');
    if ('wordCount' in fingerprint1) {
      console.log(`- Word Count: ${fingerprint1.wordCount}`);
    }
    console.log(`- Hash: ${fingerprint1.hash.substring(0, 32)}...`);

    console.log('\nNode 2:');
    if ('wordCount' in fingerprint2) {
      console.log(`- Word Count: ${fingerprint2.wordCount}`);
    }
    console.log(`- Hash: ${fingerprint2.hash.substring(0, 32)}...`);

    // Find duplicates
    console.log('\nChecking for duplicates...');
    const duplicates = await contentAnalysis.findDuplicates(nodeId2);

    if (duplicates.isDuplicate) {
      console.log('Texts are similar!');
      duplicates.matches.forEach((match) => {
        console.log(`- Match: ${match.nodeId}`);
        console.log(`  Similarity: ${(match.similarity * 100).toFixed(1)}%`);
      });
    } else {
      console.log('Texts are not similar enough to be considered duplicates.');
    }

    // Cleanup
    console.log('\nCleaning up test nodes...');
    await pool.query(`DELETE FROM public."Nodes" WHERE id IN ($1, $2)`, [nodeId1, nodeId2]);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXAMPLE 4: Custom Configuration
// ============================================================================

async function example4_customConfig() {
  console.log('\n=== EXAMPLE 4: Custom Configuration ===\n');

  const { pool, fileStorage } = await setupServices();

  try {
    // Create service with custom config
    const strictConfig = {
      imageSimilarityThreshold: 0.98, // Very strict image matching
      videoFrameSampleCount: 20, // More frames for better accuracy
      textSimilarityThreshold: 0.75, // More lenient text matching
    };

    const strictService = new ContentAnalysisService(pool, fileStorage, strictConfig);

    console.log('Created ContentAnalysisService with custom config:');
    console.log(`- Image threshold: ${strictConfig.imageSimilarityThreshold}`);
    console.log(`- Video frames: ${strictConfig.videoFrameSampleCount}`);
    console.log(`- Text threshold: ${strictConfig.textSimilarityThreshold}`);

    // Use the strict service
    const nodeId = '550e8400-e29b-41d4-a716-446655440000';

    console.log('\nFinding duplicates with strict threshold...');
    const duplicates = await strictService.findDuplicates(nodeId);

    console.log(`Found ${duplicates.matches.length} duplicates`);
    console.log('(Fewer matches due to higher threshold)');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXAMPLE 5: GraphQL API Usage
// ============================================================================

async function example5_graphqlUsage() {
  console.log('\n=== EXAMPLE 5: GraphQL API Usage ===\n');

  console.log('To use the GraphQL API, send these queries to http://localhost:4000/graphql:\n');

  console.log('1. Analyze content:\n');
  console.log(`
mutation {
  analyzeContent(nodeId: "YOUR-NODE-ID") {
    nodeId
    contentHash
    fingerprint {
      contentType
      fingerprintType
      hash
    }
    duplicateDetection {
      isDuplicate
      matches {
        nodeId
        similarity
      }
      primarySourceId
    }
    processedAt
  }
}
  `);

  console.log('\n2. Find duplicates:\n');
  console.log(`
mutation {
  findDuplicates(nodeId: "YOUR-NODE-ID", threshold: 0.90) {
    isDuplicate
    matches {
      nodeId
      similarity
      hammingDistance
    }
    primarySourceId
  }
}
  `);

  console.log('\n3. Check analysis status:\n');
  console.log(`
query {
  getContentAnalysisStatus(nodeId: "YOUR-NODE-ID") {
    hasFingerprint
    contentHash
    primarySourceId
    isDuplicate
  }
}
  `);

  console.log('\n4. Get duplicate groups:\n');
  console.log(`
query {
  getDuplicateGroups(graphId: "YOUR-GRAPH-ID") {
    contentHash
    nodeCount
    nodeIds
    primarySourceId
  }
}
  `);
}

// ============================================================================
// EXAMPLE 6: Duplicate Management Workflow
// ============================================================================

async function example6_duplicateWorkflow() {
  console.log('\n=== EXAMPLE 6: Duplicate Management Workflow ===\n');

  const { pool, contentAnalysis } = await setupServices();

  try {
    const graphId = '550e8400-e29b-41d4-a716-446655440000';

    // Step 1: Find all nodes without fingerprints
    console.log('Step 1: Finding unprocessed nodes...');
    const unprocessedResult = await pool.query(
      `SELECT COUNT(*) FROM public."Nodes"
       WHERE graph_id = $1 AND content_hash IS NULL AND deleted_at IS NULL`,
      [graphId]
    );
    console.log(`- Found ${unprocessedResult.rows[0].count} unprocessed nodes`);

    // Step 2: Process them in batches
    console.log('\nStep 2: Processing in batches of 50...');
    let offset = 0;
    const batchSize = 50;
    let totalProcessed = 0;

    while (true) {
      const batchResult = await pool.query(
        `SELECT id FROM public."Nodes"
         WHERE graph_id = $1 AND content_hash IS NULL AND deleted_at IS NULL
         LIMIT $2 OFFSET $3`,
        [graphId, batchSize, offset]
      );

      if (batchResult.rows.length === 0) break;

      const nodeIds = batchResult.rows.map((row) => row.id);
      await contentAnalysis.batchAnalyze(nodeIds);

      totalProcessed += nodeIds.length;
      console.log(`- Processed ${totalProcessed} nodes`);

      offset += batchSize;
    }

    // Step 3: Find all duplicates
    console.log('\nStep 3: Finding duplicates...');
    const duplicatesMap = await contentAnalysis.findAllDuplicatesInGraph(graphId);

    console.log(`- Found ${duplicatesMap.size} nodes with duplicates`);

    // Step 4: Generate report
    console.log('\nStep 4: Generating duplicate report...');

    const reportResult = await pool.query(
      `SELECT
         content_hash,
         COUNT(*) as duplicate_count,
         ARRAY_AGG(id ORDER BY created_at) as node_ids,
         MIN(created_at) as first_seen
       FROM public."Nodes"
       WHERE graph_id = $1
         AND content_hash IS NOT NULL
         AND primary_source_id IS NOT NULL
         AND deleted_at IS NULL
       GROUP BY content_hash
       ORDER BY duplicate_count DESC
       LIMIT 10`,
      [graphId]
    );

    console.log('\nTop 10 duplicate groups:');
    reportResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.duplicate_count} duplicates (hash: ${row.content_hash.substring(0, 16)}...)`);
      console.log(`   First seen: ${row.first_seen}`);
      console.log(`   Nodes: ${row.node_ids.map((id: string) => id.substring(0, 8)).join(', ')}...`);
    });

    // Step 5: Get storage savings estimate
    console.log('\nStep 5: Calculating storage savings...');

    const savingsResult = await pool.query(
      `WITH duplicate_files AS (
         SELECT
           n.primary_source_id,
           ef.file_size
         FROM public."Nodes" n
         JOIN public."EvidenceFiles" ef ON ef.evidence_id = n.id
         WHERE n.graph_id = $1
           AND n.primary_source_id IS NOT NULL
           AND ef.deleted_at IS NULL
       )
       SELECT
         COUNT(*) as duplicate_file_count,
         SUM(file_size) as potential_savings_bytes
       FROM duplicate_files`,
      [graphId]
    );

    const savings = savingsResult.rows[0];
    const savingsMB = (savings.potential_savings_bytes / 1024 / 1024).toFixed(2);

    console.log(`- Duplicate files: ${savings.duplicate_file_count}`);
    console.log(`- Potential storage savings: ${savingsMB} MB`);

    console.log('\n✓ Workflow complete!');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const examples = [
    { name: 'Image Analysis', fn: example1_analyzeImage },
    { name: 'Batch Processing', fn: example2_batchProcessing },
    { name: 'Text Duplicates', fn: example3_textDuplicates },
    { name: 'Custom Config', fn: example4_customConfig },
    { name: 'GraphQL Usage', fn: example5_graphqlUsage },
    { name: 'Duplicate Workflow', fn: example6_duplicateWorkflow },
  ];

  console.log('Content Analysis Service - Usage Examples');
  console.log('==========================================\n');
  console.log('Available examples:\n');

  examples.forEach((example, i) => {
    console.log(`${i + 1}. ${example.name}`);
  });

  console.log('\nNote: Update node/graph IDs in the examples before running!');

  // Uncomment to run specific examples:
  // await example1_analyzeImage();
  // await example2_batchProcessing();
  // await example3_textDuplicates();
  // await example4_customConfig();
  // await example5_graphqlUsage();
  // await example6_duplicateWorkflow();
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✓ Examples finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export {
  example1_analyzeImage,
  example2_batchProcessing,
  example3_textDuplicates,
  example4_customConfig,
  example5_graphqlUsage,
  example6_duplicateWorkflow,
};
