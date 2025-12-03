/**
 * MethodologyTemplateService
 *
 * Service for loading and applying methodology templates to graphs.
 * Templates provide pre-configured nodes and edges that scaffold
 * user investigations according to specific methodologies.
 */

import { Pool } from 'pg';

interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    nodeType?: string;
    weight?: number;
    level?: number;
    isLocked?: boolean;
    [key: string]: any;
  };
}

interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    label?: string;
    weight?: number;
    level?: number;
    isLocked?: boolean;
    [key: string]: any;
  };
}

interface CanvasState {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export class MethodologyTemplateService {
  constructor(private pool: Pool) { }

  /**
   * Apply a methodology template to a graph
   * Creates initial nodes and edges in the database based on the methodology's workflow initial state
   *
   * @param graphId - Target graph ID
   * @param methodologyId - Methodology template to apply
   * @returns Object containing created node and edge IDs
   */
  async applyTemplate(
    graphId: string,
    methodologyId: string
  ): Promise<{ nodes: string[]; edges: string[] }> {
    // Fetch methodology node
    const methResult = await this.pool.query(
      `SELECT n.* 
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'Methodology'`,
      [methodologyId]
    );

    if (methResult.rows.length === 0) {
      throw new Error(`Methodology not found: ${methodologyId}`);
    }

    const methodologyNode = methResult.rows[0];
    const methProps = typeof methodologyNode.props === 'string' ? JSON.parse(methodologyNode.props) : methodologyNode.props;

    // Check if workflow and initial_canvas_state exist
    if (!methProps.workflow || !methProps.workflow.initial_canvas_state) {
      // No template to apply
      return { nodes: [], edges: [] };
    }

    let canvasState: CanvasState;
    try {
      canvasState = typeof methProps.workflow.initial_canvas_state === 'string'
        ? JSON.parse(methProps.workflow.initial_canvas_state)
        : methProps.workflow.initial_canvas_state;
    } catch (e) {
      console.error('Failed to parse initial_canvas_state:', e);
      return { nodes: [], edges: [] };
    }

    if (!canvasState.nodes || !Array.isArray(canvasState.nodes)) {
      return { nodes: [], edges: [] };
    }

    // Check if graph exists
    const graphCheck = await this.pool.query(
      'SELECT id FROM public."Nodes" WHERE id = $1',
      [graphId]
    );

    if (graphCheck.rows.length === 0) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const client = await this.pool.connect();
    const createdNodeIds: string[] = [];
    const createdEdgeIds: string[] = [];

    try {
      await client.query('BEGIN');

      // Create a mapping from template node IDs to database node IDs
      const nodeIdMap = new Map<string, string>();

      // Get Node Type ID for 'Claim' or generic node type
      // We should probably use the node type specified in the template data, or default to 'Claim'
      // For now, let's try to find the ID for the type specified in data.nodeType, or default to 'Claim'

      const nodeTypesResult = await client.query('SELECT id, name FROM public."NodeTypes"');
      const nodeTypes = new Map(nodeTypesResult.rows.map((row: any) => [row.name, row.id]));
      const defaultNodeTypeId = nodeTypes.get('Claim') || nodeTypes.get('Note') || nodeTypes.values().next().value;

      // Create nodes
      for (const templateNode of canvasState.nodes) {
        const nodeTypeName = templateNode.data.nodeType || 'Claim';
        const nodeTypeId = nodeTypes.get(nodeTypeName) || defaultNodeTypeId;

        const props = {
          graphId: graphId,
          label: templateNode.data.label,
          description: templateNode.data.description,
          x: templateNode.position.x,
          y: templateNode.position.y,
          weight: templateNode.data.weight,
          level: templateNode.data.level,
          isLocked: templateNode.data.isLocked,
          ...templateNode.data.metadata
        };

        const result = await client.query(
          `INSERT INTO public."Nodes"
           (node_type_id, props, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING id`,
          [
            nodeTypeId,
            JSON.stringify(props)
          ]
        );

        const newNodeId = result.rows[0].id;
        nodeIdMap.set(templateNode.id, newNodeId);
        createdNodeIds.push(newNodeId);
      }

      // Get Edge Type ID
      const edgeTypesResult = await client.query('SELECT id, name FROM public."EdgeTypes"');
      const edgeTypes = new Map(edgeTypesResult.rows.map((row: any) => [row.name, row.id]));
      const defaultEdgeTypeId = edgeTypes.get('Supports') || edgeTypes.values().next().value;

      // Create edges using the mapped node IDs
      if (canvasState.edges && Array.isArray(canvasState.edges)) {
        for (const templateEdge of canvasState.edges) {
          const sourceNodeId = nodeIdMap.get(templateEdge.source);
          const targetNodeId = nodeIdMap.get(templateEdge.target);

          if (!sourceNodeId || !targetNodeId) {
            console.warn(`Skipping edge with invalid reference: ${templateEdge.source} -> ${templateEdge.target}`);
            continue;
          }

          const edgeTypeName = templateEdge.type || 'Supports'; // Default edge type
          // In React Flow, 'type' is often 'default', 'smoothstep', etc. 
          // We might need to look at data.type or just default to a standard edge type.
          // If the template specifies a semantic type in data, use it.
          const semanticType = templateEdge.data?.type || 'Supports';
          const edgeTypeId = edgeTypes.get(semanticType) || defaultEdgeTypeId;

          const props = {
            label: templateEdge.data?.label,
            weight: templateEdge.data?.weight,
            level: templateEdge.data?.level,
            isLocked: templateEdge.data?.isLocked
          };

          const result = await client.query(
            `INSERT INTO public."Edges"
             (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [
              edgeTypeId,
              sourceNodeId,
              targetNodeId,
              JSON.stringify(props)
            ]
          );

          createdEdgeIds.push(result.rows[0].id);
        }
      }

      // Update graph's methodology_id if not already set
      // Graph is a Node, so we update its props
      const graphNodeResult = await client.query(
        'SELECT props FROM public."Nodes" WHERE id = $1',
        [graphId]
      );

      if (graphNodeResult.rows.length > 0) {
        const graphProps = graphNodeResult.rows[0].props;
        const propsObj = typeof graphProps === 'string' ? JSON.parse(graphProps) : graphProps;

        if (!propsObj.methodologyId) {
          propsObj.methodologyId = methodologyId;
          await client.query(
            'UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(propsObj), graphId]
          );
        }
      }

      await client.query('COMMIT');

      console.log(
        `Applied template "${methProps.name}" to graph ${graphId}: ` +
        `${createdNodeIds.length} nodes, ${createdEdgeIds.length} edges`
      );

      return {
        nodes: createdNodeIds,
        edges: createdEdgeIds
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error applying methodology template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a graph already has nodes (to prevent duplicate template application)
   */
  async graphHasNodes(graphId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM public."Nodes" WHERE props->>'graphId' = $1`,
      [graphId]
    );
    return parseInt(result.rows[0].count) > 0;
  }
}

export default MethodologyTemplateService;
