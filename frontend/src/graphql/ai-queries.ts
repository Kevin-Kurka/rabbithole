import { gql } from '@apollo/client';

/**
 * GraphQL queries and mutations for AI Assistant operations
 */

/**
 * Query to find similar nodes based on content or topic
 */
export const FIND_SIMILAR_NODES = gql`
  query FindSimilarNodes($graphId: String!, $nodeId: String!, $limit: Int) {
    findSimilarNodes(graphId: $graphId, nodeId: $nodeId, limit: $limit) {
      id
      props
      weight
      similarity
      is_level_0
    }
  }
`;

/**
 * Mutation to ask the AI assistant a question
 */
export const ASK_ASSISTANT = gql`
  mutation AskAssistant($input: AssistantQueryInput!) {
    askAssistant(input: $input) {
      response
      citedNodes {
        id
        props
        weight
        relevance
      }
      confidence
      sources
    }
  }
`;

/**
 * Query to get AI suggestions for a graph
 */
export const GET_AI_SUGGESTIONS = gql`
  query GetAISuggestions($graphId: String!) {
    aiSuggestions(graphId: $graphId) {
      id
      type
      title
      description
      targetNodeId
      priority
      created_at
    }
  }
`;

/**
 * Mutation to generate content suggestions
 */
export const GENERATE_CONTENT_SUGGESTION = gql`
  mutation GenerateContentSuggestion($nodeId: String!, $context: String) {
    generateContentSuggestion(nodeId: $nodeId, context: $context) {
      suggestions
      reasoning
    }
  }
`;

// TypeScript types for AI query responses

export interface SimilarNode {
  id: string;
  props: Record<string, unknown>;
  weight: number;
  similarity: number;
  is_level_0: boolean;
}

export interface CitedNode {
  id: string;
  props: Record<string, unknown>;
  weight: number;
  relevance: number;
}

export interface AssistantResponse {
  response: string;
  citedNodes: CitedNode[];
  confidence: number;
  sources: string[];
}

export interface AISuggestion {
  id: string;
  type: 'connection' | 'content' | 'verification' | 'expansion';
  title: string;
  description: string;
  targetNodeId?: string;
  priority: number;
  created_at: string;
}

export interface AssistantQueryInput {
  graphId: string;
  question: string;
  selectedNodeIds?: string[];
  context?: string;
}

export interface ContentSuggestion {
  suggestions: string[];
  reasoning: string;
}

// Response types for GraphQL operations

export interface FindSimilarNodesData {
  findSimilarNodes: SimilarNode[];
}

export interface FindSimilarNodesVariables {
  graphId: string;
  nodeId: string;
  limit?: number;
}

export interface AskAssistantData {
  askAssistant: AssistantResponse;
}

export interface AskAssistantVariables {
  input: AssistantQueryInput;
}

export interface GetAISuggestionsData {
  aiSuggestions: AISuggestion[];
}

export interface GetAISuggestionsVariables {
  graphId: string;
}

export interface GenerateContentSuggestionData {
  generateContentSuggestion: ContentSuggestion;
}

export interface GenerateContentSuggestionVariables {
  nodeId: string;
  context?: string;
}

// =============================================================================
// FORMAL INQUIRY SYSTEM - AI-GUIDED TRUTH-SEEKING
// =============================================================================

/**
 * Mutation to fact-check a claim against the knowledge graph
 */
export const FACT_CHECK_CLAIM = gql`
  mutation FactCheckClaim($input: FactCheckInput!) {
    factCheckClaim(input: $input) {
      verdict
      confidence
      supportingEvidence {
        nodeId
        content
        credibilityScore
        relevance
      }
      contradictingEvidence {
        nodeId
        content
        credibilityScore
        relevance
      }
      missingContext
      recommendations
      analysis
    }
  }
`;

/**
 * Query to generate counter-arguments for a challenge
 */
export const GENERATE_COUNTER_ARGUMENTS = gql`
  query GenerateCounterArguments($challengeId: String!, $userId: String!) {
    generateCounterArguments(challengeId: $challengeId, userId: $userId) {
      argument
      reasoning
      evidenceNeeded
      strength
    }
  }
`;

/**
 * Query to discover evidence for a challenge
 */
