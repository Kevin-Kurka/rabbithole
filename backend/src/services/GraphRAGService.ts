/**
 * GraphRAGService - AI-Powered Graph Intelligence Service
 * 
 * This service implements the GraphRAG (Graph Retrieval-Augmented Generation) architecture
 * for the "Connect the Dots" AI assistant as specified in PRD Section 4.2.
 * 
 * The service combines vector similarity search with recursive graph traversal to provide
 * contextually aware, intelligent insights about complex relationships within the knowledge graph.
 * 
 * @module services/GraphRAGService
 * @see PRD Section 3.4 - The AI Discovery Engine ("Connect the Dots")
 * @see PRD Section 4.2 - AI Assistant Architecture (GraphRAG)
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the GraphRAG service
 * Controls various aspects of vector search, graph traversal, and caching
 */
export interface GraphRAGConfig {
  /** Vector search configuration */
  vectorSearch: {
    /** Maximum number of anchor nodes from vector search */
    limit: number;
    /** Minimum cosine similarity threshold (0.0 - 1.0) */
    similarityThreshold: number;
    /** HNSW ef parameter for search quality vs speed tradeoff */
    efSearch: number;
    /** Whether to search only Level 0 (verified facts) */
    level0Only?: boolean;
  };
  
  /** Graph traversal configuration */
  graphTraversal: {
    /** Maximum degrees of separation to explore */
    maxDepth: number;
    /** Maximum number of nodes in result set */
    maxNodes: number;
    /** Minimum edge veracity score to traverse (0.0 - 1.0) */
    minVeracity: number;
    /** Traversal algorithm: 'breadth_first' | 'depth_first' | 'weighted' */
    traversalMode: 'breadth_first' | 'depth_first' | 'weighted';
  };
  
  /** LLM prompt generation configuration */
  promptGeneration: {
    /** Maximum tokens for context (8000 default for GPT-4) */
    maxTokens: number;
    /** Include node/edge properties in prompt */
    includeProperties: boolean;
    /** Summarize long property values */
    summarizeLongValues: boolean;
    /** Citation format: 'inline' | 'footnote' | 'none' */
    citationFormat: 'inline' | 'footnote' | 'none';
  };
  
  /** Cache configuration */
  caching: {
    /** TTL for L1 memory cache in seconds */
    l1TtlSeconds: number;
    /** TTL for L2 Redis cache in seconds */
    l2TtlSeconds: number;
    /** Whether to enable query result caching */
    enableQueryCache: boolean;
  };
}

/**
 * Input for a GraphRAG query
 * Represents the user's question and context
 */
export interface GraphRAGQuery {
  /** Natural language query from the user */
  query: string;
  /** Optional: IDs of user-selected nodes for context */
  selectedNodeIds?: string[];
  /** Optional: User's current graph ID for Level 1 exploration */
  userGraphId?: string;
  /** Optional: Override default configuration */
  config?: Partial<GraphRAGConfig>;
}

/**
 * A node in the knowledge graph
 * Represents an entity with properties and metadata
 */
export interface GraphNode {
  /** Unique identifier */
  id: string;
  /** Node type identifier */
  nodeTypeId: string;
  /** Node type name (e.g., 'Person', 'Organization') */
  typeName: string;
  /** JSON properties specific to this node */
  props: Record<string, any>;
  /** Metadata (creation time, sources, etc.) */
  meta: Record<string, any>;
  /** Veracity score (0.0 - 1.0), 1.0 = Level 0 */
  veracityScore: number;
  /** Relevance score from vector search (0.0 - 1.0) */
  relevanceScore?: number;
  /** Graph distance from anchor nodes */
  graphDistance?: number;
  /** 1536-dimensional embedding vector */
  embedding?: number[];
}

/**
 * An edge in the knowledge graph
 * Represents a relationship between two nodes
 */
