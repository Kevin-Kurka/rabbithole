import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  ID,
  FieldResolver,
  Root,
  Int,
} from 'type-graphql';
import { Pool } from 'pg';
import {
  Conversation,
  Message,
  MessageRole,
  ConversationMessage,
  ConversationalAIResponse,
  SearchableNode,
} from '../entities/Conversation';
import { User } from '../types/GraphTypes';
import { Graph } from '../types/GraphTypes';
import { conversationalAIService } from '../services/ConversationalAIService';

interface Context {
  pool: Pool;
  userId?: string;
  isAuthenticated: boolean;
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

// Cache for node/edge type IDs
const nodeTypeCache: Map<string, string> = new Map();
const edgeTypeCache: Map<string, string> = new Map();

async function getNodeTypeId(pool: Pool, name: string): Promise<string | null> {
  if (nodeTypeCache.has(name)) {
    return nodeTypeCache.get(name)!;
  }
  const result = await pool.query(
    `SELECT id FROM node_types WHERE name = $1`,
    [name]
  );
  if (result.rows.length === 0) return null;
  nodeTypeCache.set(name, result.rows[0].id);
  return result.rows[0].id;
}

async function getEdgeTypeId(pool: Pool, name: string): Promise<string | null> {
  if (edgeTypeCache.has(name)) {
    return edgeTypeCache.get(name)!;
  }
  const result = await pool.query(
    `SELECT id FROM edge_types WHERE name = $1`,
    [name]
  );
  if (result.rows.length === 0) return null;
  edgeTypeCache.set(name, result.rows[0].id);
  return result.rows[0].id;
}

/**
 * ConversationalAIResolver
 *
 * GraphQL resolver for conversational AI features
 * Provides queries and mutations for chat interactions with semantic search
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 */
@Resolver()
export class ConversationalAIResolver {
  /**
   * Send a message to the AI assistant
   *
   * @param message - User message text
   * @param conversationId - Optional conversation ID (creates new if not provided)
   * @param graphId - Optional graph context for scoped search
   * @param ctx - GraphQL context with pool and userId
   * @returns AI response with relevant nodes
   */
  @Mutation(() => ConversationalAIResponse)
  async sendAIMessage(
    @Arg('message') message: string,
    @Arg('conversationId', () => ID, { nullable: true }) conversationId: string | undefined,
    @Arg('graphId', () => ID, { nullable: true }) graphId: string | undefined,
    @Ctx() ctx: Context
  ): Promise<ConversationalAIResponse> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required to use AI assistant');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 5000) {
      throw new Error('Message is too long (max 5000 characters)');
    }