export const DISCOVER_EVIDENCE = gql`
  query DiscoverEvidence($challengeId: String!, $side: String!, $userId: String!) {
    discoverEvidence(challengeId: $challengeId, side: $side, userId: $userId) {
      type
      source
      description
      searchQuery
      nodeId
      relevance
      expectedImpact
    }
  }
`;

/**
 * Query to get process guidance for a challenge
 */
export const GET_CHALLENGE_GUIDANCE = gql`
  query GetChallengeGuidance($challengeId: String!, $userId: String!) {
    getChallengeGuidance(challengeId: $challengeId, userId: $userId) {
      currentStage
      nextSteps {
        action
        description
        priority
        estimatedTime
      }
      warnings
      suggestions
      readinessForResolution {
        ready
        reasoning
        missingElements
      }
    }
  }
`;

/**
 * Query to summarize a resolved challenge
 */
export const SUMMARIZE_CHALLENGE = gql`
  query SummarizeChallenge($challengeId: String!, $userId: String!) {
    summarizeChallenge(challengeId: $challengeId, userId: $userId) {
      summary
      keyFindings
      evidenceQuality {
        challenger
        defender
      }
      communityConsensus {
        supportChallenge
        supportDefender
        neutral
      }
      impactAssessment
      recommendations
    }
  }
`;

// TypeScript types for AI formal inquiry

export interface FactCheckEvidence {
  nodeId: string;
  content: string;
  credibilityScore: number;
  relevance: number;
}

export interface FactCheckResult {
  verdict: 'supported' | 'contradicted' | 'insufficient_evidence' | 'needs_clarification';
  confidence: number;
  supportingEvidence: FactCheckEvidence[];
  contradictingEvidence: FactCheckEvidence[];
  missingContext: string[];
  recommendations: string[];
  analysis: string;
}

export interface FactCheckInput {
  claim: string;
  targetNodeId?: string;
  targetEdgeId?: string;
  grounds?: string;
  userId: string;
}

export interface CounterArgument {
  argument: string;
  reasoning: string;
  evidenceNeeded: string[];
  strength: number;
}

export interface EvidenceDiscovery {
  type: 'internal' | 'external';
  source: string;
  description: string;
  searchQuery?: string;
  nodeId?: string;
  relevance: number;
  expectedImpact: 'strong_support' | 'moderate_support' | 'neutral' | 'moderate_contradiction' | 'strong_contradiction';
}

export interface ProcessNextStep {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export interface ResolutionReadiness {
  ready: boolean;
  reasoning: string;
  missingElements: string[];
}

export interface ProcessGuidance {
  currentStage: string;
  nextSteps: ProcessNextStep[];
  warnings: string[];
  suggestions: string[];
  readinessForResolution?: ResolutionReadiness;
}

export interface EvidenceQuality {
  challenger: number;
  defender: number;
}

export interface CommunityConsensus {
  supportChallenge: number;
  supportDefender: number;
  neutral: number;
}

export interface ChallengeSummary {
  summary: string;
  keyFindings: string[];
  evidenceQuality: EvidenceQuality;
  communityConsensus?: CommunityConsensus;
  impactAssessment: string;
  recommendations: string[];
}

// Variables for GraphQL operations

export interface FactCheckClaimVariables {
  input: FactCheckInput;
}

export interface FactCheckClaimData {
  factCheckClaim: FactCheckResult;
}

export interface GenerateCounterArgumentsVariables {
  challengeId: string;
  userId: string;
}

export interface GenerateCounterArgumentsData {
  generateCounterArguments: CounterArgument[];
}

export interface DiscoverEvidenceVariables {
  challengeId: string;
  side: 'challenger' | 'defender';
  userId: string;
}

export interface DiscoverEvidenceData {
  discoverEvidence: EvidenceDiscovery[];
}

export interface GetChallengeGuidanceVariables {
  challengeId: string;
  userId: string;
}

export interface GetChallengeGuidanceData {
  getChallengeGuidance: ProcessGuidance;
}

export interface SummarizeChallengeVariables {
  challengeId: string;
  userId: string;
}

export interface SummarizeChallengeData {
  summarizeChallenge: ChallengeSummary;
}
