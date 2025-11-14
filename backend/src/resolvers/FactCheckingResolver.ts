import { Resolver, Query, Mutation, Arg, Ctx, ObjectType, Field, Float, Int, ID, InputType } from 'type-graphql';
import { Context } from '../types/context';
import { factCheckingService, VerificationResult, Evidence } from '../services/FactCheckingService';

/**
 * GraphQL ObjectType for Evidence
 */
@ObjectType()
class EvidenceType {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  nodeTitle!: string;

  @Field({ nullable: true })
  nodeType?: string;

  @Field()
  content!: string;

  @Field(() => Float, { nullable: true })
  veracity?: number;

  @Field(() => Float)
  sourceReliability!: number;

  @Field(() => Float)
  semanticSimilarity!: number;

  @Field()
  evidenceType!: string;

  @Field(() => [String], { nullable: true })
  relationshipPath?: string[];

  @Field({ nullable: true })
  timestamp?: Date;
}

/**
 * GraphQL ObjectType for VerificationResult
 */
@ObjectType()
class VerificationResultType {
  @Field()
  claimText!: string;

  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => Float)
  overallVeracity!: number;

  @Field(() => Float)
  confidence!: number;

  @Field(() => [EvidenceType])
  supportingEvidence!: EvidenceType[];

  @Field(() => [EvidenceType])
  conflictingEvidence!: EvidenceType[];

  @Field(() => [EvidenceType])
  neutralEvidence!: EvidenceType[];

  @Field()
  reasoning!: string;

  @Field()
  shouldCreateInquiry!: boolean;

  @Field(() => [String])
  suggestedInquiryQuestions!: string[];

  @Field()
  generatedAt!: Date;
}

/**
 * Input for claim verification
 */
@InputType()
class VerifyClaimInput {
  @Field()
  claimText!: string;

  @Field(() => ID, { nullable: true })
  sourceNodeId?: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;

  @Field({ nullable: true })
  context?: string;
}

/**
 * Input for evidence search
 */
@InputType()
class FindEvidenceInput {
  @Field()
  claim!: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;

  @Field({ nullable: true })
  context?: string;

  @Field()
  evidenceType!: string; // 'supporting' | 'conflicting' | 'all'
}

/**
 * Input for veracity score update
 */
@InputType()
class UpdateVeracityFromVerificationInput {
  @Field(() => ID)
  nodeId!: string;

  @Field()
  claimText!: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;
}

/**
 * Input for creating inquiries from verification
 */
@InputType()
class CreateInquiriesFromVerificationInput {
  @Field()
  claimText!: string;

  @Field(() => ID)
  sourceNodeId!: string;

  @Field(() => ID, { nullable: true })
  graphId?: string;
}

/**
 * Response for inquiry creation
 */
@ObjectType()
class CreateInquiriesResponse {
  @Field(() => [ID])
  inquiryIds!: string[];

  @Field(() => Int)
  count!: number;

  @Field()
  message!: string;
}

/**
 * FactCheckingResolver
 *
 * GraphQL resolver for fact-checking operations:
 * - Verify claims against database evidence
 * - Find supporting/conflicting evidence
 * - Update veracity scores
 * - Create formal inquiries
 */
@Resolver()
export class FactCheckingResolver {
  /**
   * Verify a claim against the knowledge graph
   */
  @Query(() => VerificationResultType)
  async verifyClaim(
    @Arg('input') input: VerifyClaimInput,
    @Ctx() { pool, userId }: Context
  ): Promise<VerificationResultType> {
    if (!userId) {
      throw new Error('Authentication required to verify claims');
    }

    try {
      const result = await factCheckingService.verifyClaim(
        pool,
        input.claimText,
        input.sourceNodeId,
        input.graphId,
        input.context
      );

      return this.mapVerificationResult(result);
    } catch (error) {
      console.error('Error verifying claim:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to verify claim. Please ensure Ollama is running.'
      );
    }
  }

