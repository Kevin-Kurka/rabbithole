import { Pool } from 'pg';
import { GraphVersion, GraphVersionHistory, GraphFork, GraphAncestor } from '../entities/GraphVersion';

export class GraphVersionService {
  constructor(private pool: Pool) {}

  /**
   * Manually create a snapshot of the current graph state
   * @param graphId - The ID of the graph to snapshot
   * @param userId - The ID of the user creating the snapshot
   * @returns The created GraphVersion
   */
  async createSnapshot(graphId: string, userId?: string): Promise<GraphVersion> {
    // Check if graph exists and is Level 1
    const graphCheck = await this.pool.query(
      'SELECT id, name, level FROM public."Graphs" WHERE id = $1',
      [graphId]
    );

    if (!graphCheck.rows[0]) {
      throw new Error(`Graph with ID ${graphId} not found`);
    }

    if (graphCheck.rows[0].level === 0) {
      throw new Error('Cannot create version snapshots for Level 0 (immutable) graphs');
    }

    // Get the next version number
    const versionResult = await this.pool.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM public."GraphVersions" WHERE graph_id = $1',
      [graphId]
    );
    const nextVersion = versionResult.rows[0].next_version;

    // Build comprehensive snapshot
    const snapshotResult = await this.pool.query(
      `
      SELECT jsonb_build_object(
        'graph', jsonb_build_object(
          'id', g.id,
          'name', g.name,
          'description', g.description,
          'level', g.level,
          'methodology', g.methodology,
          'privacy', g.privacy,
          'parent_graph_id', g.parent_graph_id,
          'updated_at', g.updated_at
        ),
        'nodes', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', n.id,
              'node_type_id', n.node_type_id,
              'props', n.props,
              'ai', n.ai,
              'content_hash', n.content_hash,
              'primary_source_id', n.primary_source_id,
              'created_at', n.created_at,
              'updated_at', n.updated_at
            )
          ), '[]'::jsonb)
          FROM public."Nodes" n
          WHERE n.props->>'graphId' = g.id::text
        ),
        'edges', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'edge_type_id', e.edge_type_id,
              'source_node_id', e.source_node_id,
              'target_node_id', e.target_node_id,
              'props', e.props,
              'created_at', e.created_at,
              'updated_at', e.updated_at
            )
          ), '[]'::jsonb)
          FROM public."Edges" e
          WHERE e.props->>'graphId' = g.id::text
        )
      ) as snapshot
      FROM public."Graphs" g
      WHERE g.id = $1
      `,
      [graphId]
    );

    const snapshot = snapshotResult.rows[0].snapshot;

