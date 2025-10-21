import { Resolver, Query, Mutation, Arg, Ctx, ID } from 'type-graphql';
import { Pool } from 'pg';
import {
  ComplianceReport,
  EvidenceSuggestion,
  AIConversationMessage,
} from '../entities/ComplianceReport';
import {
  SimilarNode,
  AssistantResponse,
  FindSimilarNodesInput,
  AskAssistantInput,
} from '../entities/GraphRAG';
import { AIAssistantService } from '../services/AIAssistantService';
import { GraphRAGService } from '../services/GraphRAGService';

interface Context {
  pool: Pool;
  userId?: string;
}

@Resolver()
export class AIAssistantResolver {
  private aiService: AIAssistantService;
  private graphRAGService: GraphRAGService;

  constructor() {
    try {
      this.aiService = new AIAssistantService();
    } catch (error) {
      console.warn('AI Assistant Service initialization failed:', error);
      // Service will be unavailable but won't crash the server
      this.aiService = null as any;
    }

    try {
      this.graphRAGService = new GraphRAGService();
    } catch (error) {
      console.warn('GraphRAG Service initialization failed:', error);
      this.graphRAGService = null as any;
    }
  }

  /**
   * Helper to check if AI service is available
   */
  private ensureServiceAvailable(): void {
    if (!this.aiService) {
      throw new Error(
        'AI Assistant is currently unavailable. Please ensure OPENAI_API_KEY is configured.'
      );
    }
  }

