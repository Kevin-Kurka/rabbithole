import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Subscription,
  Root,
  Int,
  Float,
  PubSub,
  Publisher
} from 'type-graphql';
import { Pool } from 'pg';
import { PubSubEngine } from 'graphql-subscriptions';
import { InquiryDeduplicationService } from '../services/InquiryDeduplicationService';
import { CredibilityCalculationService } from '../services/CredibilityCalculationService';
import { ThresholdFilteringService } from '../services/ThresholdFilteringService';
import { AIEvaluationService } from '../services/AIEvaluationService';
import { AmendmentService } from '../services/AmendmentService';
import { EmbeddingService } from '../services/EmbeddingService';

// Subscription topics
const INQUIRY_CREATED = 'INQUIRY_CREATED';
const INQUIRY_UPDATED = 'INQUIRY_UPDATED';
const POSITION_CREATED = 'POSITION_CREATED';
const POSITION_UPDATED = 'POSITION_UPDATED';
const NODE_CREDIBILITY_UPDATED = 'NODE_CREDIBILITY_UPDATED';
const AMENDMENT_PROPOSED = 'AMENDMENT_PROPOSED';
const AMENDMENT_APPLIED = 'AMENDMENT_APPLIED';

/**
 * Input types
 */
class CreateInquiryInput {
  nodeId!: string;
  inquiryType!: string;
  title!: string;
  description!: string;
  evidenceIds?: string[];
  bypassDuplicateCheck?: boolean;
  duplicateJustification?: string;
}

class CreatePositionInput {
  inquiryId!: string;
  stance!: string; // 'supporting' | 'opposing' | 'neutral'
  argument!: string;
  evidenceTypeCode!: string;
  evidenceLinks?: string[];
  evidenceIds?: string[];
}

class VoteOnPositionInput {
  positionId!: string;
  voteType!: string; // 'upvote' | 'downvote'
}

class ApplyAmendmentInput {
  amendmentId!: string;
}

class ProposeManualAmendmentInput {
  nodeId!: string;
  inquiryId!: string;
  positionId!: string;
  fieldPath!: string;
  newValue!: string;
  explanation!: string;
}

