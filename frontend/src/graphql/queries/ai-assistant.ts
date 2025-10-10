/**
 * GraphQL Queries and Mutations for AI Assistant & GraphRAG
 *
 * Provides GraphQL operations for:
 * - GraphRAG question answering with node citations
 * - Vector similarity search
 * - AI methodology guidance
 * - Evidence suggestions
 */

import { gql } from '@apollo/client';

/**
 * Ask the GraphRAG assistant a question
 *
 * Uses vector similarity search and graph context to answer questions
 * about the knowledge graph with specific node citations.
 */
export const ASK_ASSISTANT = gql`
  mutation AskAssistant($input: AskAssistantInput!) {
    askAssistant(input: $input) {
      answer
      citedNodes {
        id
        props
        relevance
      }
      subgraph {
        nodes {
          id
          props
          meta
          nodeType
          weight
          depth
        }
        edges {
          id
          sourceNodeId
          targetNodeId
          edgeType
          props
        }
        anchorNodeIds
      }
    }
  }
`;

/**
 * Find nodes similar to a search query
 *
 * Uses vector embeddings to find semantically similar nodes
 * in the graph.
 */
export const FIND_SIMILAR_NODES = gql`
  query FindSimilarNodes($input: FindSimilarNodesInput!) {
    findSimilarNodes(input: $input) {
      id
      props
      meta
      nodeType
      similarity
      weight
    }
  }
`;

/**
 * Get methodology-specific guidance for next steps
 */
export const GET_METHODOLOGY_GUIDANCE = gql`
  query GetMethodologyGuidance($graphId: ID!) {
    getMethodologyGuidance(graphId: $graphId)
  }
`;

/**
 * Detect logical inconsistencies in the graph
 */
export const DETECT_GRAPH_INCONSISTENCIES = gql`
  query DetectGraphInconsistencies($graphId: ID!) {
    detectGraphInconsistencies(graphId: $graphId)
  }
`;

/**
 * Get AI-powered evidence suggestions for a node
 */
export const SUGGEST_EVIDENCE_SOURCES = gql`
  query SuggestEvidenceSources($nodeId: ID!) {
    suggestEvidenceSources(nodeId: $nodeId) {
      type
      description
      searchQuery
      priority
      rationale
    }
  }
`;

/**
 * Check methodology compliance (advisory only)
 */
export const CHECK_METHODOLOGY_COMPLIANCE = gql`
  query CheckMethodologyCompliance($graphId: ID!) {
    checkMethodologyCompliance(graphId: $graphId) {
      graphId
      methodologyId
      methodologyName
      complianceScore
      isCompliant
      issues {
        type
        severity
        message
        nodeId
        edgeId
        suggestion
      }
      totalNodes
      totalEdges
      missingRequiredNodeTypes
      invalidEdgeConnections
      overallAssessment
      generatedAt
    }
  }
`;

/**
 * Ask the basic AI assistant a question (conversational)
 */
export const ASK_AI_ASSISTANT = gql`
  mutation AskAIAssistant($graphId: ID!, $question: String!) {
    askAIAssistant(graphId: $graphId, question: $question)
  }
`;

/**
 * Clear AI conversation history for a graph
 */
export const CLEAR_AI_CONVERSATION = gql`
  mutation ClearAIConversation($graphId: ID!) {
    clearAIConversation(graphId: $graphId)
  }
`;

/**
 * Get remaining AI request quota
 */
export const GET_REMAINING_AI_REQUESTS = gql`
  query GetRemainingAIRequests {
    getRemainingAIRequests
  }
`;

/**
 * Get suggested prompts based on methodology
 */
export const GET_METHODOLOGY_PROMPT_SUGGESTIONS = gql`
  query GetMethodologyPromptSuggestions($graphId: ID!) {
    getMethodologyPromptSuggestions(graphId: $graphId)
  }
`;
