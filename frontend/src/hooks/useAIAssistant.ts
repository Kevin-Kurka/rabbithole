/**
 * useAIAssistant Hook
 *
 * Provides AI assistant functionality with GraphRAG integration.
 * Manages conversation history, loading states, and caching.
 *
 * Features:
 * - GraphRAG question answering with node citations
 * - Vector similarity search
 * - Message history management
 * - Query caching for performance
 * - Loading and error states
 * - Rate limit tracking
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import {
  ASK_ASSISTANT,
  FIND_SIMILAR_NODES,
  GET_METHODOLOGY_PROMPT_SUGGESTIONS,
  GET_REMAINING_AI_REQUESTS,
} from '@/graphql/queries/ai-assistant';
import {
  AIMessage,
  AssistantResponse,
  SimilarNode,
  AskAssistantInput,
  FindSimilarNodesInput,
} from '@/types/ai-assistant';

interface UseAIAssistantOptions {
  graphId: string;
  selectedNodeIds?: string[];
  onNodeCited?: (nodeId: string) => void;
  expansionDepth?: number;
  topK?: number;
}

interface UseAIAssistantResult {
  messages: AIMessage[];
  loading: boolean;
  error: string | null;
  remainingRequests: number;
  suggestedPrompts: string[];
  askQuestion: (query: string) => Promise<void>;
  findSimilar: (query: string, limit?: number) => Promise<SimilarNode[]>;
  clearHistory: () => void;
  retryLast: () => Promise<void>;
}

/**
 * Hook for AI assistant integration with GraphRAG
 */
export function useAIAssistant({
  graphId,
  selectedNodeIds = [],
  onNodeCited,
  expansionDepth = 2,
  topK = 5,
}: UseAIAssistantOptions): UseAIAssistantResult {
  // State
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  // GraphQL operations
  const [askAssistantMutation, { loading: askLoading }] = useMutation(ASK_ASSISTANT);
  const [findSimilarQuery, { loading: similarLoading }] = useLazyQuery(FIND_SIMILAR_NODES);

  const { data: suggestedPromptsData } = useQuery(GET_METHODOLOGY_PROMPT_SUGGESTIONS, {
    variables: { graphId },
    skip: !graphId,
  });

  const { data: remainingRequestsData, refetch: refetchRemainingRequests } = useQuery(
    GET_REMAINING_AI_REQUESTS,
    {
      pollInterval: 60000, // Refresh every minute
    }
  );

  // Derived state
  const loading = askLoading || similarLoading;
  const remainingRequests = remainingRequestsData?.getRemainingAIRequests ?? 10;
  const suggestedPrompts = useMemo(
    () => suggestedPromptsData?.getMethodologyPromptSuggestions ?? [],
    [suggestedPromptsData]
  );

  /**
   * Ask a question using GraphRAG
   */
  const askQuestion = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setError('Question cannot be empty');
        return;
      }

      if (query.length > 1000) {
        setError('Question is too long (max 1000 characters)');
        return;
      }

      // Clear previous error
      setError(null);
      setLastQuery(query);

      // Add user message
      const userMessage: AIMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const input: AskAssistantInput = {
          graphId,
          query,
          selectedNodeIds,
          expansionDepth,
          topK,
        };

        const { data } = await askAssistantMutation({
          variables: { input },
        });

        if (data?.askAssistant) {
          const response: AssistantResponse = data.askAssistant;

          // Add assistant message
          const assistantMessage: AIMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response.answer,
            citedNodes: response.citedNodes,
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          // Notify about cited nodes
          if (onNodeCited && response.citedNodes.length > 0) {
            response.citedNodes.forEach((node) => onNodeCited(node.id));
          }

          // Refresh remaining requests
          refetchRemainingRequests();
        }
      } catch (err: any) {
        const errorMessage =
          err.message || 'Failed to get response from AI assistant. Please try again.';
        setError(errorMessage);

        // Add error message to chat
        const errorMsg: AIMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [
      graphId,
      selectedNodeIds,
      expansionDepth,
      topK,
      askAssistantMutation,
      onNodeCited,
      refetchRemainingRequests,
    ]
  );

  /**
   * Find similar nodes using vector search
   */
  const findSimilar = useCallback(
    async (query: string, limit: number = 10): Promise<SimilarNode[]> => {
      if (!query.trim()) {
        return [];
      }

      setError(null);

      try {
        const input: FindSimilarNodesInput = {
          graphId,
          query,
          selectedNodeIds,
          limit,
        };

        const { data } = await findSimilarQuery({
          variables: { input },
        });

        return data?.findSimilarNodes ?? [];
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to find similar nodes';
        setError(errorMessage);
        return [];
      }
    },
    [graphId, selectedNodeIds, findSimilarQuery]
  );

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastQuery('');
  }, []);

  /**
   * Retry last failed query
   */
  const retryLast = useCallback(async () => {
    if (lastQuery) {
      await askQuestion(lastQuery);
    }
  }, [lastQuery, askQuestion]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0 && graphId) {
      const welcomeMessage: AIMessage = {
        id: 'welcome',
        role: 'assistant',
        content:
          "Hello! I'm your AI assistant. I can help you explore your knowledge graph, answer questions about your investigation, and suggest next steps. Ask me anything!",
        timestamp: Date.now(),
      };

      setMessages([welcomeMessage]);
    }
  }, [graphId, messages.length]);

  return {
    messages,
    loading,
    error,
    remainingRequests,
    suggestedPrompts,
    askQuestion,
    findSimilar,
    clearHistory,
    retryLast,
  };
}

export default useAIAssistant;