    // Insert the version snapshot
    const insertResult = await this.pool.query(
      `
      INSERT INTO public."GraphVersions" (
        graph_id,
        version_number,
        snapshot_data,
        snapshot_metadata,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        graphId,
        nextVersion,
        snapshot,
        JSON.stringify({
          manual_snapshot: true,
          snapshot_timestamp: new Date().toISOString(),
        }),
        userId || null,
      ]
    );

    return insertResult.rows[0];
  }

  /**
   * Get version history for a graph
   * @param graphId - The ID of the graph
   * @returns Array of GraphVersionHistory entries
   */
  async getVersionHistory(graphId: string): Promise<GraphVersionHistory[]> {
    const result = await this.pool.query(
      'SELECT * FROM get_graph_version_history($1)',
      [graphId]
    );

    return result.rows;
  }

  /**
   * Revert a graph to a specific version
   * @param graphId - The ID of the graph to revert
   * @param versionNumber - The version number to revert to
   * @param userId - The ID of the user performing the revert
   * @returns Success status
   */
  async revertToVersion(
    graphId: string,
    versionNumber: number,
    userId?: string
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if graph is Level 0 (immutable)
      const graphCheck = await client.query(
        'SELECT level FROM public."Graphs" WHERE id = $1',
        [graphId]
      );

      if (!graphCheck.rows[0]) {
        throw new Error(`Graph with ID ${graphId} not found`);
      }

      if (graphCheck.rows[0].level === 0) {
        throw new Error('Cannot revert Level 0 (immutable) graphs');
      }

      // Get the version snapshot
      const versionResult = await client.query(
        'SELECT snapshot_data FROM public."GraphVersions" WHERE graph_id = $1 AND version_number = $2',
        [graphId, versionNumber]
      );

      if (!versionResult.rows[0]) {
        throw new Error(
          `Version ${versionNumber} not found for graph ${graphId}`
        );
      }

      const snapshot = versionResult.rows[0].snapshot_data;

      // Create a backup snapshot before reverting
      await this.createSnapshot(graphId, userId);

      // Delete current nodes and edges (CASCADE will handle related data)
      await client.query('DELETE FROM public."Nodes" WHERE props->>\'graphId\' = $1', [
        graphId,
      ]);
      await client.query('DELETE FROM public."Edges" WHERE props->>\'graphId\' = $1', [
        graphId,
      ]);

      // Restore nodes from snapshot
      const nodes = snapshot.nodes || [];
      for (const node of nodes) {
        await client.query(
          `
          INSERT INTO public."Nodes" (
            id, graph_id, node_type_id, props, ai,
            content_hash, primary_source_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            node.id,
            graphId,
            node.node_type_id,
            node.props,
            node.ai || null,
            node.content_hash,
            node.primary_source_id,
            node.created_at,
            node.updated_at,
          ]
        );
      }

      // Restore edges from snapshot
      const edges = snapshot.edges || [];
      for (const edge of edges) {
        await client.query(
          `
          INSERT INTO public."Edges" (
            id, graph_id, edge_type_id, source_node_id, target_node_id,
            props, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            edge.id,
            graphId,
            edge.edge_type_id,
            edge.source_node_id,
            edge.target_node_id,
            edge.props,
            edge.created_at,
            edge.updated_at,
          ]
        );
      }

      // Update graph metadata
      await client.query(
        `
        UPDATE public."Graphs"
        SET
          name = $1,
          description = $2,
          methodology = $3,
          privacy = $4,
          updated_at = NOW()
        WHERE id = $5
        `,
        [
          snapshot.graph.name,
          snapshot.graph.description,
          snapshot.graph.methodology,
          snapshot.graph.privacy,
          graphId,
        ]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fork a graph (create a copy with parent link)
   * @param graphId - The ID of the graph to fork
   * @param newName - Name for the forked graph
   * @param userId - The ID of the user creating the fork
   * @param forkReason - Optional reason for the fork
   * @returns The newly created forked Graph
   */
  async forkGraph(
    graphId: string,
    newName: string,
    userId?: string,
    forkReason?: string
  ): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get the source graph
      const graphResult = await client.query(
        'SELECT * FROM public."Graphs" WHERE id = $1',
        [graphId]
      );

      if (!graphResult.rows[0]) {
        throw new Error(`Graph with ID ${graphId} not found`);
      }

      const sourceGraph = graphResult.rows[0];

      // Create new graph with parent link
      const newGraphResult = await client.query(
        `
        INSERT INTO public."Graphs" (
          name, description, level, methodology, privacy,
          parent_graph_id, fork_metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          newName,
          sourceGraph.description,
          1, // Forks are always Level 1
          sourceGraph.methodology,
          'private', // Forks start as private
          graphId,
          JSON.stringify({
            forked_from: graphId,
            forked_at: new Date().toISOString(),
            fork_reason: forkReason || 'User-initiated fork',
            original_name: sourceGraph.name,
          }),
          userId || null,
        ]
      );

      const newGraph = newGraphResult.rows[0];

      // Copy all nodes
      const nodesResult = await client.query(
        'SELECT * FROM public."Nodes" WHERE props->>\'graphId\' = $1',
        [graphId]
      );

      const nodeIdMap = new Map<string, string>();

      for (const node of nodesResult.rows) {
        const newNodeResult = await client.query(
          `
          INSERT INTO public."Nodes" (
            graph_id, node_type_id, props, ai, content_hash
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
          `,
          [
            newGraph.id,
            node.node_type_id,
            node.props,
            node.ai || null,
            node.content_hash,
          ]
        );

        nodeIdMap.set(node.id, newNodeResult.rows[0].id);
      }

      // Copy all edges with updated node references
      const edgesResult = await client.query(
        'SELECT * FROM public."Edges" WHERE props->>\'graphId\' = $1',
        [graphId]
      );

      for (const edge of edgesResult.rows) {
        const newSourceId = nodeIdMap.get(edge.source_node_id);
        const newTargetId = nodeIdMap.get(edge.target_node_id);

        if (newSourceId && newTargetId) {
          await client.query(
            `
            INSERT INTO public."Edges" (
              graph_id, edge_type_id, source_node_id, target_node_id, props
            ) VALUES ($1, $2, $3, $4, $5)
            `,
            [
              newGraph.id,
              edge.edge_type_id,
              newSourceId,
              newTargetId,
              edge.props,
            ]
          );
        }
      }

      // Create initial snapshot of the forked graph
      await client.query('COMMIT');

      // Create snapshot outside transaction
      await this.createSnapshot(newGraph.id, userId);

      return newGraph;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all forks of a graph
   * @param graphId - The ID of the parent graph
   * @returns Array of GraphFork entries
   */
  async getGraphForks(graphId: string): Promise<GraphFork[]> {
    const result = await this.pool.query(
      'SELECT * FROM get_graph_forks($1)',
      [graphId]
    );

    return result.rows;
  }

  /**
   * Get the fork ancestry (parent chain) of a graph
   * @param graphId - The ID of the graph
   * @returns Array of GraphAncestor entries
   */
  async getGraphAncestry(graphId: string): Promise<GraphAncestor[]> {
    const result = await this.pool.query(
      'SELECT * FROM get_graph_ancestry($1)',
      [graphId]
    );

    return result.rows;
  }
}
