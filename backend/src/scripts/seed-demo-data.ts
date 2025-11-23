/**
 * Comprehensive Demo Data Seed Script - Graph Database
 *
 * Creates interconnected articles and evidence chains demonstrating:
 * - Credibility scoring system (0.0-1.0 weight scale)
 * - 3-level article hierarchy with evidence chains
 * - Multiple node types (Article, Fact, Claim, Person, Event, Location)
 * - Graph relationships via typed edges
 *
 * Credibility Tiers (displayed as badges in UI):
 * - 🏆 Gold (0.90+): Highly credible, verified sources
 * - 🥈 Silver (0.70-0.89): Credible, good sources
 * - 🥉 Bronze (0.50-0.69): Moderately credible
 * - ⚠️  Yellow (0.30-0.49): Low credibility, disputed
 * - ❌ Red (<0.30): Very low credibility
 *
 * Usage: npm run seed:demo
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper functions
function generateUUID(): string {
  return uuidv4();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function seedDemoData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting demo data seeding for graph database...\n');

    await client.query('BEGIN');

    // ========================================================================
    // STEP 1: GET NODE AND EDGE TYPE IDS
    // ========================================================================

    console.log('📋 Fetching node and edge type IDs...');

    const nodeTypesResult = await client.query('SELECT id, name FROM public."NodeTypes"');
    const nodeTypes: { [key: string]: string } = {};
    nodeTypesResult.rows.forEach(row => {
      nodeTypes[row.name] = row.id;
    });

    const edgeTypesResult = await client.query('SELECT id, name FROM public."EdgeTypes"');
    const edgeTypes: { [key: string]: string } = {};
    edgeTypesResult.rows.forEach(row => {
      edgeTypes[row.name] = row.id;
    });

    console.log(`  ✓ Found ${Object.keys(nodeTypes).length} node types: ${Object.keys(nodeTypes).join(', ')}`);
    console.log(`  ✓ Found ${Object.keys(edgeTypes).length} edge types: ${Object.keys(edgeTypes).join(', ')}`);

    // Debug: Check if Article exists
    if (!nodeTypes['Article']) {
      throw new Error(`Article node type not found! Available types: ${Object.keys(nodeTypes).join(', ')}`);
    }
    if (!edgeTypes['references']) {
      throw new Error(`references edge type not found! Available types: ${Object.keys(edgeTypes).join(', ')}`);
    }

    // ========================================================================
    // STEP 2: CREATE USERS
    // ========================================================================

    console.log('\n👥 Creating users...');

    const users = [];
    const userProfiles = [
      { email: 'alice@example.com', username: 'alice_chen' },
      { email: 'bob@example.com', username: 'bob_martinez' },
      { email: 'carol@example.com', username: 'carol_thompson' },
      { email: 'david@example.com', username: 'david_kim' },
      { email: 'emma@example.com', username: 'emma_walsh' },
      { email: 'frank@example.com', username: 'frank_rodriguez' },
      { email: 'grace@example.com', username: 'grace_okafor' },
      { email: 'henry@example.com', username: 'henry_patel' },
    ];

    const demoPasswordHash = '$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G';

    for (const profile of userProfiles) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Users" (id, email, username, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, profile.email, profile.username, demoPasswordHash]
      );
      users.push({ id, ...profile });
      console.log(`  ✓ Created user: ${profile.username}`);
    }

    // ========================================================================
    // STEP 3: CREATE GRAPHS
    // ========================================================================

    console.log('\n📊 Creating graphs...');

    const factsGraph = generateUUID();
    await client.query(
      `INSERT INTO public."Graphs" (id, name, description, privacy, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [factsGraph, 'Climate Science Facts', 'High-credibility verified facts (0.90+ credibility score)', 'public', users[0].id]
    );
    console.log('  ✓ Created graph: Climate Science Facts (high-credibility facts)');

    const investigationGraph = generateUUID();
    await client.query(
      `INSERT INTO public."Graphs" (id, name, description, privacy, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [investigationGraph, 'Climate Policy Analysis', 'Evidence-based investigation of climate policies and impacts', 'public', users[1].id]
    );
    console.log('  ✓ Created graph: Climate Policy Analysis (mixed credibility scores)');

    // ========================================================================
    // STEP 4: CREATE NODES - 3 LEVEL ARTICLE HIERARCHY
    // ========================================================================

    console.log('\n📝 Creating nodes (3-level article hierarchy with credibility scores)...');

    const nodes = [];

    // Article Hierarchy: Root Investigation Article (Silver tier: 0.88)
    const rootArticleId = generateUUID();
    await client.query(
      `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, author_id, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())`,
      [
        rootArticleId,
        investigationGraph,
        nodeTypes['Article'],
        'Climate Change: A Comprehensive Investigation',
        `# Climate Change: A Comprehensive Investigation

## Executive Summary

This comprehensive investigation examines the evidence for anthropogenic climate change, its observed impacts, and policy responses. Drawing from peer-reviewed research, government reports, and observational data, we trace the chain of evidence from greenhouse gas emissions to global temperature rise and resulting environmental changes.

## Key Findings

1. **Atmospheric CO2 concentrations** have increased from 280 ppm (pre-industrial) to over 420 ppm (2024)
2. **Global mean temperature** has risen approximately 1.1°C since 1850-1900
3. **Sea level rise** has accelerated to 3.3 mm/year in recent decades
4. **Extreme weather events** show attribution to climate change in many cases
5. **Policy interventions** including carbon pricing show measurable but insufficient progress

## Investigation Structure

This investigation is organized into sub-investigations examining:
- Temperature attribution and paleoclimate context
- Cryosphere changes (ice sheets, glaciers, sea ice)
- Extreme weather attribution
- Economic analysis of mitigation policies
- Public health co-benefits

Each sub-investigation contains detailed evidence chains linking observations to verified sources.`,
        JSON.stringify({
          hierarchyLevel: 1,
          articleType: 'investigation',
          methodology: 'Scientific Method',
          status: 'published'
        }),
        JSON.stringify({
          version: 1,
          lastModified: new Date().toISOString(),
          contributors: [users[0].id, users[1].id, users[2].id]
        }),
        0.88,  // Silver tier: well-researched investigation
        users[0].id,
        users[0].id
      ]
    );
    nodes.push({ id: rootArticleId, type: 'Article', title: 'Climate Change Investigation', weight: 0.88, hierarchyLevel: 1 });
    console.log('  ✓ Created root article: Climate Change Investigation (credibility: 0.88)');

    // Article Hierarchy: Sub-Topic Articles (Silver tier: 0.85-0.88)
    const subArticles = [
      {
        title: 'Temperature Records and Attribution Science',
        narrative: `# Temperature Records and Attribution Science

## Overview

This investigation examines the observational temperature record and attribution studies linking warming to greenhouse gas emissions.

## Key Evidence

### Observational Data
- NASA GISS temperature analysis shows 1.1°C warming since pre-industrial
- Berkeley Earth independent analysis confirms trend
- Multiple reanalysis datasets show consistent warming

### Attribution Studies
- IPCC AR6 concludes "unequivocal" that human influence has warmed the climate
- Detection and attribution studies show greenhouse gas fingerprint
- Natural factors alone cannot explain observed warming

### Paleoclimate Context
- Current warming rate (0.18°C/decade) unprecedented in at least 2,000 years
- Proxy records (ice cores, tree rings) provide long-term context
- Medieval Warm Period and Little Ice Age were regional, not global`,
        props: { hierarchyLevel: 2, parentArticle: rootArticleId }
      },
      {
        title: 'Sea Level Rise: Evidence and Projections',
        narrative: `# Sea Level Rise: Evidence and Projections

## Current Observations

Satellite altimetry shows global mean sea level rising at 3.3 mm/year (1993-2023), with recent acceleration.

### Contributing Factors
1. **Thermal expansion** (~40% of rise)
2. **Glacier mass loss** (~21%)
3. **Greenland ice sheet** (~15%)
4. **Antarctic ice sheet** (~12%)

## Attribution

Mass balance studies link ice sheet contribution to warming. Greenland losing ~270 Gt/year, Antarctica ~150 Gt/year.

## Future Projections

IPCC AR6 projects 0.28-1.01m rise by 2100 depending on emissions scenario. Ice sheet dynamics remain key uncertainty.`,
        props: { hierarchyLevel: 2, parentArticle: rootArticleId }
      },
      {
        title: 'Carbon Pricing Mechanisms and Effectiveness',
        narrative: `# Carbon Pricing Mechanisms and Effectiveness

## Policy Overview

Carbon pricing puts a cost on greenhouse gas emissions through:
1. **Carbon taxes** - Direct price per tonne CO2
2. **Emissions trading** (cap-and-trade) - Market-based allowance system

## Case Study: EU ETS

The European Emissions Trading System (EU ETS) is the world's largest carbon market:
- Covers ~40% of EU emissions
- Price reached €100/tonne CO2 in 2023
- Emissions from covered sectors declined 35% since 2005

## Effectiveness Analysis

Studies show:
- Modest emissions reductions (5-15%) where implemented
- Revenue recycling opportunities
- Complementary policies needed for deep decarbonization
- Political challenges in setting adequate prices`,
        props: { hierarchyLevel: 2, parentArticle: rootArticleId }
      }
    ];

    const subArticleNodes = [];
    for (const article of subArticles) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, author_id, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Article'],
          article.title,
          article.narrative,
          JSON.stringify(article.props),
          JSON.stringify({ version: 1, lastModified: new Date().toISOString() }),
          0.88,  // Silver tier: solid research
          users[randomInt(0, 2)].id,
          users[randomInt(0, 2)].id
        ]
      );
      subArticleNodes.push({ id, title: article.title, weight: 0.88, hierarchyLevel: 2 });
      nodes.push({ id, type: 'Article', title: article.title, weight: 0.88, hierarchyLevel: 2 });
      console.log(`  ✓ Created sub-article: ${article.title} (credibility: 0.88)`);
    }

    // Article Hierarchy: Detailed Analysis Articles (Silver tier: 0.85)
    const deepDiveArticles = [
      { parentIdx: 0, title: 'IPCC AR6 Working Group I Findings', narrative: 'Detailed analysis of IPCC AR6 WG1 physical science basis...' },
      { parentIdx: 0, title: 'Paleoclimate Temperature Reconstructions', narrative: 'Ice core and proxy data analysis spanning millennia...' },
      { parentIdx: 1, title: 'Antarctic Ice Sheet Dynamics', narrative: 'Mass balance studies and ice flow velocity measurements...' },
      { parentIdx: 1, title: 'Greenland Surface Melt Analysis', narrative: 'Satellite observations of surface melting trends...' },
      { parentIdx: 2, title: 'European Carbon Market Case Study', narrative: 'In-depth analysis of EU ETS implementation and results...' },
      { parentIdx: 2, title: 'Carbon Tax Effectiveness in Scandinavia', narrative: 'Empirical evidence from Nordic carbon tax policies...' },
    ];

    const deepDiveNodes = [];
    for (const article of deepDiveArticles) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, author_id, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Article'],
          article.title,
          article.narrative,
          JSON.stringify({ hierarchyLevel: 3, parentArticle: subArticleNodes[article.parentIdx].id }),
          JSON.stringify({ version: 1, lastModified: new Date().toISOString() }),
          0.88,
          users[randomInt(0, users.length - 1)].id,
          users[randomInt(0, users.length - 1)].id
        ]
      );
      deepDiveNodes.push({ id, title: article.title, hierarchyLevel: 3, parentIdx: article.parentIdx });
      nodes.push({ id, type: 'Article', title: article.title, hierarchyLevel: 3 });
      console.log(`  ✓ Created detailed analysis article: ${article.title} (credibility: 0.88)`);
    }

    // Supporting Evidence Nodes (Facts, Claims, Persons, Events, Locations)
    console.log('\n📊 Creating evidence nodes...');

    const evidenceNodes = [];

    // Facts (high credibility: 1.0)
    const facts = [
      { title: 'CO2 at 420 ppm', props: { value: 420, unit: 'ppm', year: 2024, source: 'Mauna Loa Observatory' } },
      { title: 'Global temp +1.1°C', props: { value: 1.1, unit: '°C', baseline: '1850-1900', source: 'NASA GISS' } },
      { title: 'Sea level +3.3mm/year', props: { value: 3.3, unit: 'mm/year', period: '1993-2023', source: 'Satellite altimetry' } },
      { title: 'Arctic ice decline 13%/decade', props: { value: 13, unit: '%/decade', source: 'NSIDC' } },
    ];

    for (const fact of facts) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          id,
          factsGraph,
          nodeTypes['Fact'],
          fact.title,
          null,
          JSON.stringify(fact.props),
          JSON.stringify({ verified: true, verifiedDate: '2024-01-15' }),
          1.0,
          users[0].id
        ]
      );
      evidenceNodes.push({ id, type: 'Fact', title: fact.title, weight: 1.0 });
      console.log(`  ✓ Created verified fact: ${fact.title} (credibility: 1.0)`);
    }

    // Claims (varying credibility: 0.75-0.95)
    const claims = [
      { title: 'Human activity causes warming', props: { confidence: 0.99, basis: 'Detection and attribution studies' } },
      { title: 'Extreme weather increasing', props: { confidence: 0.85, basis: 'Event attribution analysis' } },
      { title: 'Carbon pricing reduces emissions', props: { confidence: 0.75, basis: 'Empirical policy studies' } },
    ];

    for (const claim of claims) {
      const id = generateUUID();
      const weight = randomFloat(0.75, 0.95);
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Claim'],
          claim.title,
          null,
          JSON.stringify(claim.props),
          JSON.stringify({ claimType: 'scientific' }),
          weight,
          users[randomInt(0, users.length - 1)].id
        ]
      );
      evidenceNodes.push({ id, type: 'Claim', title: claim.title, weight });
      console.log(`  ✓ Created claim: ${claim.title} (credibility: ${weight.toFixed(2)})`);
    }

    // Persons (scientists, policymakers)
    const persons = [
      { title: 'Dr. Michael Mann', props: { role: 'Climate scientist', affiliation: 'Penn State University' } },
      { title: 'Dr. Katharine Hayhoe', props: { role: 'Climate scientist', affiliation: 'Texas Tech University' } },
      { title: 'Christiana Figueres', props: { role: 'Climate diplomat', affiliation: 'UNFCCC' } },
    ];

    for (const person of persons) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Person'],
          person.title,
          null,
          JSON.stringify(person.props),
          JSON.stringify({}),
          0.80,
          users[0].id
        ]
      );
      evidenceNodes.push({ id, type: 'Person', title: person.title, weight: 0.80 });
      console.log(`  ✓ Created person: ${person.title} (credibility: 0.80)`);
    }

    // Events
    const events = [
      { title: 'IPCC AR6 Release', props: { date: '2021-08-09', significance: 'Major assessment report' } },
      { title: 'Paris Agreement', props: { date: '2015-12-12', significance: 'International climate treaty' } },
    ];

    for (const event of events) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Event'],
          event.title,
          null,
          JSON.stringify(event.props),
          JSON.stringify({}),
          0.85,
          users[0].id
        ]
      );
      evidenceNodes.push({ id, type: 'Event', title: event.title, weight: 0.85 });
      console.log(`  ✓ Created event: ${event.title} (credibility: 0.85)`);
    }

    // Locations
    const locations = [
      { title: 'Mauna Loa Observatory', props: { lat: 19.5362, lon: -155.5763, type: 'Research station' } },
      { title: 'Antarctica', props: { type: 'Continent' } },
    ];

    for (const location of locations) {
      const id = generateUUID();
      await client.query(
        `INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, props, meta, weight, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          id,
          investigationGraph,
          nodeTypes['Location'],
          location.title,
          null,
          JSON.stringify(location.props),
          JSON.stringify({}),
          0.90,
          users[0].id
        ]
      );
      evidenceNodes.push({ id, type: 'Location', title: location.title, weight: 0.90 });
      console.log(`  ✓ Created location: ${location.title} (credibility: 0.90)`);
    }

    // ========================================================================
    // STEP 5: CREATE EDGES - CONNECT EVERYTHING
    // ========================================================================

    console.log('\n🔗 Creating edges (relationships)...');

    const edges = [];

    // Connect article hierarchy (references edges)
    if (edgeTypes['references']) {
      // Root article -> Sub-articles
      for (const subArticle of subArticleNodes) {
        const id = generateUUID();
        await client.query(
          `INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, weight, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            id,
            investigationGraph,
            edgeTypes['references'],
            rootArticleId,
            subArticle.id,
            JSON.stringify({ relationship: 'parent-child', hierarchyLevel: 2 }),
            JSON.stringify({}),
            0.95,
            users[0].id
          ]
        );
        edges.push({ id, type: 'references', from: 'Root', to: subArticle.title, weight: 0.95 });
        console.log(`  ✓ Root article → ${subArticle.title}`);
      }

      // Sub-articles -> Detailed analyses
      for (const deepDive of deepDiveNodes) {
        const parentId = subArticleNodes[deepDive.parentIdx].id;
        const id = generateUUID();
        await client.query(
          `INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, weight, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            id,
            investigationGraph,
            edgeTypes['references'],
            parentId,
            deepDive.id,
            JSON.stringify({ relationship: 'parent-child', hierarchyLevel: 3 }),
            JSON.stringify({}),
            0.90,
            users[0].id
          ]
        );
        edges.push({ id, type: 'references', from: subArticleNodes[deepDive.parentIdx].title, to: deepDive.title, weight: 0.90 });
        console.log(`  ✓ ${subArticleNodes[deepDive.parentIdx].title.substring(0, 30)}... → ${deepDive.title.substring(0, 30)}...`);
      }

      // Articles reference evidence nodes
      for (let i = 0; i < Math.min(subArticleNodes.length, evidenceNodes.length); i++) {
        const articleId = subArticleNodes[i].id;
        const evidenceId = evidenceNodes[i].id;
        const id = generateUUID();
        await client.query(
          `INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, weight, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            id,
            investigationGraph,
            edgeTypes['references'],
            articleId,
            evidenceId,
            JSON.stringify({ citationType: 'evidence' }),
            JSON.stringify({}),
            0.88,
            users[0].id
          ]
        );
        edges.push({ id, type: 'references', from: subArticleNodes[i].title, to: evidenceNodes[i].title, weight: 0.88 });
        console.log(`  ✓ Article → Evidence: ${evidenceNodes[i].title}`);
      }
    }

    // Connect persons to articles (proposed_by)
    if (edgeTypes['proposed_by'] && persons.length > 0) {
      for (let i = 0; i < Math.min(2, evidenceNodes.length); i++) {
        const personNode = evidenceNodes.find(n => n.type === 'Person');
        if (personNode) {
          const claimNode = evidenceNodes.find(n => n.type === 'Claim');
          if (claimNode) {
            const id = generateUUID();
            await client.query(
              `INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, weight, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                id,
                investigationGraph,
                edgeTypes['proposed_by'],
                claimNode.id,
                personNode.id,
                JSON.stringify({ role: 'researcher' }),
                JSON.stringify({}),
                0.85,
                users[0].id
              ]
            );
            console.log(`  ✓ Claim → Person (proposed_by)`);
          }
        }
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================

    await client.query('COMMIT');

    console.log('\n✅ Demo data seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Graphs: 2`);
    console.log(`   - Nodes: ${nodes.length} total`);
    console.log(`     • Articles: ${subArticleNodes.length + deepDiveNodes.length + 1} (1 root, ${subArticleNodes.length} sub-topics, ${deepDiveNodes.length} detailed analyses)`);
    console.log(`     • Evidence: ${evidenceNodes.length} nodes (Facts, Claims, Persons, Events, Locations)`);
    console.log(`   - Edges: ${edges.length} (relationships connecting the knowledge graph)`);
    console.log('\n📈 Credibility Distribution:');
    const highCredibility = nodes.filter((n: any) => n.weight >= 0.85).length;
    const goodCredibility = nodes.filter((n: any) => n.weight >= 0.70 && n.weight < 0.85).length;
    const moderateCredibility = nodes.filter((n: any) => n.weight >= 0.50 && n.weight < 0.70).length;
    console.log(`   🏆 High (0.85+): ${highCredibility} nodes - Gold/Silver tier`);
    console.log(`   🥈 Good (0.70-0.84): ${goodCredibility} nodes - Silver tier`);
    console.log(`   🥉 Moderate (0.50-0.69): ${moderateCredibility} nodes - Bronze tier`);
    console.log('\n🎉 3-level article hierarchy with evidence-based credibility scores!');
    console.log('🌐 Open http://localhost:3001 to explore the credibility-weighted knowledge graph\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error seeding demo data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedDemoData };
