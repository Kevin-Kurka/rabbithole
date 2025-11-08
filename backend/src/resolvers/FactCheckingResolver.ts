import { Resolver, Query, Mutation, Arg, Ctx, ID, ObjectType, Field, Float, InputType } from 'type-graphql';
import { Pool } from 'pg';
import { AIAssistantService } from '../services/AIAssistantService';

interface Context {
  pool: Pool;
  userId?: string;
}

// ============================================================================
// TYPES - Fact-Checking Results
// ============================================================================

@ObjectType()
class FactCheckEvidence {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  content!: string;

  @Field(() => Float)
  credibilityScore!: number;

  @Field(() => Float)
  relevance!: number;
}

@ObjectType()
class FactCheckResult {
  @Field()
  verdict!: string; // 'supported' | 'contradicted' | 'insufficient_evidence' | 'needs_clarification'

  @Field(() => Float)
  confidence!: number;

  @Field(() => [FactCheckEvidence])
  supportingEvidence!: FactCheckEvidence[];

  @Field(() => [FactCheckEvidence])
  contradictingEvidence!: FactCheckEvidence[];

  @Field(() => [String])
  missingContext!: string[];

  @Field(() => [String])
  recommendations!: string[];

  @Field()
  analysis!: string;
}

@ObjectType()
class CounterArgument {
  @Field()
  argument!: string;

  @Field()
  reasoning!: string;

  @Field(() => [String])
  evidenceNeeded!: string[];

  @Field(() => Float)
  strength!: number;
}

@ObjectType()
class EvidenceItem {
  @Field()
  type!: string; // 'internal' | 'external'

  @Field()
  source!: string;

  @Field()
  description!: string;

  @Field({ nullable: true })
  searchQuery?: string;

  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field(() => Float)
  relevance!: number;

  @Field()
  expectedImpact!: string; // 'strong_support' | 'moderate_support' | 'neutral' | 'moderate_contradiction' | 'strong_contradiction'
}

@ObjectType()
class ProcessGuidanceNextStep {
  @Field()
  action!: string;

  @Field()
  description!: string;

  @Field()
  priority!: string; // 'high' | 'medium' | 'low'

  @Field()
  estimatedTime!: string;
}

@ObjectType()
class ReadinessForResolution {
  @Field()
  ready!: boolean;

  @Field()
  reasoning!: string;

  @Field(() => [String])
  missingElements!: string[];
}

@ObjectType()
class ProcessGuidanceResult {
  @Field()
  currentStage!: string;

  @Field(() => [ProcessGuidanceNextStep])
  nextSteps!: ProcessGuidanceNextStep[];

  @Field(() => [String])
  warnings!: string[];

  @Field(() => [String])
  suggestions!: string[];

  @Field(() => ReadinessForResolution, { nullable: true })
  readinessForResolution?: ReadinessForResolution;
}

@ObjectType()
class ContradictionMatch {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  title!: string;

  @Field()
  contradictionText!: string;

  @Field()
  originalClaim!: string;

  @Field()
  explanation!: string;

  @Field(() => Float)
  severity!: number; // 0.0-1.0

  @Field(() => Float)
  confidence!: number; // 0.0-1.0

  @Field(() => Float)
  credibility!: number; // Credibility of contradicting source
}

// ============================================================================
// INPUT TYPES
// ============================================================================

@InputType()
class FactCheckInput {
  @Field()
  claim!: string;

  @Field(() => ID, { nullable: true })
  targetNodeId?: string;

  @Field(() => ID, { nullable: true })
  targetEdgeId?: string;

  @Field({ nullable: true })
  grounds?: string; // JSON string of evidence

  @Field(() => ID)
  userId!: string;
}

@InputType()
class ContradictionSearchInput {
  @Field()
  claim!: string;

  @Field(() => ID, { nullable: true })
  nodeId?: string;

  @Field(() => Float, { defaultValue: 0.6 })
  minimumSeverity!: number; // Only return contradictions >= this severity

  @Field({ defaultValue: 10 })
  limit!: number;
}

// ============================================================================
// RESOLVER
// ============================================================================

@Resolver()
export class FactCheckingResolver {
  private aiService: AIAssistantService;

  constructor() {
    this.aiService = new AIAssistantService();
  }

  /**
   * Fact-check a claim against the knowledge graph
   * Uses AI to determine if claim is supported, contradicted, or needs more evidence
   */
  @Mutation(() => FactCheckResult)
  async factCheckClaim(
    @Arg('input') input: FactCheckInput,
    @Ctx() { pool }: Context
  ): Promise<FactCheckResult> {
    try {
      const result = await this.aiService.factCheckClaim(
        pool,
        input.claim,
        {
          targetNodeId: input.targetNodeId,
          targetEdgeId: input.targetEdgeId,
          grounds: input.grounds ? JSON.parse(input.grounds) : undefined,
        },
        input.userId
      );

      return result;
    } catch (error: any) {
      console.error('Error in fact-checking:', error);
      throw new Error(`Fact-check failed: ${error.message}`);
    }
  }

