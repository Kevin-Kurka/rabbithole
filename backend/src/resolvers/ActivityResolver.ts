import { Resolver, Query, Mutation, Arg, Ctx, ID, Int } from 'type-graphql';
import {
  ActivityPost,
  ActivityReaction,
  CreatePostInput,
  ReplyToPostInput,
  SharePostInput
} from '../entities/ActivityPost';
import { Context } from '../types/context';

@Resolver(() => ActivityPost)
export class PostActivityResolver {
  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Get activity posts for a specific node (timeline)
   */
  @Query(() => [ActivityPost])
  async getNodeActivity(
    @Arg('nodeId', () => ID) nodeId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost[]> {
    try {
      const sql = `
        SELECT
          p.*,
          u.username as author_username,
          u.email as author_email,
          n.title as node_title,
          get_reply_count(p.id) as reply_count,
          get_share_count(p.id) as share_count,
          get_reaction_counts(p.id) as reaction_counts,
          (
            SELECT COUNT(*)::int
            FROM public."ActivityReactions" ar
            WHERE ar.post_id = p.id
          ) as total_reaction_count
          ${userId ? `, (
            SELECT array_agg(reaction_type)
            FROM public."ActivityReactions"
            WHERE post_id = p.id AND user_id = $4
          ) as user_reactions` : ''}
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE p.node_id = $1
        AND p.deleted_at IS NULL
        AND p.is_reply = FALSE  -- Only top-level posts, not replies
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const params = userId ? [nodeId, limit, offset, userId] : [nodeId, limit, offset];
      const result = await pool.query(sql, params);

      return result.rows.map(row => this.mapRowToActivityPost(row));
    } catch (error) {
      console.error('Error fetching node activity:', error);
      throw new Error('Failed to fetch node activity');
    }
  }

  /**
   * Get a single post by ID with all details
   */
  @Query(() => ActivityPost, { nullable: true })
  async getPost(
    @Arg('postId', () => ID) postId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost | null> {
    try {
      const sql = `
        SELECT
          p.*,
          u.username as author_username,
          u.email as author_email,
          n.title as node_title,
          get_reply_count(p.id) as reply_count,
          get_share_count(p.id) as share_count,
          get_reaction_counts(p.id) as reaction_counts,
          (
            SELECT COUNT(*)::int
            FROM public."ActivityReactions" ar
            WHERE ar.post_id = p.id
          ) as total_reaction_count
          ${userId ? `, (
            SELECT array_agg(reaction_type)
            FROM public."ActivityReactions"
            WHERE post_id = p.id AND user_id = $2
          ) as user_reactions` : ''}
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `;

      const params = userId ? [postId, userId] : [postId];
      const result = await pool.query(sql, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToActivityPost(result.rows[0]);
    } catch (error) {
      console.error('Error fetching post:', error);
      throw new Error('Failed to fetch post');
    }
  }

  /**
   * Get replies to a post
   */
  @Query(() => [ActivityPost])
  async getPostReplies(
    @Arg('postId', () => ID) postId: string,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost[]> {
    try {
      const sql = `
        SELECT
          p.*,
          u.username as author_username,
          u.email as author_email,
          n.title as node_title,
          get_reply_count(p.id) as reply_count,
          get_share_count(p.id) as share_count,
          get_reaction_counts(p.id) as reaction_counts,
          (
            SELECT COUNT(*)::int
            FROM public."ActivityReactions" ar
            WHERE ar.post_id = p.id
          ) as total_reaction_count
          ${userId ? `, (
            SELECT array_agg(reaction_type)
            FROM public."ActivityReactions"
            WHERE post_id = p.id AND user_id = $3
          ) as user_reactions` : ''}
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE p.parent_post_id = $1
        AND p.deleted_at IS NULL
        ORDER BY p.created_at ASC
        LIMIT $2
      `;

      const params = userId ? [postId, limit, userId] : [postId, limit];
      const result = await pool.query(sql, params);

      return result.rows.map(row => this.mapRowToActivityPost(row));
    } catch (error) {
      console.error('Error fetching post replies:', error);
      throw new Error('Failed to fetch post replies');
    }
  }

  /**
   * Get user's feed (posts from nodes they're interested in or mentioned in)
   */
  @Query(() => [ActivityPost])
  async getUserFeed(
    @Arg('userId', () => ID, { nullable: true }) targetUserId: string | undefined,
    @Arg('limit', () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', () => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost[]> {
    const feedUserId = targetUserId || userId;
    if (!feedUserId) {
      throw new Error('User ID required');
    }

    try {
      const sql = `
        SELECT DISTINCT
          p.*,
          u.username as author_username,
          u.email as author_email,
          n.title as node_title,
          get_reply_count(p.id) as reply_count,
          get_share_count(p.id) as share_count,
          get_reaction_counts(p.id) as reaction_counts,
          (
            SELECT COUNT(*)::int
            FROM public."ActivityReactions" ar
            WHERE ar.post_id = p.id
          ) as total_reaction_count
          ${userId ? `, (
            SELECT array_agg(reaction_type)
            FROM public."ActivityReactions"
            WHERE post_id = p.id AND user_id = $4
          ) as user_reactions` : ''}
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE p.deleted_at IS NULL
        AND (
          p.author_id = $1  -- Posts by the user
          OR $1 = ANY(p.mentioned_node_ids)  -- User mentioned (if mentioned_node_ids are user nodes)
        )
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const params = userId ? [feedUserId, limit, offset, userId] : [feedUserId, limit, offset];
      const result = await pool.query(sql, params);

      return result.rows.map(row => this.mapRowToActivityPost(row));
    } catch (error) {
      console.error('Error fetching user feed:', error);
      throw new Error('Failed to fetch user feed');
    }
  }

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Create a new post
   */
  @Mutation(() => ActivityPost)
  async createPost(
    @Arg('input') input: CreatePostInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost> {
    if (!userId) {
      throw new Error('Authentication required to create post');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate node exists
      const nodeCheck = await client.query(
        'SELECT id FROM public."Nodes" WHERE id = $1',
        [input.nodeId]
      );
      if (nodeCheck.rows.length === 0) {
        throw new Error('Node not found');
      }

      // Validate mentioned nodes exist
      if (input.mentionedNodeIds && input.mentionedNodeIds.length > 0) {
        const mentionCheck = await client.query(
          'SELECT id FROM public."Nodes" WHERE id = ANY($1::uuid[])',
          [input.mentionedNodeIds]
        );
        if (mentionCheck.rows.length !== input.mentionedNodeIds.length) {
          throw new Error('One or more mentioned nodes not found');
        }
      }

      // Validate attachments exist
      if (input.attachmentIds && input.attachmentIds.length > 0) {
        const attachmentCheck = await client.query(
          'SELECT id FROM public."EvidenceFiles" WHERE id = ANY($1::uuid[])',
          [input.attachmentIds]
        );
        if (attachmentCheck.rows.length !== input.attachmentIds.length) {
          throw new Error('One or more attachments not found');
        }
      }

      const insertSql = `
        INSERT INTO public."ActivityPosts" (
          node_id, author_id, content, mentioned_node_ids, attachment_ids
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        input.nodeId,
        userId,
        input.content,
        input.mentionedNodeIds || [],
        input.attachmentIds || []
      ]);

      await client.query('COMMIT');

      const row = result.rows[0];
      return await this.enrichPost(row, pool, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reply to a post
   */
  @Mutation(() => ActivityPost)
  async replyToPost(
    @Arg('input') input: ReplyToPostInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost> {
    if (!userId) {
      throw new Error('Authentication required to reply to post');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate parent post exists and get its node_id
      const parentCheck = await client.query(
        'SELECT id, node_id FROM public."ActivityPosts" WHERE id = $1 AND deleted_at IS NULL',
        [input.parentPostId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error('Parent post not found');
      }

      const nodeId = parentCheck.rows[0].node_id;

      // Validate mentioned nodes exist
      if (input.mentionedNodeIds && input.mentionedNodeIds.length > 0) {
        const mentionCheck = await client.query(
          'SELECT id FROM public."Nodes" WHERE id = ANY($1::uuid[])',
          [input.mentionedNodeIds]
        );
        if (mentionCheck.rows.length !== input.mentionedNodeIds.length) {
          throw new Error('One or more mentioned nodes not found');
        }
      }

      const insertSql = `
        INSERT INTO public."ActivityPosts" (
          node_id, author_id, content, mentioned_node_ids, attachment_ids,
          is_reply, parent_post_id
        )
        VALUES ($1, $2, $3, $4, $5, TRUE, $6)
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeId,
        userId,
        input.content,
        input.mentionedNodeIds || [],
        input.attachmentIds || [],
        input.parentPostId
      ]);

      await client.query('COMMIT');

      const row = result.rows[0];
      return await this.enrichPost(row, pool, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error replying to post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Share a post
   */
  @Mutation(() => ActivityPost)
  async sharePost(
    @Arg('input') input: SharePostInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost> {
    if (!userId) {
      throw new Error('Authentication required to share post');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate original post exists and get its node_id
      const postCheck = await client.query(
        'SELECT id, node_id FROM public."ActivityPosts" WHERE id = $1 AND deleted_at IS NULL',
        [input.postId]
      );
      if (postCheck.rows.length === 0) {
        throw new Error('Post not found');
      }

      const nodeId = postCheck.rows[0].node_id;

      const insertSql = `
        INSERT INTO public."ActivityPosts" (
          node_id, author_id, content, is_share, shared_post_id
        )
        VALUES ($1, $2, $3, TRUE, $4)
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeId,
        userId,
        input.comment || '',
        input.postId
      ]);

      await client.query('COMMIT');

      const row = result.rows[0];
      return await this.enrichPost(row, pool, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sharing post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * React to a post (like, love, etc.)
   */
  @Mutation(() => Boolean)
  async reactToPost(
    @Arg('postId', () => ID) postId: string,
    @Arg('reactionType') reactionType: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to react to post');
    }

    try {
      // Validate post exists
      const postCheck = await pool.query(
        'SELECT id FROM public."ActivityPosts" WHERE id = $1 AND deleted_at IS NULL',
        [postId]
      );
      if (postCheck.rows.length === 0) {
        throw new Error('Post not found');
      }

      // Insert or update reaction (ON CONFLICT DO NOTHING for idempotency)
      const sql = `
        INSERT INTO public."ActivityReactions" (post_id, user_id, reaction_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING
      `;

      await pool.query(sql, [postId, userId, reactionType]);
      return true;
    } catch (error) {
      console.error('Error reacting to post:', error);
      throw new Error('Failed to react to post');
    }
  }

  /**
   * Remove reaction from a post
   */
  @Mutation(() => Boolean)
  async removeReaction(
    @Arg('postId', () => ID) postId: string,
    @Arg('reactionType') reactionType: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to remove reaction');
    }

    try {
      const sql = `
        DELETE FROM public."ActivityReactions"
        WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
      `;

      await pool.query(sql, [postId, userId, reactionType]);
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }

  /**
   * Delete a post (soft delete)
   */
  @Mutation(() => Boolean)
  async deletePost(
    @Arg('postId', () => ID) postId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to delete post');
    }

    try {
      // Check if user is the author
      const authCheck = await pool.query(
        'SELECT author_id FROM public."ActivityPosts" WHERE id = $1 AND deleted_at IS NULL',
        [postId]
      );

      if (authCheck.rows.length === 0) {
        throw new Error('Post not found');
      }

      if (authCheck.rows[0].author_id !== userId) {
        throw new Error('Only the author can delete this post');
      }

      const sql = `
        UPDATE public."ActivityPosts"
        SET deleted_at = NOW()
        WHERE id = $1
      `;

      await pool.query(sql, [postId]);
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapRowToActivityPost(row: any): ActivityPost {
    return {
      id: row.id,
      node_id: row.node_id,
      node: row.node_title ? {
        id: row.node_id,
        title: row.node_title
      } as any : undefined,
      author_id: row.author_id,
      author: row.author_username ? {
        id: row.author_id,
        username: row.author_username,
        email: row.author_email
      } as any : undefined,
      content: row.content,
      mentioned_node_ids: row.mentioned_node_ids || [],
      attachment_ids: row.attachment_ids || [],
      is_reply: row.is_reply,
      parent_post_id: row.parent_post_id,
      is_share: row.is_share,
      shared_post_id: row.shared_post_id,
      replyCount: parseInt(row.reply_count) || 0,
      shareCount: parseInt(row.share_count) || 0,
      reactionCounts: JSON.stringify(row.reaction_counts || {}),
      totalReactionCount: parseInt(row.total_reaction_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      userReactions: row.user_reactions || []
    };
  }

  private async enrichPost(row: any, pool: any, userId?: string): Promise<ActivityPost> {
    const sql = `
      SELECT
        p.*,
        u.username as author_username,
        u.email as author_email,
        n.title as node_title,
        get_reply_count(p.id) as reply_count,
        get_share_count(p.id) as share_count,
        get_reaction_counts(p.id) as reaction_counts,
        (
          SELECT COUNT(*)::int
          FROM public."ActivityReactions" ar
          WHERE ar.post_id = p.id
        ) as total_reaction_count
        ${userId ? `, (
          SELECT array_agg(reaction_type)
          FROM public."ActivityReactions"
          WHERE post_id = p.id AND user_id = $2
        ) as user_reactions` : ''}
      FROM public."ActivityPosts" p
      INNER JOIN public."Users" u ON p.author_id = u.id
      INNER JOIN public."Nodes" n ON p.node_id = n.id
      WHERE p.id = $1
    `;

    const params = userId ? [row.id, userId] : [row.id];
    const result = await pool.query(sql, params);

    return this.mapRowToActivityPost(result.rows[0]);
  }
}
