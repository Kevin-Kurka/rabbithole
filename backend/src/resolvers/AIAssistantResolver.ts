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
}
