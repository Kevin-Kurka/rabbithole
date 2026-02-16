import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Fix dotenv path resolution if needed, but standard config usually works if run from root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS_TO_MARK = [
    '001_core_schema.up.sql',
    '002_seed_system_types.up.sql',
    '003_seed_knowledge_base_types.up.sql',
    '006_add_notification_type.up.sql',
    '007_add_curator_types.up.sql',
    '008_add_user_reputation.up.sql'
];

async function main() {
    try {
        console.log('Marking migrations as applied...');
        console.log('DB URL:', process.env.DATABASE_URL); // Verify env loaded

        for (const filename of MIGRATIONS_TO_MARK) {
            const match = filename.match(/^(\d+)_(.+)\.sql$/);
            if (!match) continue;

            const [, version, name] = match;
            const cleanName = name.replace(/_/g, ' ');

            await pool.query(`
        INSERT INTO public."SchemaMigrations" (version, name, checksum, execution_time_ms, success)
        VALUES ($1, $2, 'MANUALLY_MARKED', 0, true)
        ON CONFLICT (version) DO NOTHING
      `, [version, cleanName]);

            console.log(`✓ Marked ${version}: ${cleanName}`);
        }

        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
