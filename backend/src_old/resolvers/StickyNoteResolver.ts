import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  ID,
  Int,
  Float,
  InputType,
  Field,
  ObjectType,
} from 'type-graphql';
import { ActivityPost } from '../types/GraphTypes';
import { Context } from '../types/context';
import { GraphQLJSONObject } from 'graphql-type-json';

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class StickyNoteStyleInput {
  @Field()
  color!: string; // 'yellow', 'blue', 'green', 'pink', 'orange'

  @Field()
  size!: string; // 'small', 'medium', 'large'
}

@InputType()
class StickyNotePositionInput {
  @Field(() => ID)
  anchorNodeId!: string;

  @Field({ nullable: true })
  offsetX?: number;

  @Field({ nullable: true })
  offsetY?: number;

  @Field({ nullable: true })
  preferredSide?: string; // 'top', 'right', 'bottom', 'left'
}

@InputType()
class CreateStickyNoteInput {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  content!: string;

  @Field(() => StickyNoteStyleInput, { nullable: true })
  style?: StickyNoteStyleInput;

  @Field(() => StickyNotePositionInput, { nullable: true })
  position?: StickyNotePositionInput;

  @Field(() => [ID], { nullable: true })
  mentionedNodeIds?: string[];
}

@InputType()
class UpdateStickyNoteStyleInput {
  @Field(() => ID)
  postId!: string;

  @Field(() => StickyNoteStyleInput)
  style!: StickyNoteStyleInput;
}

@InputType()
class AddReactionInput {
  @Field(() => ID)
  postId!: string;

  @Field()
  reactionType!: string; // 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

@ObjectType()
class StickyNotePosition {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float)
  zIndex!: number; // Calculated from parent credibility + 0.001
}

@ObjectType()
class StickyNoteData {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  nodeId!: string;

  @Field()
  content!: string;

  @Field(() => GraphQLJSONObject)
  style!: any;

  @Field(() => StickyNotePosition)
  position!: StickyNotePosition;

  @Field()
  authorName!: string;

  @Field(() => Int)
  replyCount!: number;

  @Field(() => GraphQLJSONObject)
  reactionCounts!: any;

  @Field()
  createdAt!: Date;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver(() => ActivityPost)
export class StickyNoteResolver {
  /**
   * Calculate auto-position for sticky note relative to anchor node
   */
  private calculateAutoPosition(
    anchorNodePosition: { x: number; y: number },
    anchorCredibility: number,
    preferredSide: string = 'right',
    offsetX: number = 0,
    offsetY: number = 0
  ): StickyNotePosition {
    const noteWidth = 200; // Default sticky note width
    const noteHeight = 150; // Default sticky note height
    const gap = 20; // Gap between node and sticky note

    let x = anchorNodePosition.x;
    let y = anchorNodePosition.y;

    // Position based on preferred side
    switch (preferredSide) {
      case 'top':
        y -= noteHeight + gap;
        break;
      case 'bottom':
        y += noteHeight + gap;
        break;
      case 'left':
        x -= noteWidth + gap;
        break;
      case 'right':
      default:
        x += noteWidth + gap;
        break;
    }

    // Apply custom offsets
    x += offsetX;
    y += offsetY;

    // Calculate z-index: parent credibility + 0.001
    const zIndex = anchorCredibility + 0.001;

    return { x, y, zIndex };
  }

