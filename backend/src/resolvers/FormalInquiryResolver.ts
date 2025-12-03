import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  ID
} from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  CreateFormalInquiryInput,
  CastVoteInput,
  UpdateConfidenceScoreInput
} from './FormalInquiryInput';

// Subscription topics
const INQUIRY_CREATED = 'INQUIRY_CREATED';
const INQUIRY_VOTE_CAST = 'INQUIRY_VOTE_CAST';
const INQUIRY_EVALUATED = 'INQUIRY_EVALUATED';

@Resolver()
export class FormalInquiryResolver {
  /**
   * QUERIES - Using Node/Edge Pattern
   */

  @Query(() => [GraphQLJSON])
  async getFormalInquiries(
    @Ctx() { pool }: { pool: Pool },
    @Arg('nodeId', () => ID, { nullable: true }) nodeId?: string,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId?: string,
    @Arg('status', { nullable: true }) status?: string
  ): Promise<any[]> {
    // Get FormalInquiry node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'FormalInquiry'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('FormalInquiry node type not found');
    }
    const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

    // Build query with optional filters
    let query = `
      SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at
      FROM public."Nodes" n
      WHERE n.node_type_id = $1
    `;

    const params: any[] = [inquiryNodeTypeId];
    let paramCount = 2;

    if (nodeId) {
      query += ` AND (n.props->>'targetNodeId')::text = $${paramCount}`;
      params.push(nodeId);
      paramCount++;
    }

    if (edgeId) {
      query += ` AND (n.props->>'targetEdgeId')::text = $${paramCount}`;
      params.push(edgeId);
      paramCount++;
    }

    if (status) {
      query += ` AND (n.props->>'status')::text = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, params);

    // Parse JSONB props and calculate vote counts
    const inquiriesWithVotes = await Promise.all(
      result.rows.map(async (row) => {
        const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

        // Get vote counts
        const voteResult = await pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'agree') as agree_count,
            COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'disagree') as disagree_count,
            COUNT(*) as total_votes
          FROM public."Nodes" n
          JOIN public."Edges" e ON n.id = e.source_node_id
          JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
          JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
          WHERE et.name = 'VOTES_ON'
            AND nt.name = 'ConsensusVote'
            AND e.target_node_id = $1`,
          [row.id]
        );

        const votes = voteResult.rows[0];
        const agreeCount = parseInt(votes.agree_count) || 0;
        const disagreeCount = parseInt(votes.disagree_count) || 0;
        const totalVotes = parseInt(votes.total_votes) || 0;