export interface GraphEdge {
  /** Unique identifier */
  id: string;
  /** Edge type identifier */
  edgeTypeId: string;
  /** Edge type name (e.g., 'WORKS_FOR', 'FUNDED_BY') */
  typeName: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** JSON properties specific to this edge */
  props: Record<string, any>;
  /** Metadata */
  meta: Record<string, any>;
  /** Veracity score (0.0 - 1.0) */
  veracityScore: number;
}

/**
 * A subgraph containing nodes and edges
 * Represents a connected component of the knowledge graph
 */
export interface Subgraph {
  /** Nodes in the subgraph */
  nodes: GraphNode[];
  /** Edges connecting the nodes */
  edges: GraphEdge[];
  /** Anchor nodes that initiated the search */
  anchorNodeIds: string[];
  /** Query that generated this subgraph */
  query?: string;
}

/**
 * Augmented prompt for LLM
 * Contains the original query plus structured context
 */
export interface AugmentedPrompt {
  /** System prompt defining the assistant's role */
  systemPrompt: string;
  /** User's original query */
  userQuery: string;
  /** Serialized graph context */
  graphContext: string;
  /** Selected node context if applicable */
  selectedContext?: string;
  /** Total token count estimate */
  tokenCount: number;
  /** Node/Edge IDs included for citation */
  citationMap: Map<string, string>;
}

/**
 * Final response from the GraphRAG system
 * Contains the LLM response with citations and metadata
 */
export interface GraphRAGResponse {
  /** Natural language response from LLM */
  response: string;
  /** Subgraph used for context */
  subgraph: Subgraph;
  /** Citations mapping to specific nodes/edges */
  citations: Array<{
    id: string;
    type: 'node' | 'edge';
    text: string;
  }>;
  /** Performance metrics */
  metrics: {
    vectorSearchTimeMs: number;
    graphTraversalTimeMs: number;
    promptGenerationTimeMs: number;
    llmResponseTimeMs: number;
    totalTimeMs: number;
  };
  /** Suggested next exploration steps */
  suggestions?: string[];
}

/**
 * Cache entry for query results
 */
interface QueryCacheEntry {
  key: string;
  query: GraphRAGQuery;
  subgraph: Subgraph;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// Main Service Class
// ============================================================================

/**
 * GraphRAGService - Implements the 4-step GraphRAG process
 * 
 * Step 1: Anchor Node Identification (Vector Similarity Search)
 * Step 2: Graph Traversal (Contextual Expansion)
 * Step 3: Prompt Augmentation (Context Serialization)
 * Step 4: Response Generation (LLM Invocation)
 * 
 * @class GraphRAGService
 * @extends EventEmitter
 */
export class GraphRAGService extends EventEmitter {
  private pool: Pool;
  private redis: Redis;
  private config: GraphRAGConfig;
  private l1Cache: Map<string, QueryCacheEntry>;
  private embeddingService: any; // TODO: Type this properly when implementing
  private llmService: any; // TODO: Type this properly when implementing

  /**
   * Initialize the GraphRAG service
   * 
   * @param pool - PostgreSQL connection pool
   * @param redis - Redis client for L2 caching
   * @param config - Service configuration
   */
  constructor(pool: Pool, redis: Redis, config: GraphRAGConfig) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.config = config;
    this.l1Cache = new Map();
    
    // Initialize cleanup interval for L1 cache
    this.startCacheCleanup();
  }

  // ============================================================================
  // Step 1: Anchor Node Identification (Vector Similarity Search)
  // ============================================================================

