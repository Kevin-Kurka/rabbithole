import 'reflect-metadata';
import { Pool } from 'pg';
import { seedMethodologies } from '../seeds/methodologies';

async function runSeeds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rabbithole'
  });

  try {
    console.log('Starting database seeding...\n');
    console.log('DATABASE_URL:', process.env.DATABASE_URL || 'using default localhost connection');
    console.log('');

    await seedMethodologies(pool);

    console.log('\n✓ All seeds completed successfully!');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeeds();
