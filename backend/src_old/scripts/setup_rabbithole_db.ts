import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Connection to 'debt_docket' (existing DB) to create new DB
const adminPool = new Pool({
    connectionString: 'postgresql://debt_docket:debt_docket_password_123@localhost:22233/debt_docket'
});

async function setup() {
    try {
        // 1. Create Database
        console.log('Creating rabbithole_db...');
        try {
            await adminPool.query('CREATE DATABASE rabbithole_db');
            console.log('Database rabbithole_db created.');
        } catch (err: any) {
            if (err.code === '42P04') {
                console.log('Database rabbithole_db already exists.');
            } else {
                throw err;
            }
        }
        await adminPool.end();

        // 2. Connect to new DB
        const dbPool = new Pool({
            connectionString: 'postgresql://debt_docket:debt_docket_password_123@localhost:22233/rabbithole_db'
        });

        // 3. Run init.sql
        console.log('Running init.sql...');
        const initSqlPath = path.join(__dirname, '../../../init.sql');
        if (fs.existsSync(initSqlPath)) {
            const initSql = fs.readFileSync(initSqlPath, 'utf-8');
            await dbPool.query(initSql);
            console.log('init.sql executed.');
        } else {
            console.error('init.sql not found at', initSqlPath);
            process.exit(1);
        }

        // 4. Apply Reputation Migration
        console.log('Applying reputation schema...');
        await dbPool.query(`ALTER TABLE public."Users" ADD COLUMN IF NOT EXISTS "reputation" REAL DEFAULT 0.5 CHECK (reputation >= 0.0 AND reputation <= 1.0);`);
        await dbPool.query(`UPDATE public."Users" SET "reputation" = 0.5 WHERE "reputation" IS NULL;`);
        console.log('Reputation schema applied.');

        // 5. Verification
        const tables = await dbPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));

        await dbPool.end();

    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setup();
