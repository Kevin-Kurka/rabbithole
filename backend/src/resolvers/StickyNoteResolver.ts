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
import { ActivityPost } from '../entities/ActivityPost';
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
          p.id,
          p.node_id,
          p.content,
          p.canvas_props,
          p.created_at,
          u.username as author_name,
          n.props->>'position' as node_position,
          n.weight as node_credibility,
          get_reply_count(p.id) as reply_count,
          get_reaction_counts(p.id) as reaction_counts
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE n.graph_id = $1
        AND p.deleted_at IS NULL
        AND p.is_reply = FALSE
        ORDER BY p.created_at DESC
      `;

      const result = await pool.query(sql, [graphId]);

      return result.rows.map((row) => {
        const canvasProps = row.canvas_props || {};
        const style = canvasProps.style || { color: 'yellow', size: 'medium' };

        // Parse node position
        let nodePosition = { x: 100, y: 100 };
        if (row.node_position) {
          try {
            nodePosition = JSON.parse(row.node_position);
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
            zIndex: row.node_credibility + 0.001,
          };
        }

        return {
          id: row.id,
          nodeId: row.node_id,
          content: row.content,
          style,
          position,
          authorName: row.author_name,
          replyCount: parseInt(row.reply_count) || 0,
          reactionCounts: row.reaction_counts || {},
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
          p.id,
          p.node_id,
          p.content,
          p.canvas_props,
          p.created_at,
          u.username as author_name,
          n.props->>'position' as node_position,
          n.weight as node_credibility,
          get_reply_count(p.id) as reply_count,
          get_reaction_counts(p.id) as reaction_counts
        FROM public."ActivityPosts" p
        INNER JOIN public."Users" u ON p.author_id = u.id
        INNER JOIN public."Nodes" n ON p.node_id = n.id
        WHERE p.node_id = $1
        AND p.deleted_at IS NULL
        AND p.is_reply = FALSE
        ORDER BY p.created_at DESC
      `;

      const result = await pool.query(sql, [nodeId]);

      return result.rows.map((row) => {
        const canvasProps = row.canvas_props || {};
        const style = canvasProps.style || { color: 'yellow', size: 'medium' };

        let nodePosition = { x: 100, y: 100 };
        if (row.node_position) {
          try {
            nodePosition = JSON.parse(row.node_position);
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
            zIndex: row.node_credibility + 0.001,
          };
        }

        return {
          id: row.id,
          nodeId: row.node_id,
          content: row.content,
          style,
          position,
          authorName: row.author_name,
          replyCount: parseInt(row.reply_count) || 0,
          reactionCounts: row.reaction_counts || {},
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

      const insertSql = `
        INSERT INTO public."ActivityPosts" (
          node_id, author_id, content, mentioned_node_ids, canvas_props
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await client.query(insertSql, [
        input.nodeId,
        userId,
        input.content,
        input.mentionedNodeIds || [],
        JSON.stringify(canvasProps),
      ]);

      await client.query('COMMIT');

      return result.rows[0];
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
      // Get current post
      const postResult = await pool.query(
        'SELECT * FROM public."ActivityPosts" WHERE id = $1 AND deleted_at IS NULL',
        [input.postId]
      );

      if (postResult.rows.length === 0) {
        throw new Error('Sticky note not found');
      }

      const post = postResult.rows[0];

      // Check permissions (author only for now)
      if (post.author_id !== userId) {
        throw new Error('Only the author can update sticky note style');
      }

      // Update canvas_props
      const currentProps = post.canvas_props || {};
      const updatedProps = {
        ...currentProps,
        style: input.style,
      };

      const updateResult = await pool.query(
        'UPDATE public."ActivityPosts" SET canvas_props = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [JSON.stringify(updatedProps), input.postId]
      );

      return updateResult.rows[0];
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
      // Insert or update reaction (upsert)
      await pool.query(
        `
        INSERT INTO public."ActivityReactions" (post_id, user_id, reaction_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING
      `,
        [input.postId, userId, input.reactionType]
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
      await pool.query(
        `
        DELETE FROM public."ActivityReactions"
        WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
      `,
        [input.postId, userId, input.reactionType]
      );

      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }
}
