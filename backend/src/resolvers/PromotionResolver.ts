import { Resolver, Query, Mutation, Arg, Ctx, ObjectType, Field, InputType, Float, ID, Int } from 'type-graphql';
import { Pool } from 'pg';
import { PromotionEligibilityService } from '../services/PromotionEligibilityService';

// ============================================================================
// Input Types
// ============================================================================

@InputType()
class PromoteToLevel0Input {
  @Field(() => ID)
  nodeId: string;

  @Field()
  promotionType: string; // 'FACT' or 'FALSEHOOD'

  @Field({ nullable: true })
  curatorNotes?: string;
}

// ============================================================================
// Output Types
// ============================================================================

@ObjectType()
class PromotionCriteria {
  @Field(() => Float)
  methodologyCompletion: number;

  @Field(() => Float)
  communityConsensus: number;

  @Field(() => Float)
  evidenceQuality: number;

  @Field(() => Int)
  openChallenges: number;
}

@ObjectType()
class PromotionEligibility {
  @Field(() => ID)
  nodeId: string;

  @Field(() => PromotionCriteria)
  criteria: PromotionCriteria;

  @Field(() => Float)
  overallScore: number;

  @Field()
  eligible: boolean;

  @Field(() => [String])
  blockers: string[];

  @Field(() => [String])
  recommendations: string[];

  @Field()
  lastEvaluated: string;
}

@ObjectType()
class PromotionResult {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => ID, { nullable: true })
  promotionId?: string;
}

@ObjectType()
class NodeInfo {
  @Field(() => ID)
  id: string;

  @Field()
  props: string; // JSON stringified
}

@ObjectType()
class CuratorInfo {
  @Field()
  username: string;
}

@ObjectType()
class PromotionEvent {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  nodeId: string;

  @Field()
  promotionType: string;

  @Field(() => Float)
  finalWeight: number;

  @Field(() => Float)
  methodologyCompletion: number;

  @Field(() => Float)
  communityConsensus: number;

  @Field(() => Float)
  evidenceQuality: number;

  @Field(() => ID)
  curatorId: string;

  @Field({ nullable: true })
  curatorNotes?: string;

  @Field()
  promotedAt: string;

  @Field(() => NodeInfo, { nullable: true })
  node?: NodeInfo;

  @Field(() => CuratorInfo, { nullable: true })
  curator?: CuratorInfo;
}

// ============================================================================
// Resolver
// ============================================================================

@Resolver()
export class PromotionResolver {
  /**
   * Get promotion eligibility for a specific node
   */
  @Query(() => PromotionEligibility, { nullable: true })
  async promotionEligibility(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<PromotionEligibility | null> {
    const service = new PromotionEligibilityService(pool);

    try {
      const eligibility = await service.evaluateEligibility(nodeId);
      return eligibility;
    } catch (error) {
      console.error('Error evaluating promotion eligibility:', error);
      return null;
    }
  }

  /**
   * Get all nodes eligible for Level 0 promotion
   */
  @Query(() => [PromotionEligibility])
  async eligibleNodes(
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<PromotionEligibility[]> {
    const service = new PromotionEligibilityService(pool);

    try {
      const eligibleNodes = await service.getEligibleNodes(limit);
      return eligibleNodes;
    } catch (error) {
      console.error('Error fetching eligible nodes:', error);
      return [];
    }
  }

  /**
   * Promote a node to Level 0
   */
  @Mutation(() => PromotionResult)
  async promoteToLevel0(
    @Arg('input') input: PromoteToLevel0Input,
    @Ctx() { pool, userId }: { pool: Pool; userId?: string }
  ): Promise<PromotionResult> {
    if (!userId) {
      return {
        success: false,
        message: 'Authentication required to promote nodes',
      };
    }

    const service = new PromotionEligibilityService(pool);

    try {
      const result = await service.promoteToLevel0(
        input.nodeId,
        userId,
        input.promotionType,
        input.curatorNotes
      );

      return result;
    } catch (error) {
      console.error('Error promoting node:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get promotion events (public ledger)
   */
  @Query(() => [PromotionEvent])
  async promotionEvents(
    @Arg('limit', () => Int, { defaultValue: 100 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { pool }: { pool: Pool }
  ): Promise<PromotionEvent[]> {
    try {
      const result = await pool.query(
        `
        SELECT
          pe.id,
          pe.node_id as "nodeId",
          pe.promotion_type as "promotionType",
          pe.final_weight as "finalWeight",
          pe.methodology_completion as "methodologyCompletion",
          pe.community_consensus as "communityConsensus",
          pe.evidence_quality as "evidenceQuality",
          pe.curator_id as "curatorId",
          pe.curator_notes as "curatorNotes",
          pe.promoted_at as "promotedAt",
          n.props,
          u.username
        FROM public."PromotionLog" pe
        LEFT JOIN public."Nodes" n ON n.id = pe.node_id
        LEFT JOIN public."Users" u ON u.id = pe.curator_id
        ORDER BY pe.promoted_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      return result.rows.map((row) => ({
        id: row.id,
        nodeId: row.nodeId,
        promotionType: row.promotionType,
        finalWeight: row.finalWeight,
        methodologyCompletion: row.methodologyCompletion,
        communityConsensus: row.communityConsensus,
        evidenceQuality: row.evidenceQuality,
        curatorId: row.curatorId,
        curatorNotes: row.curatorNotes,
        promotedAt: row.promotedAt,
        node: row.props ? { id: row.nodeId, props: JSON.stringify(row.props) } : null,
        curator: row.username ? { username: row.username } : null,
      }));
    } catch (error) {
      console.error('Error fetching promotion events:', error);
      return [];
    }
  }
}