/**
 * Context interface
 */
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

  @Query(() => [Object], { nullable: true })
  async inquiries(
    @Arg('nodeId', { nullable: true }) nodeId: string,
    @Arg('inquiryType', { nullable: true }) inquiryType: string,
    @Arg('status', { nullable: true }) status: string,
    @Arg('limit', type => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg('offset', type => Int, { nullable: true, defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    let query = `
      SELECT
        i.*,
        u.username as created_by_username,
        COUNT(DISTINCT p.id) as position_count,
        AVG(p.credibility_score) as avg_position_credibility
      FROM public."Inquiries" i
      JOIN public."Users" u ON i.created_by_user_id = u.id
      LEFT JOIN public."InquiryPositions" p ON i.id = p.inquiry_id AND p.status != 'archived'
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (nodeId) {
      conditions.push(`i.node_id = $${paramCount}`);
      params.push(nodeId);
      paramCount++;
    }

    if (inquiryType) {
      conditions.push(`i.inquiry_type = $${paramCount}`);
      params.push(inquiryType);
      paramCount++;
    }

    if (status) {
      conditions.push(`i.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY i.id, u.username
      ORDER BY i.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  @Query(() => Object, { nullable: true })
  async inquiry(
    @Arg('id') id: string,
    @Ctx() { pool }: Context
  ): Promise<any> {
    const result = await pool.query(
      `
      SELECT
        i.*,
        u.username as created_by_username,
        n.title as node_title
      FROM public."Inquiries" i
      JOIN public."Users" u ON i.created_by_user_id = u.id
      JOIN public."Nodes" n ON i.node_id = n.id
      WHERE i.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Inquiry not found');
    }

    return result.rows[0];
  }

  @Query(() => [Object])
  async inquiryPositions(
    @Arg('inquiryId') inquiryId: string,
    @Arg('groupByThreshold', { nullable: true, defaultValue: false }) groupByThreshold: boolean,
    @Ctx() { pool }: Context
  ): Promise<any> {
    const thresholdService = new ThresholdFilteringService(pool);

    if (groupByThreshold) {
      const grouped = await thresholdService.getGroupedPositions(inquiryId);
      return {
        verified: grouped.verified,
        credible: grouped.credible,
        weak: grouped.weak,
        excluded: grouped.excluded
      };
    } else {
      const positions = await thresholdService.getCrediblePositions(inquiryId);
      return positions;
    }
  }

  @Query(() => Object, { nullable: true })
  async inquiryThresholdStatistics(
    @Arg('inquiryId') inquiryId: string,
    @Ctx() { pool }: Context
  ): Promise<any> {
    const thresholdService = new ThresholdFilteringService(pool);
    return await thresholdService.getThresholdStatistics(inquiryId);
  }

  @Query(() => [Object])
  async checkInquirySimilarity(
    @Arg('title') title: string,
    @Arg('description') description: string,
    @Arg('nodeId') nodeId: string,
    @Arg('inquiryType', { nullable: true }) inquiryType: string,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    const embeddingService = new EmbeddingService();
    const deduplicationService = new InquiryDeduplicationService(pool, embeddingService);

    const matches = await deduplicationService.checkForDuplicates(
      title,
      description,
      nodeId,
      inquiryType
    );

    return matches;
  }

  @Query(() => [Object])
  async nodeAmendments(
    @Arg('nodeId') nodeId: string,
    @Arg('fieldPath', { nullable: true }) fieldPath: string,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    const amendmentService = new AmendmentService(pool);
    return await amendmentService.getAmendmentHistory(nodeId, fieldPath);
  }

  @Query(() => Object)
  async nodeWithAmendments(
    @Arg('nodeId') nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<any> {
    const amendmentService = new AmendmentService(pool);
    return await amendmentService.getNodeWithAmendments(nodeId);
  }

  @Query(() => [Object])
  async pendingAmendments(
    @Arg('nodeId') nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<any[]> {
    const amendmentService = new AmendmentService(pool);
    return await amendmentService.getPendingAmendments(nodeId);
  }

  @Query(() => [Object])
  async evidenceTypes(@Ctx() { pool }: Context): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM public."EvidenceTypes" ORDER BY weight DESC`
    );
    return result.rows;
  }

  @Query(() => [Object])
  async credibilityThresholds(@Ctx() { pool }: Context): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM public."CredibilityThresholds" ORDER BY inquiry_type`
    );
    return result.rows;
  }

  /**
   * MUTATIONS
   */

  @Mutation(() => Object)
  async createInquiry(
    @Arg('input') input: CreateInquiryInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const embeddingService = new EmbeddingService();
    const deduplicationService = new InquiryDeduplicationService(pool, embeddingService);

    // Check for duplicates (unless bypassed with valid justification)
    if (!input.bypassDuplicateCheck) {
      const matches = await deduplicationService.checkForDuplicates(
        input.title,
        input.description,
        input.nodeId,
        input.inquiryType
      );

      if (matches.length > 0 && matches[0].similarity > 0.85) {
        throw new Error(
          `Similar inquiry found (${(matches[0].similarity * 100).toFixed(0)}% match). ` +
          `Please either: 1) Contribute to existing inquiry ${matches[0].existingInquiryId}, ` +
          `2) Provide justification for why your inquiry is distinct.`
        );
      }
    } else {
      const isValid = await deduplicationService.validateDistinctionJustification(
        input.title,
        input.description,
        input.duplicateJustification || ''
      );
      if (!isValid) {
        throw new Error('Justification must be at least 100 characters explaining why your inquiry is distinct');
      }
    }

    // Generate embedding for semantic search
    const embedding = await embeddingService.generateEmbedding(`${input.title} ${input.description}`);

    // Create inquiry
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inquiryResult = await client.query(
        `
        INSERT INTO public."Inquiries" (
          node_id,
          inquiry_type,
          title,
          description,
          created_by_user_id,
          embedding,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
        `,
        [
          input.nodeId,
          input.inquiryType,
          input.title,
          input.description,
          userId,
          JSON.stringify(embedding)
        ]
      );

      const inquiry = inquiryResult.rows[0];

      // Link evidence files if provided
      if (input.evidenceIds && input.evidenceIds.length > 0) {
        for (const evidenceId of input.evidenceIds) {
          await client.query(
            `
            INSERT INTO public."InquiryEvidence" (inquiry_id, evidence_file_id, submitted_by_user_id)
            VALUES ($1, $2, $3)
            `,
            [inquiry.id, evidenceId, userId]
          );
        }
      }

      await client.query('COMMIT');

      // Publish to subscriptions
      await pubSub.publish(INQUIRY_CREATED, inquiry);

      return inquiry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Mutation(() => Object)
  async createPosition(
    @Arg('input') input: CreatePositionInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Validate inquiry exists and is active
    const inquiryResult = await pool.query(
      'SELECT * FROM public."Inquiries" WHERE id = $1',
      [input.inquiryId]
    );
    if (inquiryResult.rows.length === 0) {
      throw new Error('Inquiry not found');
    }
    const inquiry = inquiryResult.rows[0];

    if (inquiry.status !== 'active') {
      throw new Error('Inquiry is not active');
    }

    // Get evidence type
    const evidenceTypeResult = await pool.query(
      'SELECT * FROM public."EvidenceTypes" WHERE code = $1',
      [input.evidenceTypeCode]
    );
    if (evidenceTypeResult.rows.length === 0) {
      throw new Error('Invalid evidence type');
    }
    const evidenceType = evidenceTypeResult.rows[0];

    // Create position
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const positionResult = await client.query(
        `
        INSERT INTO public."InquiryPositions" (
          inquiry_id,
          created_by_user_id,
          stance,
          argument,
          evidence_type_id,
          evidence_links,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_evaluation')
        RETURNING *
        `,
        [
          input.inquiryId,
          userId,
          input.stance,
          input.argument,
          evidenceType.id,
          input.evidenceLinks || []
        ]
      );

      const position = positionResult.rows[0];

      // Link evidence files if provided
      if (input.evidenceIds && input.evidenceIds.length > 0) {
        for (const evidenceId of input.evidenceIds) {
          await client.query(
            `
            INSERT INTO public."PositionEvidence" (position_id, evidence_file_id, submitted_by_user_id)
            VALUES ($1, $2, $3)
            `,
            [position.id, evidenceId, userId]
          );
        }
      }

      await client.query('COMMIT');

      // Trigger AI evaluation asynchronously
      this.evaluatePositionAsync(position, inquiry, pool, pubSub);

      // Publish to subscriptions
      await pubSub.publish(POSITION_CREATED, position);

      return position;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Mutation(() => Object)
  async voteOnPosition(
    @Arg('input') input: VoteOnPositionInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    // Insert or update vote
    const voteResult = await pool.query(
      `
      INSERT INTO public."PositionVotes" (position_id, user_id, vote_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (position_id, user_id)
      DO UPDATE SET vote_type = EXCLUDED.vote_type, updated_at = NOW()
      RETURNING *
      `,
      [input.positionId, userId, input.voteType]
    );

    const vote = voteResult.rows[0];

    // Recalculate position credibility
    const credibilityService = new CredibilityCalculationService(pool);
    await credibilityService.calculatePositionCredibility(input.positionId);

    // Update position status based on new credibility
    const thresholdService = new ThresholdFilteringService(pool);
    await thresholdService.updatePositionStatus(input.positionId);

    // Check if amendment should be triggered
    const amendmentService = new AmendmentService(pool);
    await amendmentService.checkAmendmentTriggers(input.positionId);

    return vote;
  }

  @Mutation(() => Object)
  async mergeInquiries(
    @Arg('sourceInquiryId') sourceInquiryId: string,
    @Arg('targetInquiryId') targetInquiryId: string,
    @Arg('justification') justification: string,
    @Ctx() { pool, userId }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const embeddingService = new EmbeddingService();
    const deduplicationService = new InquiryDeduplicationService(pool, embeddingService);

    await deduplicationService.mergeInquiries(
      sourceInquiryId,
      targetInquiryId,
      justification,
      userId
    );

    return { success: true, message: 'Inquiries merged successfully' };
  }

  @Mutation(() => Object)
  async proposeManualAmendment(
    @Arg('input') input: ProposeManualAmendmentInput,
    @Ctx() { pool, userId }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const amendmentService = new AmendmentService(pool);

    const amendmentId = await amendmentService.proposeAmendment(
      input.nodeId,
      input.fieldPath,
      input.newValue,
      input.inquiryId,
      input.positionId,
      input.explanation,
      userId
    );

    const amendment = await pool.query(
      'SELECT * FROM public."NodeAmendments" WHERE id = $1',
      [amendmentId]
    );

    return amendment.rows[0];
  }

  @Mutation(() => Object)
  async applyAmendment(
    @Arg('input') input: ApplyAmendmentInput,
    @Ctx() { pool, userId, pubSub }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const amendmentService = new AmendmentService(pool);
    await amendmentService.applyAmendment(input.amendmentId, userId);

    // Get node ID and recalculate node credibility
    const amendmentResult = await pool.query(
      'SELECT node_id FROM public."NodeAmendments" WHERE id = $1',
      [input.amendmentId]
    );
    const nodeId = amendmentResult.rows[0].node_id;

    const credibilityService = new CredibilityCalculationService(pool);
    const nodeCredibility = await credibilityService.calculateNodeCredibility(nodeId);

    // Update node credibility
    await pool.query(
      'UPDATE public."Nodes" SET credibility_score = $1, updated_at = NOW() WHERE id = $2',
      [nodeCredibility, nodeId]
    );

    // Publish to subscriptions
    await pubSub.publish(AMENDMENT_APPLIED, { amendmentId: input.amendmentId, nodeId });
    await pubSub.publish(NODE_CREDIBILITY_UPDATED, { nodeId, credibility: nodeCredibility });

    return { success: true, message: 'Amendment applied successfully' };
  }

  @Mutation(() => Object)
  async rejectAmendment(
    @Arg('amendmentId') amendmentId: string,
    @Arg('reason') reason: string,
    @Ctx() { pool, userId }: Context
  ): Promise<any> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    const amendmentService = new AmendmentService(pool);
    await amendmentService.rejectAmendment(amendmentId, reason, userId);

    return { success: true, message: 'Amendment rejected successfully' };
  }

  @Mutation(() => Object)
  async recalculateNodeCredibility(
    @Arg('nodeId') nodeId: string,
    @Ctx() { pool, pubSub }: Context
  ): Promise<any> {
    const credibilityService = new CredibilityCalculationService(pool);
    const credibility = await credibilityService.calculateNodeCredibility(nodeId);

    // Update node
    await pool.query(
      `
      UPDATE public."Nodes"
      SET credibility_score = $1,
          last_credibility_update = NOW(),
          updated_at = NOW()
      WHERE id = $2
      `,
      [credibility, nodeId]
    );

    // Publish to subscriptions
    await pubSub.publish(NODE_CREDIBILITY_UPDATED, { nodeId, credibility });

    return { nodeId, credibility };
  }

  /**
   * SUBSCRIPTIONS
   */

  @Subscription(() => Object, {
    topics: INQUIRY_CREATED,
    filter: ({ payload, args }) => {
      if (args.nodeId && payload.node_id !== args.nodeId) {
        return false;
      }
      return true;
    }
  })
  inquiryCreated(
    @Root() inquiry: any,
    @Arg('nodeId', { nullable: true }) nodeId?: string
  ): any {
    return inquiry;
  }

  @Subscription(() => Object, {
    topics: POSITION_CREATED,
    filter: ({ payload, args }) => payload.inquiry_id === args.inquiryId
  })
  positionCreated(
    @Root() position: any,
    @Arg('inquiryId') inquiryId: string
  ): any {
    return position;
  }

  @Subscription(() => Object, {
    topics: POSITION_UPDATED,
    filter: ({ payload, args }) => payload.inquiry_id === args.inquiryId
  })
  positionUpdated(
    @Root() position: any,
    @Arg('inquiryId') inquiryId: string
  ): any {
    return position;
  }

  @Subscription(() => Object, {
    topics: NODE_CREDIBILITY_UPDATED,
    filter: ({ payload, args }) => payload.nodeId === args.nodeId
  })
  nodeCredibilityUpdated(
    @Root() update: any,
    @Arg('nodeId') nodeId: string
  ): any {
    return update;
  }

  @Subscription(() => Object, {
    topics: AMENDMENT_PROPOSED,
    filter: ({ payload, args }) => payload.nodeId === args.nodeId
  })
  amendmentProposed(
    @Root() amendment: any,
    @Arg('nodeId') nodeId: string
  ): any {
    return amendment;
  }

  @Subscription(() => Object, {
    topics: AMENDMENT_APPLIED,
    filter: ({ payload, args }) => payload.nodeId === args.nodeId
  })
  amendmentApplied(
    @Root() update: any,
    @Arg('nodeId') nodeId: string
  ): any {
    return update;
  }

  /**
   * PRIVATE HELPER METHODS
   */

  /**
   * Evaluate position asynchronously using AI
   *
   * @private
   */
  private async evaluatePositionAsync(
    position: any,
    inquiry: any,
    pool: Pool,
    pubSub: PubSubEngine
  ): Promise<void> {
    try {
      // AI evaluation
      const aiService = new AIEvaluationService(pool);
      const evaluation = await aiService.evaluatePosition({
        id: position.id,
        inquiryType: inquiry.inquiry_type,
        argument: position.argument,
        stance: position.stance,
        evidence: []
      });

      // Update position with AI scores
      await pool.query(
        `
        UPDATE public."InquiryPositions"
        SET
          evidence_quality_score = $1,
          coherence_score = $2,
          ai_feedback = $3,
          status = 'evaluated',
          updated_at = NOW()
        WHERE id = $4
        `,
        [
          evaluation.evidenceQualityScore,
          evaluation.coherenceScore,
          JSON.stringify({
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses,
            suggestions: evaluation.suggestions
          }),
          position.id
        ]
      );

      // Calculate credibility
      const credibilityService = new CredibilityCalculationService(pool);
      await credibilityService.calculatePositionCredibility(position.id);

      // Update position status based on threshold
      const thresholdService = new ThresholdFilteringService(pool);
      await thresholdService.updatePositionStatus(position.id);

      // Check if amendment should be triggered
      const amendmentService = new AmendmentService(pool);
      await amendmentService.checkAmendmentTriggers(position.id);

      // Publish update
      await pubSub.publish(POSITION_UPDATED, { ...position, status: 'evaluated' });
    } catch (error) {
      console.error('Error evaluating position:', error);
      await pool.query(
        `
        UPDATE public."InquiryPositions"
        SET status = 'evaluation_failed', updated_at = NOW()
        WHERE id = $1
        `,
        [position.id]
      );
    }
  }
}
