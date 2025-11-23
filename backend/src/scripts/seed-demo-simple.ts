/**
 * Simple Demo Data Seed Script
 *
 * Creates basic demo data for testing credibility scoring system.
 * Works with simple schema where data is in props field.
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const generateUUID = () => uuidv4();
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

async function seedSimpleData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 Starting simple demo data seeding...\n');

    // Get node and edge types
    const nodeTypesResult = await client.query('SELECT id, name FROM public."NodeTypes"');
    const edgeTypesResult = await client.query('SELECT id, name FROM public."EdgeTypes"');

    const nodeTypes: { [key: string]: string } = {};
    nodeTypesResult.rows.forEach(row => {
      nodeTypes[row.name] = row.id;
    });

    const edgeTypes: { [key: string]: string } = {};
    edgeTypesResult.rows.forEach(row => {
      edgeTypes[row.name] = row.id;
    });

    console.log(`  ✓ Found ${Object.keys(nodeTypes).length} node types`);
    console.log(`  ✓ Found ${Object.keys(edgeTypes).length} edge types\n`);

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    const userNames = ['alice_researcher', 'bob_analyst', 'carol_scientist'];

    for (const username of userNames) {
      const userId = generateUUID();
      await client.query(
        `INSERT INTO public."Users" (id, username, email, display_name, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, username, `${username}@example.com`, username.replace('_', ' '), 'hashed_password']
      );
      users.push({ id: userId, username });
      console.log(`  ✓ Created user: ${username}`);
    }

    // Create graph
    console.log('\n📊 Creating graph...');
    const graphId = generateUUID();
    await client.query(
      `INSERT INTO public."Graphs" (id, name, description, privacy, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [graphId, 'Climate Research', 'Demo graph with credibility scores', 'public', users[0].id]
    );
    console.log('  ✓ Created graph: Climate Research');

    // Create nodes with varying credibility
    console.log('\n📝 Creating nodes with credibility scores...');
    const nodes = [];

    // High credibility facts
    const facts = [
      { title: 'CO2 at 420 ppm', weight: 1.0 },
      { title: 'Global temp +1.1°C', weight: 0.98 },
      { title: 'Sea level rising 3.3mm/year', weight: 0.95 },
    ];

    for (const fact of facts) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, weight, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          nodeId,
          graphId,
          nodeTypes['Fact'],
          JSON.stringify({ title: fact.title, verified: true }),
          fact.weight,
          users[0].id
        ]
      );
      nodes.push({ id: nodeId, title: fact.title, weight: fact.weight });
      console.log(`  ✓ Created fact: ${fact.title} (credibility: ${fact.weight})`);
    }

    // Medium credibility claims
    const claims = [
      { title: 'Extreme weather increasing', weight: 0.75 },
      { title: 'Carbon pricing effective', weight: 0.68 },
    ];

    for (const claim of claims) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, weight, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          nodeId,
          graphId,
          nodeTypes['Claim'],
          JSON.stringify({ title: claim.title, status: 'under_review' }),
          claim.weight,
          users[1].id
        ]
      );
      nodes.push({ id: nodeId, title: claim.title, weight: claim.weight });
      console.log(`  ✓ Created claim: ${claim.title} (credibility: ${claim.weight})`);
    }

    // Create edges
    console.log('\n🔗 Creating edges...');
    if (nodes.length >= 2 && edgeTypes['supports']) {
      const edgeId = generateUUID();
      await client.query(
        `INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, weight, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [edgeId, graphId, edgeTypes['supports'], nodes[0].id, nodes[3].id, 0.85, users[0].id]
      );
      console.log(`  ✓ Connected: ${nodes[0].title} → ${nodes[3].title}`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Simple demo data seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Graphs: 1`);
    console.log(`   - Nodes: ${nodes.length}`);
    console.log(`   - Edges: 1\n`);

    console.log('📈 Credibility Distribution:');
    const highCred = nodes.filter(n => n.weight >= 0.85).length;
    const goodCred = nodes.filter(n => n.weight >= 0.70 && n.weight < 0.85).length;
    const modCred = nodes.filter(n => n.weight >= 0.50 && n.weight < 0.70).length;
    console.log(`   🏆 High (0.85+): ${highCred} nodes`);
    console.log(`   🥈 Good (0.70-0.84): ${goodCred} nodes`);
    console.log(`   🥉 Moderate (0.50-0.69): ${modCred} nodes\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedSimpleData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedSimpleData };
