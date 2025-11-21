import { Pool } from 'pg';

/**
 * SearchService - Hybrid search with full-text and semantic similarity
 * Supports searching articles and nodes with filtering
 */

export interface SearchResult {
  veracityScore?: { veracityScore: number; evidenceCount?: number; challengeCount?: number; };
  id: string;
  title: string;
  type: string; // article, fact, claim, person, etc.
  narrative?: string;
  relevance: number; // 0-1 score
  graph_id: string;
  graph_name?: string;
}

export interface SearchOptions {
  types?: string[]; // Filter by node types
  graphId?: string; // Filter by specific graph
  limit?: number;
  offset?: number;
  semanticSearch?: boolean; // Use vector similarity
}

export class SearchService {
  /**
   * Search articles and nodes with full-text search
   */
  async search(
    pool: Pool,
    query: string,
    options: SearchOptions = {}
  ): Promise<{ articles: SearchResult[]; nodes: SearchResult[] }> {
    const {
      types = [],
      graphId,
      limit = 20,
      offset = 0,
      semanticSearch = false,
    } = options;

    // Full-text search on articles (nodes with type 'Article')
    const articles = await this.searchArticles(pool, query, {
      graphId,
      limit: Math.ceil(limit / 2),
      offset,
    });

    // Full-text search on all other nodes
    const nodes = await this.searchNodes(pool, query, {
      types: types.filter(t => t.toLowerCase() !== 'article'),
      graphId,
      limit: Math.ceil(limit / 2),
      offset,
    });

    return { articles, nodes };
  }

  /**
   * Search articles specifically
   */
  private async searchArticles(
    pool: Pool,
    query: string,
    options: { graphId?: string; limit: number; offset: number }
  ): Promise<SearchResult[]> {
    const { graphId, limit, offset } = options;

    const params: any[] = [query, limit, offset];
    let graphFilter = '';

    if (graphId) {
      params.push(graphId);
      graphFilter = `AND n.graph_id = $${params.length}`;
    }

    const sql = `
      SELECT
        n.id,
        n.title,
        'Article' as type,
        n.narrative,
        ts_rank(
          to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.narrative, '')),
          plainto_tsquery('english', $1)
        ) as relevance,
        n.graph_id,
        g.name as graph_name
      FROM public."Nodes" n
      JOIN public."Graphs" g ON n.graph_id = g.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'Article'
        AND (
          to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.narrative, ''))
          @@ plainto_tsquery('english', $1)
        )
        ${graphFilter}
      ORDER BY relevance DESC, n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Search nodes (non-articles)
   */
  private async searchNodes(
    pool: Pool,
    query: string,
    options: { types?: string[]; graphId?: string; limit: number; offset: number }
  ): Promise<SearchResult[]> {
    const { types = [], graphId, limit, offset } = options;

    const params: any[] = [query, limit, offset];
    let typeFilter = '';
    let graphFilter = '';

    if (types.length > 0) {
      params.push(types);
      typeFilter = `AND nt.name = ANY($${params.length})`;
    }

    if (graphId) {
      params.push(graphId);
      graphFilter = `AND n.graph_id = $${params.length}`;
    }

    const sql = `
      SELECT
        n.id,
        n.title,
        nt.name as type,
        NULL as narrative,
        ts_rank(
          to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.props::text, '')),
          plainto_tsquery('english', $1)
        ) as relevance,
        n.graph_id,
        g.name as graph_name
      FROM public."Nodes" n
      JOIN public."Graphs" g ON n.graph_id = g.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name != 'Article'
        AND (
          to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.props::text, ''))
          @@ plainto_tsquery('english', $1)
        )
        ${typeFilter}
        ${graphFilter}
      ORDER BY relevance DESC, n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(
    pool: Pool,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const sql = `
      SELECT DISTINCT n.title
      FROM public."Nodes" n
      WHERE n.title ILIKE $1
      ORDER BY n.title
      LIMIT $2
    `;

    const result = await pool.query(sql, [`%${query}%`, limit]);
    return result.rows.map(row => row.title);
  }
}
