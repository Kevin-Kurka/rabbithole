"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { gql } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Search, Layers, Home } from 'lucide-react';
import { ChatMessage, ChatMessageProps } from '@/components/collaboration/chat-message';
import { ChatInput } from '@/components/collaboration/chat-input';
import { ChatSidebar, Conversation } from '@/components/collaboration/chat-sidebar';
import { ContextPanel } from '@/components/context-panel';
import { NodeLinkCardProps } from '@/components/node-link-card';
import { UploadedFile } from '@/components/media/file-upload-button';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// GraphQL Queries and Mutations
const SEND_AI_MESSAGE_MUTATION = gql`
  mutation SendAIMessage($message: String!, $conversationId: ID, $graphId: ID) {
    sendAIMessage(message: $message, conversationId: $conversationId, graphId: $graphId) {
      conversationId
      response
      messageId
      relevantNodes {
        id
        title
        nodeType
        similarity
      }
    }
  }
`;

const GET_CONVERSATION_MESSAGES = gql`
  query ConversationMessages($conversationId: ID!, $limit: Int, $offset: Int) {
    conversationMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
      id
      conversationId
      userId
      role
      content
      metadata
      createdAt
    }
  }
`;

const GET_MY_CONVERSATIONS = gql`
  query MyConversations($graphId: ID, $limit: Int, $offset: Int) {
    myConversations(graphId: $graphId, limit: $limit, offset: $offset) {
      id
      userId
      graphId
      title
      metadata
      createdAt
      updatedAt
      messageCount
    }
  }
`;

const SEARCH_NODES_SEMANTIC = gql`
  query SearchNodesSemantic($query: String!, $graphId: ID) {
    searchNodesSemantic(query: $query, graphId: $graphId) {
      id
      title
      nodeType
      similarity
    }
  }
`;

const DELETE_CONVERSATION_MUTATION = gql`
  mutation DeleteConversation($id: ID!) {
    deleteConversation(id: $id)
  }
`;

const GET_GRAPHS_QUERY = gql`
  query GetGraphs {
    graphs {
      id
      name
      description
    }
  }
`;

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const apolloClient = useApolloClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [contextNodes, setContextNodes] = useState<NodeLinkCardProps[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NodeLinkCardProps[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  // GraphQL
  const [sendAIMessage, { loading: sendingMessage }] = useMutation(SEND_AI_MESSAGE_MUTATION);
  const [deleteConversation] = useMutation(DELETE_CONVERSATION_MUTATION);
  const { data: graphsData } = useQuery(GET_GRAPHS_QUERY);
  const { data: conversationsData, refetch: refetchConversations } = useQuery(GET_MY_CONVERSATIONS, {
    variables: { limit: 50, offset: 0 },
    skip: !session,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations from query
  useEffect(() => {
    if (conversationsData?.myConversations) {
      const convos: Conversation[] = conversationsData.myConversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        lastMessage: '', // Could be enhanced by fetching last message
        timestamp: c.updatedAt,
        messageCount: c.messageCount || 0,
      }));
      setConversations(convos);
    }
  }, [conversationsData]);

  // Set default graph to JFK when graphs load
  useEffect(() => {
    if (graphsData?.graphs?.length > 0 && !selectedGraphId) {
      const jfkGraph = graphsData.graphs.find((g: any) =>
        g.name.includes('JFK') || g.name.includes('Assassination')
      );
      setSelectedGraphId(jfkGraph?.id || graphsData.graphs[0].id);
    }
  }, [graphsData, selectedGraphId]);

  // Load conversation history
  const loadConversationHistory = async (conversationId: string) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CONVERSATION_MESSAGES,
        variables: { conversationId, limit: 100 },
      });

      if (data?.conversationMessages) {
        const loadedMessages: ChatMessageProps[] = data.conversationMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  // Handle sending message
  const handleSendMessage = async (messageText: string, files: UploadedFile[]) => {
    if (!messageText.trim() && files.length === 0) return;

    // Create user message
    const userMessage: ChatMessageProps = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Send message to backend
      const { data } = await sendAIMessage({
        variables: {
          message: messageText,
          conversationId: activeConversationId,
          graphId: selectedGraphId,
        },
      });

      if (data?.sendAIMessage) {
        // Update conversation ID if new conversation
        if (!activeConversationId && data.sendAIMessage.conversationId) {
          setActiveConversationId(data.sendAIMessage.conversationId);

          // Refetch conversations list
          refetchConversations();
        }

        // Add assistant message
        const assistantMessage: ChatMessageProps = {
          id: data.sendAIMessage.messageId,
          role: 'assistant',
          content: data.sendAIMessage.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update context nodes
        if (data.sendAIMessage.relevantNodes) {
          const nodes: NodeLinkCardProps[] = data.sendAIMessage.relevantNodes.map((node: any) => ({
            id: node.id,
            title: node.title,
            type: node.nodeType,
            relevance: node.similarity,
          }));
          setContextNodes(nodes);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: ChatMessageProps = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle new conversation
  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setContextNodes([]);
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    loadConversationHistory(conversationId);
  };

  // Handle conversation deletion
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation({ variables: { id: conversationId } });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        handleNewConversation();
      }
      refetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await apolloClient.query({
          query: SEARCH_NODES_SEMANTIC,
          variables: { query, graphId: selectedGraphId },
        });

        if (data?.searchNodesSemantic) {
          const results: NodeLinkCardProps[] = data.searchNodesSemantic.map((node: any) => ({
            id: node.id,
            title: node.title,
            type: node.nodeType,
            relevance: node.similarity,
          }));
          setSearchResults(results);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Error searching nodes:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 h-16 border-b border-zinc-700/50 px-6 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-9 w-9"
            >
              <Home className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700/50"
              />
            </div>

            {/* Toggle Context Panel */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={cn(
                "h-9 w-9",
                showContextPanel && "bg-blue-500/20 text-blue-400"
              )}
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1 px-6 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-3">
                    Welcome to Rabbit Hole AI
                  </h2>
                  <p className="text-zinc-400 max-w-md mb-6">
                    Ask me anything about the knowledge graph. I can help you explore nodes,
                    discover connections, and answer questions based on the database.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                    {[
                      "What nodes are related to JFK?",
                      "Explain the Warren Commission findings",
                      "Show me evidence about Oswald",
                      "What are the main conspiracy theories?",
                    ].map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleSendMessage(suggestion, [])}
                        className="text-left justify-start h-auto py-3 px-4 border-zinc-700/50 hover:border-blue-500/50 hover:bg-zinc-800/50"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} {...message} />
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-4 mb-6">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1 max-w-3xl">
                        <div className="rounded-lg p-4 bg-zinc-800/50 border border-zinc-700/50">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span className="text-sm text-zinc-400">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-zinc-700/50 p-6 bg-zinc-900/50">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={sendingMessage || isTyping}
                  disabled={!session}
                  placeholder={
                    session
                      ? "Ask anything or search nodes..."
                      : "Please sign in to use the AI assistant"
                  }
                />
              </div>
            </div>
          </div>

          {/* Context Panel */}
          {showContextPanel && (
            <div className="w-96 border-l border-zinc-700/50 bg-zinc-900/30">
              <ContextPanel
                nodes={contextNodes}
                isOpen={showContextPanel}
                onClose={() => setShowContextPanel(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