  /**
   * Get methodology-aware guidance for next steps
   *
   * Analyzes the current graph state and suggests what the user might
   * consider doing next based on the methodology workflow and current progress.
   */
  @Query(() => String, {
    description: 'Get AI-powered suggestion for next step in your investigation workflow',
  })
  async getMethodologyGuidance(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<string> {
    this.ensureServiceAvailable();

    try {
      // Fetch graph to get methodology
      const graphResult = await pool.query(
        'SELECT methodology FROM public."Graphs" WHERE id = $1',
        [graphId]
      );

      if (graphResult.rows.length === 0) {
        throw new Error('Graph not found');
      }

      const methodologyId = graphResult.rows[0].methodology;

      if (!methodologyId) {
        return 'This graph isn\'t currently using a specific methodology. You might find it helpful to select one from the methodology library to get structured guidance for your investigation. That said, free-form exploration is also a valid approach!';
      }

      return await this.aiService.getNextStepSuggestion(pool, graphId, methodologyId);
    } catch (error) {
      console.error('Error in getMethodologyGuidance:', error);
      throw new Error(`Unable to generate guidance: ${(error as Error).message}`);
    }
  }

  /**
   * Detect logical inconsistencies or issues in the graph
   *
   * Analyzes node relationships, property completeness, and logical flow
   * to flag potential issues the user might want to review.
   */
  @Query(() => [String], {
    description: 'Detect potential inconsistencies or issues in your graph structure',
  })
  async detectGraphInconsistencies(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<string[]> {
    this.ensureServiceAvailable();

    try {
      return await this.aiService.detectInconsistencies(pool, graphId);
    } catch (error) {
      console.error('Error in detectGraphInconsistencies:', error);
      throw new Error(`Unable to detect inconsistencies: ${(error as Error).message}`);
    }
  }

  /**
   * Get suggestions for evidence sources to strengthen a node's claims
   *
   * Based on the node's content and type, suggests specific types of
   * evidence that would validate or challenge the claims being made.
   */
  @Query(() => [EvidenceSuggestion], {
    description: 'Get AI-powered suggestions for evidence to support a node',
  })
  async suggestEvidenceSources(
    @Arg('nodeId', () => ID) nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<EvidenceSuggestion[]> {
    this.ensureServiceAvailable();

    try {
      return await this.aiService.suggestEvidence(pool, nodeId);
    } catch (error) {
      console.error('Error in suggestEvidenceSources:', error);
      throw new Error(`Unable to suggest evidence: ${(error as Error).message}`);
    }
  }

  /**
   * Check how well the graph aligns with methodology best practices
   *
   * Generates a compliance report showing alignment with the selected
   * methodology's guidelines. This is advisory only - it won't prevent
   * any actions or block progression.
   */
  @Query(() => ComplianceReport, {
    description: 'Check methodology compliance and get recommendations (advisory only)',
  })
  async checkMethodologyCompliance(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<ComplianceReport> {
    this.ensureServiceAvailable();

    try {
      return await this.aiService.validateMethodologyCompliance(pool, graphId);
    } catch (error) {
      console.error('Error in checkMethodologyCompliance:', error);
      throw new Error(`Unable to check compliance: ${(error as Error).message}`);
    }
  }

  /**
   * General AI assistant chat for questions about the graph or methodology
   *
   * Provides context-aware responses based on the graph state, methodology,
   * and conversation history. Maintains conversation context per graph.
   */
  @Mutation(() => String, {
    description: 'Ask the AI assistant a question about your investigation',
  })
  async askAIAssistant(
    @Arg('graphId', () => ID) graphId: string,
    @Arg('question') question: string,
    @Ctx() { pool, userId }: Context
  ): Promise<string> {
    this.ensureServiceAvailable();

    if (!userId) {
      throw new Error('Authentication required to use AI assistant');
    }

    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    if (question.length > 1000) {
      throw new Error('Question is too long (max 1000 characters)');
    }

    try {
      return await this.aiService.askAIAssistant(pool, graphId, question, userId);
    } catch (error) {
      console.error('Error in askAIAssistant:', error);
      const errorMessage = (error as Error).message;

      // Provide user-friendly error messages
      if (errorMessage.includes('rate limit') || errorMessage.includes('maximum')) {
        throw error; // Pass through rate limit errors as-is
      }

      throw new Error('Unable to process your question. Please try again later.');
    }
  }

  /**
   * Clear conversation history for a graph
   *
   * Resets the AI's memory of the conversation, starting fresh.
   * Useful when switching to a new topic or investigation phase.
   */
  @Mutation(() => Boolean, {
    description: 'Clear AI conversation history for a graph',
  })
  async clearAIConversation(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { }: Context
  ): Promise<boolean> {
    this.ensureServiceAvailable();

    try {
      this.aiService.clearConversation(graphId);
      return true;
    } catch (error) {
      console.error('Error in clearAIConversation:', error);
      return false;
    }
  }

  /**
   * Get remaining AI requests available for the user
   *
   * Returns the number of AI requests the user can make in the current hour
   * before hitting the rate limit.
   */
  @Query(() => Number, {
    description: 'Get remaining AI assistant requests for the current hour',
  })
  async getRemainingAIRequests(@Ctx() { userId }: Context): Promise<number> {
    this.ensureServiceAvailable();

    if (!userId) {
      return 0;
    }

    try {
      return this.aiService.getRemainingRequests(userId);
    } catch (error) {
      console.error('Error in getRemainingAIRequests:', error);
      return 0;
    }
  }

  /**
   * Get methodology-specific prompt suggestions
   *
   * Returns helpful prompt templates based on the methodology being used.
   * These help users ask better questions to the AI assistant.
   */
  @Query(() => [String], {
    description: 'Get suggested questions/prompts for the AI assistant based on methodology',
  })
  async getMethodologyPromptSuggestions(
    @Arg('graphId', () => ID) graphId: string,
    @Ctx() { pool }: Context
  ): Promise<string[]> {
    try {
      // Fetch graph methodology
      const graphResult = await pool.query(
        `SELECT g.methodology, m.name as methodology_name, m.category
         FROM public."Graphs" g
         LEFT JOIN public."Methodologies" m ON g.methodology = m.id
         WHERE g.id = $1`,
        [graphId]
      );

      if (graphResult.rows.length === 0) {
        throw new Error('Graph not found');
      }

      const { methodology_name, category } = graphResult.rows[0];

      // Return methodology-specific prompts
      return this.getPromptsForMethodology(methodology_name, category);
    } catch (error) {
      console.error('Error in getMethodologyPromptSuggestions:', error);
      // Return generic prompts as fallback
      return [
        'What should I focus on next?',
        'Are there any gaps in my analysis?',
        'How can I strengthen my evidence?',
        'What are the key relationships I should explore?',
      ];
    }
  }

  /**
   * Helper method to generate methodology-specific prompts
   */
  private getPromptsForMethodology(methodologyName: string | null, category: string | null): string[] {
    if (!methodologyName) {
      return [
        'What type of methodology would work best for my investigation?',
        'How should I structure my graph?',
        'What relationships should I explore?',
        'What evidence do I need?',
      ];
    }

    // Methodology-specific prompts
    const promptMap: Record<string, string[]> = {
      '5 Whys Root Cause Analysis': [
        'Have I asked "why" enough times to reach the root cause?',
        'Are my why questions building logically on each other?',
        'Is this really the root cause, or should I dig deeper?',
        'What evidence supports each "why" answer?',
        'How can I validate that this is the true root cause?',
      ],
      'Fishbone (Ishikawa) Diagram': [
        'Have I covered all the major cause categories (6Ms)?',
        'Are there sub-causes I haven\'t explored yet?',
        'Which causes are most likely to be contributing factors?',
        'How do the different causes interact with each other?',
        'What evidence do I need to validate these causes?',
      ],
      'SWOT Analysis': [
        'Have I identified both internal and external factors?',
        'Are my strengths truly unique or just table stakes?',
        'What opportunities am I not considering?',
        'How do my threats relate to my weaknesses?',
        'What strategies leverage my strengths against threats?',
      ],
      'Timeline Analysis': [
        'Is the chronological order correct?',
        'Are there gaps in the timeline I should fill?',
        'What causal relationships exist between events?',
        'Are the dates and timeframes accurate?',
        'What patterns emerge from the timeline?',
      ],
      'Mind Mapping': [
        'Are my main branches comprehensive?',
        'What connections am I missing between branches?',
        'Should I break down any branches further?',
        'How does this relate to my central idea?',
        'What new branches should I explore?',
      ],
      'Systems Thinking Causal Loop': [
        'Have I identified all the feedback loops?',
        'Which loops are reinforcing vs. balancing?',
        'Where are the critical delays in the system?',
        'What are the leverage points for intervention?',
        'How might the system behave over time?',
      ],
      'Decision Tree': [
        'Have I identified all possible choices?',
        'Are my probability estimates realistic?',
        'What\'s the expected value of each path?',
        'What uncertainties am I not accounting for?',
        'Should I gather more information before deciding?',
      ],
      'Concept Mapping': [
        'Are the relationships between concepts clear?',
        'What key concepts am I missing?',
        'How do these concepts build on each other?',
        'Are there contradictions in my concept relationships?',
        'What examples support these concepts?',
      ],
    };

    return promptMap[methodologyName] || [
      'What should I focus on next?',
      'Are there any gaps in my analysis?',
      'How can I strengthen my investigation?',
      'What relationships should I explore?',
    ];
  }

  // =========================================================================
  // GraphRAG - Graph Retrieval Augmented Generation
  // =========================================================================

  /**
   * Helper to check if GraphRAG service is available
   */
  private ensureGraphRAGAvailable(): void {
    if (!this.graphRAGService) {
      throw new Error(
        'GraphRAG is currently unavailable. Please ensure Ollama is running with the required models installed.'
      );
    }
  }

  /**
   * Find similar nodes using vector similarity search
   *
   * Searches the graph for nodes semantically similar to the query.
   * This is useful for:
   * - Finding relevant information in large graphs
   * - Discovering related concepts
   * - Building context for questions
   */
  @Query(() => [SimilarNode], {
    description: 'Find nodes similar to a query using vector similarity search',
  })
  async findSimilarNodes(
    @Arg('input') input: FindSimilarNodesInput,
    @Ctx() { pool }: Context
  ): Promise<SimilarNode[]> {
    this.ensureGraphRAGAvailable();

    try {
      const { graphId, query, selectedNodeIds = [], limit = 10 } = input;

      // Validate graph exists
      const graphCheck = await pool.query(
        'SELECT id FROM public."Graphs" WHERE id = $1',
        [graphId]
      );

      if (graphCheck.rows.length === 0) {
        throw new Error('Graph not found');
      }

      // Perform vector search
      return await this.graphRAGService.findSimilarNodes(
        pool,
        query,
        selectedNodeIds,
        limit
      );
    } catch (error) {
      console.error('Error in findSimilarNodes:', error);
      throw new Error(`Vector search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Ask the assistant a question using GraphRAG
   *
   * This advanced query system:
   * 1. Finds relevant nodes using vector similarity
   * 2. Expands context by traversing relationships
   * 3. Generates an answer citing specific nodes
   *
   * Perfect for:
   * - Asking questions about your graph
   * - Finding connections between concepts
   * - Getting AI insights based on your data
   */
  @Mutation(() => AssistantResponse, {
    description: 'Ask AI assistant a question using graph context (GraphRAG)',
  })
  async askAssistant(
    @Arg('input') input: AskAssistantInput,
    @Ctx() { pool, userId }: Context
  ): Promise<AssistantResponse> {
    this.ensureGraphRAGAvailable();

    if (!userId) {
      throw new Error('Authentication required to use GraphRAG assistant');
    }

    try {
      const {
        graphId,
        query,
        selectedNodeIds = [],
        expansionDepth = 2,
        topK = 5,
      } = input;

      // Validate input
      if (!query || query.trim().length === 0) {
        throw new Error('Query cannot be empty');
      }

      if (query.length > 1000) {
        throw new Error('Query is too long (max 1000 characters)');
      }

      if (expansionDepth < 1 || expansionDepth > 5) {
        throw new Error('Expansion depth must be between 1 and 5');
      }

      if (topK < 1 || topK > 20) {
        throw new Error('topK must be between 1 and 20');
      }

      // Validate graph exists and user has access
      const graphCheck = await pool.query(
        `SELECT id, created_by, privacy
         FROM public."Graphs"
         WHERE id = $1`,
        [graphId]
      );

      if (graphCheck.rows.length === 0) {
        throw new Error('Graph not found');
      }

      const graph = graphCheck.rows[0];

      // Check access permissions
      if (graph.privacy === 'private' && graph.created_by !== userId) {
        throw new Error('You do not have access to this graph');
      }

      // Run the GraphRAG pipeline
      console.log(`GraphRAG query from user ${userId}: "${query.substring(0, 50)}..."`);

      const response = await this.graphRAGService.query(
        pool,
        graphId,
        query,
        selectedNodeIds,
        expansionDepth,
        topK
      );

      return response;
    } catch (error) {
      console.error('Error in askAssistant (GraphRAG):', error);
      const errorMessage = (error as Error).message;

      // Provide user-friendly error messages
      if (errorMessage.includes('Ollama') || errorMessage.includes('connect')) {
        throw new Error(
          'AI service is temporarily unavailable. Please try again later or contact support.'
        );
      }

      throw error;
    }
  }
}
