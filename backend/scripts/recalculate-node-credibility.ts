#!/usr/bin/env ts-node

/**
 * Recalculate Node Credibility Migration Script
 *
 * This script recalculates the credibility score for all nodes in the graph
 * based on their associated inquiries and positions. It should be run after
 * deploying the new inquiry system to update existing nodes.
 *
 * Usage:
 *   npm run recalculate-credibility
 *   OR
 *   ts-node backend/scripts/recalculate-node-credibility.ts
 *
 * Options:
 *   --dry-run    Preview changes without committing them
 *   --batch-size Number of nodes to process in each batch (default: 100)
 *   --verbose    Show detailed logging for each node
 */

import { Pool } from 'pg';
import { CredibilityCalculationService } from '../src/services/CredibilityCalculationService';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface NodeUpdate {
  nodeId: string;
  nodeName: string;
  oldCredibility: number | null;
  newCredibility: number;
  inquiryCount: number;
  positionCount: number;
}

async function recalculateAllNodeCredibility(): Promise<void> {
  console.log('='.repeat(80));
  console.log('NODE CREDIBILITY RECALCULATION SCRIPT');
  console.log('='.repeat(80));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (changes will be committed)'}`);
  console.log(`Batch size: ${batchSize} nodes`);
  console.log(`Verbose: ${isVerbose ? 'Yes' : 'No'}`);
  console.log('='.repeat(80));
  console.log('');

  const credibilityService = new CredibilityCalculationService(pool);
  const updates: NodeUpdate[] = [];
  let totalNodes = 0;
  let nodesWithInquiries = 0;
  let nodesUpdated = 0;
  let errors = 0;

  try {
    // Get total node count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM public."Nodes"');
    totalNodes = parseInt(countResult.rows[0].count);
    console.log(`Found ${totalNodes} total nodes in database\n`);

    // Get all nodes with their current credibility and inquiry counts
    const nodesResult = await pool.query(`
      SELECT
        n.id,
        n.name,
        n.credibility_score,
        n.is_level_0,
        COUNT(DISTINCT i.id) as inquiry_count,
        COUNT(DISTINCT p.id) as position_count
      FROM public."Nodes" n
      LEFT JOIN public."Inquiries" i ON n.id = i.node_id AND i.status = 'active'
      LEFT JOIN public."InquiryPositions" p ON i.id = p.inquiry_id AND p.status != 'archived'
      GROUP BY n.id, n.name, n.credibility_score, n.is_level_0
      ORDER BY n.created_at ASC
    `);

    const nodes = nodesResult.rows;
    console.log(`Processing ${nodes.length} nodes...\n`);

    // Process nodes in batches
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, Math.min(i + batchSize, nodes.length));
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(nodes.length / batchSize);

      console.log(`\nBatch ${batchNumber}/${totalBatches} (nodes ${i + 1}-${Math.min(i + batchSize, nodes.length)})`);
      console.log('-'.repeat(80));

      for (const node of batch) {
        try {
          // Skip Level 0 nodes (immutable truth)
          if (node.is_level_0) {
            if (isVerbose) {
              console.log(`  ⊗ ${node.name} (${node.id}): Skipped (Level 0 - immutable)`);
            }
            continue;
          }

          // Skip nodes with no inquiries
          if (parseInt(node.inquiry_count) === 0) {
            if (isVerbose) {
              console.log(`  ⊘ ${node.name} (${node.id}): Skipped (no inquiries)`);
            }
            continue;
          }

          nodesWithInquiries++;

          // Calculate new credibility
          const newCredibility = await credibilityService.calculateNodeCredibility(node.id);
          const oldCredibility = node.credibility_score ? parseFloat(node.credibility_score) : null;

          // Check if credibility changed significantly (>1% difference)
          const changed = oldCredibility === null || Math.abs(newCredibility - oldCredibility) > 0.01;

          if (changed) {
            nodesUpdated++;

            updates.push({
              nodeId: node.id,
              nodeName: node.name,
              oldCredibility,
              newCredibility,
              inquiryCount: parseInt(node.inquiry_count),
              positionCount: parseInt(node.position_count),
            });

            if (!isDryRun) {
              await pool.query(
                `UPDATE public."Nodes"
                 SET credibility_score = $1,
                     last_credibility_update = NOW(),
                     updated_at = NOW()
                 WHERE id = $2`,
                [newCredibility, node.id]
              );
            }

            const changeSymbol = oldCredibility === null ? '✓' :
                               newCredibility > oldCredibility ? '↑' :
                               newCredibility < oldCredibility ? '↓' : '=';

            console.log(
              `  ${changeSymbol} ${node.name} (${node.id}): ` +
              `${oldCredibility?.toFixed(3) ?? 'null'} → ${newCredibility.toFixed(3)} ` +
              `(${node.inquiry_count} inquiries, ${node.position_count} positions)`
            );
          } else if (isVerbose) {
            console.log(
              `  = ${node.name} (${node.id}): ` +
              `${oldCredibility?.toFixed(3)} (no significant change)`
            );
          }
        } catch (error) {
          errors++;
          console.error(`  ✗ ${node.name} (${node.id}): ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show progress
      const progress = Math.min(i + batchSize, nodes.length);
      const percentage = ((progress / nodes.length) * 100).toFixed(1);
      console.log(`\nProgress: ${progress}/${nodes.length} nodes (${percentage}%)`);
    }

    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total nodes: ${totalNodes}`);
    console.log(`Nodes with inquiries: ${nodesWithInquiries}`);
    console.log(`Nodes updated: ${nodesUpdated}`);
    console.log(`Nodes unchanged: ${nodesWithInquiries - nodesUpdated}`);
    console.log(`Errors: ${errors}`);
    console.log('');

    if (isDryRun) {
      console.log('⚠️  DRY RUN MODE: No changes were saved to the database');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('✓ All changes committed to database');
    }

    // Show top 10 biggest changes
    if (updates.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('TOP 10 BIGGEST CHANGES');
      console.log('='.repeat(80));

      const sortedUpdates = updates
        .filter(u => u.oldCredibility !== null)
        .sort((a, b) => {
          const aDiff = Math.abs(a.newCredibility - (a.oldCredibility ?? 0));
          const bDiff = Math.abs(b.newCredibility - (b.oldCredibility ?? 0));
          return bDiff - aDiff;
        })
        .slice(0, 10);

      sortedUpdates.forEach((update, index) => {
        const diff = update.newCredibility - (update.oldCredibility ?? 0);
        const changeSymbol = diff > 0 ? '↑' : '↓';
        console.log(
          `${index + 1}. ${update.nodeName}: ` +
          `${update.oldCredibility?.toFixed(3)} → ${update.newCredibility.toFixed(3)} ` +
          `(${changeSymbol}${Math.abs(diff).toFixed(3)})`
        );
      });
    }

    // Export detailed report to JSON
    if (!isDryRun && updates.length > 0) {
      const reportPath = `./credibility-migration-report-${Date.now()}.json`;
      const fs = require('fs');
      fs.writeFileSync(
        reportPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            summary: {
              totalNodes,
              nodesWithInquiries,
              nodesUpdated,
              errors,
            },
            updates,
          },
          null,
          2
        )
      );
      console.log(`\n✓ Detailed report saved to: ${reportPath}`);
    }

  } catch (error) {
    console.error('\n✗ FATAL ERROR:', error);
    throw error;
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run the migration
recalculateAllNodeCredibility()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
