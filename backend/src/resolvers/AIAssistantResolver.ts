import { Resolver, Query, Mutation, Arg, Ctx, ObjectType, Field, InputType } from 'type-graphql';
import { AIAssistantService } from '../services/AIAssistantService';
import { Context } from '../types/context';

@ObjectType()
class AIResponse {
  @Field()
  message: string;

  @Field()
  success: boolean;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
class EvidenceSuggestion {
  @Field()
  type: string;

  @Field()
  description: string;

  @Field()
  searchQuery: string;

  @Field()
  priority: number;

  @Field()
  rationale: string;
}

// =============================================================================
// FORMAL INQUIRY SYSTEM - AI Types
// =============================================================================

@ObjectType()
class FactCheckEvidence {
  @Field()
  nodeId: string;

  @Field()
  content: string;

  @Field()
  credibilityScore: number;

  @Field()
  relevance: number;
}

@ObjectType()
class FactCheckResult {
  @Field()
  verdict: string; // 'supported' | 'contradicted' | 'insufficient_evidence' | 'needs_clarification'

  @Field()
  confidence: number;

  @Field(() => [FactCheckEvidence])
  supportingEvidence: FactCheckEvidence[];

  @Field(() => [FactCheckEvidence])
  contradictingEvidence: FactCheckEvidence[];

  @Field(() => [String])
  missingContext: string[];

  @Field(() => [String])
  recommendations: string[];

  @Field()
  analysis: string;
}

@ObjectType()
class CounterArgument {
  @Field()
  argument: string;

  @Field()
  reasoning: string;

  @Field(() => [String])
  evidenceNeeded: string[];

  @Field()
  strength: number;
}

@ObjectType()
class EvidenceDiscovery {
  @Field()
  type: string; // 'internal' | 'external'

  @Field()
  source: string;

  @Field()
  description: string;

  @Field({ nullable: true })
  searchQuery?: string;

  @Field({ nullable: true })
  nodeId?: string;

  @Field()
  relevance: number;

  @Field()
  expectedImpact: string; // 'strong_support' | 'moderate_support' | 'neutral' | 'moderate_contradiction' | 'strong_contradiction'
}

@ObjectType()
class ProcessNextStep {
  @Field()
  action: string;

  @Field()
  description: string;

  @Field()
  priority: string; // 'high' | 'medium' | 'low'

  @Field()
  estimatedTime: string;
}

@ObjectType()
class ResolutionReadiness {
  @Field()
  ready: boolean;

  @Field()
  reasoning: string;

  @Field(() => [String])
  missingElements: string[];
}

@ObjectType()
class ProcessGuidance {
  @Field()
  currentStage: string;

  @Field(() => [ProcessNextStep])
  nextSteps: ProcessNextStep[];

  @Field(() => [String])
  warnings: string[];

  @Field(() => [String])
  suggestions: string[];

  @Field(() => ResolutionReadiness, { nullable: true })
  readinessForResolution?: ResolutionReadiness;
}

@ObjectType()
class EvidenceQuality {
  @Field()
  challenger: number;

  @Field()
  defender: number;
}

@ObjectType()
class CommunityConsensus {
  @Field()
  supportChallenge: number;

  @Field()
  supportDefender: number;

  @Field()
  neutral: number;
}

@ObjectType()
class ChallengeSummary {
  @Field()
  summary: string;

  @Field(() => [String])
  keyFindings: string[];

  @Field(() => EvidenceQuality)
  evidenceQuality: EvidenceQuality;

  @Field(() => CommunityConsensus, { nullable: true })
  communityConsensus?: CommunityConsensus;

  @Field()
  impactAssessment: string;

  @Field(() => [String])
  recommendations: string[];
}

@InputType()
class FactCheckInput {
  @Field()
  claim: string;

  @Field({ nullable: true })
  targetNodeId?: string;

  @Field({ nullable: true })
  targetEdgeId?: string;

  @Field({ nullable: true })
  grounds?: string;

  @Field()
  userId: string;
}

@InputType()
class AIQueryInput {
  @Field()
  graphId: string;

  @Field()
  question: string;

  @Field()
  userId: string;
}

@Resolver()
export class AIAssistantResolver {
  private aiService: AIAssistantService;

  constructor() {
    this.aiService = new AIAssistantService();
  }

  @Mutation(() => AIResponse)
  async askAI(
    @Arg('input') input: AIQueryInput,
    @Ctx() { pool }: Context
  ): Promise<AIResponse> {
    try {
      const response = await this.aiService.askAIAssistant(
        pool,
        input.graphId,
        input.question,
        input.userId
      );

      return {
        message: response,
        success: true,
      };
    } catch (error: any) {
      return {
        message: '',
        success: false,
        error: error.message,
      };
    }
  }