  /**
   * Find semantically similar nodes using vector similarity search
   * 
   * Executes a KNN search using pgvector's HNSW index to find nodes
   * whose embeddings are similar to the query embedding.
   * 
   * @param queryEmbedding - 1536-dimensional query vector
   * @param limit - Maximum number of results
   * @param similarityThreshold - Minimum similarity score
   * @param level0Only - Whether to search only verified facts
   * @returns Array of semantically similar nodes
   * 
   * @see backend/src/queries/graphrag-queries.sql - Vector similarity search query
   * @see PRD Section 4.2 - "Anchor Node Identification"
   */
  async findAnchorNodes(
    queryEmbedding: number[],
    limit: number = 10,
    similarityThreshold: number = 0.7,
    level0Only: boolean = false
  ): Promise<GraphNode[]> {
    const startTime = Date.now();
    const level0Filter = level0Only ? 'AND n.is_level_0 = true' : '';

    const vectorString = `[${queryEmbedding.join(',')}]`;

    const query = `
      SELECT
        n.id,
        n.node_type_id,
        nt.name as type_name,
        n.props,
        n.meta,
        n.weight as veracity_score,
        1 - (n.ai <=> $1::vector) as relevance_score
      FROM public."Nodes" n
      LEFT JOIN public."NodeTypes" nt ON nt.id = n.node_type_id
      WHERE n.ai IS NOT NULL
        ${level0Filter}
        AND (1 - (n.ai <=> $1::vector)) >= $2
      ORDER BY n.ai <=> $1::vector
      LIMIT $3
    `;

    const result = await this.pool.query(query, [
      vectorString,
      similarityThreshold,
      limit
    ]);

    const nodes: GraphNode[] = result.rows.map(row => ({
      id: row.id,
      nodeTypeId: row.node_type_id,
      typeName: row.type_name || 'Unknown',
      props: row.props || {},
      meta: row.meta || {},
      veracityScore: row.veracity_score || 0,
      relevanceScore: row.relevance_score || 0,
    }));

    const duration = Date.now() - startTime;
    this.emit('anchorNodesFound', { count: nodes.length, duration });

    return nodes;
  }

  // ============================================================================
  // Step 2: Graph Traversal (Contextual Expansion)
  // ============================================================================

  /**
   * Traverse the graph from anchor nodes to gather context
   * 
   * Uses recursive CTEs to explore relationships up to N degrees of separation,
   * building a subgraph of relevant nodes and edges.
   * 
   * @param anchorNodeIds - Starting nodes for traversal
   * @param maxDepth - Maximum degrees of separation
   * @param minVeracity - Minimum edge weight to traverse
   * @param maxNodes - Maximum nodes to return
   * @returns Subgraph containing nodes and edges
   * 
   * @see backend/src/queries/graphrag-queries.sql - Recursive graph traversal query
   * @see PRD Section 4.2 - "Contextual Expansion via Graph Traversal"
   */
  async traverseGraph(
    anchorNodeIds: string[],
    maxDepth: number = 3,
    minVeracity: number = 0.5,
    maxNodes: number = 500
  ): Promise<Subgraph> {
    const startTime = Date.now();

    // Recursive CTE to traverse graph
    const nodesQuery = `
      WITH RECURSIVE graph_traversal AS (
        -- Base case: anchor nodes
        SELECT
          n.id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          0 as depth,
          ARRAY[n.id] as path
        FROM public."Nodes" n
        WHERE n.id = ANY($1)

        UNION

        -- Recursive case: follow edges
        SELECT
          n.id,
          n.node_type_id,
          n.props,
          n.meta,
          n.weight,
          gt.depth + 1,
          gt.path || n.id
        FROM public."Nodes" n
        INNER JOIN public."Edges" e
          ON (e.target_node_id = n.id OR e.source_node_id = n.id)
        INNER JOIN graph_traversal gt
          ON (e.source_node_id = gt.id OR e.target_node_id = gt.id)
        WHERE gt.depth < $2
          AND e.weight >= $3
          AND NOT (n.id = ANY(gt.path)) -- Prevent cycles
      )
      SELECT DISTINCT
        gt.id,
        gt.node_type_id,
        nt.name as type_name,
        gt.props,
        gt.meta,
        gt.weight,
        gt.depth
      FROM graph_traversal gt
      LEFT JOIN public."NodeTypes" nt ON nt.id = gt.node_type_id
      ORDER BY gt.depth, gt.weight DESC
      LIMIT $4
    `;

    const nodesResult = await this.pool.query(nodesQuery, [
      anchorNodeIds,
      maxDepth,
      minVeracity,
      maxNodes
    ]);

    const nodes: GraphNode[] = nodesResult.rows.map(row => ({
      id: row.id,
      nodeTypeId: row.node_type_id,
      typeName: row.type_name || 'Unknown',
      props: row.props || {},
      meta: row.meta || {},
      veracityScore: row.weight || 0,
      graphDistance: row.depth || 0,
    }));

    // Fetch edges connecting these nodes
    const nodeIds = nodes.map(n => n.id);
    const edgesQuery = `
      SELECT
        e.id,
        e.edge_type_id,
        et.name as type_name,
        e.source_node_id,
        e.target_node_id,
        e.props,
        e.meta,
        e.weight
      FROM public."Edges" e
      LEFT JOIN public."EdgeTypes" et ON et.id = e.edge_type_id
      WHERE e.source_node_id = ANY($1)
        AND e.target_node_id = ANY($1)
        AND e.weight >= $2
    `;

    const edgesResult = await this.pool.query(edgesQuery, [nodeIds, minVeracity]);

    const edges: GraphEdge[] = edgesResult.rows.map(row => ({
      id: row.id,
      edgeTypeId: row.edge_type_id,
      typeName: row.type_name || 'Related',
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      props: row.props || {},
      meta: row.meta || {},
      veracityScore: row.weight || 0,
    }));

    const duration = Date.now() - startTime;
    this.emit('graphTraversalComplete', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      duration
    });