        return {
          id: row.id,
          target_node_id: props.targetNodeId,
          target_edge_id: props.targetEdgeId,
          user_id: props.createdBy,
          title: props.title,
          description: props.description,
          content: props.content,
          confidence_score: props.confidenceScore,
          max_allowed_score: props.maxAllowedScore,
          weakest_node_credibility: props.weakestNodeCredibility,
          ai_determination: props.aiDetermination,
          ai_rationale: props.aiRationale,
          evaluated_at: props.evaluatedAt,
          evaluated_by: props.evaluatedBy,
          agree_count: agreeCount,
          disagree_count: disagreeCount,
          total_votes: totalVotes,
          agree_percentage: totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0,
          disagree_percentage: totalVotes > 0 ? (disagreeCount / totalVotes) * 100 : 0,
          status: props.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          resolved_at: props.resolvedAt
        };
      })
    );

    return inquiriesWithVotes;
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async getFormalInquiry(
    @Ctx() { pool }: { pool: Pool },
    @Arg('inquiryId', () => ID) inquiryId: string
  ): Promise<any> {
    // Get FormalInquiry node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'FormalInquiry'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('FormalInquiry node type not found');
    }
    const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

    // Query single inquiry
    const result = await pool.query(
      `SELECT
        n.id,
        n.props,
        n.created_at,
        n.updated_at
      FROM public."Nodes" n
      WHERE n.id = $1 AND n.node_type_id = $2`,
      [inquiryId, inquiryNodeTypeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

    // Get vote counts
    const voteResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'agree') as agree_count,
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'disagree') as disagree_count,
        COUNT(*) as total_votes
      FROM public."Nodes" n
      JOIN public."Edges" e ON n.id = e.source_node_id
      JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE et.name = 'VOTES_ON'
        AND nt.name = 'ConsensusVote'
        AND e.target_node_id = $1`,
      [row.id]
    );

    const votes = voteResult.rows[0];
    const agreeCount = parseInt(votes.agree_count) || 0;
    const disagreeCount = parseInt(votes.disagree_count) || 0;
    const totalVotes = parseInt(votes.total_votes) || 0;

    return {
      id: row.id,
      target_node_id: props.targetNodeId,
      target_edge_id: props.targetEdgeId,
      user_id: props.createdBy,
      title: props.title,
      description: props.description,
      content: props.content,
      confidence_score: props.confidenceScore,
      max_allowed_score: props.maxAllowedScore,
      weakest_node_credibility: props.weakestNodeCredibility,
      ai_determination: props.aiDetermination,
      ai_rationale: props.aiRationale,
      evaluated_at: props.evaluatedAt,
      evaluated_by: props.evaluatedBy,
      agree_count: agreeCount,
      disagree_count: disagreeCount,
      total_votes: totalVotes,
      agree_percentage: totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0,
      disagree_percentage: totalVotes > 0 ? (disagreeCount / totalVotes) * 100 : 0,
      status: props.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: props.resolvedAt
    };
  }

  @Query(() => GraphQLJSON, { nullable: true })
  async getUserVote(
    @Ctx() { pool, userId }: { pool: Pool; userId: string },
    @Arg('inquiryId', () => ID) inquiryId: string
  ): Promise<any> {
    if (!userId) {
      return null;
    }

    // Get ConsensusVote node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'ConsensusVote'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('ConsensusVote node type not found');
    }
    const voteNodeTypeId = nodeTypeResult.rows[0].id;

    // Get VOTES_ON edge type ID
    const edgeTypeResult = await pool.query(
      `SELECT id FROM public."EdgeTypes" WHERE name = 'VOTES_ON'`
    );
    if (edgeTypeResult.rows.length === 0) {
      throw new Error('VOTES_ON edge type not found');
    }
    const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

    // Query user's vote
    const result = await pool.query(
      `SELECT n.id, n.props, n.created_at, n.updated_at
      FROM public."Nodes" n
      JOIN public."Edges" e ON n.id = e.source_node_id
      WHERE n.node_type_id = $1
        AND e.edge_type_id = $2
        AND e.target_node_id = $3
        AND (n.props->>'userId')::text = $4`,
      [voteNodeTypeId, votesOnEdgeTypeId, inquiryId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;

    return {
      id: row.id,
      inquiry_id: inquiryId,
      user_id: userId,
      vote_type: props.voteType,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * MUTATIONS - Using Node/Edge Pattern
   */

  @Mutation(() => GraphQLJSON)
  async createFormalInquiry(
    @Arg('input') input: CreateFormalInquiryInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Validate either node or edge is targeted
    if (!input.targetNodeId && !input.targetEdgeId) {
      throw new Error('Must specify either targetNodeId or targetEdgeId');
    }
    if (input.targetNodeId && input.targetEdgeId) {
      throw new Error('Cannot target both node and edge simultaneously');
    }

    // Get FormalInquiry node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'FormalInquiry'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('FormalInquiry node type not found');
    }
    const inquiryNodeTypeId = nodeTypeResult.rows[0].id;

    // Get INVESTIGATES edge type ID
    const edgeTypeResult = await pool.query(
      `SELECT id FROM public."EdgeTypes" WHERE name = 'INVESTIGATES'`
    );
    if (edgeTypeResult.rows.length === 0) {
      throw new Error('INVESTIGATES edge type not found');
    }
    const investigatesEdgeTypeId = edgeTypeResult.rows[0].id;

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create FormalInquiry node with props
      const inquiryProps = {
        targetNodeId: input.targetNodeId,
        targetEdgeId: input.targetEdgeId,
        targetType: input.targetNodeId ? 'node' : 'edge',
        title: input.title,
        description: input.description,
        content: input.content,
        relatedNodeIds: input.relatedNodeIds || [],
        status: 'open',
        createdBy: userId,
        // AI evaluation fields (initially null)
        confidenceScore: null,
        maxAllowedScore: null,
        weakestNodeCredibility: null,
        aiDetermination: null,
        aiRationale: null,
        evaluatedAt: null,
        evaluatedBy: null
      };

      const inquiryResult = await client.query(
        `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [inquiryNodeTypeId, JSON.stringify(inquiryProps)]
      );
      const inquiry = inquiryResult.rows[0];

      // Create edge from FormalInquiry to target (node or edge)
      const targetId = input.targetNodeId || input.targetEdgeId;
      await client.query(
        `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
        [investigatesEdgeTypeId, inquiry.id, targetId]
      );

      await client.query('COMMIT');

      // Parse props for return
      const parsedInquiry = {
        id: inquiry.id,
        target_node_id: inquiryProps.targetNodeId,
        target_edge_id: inquiryProps.targetEdgeId,
        user_id: userId,
        title: inquiryProps.title,
        description: inquiryProps.description,
        content: inquiryProps.content,
        confidence_score: null,
        max_allowed_score: null,
        weakest_node_credibility: null,
        ai_determination: null,
        ai_rationale: null,
        evaluated_at: null,
        evaluated_by: null,
        agree_count: 0,
        disagree_count: 0,
        total_votes: 0,
        agree_percentage: 0,
        disagree_percentage: 0,
        status: 'open',
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
        resolved_at: null
      };

      // Publish to subscriptions
      await pubSub.publish(INQUIRY_CREATED, parsedInquiry);

      return parsedInquiry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Mutation(() => GraphQLJSON)
  async castVote(
    @Arg('input') input: CastVoteInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get FormalInquiry node
    const inquiryResult = await pool.query(
      `SELECT id, props FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'FormalInquiry'`,
      [input.inquiryId]
    );

    if (inquiryResult.rows.length === 0) {
      throw new Error('Formal inquiry not found');
    }

    const inquiryRow = inquiryResult.rows[0];
    const inquiryProps = typeof inquiryRow.props === 'string'
      ? JSON.parse(inquiryRow.props)
      : inquiryRow.props;

    // Check if inquiry is still open for voting
    if (inquiryProps.status !== 'open' && inquiryProps.status !== 'evaluating') {
      throw new Error('Inquiry is not open for voting');
    }

    // Get ConsensusVote node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'ConsensusVote'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('ConsensusVote node type not found');
    }
    const voteNodeTypeId = nodeTypeResult.rows[0].id;

    // Get VOTES_ON edge type ID
    const edgeTypeResult = await pool.query(
      `SELECT id FROM public."EdgeTypes" WHERE name = 'VOTES_ON'`
    );
    if (edgeTypeResult.rows.length === 0) {
      throw new Error('VOTES_ON edge type not found');
    }
    const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

    // Check if user already voted
    const existingVoteResult = await pool.query(
      `SELECT n.id FROM public."Nodes" n
       JOIN public."Edges" e ON n.id = e.source_node_id
       WHERE n.node_type_id = $1
         AND e.edge_type_id = $2
         AND e.target_node_id = $3
         AND (n.props->>'userId')::text = $4`,
      [voteNodeTypeId, votesOnEdgeTypeId, input.inquiryId, userId]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let voteId: string;

      if (existingVoteResult.rows.length > 0) {
        // Update existing vote
        voteId = existingVoteResult.rows[0].id;
        const updatedVoteProps = {
          voteType: input.voteType,
          userId,
          targetType: 'inquiry'
        };

        await client.query(
          `UPDATE public."Nodes"
           SET props = $1, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(updatedVoteProps), voteId]
        );
      } else {
        // Create new vote node
        const voteProps = {
          voteType: input.voteType,
          userId,
          targetType: 'inquiry'
        };

        const voteResult = await client.query(
          `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING *`,
          [voteNodeTypeId, JSON.stringify(voteProps)]
        );

        voteId = voteResult.rows[0].id;

        // Create VOTES_ON edge
        await client.query(
          `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
           VALUES ($1, $2, $3, '{}', NOW(), NOW())`,
          [votesOnEdgeTypeId, voteId, input.inquiryId]
        );
      }

      await client.query('COMMIT');

      // Get updated vote
      const updatedVoteResult = await client.query(
        `SELECT * FROM public."Nodes" WHERE id = $1`,
        [voteId]
      );

      const voteRow = updatedVoteResult.rows[0];

      // Publish to subscriptions
      await pubSub.publish(INQUIRY_VOTE_CAST, {
        inquiryId: input.inquiryId,
        voteType: input.voteType,
        userId
      });

      return {
        id: voteId,
        inquiry_id: input.inquiryId,
        user_id: userId,
        vote_type: input.voteType,
        created_at: voteRow.created_at,
        updated_at: voteRow.updated_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Mutation(() => Boolean)
  async removeVote(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool, userId }: { pool: Pool; userId: string }
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get ConsensusVote node type ID
    const nodeTypeResult = await pool.query(
      `SELECT id FROM public."NodeTypes" WHERE name = 'ConsensusVote'`
    );
    if (nodeTypeResult.rows.length === 0) {
      throw new Error('ConsensusVote node type not found');
    }
    const voteNodeTypeId = nodeTypeResult.rows[0].id;

    // Get VOTES_ON edge type ID
    const edgeTypeResult = await pool.query(
      `SELECT id FROM public."EdgeTypes" WHERE name = 'VOTES_ON'`
    );
    if (edgeTypeResult.rows.length === 0) {
      throw new Error('VOTES_ON edge type not found');
    }
    const votesOnEdgeTypeId = edgeTypeResult.rows[0].id;

    // Find and delete user's vote
    const result = await pool.query(
      `DELETE FROM public."Nodes" n
       USING public."Edges" e
       WHERE n.id = e.source_node_id
         AND n.node_type_id = $1
         AND e.edge_type_id = $2
         AND e.target_node_id = $3
         AND (n.props->>'userId')::text = $4
       RETURNING n.id`,
      [voteNodeTypeId, votesOnEdgeTypeId, inquiryId, userId]
    );

    return result.rows.length > 0;
  }

  @Mutation(() => GraphQLJSON)
  async updateConfidenceScore(
    @Arg('input') input: UpdateConfidenceScoreInput,
    @Ctx() { pool, userId, pubSub }: { pool: Pool; userId: string; pubSub: PubSubEngine }
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get FormalInquiry node
    const inquiryResult = await pool.query(
      `SELECT id, props FROM public."Nodes" n
       JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'FormalInquiry'`,
      [input.inquiryId]
    );

    if (inquiryResult.rows.length === 0) {
      throw new Error('Formal inquiry not found');
    }

    const inquiryRow = inquiryResult.rows[0];
    const inquiryProps = typeof inquiryRow.props === 'string'
      ? JSON.parse(inquiryRow.props)
      : inquiryRow.props;

    // Update inquiry with AI evaluation
    const updatedProps = {
      ...inquiryProps,
      confidenceScore: input.confidenceScore,
      aiDetermination: input.aiDetermination,
      aiRationale: input.aiRationale,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: userId,
      status: 'evaluated'
    };

    await pool.query(
      `UPDATE public."Nodes"
       SET props = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedProps), input.inquiryId]
    );

    // Get vote counts
    const voteResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'agree') as agree_count,
        COUNT(*) FILTER (WHERE (n.props->>'voteType')::text = 'disagree') as disagree_count,
        COUNT(*) as total_votes
      FROM public."Nodes" n
      JOIN public."Edges" e ON n.id = e.source_node_id
      JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE et.name = 'VOTES_ON'
        AND nt.name = 'ConsensusVote'
        AND e.target_node_id = $1`,
      [input.inquiryId]
    );

    const votes = voteResult.rows[0];
    const agreeCount = parseInt(votes.agree_count) || 0;
    const disagreeCount = parseInt(votes.disagree_count) || 0;
    const totalVotes = parseInt(votes.total_votes) || 0;

    const evaluatedInquiry = {
      id: input.inquiryId,
      target_node_id: updatedProps.targetNodeId,
      target_edge_id: updatedProps.targetEdgeId,
      user_id: updatedProps.createdBy,
      title: updatedProps.title,
      description: updatedProps.description,
      content: updatedProps.content,
      confidence_score: input.confidenceScore,
      max_allowed_score: updatedProps.maxAllowedScore,
      weakest_node_credibility: updatedProps.weakestNodeCredibility,
      ai_determination: input.aiDetermination,
      ai_rationale: input.aiRationale,
      evaluated_at: updatedProps.evaluatedAt,
      evaluated_by: userId,
      agree_count: agreeCount,
      disagree_count: disagreeCount,
      total_votes: totalVotes,
      agree_percentage: totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0,
      disagree_percentage: totalVotes > 0 ? (disagreeCount / totalVotes) * 100 : 0,
      status: 'evaluated',
      created_at: inquiryRow.created_at,
      updated_at: new Date().toISOString(),
      resolved_at: updatedProps.resolvedAt
    };

    // Publish to subscriptions
    await pubSub.publish(INQUIRY_EVALUATED, evaluatedInquiry);

    return evaluatedInquiry;
  }

  /**
   * SUBSCRIPTIONS
   */

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_CREATED
  })
  inquiryCreated(
    @Root() inquiry: any
  ): any {
    return inquiry;
  }

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_VOTE_CAST,
    filter: ({ payload, args }) => payload.inquiryId === args.inquiryId
  })
  inquiryVoteCast(
    @Root() vote: any,
    @Arg('inquiryId', () => ID) inquiryId: string
  ): any {
    return vote;
  }

  @Subscription(() => GraphQLJSON, {
    topics: INQUIRY_EVALUATED,
    filter: ({ payload, args }) => payload.id === args.inquiryId
  })
  inquiryEvaluated(
    @Root() inquiry: any,
    @Arg('inquiryId', () => ID) inquiryId: string
  ): any {
    return inquiry;
  }
}

export default FormalInquiryResolver;
