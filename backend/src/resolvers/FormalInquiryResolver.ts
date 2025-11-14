import { Resolver, Query, Mutation, Arg, Ctx, InputType, Field, ID, Float } from 'type-graphql';
import { FormalInquiry, FormalInquiryStatus } from '../entities/FormalInquiry';
import { InquiryVote, InquiryVoteStats, VoteType } from '../entities/InquiryVote';
import { Context } from '../types/context';

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class CreateFormalInquiryInput {
  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  content!: string;

  @Field(() => [ID], { nullable: true })
  related_node_ids?: string[];
}

@InputType()
class CastVoteInput {
  @Field(() => ID)
  inquiry_id!: string;

  @Field(() => VoteType)
  vote_type!: VoteType;
}

@InputType()
class UpdateConfidenceScoreInput {
  @Field(() => ID)
  inquiry_id!: string;

  @Field(() => Float)
  confidence_score!: number;

  @Field()
  ai_determination!: string;

  @Field()
  ai_rationale!: string;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver(() => FormalInquiry)
export class FormalInquiryResolver {
  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get formal inquiries with vote stats
   * Shows both evidence-based credibility and community opinion (separated)
   */
  @Query(() => [FormalInquiry])
  async getFormalInquiries(
    @Arg('nodeId', () => ID, { nullable: true }) nodeId: string | undefined,
    @Arg('edgeId', () => ID, { nullable: true }) edgeId: string | undefined,
    @Arg('status', () => String, { nullable: true }) status: string | undefined,
    @Ctx() { pool }: Context
  ): Promise<FormalInquiry[]> {
    try {
      // Use the view that combines credibility and voting (but keeps them separate)
      let sql = `
        SELECT * FROM public."InquiryWithVotesView"
        WHERE 1=1
      `;
      const params: any[] = [];

      if (nodeId) {
        params.push(nodeId);
        sql += ` AND target_node_id = $${params.length}`;
      }

      if (edgeId) {
        params.push(edgeId);
        sql += ` AND target_edge_id = $${params.length}`;
      }

      if (status) {
        params.push(status);
        sql += ` AND status = $${params.length}`;
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await pool.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        content: row.content,
        // Evidence-based credibility (AI-judged)
        confidence_score: row.confidence_score,
        max_allowed_score: row.max_allowed_score,
        weakest_node_credibility: row.weakest_node_credibility,
        ai_determination: row.ai_determination,
        ai_rationale: row.ai_rationale,
        evaluated_at: row.evaluated_at,
        evaluated_by: row.evaluated_by,
        // Community opinion (voting)
        agree_count: row.agree_count,
        disagree_count: row.disagree_count,
        total_votes: row.total_votes,
        agree_percentage: row.agree_percentage,
        disagree_percentage: row.disagree_percentage,
        // Status
        status: row.status as FormalInquiryStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
      })) as FormalInquiry[];
    } catch (error) {
      console.error('Error fetching formal inquiries:', error);
      throw new Error('Failed to fetch formal inquiries');
    }
  }

  /**
   * Get a single formal inquiry by ID
   */
  @Query(() => FormalInquiry, { nullable: true })
  async getFormalInquiry(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool }: Context
  ): Promise<FormalInquiry | null> {
    try {
      const sql = `
        SELECT * FROM public."InquiryWithVotesView"
        WHERE id = $1
      `;

      const result = await pool.query(sql, [inquiryId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        content: row.content,
        confidence_score: row.confidence_score,
        max_allowed_score: row.max_allowed_score,
        weakest_node_credibility: row.weakest_node_credibility,
        ai_determination: row.ai_determination,
        ai_rationale: row.ai_rationale,
        evaluated_at: row.evaluated_at,
        evaluated_by: row.evaluated_by,
        agree_count: row.agree_count,
        disagree_count: row.disagree_count,
        total_votes: row.total_votes,
        agree_percentage: row.agree_percentage,
        disagree_percentage: row.disagree_percentage,
        status: row.status as FormalInquiryStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
      } as FormalInquiry;
    } catch (error) {
      console.error('Error fetching formal inquiry:', error);
      throw new Error('Failed to fetch formal inquiry');
    }
  }

  /**
   * Get user's vote on a specific inquiry (if any)
   */
  @Query(() => InquiryVote, { nullable: true })
  async getUserVote(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<InquiryVote | null> {
    if (!userId) {
      return null;
    }

    try {
      const sql = `
        SELECT * FROM public."InquiryVotes"
        WHERE inquiry_id = $1 AND user_id = $2
      `;

      const result = await pool.query(sql, [inquiryId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        inquiry_id: row.inquiry_id,
        user_id: row.user_id,
        vote_type: row.vote_type as VoteType,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as InquiryVote;
    } catch (error) {
      console.error('Error fetching user vote:', error);
      return null;
    }
  }

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  /**
   * Create a formal inquiry
   */
  @Mutation(() => FormalInquiry)
  async createFormalInquiry(
    @Arg('input') input: CreateFormalInquiryInput,
    @Ctx() { pool, userId }: Context
  ): Promise<FormalInquiry> {
    if (!userId) {
      throw new Error('Authentication required to create formal inquiry');
    }

    // Validate that either node_id or edge_id is provided, but not both
    if (
      (!input.target_node_id && !input.target_edge_id) ||
      (input.target_node_id && input.target_edge_id)
    ) {
      throw new Error('Must provide either target_node_id or target_edge_id, but not both');
    }

    try {
      const sql = `
        INSERT INTO public."FormalInquiries" (
          target_node_id,
          target_edge_id,
          user_id,
          title,
          description,
          content,
          related_node_ids,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.target_node_id || null,
        input.target_edge_id || null,
        userId,
        input.title,
        input.description || null,
        input.content,
        input.related_node_ids || [],
      ]);

      const row = result.rows[0];

      return {
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        content: row.content,
        confidence_score: row.confidence_score,
        max_allowed_score: row.max_allowed_score,
        weakest_node_credibility: row.weakest_node_credibility,
        ai_determination: row.ai_determination,
        ai_rationale: row.ai_rationale,
        evaluated_at: row.evaluated_at,
        evaluated_by: row.evaluated_by,
        related_node_ids: row.related_node_ids,
        status: row.status as FormalInquiryStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
      } as FormalInquiry;
    } catch (error) {
      console.error('Error creating formal inquiry:', error);
      throw new Error('Failed to create formal inquiry');
    }
  }

  /**
   * Cast or update vote on an inquiry
   * CRITICAL: This does NOT affect confidence scores
   */
  @Mutation(() => InquiryVote)
  async castVote(
    @Arg('input') input: CastVoteInput,
    @Ctx() { pool, userId }: Context
  ): Promise<InquiryVote> {
    if (!userId) {
      throw new Error('Authentication required to vote');
    }

    try {
      // Use UPSERT to either insert new vote or update existing
      const sql = `
        INSERT INTO public."InquiryVotes" (
          inquiry_id,
          user_id,
          vote_type,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (inquiry_id, user_id)
        DO UPDATE SET
          vote_type = EXCLUDED.vote_type,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.inquiry_id,
        userId,
        input.vote_type,
      ]);

      const row = result.rows[0];

      return {
        id: row.id,
        inquiry_id: row.inquiry_id,
        user_id: row.user_id,
        vote_type: row.vote_type as VoteType,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as InquiryVote;
    } catch (error) {
      console.error('Error casting vote:', error);
      throw new Error('Failed to cast vote');
    }
  }

  /**
   * Remove vote from an inquiry
   */
  @Mutation(() => Boolean)
  async removeVote(
    @Arg('inquiryId', () => ID) inquiryId: string,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to remove vote');
    }

    try {
      const sql = `
        DELETE FROM public."InquiryVotes"
        WHERE inquiry_id = $1 AND user_id = $2
      `;

      await pool.query(sql, [inquiryId, userId]);

      return true;
    } catch (error) {
      console.error('Error removing vote:', error);
      throw new Error('Failed to remove vote');
    }
  }

  /**
   * Update confidence score (AI evaluation)
   * CRITICAL: This mutation should ONLY be called by AI evaluation service
   * Vote data must NEVER be included in the context passed to AI
   */
  @Mutation(() => FormalInquiry)
  async updateConfidenceScore(
    @Arg('input') input: UpdateConfidenceScoreInput,
    @Ctx() { pool, userId }: Context
  ): Promise<FormalInquiry> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Validate confidence score range
    if (input.confidence_score < 0 || input.confidence_score > 1) {
      throw new Error('Confidence score must be between 0.00 and 1.00');
    }

    try {
      // Update confidence score - trigger will apply ceiling automatically
      const sql = `
        UPDATE public."FormalInquiries"
        SET
          confidence_score = $1,
          ai_determination = $2,
          ai_rationale = $3,
          evaluated_at = NOW(),
          evaluated_by = 'ai',
          status = 'evaluated',
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const result = await pool.query(sql, [
        input.confidence_score,
        input.ai_determination,
        input.ai_rationale,
        input.inquiry_id,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Inquiry not found');
      }

      const row = result.rows[0];

      // Log if confidence score was capped by ceiling
      if (row.confidence_score < input.confidence_score) {
        console.log(
          `Confidence score capped: ${input.confidence_score} → ${row.confidence_score} ` +
          `(ceiling: ${row.max_allowed_score}, weakest node: ${row.weakest_node_credibility})`
        );
      }

      return {
        id: row.id,
        target_node_id: row.target_node_id,
        target_edge_id: row.target_edge_id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        content: row.content,
        confidence_score: row.confidence_score,
        max_allowed_score: row.max_allowed_score,
        weakest_node_credibility: row.weakest_node_credibility,
        ai_determination: row.ai_determination,
        ai_rationale: row.ai_rationale,
        evaluated_at: row.evaluated_at,
        evaluated_by: row.evaluated_by,
        related_node_ids: row.related_node_ids,
        status: row.status as FormalInquiryStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
      } as FormalInquiry;
    } catch (error) {
      console.error('Error updating confidence score:', error);
      throw new Error('Failed to update confidence score');
    }
  }
}
