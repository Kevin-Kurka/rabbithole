import { Resolver, Mutation, Arg, Ctx, PubSub, Subscription, Root, Query, FieldResolver, ID, Int } from 'type-graphql';
import { Comment, User, Notification } from '../types/GraphTypes';
import { CommentInput } from './GraphInput';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { NotificationService, NOTIFICATION_CREATED } from '../services/NotificationService';

const NEW_COMMENT = "NEW_COMMENT";

@Resolver(Comment)
export class CommentResolver {
  @Mutation(() => Comment)
  async createComment(
    @Arg("input") { targetId, text, parentCommentId }: CommentInput,
    @Ctx() { pool, pubSub, notificationService }: {
      pool: Pool,
      pubSub: PubSubEngine,
      notificationService: NotificationService
    },
    @Ctx() { user }: { user: User }
  ): Promise<Comment> {
    // Determine if target is a node or edge
    const nodeCheck = await pool.query(
      'SELECT id FROM public."Nodes" WHERE id = $1',
      [targetId]
    );
    const isNode = nodeCheck.rows.length > 0;

    const edgeCheck = isNode ? null : await pool.query(
      'SELECT id FROM public."Edges" WHERE id = $1',
      [targetId]
    );
    const isEdge = edgeCheck?.rows.length ?? 0 > 0;

    if (!isNode && !isEdge) {
      throw new Error('Target entity not found');
    }

    // Get or create 'Comment' node type
    let nodeTypeId;
    const typeRes = await pool.query('SELECT id FROM public."NodeTypes" WHERE name = $1', ['Comment']);
    if (typeRes.rows.length > 0) {
      nodeTypeId = typeRes.rows[0].id;
    } else {
      const newType = await pool.query(`INSERT INTO public."NodeTypes" (name) VALUES ('Comment') RETURNING id`);
      nodeTypeId = newType.rows[0].id;
    }

    // Create Comment Node
    const props = {
      content: text,
      createdBy: user.id,
      targetId: targetId,
      targetType: isNode ? 'node' : 'edge',
      parentCommentId: parentCommentId || null
    };

    const nodeResult = await pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [nodeTypeId, JSON.stringify(props)]
    );
    const commentNode = nodeResult.rows[0];

    // If target is a Node, create an edge: Target -> Comment
    if (isNode) {
      // Get or create 'has_comment' edge type
      let edgeTypeId;
      const edgeTypeRes = await pool.query('SELECT id FROM public."EdgeTypes" WHERE name = $1', ['has_comment']);
      if (edgeTypeRes.rows.length > 0) {
        edgeTypeId = edgeTypeRes.rows[0].id;
      } else {
        const newEdgeType = await pool.query(`INSERT INTO public."EdgeTypes" (name) VALUES ('has_comment') RETURNING id`);
        edgeTypeId = newEdgeType.rows[0].id;
      }

      await pool.query(
        `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [edgeTypeId, targetId, commentNode.id, JSON.stringify({})]
      );
    }

    // If parentCommentId exists, create edge: Parent -> Child
    if (parentCommentId) {
      // Get or create 'has_reply' edge type (or reuse has_comment?)
      // Let's reuse 'has_comment' for simplicity, or 'has_reply' for clarity.
      // Using 'has_reply'
      let replyEdgeTypeId;
      const replyTypeRes = await pool.query('SELECT id FROM public."EdgeTypes" WHERE name = $1', ['has_reply']);
      if (replyTypeRes.rows.length > 0) {
        replyEdgeTypeId = replyTypeRes.rows[0].id;
      } else {
        const newReplyType = await pool.query(`INSERT INTO public."EdgeTypes" (name) VALUES ('has_reply') RETURNING id`);
        replyEdgeTypeId = newReplyType.rows[0].id;
      }

      await pool.query(
        `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [replyEdgeTypeId, parentCommentId, commentNode.id, JSON.stringify({})]
      );
    }

    // Construct return object
    const newComment = {
      id: commentNode.id,
      text: text,
      created_at: commentNode.created_at,
      createdBy: user.id,
      author: user,
      parentCommentId: parentCommentId
    };

    // Parse @mentions and create notifications
    const mentions = notificationService.parseMentions(text);
    if (mentions.length > 0) {
      const mentionedUserIds = await notificationService.getUserIdsByUsernames(mentions);
      await notificationService.notifyMentionedUsers(
        text,
        mentionedUserIds,
        user.id,
        user.username,
        isNode ? 'node' : 'edge',
        targetId
      );
    }

