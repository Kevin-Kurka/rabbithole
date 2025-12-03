import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  Int,
  InputType,
  Field
} from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import GraphQLJSON from 'graphql-type-json';

// Subscription topics
const INQUIRY_CREATED = 'INQUIRY_CREATED';
const INQUIRY_UPDATED = 'INQUIRY_UPDATED';
const POSITION_CREATED = 'POSITION_CREATED';
const VOTE_ADDED = 'VOTE_ADDED';

@InputType()
class CreateInquiryInput {
  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field({ nullable: true })
  inquiryType?: string; // e.g., 'scientific', 'philosophical'

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
class CreatePositionInput {
  @Field()
  inquiryId!: string;

  @Field()
  stance!: string; // 'supporting' | 'opposing'

  @Field()
  argument!: string;

  @Field(() => [String], { nullable: true })
  evidenceIds?: string[];
}

@InputType()
class VoteInput {
  @Field()
  targetId!: string; // Position ID or Inquiry ID

  @Field()
  voteType!: string; // 'upvote' | 'downvote'
}

interface Context {
  pool: Pool;
  pubSub: PubSubEngine;
  userId?: string;
}

@Resolver()
export class InquiryResolver {
  /**
   * QUERIES
   */

  @Query(() => [GraphQLJSON])
  async inquiries(
    @Arg('limit', type => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', type => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'Inquiry'`
    );
    if (nodeTypeResult.rows.length === 0) return [];
    const inquiryTypeId = nodeTypeResult.rows[0].id;

    const result = await pool.query(
      `
      SELECT n.id, n.props, n.created_at, n.updated_at
      FROM public."Nodes" n
      WHERE n.node_type_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [inquiryTypeId, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      ...(typeof row.props === 'string' ? JSON.parse(row.props) : row.props),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async inquiry(
    @Arg('id') id: string,
    @Ctx() { pool }: Context
  ): Promise<any> {
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'Inquiry'`
    );
    if (nodeTypeResult.rows.length === 0) return null;
    const inquiryTypeId = nodeTypeResult.rows[0].id;

    const result = await pool.query(
      `
      SELECT n.id, n.props, n.created_at, n.updated_at
      FROM public."Nodes" n
      WHERE n.id = $1 AND n.node_type_id = $2
      `,
      [id, inquiryTypeId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      ...(typeof row.props === 'string' ? JSON.parse(row.props) : row.props),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  @Query(() => [GraphQLJSON])
  async inquiryPositions(
    @Arg('inquiryId') inquiryId: string,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    // Get positions connected to the inquiry via HAS_POSITION edge
    const result = await pool.query(
      `
      SELECT n.id, n.props, n.created_at, n.updated_at
      FROM public."Nodes" n
      JOIN public."Edges" e ON n.id = e.target_node_id
      JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
      WHERE e.source_node_id = $1
        AND et.name = 'HAS_POSITION'
      ORDER BY n.created_at DESC
      `,
      [inquiryId]
    );

    return result.rows.map(row => ({
      id: row.id,
      ...(typeof row.props === 'string' ? JSON.parse(row.props) : row.props),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * MUTATIONS
   */

  @Mutation(() => GraphQLJSON)
  async createInquiry(
    @Arg('input') input: CreateInquiryInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) throw new Error('Authentication required');

    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'Inquiry'`
    );
    if (nodeTypeResult.rows.length === 0) throw new Error('Inquiry Node Type not found');
    const inquiryTypeId = nodeTypeResult.rows[0].id;

    const props = {
      title: input.title,
      description: input.description,
      inquiryType: input.inquiryType || 'general',
      tags: input.tags || [],
      createdBy: userId,
      status: 'active'
    };

    const result = await pool.query(
      `
      INSERT INTO public."Nodes" (node_type_id, props)
      VALUES ($1, $2)
      RETURNING *
      `,
      [inquiryTypeId, JSON.stringify(props)]
    );

    const row = result.rows[0];
    const inquiry = {
      id: row.id,
      ...props,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    await pubSub.publish(INQUIRY_CREATED, inquiry);
    return inquiry;
  }

  @Mutation(() => GraphQLJSON)
  async createPosition(
    @Arg('input') input: CreatePositionInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) throw new Error('Authentication required');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create Position Node
      const nodeTypeResult = await client.query(
        `SELECT id FROM public."NodeTypes" WHERE name = 'Position'`
      );
      if (nodeTypeResult.rows.length === 0) throw new Error('Position Node Type not found');
      const positionTypeId = nodeTypeResult.rows[0].id;

      const props = {
        stance: input.stance,
        argument: input.argument,
        createdBy: userId,
        evidenceIds: input.evidenceIds || []
      };

      const nodeResult = await client.query(
        `
        INSERT INTO public."Nodes" (node_type_id, props)
        VALUES ($1, $2)
        RETURNING *
        `,
        [positionTypeId, JSON.stringify(props)]
      );
      const positionNode = nodeResult.rows[0];

      // 2. Create Edge (Inquiry -> Position)
      const edgeTypeResult = await client.query(
        `SELECT id FROM public."EdgeTypes" WHERE name = 'HAS_POSITION'`
      );
      if (edgeTypeResult.rows.length === 0) throw new Error('HAS_POSITION Edge Type not found');
      const hasPositionId = edgeTypeResult.rows[0].id;

      await client.query(
        `
        INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id)
        VALUES ($1, $2, $3)
        `,
        [hasPositionId, input.inquiryId, positionNode.id]
      );

      await client.query('COMMIT');

      const position = {
        id: positionNode.id,
        ...props,
        createdAt: positionNode.created_at,
        updatedAt: positionNode.updated_at,
        inquiryId: input.inquiryId
      };

      await pubSub.publish(POSITION_CREATED, position);
      return position;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  @Mutation(() => GraphQLJSON)
  async vote(
    @Arg('input') input: VoteInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) throw new Error('Authentication required');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if vote already exists (User -> VOTES_ON -> Target)
      // This is complex in graph. We might need a Vote Node or just an Edge.
      // Plan said: Vote -> Node (Type: 'Vote') (linked via VOTES_ON edge)

      const voteTypeResult = await client.query(
        `SELECT id FROM public."NodeTypes" WHERE name = 'ConsensusVote'`
      );
      if (voteTypeResult.rows.length === 0) throw new Error('ConsensusVote Node Type not found');
      const voteTypeId = voteTypeResult.rows[0].id;

      const edgeTypeResult = await client.query(
        `SELECT id FROM public."EdgeTypes" WHERE name = 'VOTES_ON'`
      );
      if (edgeTypeResult.rows.length === 0) throw new Error('VOTES_ON Edge Type not found');
      const votesOnId = edgeTypeResult.rows[0].id;

      // Check for existing vote by this user on this target
      // This requires traversing: VoteNode (props.userId) --VOTES_ON--> TargetNode
      // For simplicity/performance, we can query Edges where target is targetId, then check source node props.

      const existingVote = await client.query(
        `
        SELECT n.id 
        FROM public."Nodes" n
        JOIN public."Edges" e ON n.id = e.source_node_id
        WHERE e.target_node_id = $1
          AND e.edge_type_id = $2
          AND n.node_type_id = $3
          AND (n.props->>'userId')::text = $4
        `,
        [input.targetId, votesOnId, voteTypeId, JSON.stringify(userId)] // JSON.stringify for JSONB match
      );

      let voteNode;
      if (existingVote.rows.length > 0) {
        // Update existing vote
        const voteId = existingVote.rows[0].id;
        const result = await client.query(
          `
          UPDATE public."Nodes"
          SET props = jsonb_set(props, '{voteType}', $1), updated_at = NOW()
          WHERE id = $2
          RETURNING *
          `,
          [JSON.stringify(input.voteType), voteId]
        );
        voteNode = result.rows[0];
      } else {
        // Create new vote
        const props = {
          userId,
          voteType: input.voteType,
          targetId: input.targetId
        };
        const result = await client.query(
          `
          INSERT INTO public."Nodes" (node_type_id, props)
          VALUES ($1, $2)
          RETURNING *
          `,
          [voteTypeId, JSON.stringify(props)]
        );
        voteNode = result.rows[0];

        // Create Edge
        await client.query(
          `
          INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id)
          VALUES ($1, $2, $3)
          `,
          [votesOnId, voteNode.id, input.targetId]
        );
      }

      await client.query('COMMIT');

      const vote = {
        id: voteNode.id,
        ...(typeof voteNode.props === 'string' ? JSON.parse(voteNode.props) : voteNode.props),
        createdAt: voteNode.created_at
      };

      await pubSub.publish(VOTE_ADDED, vote);
      return vote;

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * SUBSCRIPTIONS
   */
  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_CREATED
  })
  inquiryCreated(@Root() inquiry: any): any {
    return inquiry;
  }

  @Subscription(() => GraphQLJSON, {
    topics: POSITION_CREATED,
    filter: ({ payload, args }) => payload.inquiryId === args.inquiryId
  })
  positionCreated(
    @Root() position: any,
    @Arg('inquiryId') inquiryId: string
  ): any {
    return position;
  }
}
