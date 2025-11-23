/**
 * Clear Database Script
 *
 * Removes all data from the database while preserving schema.
 * Respects foreign key constraints by truncating in correct order.
 *
 * Usage: npx ts-node src/scripts/clear-database.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearDatabase() {
  const client = await pool.connect();

  try {
    console.log('🗑️  Starting database cleanup...\n');

    // Order matters - child tables first, then parent tables
    const tablesToClear = [
      // Social features
      'public."ActivityReactions"',
      'public."ActivityPosts"',
      'public."Comments"',
      'public."Inquiries"',
      'public."InquiryVotes"',
      'public."Notifications"',

      // Challenge system
      'public."ChallengeComments"',
      'public."ChallengeEvidence"',
      'public."ChallengeVotes"',
      'public."ChallengeResolutions"',
      'public."Challenges"',

      // Curator system
      'public."CuratorAuditLog"',
      'public."CuratorReviews"',
      'public."CuratorApplicationVotes"',
      'public."CuratorApplications"',
      'public."UserCurators"',
      'public."CuratorPermissions"',

      // Evidence and veracity
      'public."Evidence"',
      'public."VeracityScoreHistory"',
      'public."VeracityScores"',
      'public."SourceCredibility"',
      'public."Sources"',

      // Media processing
      'public."MediaProcessingJobs"',
      'public."VideoScenes"',
      'public."VideoFrames"',
      'public."VideoMetadata"',
      'public."AudioTranscriptions"',
      'public."DocumentProcessingResults"',
      'public."EvidenceFiles"',

      // Methodology system
      'public."UserMethodologyProgress"',
      'public."MethodologyWorkflows"',
      'public."MethodologyEdgeTypes"',
      'public."MethodologyNodeTypes"',
      'public."Methodologies"',

      // Gamification
      'public."UserAchievements"',
      'public."Achievements"',
      'public."UserReputation"',

      // Graph data - most important!
      'public."Edges"',
      'public."Nodes"',
      'public."Graphs"',

      // Collaboration
      'public."Collaborations"',
      'public."GraphVersions"',

      // AI/Chat
      'public."Conversations"',

      // Users
      'public."Users"',
    ];

    console.log('Clearing tables...');
    let clearedCount = 0;
    let skippedCount = 0;

    for (const table of tablesToClear) {
      try {
        // Each truncate in its own transaction to prevent abort cascade
        await client.query(`TRUNCATE ${table} CASCADE`);
        console.log(`  ✓ Cleared ${table}`);
        clearedCount++;
      } catch (error: any) {
        // Table doesn't exist or can't be truncated - skip it
        console.log(`  ⚠ Skipped ${table} (may not exist)`);
        skippedCount++;
      }
    }

    console.log('\n✅ Database cleanup complete!');
    console.log(`   Cleared: ${clearedCount} tables`);
    console.log(`   Skipped: ${skippedCount} tables\n`);

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  clearDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { clearDatabase };
