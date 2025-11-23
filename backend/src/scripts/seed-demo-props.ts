/**
 * Demo Data Seed Script (Props-Only Schema)
 *
 * Seeds comprehensive demo data for credibility scoring system.
 * Works with strict 4-table schema where all data is in props JSONB field.
 *
 * Usage: npx ts-node src/scripts/seed-demo-props.ts
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

async function seedDemoData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 Starting demo data seeding (props-only schema)...\n');

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
    const userProfiles = [
      { username: 'dr_climate', display: 'Dr. Climate Scientist', email: 'climate@example.com' },
      { username: 'analyst_bob', display: 'Bob the Analyst', email: 'bob@example.com' },
      { username: 'researcher_carol', display: 'Carol Researcher', email: 'carol@example.com' },
      { username: 'skeptic_dave', display: 'Dave Skeptic', email: 'dave@example.com' },
    ];

    for (const profile of userProfiles) {
      const userId = generateUUID();
      await client.query(
        `INSERT INTO public."Users" (id, username, email, display_name, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, profile.username, profile.email, profile.display, 'hashed_password']
      );
      users.push({ id: userId, ...profile });
      console.log(`  ✓ Created user: ${profile.username}`);
    }

    // Create graph
    console.log('\n📊 Creating graph...');
    const graphId = generateUUID();
    await client.query(
      `INSERT INTO public."Graphs" (id, name, description, privacy, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [graphId, 'Climate Change Evidence', 'Comprehensive graph analyzing climate change evidence and claims', 'public', users[0].id]
    );
    console.log('  ✓ Created graph: Climate Change Evidence');

    // Create nodes with varying credibility
    console.log('\n📝 Creating nodes with credibility scores...');
    const nodes = [];

    // High credibility facts (0.90-1.00)
    const highCredFacts = [
      { title: 'CO2 levels at 420 ppm (2024)', narrative: 'Atmospheric CO2 concentration measured at Mauna Loa Observatory shows 420 parts per million.', weight: 1.0, verified: true },
      { title: 'Global temperature +1.1°C since 1850', narrative: 'Global surface temperature has increased by 1.1°C compared to pre-industrial levels.', weight: 0.98, verified: true },
      { title: 'Sea level rising 3.3mm/year', narrative: 'Satellite altimetry shows global mean sea level rising at 3.3 millimeters per year since 1993.', weight: 0.95, verified: true },
      { title: 'Arctic ice declining 13% per decade', narrative: 'Sea ice extent in the Arctic has declined at a rate of 13.1% per decade since 1979.', weight: 0.92, verified: true },
    ];

    for (const fact of highCredFacts) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, node_type_id, props)
         VALUES ($1, $2, $3)`,
        [
          nodeId,
          nodeTypes['Fact'] || nodeTypes['Evidence'],
          JSON.stringify({
            graphId,
            title: fact.title,
            narrative: fact.narrative,
            weight: fact.weight,
            verified: fact.verified,
            createdBy: users[0].id,
            authorId: users[0].id,
            hierarchyLevel: 1,
            publishedAt: new Date().toISOString(),
          })
        ]
      );
      nodes.push({ id: nodeId, title: fact.title, weight: fact.weight, type: 'fact' });
      console.log(`  ✓ Created fact: ${fact.title} (credibility: ${fact.weight})`);
    }

    // Good credibility claims (0.70-0.89)
    const goodCredClaims = [
      { title: 'Extreme weather events increasing', narrative: 'Analysis shows a trend toward more frequent extreme weather events globally.', weight: 0.85, status: 'peer_reviewed' },
      { title: 'Ocean acidification accelerating', narrative: 'pH levels in ocean surface waters show increasing acidification trend.', weight: 0.82, status: 'peer_reviewed' },
      { title: 'Carbon pricing reduces emissions', narrative: 'Economic studies suggest carbon pricing mechanisms correlate with emission reductions.', weight: 0.75, status: 'under_review' },
    ];

    for (const claim of goodCredClaims) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, node_type_id, props)
         VALUES ($1, $2, $3)`,
        [
          nodeId,
          nodeTypes['Claim'] || nodeTypes['Theory'],
          JSON.stringify({
            graphId,
            title: claim.title,
            narrative: claim.narrative,
            weight: claim.weight,
            status: claim.status,
            createdBy: users[1].id,
            authorId: users[1].id,
            hierarchyLevel: 2,
            publishedAt: new Date().toISOString(),
          })
        ]
      );
      nodes.push({ id: nodeId, title: claim.title, weight: claim.weight, type: 'claim' });
      console.log(`  ✓ Created claim: ${claim.title} (credibility: ${claim.weight})`);
    }

    // Moderate credibility theories (0.50-0.69)
    const moderateCred = [
      { title: 'Methane from permafrost critical', narrative: 'Hypothesis that methane release from thawing permafrost could significantly accelerate warming.', weight: 0.68, status: 'hypothesis' },
      { title: 'Cloud feedback uncertain', narrative: 'Cloud formation responses to warming remain a key uncertainty in climate models.', weight: 0.55, status: 'debated' },
    ];

    for (const theory of moderateCred) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, node_type_id, props)
         VALUES ($1, $2, $3)`,
        [
          nodeId,
          nodeTypes['Theory'] || nodeTypes['Claim'],
          JSON.stringify({
            graphId,
            title: theory.title,
            narrative: theory.narrative,
            weight: theory.weight,
            status: theory.status,
            createdBy: users[2].id,
            authorId: users[2].id,
            hierarchyLevel: 3,
            publishedAt: new Date().toISOString(),
          })
        ]
      );
      nodes.push({ id: nodeId, title: theory.title, weight: theory.weight, type: 'theory' });
      console.log(`  ✓ Created theory: ${theory.title} (credibility: ${theory.weight})`);
    }

    // Low credibility disputed claims (0.30-0.49)
    const lowCredClaims = [
      { title: 'Solar activity main driver', narrative: 'Claim that solar activity variations are the primary cause of recent warming.', weight: 0.35, status: 'disputed' },
    ];

    for (const disputed of lowCredClaims) {
      const nodeId = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, node_type_id, props)
         VALUES ($1, $2, $3)`,
        [
          nodeId,
          nodeTypes['Claim'] || nodeTypes['Theory'],
          JSON.stringify({
            graphId,
            title: disputed.title,
            narrative: disputed.narrative,
            weight: disputed.weight,
            status: disputed.status,
            createdBy: users[3].id,
            authorId: users[3].id,
            hierarchyLevel: 4,
            publishedAt: new Date().toISOString(),
          })
        ]
      );
      nodes.push({ id: nodeId, title: disputed.title, weight: disputed.weight, type: 'disputed' });
      console.log(`  ✓ Created disputed claim: ${disputed.title} (credibility: ${disputed.weight})`);
    }

    // Create edges with relationships
    console.log('\n🔗 Creating edges...');
    const edges = [];

    if (nodes.length >= 4 && edgeTypes['supports']) {
      // Fact supports claim
      const edgeId1 = generateUUID();
      await client.query(
        `INSERT INTO public."Edges" (id, edge_type_id, source_node_id, target_node_id, props)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          edgeId1,
          edgeTypes['supports'],
          nodes[0].id, // CO2 fact
          nodes[4].id, // Extreme weather claim
          JSON.stringify({
            graphId,
            weight: 0.85,
            relationship: 'empirical_support',
            createdBy: users[0].id,
          })
        ]
      );
      edges.push(edgeId1);
      console.log(`  ✓ Connected: "${nodes[0].title}" supports "${nodes[4].title}"`);
    }

    if (nodes.length >= 6 && edgeTypes['contradicts']) {
      // Fact contradicts disputed claim
      const edgeId2 = generateUUID();
      await client.query(
        `INSERT INTO public."Edges" (id, edge_type_id, source_node_id, target_node_id, props)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          edgeId2,
          edgeTypes['contradicts'] || edgeTypes['supports'],
          nodes[1].id, // Temperature fact
          nodes[9].id, // Solar activity claim
          JSON.stringify({
            graphId,
            weight: 0.90,
            relationship: 'refutation',
            createdBy: users[0].id,
          })
        ]
      );
      edges.push(edgeId2);
      console.log(`  ✓ Connected: "${nodes[1].title}" contradicts "${nodes[9].title}"`);
    }

    if (nodes.length >= 3 && edgeTypes['references']) {
      // Theory references fact
      const edgeId3 = generateUUID();
      await client.query(
        `INSERT INTO public."Edges" (id, edge_type_id, source_node_id, target_node_id, props)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          edgeId3,
          edgeTypes['references'],
          nodes[7].id, // Permafrost theory
          nodes[2].id, // Sea level fact
          JSON.stringify({
            graphId,
            weight: 0.70,
            relationship: 'cites_evidence',
            createdBy: users[2].id,
          })
        ]
      );
      edges.push(edgeId3);
      console.log(`  ✓ Connected: "${nodes[7].title}" references "${nodes[2].title}"`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Demo data seeding complete!\\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Graphs: 1`);
    console.log(`   - Nodes: ${nodes.length}`);
    console.log(`   - Edges: ${edges.length}\\n`);

    console.log('📈 Credibility Distribution:');
    const gold = nodes.filter(n => n.weight >= 0.90).length;
    const silver = nodes.filter(n => n.weight >= 0.70 && n.weight < 0.90).length;
    const bronze = nodes.filter(n => n.weight >= 0.50 && n.weight < 0.70).length;
    const yellow = nodes.filter(n => n.weight >= 0.30 && n.weight < 0.50).length;
    const red = nodes.filter(n => n.weight < 0.30).length;
    console.log(`   🥇 Gold (0.90+): ${gold} nodes`);
    console.log(`   🥈 Silver (0.70-0.89): ${silver} nodes`);
    console.log(`   🥉 Bronze (0.50-0.69): ${bronze} nodes`);
    console.log(`   🟡 Yellow (0.30-0.49): ${yellow} nodes`);
    console.log(`   🔴 Red (<0.30): ${red} nodes\\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\\n❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedDemoData };
