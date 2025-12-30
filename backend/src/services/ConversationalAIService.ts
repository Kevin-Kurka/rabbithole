import axios from 'axios';
import { Pool } from 'pg';

/**
 * ConversationalAIService
 *
 * Comprehensive AI conversation service integrating:
 * - Ollama deepseek-r1:1.5b for conversational reasoning
 * - Ollama nomic-embed-text for semantic embeddings
 * - PostgreSQL pgvector for semantic node search
 * - Persistent conversation history in database (as nodes/edges)
 * - Context window management for multi-turn conversations
 * - Markdown link formatting for node references
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 */

// ==================== TYPES ====================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface Conversation {
  id: string;
  userId: string;
  graphId?: string;
  title?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchableNode {
  id: string;
  title: string;
  props: any;
  meta?: any;
  node_type?: string;
  weight: number;
  similarity?: number;
}

interface ConversationContext {
  conversationId: string;
  messages: ConversationMessage[];
  relevantNodes: SearchableNode[];
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse props that could be string or object
 */
function parseProps(props: any): Record<string, any> {
  if (!props) return {};
  if (typeof props === 'string') {
    try {
      return JSON.parse(props);
    } catch {
      return {};
    }
  }
  return props;
}

// ==================== SERVICE CLASS ====================

export class ConversationalAIService {
  private ollamaUrl: string;
  private chatModel: string;
  private embeddingModel: string;
  private maxContextMessages: number;
  private maxRelevantNodes: number;
  private similarityThreshold: number;

  // Cache for node/edge type IDs
  private nodeTypeCache: Map<string, string> = new Map();
  private edgeTypeCache: Map<string, string> = new Map();

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.chatModel = process.env.OLLAMA_CHAT_MODEL || 'deepseek-r1:1.5b';
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    this.maxContextMessages = parseInt(process.env.MAX_CONTEXT_MESSAGES || '20');
    this.maxRelevantNodes = parseInt(process.env.MAX_RELEVANT_NODES || '5');
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7');

    console.log(`ConversationalAI initialized:
  - Chat Model: ${this.chatModel}
  - Embedding Model: ${this.embeddingModel}
  - Max Context: ${this.maxContextMessages} messages
  - Max Relevant Nodes: ${this.maxRelevantNodes}
  - Similarity Threshold: ${this.similarityThreshold}
    `);
  }