  /**
   * Get all sticky notes for a graph (for canvas rendering)
   */
  @Query(() => [StickyNoteData])
  async getStickyNotesForGraph(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<StickyNoteData[]> {
    try {
      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          u.username as author_name,
          tn.props->>'position' as node_position,
          tn.weight as node_credibility
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE nt.name = 'ActivityPost'
        AND (tn.props->>'graphId')::uuid = $1
        AND (n.props->>'deletedAt') IS NULL
        AND (n.props->>'isReply')::boolean IS NOT TRUE
        ORDER BY n.created_at DESC
      `;

      const result = await pool.query(sql, [graphId]);

      return result.rows.map((row) => {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
        const canvasProps = props.canvasProps || {};
        const style = canvasProps.style || { color: 'yellow', size: 'medium' };

        // Parse node position
        let nodePosition = { x: 100, y: 100 };
        if (row.node_position) {
          try {
            nodePosition = typeof row.node_position === 'string' ? JSON.parse(row.node_position) : row.node_position;
          } catch (e) {
            console.error('Error parsing node position:', e);
          }
        }

        // Calculate or use existing position
        let position: StickyNotePosition;
        if (canvasProps.autoPosition) {
          position = this.calculateAutoPosition(
            nodePosition,
            row.node_credibility || 0.5,
            canvasProps.autoPosition.preferredSide,
            canvasProps.autoPosition.offset?.x || 0,
            canvasProps.autoPosition.offset?.y || 0
          );
        } else {
          position = {
            x: nodePosition.x + 250,
            y: nodePosition.y,
            zIndex: (row.node_credibility || 0.5) + 0.001,
          };
        }

        // Calculate reaction counts
        const reactions = props.reactions || {};
        const reactionCounts: Record<string, number> = {};
        Object.values(reactions).forEach((type: any) => {
          reactionCounts[type] = (reactionCounts[type] || 0) + 1;
        });

        return {
          id: row.id,
          nodeId: props.nodeId,
          content: props.content,
          style,
          position,
          authorName: row.author_name,
          replyCount: props.replyCount || 0,
          reactionCounts,
          createdAt: row.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching sticky notes:', error);
      throw new Error('Failed to fetch sticky notes');
    }
  }

  /**
   * Get sticky notes for a specific node
   */
  @Query(() => [StickyNoteData])
  async getStickyNotesForNode(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<StickyNoteData[]> {
    try {
      const sql = `
        SELECT
          n.id,
          n.props,
          n.created_at,
          u.username as author_name,
          tn.props->>'position' as node_position,
          tn.weight as node_credibility
        FROM public."Nodes" n
        JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
        LEFT JOIN public."Users" u ON (n.props->>'authorId')::uuid = u.id
        LEFT JOIN public."Nodes" tn ON (n.props->>'nodeId')::uuid = tn.id
        WHERE nt.name = 'ActivityPost'
        AND n.props->>'nodeId' = $1
        AND (n.props->>'deletedAt') IS NULL
        AND (n.props->>'isReply')::boolean IS NOT TRUE
        ORDER BY n.created_at DESC
      `;

      const result = await pool.query(sql, [nodeId]);

      return result.rows.map((row) => {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
        const canvasProps = props.canvasProps || {};
        const style = canvasProps.style || { color: 'yellow', size: 'medium' };

        let nodePosition = { x: 100, y: 100 };
        if (row.node_position) {
          try {
            nodePosition = typeof row.node_position === 'string' ? JSON.parse(row.node_position) : row.node_position;
          } catch (e) {
            console.error('Error parsing node position:', e);
          }
        }

        let position: StickyNotePosition;
        if (canvasProps.autoPosition) {
          position = this.calculateAutoPosition(
            nodePosition,
            row.node_credibility || 0.5,
            canvasProps.autoPosition.preferredSide,
            canvasProps.autoPosition.offset?.x || 0,
            canvasProps.autoPosition.offset?.y || 0
          );
        } else {
          position = {
            x: nodePosition.x + 250,
            y: nodePosition.y,
            zIndex: (row.node_credibility || 0.5) + 0.001,
          };
        }

        const reactions = props.reactions || {};
        const reactionCounts: Record<string, number> = {};
        Object.values(reactions).forEach((type: any) => {
          reactionCounts[type] = (reactionCounts[type] || 0) + 1;
        });

        return {
          id: row.id,
          nodeId: props.nodeId,
          content: props.content,
          style,
          position,
          authorName: row.author_name,
          replyCount: props.replyCount || 0,
          reactionCounts,
          createdAt: row.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching sticky notes for node:', error);
      throw new Error('Failed to fetch sticky notes for node');
    }
  }

  /**
   * Create a sticky note
   */
  @Mutation(() => ActivityPost)
  async createStickyNote(
    @Arg('input') input: CreateStickyNoteInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost> {
    if (!userId) {
      throw new Error('Authentication required to create sticky note');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const typeRes = await client.query(`SELECT id FROM public."NodeTypes" WHERE name = 'ActivityPost'`);
      if (typeRes.rows.length === 0) {
        throw new Error('ActivityPost node type not found');
      }
      const nodeTypeId = typeRes.rows[0].id;

      // Validate node exists
      const nodeCheck = await client.query(
        'SELECT id FROM public."Nodes" WHERE id = $1',
        [input.nodeId]
      );
      if (nodeCheck.rows.length === 0) {
        throw new Error('Node not found');
      }

      // Build canvas_props
      const canvasProps = {
        style: input.style || { color: 'yellow', size: 'medium' },
        autoPosition: input.position || {
          anchorNodeId: input.nodeId,
          offset: { x: 0, y: 0 },
          preferredSide: 'right',
        },
        zIndexOffset: 0.001,
      };

      const props = {
        nodeId: input.nodeId,
        authorId: userId,
        content: input.content,
        mentionedNodeIds: input.mentionedNodeIds || [],
        attachmentIds: [],
        isReply: false,
        isShare: false,
        reactions: {},
        replyCount: 0,
        shareCount: 0,
        canvasProps
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

      // Return ActivityPost structure (simplified for sticky note return if needed, but here we return ActivityPost)
      // The resolver returns ActivityPost, so we need to map it.
      // But wait, the mutation returns ActivityPost.
      // I should reuse the mapping logic or just return the props + id.
      const row = result.rows[0];
      const p = props;
      return {
        id: row.id,
        node_id: p.nodeId,
        author_id: p.authorId,
        content: p.content,
        mentioned_node_ids: p.mentionedNodeIds,
        attachment_ids: [],
        is_reply: false,
        is_share: false,
        replyCount: 0,
        shareCount: 0,
        reactionCounts: "{}",
        totalReactionCount: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        userReactions: []
      } as any; // Cast to any to avoid strict type checking for optional fields if I missed some
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating sticky note:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update sticky note style
   */
  @Mutation(() => ActivityPost)
  async updateStickyNoteStyle(
    @Arg('input') input: UpdateStickyNoteStyleInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ActivityPost> {
    if (!userId) {
      throw new Error('Authentication required to update sticky note');
    }

    try {
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [input.postId]
      );

      if (result.rows.length === 0) {
        throw new Error('Sticky note not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (props.authorId !== userId) {
        throw new Error('Only the author can update sticky note style');
      }

      const currentCanvasProps = props.canvasProps || {};
      props.canvasProps = {
        ...currentCanvasProps,
        style: input.style,
      };

      const updateResult = await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(props), input.postId]
      );

      const row = updateResult.rows[0];
      return {
        id: row.id,
        node_id: props.nodeId,
        author_id: props.authorId,
        content: props.content,
        mentioned_node_ids: props.mentionedNodeIds || [],
        attachment_ids: props.attachmentIds || [],
        is_reply: !!props.isReply,
        is_share: !!props.isShare,
        replyCount: props.replyCount || 0,
        shareCount: props.shareCount || 0,
        reactionCounts: JSON.stringify(props.reactions || {}), // Simplified
        totalReactionCount: 0, // Simplified
        created_at: row.created_at,
        updated_at: row.updated_at,
        userReactions: []
      } as any;
    } catch (error) {
      console.error('Error updating sticky note style:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a post/sticky note
   */
  @Mutation(() => Boolean)
  async addReaction(
    @Arg('input') input: AddReactionInput,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to add reaction');
    }

    try {
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [input.postId]
      );

      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (!props.reactions) props.reactions = {};
      props.reactions[userId] = input.reactionType;

      await pool.query(
        `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(props), input.postId]
      );

      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  /**
   * Remove reaction from a post/sticky note
   */
  @Mutation(() => Boolean)
  async removeReaction(
    @Arg('input') input: AddReactionInput,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to remove reaction');
    }

    try {
      const result = await pool.query(
        `SELECT id, props FROM public."Nodes" WHERE id = $1 AND (props->>'deletedAt') IS NULL`,
        [input.postId]
      );

      if (result.rows.length === 0) {
        throw new Error('Post not found');
      }

      const node = result.rows[0];
      const props = node.props;

      if (props.reactions && props.reactions[userId] === input.reactionType) {
        delete props.reactions[userId];
        await pool.query(
          `UPDATE public."Nodes" SET props = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(props), input.postId]
        );
      }

      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }
}
