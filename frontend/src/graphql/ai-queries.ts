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