  /**
   * Get node type ID by name (cached)
   */
  private async getNodeTypeId(pool: Pool, name: string): Promise<string | null> {
    if (this.nodeTypeCache.has(name)) {
      return this.nodeTypeCache.get(name)!;
    }
    const result = await pool.query(
      `SELECT id FROM node_types WHERE name = $1`,
      [name]
    );
    if (result.rows.length === 0) return null;
    this.nodeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Get edge type ID by name (cached)
   */
  private async getEdgeTypeId(pool: Pool, name: string): Promise<string | null> {
    if (this.edgeTypeCache.has(name)) {
      return this.edgeTypeCache.get(name)!;
    }
    const result = await pool.query(
      `SELECT id FROM edge_types WHERE name = $1`,
      [name]
    );
    if (result.rows.length === 0) return null;
    this.edgeTypeCache.set(name, result.rows[0].id);
    return result.rows[0].id;
  }

  /**
   * Process user message with full conversational context
   *
   * @param pool - PostgreSQL connection pool
   * @param userId - User ID sending the message
   * @param message - User message text
   * @param conversationId - Optional conversation ID (creates new if not provided)
   * @param graphId - Optional graph context for scoped search
   * @returns Assistant response with formatted node links
   */
  async sendMessage(
    pool: Pool,
    userId: string,
    message: string,
    conversationId?: string,
    graphId?: string
  ): Promise<{
    conversationId: string;
    response: string;
    relevantNodes: SearchableNode[];
    messageId: string;
  }> {
    try {
      // Step 1: Get or create conversation
      const conversation = conversationId
        ? await this.getConversation(pool, conversationId, userId)
        : await this.createConversation(pool, userId, graphId);

      if (!conversation) {
        throw new Error('Failed to create or retrieve conversation');
      }

      // Step 2: Save user message to database
      const userMessageId = await this.saveMessage(pool, {
        conversationId: conversation.id,
        userId,
        role: 'user',
        content: message,
      });

      // Step 3: Search for relevant nodes using semantic search
      const relevantNodes = await this.searchNodes(pool, message, graphId);

      // Step 4: Get conversation history with context window management
      const conversationHistory = await this.getConversationHistory(
        pool,
        conversation.id
      );

      // Step 5: Build context for AI
      const context = this.buildContext(conversationHistory, relevantNodes);

      // Step 6: Generate AI response
      const aiResponse = await this.generateResponse(context, message);

      // Step 7: Format response with node links
      const formattedResponse = this.formatResponseWithLinks(
        aiResponse,
        relevantNodes
      );

      // Step 8: Save assistant response to database
      const assistantMessageId = await this.saveMessage(pool, {
        conversationId: conversation.id,
        userId, // System user ID could be different
        role: 'assistant',
        content: formattedResponse,
        metadata: {
          relevantNodeIds: relevantNodes.map(n => n.id),
          modelUsed: this.chatModel,
        },
      });

      // Step 9: Update conversation timestamp
      await this.updateConversation(pool, conversation.id);

      return {
        conversationId: conversation.id,
        response: formattedResponse,
        relevantNodes,
        messageId: assistantMessageId,
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search database nodes using pgvector semantic search
   *
   * @param pool - PostgreSQL connection pool
   * @param query - Search query text
   * @param graphId - Optional graph scope filter
   * @returns Top N relevant nodes with similarity scores
   */
  async searchNodes(
    pool: Pool,
    query: string,
    graphId?: string
  ): Promise<SearchableNode[]> {
    try {
      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('Empty embedding generated for query:', query);
        return [];
      }

      // Build vector string for PostgreSQL
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // Perform semantic search using cosine distance
      // Note: <=> is cosine distance operator (0 = identical, 2 = opposite)
      const searchQuery = graphId
        ? `
          SELECT
            n.id,
            n.props->>'title' as title,
            n.props,
            n.ai,
            COALESCE((n.props->>'weight')::numeric, 1.0) as weight,
            nt.name as node_type,
            (1 - (n.ai <=> $1::vector)) as similarity
          FROM nodes n
          LEFT JOIN node_types nt ON n.node_type_id = nt.id
          WHERE n.props->>'graphId' = $2
            AND n.ai IS NOT NULL
            AND (1 - (n.ai <=> $1::vector)) >= $3
          ORDER BY n.ai <=> $1::vector
          LIMIT $4
        `
        : `
          SELECT
            n.id,
            n.props->>'title' as title,
            n.props,
            n.ai,
            COALESCE((n.props->>'weight')::numeric, 1.0) as weight,
            nt.name as node_type,
            (1 - (n.ai <=> $1::vector)) as similarity
          FROM nodes n
          LEFT JOIN node_types nt ON n.node_type_id = nt.id
          WHERE n.ai IS NOT NULL
            AND (1 - (n.ai <=> $1::vector)) >= $2
          ORDER BY n.ai <=> $1::vector
          LIMIT $3
        `;

      const queryParams = graphId
        ? [vectorString, graphId, this.similarityThreshold, this.maxRelevantNodes]
        : [vectorString, this.similarityThreshold, this.maxRelevantNodes];

      const result = await pool.query(searchQuery, queryParams);

      const nodes: SearchableNode[] = result.rows.map(row => ({
        id: row.id,
        title: row.title || 'Untitled Node',
        props: parseProps(row.props),
        ai: typeof row.ai === 'string' ? JSON.parse(row.ai) : row.ai,
        node_type: row.node_type,
        weight: row.weight,
        similarity: row.similarity,
      }));

      console.log(`Semantic search found ${nodes.length} relevant nodes for query: "${query.substring(0, 50)}..."`);

      return nodes;
    } catch (error) {
      console.error('Error in searchNodes:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  /**
   * Format AI response with markdown links to nodes
   *
   * Converts node references to clickable links: [Node Title](node-id)
   *
   * @param response - Raw AI response text
   * @param relevantNodes - Nodes to potentially link
   * @returns Formatted response with markdown links
   */
  formatResponseWithLinks(
    response: string,
    relevantNodes: SearchableNode[]
  ): string {
    if (relevantNodes.length === 0) {
      return response;
    }

    let formattedResponse = response;

    // Sort nodes by title length (longest first) to avoid partial replacements
    const sortedNodes = [...relevantNodes].sort(
      (a, b) => b.title.length - a.title.length
    );

    // Replace node titles with markdown links
    sortedNodes.forEach(node => {
      if (!node.title) return;

      // Create regex to match whole word node titles (case-insensitive)
      const titleRegex = new RegExp(
        `\\b(${this.escapeRegex(node.title)})\\b`,
        'gi'
      );

      // Replace with markdown link (only if not already a link)
      formattedResponse = formattedResponse.replace(
        titleRegex,
        (match) => {
          // Check if already in a link or code block
          const beforeMatch = formattedResponse.substring(
            0,
            formattedResponse.indexOf(match)
          );
          if (beforeMatch.lastIndexOf('[') > beforeMatch.lastIndexOf(']')) {
            return match; // Already part of a link text
          }
          if (beforeMatch.lastIndexOf('(') > beforeMatch.lastIndexOf(')')) {
            return match; // Inside link URL or other parenthesized text
          }
          if (beforeMatch.lastIndexOf('`') > beforeMatch.lastIndexOf('`', beforeMatch.length - 1)) {
            return match; // Inside code block
          }

          return `[${match}](node:${node.id})`;
        }
      );
    });

    // Append node references section if nodes were mentioned
    if (relevantNodes.length > 0 && relevantNodes.some(n => formattedResponse.includes(`node:${n.id}`))) {
      formattedResponse += '\n\n---\n**Related Nodes:**\n';
      relevantNodes.forEach(node => {
        if (formattedResponse.includes(`node:${node.id}`)) {
          formattedResponse += `- [${node.title}](node:${node.id}) (similarity: ${(node.similarity || 0).toFixed(2)})\n`;
        }
      });
    }

    return formattedResponse;
  }

  /**
   * Get conversation history with context window management
   * Uses HAS_MESSAGE edges to find messages belonging to a conversation
   *
   * @param pool - PostgreSQL connection pool
   * @param conversationId - Conversation ID
   * @returns Recent conversation messages
   */
  async getConversationHistory(
    pool: Pool,
    conversationId: string
  ): Promise<ConversationMessage[]> {
    try {
      const messageTypeId = await this.getNodeTypeId(pool, 'ConversationMessage');
      const edgeTypeId = await this.getEdgeTypeId(pool, 'HAS_MESSAGE');

      if (!messageTypeId || !edgeTypeId) {
        console.warn('ConversationMessage or HAS_MESSAGE type not found');
        return [];
      }

      // Query messages via HAS_MESSAGE edges
      const result = await pool.query(
        `
        SELECT
          m.id,
          m.props->>'conversationId' as "conversationId",
          m.props->>'userId' as "userId",
          m.props->>'role' as role,
          m.props->>'content' as content,
          m.props->'metadata' as metadata,
          m.created_at as "createdAt",
          COALESCE((e.props->>'order')::int, 0) as message_order
        FROM nodes m
        JOIN edges e ON e.target_node_id = m.id
        WHERE m.node_type_id = $1
          AND e.edge_type_id = $2
          AND e.source_node_id = $3
        ORDER BY message_order DESC, m.created_at DESC
        LIMIT $4
        `,
        [messageTypeId, edgeTypeId, conversationId, this.maxContextMessages]
      );

      // Reverse to get chronological order
      return result.rows.reverse().map(row => ({
        id: row.id,
        conversationId: row.conversationId || conversationId,
        userId: row.userId || '',
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content || '',
        metadata: parseProps(row.metadata),
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error('Error retrieving conversation history:', error);
      return [];
    }
  }

  /**
   * Generate text embedding using Ollama
   *
   * @param text - Text to embed
   * @returns 1536-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post<OllamaEmbeddingResponse>(
        `${this.ollamaUrl}/api/embeddings`,
        {
          model: this.embeddingModel,
          prompt: text,
        },
        {
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
        }
        if (error.response?.status === 404) {
          throw new Error(`Embedding model "${this.embeddingModel}" not found. Pull it with: ollama pull ${this.embeddingModel}`);
        }
      }
      throw error;
    }
  }

  /**
   * Simple chat method for inquiry evaluation (no database interaction)
   * @param prompt - The prompt to send to the AI
   * @param context - Optional context string (e.g., 'inquiry-evaluation')
   * @returns AI response as string
   */
  async chat(prompt: string, context?: string): Promise<string> {
    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: context || 'You are an AI assistant evaluating inquiry positions.' },
        { role: 'user', content: prompt },
      ];

      const response = await axios.post<OllamaChatResponse>(
        `${this.ollamaUrl}/api/chat`,
        {
          model: this.chatModel,
          messages,
          stream: false,
        }
      );

      return response.data.message.content;
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate AI response using Ollama chat API
   */
  private async generateResponse(
    context: ConversationContext,
    userMessage: string
  ): Promise<string> {
    try {
      // Build system prompt with node context
      const systemPrompt = this.buildSystemPrompt(context.relevantNodes);

      // Build messages array for Ollama
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        ...context.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ];

      // Call Ollama chat API
      const response = await axios.post<OllamaChatResponse>(
        `${this.ollamaUrl}/api/chat`,
        {
          model: this.chatModel,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 1024,
          },
        },
        {
          timeout: 60000, // 60 second timeout
        }
      );

      const aiResponse = response.data.message.content;

      console.log(`AI Response generated:
  - Model: ${this.chatModel}
  - Tokens: ${response.data.eval_count || 'N/A'}
  - Duration: ${response.data.total_duration ? (response.data.total_duration / 1e9).toFixed(2) + 's' : 'N/A'}
      `);

      return aiResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
        }
        if (error.response?.status === 404) {
          throw new Error(`Chat model "${this.chatModel}" not found. Pull it with: ollama pull ${this.chatModel}`);
        }
      }
      throw error;
    }
  }

  /**
   * Build system prompt with relevant node context
   */
  private buildSystemPrompt(relevantNodes: SearchableNode[]): string {
    const basePrompt = `You are a helpful AI assistant for a knowledge graph exploration system called "Rabbit Hole".

Your role is to:
- Help users explore and understand connections between concepts
- Answer questions based on the knowledge graph nodes
- Suggest related topics and areas for investigation
- Provide clear, concise, and accurate information

Guidelines:
- Be conversational and friendly
- Reference specific nodes from the knowledge graph when relevant
- Acknowledge when you don't have information
- Encourage critical thinking and exploration
- Keep responses focused and actionable`;

    if (relevantNodes.length === 0) {
      return basePrompt + '\n\nNo specific nodes are currently relevant to this conversation.';
    }

    const nodeContext = relevantNodes
      .map(
        (node, idx) => `
${idx + 1}. **${node.title}** (ID: ${node.id}, Type: ${node.node_type || 'Unknown'})
   - Weight: ${node.weight.toFixed(2)}
   - Similarity: ${(node.similarity || 0).toFixed(2)}
   - Properties: ${JSON.stringify(node.props, null, 2)}`
      )
      .join('\n');

    return `${basePrompt}

**RELEVANT KNOWLEDGE GRAPH NODES:**
${nodeContext}

Use these nodes to provide context-aware responses. Reference nodes by their titles when discussing related concepts.`;
  }

  /**
   * Build conversation context from history and relevant nodes
   */
  private buildContext(
    messages: ConversationMessage[],
    relevantNodes: SearchableNode[]
  ): ConversationContext {
    // Filter out system messages and keep only recent user/assistant exchanges
    const conversationMessages = messages.filter(
      msg => msg.role === 'user' || msg.role === 'assistant'
    );

    return {
      conversationId: messages[0]?.conversationId || '',
      messages: conversationMessages,
      relevantNodes,
    };
  }

  /**
   * Get conversation by ID with user ownership check
   * Queries nodes table with Conversation node type
   */
  private async getConversation(
    pool: Pool,
    conversationId: string,
    userId: string
  ): Promise<Conversation | null> {
    try {
      const conversationTypeId = await this.getNodeTypeId(pool, 'Conversation');
      if (!conversationTypeId) {
        console.warn('Conversation node type not found');
        return null;
      }

      const result = await pool.query(
        `
        SELECT
          id,
          props,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM nodes
        WHERE id = $1
          AND node_type_id = $2
          AND props->>'userId' = $3
        `,
        [conversationId, conversationTypeId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const props = parseProps(row.props);

      return {
        id: row.id,
        userId: props.userId || userId,
        graphId: props.graphId,
        title: props.title,
        metadata: props.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.error('Error retrieving conversation:', error);
      return null;
    }
  }

  /**
   * Create new conversation as a node
   */
  private async createConversation(
    pool: Pool,
    userId: string,
    graphId?: string
  ): Promise<Conversation> {
    try {
      const conversationTypeId = await this.getNodeTypeId(pool, 'Conversation');
      if (!conversationTypeId) {
        throw new Error('Conversation node type not found. Run migrations.');
      }

      const props = {
        userId,
        graphId: graphId || null,
        title: 'New Conversation',
        contextType: graphId ? 'graph' : 'general',
        contextId: graphId || null,
        status: 'active',
        metadata: { source: 'ConversationalAIService' },
      };

      const result = await pool.query(
        `
        INSERT INTO nodes (node_type_id, props, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id, props, created_at as "createdAt", updated_at as "updatedAt"
        `,
        [conversationTypeId, JSON.stringify(props)]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId,
        graphId,
        title: 'New Conversation',
        metadata: props.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Save message to database as a node, linked via HAS_MESSAGE edge
   */
  private async saveMessage(
    pool: Pool,
    message: {
      conversationId: string;
      userId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      const messageTypeId = await this.getNodeTypeId(pool, 'ConversationMessage');
      const edgeTypeId = await this.getEdgeTypeId(pool, 'HAS_MESSAGE');

      if (!messageTypeId || !edgeTypeId) {
        throw new Error('ConversationMessage or HAS_MESSAGE type not found. Run migrations.');
      }

      // Get message order for this conversation
      const countResult = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM edges e
        WHERE e.edge_type_id = $1 AND e.source_node_id = $2
        `,
        [edgeTypeId, message.conversationId]
      );
      const messageOrder = parseInt(countResult.rows[0].count, 10);

      const props = {
        conversationId: message.conversationId,
        userId: message.userId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        tokenCount: message.content.length, // Approximate
      };

      // Create message node
      const nodeResult = await pool.query(
        `
        INSERT INTO nodes (node_type_id, props, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id
        `,
        [messageTypeId, JSON.stringify(props)]
      );
      const messageId = nodeResult.rows[0].id;

      // Create HAS_MESSAGE edge from conversation to message
      await pool.query(
        `
        INSERT INTO edges (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        `,
        [edgeTypeId, message.conversationId, messageId, JSON.stringify({ order: messageOrder })]
      );

      return messageId;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  /**
   * Update conversation timestamp
   */
  private async updateConversation(pool: Pool, conversationId: string): Promise<void> {
    try {
      await pool.query(
        `
        UPDATE nodes
        SET updated_at = NOW()
        WHERE id = $1
        `,
        [conversationId]
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return new Error('Ollama service is not available. Please ensure Ollama is running.');
      }
      if (error.response?.status === 404) {
        return new Error('Ollama model not found. Please pull the required models.');
      }
      return new Error(`Ollama API error: ${error.message}`);
    }

    return new Error('An unexpected error occurred in ConversationalAI');
  }
}

// ==================== SINGLETON EXPORT ====================

/**
 * Singleton instance of ConversationalAIService
 * Import this in resolvers to use the service
 */
export const conversationalAIService = new ConversationalAIService();