  /**
   * Find corroborating evidence for a claim
   */
  @Query(() => [EvidenceType])
  async findCorroboratingEvidence(
    @Arg('input') input: FindEvidenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceType[]> {
    if (!userId) {
      throw new Error('Authentication required to find evidence');
    }

    try {
      const evidence = await factCheckingService.findCorroboratingEvidence(
        pool,
        input.claim,
        input.graphId,
        input.context
      );

      return evidence.map(this.mapEvidence);
    } catch (error) {
      console.error('Error finding corroborating evidence:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to find evidence. Please ensure Ollama is running.'
      );
    }
  }

  /**
   * Find conflicting evidence for a claim
   */
  @Query(() => [EvidenceType])
  async findConflictingEvidence(
    @Arg('input') input: FindEvidenceInput,
    @Ctx() { pool, userId }: Context
  ): Promise<EvidenceType[]> {
    if (!userId) {
      throw new Error('Authentication required to find evidence');
    }

    try {
      const evidence = await factCheckingService.findConflictingEvidence(
        pool,
        input.claim,
        input.graphId,
        input.context
      );

      return evidence.map(this.mapEvidence);
    } catch (error) {
      console.error('Error finding conflicting evidence:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to find evidence. Please ensure Ollama is running.'
      );
    }
  }

  /**
   * Generate a comprehensive verification report
   */
  @Query(() => VerificationResultType)
  async generateVerificationReport(
    @Arg('input') input: VerifyClaimInput,
    @Ctx() { pool, userId }: Context
  ): Promise<VerificationResultType> {
    if (!userId) {
      throw new Error('Authentication required to generate reports');
    }

    try {
      const result = await factCheckingService.generateVerificationReport(
        pool,
        input.claimText,
        input.sourceNodeId,
        input.graphId
      );

      return this.mapVerificationResult(result);
    } catch (error) {
      console.error('Error generating verification report:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to generate report. Please ensure Ollama is running.'
      );
    }
  }

  /**
   * Update veracity score for a node based on claim verification
   */
  @Mutation(() => Boolean)
  async updateVeracityFromVerification(
    @Arg('input') input: UpdateVeracityFromVerificationInput,
    @Ctx() { pool, userId }: Context
  ): Promise<boolean> {
    if (!userId) {
      throw new Error('Authentication required to update veracity scores');
    }

    try {
      // First verify the claim
      const verificationResult = await factCheckingService.verifyClaim(
        pool,
        input.claimText,
        input.nodeId,
        input.graphId
      );

      // Update the veracity score
      await factCheckingService.updateVeracityScore(
        pool,
        input.nodeId,
        verificationResult,
        userId
      );

      return true;
    } catch (error) {
      console.error('Error updating veracity score:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to update veracity score'
      );
    }
  }

  /**
   * Create formal inquiries based on claim verification
   */
  @Mutation(() => CreateInquiriesResponse)
  async createInquiriesFromVerification(
    @Arg('input') input: CreateInquiriesFromVerificationInput,
    @Ctx() { pool, userId }: Context
  ): Promise<CreateInquiriesResponse> {
    if (!userId) {
      throw new Error('Authentication required to create inquiries');
    }

    try {
      // Verify the claim
      const verificationResult = await factCheckingService.verifyClaim(
        pool,
        input.claimText,
        input.sourceNodeId,
        input.graphId
      );

      // Create inquiries if needed
      const inquiryIds = await factCheckingService.createInquiryFromVerification(
        pool,
        verificationResult,
        userId
      );

      return {
        inquiryIds,
        count: inquiryIds.length,
        message: inquiryIds.length > 0
          ? `Created ${inquiryIds.length} inquiry/inquiries for uncertain or disputed claim`
          : 'No inquiries needed - claim is well-verified',
      };
    } catch (error) {
      console.error('Error creating inquiries from verification:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to create inquiries'
      );
    }
  }

  /**
   * Verify claim and automatically update veracity score + create inquiries
   */
  @Mutation(() => VerificationResultType)
  async verifyClaimWithActions(
    @Arg('input') input: VerifyClaimInput,
    @Ctx() { pool, userId }: Context
  ): Promise<VerificationResultType> {
    if (!userId) {
      throw new Error('Authentication required');
    }

    try {
      // Verify the claim
      const verificationResult = await factCheckingService.verifyClaim(
        pool,
        input.claimText,
        input.sourceNodeId,
        input.graphId,
        input.context
      );

      // Update veracity score if source node provided
      if (input.sourceNodeId) {
        await factCheckingService.updateVeracityScore(
          pool,
          input.sourceNodeId,
          verificationResult,
          userId
        );
      }

      // Create inquiries if needed
      if (verificationResult.shouldCreateInquiry && input.sourceNodeId) {
        await factCheckingService.createInquiryFromVerification(
          pool,
          verificationResult,
          userId
        );
      }

      return this.mapVerificationResult(verificationResult);
    } catch (error) {
      console.error('Error in verifyClaimWithActions:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to verify claim and perform actions'
      );
    }
  }

  /**
   * Helper method to map Evidence to GraphQL type
   */
  private mapEvidence(evidence: Evidence): EvidenceType {
    return {
      nodeId: evidence.nodeId,
      nodeTitle: evidence.nodeTitle,
      nodeType: evidence.nodeType,
      content: evidence.content,
      veracity: evidence.veracity,
      sourceReliability: evidence.sourceReliability,
      semanticSimilarity: evidence.semanticSimilarity,
      evidenceType: evidence.evidenceType,
      relationshipPath: evidence.relationshipPath,
      timestamp: evidence.timestamp,
    };
  }

  /**
   * Helper method to map VerificationResult to GraphQL type
   */
  private mapVerificationResult(result: VerificationResult): VerificationResultType {
    return {
      claimText: result.claimText,
      sourceNodeId: result.sourceNodeId,
      overallVeracity: result.overallVeracity,
      confidence: result.confidence,
      supportingEvidence: result.supportingEvidence.map(this.mapEvidence),
      conflictingEvidence: result.conflictingEvidence.map(this.mapEvidence),
      neutralEvidence: result.neutralEvidence.map(this.mapEvidence),
      reasoning: result.reasoning,
      shouldCreateInquiry: result.shouldCreateInquiry,
      suggestedInquiryQuestions: result.suggestedInquiryQuestions,
      generatedAt: result.generatedAt,
    };
  }
}
