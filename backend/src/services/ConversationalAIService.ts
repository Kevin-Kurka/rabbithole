import axios from 'axios';
import { Pool } from 'pg';

/**
 * ConversationalAIService
 *
 * Comprehensive AI conversation service integrating:
 * - Ollama deepseek-r1:1.5b for conversational reasoning
 * - Ollama nomic-embed-text for semantic embeddings
 * - PostgreSQL pgvector for semantic node search
 * - Persistent conversation history in database
 * - Context window management for multi-turn conversations
 * - Markdown link formatting for node references
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

// ==================== SERVICE CLASS ====================

export class ConversationalAIService {
  private ollamaUrl: string;
  private chatModel: string;
  private embeddingModel: string;
  private maxContextMessages: number;
  private maxRelevantNodes: number;
  private similarityThreshold: number;

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
            n.title,
            n.props,
            n.meta,
            n.weight,
            mnt.name as node_type,
            (1 - (n.ai <=> $1::vector)) as similarity
          FROM public."Nodes" n
          LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
          WHERE n.graph_id = $2
            AND n.ai IS NOT NULL
            AND (1 - (n.ai <=> $1::vector)) >= $3
          ORDER BY n.ai <=> $1::vector
          LIMIT $4
        `
        : `
          SELECT
            n.id,
            n.title,
            n.props,
            n.meta,
            n.weight,
            mnt.name as node_type,
            (1 - (n.ai <=> $1::vector)) as similarity
          FROM public."Nodes" n
          LEFT JOIN public."MethodologyNodeTypes" mnt ON n.node_type_id = mnt.id
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
        props: typeof row.props === 'string' ? JSON.parse(row.props) : row.props,
        meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
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
            return match; // Already part of a link
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
      const result = await pool.query(
        `
        SELECT
          id,
          conversation_id as "conversationId",
          user_id as "userId",
          role,
          content,
          metadata,
          created_at as "createdAt"
        FROM public."ConversationMessages"
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [conversationId, this.maxContextMessages]
      );

      // Reverse to get chronological order
      return result.rows.reverse().map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
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
   */
  private async getConversation(
    pool: Pool,
    conversationId: string,
    userId: string
  ): Promise<Conversation | null> {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          user_id as "userId",
          graph_id as "graphId",
          title,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM public."Conversations"
        WHERE id = $1 AND user_id = $2
        `,
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      };
    } catch (error) {
      console.error('Error retrieving conversation:', error);
      return null;
    }
  }

  /**
   * Create new conversation
   */
  private async createConversation(
    pool: Pool,
    userId: string,
    graphId?: string
  ): Promise<Conversation> {
    try {
      const result = await pool.query(
        `
        INSERT INTO public."Conversations" (
          id,
          user_id,
          graph_id,
          title,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          uuid_generate_v4(),
          $1,
          $2,
          $3,
          $4,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          user_id as "userId",
          graph_id as "graphId",
          title,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [
          userId,
          graphId || null,
          'New Conversation',
          JSON.stringify({ source: 'ConversationalAIService' }),
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Save message to database
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
      const result = await pool.query(
        `
        INSERT INTO public."ConversationMessages" (
          id,
          conversation_id,
          user_id,
          role,
          content,
          metadata,
          created_at
        )
        VALUES (
          uuid_generate_v4(),
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        )
        RETURNING id
        `,
        [
          message.conversationId,
          message.userId,
          message.role,
          message.content,
          JSON.stringify(message.metadata || {}),
        ]
      );

      return result.rows[0].id;
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
        UPDATE public."Conversations"
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
