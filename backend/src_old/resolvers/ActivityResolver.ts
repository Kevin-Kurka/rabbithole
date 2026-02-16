import { Resolver, Query, Mutation, Arg, Ctx, ID, Int } from 'type-graphql';
import {
  ActivityPost,
  CreatePostInput,
  ReplyToPostInput,
  SharePostInput
} from '../types/GraphTypes';
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
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.username as author_username,
          u.email as author_email,
          tn.title as node_title
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE nt.name = 'ActivityPost'
        AND n.props->>'nodeId' = $1
        AND (n.props->>'deletedAt') IS NULL
        AND (n.props->>'isReply')::boolean IS NOT TRUE
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const params = [nodeId, limit, offset];
      const result = await pool.query(sql, params);

      return result.rows.map(row => this.mapRowToActivityPost(row, userId));
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
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.username as author_username,
          u.email as author_email,
          tn.title as node_title
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE n.id = $1
        AND nt.name = 'ActivityPost'
        AND (n.props->>'deletedAt') IS NULL
      `;

      const result = await pool.query(sql, [postId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToActivityPost(result.rows[0], userId);
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
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.username as author_username,
          u.email as author_email,
          tn.title as node_title
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE nt.name = 'ActivityPost'
        AND n.props->>'parentPostId' = $1
        AND (n.props->>'deletedAt') IS NULL
        ORDER BY n.created_at ASC
        LIMIT $2
      `;

      const result = await pool.query(sql, [postId, limit]);

      return result.rows.map(row => this.mapRowToActivityPost(row, userId));
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
      // This query is a bit complex with JSONB.
      // We want posts where authorId = feedUserId OR feedUserId is in mentionedNodeIds
      // Note: mentionedNodeIds in props is a JSON array of strings.
      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.username as author_username,
          u.email as author_email,
          tn.title as node_title
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE nt.name = 'ActivityPost'
        AND (n.props->>'deletedAt') IS NULL
        AND (
          n.props->>'authorId' = $1
          OR n.props->'mentionedNodeIds' @> to_jsonb($1::text)
        )
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(sql, [feedUserId, limit, offset]);

      return result.rows.map(row => this.mapRowToActivityPost(row, userId));
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

      // Get ActivityPost node type id
      const typeRes = await client.query(`SELECT id FROM public."NodeTypes" WHERE name = 'ActivityPost'`);
      if (typeRes.rows.length === 0) {
        throw new Error('ActivityPost node type not found');
      }
      const nodeTypeId = typeRes.rows[0].id;

      // Validate node exists (the timeline node)
      const nodeCheck = await client.query(
        'SELECT id FROM public."Nodes" WHERE id = $1',
        [input.nodeId]
      );
      if (nodeCheck.rows.length === 0) {
        throw new Error('Node not found');
      }

      // Construct props
      const props = {
        nodeId: input.nodeId,
        authorId: userId,
        content: input.content,
        mentionedNodeIds: input.mentionedNodeIds || [],
        attachmentIds: input.attachmentIds || [],
        isReply: false,
        isShare: false,
        reactions: {},
        replyCount: 0,
        shareCount: 0
      };

      const insertSql = `
        INSERT INTO public."Nodes" (
          node_type_id, props, created_at, updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeTypeId,
        JSON.stringify(props)
      ]);

      await client.query('COMMIT');

      const row = result.rows[0];
      // Fetch enriched data
      return await this.enrichPost(row.id, pool, userId);
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

      // Get ActivityPost node type id
      const typeRes = await client.query(`SELECT id FROM public."NodeTypes" WHERE name = 'ActivityPost'`);
      const nodeTypeId = typeRes.rows[0].id;

      // Validate parent post exists
      const parentCheck = await client.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [input.parentPostId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error('Parent post not found');
      }
      const parentProps = parentCheck.rows[0].props;
      const nodeId = parentProps.nodeId; // Same timeline as parent

      // Construct props
      const props = {
        nodeId: nodeId,
        authorId: userId,
        content: input.content,
        mentionedNodeIds: input.mentionedNodeIds || [],
        attachmentIds: input.attachmentIds || [],
        isReply: true,
        parentPostId: input.parentPostId,
        isShare: false,
        reactions: {},
        replyCount: 0,
        shareCount: 0
      };

      const insertSql = `
        INSERT INTO public."Nodes" (
          node_type_id, props, created_at, updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeTypeId,
        JSON.stringify(props)
      ]);

      // Update parent reply count (optional, but good for perf if we store it)
      // For now, we calculate it on read or we can increment it here.
      // Let's increment it in props for the parent.
      const parentPropsUpdated = { ...parentProps, replyCount: (parentProps.replyCount || 0) + 1 };
      await client.query(
        `UPDATE public."Nodes" SET props = $1 WHERE id = $2`,
        [JSON.stringify(parentPropsUpdated), input.parentPostId]
      );

      await client.query('COMMIT');

      return await this.enrichPost(result.rows[0].id, pool, userId);
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

      const typeRes = await client.query(`SELECT id FROM public."NodeTypes" WHERE name = 'ActivityPost'`);
      const nodeTypeId = typeRes.rows[0].id;

      // Validate original post
      const postCheck = await client.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [input.postId]
      );
      if (postCheck.rows.length === 0) {
        throw new Error('Post not found');
      }
      const originalProps = postCheck.rows[0].props;
      const nodeId = originalProps.nodeId;

      const props = {
        nodeId: nodeId,
        authorId: userId,
        content: input.comment || '',
        isReply: false,
        isShare: true,
        sharedPostId: input.postId,
        mentionedNodeIds: [],
        attachmentIds: [],
        reactions: {},
        replyCount: 0,
        shareCount: 0
      };

      const insertSql = `
        INSERT INTO public."Nodes" (
          node_type_id, props, created_at, updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeTypeId,
        JSON.stringify(props)
      ]);

      // Update original post share count
      const originalPropsUpdated = { ...originalProps, shareCount: (originalProps.shareCount || 0) + 1 };
      await client.query(
        `UPDATE public."Nodes" SET props = $1 WHERE id = $2`,
        [JSON.stringify(originalPropsUpdated), input.postId]
      );

      await client.query('COMMIT');

      return await this.enrichPost(result.rows[0].id, pool, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sharing post:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * React to a post
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
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [postId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (!props.reactions) props.reactions = {};
      props.reactions[userId] = reactionType;

      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), postId]
      );

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
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [postId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (props.reactions && props.reactions[userId] === reactionType) {
        delete props.reactions[userId];
        await pool.query(
          `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(props), postId]
        );
      }

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
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [postId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (props.authorId !== userId) {
        throw new Error('Only the author can delete this post');
      }

      props.deletedAt = new Date().toISOString();

      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), postId]
      );

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapRowToActivityPost(row: any, currentUserId?: string): ActivityPost {
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

    // Calculate reaction counts
    const reactions = props.reactions || {};
    const reactionCounts: Record<string, number> = {};
    let totalReactionCount = 0;
    const userReactions: string[] = [];

    Object.entries(reactions).forEach(([uid, type]) => {
      const t = type as string;
      reactionCounts[t] = (reactionCounts[t] || 0) + 1;
      totalReactionCount++;
      if (currentUserId && uid === currentUserId) {
        userReactions.push(t);
      }
    });

    return {
      id: row.id,
      node_id: props.nodeId,
      node: row.node_title ? {
        id: props.nodeId,
        title: row.node_title
      } as any : undefined,
      author_id: props.authorId,
      author: row.author_username ? {
        id: props.authorId,
        username: row.author_username,
        email: row.author_email
      } as any : undefined,
      content: props.content,
      mentioned_node_ids: props.mentionedNodeIds || [],
      attachment_ids: props.attachmentIds || [],
      is_reply: !!props.isReply,
      parent_post_id: props.parentPostId,
      is_share: !!props.isShare,
      shared_post_id: props.sharedPostId,
      replyCount: props.replyCount || 0,
      shareCount: props.shareCount || 0,
      reactionCounts: JSON.stringify(reactionCounts),
      totalReactionCount,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: props.deletedAt,
      userReactions
    };
  }

  private async enrichPost(postId: string, pool: any, userId?: string): Promise<ActivityPost> {
    const sql = `
      SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at,
        u.username as author_username,
        u.email as author_email,
        tn.title as node_title
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
      LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
      WHERE n.id = $1
    `;

    const result = await pool.query(sql, [postId]);
    return this.mapRowToActivityPost(result.rows[0], userId);
  }
}