    try {
      const result = await conversationalAIService.sendMessage(
        ctx.pool,
        ctx.userId,
        message,
        conversationId,
        graphId
      );

      return {
        conversationId: result.conversationId,
        answer: result.response,
        sources: result.relevantNodes.map((node: any) => ({
          id: node.id,
          title: node.title,
          type: node.type || 'unknown',
          content: node.content || '',
          similarity: node.similarity
        })),
        suggestedFollowUp: []
      };
    } catch (error) {
      console.error('Error in sendAIMessage:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to process AI message');
    }
  }

  /**
   * Get conversation by ID
   * Queries nodes table with Conversation node type
   *
   * @param id - Conversation ID
   * @param ctx - GraphQL context
   * @returns Conversation with messages
   */
  @Query(() => Conversation, { nullable: true })
  async conversation(
    @Arg('id', () => ID) id: string,
    @Ctx() ctx: Context
  ): Promise<Conversation | null> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required');
    }

    const conversationTypeId = await getNodeTypeId(ctx.pool, 'Conversation');
    if (!conversationTypeId) {
      console.warn('Conversation node type not found');
      return null;
    }

    const result = await ctx.pool.query(
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
      [id, conversationTypeId, ctx.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      userId: props.userId,
      graphId: props.graphId || props.contextId || '',
      messages: [], // Populated by field resolver
      lastUpdated: row.updatedAt,
      messageCount: 0, // Populated by field resolver
    };
  }

  /**
   * Get user's conversations
   * Queries nodes table with Conversation node type
   *
   * @param graphId - Optional filter by graph
   * @param limit - Max conversations to return
   * @param offset - Pagination offset
   * @param ctx - GraphQL context
   * @returns List of conversations
   */
  @Query(() => [Conversation])
  async myConversations(
    @Arg('graphId', () => ID, { nullable: true }) graphId: string | undefined,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() ctx: Context
  ): Promise<Conversation[]> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required');
    }

    const conversationTypeId = await getNodeTypeId(ctx.pool, 'Conversation');
    const messageTypeId = await getNodeTypeId(ctx.pool, 'ConversationMessage');
    const edgeTypeId = await getEdgeTypeId(ctx.pool, 'HAS_MESSAGE');

    if (!conversationTypeId) {
      console.warn('Conversation node type not found');
      return [];
    }

    const query = graphId
      ? `
        SELECT
          c.id,
          c.props,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          COALESCE(msg_count.count, 0) as "messageCount"
        FROM nodes c
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as count
          FROM edges e
          WHERE e.source_node_id = c.id
            AND e.edge_type_id = $4
        ) msg_count ON true
        WHERE c.node_type_id = $1
          AND c.props->>'userId' = $2
          AND (c.props->>'graphId' = $3 OR c.props->>'contextId' = $3)
        ORDER BY c.updated_at DESC
        LIMIT $5 OFFSET $6
      `
      : `
        SELECT
          c.id,
          c.props,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          COALESCE(msg_count.count, 0) as "messageCount"
        FROM nodes c
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as count
          FROM edges e
          WHERE e.source_node_id = c.id
            AND e.edge_type_id = $3
        ) msg_count ON true
        WHERE c.node_type_id = $1
          AND c.props->>'userId' = $2
        ORDER BY c.updated_at DESC
        LIMIT $4 OFFSET $5
      `;

    const params = graphId
      ? [conversationTypeId, ctx.userId, graphId, edgeTypeId, limit, offset]
      : [conversationTypeId, ctx.userId, edgeTypeId, limit, offset];

    const result = await ctx.pool.query(query, params);

    return result.rows.map(row => {
      const props = parseProps(row.props);
      return {
        id: row.id,
        userId: props.userId,
        graphId: props.graphId || props.contextId || '',
        messages: [], // Populated by field resolver
        lastUpdated: row.updatedAt,
        messageCount: parseInt(row.messageCount, 10),
      };
    });
  }

  /**
   * Get messages for a conversation
   * Uses HAS_MESSAGE edges to find messages belonging to a conversation
   *
   * @param conversationId - Conversation ID
   * @param limit - Max messages to return
   * @param offset - Pagination offset
   * @param ctx - GraphQL context
   * @returns List of messages
   */
  @Query(() => [ConversationMessage])
  async conversationMessages(
    @Arg('conversationId', () => ID) conversationId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() ctx: Context
  ): Promise<ConversationMessage[]> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required');
    }

    const conversationTypeId = await getNodeTypeId(ctx.pool, 'Conversation');
    const messageTypeId = await getNodeTypeId(ctx.pool, 'ConversationMessage');
    const edgeTypeId = await getEdgeTypeId(ctx.pool, 'HAS_MESSAGE');

    if (!conversationTypeId || !messageTypeId || !edgeTypeId) {
      throw new Error('Required node/edge types not found');
    }

    // Verify user owns this conversation
    const conversationCheck = await ctx.pool.query(
      `SELECT id FROM nodes WHERE id = $1 AND node_type_id = $2 AND props->>'userId' = $3`,
      [conversationId, conversationTypeId, ctx.userId]
    );

    if (conversationCheck.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    // Query messages via HAS_MESSAGE edges
    const result = await ctx.pool.query(
      `
      SELECT
        m.id,
        m.props,
        m.created_at as "createdAt",
        COALESCE((e.props->>'order')::int, 0) as message_order
      FROM nodes m
      JOIN edges e ON e.target_node_id = m.id
      WHERE m.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.source_node_id = $3
      ORDER BY message_order ASC, m.created_at ASC
      LIMIT $4 OFFSET $5
      `,
      [messageTypeId, edgeTypeId, conversationId, limit, offset]
    );

    return result.rows.map(row => {
      const props = parseProps(row.props);
      return {
        userId: props.userId,
        conversationId: props.conversationId || conversationId,
        role: props.role,
        content: props.content,
        timestamp: row.createdAt,
      };
    });
  }

  /**
   * Search nodes using semantic search
   *
   * @param query - Search query text
   * @param graphId - Optional graph scope filter
   * @param ctx - GraphQL context
   * @returns Relevant nodes with similarity scores
   */
  @Query(() => [SearchableNode])
  async searchNodesSemantic(
    @Arg('query') query: string,
    @Arg('graphId', () => ID, { nullable: true }) graphId: string | undefined,
    @Ctx() ctx: Context
  ): Promise<SearchableNode[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const nodes = await conversationalAIService.searchNodes(
        ctx.pool,
        query,
        graphId
      );

      return nodes.map((node: any) => ({
        id: node.id,
        title: node.title,
        type: node.type || 'unknown',
        content: node.content || '',
        similarity: node.similarity
      }));
    } catch (error) {
      console.error('Error in searchNodesSemantic:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to search nodes');
    }
  }

  /**
   * Update conversation title
   * Updates node's props.title
   *
   * @param id - Conversation ID
   * @param title - New title
   * @param ctx - GraphQL context
   * @returns Updated conversation
   */
  @Mutation(() => Conversation)
  async updateConversationTitle(
    @Arg('id', () => ID) id: string,
    @Arg('title') title: string,
    @Ctx() ctx: Context
  ): Promise<Conversation> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (title.length > 200) {
      throw new Error('Title is too long (max 200 characters)');
    }

    const conversationTypeId = await getNodeTypeId(ctx.pool, 'Conversation');
    if (!conversationTypeId) {
      throw new Error('Conversation node type not found');
    }

    const result = await ctx.pool.query(
      `
      UPDATE nodes
      SET props = props || $1::jsonb, updated_at = NOW()
      WHERE id = $2 AND node_type_id = $3 AND props->>'userId' = $4
      RETURNING id, props, created_at as "createdAt", updated_at as "updatedAt"
      `,
      [JSON.stringify({ title }), id, conversationTypeId, ctx.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      userId: props.userId,
      graphId: props.graphId || props.contextId || '',
      messages: [], // Populated by field resolver
      lastUpdated: row.updatedAt,
      messageCount: 0, // Populated by field resolver
    };
  }

  /**
   * Delete conversation
   * Deletes conversation node and associated message nodes via cascade or explicit delete
   *
   * @param id - Conversation ID
   * @param ctx - GraphQL context
   * @returns Success status
   */
  @Mutation(() => Boolean)
  async deleteConversation(
    @Arg('id', () => ID) id: string,
    @Ctx() ctx: Context
  ): Promise<boolean> {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new Error('Authentication required');
    }

    const conversationTypeId = await getNodeTypeId(ctx.pool, 'Conversation');
    const messageTypeId = await getNodeTypeId(ctx.pool, 'ConversationMessage');
    const edgeTypeId = await getEdgeTypeId(ctx.pool, 'HAS_MESSAGE');

    if (!conversationTypeId) {
      throw new Error('Conversation node type not found');
    }

    // First, delete all message nodes connected via HAS_MESSAGE edges
    if (messageTypeId && edgeTypeId) {
      await ctx.pool.query(
        `
        DELETE FROM nodes
        WHERE id IN (
          SELECT target_node_id FROM edges
          WHERE source_node_id = $1 AND edge_type_id = $2
        )
        `,
        [id, edgeTypeId]
      );
    }

    // Delete the conversation node (edges will cascade or be deleted by FK)
    const result = await ctx.pool.query(
      `DELETE FROM nodes WHERE id = $1 AND node_type_id = $2 AND props->>'userId' = $3`,
      [id, conversationTypeId, ctx.userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }
}

