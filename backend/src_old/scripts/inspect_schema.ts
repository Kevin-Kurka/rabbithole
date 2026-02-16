import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: 'postgresql://debt_docket:debt_docket_password_123@localhost:22233/debt_docket'
});

async function inspect() {
    const dbs = await pool.query('SELECT datname FROM pg_database');
    console.log('--- DATABASES ---');
    dbs.rows.forEach(row => console.log(row.datname));
    try {
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('--- ALL TABLES ---');
        tables.rows.forEach(row => console.log(row.table_name));

        const nodesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Nodes'
    `);
        console.log('--- Nodes Columns ---');
        nodesColumns.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));


        const inquiryPositionsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'InquiryPositions'
    `);

        console.log('--- InquiryPositions Columns ---');
        inquiryPositionsColumns.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

        const usersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Users'
    `);

        console.log('\n--- Users Columns ---');
        usersColumns.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

        // Check Inquiries too if InquiryPositions doesn't have user info
        const inquiriesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Inquiries'
    `);

        console.log('\n--- Inquiries Columns ---');
        inquiriesColumns.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

    } catch (err) {
        console.error('Error inspecting schema:', err);
    } finally {
        await pool.end();
    }
}

inspect();
