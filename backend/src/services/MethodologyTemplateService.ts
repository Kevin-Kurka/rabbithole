/**
 * MethodologyTemplateService
 *
 * Service for loading and applying methodology templates to graphs.
 * Templates provide pre-configured nodes and edges that scaffold
 * user investigations according to specific methodologies.
 */

import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    nodeType: string;
    weight: number;
    level: number;
    isLocked: boolean;
    metadata?: Record<string, any>;
  };
}

interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: {
    label: string;
    weight: number;
    level: number;
    isLocked: boolean;
  };
}

interface MethodologyTemplate {
  methodologyId: string;
  name: string;
  initialNodes: TemplateNode[];
  initialEdges: TemplateEdge[];
}

interface TemplateConfig {
  templates: MethodologyTemplate[];
}

export class MethodologyTemplateService {
  private templates: Map<string, MethodologyTemplate> = new Map();
  private loaded: boolean = false;

  constructor(private pool: Pool) {}

  /**
   * Load templates from JSON configuration file
   */
  async loadTemplates(): Promise<void> {
    if (this.loaded) return;

    try {
      const configPath = join(__dirname, '../config/methodology-templates.json');
      const configData = await readFile(configPath, 'utf-8');
      const config: TemplateConfig = JSON.parse(configData);

      for (const template of config.templates) {
        this.templates.set(template.methodologyId, template);
      }

      this.loaded = true;
      console.log(`Loaded ${this.templates.size} methodology templates`);
    } catch (error) {
      console.error('Failed to load methodology templates:', error);
      throw new Error('Failed to load methodology templates');
    }
  }

  /**
   * Get a template by methodology ID
   */
  async getTemplate(methodologyId: string): Promise<MethodologyTemplate | null> {
    await this.loadTemplates();
    return this.templates.get(methodologyId) || null;
  }

  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<MethodologyTemplate[]> {
    await this.loadTemplates();
    return Array.from(this.templates.values());
  }

  /**
   * Apply a methodology template to a graph
   * Creates initial nodes and edges in the database
   *
   * @param graphId - Target graph ID
   * @param methodologyId - Methodology template to apply
   * @returns Object containing created node and edge IDs
   */
  async applyTemplate(
    graphId: string,
    methodologyId: string
  ): Promise<{ nodes: string[]; edges: string[] }> {
    const template = await this.getTemplate(methodologyId);

    if (!template) {
      throw new Error(`Template not found for methodology: ${methodologyId}`);
    }

    // Check if graph exists
    const graphCheck = await this.pool.query(
      'SELECT id FROM public."Graphs" WHERE id = $1',
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

      // Create nodes
      for (const templateNode of template.initialNodes) {
        const props = {
          graphId: graphId,
          label: templateNode.data.label,
          description: templateNode.data.description,
          nodeType: templateNode.data.nodeType,
          x: templateNode.position.x,
          y: templateNode.position.y,
          weight: templateNode.data.weight,
          level: templateNode.data.level,
          metadata: templateNode.data.metadata || {}
        };

        const result = await client.query(
          `INSERT INTO public."Nodes"
           (props, created_at, updated_at)
           VALUES ($1, NOW(), NOW())
           RETURNING id`,
          [
            JSON.stringify(props)
          ]
        );

        const newNodeId = result.rows[0].id;
        nodeIdMap.set(templateNode.id, newNodeId);
        createdNodeIds.push(newNodeId);
      }

      // Create edges using the mapped node IDs
      for (const templateEdge of template.initialEdges) {
        const sourceNodeId = nodeIdMap.get(templateEdge.source);
        const targetNodeId = nodeIdMap.get(templateEdge.target);

        if (!sourceNodeId || !targetNodeId) {
          throw new Error(
            `Invalid edge reference: ${templateEdge.source} -> ${templateEdge.target}`
          );
        }

        const props = {
          label: templateEdge.data.label
        };

        const result = await client.query(
          `INSERT INTO public."Edges"
           (from_node_id, to_node_id, props, weight, level, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [
            sourceNodeId,
            targetNodeId,
            JSON.stringify(props),
            templateEdge.data.weight,
            templateEdge.data.level
          ]
        );

        createdEdgeIds.push(result.rows[0].id);
      }

      // Update graph's methodology_id if not already set
      await client.query(
        `UPDATE public."Graphs"
         SET methodology_id = $1, updated_at = NOW()
         WHERE id = $2 AND methodology_id IS NULL`,
        [methodologyId, graphId]
      );

      await client.query('COMMIT');

      console.log(
        `Applied template "${template.name}" to graph ${graphId}: ` +
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

  /**
   * Get template metadata without full node/edge data
   */
  async getTemplateMetadata(methodologyId: string): Promise<{
    methodologyId: string;
    name: string;
    nodeCount: number;
    edgeCount: number;
  } | null> {
    const template = await this.getTemplate(methodologyId);

    if (!template) {
      return null;
    }

    return {
      methodologyId: template.methodologyId,
      name: template.name,
      nodeCount: template.initialNodes.length,
      edgeCount: template.initialEdges.length
    };
  }
}

export default MethodologyTemplateService;