  /**
   * Generate counter-arguments for a challenge
   * Helps devil's advocate role by identifying weaknesses
   */
  @Query(() => [CounterArgument])
  async generateCounterArguments(
    @Arg('challengeId', () => ID) challengeId: string,
    @Arg('userId', () => ID) userId: string,
    @Ctx() { pool }: Context
  ): Promise<CounterArgument[]> {
    try {
      return await this.aiService.generateCounterArguments(pool, challengeId, userId);
    } catch (error: any) {
      console.error('Error generating counter-arguments:', error);
      return [];
    }
  }

  /**
   * Get AI-powered evidence discovery suggestions
   * Tells users where/how to find supporting evidence
   */
  @Query(() => [EvidenceItem])
  async discoverEvidence(
    @Arg('challengeId', () => ID) challengeId: string,
    @Arg('side') side: string, // 'challenger' | 'defender'
    @Arg('userId', () => ID) userId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceItem[]> {
    try {
      return await this.aiService.discoverEvidence(pool, challengeId, side as 'challenger' | 'defender', userId);
    } catch (error: any) {
      console.error('Error discovering evidence:', error);
      throw new Error(`Evidence discovery failed: ${error.message}`);
    }
  }

  /**
   * Get step-by-step process guidance for a challenge
   * Helps users navigate the formal inquiry process
   */
  @Query(() => ProcessGuidanceResult)
  async getProcessGuidance(
    @Arg('challengeId', () => ID) challengeId: string,
    @Arg('userId', () => ID) userId: string,
    @Ctx() { pool }: Context
  ): Promise<ProcessGuidanceResult> {
    try {
      return await this.aiService.getProcessGuidance(pool, challengeId, userId);
    } catch (error: any) {
      console.error('Error getting process guidance:', error);
      throw new Error(`Process guidance failed: ${error.message}`);
    }
  }

  /**
   * Search for claims that contradict the given claim
   * Proactive contradiction detection to prevent inconsistencies
   */
  @Query(() => [ContradictionMatch])
  async findContradictions(
    @Arg('input') input: ContradictionSearchInput,
    @Ctx() { pool, userId }: Context
  ): Promise<ContradictionMatch[]> {
    try {
      // Use userId from context or default to empty string (for public access)
      const userIdForRateLimit = userId || 'anonymous';

      return await this.aiService.findContradictions(
        pool,
        input.claim,
        {
          nodeId: input.nodeId,
          minimumSeverity: input.minimumSeverity,
          limit: input.limit,
        },
        userIdForRateLimit
      );
    } catch (error: any) {
      console.error('Error finding contradictions:', error);
      return [];
    }
  }

  /**
   * Get readiness score for resolving a challenge
   * Assesses whether challenge has enough evidence and analysis for fair resolution
   */
  @Query(() => Float)
  async getChallengeReadinessScore(
    @Arg('challengeId', () => ID) challengeId: string,
    @Ctx() { pool }: Context
  ): Promise<number> {
    try {
      // Fetch challenge data
      const challengeResult = await pool.query(
        `SELECT * FROM public."Challenges" WHERE id = $1`,
        [challengeId]
      );

      if (challengeResult.rows.length === 0) {
        return 0;
      }

      const challenge = challengeResult.rows[0];

      // Fetch evidence counts
      const evidenceResult = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE side = 'challenger') as challenger_evidence,
          COUNT(*) FILTER (WHERE side = 'defender') as defender_evidence,
          COUNT(*) FILTER (WHERE side = 'neutral') as neutral_evidence
         FROM public."ChallengeEvidence"
         WHERE challenge_id = $1`,
        [challengeId]
      );

      const evidence = evidenceResult.rows[0];

      // Fetch vote counts
      const voteResult = await pool.query(
        `SELECT COUNT(*) as total_votes FROM public."ChallengeVotes" WHERE challenge_id = $1`,
        [challengeId]
      );

      const votes = voteResult.rows[0].total_votes;

      // Calculate readiness score (0.0-1.0)
      let score = 0.0;

      // Has claim, grounds, warrant? (+0.2)
      if (challenge.claim && challenge.grounds && challenge.warrant) {
        score += 0.2;
      }

      // Has rebuttal? (+0.15)
      if (challenge.rebuttal_claim) {
        score += 0.15;
      }

      // Has evidence from both sides? (+0.25)
      if (evidence.challenger_evidence > 0 && evidence.defender_evidence > 0) {
        score += 0.25;
      }

      // Has significant evidence (3+ total)? (+0.15)
      const totalEvidence =
        parseInt(evidence.challenger_evidence) +
        parseInt(evidence.defender_evidence) +
        parseInt(evidence.neutral_evidence);
      if (totalEvidence >= 3) {
        score += 0.15;
      }

      // Has community engagement (5+ votes)? (+0.15)
      if (votes >= 5) {
        score += 0.15;
      }

      // Has AI analysis? (+0.1)
      if (challenge.ai_analysis) {
        score += 0.1;
      }

      return Math.min(score, 1.0);
    } catch (error: any) {
      console.error('Error calculating readiness score:', error);
      return 0;
    }
  }
}
