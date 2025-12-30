import { Resolver, Query, Mutation, Arg, Ctx, ID, Int } from 'type-graphql';
import {
  ActivityPost,
  CreatePostInput,
  ReplyToPostInput,
  SharePostInput
} from '../types/GraphTypes';
import { Context } from '../types/context';

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

// Cache for node type IDs
const nodeTypeCache: Map<string, string> = new Map();

async function getNodeTypeId(pool: any, name: string): Promise<string | null> {
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

/**
 * PostActivityResolver
 *
 * GraphQL resolver for activity posts/timeline features
 *
 * ARCHITECTURE: Uses strict 4-table graph database (node_types, edge_types, nodes, edges)
 * All data stored in JSONB props field - no standalone tables.
 */
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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!activityPostTypeId) {
        console.warn('ActivityPost node type not found');
        return [];
      }

      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.props->>'username' as author_username,
          u.props->>'email' as author_email,
          tn.props->>'title' as node_title
        FROM nodes n
        LEFT JOIN nodes u ON (n.props->>'authorId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
        LEFT JOIN nodes tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE n.node_type_id = $1
        AND n.props->>'nodeId' = $2
        AND (n.props->>'deletedAt') IS NULL
        AND (n.props->>'isReply')::boolean IS NOT TRUE
        ORDER BY n.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const params = [activityPostTypeId, nodeId, limit, offset];
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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!activityPostTypeId) {
        return null;
      }

      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.props->>'username' as author_username,
          u.props->>'email' as author_email,
          tn.props->>'title' as node_title
        FROM nodes n
        LEFT JOIN nodes u ON (n.props->>'authorId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
        LEFT JOIN nodes tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE n.id = $1
        AND n.node_type_id = $2
        AND (n.props->>'deletedAt') IS NULL
      `;

      const result = await pool.query(sql, [postId, activityPostTypeId]);

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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!activityPostTypeId) {
        return [];
      }

      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.props->>'username' as author_username,
          u.props->>'email' as author_email,
          tn.props->>'title' as node_title
        FROM nodes n
        LEFT JOIN nodes u ON (n.props->>'authorId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
        LEFT JOIN nodes tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE n.node_type_id = $1
        AND n.props->>'parentPostId' = $2
        AND (n.props->>'deletedAt') IS NULL
        ORDER BY n.created_at ASC
        LIMIT $3
      `;

      const result = await pool.query(sql, [activityPostTypeId, postId, limit]);

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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');
      const userTypeId = await getNodeTypeId(pool, 'User');

      if (!activityPostTypeId) {
        return [];
      }

      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          n.updated_at,
          u.props->>'username' as author_username,
          u.props->>'email' as author_email,
          tn.props->>'title' as node_title
        FROM nodes n
        LEFT JOIN nodes u ON (n.props->>'authorId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
        LEFT JOIN nodes tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE n.node_type_id = $1
        AND (n.props->>'deletedAt') IS NULL
        AND (
          n.props->>'authorId' = $2
          OR n.props->'mentionedNodeIds' @> to_jsonb($2::text)
        )
        ORDER BY n.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await pool.query(sql, [activityPostTypeId, feedUserId, limit, offset]);

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
      const nodeTypeId = await getNodeTypeId(pool, 'ActivityPost');
      if (!nodeTypeId) {
        throw new Error('ActivityPost node type not found');
      }

      // Validate node exists (the timeline node)
      const nodeCheck = await client.query(
        'SELECT id FROM nodes WHERE id = $1',
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
        INSERT INTO nodes (
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
      const nodeTypeId = await getNodeTypeId(pool, 'ActivityPost');
      if (!nodeTypeId) {
        throw new Error('ActivityPost node type not found');
      }

      // Validate parent post exists
      const parentCheck = await client.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2 AND (props->>'deletedAt') IS NULL`,
        [input.parentPostId, nodeTypeId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error('Parent post not found');
      }
      const parentProps = parseProps(parentCheck.rows[0].props);
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
        INSERT INTO nodes (
          node_type_id, props, created_at, updated_at
        )
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        nodeTypeId,
        JSON.stringify(props)
      ]);

      // Update parent reply count
      const parentPropsUpdated = { ...parentProps, replyCount: (parentProps.replyCount || 0) + 1 };
      await client.query(
        `UPDATE nodes SET props = $1, updated_at = NOW() WHERE id = $2`,
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

      const nodeTypeId = await getNodeTypeId(pool, 'ActivityPost');
      if (!nodeTypeId) {
        throw new Error('ActivityPost node type not found');
      }

      // Validate original post
      const postCheck = await client.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2 AND (props->>'deletedAt') IS NULL`,
        [input.postId, nodeTypeId]
      );
      if (postCheck.rows.length === 0) {
        throw new Error('Post not found');
      }
      const originalProps = parseProps(postCheck.rows[0].props);
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
        INSERT INTO nodes (
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
        `UPDATE nodes SET props = $1, updated_at = NOW() WHERE id = $2`,
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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');

      const result = await pool.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2 AND (props->>'deletedAt') IS NULL`,
        [postId, activityPostTypeId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = parseProps(node.props);

      if (!props.reactions) props.reactions = {};
      props.reactions[userId] = reactionType;

      await pool.query(
        `UPDATE nodes SET props = $1, updated_at = NOW() WHERE id = $2`,
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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');

      const result = await pool.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2 AND (props->>'deletedAt') IS NULL`,
        [postId, activityPostTypeId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = parseProps(node.props);

      if (props.reactions && props.reactions[userId] === reactionType) {
        delete props.reactions[userId];
        await pool.query(
          `UPDATE nodes SET props = $1, updated_at = NOW() WHERE id = $2`,
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
      const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');

      const result = await pool.query(
        `SELECT id, props FROM nodes WHERE id = $1 AND node_type_id = $2 AND (props->>'deletedAt') IS NULL`,
        [postId, activityPostTypeId]
      );
      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = parseProps(node.props);

      if (props.authorId !== userId) {
        throw new Error('Only the author can delete this post');
      }

      props.deletedAt = new Date().toISOString();

      await pool.query(
        `UPDATE nodes SET props = $1, updated_at = NOW() WHERE id = $2`,
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
    const props = parseProps(row.props);

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
    const activityPostTypeId = await getNodeTypeId(pool, 'ActivityPost');
    const userTypeId = await getNodeTypeId(pool, 'User');

    const sql = `
      SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at,
        u.props->>'username' as author_username,
        u.props->>'email' as author_email,
        tn.props->>'title' as node_title
      FROM nodes n
      LEFT JOIN nodes u ON (n.props->>'authorId')::uuid = u.id ${userTypeId ? `AND u.node_type_id = '${userTypeId}'` : ''}
      LEFT JOIN nodes tn ON (n.props->>'nodeId')::uuid = tn.id
      WHERE n.id = $1 AND n.node_type_id = $2
    `;

    const result = await pool.query(sql, [postId, activityPostTypeId]);
    return this.mapRowToActivityPost(result.rows[0], userId);
  }
}
