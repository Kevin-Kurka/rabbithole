import { Pool } from 'pg';
import { EmbeddingService } from './EmbeddingService';

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
  graphId: string; // Extracted from props
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
   * Search articles and nodes with full-text search or semantic search
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

    // If semantic search is enabled and embeddings are available
    if (semanticSearch) {
      const results = await this.hybridSearch(pool, query, options);

      // Separate articles from other nodes for backward compatibility
      const articles = results.filter(r => r.type === 'Article');
      const nodes = results.filter(r => r.type !== 'Article');

      return { articles, nodes };
    }

    // Default: Full-text search on articles (nodes with type 'Article')
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
      graphFilter = `AND (n.props->>'graphId')::uuid = $${params.length}`;
    }

    const sql = `
      SELECT
        n.id,
        n.props->>'title' as title,
        'Article' as type,
        n.props->>'narrative' as narrative,
        ts_rank(
          to_tsvector('english', COALESCE(n.props->>'title', '') || ' ' || COALESCE(n.props->>'narrative', '')),
          plainto_tsquery('english', $1)
        ) as relevance,
        n.props->>'graphId' as "graphId",
        g.name as graph_name
      FROM public."Nodes" n
      JOIN public."Graphs" g ON (n.props->>'graphId')::uuid = g.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'Article'
        AND (
          to_tsvector('english', COALESCE(n.props->>'title', '') || ' ' || COALESCE(n.props->>'narrative', ''))
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
      graphFilter = `AND (n.props->>'graphId')::uuid = $${params.length}`;
    }

    const sql = `
      SELECT
        n.id,
        n.props->>'title' as title,
        nt.name as type,
        NULL as narrative,
        ts_rank(
          to_tsvector('english', COALESCE(n.props->>'title', '') || ' ' || COALESCE(n.props::text, '')),
          plainto_tsquery('english', $1)
        ) as relevance,
        n.props->>'graphId' as "graphId",
        g.name as graph_name
      FROM public."Nodes" n
      JOIN public."Graphs" g ON (n.props->>'graphId')::uuid = g.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name != 'Article'
        AND (
          to_tsvector('english', COALESCE(n.props->>'title', '') || ' ' || COALESCE(n.props::text, ''))
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
      SELECT DISTINCT n.props->>'title' as title
      FROM public."Nodes" n
      WHERE n.props->>'title' ILIKE $1
      ORDER BY n.props->>'title'
      LIMIT $2
    `;

    const result = await pool.query(sql, [`%${query}%`, limit]);
    return result.rows.map(row => row.title);
  }

  /**
   * Semantic search using vector similarity (pgvector)
   * Finds nodes with similar embeddings to the query
   */
  async semanticSearch(
    pool: Pool,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      types = [],
      graphId,
      limit = 20,
      offset = 0,
    } = options;

    // Generate embedding for the search query
    const embeddingService = new EmbeddingService();
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    if (!queryEmbedding) {
      console.warn('Failed to generate embedding for query, falling back to full-text search');
      const results = await this.search(pool, query, { ...options, semanticSearch: false });
      return [...results.articles, ...results.nodes];
    }

    const params: any[] = [JSON.stringify(queryEmbedding), limit, offset];
    let typeFilter = '';
    let graphFilter = '';

    if (types.length > 0) {
      params.push(types);
      typeFilter = `AND nt.name = ANY($${params.length})`;
    }

    if (graphId) {
      params.push(graphId);
      graphFilter = `AND (n.props->>'graphId')::uuid = $${params.length}`;
    }

    // Use cosine distance operator (<=> ) for similarity search
    // Lower distance = more similar
    const sql = `
      SELECT
        n.id,
        n.props->>'title' as title,
        nt.name as type,
        n.props->>'narrative' as narrative,
        1 - (n.ai <=> $1::vector) as relevance,
        n.props->>'graphId' as "graphId",
        g.name as graph_name
      FROM public."Nodes" n
      JOIN public."Graphs" g ON n.props->>'graphId' = g.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE n.ai IS NOT NULL
        ${typeFilter}
        ${graphFilter}
      ORDER BY n.ai <=> $1::vector ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Hybrid search combining full-text and semantic similarity
   * Results are merged and re-ranked
   */
  async hybridSearch(
    pool: Pool,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 20 } = options;

    // Run both searches in parallel
    const [fullTextResults, semanticResults] = await Promise.all([
      this.search(pool, query, { ...options, limit: Math.ceil(limit / 2) }),
      this.semanticSearch(pool, query, { ...options, limit: Math.ceil(limit / 2) })
    ]);

    // Combine results from both searches
    const allResults = [
      ...fullTextResults.articles,
      ...fullTextResults.nodes,
      ...semanticResults
    ];

    // Remove duplicates, keeping highest relevance
    const uniqueResults = new Map<string, SearchResult>();
    for (const result of allResults) {
      const existing = uniqueResults.get(result.id);
      if (!existing || result.relevance > existing.relevance) {
        uniqueResults.set(result.id, result);
      }
    }

    // Convert back to array and sort by relevance
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }
}