    // If this is a reply, notify the parent comment author
    if (parentCommentId) {
      const parentNode = await pool.query(
        'SELECT props FROM public."Nodes" WHERE id = $1',
        [parentCommentId]
      );

      if (parentNode.rows.length > 0) {
        const parentProps = typeof parentNode.rows[0].props === 'string'
          ? JSON.parse(parentNode.rows[0].props)
          : parentNode.rows[0].props;

        if (parentProps.createdBy) {
          await notificationService.notifyCommentReply(
            parentProps.createdBy,
            user.id,
            user.username,
            text,
            isNode ? 'node' : 'edge',
            targetId
          );
        }
      }
    }

    // Publish comment
    await pubSub.publish(NEW_COMMENT, newComment);

    return newComment;
  }

  @Query(() => [Comment])
  async getComments(
    @Arg("targetId", () => ID) targetId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Comment[]> {
    // Check if target is node or edge
    // If node, query edges. If edge, query props.
    // Actually, we can just query props for both to be safe if we stored targetId in props.
    // But edges are faster/better for nodes.

    // Let's try querying via edges first (for nodes)
    const edgeComments = await pool.query(
      `SELECT n.*, n.props->>'content' as content, n.props->>'createdBy' as createdBy,
              u.id as author_id, u.username, u.email, u.created_at as author_created_at
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       JOIN public."Edges" e ON e.target_node_id = n.id
       LEFT JOIN public."Users" u ON (n.props->>'createdBy')::uuid = u.id
       WHERE nt.name = 'Comment' 
       AND e.source_node_id = $1
       ORDER BY n.created_at ASC`,
      [targetId]
    );

    // Also query by props (for edges or if edge missing)
    const propComments = await pool.query(
      `SELECT n.*, n.props->>'content' as content, n.props->>'createdBy' as createdBy,
              u.id as author_id, u.username, u.email, u.created_at as author_created_at
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       LEFT JOIN public."Users" u ON (n.props->>'createdBy')::uuid = u.id
       WHERE nt.name = 'Comment' 
       AND n.props->>'targetId' = $1
       ORDER BY n.created_at ASC`,
      [targetId]
    );

    // Merge and deduplicate
    const allRows = [...edgeComments.rows, ...propComments.rows];
    const seen = new Set();
    const uniqueRows = allRows.filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    // Sort again
    uniqueRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return uniqueRows.map(row => ({
      id: row.id,
      text: row.content,
      parentCommentId: row.props.parentCommentId,
      created_at: row.created_at,
      createdBy: row.createdBy,
      author: {
        id: row.author_id,
        username: row.username,
        email: row.email,
        created_at: row.author_created_at,
        updated_at: row.author_created_at
      } as any
    }));
  }

  @FieldResolver(() => [Comment])
  async replies(
    @Root() comment: Comment,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<Comment[]> {
    // Query replies via edges (Parent -> Child)
    const result = await pool.query(
      `SELECT n.*, n.props->>'content' as content, n.props->>'createdBy' as createdBy,
              u.id as author_id, u.username, u.email, u.created_at as author_created_at
       FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       JOIN public."Edges" e ON e.target_node_id = n.id
       LEFT JOIN public."Users" u ON (n.props->>'createdBy')::uuid = u.id
       WHERE nt.name = 'Comment' 
       AND e.source_node_id = $1
       ORDER BY n.created_at ASC`,
      [comment.id]
    );

    return result.rows.map(row => ({
      id: row.id,
      text: row.content,
      parentCommentId: comment.id,
      created_at: row.created_at,
      createdBy: row.createdBy,
      author: {
        id: row.author_id,
        username: row.username,
        email: row.email,
        created_at: row.author_created_at,
        updated_at: row.author_created_at
      } as any
    }));
  }

  @Query(() => [Notification])
  async getNotifications(
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Arg("unreadOnly", { defaultValue: false }) unreadOnly: boolean,
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<Notification[]> {
    return notificationService.getUserNotifications(user.id, limit, offset, unreadOnly);
  }

  @Query(() => Int)
  async getUnreadNotificationCount(
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<number> {
    return notificationService.getUnreadCount(user.id);
  }

  @Mutation(() => Notification)
  async markNotificationAsRead(
    @Arg("notificationId", () => ID) notificationId: string,
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<Notification | null> {
    return notificationService.markAsRead(notificationId, user.id);
  }

  @Mutation(() => Int)
  async markAllNotificationsAsRead(
    @Ctx() { notificationService }: { notificationService: NotificationService },
    @Ctx() { user }: { user: User }
  ): Promise<number> {
    return notificationService.markAllAsRead(user.id);
  }

  @Subscription(() => Comment, {
    topics: NEW_COMMENT,
  })
  newComment(@Root() comment: Comment): Comment {
    return comment;
  }

  @Subscription(() => Notification, {
    topics: ({ context }) => `${NOTIFICATION_CREATED}_${context.user.id}`,
  })
  notificationCreated(@Root() notification: Notification): Notification {
    return notification;
  }
}