/**
 * Conversation field resolvers
 */
@Resolver(() => Conversation)
export class ConversationFieldResolver {
  @FieldResolver(() => User, { nullable: true })
  async user(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context
  ): Promise<User | null> {
    const userTypeId = await getNodeTypeId(pool, 'User');
    if (!userTypeId) return null;

    const result = await pool.query(
      `SELECT id, props, created_at as "createdAt"
       FROM nodes WHERE id = $1 AND node_type_id = $2`,
      [conversation.userId, userTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      username: props.username,
      email: props.email,
      created_at: row.createdAt,
      updated_at: row.createdAt, // Use createdAt as fallback
    };
  }

  @FieldResolver(() => Graph, { nullable: true })
  async graph(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context
  ): Promise<Graph | null> {
    if (!conversation.graphId) {
      return null;
    }

    // Query nodes table for Graph node type
    const graphTypeId = await getNodeTypeId(pool, 'Graph');
    if (!graphTypeId) return null;

    const result = await pool.query(
      `SELECT id, props, created_at as "createdAt", updated_at as "updatedAt"
       FROM nodes WHERE id = $1 AND node_type_id = $2`,
      [conversation.graphId, graphTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      name: props.name || '',
      description: props.description,
      level: props.level,
      methodology: props.methodology,
      privacy: props.privacy,
      nodes: [], // Populated by field resolver if needed
      edges: [], // Populated by field resolver if needed
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  @FieldResolver(() => [ConversationMessage])
  async messages(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number
  ): Promise<ConversationMessage[]> {
    const messageTypeId = await getNodeTypeId(pool, 'ConversationMessage');
    const edgeTypeId = await getEdgeTypeId(pool, 'HAS_MESSAGE');

    if (!messageTypeId || !edgeTypeId) {
      return [];
    }

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.props,
        m.created_at as "createdAt",
        COALESCE((e.props->>'order')::int, 0) as message_order
      FROM nodes m
      JOIN edges e ON e.target_node_id = m.id
      WHERE m.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.source_node_id = $3
      ORDER BY message_order ASC, m.created_at ASC
      LIMIT $4
      `,
      [messageTypeId, edgeTypeId, conversation.id, limit]
    );

    return result.rows.map(row => {
      const props = parseProps(row.props);
      return {
        userId: props.userId,
        conversationId: props.conversationId || conversation.id,
        role: props.role,
        content: props.content,
        timestamp: row.createdAt,
      };
    });
  }

  @FieldResolver(() => Int)
  async messageCount(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context
  ): Promise<number> {
    // Return cached count if available
    if (conversation.messageCount !== undefined) {
      return conversation.messageCount;
    }

    const edgeTypeId = await getEdgeTypeId(pool, 'HAS_MESSAGE');
    if (!edgeTypeId) return 0;

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM edges
       WHERE source_node_id = $1 AND edge_type_id = $2`,
      [conversation.id, edgeTypeId]
    );

    return parseInt(result.rows[0].count, 10);
  }
}

/**
 * ConversationMessage field resolvers
 */
@Resolver(() => ConversationMessage)
export class ConversationMessageFieldResolver {
  @FieldResolver(() => User, { nullable: true })
  async user(
    @Root() message: ConversationMessage,
    @Ctx() { pool }: Context
  ): Promise<User | null> {
    const userTypeId = await getNodeTypeId(pool, 'User');
    if (!userTypeId) return null;

    const result = await pool.query(
      `SELECT id, props, created_at as "createdAt"
       FROM nodes WHERE id = $1 AND node_type_id = $2`,
      [message.userId, userTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      username: props.username,
      email: props.email,
      created_at: row.createdAt,
      updated_at: row.createdAt, // Use createdAt as fallback
    };
  }

  @FieldResolver(() => Conversation, { nullable: true })
  async conversation(
    @Root() message: ConversationMessage,
    @Ctx() { pool }: Context
  ): Promise<Conversation | null> {
    const conversationTypeId = await getNodeTypeId(pool, 'Conversation');
    if (!conversationTypeId) return null;

    const result = await pool.query(
      `SELECT id, props, created_at as "createdAt", updated_at as "updatedAt"
       FROM nodes WHERE id = $1 AND node_type_id = $2`,
      [message.conversationId, conversationTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      userId: props.userId,
      graphId: props.graphId || props.contextId || '',
      messages: [], // Populated by field resolver
      lastUpdated: row.updatedAt,
      messageCount: 0, // Populated by field resolver
    };
  }
}

/**
 * ConversationalAIResponse field resolver
 */
@Resolver(() => ConversationalAIResponse)
export class ConversationalAIResponseFieldResolver {
  @FieldResolver(() => Conversation, { nullable: true })
  async conversation(
    @Root() response: ConversationalAIResponse,
    @Ctx() { pool }: Context
  ): Promise<Conversation | null> {
    const conversationTypeId = await getNodeTypeId(pool, 'Conversation');
    if (!conversationTypeId) return null;

    const result = await pool.query(
      `SELECT id, props, created_at as "createdAt", updated_at as "updatedAt"
       FROM nodes WHERE id = $1 AND node_type_id = $2`,
      [response.conversationId, conversationTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const props = parseProps(row.props);

    return {
      id: row.id,
      userId: props.userId,
      graphId: props.graphId || props.contextId || '',
      messages: [], // Populated by field resolver
      lastUpdated: row.updatedAt,
      messageCount: 0, // Populated by field resolver
    };
  }
}
