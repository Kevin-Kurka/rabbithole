import express, { Request, Response } from 'express';
import { Pool } from 'pg';

/**
 * Public REST API for Read-Only Node Access
 *
 * Provides external applications with access to public graph data.
 * No authentication required - all endpoints are read-only.
 *
 * Base URL: /api/v1/public
 *
 * Endpoints:
 * - GET /nodes - List all public nodes (paginated)
 * - GET /nodes/:id - Get a specific node by ID
 * - GET /nodes/:id/edges - Get edges connected to a node
 * - GET /nodes/:id/annotations - Get annotations for a node
 * - GET /nodes/:id/trustworthiness - Get trustworthiness score
 * - GET /search - Search nodes by content
 * - GET /node-types - List all node types
 * - GET /edge-types - List all edge types
 */

export function createPublicAPI(pool: Pool): express.Router {
  const router = express.Router();

  /**
   * GET /nodes
   * List all public nodes (paginated)
   *
   * Query params:
   * - limit: number of results (default 20, max 100)
   * - offset: pagination offset
   * - type: filter by node type (optional)
   * - sort: 'created_at' | 'updated_at' | 'weight' (default 'created_at')
   * - order: 'asc' | 'desc' (default 'desc')
   */
  router.get('/nodes', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;
      const sort = (req.query.sort as string) || 'created_at';
      const order = (req.query.order as string) || 'desc';

      // Validate sort field
      const allowedSorts = ['created_at', 'updated_at', 'weight'];
      if (!allowedSorts.includes(sort)) {
        return res.status(400).json({ error: 'Invalid sort field' });
      }

      // Validate order
      if (order !== 'asc' && order !== 'desc') {
        return res.status(400).json({ error: 'Invalid order. Must be asc or desc' });
      }

      let query = `
        SELECT
          n.id,
          n.props,
          n.weight,
          n.created_at,
          n.updated_at,
          nt.name as node_type
        FROM public."Nodes" n
        LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.visibility = 'public'
      `;

      const params: any[] = [];

      if (type) {
        query += ` AND nt.name = $${params.length + 1}`;
        params.push(type);
      }

      query += ` ORDER BY n.${sort} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM public."Nodes" n WHERE n.visibility = 'public'`;
      const countParams: any[] = [];

      if (type) {
        countQuery += ` AND EXISTS (
          SELECT 1 FROM public."NodeTypes" nt
          WHERE nt.id = n.node_type_id AND nt.name = $1
        )`;
        countParams.push(type);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        data: result.rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error('Error fetching nodes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /nodes/:id
   * Get a specific node by ID
   */
  router.get('/nodes/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
          n.id,
          n.props,
          n.weight,
          n.content_hash,
          n.visibility,
          n.created_at,
          n.updated_at,
          nt.name as node_type,
          nt.description as node_type_description
        FROM public."Nodes" n
        LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.id = $1 AND n.visibility = 'public'`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Node not found or not public' });
      }

      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error fetching node:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /nodes/:id/edges
   * Get edges connected to a node
   */
  router.get('/nodes/:id/edges', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const direction = req.query.direction as string; // 'incoming', 'outgoing', 'both' (default)

      let query = `
        SELECT
          e.id,
          e.source_node_id,
          e.target_node_id,
          e.props,
          e.weight,
          e.created_at,
          et.name as edge_type,
          source_node.props as source_props,
          target_node.props as target_props
        FROM public."Edges" e
        LEFT JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
        LEFT JOIN public."Nodes" source_node ON e.source_node_id = source_node.id
        LEFT JOIN public."Nodes" target_node ON e.target_node_id = target_node.id
        WHERE
      `;

      if (direction === 'incoming') {
        query += ' e.target_node_id = $1';
      } else if (direction === 'outgoing') {
        query += ' e.source_node_id = $1';
      } else {
        query += ' (e.source_node_id = $1 OR e.target_node_id = $1)';
      }

      const result = await pool.query(query, [id]);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching edges:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /nodes/:id/annotations
   * Get annotations for a node
   */
  router.get('/nodes/:id/annotations', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const status = req.query.status as string; // filter by status

      let query = `
        SELECT * FROM public."Annotations"
        WHERE target_node_id = $1
      `;
      const params: any[] = [id];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      query += ` ORDER BY start_offset ASC`;

      const result = await pool.query(query, params);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching annotations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /nodes/:id/trustworthiness
   * Get trustworthiness score for a node
   */
  router.get('/nodes/:id/trustworthiness', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get annotation-based trustworthiness
      const annotationResult = await pool.query(
        `SELECT
          COUNT(*) as total_deceptions,
          COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
          COUNT(*) FILTER (WHERE severity = 'low') as low_severity,
          AVG(confidence) as avg_confidence
         FROM public."Annotations"
         WHERE target_node_id = $1
           AND annotation_type = 'deception'
           AND status IN ('approved', 'pending_review')`,
        [id]
      );

      // Get challenge-based credibility
      const credibilityResult = await pool.query(
        `SELECT weight FROM public."Nodes" WHERE id = $1`,
        [id]
      );

      if (credibilityResult.rows.length === 0) {
        return res.status(404).json({ error: 'Node not found' });
      }

      const annotations = annotationResult.rows[0];
      const nodeWeight = credibilityResult.rows[0].weight || 0.5;

      // Calculate annotation-based score
      let annotationScore = 1.0;
      if (annotations.total_deceptions > 0) {
        const penalty = (
          annotations.high_severity * 3 +
          annotations.medium_severity * 2 +
          annotations.low_severity * 1
        );
        annotationScore = Math.max(0, 1 - (penalty * annotations.avg_confidence / (annotations.total_deceptions * 3)));
      }

      // Combine scores (weighted average: 60% credibility from challenges, 40% from annotations)
      const overallScore = (nodeWeight * 0.6) + (annotationScore * 0.4);

      res.json({
        data: {
          overallScore: Math.round(overallScore * 100) / 100,
          credibilityScore: nodeWeight,
          annotationScore: Math.round(annotationScore * 100) / 100,
          deceptionCount: parseInt(annotations.total_deceptions),
          breakdown: {
            highSeverity: parseInt(annotations.high_severity),
            mediumSeverity: parseInt(annotations.medium_severity),
            lowSeverity: parseInt(annotations.low_severity)
          }
        }
      });
    } catch (error) {
      console.error('Error calculating trustworthiness:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /search
   * Search nodes by content
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const result = await pool.query(
        `SELECT
          n.id,
          n.props,
          n.weight,
          n.created_at,
          nt.name as node_type
        FROM public."Nodes" n
        LEFT JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        WHERE n.visibility = 'public'
          AND (
            n.props::text ILIKE $1
            OR n.meta::text ILIKE $1
          )
        ORDER BY n.weight DESC, n.created_at DESC
        LIMIT $2`,
        [`%${query}%`, limit]
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error searching nodes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /node-types
   * List all node types
   */
  router.get('/node-types', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, props
         FROM public."NodeTypes"
         ORDER BY name ASC`
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching node types:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /edge-types
   * List all edge types
   */
  router.get('/edge-types', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, name, props
         FROM public."EdgeTypes"
         ORDER BY name ASC`
      );

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching edge types:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET / (API info)
   */
  router.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Rabbit Hole Public API',
      version: '1.0.0',
      description: 'Read-only access to public knowledge graph data',
      endpoints: {
        nodes: '/nodes',
        node: '/nodes/:id',
        edges: '/nodes/:id/edges',
        annotations: '/nodes/:id/annotations',
        trustworthiness: '/nodes/:id/trustworthiness',
        search: '/search',
        nodeTypes: '/node-types',
        edgeTypes: '/edge-types'
      },
      documentation: 'https://github.com/yourusername/rabbithole/blob/main/API.md'
    });
  });

  return router;
}
