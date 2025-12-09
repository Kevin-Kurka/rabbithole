import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runInitSql() {
    try {
        const sqlPath = path.resolve(__dirname, '../../../init.sql');
        console.log(`Reading SQL from ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing init.sql...');
        await pool.query(sql);
        console.log('Successfully executed init.sql');
    } catch (error) {
        console.error('Error executing init.sql:', error);
    } finally {
        await pool.end();
    }
}

runInitSql();
