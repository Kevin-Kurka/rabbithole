import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://debt_docket:debt_docket_password_123@localhost:22233/debt_docket'
});

async function run() {
    try {
        console.log('Applying schema update...');
        await pool.query(`ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS "reputation" REAL DEFAULT 0.5 CHECK (reputation >= 0.0 AND reputation <= 1.0);`);
        await pool.query(`UPDATE public."Users" SET "reputation" = 0.5 WHERE "reputation" IS NULL;`);
        console.log('Schema update applied successfully.');
    } catch (err) {
        console.error('Error applying schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
