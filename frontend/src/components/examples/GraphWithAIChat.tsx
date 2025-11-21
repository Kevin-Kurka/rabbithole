/**
 * GraphWithAIChat Example
 *
 * Demonstrates integration of GraphCanvas with AI-powered chat.
 * Shows how to:
 * - Connect selected nodes to AI context
 * - Handle node citations from AI responses
 * - Highlight nodes referenced by AI
 * - Toggle between collaboration chat and AI chat
 */

'use client';

import React, { useState, useCallback } from 'react';
import GraphCanvas from '../graph-canvas';
import AIChat from '../ai-chat';
import Chat from '../in-graph-chat';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import { ChatMessage } from '@/types/collaboration';
import { MessageSquare, Sparkles } from 'lucide-react';

interface GraphWithAIChatProps {
  graphIds: string[];
  methodologyId?: string;
}

export function GraphWithAIChat({ graphIds, methodologyId }: GraphWithAIChatProps) {
  const [selectedNodes, setSelectedNodes] = useState<GraphCanvasNode[]>([]);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [chatMode, setChatMode] = useState<'ai' | 'collaboration'>('ai');

  // Collaboration chat state (mock)
  const [collabMessages, setCollabMessages] = useState<ChatMessage[]>([]);

  // Handle node selection in graph
  const handleNodeSelect = useCallback((nodes: GraphCanvasNode[]) => {
    setSelectedNodes(nodes);
  }, []);

  // Handle AI citing a node
  const handleNodeHighlight = useCallback((nodeId: string) => {
    setHighlightedNodeIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(nodeId);
      return newSet;
    });

    // Auto-clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }, 5000);
  }, []);

  // Handle clicking on cited node in chat
  const handleNodeClick = useCallback((nodeId: string) => {
    // TODO: Implement pan/zoom to node in GraphCanvas
    console.log('Navigate to node:', nodeId);
    handleNodeHighlight(nodeId);
  }, [handleNodeHighlight]);

  // Handle collaboration chat message
  const handleCollabMessage = async (message: string) => {
    // Mock implementation - in real app, send to websocket/GraphQL subscription
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: 'current-user-id',
      username: 'You',
      message,
      timestamp: Date.now(),
    };

    setCollabMessages((prev) => [...prev, newMessage]);
  };

  const selectedNodeIds = selectedNodes.map((n) => n.id);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <GraphCanvas
          graphIds={graphIds}
          methodologyId={methodologyId}
          onError={(error) => console.error('Graph error:', error)}
        />

        {/* Floating context indicator */}
        {selectedNodes.length > 0 && chatMode === 'ai' && (
          <div className="absolute top-4 left-4 bg-purple-900 border border-purple-700 px-3 py-2 rounded-lg shadow-lg">
            <p className="text-xs text-purple-200">
              <Sparkles className="w-3 h-3 inline mr-1" />
              AI has context of {selectedNodes.length} selected node{selectedNodes.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      <div className="w-96 border-l border-gray-800 flex flex-col">
        {/* Chat Mode Toggle */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setChatMode('ai')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              chatMode === 'ai'
                ? 'bg-purple-900/50 text-purple-200 border-b-2 border-purple-500'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-850'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            AI Assistant
          </button>
          <button
            onClick={() => setChatMode('collaboration')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              chatMode === 'collaboration'
                ? 'bg-blue-900/50 text-blue-200 border-b-2 border-blue-500'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-850'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Team Chat
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {chatMode === 'ai' ? (
            <AIChat
              graphId={graphIds[0] || ''}
              selectedNodeIds={selectedNodeIds}
              onNodeClick={handleNodeClick}
              onNodeHighlight={handleNodeHighlight}
            />
          ) : (
            <Chat
              messages={collabMessages}
              onSendMessage={handleCollabMessage}
              currentUserId="current-user-id"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default GraphWithAIChat;