  @Query(() => [String])
  async detectInconsistencies(
    @Arg('graphId') graphId: string,
    @Ctx() { pool }: Context
  ): Promise<string[]> {
    try {
      return await this.aiService.detectInconsistencies(pool, graphId);
    } catch (error) {
      console.error('Error detecting inconsistencies:', error);
      return ['Unable to detect inconsistencies. Please check that Ollama is running.'];
    }
  }

  @Query(() => String)
  async getNextStepSuggestion(
    @Arg('graphId') graphId: string,
    @Arg('methodologyId') methodologyId: string,
    @Ctx() { pool }: Context
  ): Promise<string> {
    try {
      return await this.aiService.getNextStepSuggestion(pool, graphId, methodologyId);
    } catch (error) {
      console.error('Error getting next step suggestion:', error);
      return 'Unable to generate suggestion. Please check that Ollama is running.';
    }
  }

  @Query(() => [EvidenceSuggestion])
  async suggestEvidence(
    @Arg('nodeId') nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceSuggestion[]> {
    try {
      const suggestions = await this.aiService.suggestEvidence(pool, nodeId);
      // Ensure all suggestions have required fields
      return suggestions.map(s => ({
        type: s.type,
        description: s.description,
        searchQuery: s.searchQuery,
        priority: s.priority,
        rationale: s.rationale || '',
      }));
    } catch (error) {
      console.error('Error suggesting evidence:', error);
      return [];
    }
  }

  @Mutation(() => Boolean)
  async clearAIConversation(
    @Arg('graphId') graphId: string
  ): Promise<boolean> {
    try {
      this.aiService.clearConversation(graphId);
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  }

  @Query(() => Number)
  async getAIRemainingRequests(
    @Arg('userId') userId: string
  ): Promise<number> {
    return this.aiService.getRemainingRequests(userId);
  }

  // =============================================================================
  // FORMAL INQUIRY SYSTEM - AI-GUIDED TRUTH-SEEKING
  // =============================================================================

  @Mutation(() => FactCheckResult)
  async factCheckClaim(
    @Arg('input') input: FactCheckInput,
    @Ctx() { pool }: Context
  ): Promise<FactCheckResult> {
    try {
      return await this.aiService.factCheckClaim(
        pool,
        input.claim,
        {
          targetNodeId: input.targetNodeId,
          targetEdgeId: input.targetEdgeId,
          grounds: input.grounds,
        },
        input.userId
      );
    } catch (error: any) {
      console.error('Error in fact-checking:', error);
      throw new Error(error.message || 'Failed to fact-check claim');
    }
  }

  @Query(() => [CounterArgument])
  async generateCounterArguments(
    @Arg('challengeId') challengeId: string,
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<CounterArgument[]> {
    try {
      return await this.aiService.generateCounterArguments(pool, challengeId, userId);
    } catch (error: any) {
      console.error('Error generating counter-arguments:', error);
      return [{
        argument: 'Unable to generate counter-arguments',
        reasoning: error.message || 'AI service error',
        evidenceNeeded: [],
        strength: 0,
      }];
    }
  }

  @Query(() => [EvidenceDiscovery])
  async discoverEvidence(
    @Arg('challengeId') challengeId: string,
    @Arg('side') side: string, // 'challenger' | 'defender'
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceDiscovery[]> {
    try {
      if (side !== 'challenger' && side !== 'defender') {
        throw new Error('Side must be either "challenger" or "defender"');
      }

      return await this.aiService.discoverEvidence(
        pool,
        challengeId,
        side as 'challenger' | 'defender',
        userId
      );
    } catch (error: any) {
      console.error('Error discovering evidence:', error);
      return [];
    }
  }

  @Query(() => ProcessGuidance)
  async getChallengeGuidance(
    @Arg('challengeId') challengeId: string,
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<ProcessGuidance> {
    try {
      return await this.aiService.getProcessGuidance(pool, challengeId, userId);
    } catch (error: any) {
      console.error('Error getting process guidance:', error);
      return {
        currentStage: 'unknown',
        nextSteps: [],
        warnings: [],
        suggestions: [error.message || 'Unable to generate guidance at this time'],
      };
    }
  }

  @Query(() => ChallengeSummary)
  async summarizeChallenge(
    @Arg('challengeId') challengeId: string,
    @Arg('userId') userId: string,
    @Ctx() { pool }: Context
  ): Promise<ChallengeSummary> {
    try {
      return await this.aiService.summarizeChallenge(pool, challengeId, userId);
    } catch (error: any) {
      console.error('Error summarizing challenge:', error);
      return {
        summary: 'Unable to generate summary',
        keyFindings: [],
        evidenceQuality: { challenger: 0, defender: 0 },
        impactAssessment: error.message || 'Summary generation failed',
        recommendations: [],
      };
    }
  }
}
