import 'reflect-metadata';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rabbithole'
});

async function seedJFK() {
    const client = await pool.connect();
    try {
        console.log('Starting JFK Seeding...');

        // 1. Create Graph
        console.log('Creating Graph...');
        const graphRes = await client.query(`
      INSERT INTO public."Graphs" (name, description, privacy, level)
      VALUES ($1, $2, 'public', 1)
      RETURNING id
    `, ['JFK Assassination', 'Investigation into the events of November 22, 1963']);
        const graphId = graphRes.rows[0].id;

        // 2. Ensure Node Types
        console.log('Ensuring Node Types...');
        const nodeTypes = ['Person', 'Event', 'Document', 'Theory', 'Evidence', 'Location', 'Organization'];
        const nodeTypeIds: Record<string, string> = {};

        for (const name of nodeTypes) {
            let res = await client.query('SELECT id FROM public."NodeTypes" WHERE name = $1', [name]);
            if (res.rowCount === 0) {
                res = await client.query('INSERT INTO public."NodeTypes" (name) VALUES ($1) RETURNING id', [name]);
            }
            nodeTypeIds[name] = res.rows[0].id;
        }

        // 3. Ensure Edge Types
        console.log('Ensuring Edge Types...');
        const edgeTypes = ['authored_by', 'involved_in', 'supports', 'contradicts', 'located_at', 'part_of', 'employed_by'];
        const edgeTypeIds: Record<string, string> = {};

        for (const name of edgeTypes) {
            let res = await client.query('SELECT id FROM public."EdgeTypes" WHERE name = $1', [name]);
            if (res.rowCount === 0) {
                res = await client.query('INSERT INTO public."EdgeTypes" (name) VALUES ($1) RETURNING id', [name]);
            }
            edgeTypeIds[name] = res.rows[0].id;
        }

        // 4. Create Nodes
        console.log('Creating Nodes...');
        const nodes = [
            { id: 'jfk', title: 'John F. Kennedy', type: 'Person', props: { role: 'President' } },
            { id: 'lho', title: 'Lee Harvey Oswald', type: 'Person', props: { role: 'Accused Assassin' } },
            { id: 'jrub', title: 'Jack Ruby', type: 'Person', props: { role: 'Nightclub Owner' } },
            { id: 'lbj', title: 'Lyndon B. Johnson', type: 'Person', props: { role: 'Vice President' } },
            { id: 'cia', title: 'CIA', type: 'Organization', props: {} },
            { id: 'fbi', title: 'FBI', type: 'Organization', props: {} },
            { id: 'tsbd', title: 'Texas School Book Depository', type: 'Location', props: { city: 'Dallas' } },
            { id: 'dp', title: 'Dealey Plaza', type: 'Location', props: { city: 'Dallas' } },
            { id: 'wr', title: 'Warren Report', type: 'Document', props: { year: 1964 } },
            { id: 'ce399', title: 'Magic Bullet (CE 399)', type: 'Evidence', props: { description: 'Pristine bullet' } },
            { id: 'zapruder', title: 'Zapruder Film', type: 'Evidence', props: { type: 'Video' } },
            { id: 'lnth', title: 'Lone Nut Theory', type: 'Theory', props: { description: 'Oswald acted alone' } },
            { id: 'consp', title: 'Conspiracy Theory', type: 'Theory', props: { description: 'Multiple shooters' } },
            { id: 'assassination', title: 'Assassination of JFK', type: 'Event', props: { date: '1963-11-22' } },
        ];

        const nodeDbIds: Record<string, string> = {};

        for (const n of nodes) {
            const res = await client.query(`
        INSERT INTO public."Nodes" (graph_id, node_type_id, props, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
      `, [graphId, nodeTypeIds[n.type], { ...n.props, title: n.title, name: n.title }]); // adding title to props as well for safety
            nodeDbIds[n.id] = res.rows[0].id;
        }

        // 5. Create Edges
        console.log('Creating Edges...');
        const edges = [
            { src: 'lho', tgt: 'assassination', type: 'involved_in' },
            { src: 'jfk', tgt: 'assassination', type: 'involved_in' },
            { src: 'lho', tgt: 'tsbd', type: 'located_at' },
            { src: 'assassination', tgt: 'dp', type: 'located_at' },
            { src: 'dp', tgt: 'tsbd', type: 'part_of' }, // loosely
            { src: 'jrub', tgt: 'lho', type: 'involved_in' }, // shot him
            { src: 'wr', tgt: 'lnth', type: 'supports' },
            { src: 'ce399', tgt: 'lnth', type: 'supports' },
            { src: 'zapruder', tgt: 'consp', type: 'supports' },
            { src: 'zapruder', tgt: 'lnth', type: 'contradicts' },
            { src: 'wr', tgt: 'consp', type: 'contradicts' },
            { src: 'lho', tgt: 'cia', type: 'involved_in' }, // alleged
            { src: 'cia', tgt: 'consp', type: 'involved_in' },
        ];

        for (const e of edges) {
            await client.query(`
            INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
            VALUES ($1, $2, $3, $4, '{}', NOW(), NOW())
        `, [graphId, edgeTypeIds[e.type], nodeDbIds[e.src], nodeDbIds[e.tgt]]);
        }

        console.log('✅ JFK Seeding Complete!');
        console.log(`Graph ID: ${graphId}`);

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

seedJFK();
