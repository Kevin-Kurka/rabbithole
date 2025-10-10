#!/usr/bin/env ts-node
/**
 * Seed Achievements Script
 *
 * This script populates the Achievements table with predefined achievement definitions.
 * Run with: npm run seed:achievements
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { ACHIEVEMENTS } from '../config/achievements';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rabbithole_db',
});

async function seedAchievements() {
  console.log('🌱 Seeding achievements...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const achievement of ACHIEVEMENTS) {
      const result = await client.query(
        `INSERT INTO public."Achievements" (key, name, description, icon, category, points, criteria)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (key)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           category = EXCLUDED.category,
           points = EXCLUDED.points,
           criteria = EXCLUDED.criteria
         RETURNING (xmax = 0) AS inserted`,
        [
          achievement.key,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.category,
          achievement.points,
          JSON.stringify(achievement.criteria)
        ]
      );

      if (result.rows[0].inserted) {
        insertedCount++;
        console.log(`✅ Inserted: ${achievement.name} (${achievement.key})`);
      } else {
        updatedCount++;
        console.log(`🔄 Updated: ${achievement.name} (${achievement.key})`);
      }
    }

    await client.query('COMMIT');

    console.log('\n📊 Summary:');
    console.log(`   - Inserted: ${insertedCount} achievements`);
    console.log(`   - Updated: ${updatedCount} achievements`);
    console.log(`   - Total: ${ACHIEVEMENTS.length} achievements`);

    // Display achievements by category
    console.log('\n🏆 Achievements by Category:');
    const categories = ['evidence', 'methodology', 'consensus', 'collaboration'];

    for (const category of categories) {
      const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
      const totalPoints = categoryAchievements.reduce((sum, a) => sum + a.points, 0);
      console.log(`\n   ${category.toUpperCase()}: ${categoryAchievements.length} achievements (${totalPoints} points)`);
      categoryAchievements.forEach(a => {
        console.log(`     - ${a.icon} ${a.name} (${a.points} points)`);
      });
    }

    console.log('\n✨ Achievement seeding complete!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding achievements:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seeding function
seedAchievements()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    pool.end();
    process.exit(1);
  });