    return {
      nodes,
      edges,
      anchorNodeIds,
    };
  }

  // ============================================================================
  // Step 3: Prompt Augmentation (Context Serialization)
  // ============================================================================

  /**
   * Transform a subgraph into an augmented prompt for the LLM
   * 
   * Serializes the graph structure into a text format that provides
   * context while managing token budget constraints.
   * 
   * @param query - Original user query
   * @param subgraph - Subgraph to serialize
   * @param selectedNodes - Optional user-selected nodes for additional context
   * @returns Augmented prompt ready for LLM
   * 
   * @see PRD Section 4.2 - "Prompt Augmentation"
   */
  async generateAugmentedPrompt(
    query: string,
    subgraph: Subgraph,
    selectedNodes?: GraphNode[]
  ): Promise<AugmentedPrompt> {
    const citationMap = new Map<string, string>();
    const contextParts: string[] = [];

    // Add selected nodes context first (highest priority)
    if (selectedNodes && selectedNodes.length > 0) {
      contextParts.push('=== SELECTED CONTEXT ===\n');
      selectedNodes.forEach((node, idx) => {
        const citation = `[Selected-${idx + 1}]`;
        citationMap.set(node.id, citation);

        const label = node.props.label || node.props.name || node.props.title || 'Untitled';
        const description = node.props.description || '';
        const veracity = (node.veracityScore * 100).toFixed(0);
        const level = node.veracityScore === 1.0 ? ' [LEVEL 0 - VERIFIED]' : '';

        contextParts.push(
          `${citation} ${label}${level}\n` +
          `  Type: ${node.typeName}\n` +
          `  Veracity: ${veracity}%\n` +
          `  ${description}\n`
        );
      });
      contextParts.push('\n');
    }

    // Add subgraph nodes
    contextParts.push('=== GRAPH CONTEXT ===\n');
    subgraph.nodes.forEach((node, idx) => {
      // Skip if already cited as selected
      if (citationMap.has(node.id)) return;

      const citation = `[Node-${idx + 1}]`;
      citationMap.set(node.id, citation);

      const label = node.props.label || node.props.name || node.props.title || 'Untitled';
      const description = node.props.description || '';
      const veracity = (node.veracityScore * 100).toFixed(0);
      const level = node.veracityScore === 1.0 ? ' [LEVEL 0 - VERIFIED]' : '';
      const distance = node.graphDistance !== undefined ? ` (distance: ${node.graphDistance})` : '';

      contextParts.push(
        `${citation} ${label}${level}${distance}\n` +
        `  Type: ${node.typeName}\n` +
        `  Veracity: ${veracity}%\n` +
        `  ${description}\n`
      );
    });

    // Add relationships
    if (subgraph.edges.length > 0) {
      contextParts.push('\n=== RELATIONSHIPS ===\n');
      subgraph.edges.forEach(edge => {
        const sourceCitation = citationMap.get(edge.sourceNodeId) || edge.sourceNodeId;
        const targetCitation = citationMap.get(edge.targetNodeId) || edge.targetNodeId;
        const edgeLabel = edge.props.label || edge.typeName;

        contextParts.push(
          `${sourceCitation} --[${edgeLabel}]--> ${targetCitation}\n`
        );
      });
    }

    const graphContext = contextParts.join('\n');

    const systemPrompt = `You are an AI assistant analyzing a knowledge graph to answer questions about complex topics.

**Instructions:**
1. Answer the user's question based ONLY on the provided graph context
2. Always cite your sources using the [Node-X] or [Selected-X] citation format
3. Pay special attention to nodes marked [LEVEL 0 - VERIFIED] as these are verified facts
4. Consider veracity scores when weighing evidence (higher is more reliable)
5. If the graph doesn't contain enough information to answer fully, say so clearly
6. Be precise and factual - do not speculate beyond what the evidence shows

**Context Format:**
- Each node has a citation marker like [Node-1] or [Selected-1]
- Veracity scores range from 0% (unverified) to 100% (verified)
- Relationships show how nodes connect to each other
- Distance indicates degrees of separation from anchor nodes`;

    const tokenCount = Math.ceil(graphContext.length / 4); // Rough estimate

    return {
      systemPrompt,
      userQuery: query,
      graphContext,
      tokenCount,
      citationMap,
    };
  }

  // ============================================================================
  // Step 4: Response Generation (LLM Invocation)
  // ============================================================================

  /**
   * Generate natural language response using LLM
   * 
   * Sends the augmented prompt to the language model and processes
   * the response to add citations and suggestions.
   * 
   * @param augmentedPrompt - Prompt with graph context
   * @returns Natural language response with citations
   * 
   * @see PRD Section 4.2 - "Synthesized Response Generation"
   */
  async generateResponse(
    augmentedPrompt: AugmentedPrompt
  ): Promise<string> {
    const axios = await import('axios');
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    try {
      const response = await axios.default.post(`${ollamaUrl}/api/chat`, {
        model,
        messages: [
          { role: 'system', content: augmentedPrompt.systemPrompt },
          {
            role: 'user',
            content: `${augmentedPrompt.graphContext}\n\n**Question:** ${augmentedPrompt.userQuery}`
          }
        ],
        stream: false,
        options: {
          temperature: this.config.promptGeneration?.temperature || 0.7,
          num_predict: this.config.promptGeneration?.maxTokens || 2000,
        }
      }, {
        timeout: 60000, // 60 second timeout
      });

      return response.data.message.content;
    } catch (error: any) {
      console.error('Ollama LLM generation failed:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running on ' + ollamaUrl);
      }

      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  // ============================================================================
  // Main Query Interface (Combines all 4 steps)
  // ============================================================================

  /**
   * Execute a complete GraphRAG query
   * 
   * This is the main entry point that orchestrates the entire 4-step process:
   * 1. Vector search for anchor nodes
   * 2. Graph traversal from anchors
   * 3. Prompt augmentation with context
   * 4. LLM response generation
   * 
   * @param query - User's GraphRAG query
   * @returns Complete response with citations and metrics
   * 
   * @example
   * ```typescript
   * const response = await graphRAGService.query({
   *   query: "What connections exist between John Doe and TechCorp?",
   *   selectedNodeIds: ["node-123", "node-456"],
   *   userGraphId: "user-graph-789"
   * });
   * ```
   * 
   * @see PRD Section 3.4 - The AI Discovery Engine
   * @see PRD Section 4.2 - Complete GraphRAG flow
   */
  async query(query: GraphRAGQuery): Promise<GraphRAGResponse> {
    const startTime = Date.now();
    const metrics = {
      vectorSearchTimeMs: 0,
      graphTraversalTimeMs: 0,
      promptGenerationTimeMs: 0,
      llmResponseTimeMs: 0,
      totalTimeMs: 0
    };

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Step 1: Embed query and find anchor nodes
      const queryEmbedding = await this.embedText(query.query);
      const anchorStartTime = Date.now();
      const anchorNodes = await this.findAnchorNodes(
        queryEmbedding,
        query.config?.vectorSearch?.limit || this.config.vectorSearch.limit,
        query.config?.vectorSearch?.similarityThreshold || this.config.vectorSearch.similarityThreshold,
        query.config?.vectorSearch?.level0Only || this.config.vectorSearch.level0Only
      );
      metrics.vectorSearchTimeMs = Date.now() - anchorStartTime;

      // Step 2: Traverse graph from anchors
      const traversalStartTime = Date.now();
      const subgraph = await this.traverseGraph(
        anchorNodes.map(n => n.id),
        query.config?.graphTraversal?.maxDepth || this.config.graphTraversal.maxDepth,
        query.config?.graphTraversal?.minVeracity || this.config.graphTraversal.minVeracity,
        query.config?.graphTraversal?.maxNodes || this.config.graphTraversal.maxNodes
      );
      metrics.graphTraversalTimeMs = Date.now() - traversalStartTime;

      // Step 3: Generate augmented prompt
      const promptStartTime = Date.now();
      const augmentedPrompt = await this.generateAugmentedPrompt(
        query.query,
        subgraph,
        query.selectedNodeIds ? await this.getNodesByIds(query.selectedNodeIds) : undefined
      );
      metrics.promptGenerationTimeMs = Date.now() - promptStartTime;

      // Step 4: Generate LLM response
      const llmStartTime = Date.now();
      const response = await this.generateResponse(augmentedPrompt);
      metrics.llmResponseTimeMs = Date.now() - llmStartTime;

      // Build final response
      metrics.totalTimeMs = Date.now() - startTime;
      const result: GraphRAGResponse = {
        response,
        subgraph,
        citations: this.extractCitations(response, augmentedPrompt.citationMap),
        metrics,
        suggestions: await this.generateSuggestions(subgraph, query.query)
      };

      // Cache result
      await this.cacheResult(cacheKey, result);

      // Emit metrics for monitoring
      this.emit('query_complete', metrics);

      return result;
    } catch (error) {
      this.emit('query_error', error);
      throw error;
    }
  }

  // ============================================================================
  // Combined Query (Optimized single-pass implementation)
  // ============================================================================

  /**
   * Execute vector search and graph traversal in a single query
   * 
   * This optimized method combines steps 1 and 2 into a single PostgreSQL
   * query using CTEs, reducing round-trips and improving performance.
   * 
   * @param queryEmbedding - Query vector
   * @param config - Combined query configuration
   * @returns Subgraph with both anchor and traversed nodes
   * 
   * @see backend/src/queries/graphrag-queries.sql - Combined GraphRAG query
   */
  async combinedVectorGraphSearch(
    queryEmbedding: number[],
    config: Partial<GraphRAGConfig>
  ): Promise<Subgraph> {
    // TODO: Implement optimized combined query
    // 1. Execute single PostgreSQL query with CTEs
    // 2. Parse results into nodes and edges
    // 3. Build subgraph with metadata
    // 4. Track anchor nodes separately
    throw new Error('Not implemented');
  }

  // ============================================================================
  // Caching Methods
  // ============================================================================

  /**
   * Generate cache key for a query
   * 
   * Creates a deterministic key based on query parameters for caching.
   * 
   * @param query - GraphRAG query
   * @returns Cache key string
   */
  private generateCacheKey(query: GraphRAGQuery): string {
    // TODO: Implement cache key generation
    // Use hash of query + selected nodes + config
    throw new Error('Not implemented');
  }

  /**
   * Get cached result from L1 or L2 cache
   * 
   * @param key - Cache key
   * @returns Cached response or null
   */
  private async getCachedResult(key: string): Promise<GraphRAGResponse | null> {
    // TODO: Implement cache retrieval
    // 1. Check L1 memory cache
    // 2. Check L2 Redis cache
    // 3. Deserialize and validate
    throw new Error('Not implemented');
  }

  /**
   * Cache query result in L1 and L2
   * 
   * @param key - Cache key
   * @param result - Query result to cache
   */
  private async cacheResult(key: string, result: GraphRAGResponse): Promise<void> {
    // TODO: Implement cache storage
    // 1. Store in L1 with TTL
    // 2. Serialize and store in L2
    // 3. Set expiration times
    throw new Error('Not implemented');
  }

  /**
   * Invalidate cache entries for modified nodes/edges
   * 
   * Called when graph data changes to maintain cache consistency.
   * 
   * @param nodeIds - Modified node IDs
   * @param edgeIds - Modified edge IDs
   */
  async invalidateCache(nodeIds?: string[], edgeIds?: string[]): Promise<void> {
    // TODO: Implement cache invalidation
    // 1. Find affected cache entries
    // 2. Remove from L1 and L2
    // 3. Emit invalidation event
    throw new Error('Not implemented');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Embed text into vector using embedding service
   * 
   * @param text - Text to embed
   * @returns 1536-dimensional embedding
   */
  private async embedText(text: string): Promise<number[]> {
    const axios = await import('axios');
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

    try {
      const response = await axios.default.post(`${ollamaUrl}/api/embeddings`, {
        model: embeddingModel,
        prompt: text,
      }, {
        timeout: 30000,
      });

      return response.data.embedding;
    } catch (error: any) {
      console.error('Ollama embedding generation failed:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Ollama for embeddings. Make sure Ollama is running and ' + embeddingModel + ' model is installed');
      }

      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Get nodes by their IDs
   * 
   * @param nodeIds - Node IDs to fetch
   * @returns Array of nodes
   */
  private async getNodesByIds(nodeIds: string[]): Promise<GraphNode[]> {
    // TODO: Implement node fetching
    throw new Error('Not implemented');
  }

  /**
   * Extract citations from LLM response
   * 
   * @param response - LLM response text
   * @param citationMap - Map of IDs to citation text
   * @returns Array of citations
   */
  private extractCitations(
    response: string,
    citationMap: Map<string, string>
  ): Array<{ id: string; type: 'node' | 'edge'; text: string }> {
    const citations: Array<{ id: string; type: 'node' | 'edge'; text: string }> = [];
    const citationRegex = /\[(Node|Selected)-\d+\]/g;
    const matches = response.matchAll(citationRegex);

    const seenCitations = new Set<string>();

    for (const match of matches) {
      const citation = match[0];

      if (seenCitations.has(citation)) continue;
      seenCitations.add(citation);

      // Find node ID from citation map
      for (const [nodeId, citationText] of citationMap.entries()) {
        if (citationText === citation) {
          citations.push({
            id: nodeId,
            type: 'node',
            text: citation,
          });
          break;
        }
      }
    }

    return citations;
  }

  /**
   * Generate exploration suggestions based on subgraph
   * 
   * @param subgraph - Current subgraph
   * @param query - Original query
   * @returns Suggested next queries
   */
  private async generateSuggestions(
    subgraph: Subgraph,
    query: string
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest exploring highly connected nodes
    if (subgraph.nodes.length > 5) {
      const nodeConnections = new Map<string, number>();
      subgraph.edges.forEach(edge => {
        nodeConnections.set(edge.sourceNodeId, (nodeConnections.get(edge.sourceNodeId) || 0) + 1);
        nodeConnections.set(edge.targetNodeId, (nodeConnections.get(edge.targetNodeId) || 0) + 1);
      });

      const maxConnections = Math.max(...Array.from(nodeConnections.values()));
      if (maxConnections > 3) {
        suggestions.push('Explore the highly connected nodes to understand central themes');
      }
    }

    // Suggest checking Level 0 nodes
    const level0Nodes = subgraph.nodes.filter(n => n.veracityScore === 1.0);
    if (level0Nodes.length > 0) {
      suggestions.push(`Found ${level0Nodes.length} verified fact(s) - review these for authoritative information`);
    } else {
      suggestions.push('No verified facts found - consider searching Level 0 for authoritative sources');
    }

    // Suggest following specific relationships
    if (subgraph.edges.length > 0) {
      const edgeTypes = new Set(subgraph.edges.map(e => e.typeName));
      if (edgeTypes.size > 1) {
        suggestions.push('Multiple relationship types found - explore each type to understand different connections');
      }
    }

    return suggestions;
  }

  /**
   * Start periodic cleanup of L1 cache
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.l1Cache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.l1Cache.delete(key);
        }
      }
    }, 60000); // Run every minute
  }

  // ============================================================================
  // Monitoring & Metrics
  // ============================================================================

  /**
   * Get service metrics for monitoring
   * 
   * @returns Current service metrics
   */
  getMetrics(): Record<string, any> {
    return {
      l1CacheSize: this.l1Cache.size,
      l1CacheHitRate: 0, // TODO: Track hit rate
      configuredMaxDepth: this.config.graphTraversal.maxDepth,
      configuredMaxNodes: this.config.graphTraversal.maxNodes
    };
  }

  /**
   * Health check for the service
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    // TODO: Implement health check
    // 1. Check database connection
    // 2. Check Redis connection
    // 3. Check embedding service
    // 4. Check LLM service
    throw new Error('Not implemented');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and configure a GraphRAGService instance
 * 
 * @param pool - PostgreSQL pool
 * @param redis - Redis client
 * @param config - Optional configuration overrides
 * @returns Configured GraphRAGService instance
 */
export function createGraphRAGService(
  pool: Pool,
  redis: Redis,
  config?: Partial<GraphRAGConfig>
): GraphRAGService {
  const defaultConfig: GraphRAGConfig = {
    vectorSearch: {
      limit: 10,
      similarityThreshold: 0.7,
      efSearch: 40,
      level0Only: false
    },
    graphTraversal: {
      maxDepth: 3,
      maxNodes: 500,
      minVeracity: 0.5,
      traversalMode: 'breadth_first'
    },
    promptGeneration: {
      maxTokens: 8000,
      includeProperties: true,
      summarizeLongValues: true,
      citationFormat: 'inline'
    },
    caching: {
      l1TtlSeconds: 300,
      l2TtlSeconds: 86400,
      enableQueryCache: true
    }
  };

  const finalConfig = {
    ...defaultConfig,
    ...config,
    vectorSearch: { ...defaultConfig.vectorSearch, ...config?.vectorSearch },
    graphTraversal: { ...defaultConfig.graphTraversal, ...config?.graphTraversal },
    promptGeneration: { ...defaultConfig.promptGeneration, ...config?.promptGeneration },
    caching: { ...defaultConfig.caching, ...config?.caching }
  };

  return new GraphRAGService(pool, redis, finalConfig);
}

// ============================================================================
// Export all types and the main service
// ============================================================================

export default GraphRAGService;
