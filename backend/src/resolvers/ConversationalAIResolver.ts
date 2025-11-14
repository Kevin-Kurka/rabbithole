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
  ConversationMessage,
  ConversationalAIResponse,
  SearchableNode,
  MessageRole,
} from '../entities/Conversation';
import { User } from '../entities/User';
import { Graph } from '../entities/Graph';
import { conversationalAIService } from '../services/ConversationalAIService';

interface Context {
  pool: Pool;
  userId?: string;
  isAuthenticated: boolean;
}

/**
 * ConversationalAIResolver
 *
 * GraphQL resolver for conversational AI features
 * Provides queries and mutations for chat interactions with semantic search
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

      return result;
    } catch (error) {
      console.error('Error in sendAIMessage:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to process AI message');
    }
  }

  /**
   * Get conversation by ID
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

    const result = await ctx.pool.query(
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
      [id, ctx.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get user's conversations
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

    const query = graphId
      ? `
        SELECT
          c.id,
          c.user_id as "userId",
          c.graph_id as "graphId",
          c.title,
          c.metadata,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          COUNT(cm.id) as "messageCount"
        FROM public."Conversations" c
        LEFT JOIN public."ConversationMessages" cm ON c.id = cm.conversation_id
        WHERE c.user_id = $1 AND c.graph_id = $2
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT $3 OFFSET $4
      `
      : `
        SELECT
          c.id,
          c.user_id as "userId",
          c.graph_id as "graphId",
          c.title,
          c.metadata,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          COUNT(cm.id) as "messageCount"
        FROM public."Conversations" c
        LEFT JOIN public."ConversationMessages" cm ON c.id = cm.conversation_id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT $2 OFFSET $3
      `;

    const params = graphId
      ? [ctx.userId, graphId, limit, offset]
      : [ctx.userId, limit, offset];

    const result = await ctx.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get messages for a conversation
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

    // Verify user owns this conversation
    const conversationCheck = await ctx.pool.query(
      `SELECT id FROM public."Conversations" WHERE id = $1 AND user_id = $2`,
      [conversationId, ctx.userId]
    );

    if (conversationCheck.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    const result = await ctx.pool.query(
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
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
      `,
      [conversationId, limit, offset]
    );

    return result.rows;
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

      return nodes;
    } catch (error) {
      console.error('Error in searchNodesSemantic:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to search nodes');
    }
  }

  /**
   * Update conversation title
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

    const result = await ctx.pool.query(
      `
      UPDATE public."Conversations"
      SET title = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING
        id,
        user_id as "userId",
        graph_id as "graphId",
        title,
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      `,
      [title, id, ctx.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Conversation not found or access denied');
    }

    return result.rows[0];
  }

  /**
   * Delete conversation
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

    const result = await ctx.pool.query(
      `DELETE FROM public."Conversations" WHERE id = $1 AND user_id = $2`,
      [id, ctx.userId]
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
    const result = await pool.query(
      `SELECT id, username, email, created_at as "createdAt"
       FROM public."Users" WHERE id = $1`,
      [conversation.userId]
    );

    return result.rows[0] || null;
  }

  @FieldResolver(() => Graph, { nullable: true })
  async graph(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context
  ): Promise<Graph | null> {
    if (!conversation.graphId) {
      return null;
    }

    const result = await pool.query(
      `SELECT id, name, description, level, methodology, privacy,
              created_by as "createdBy", created_at as "createdAt",
              updated_at as "updatedAt"
       FROM public."Graphs" WHERE id = $1`,
      [conversation.graphId]
    );

    return result.rows[0] || null;
  }

  @FieldResolver(() => [ConversationMessage])
  async messages(
    @Root() conversation: Conversation,
    @Ctx() { pool }: Context,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number
  ): Promise<ConversationMessage[]> {
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
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [conversation.id, limit]
    );

    return result.rows;
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

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM public."ConversationMessages"
       WHERE conversation_id = $1`,
      [conversation.id]
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
    const result = await pool.query(
      `SELECT id, username, email, created_at as "createdAt"
       FROM public."Users" WHERE id = $1`,
      [message.userId]
    );

    return result.rows[0] || null;
  }

  @FieldResolver(() => Conversation, { nullable: true })
  async conversation(
    @Root() message: ConversationMessage,
    @Ctx() { pool }: Context
  ): Promise<Conversation | null> {
    const result = await pool.query(
      `SELECT id, user_id as "userId", graph_id as "graphId", title,
              metadata, created_at as "createdAt", updated_at as "updatedAt"
       FROM public."Conversations" WHERE id = $1`,
      [message.conversationId]
    );

    return result.rows[0] || null;
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
    const result = await pool.query(
      `SELECT id, user_id as "userId", graph_id as "graphId", title,
              metadata, created_at as "createdAt", updated_at as "updatedAt"
       FROM public."Conversations" WHERE id = $1`,
      [response.conversationId]
    );

    return result.rows[0] || null;
  }
}
