import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

async function populateLevel0() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create a default graph for Level 0
    const graphResult = await pool.query(
      'INSERT INTO public."Graphs" (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      ['Level 0 Graph']
    );
    const level0GraphId = graphResult.rows[0].id;

    // Insert NodeTypes
    const nodeTypes = [
      { id: uuidv4(), name: 'Person', description: 'A human being', props: {}, meta: {} },
      { id: uuidv4(), name: 'Organization', description: 'A group of people with a particular purpose', props: {}, meta: {} },
      { id: uuidv4(), name: 'Event', description: 'Something that happens', props: {}, meta: {} },
      { id: uuidv4(), name: 'Location', description: 'A place', props: {}, meta: {} },
    ];

    for (const nt of nodeTypes) {
      await pool.query(
        'INSERT INTO public."NodeTypes" (id, name, description, props, meta) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, props = EXCLUDED.props, meta = EXCLUDED.meta',
        [nt.id, nt.name, nt.description, nt.props, nt.meta]
      );
    }

    // Insert EdgeTypes
    const edgeTypes = [
      { id: uuidv4(), name: 'WORKS_FOR', props: {}, meta: {} },
      { id: uuidv4(), name: 'LOCATED_AT', props: {}, meta: {} },
    ];

    for (const et of edgeTypes) {
      await pool.query(
        'INSERT INTO public."EdgeTypes" (id, name, props, meta) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO UPDATE SET props = EXCLUDED.props, meta = EXCLUDED.meta',
        [et.id, et.name, et.props, et.meta]
      );
    }

    // Insert some Level 0 Nodes
    const personNodeType = nodeTypes.find(nt => nt.name === 'Person');
    const orgNodeType = nodeTypes.find(nt => nt.name === 'Organization');
    const locationNodeType = nodeTypes.find(nt => nt.name === 'Location');

    const nodes = [
      { id: uuidv4(), graph_id: level0GraphId, node_type_id: personNodeType?.id, props: { name: 'Alice' }, weight: 1.0 },
      { id: uuidv4(), graph_id: level0GraphId, node_type_id: orgNodeType?.id, props: { name: 'Acme Corp' }, weight: 1.0 },
      { id: uuidv4(), graph_id: level0GraphId, node_type_id: locationNodeType?.id, props: { name: 'New York' }, weight: 1.0 },
    ];

    for (const node of nodes) {
      await pool.query(
        'INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, weight) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET graph_id = EXCLUDED.graph_id, node_type_id = EXCLUDED.node_type_id, props = EXCLUDED.props, weight = EXCLUDED.weight',
        [node.id, node.graph_id, node.node_type_id, node.props, node.weight]
      );
    }

    // Insert some Level 0 Edges
    const worksForEdgeType = edgeTypes.find(et => et.name === 'WORKS_FOR');
    const locatedAtEdgeType = edgeTypes.find(et => et.name === 'LOCATED_AT');

    const alice = nodes.find(n => n.props.name === 'Alice');
    const acmeCorp = nodes.find(n => n.props.name === 'Acme Corp');
    const newYork = nodes.find(n => n.props.name === 'New York');

    const edges = [
      { id: uuidv4(), graph_id: level0GraphId, edge_type_id: worksForEdgeType?.id, source_node_id: alice?.id, target_node_id: acmeCorp?.id, props: {}, weight: 1.0 },
      { id: uuidv4(), graph_id: level0GraphId, edge_type_id: locatedAtEdgeType?.id, source_node_id: acmeCorp?.id, target_node_id: newYork?.id, props: {}, weight: 1.0 },
    ];

    for (const edge of edges) {
      await pool.query(
        'INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, weight) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET graph_id = EXCLUDED.graph_id, edge_type_id = EXCLUDED.edge_type_id, source_node_id = EXCLUDED.source_node_id, target_node_id = EXCLUDED.target_node_id, props = EXCLUDED.props, weight = EXCLUDED.weight',
        [edge.id, edge.graph_id, edge.edge_type_id, edge.source_node_id, edge.target_node_id, edge.props, edge.weight]
      );
    }

    console.log('Level 0 data populated successfully.');
  } catch (error) {
    console.error('Error populating Level 0 data:', error);
  } finally {
    await pool.end();
  }
}

populateLevel0();
