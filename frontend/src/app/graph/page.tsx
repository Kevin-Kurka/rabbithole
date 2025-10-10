"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { BrainCircuit } from 'lucide-react';
import GraphCanvas from '@/components/GraphCanvas';
import GraphSidebar from '@/components/GraphSidebar';
import CollaborationPanel from '@/components/CollaborationPanel';
import { AIAssistantFAB } from '@/components/AIAssistantFAB';
import { AIAssistantPanel } from '@/components/AIAssistantPanel';
import { useCollaboration } from '@/hooks/useCollaboration';
import { theme } from '@/styles/theme';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

/**
 * Graph Page Component
 *
 * Main graph visualization page with:
 * - GraphCanvas integration
 * - GraphSidebar for graph selection
 * - Real-time subscriptions
 * - Veracity visualization
 * - Level 0/1 node support
 * - AI Assistant integration
 */
export default function GraphPage() {
  const { data: session, status } = useSession();
  const [activeGraphs, setActiveGraphs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [selectedNodeIds] = useState<string[]>([]); // TODO: Connect to GraphCanvas node selection
  const [aiSuggestionCount, setAiSuggestionCount] = useState(0);

  // Use the first active graph as the current graph for the canvas
  const currentGraphId = activeGraphs.length > 0 ? activeGraphs[0] : null;

  // Collaboration hook (only active when a graph is selected)
  const { activeUsers, updateCursor } = useCollaboration(currentGraphId || '');
  const currentUserId = session?.user?.id;

  /**
   * Handle graph selection toggle from GraphSidebar
   */
  const handleToggleGraph = useCallback((graphId: string) => {
    setActiveGraphs((prev) => {
      // For now, only allow one graph at a time
      // Future: support multiple overlaid graphs
      if (prev.includes(graphId)) {
        return prev.filter((g) => g !== graphId);
      }
      return [graphId]; // Replace current graph
    });
  }, []);

  /**
   * Handle graph save callback
   */
  const handleSave = useCallback((nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => {
    console.log('Graph saved:', { nodes: nodes.length, edges: edges.length });
    // Auto-save is handled by mutations in GraphCanvas
  }, []);

  /**
   * Handle graph error callback
   */
  const handleError = useCallback((err: Error) => {
    console.error('Graph error:', err);
    setError(err.message);

    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }, []);

  /**
   * Toggle AI Assistant panel
   */
  const handleToggleAIPanel = useCallback(() => {
    setIsAIPanelOpen((prev) => !prev);
    // Reset suggestion count when opening
    if (!isAIPanelOpen) {
      setAiSuggestionCount(0);
    }
  }, [isAIPanelOpen]);

  /**
   * Handle node click from AI panel (focus on node in graph)
   */
  const handleAINodeClick = useCallback((nodeId: string) => {
    console.log('AI cited node clicked:', nodeId);
    // TODO: Implement node focusing in GraphCanvas
    // This could be exposed via a ref or callback from GraphCanvas
  }, []);

  // Simulate new AI suggestions (in production, this would come from GraphQL subscription)
  useEffect(() => {
    if (currentGraphId && !isAIPanelOpen) {
      // Mock: Add a new suggestion every 30 seconds
      const interval = setInterval(() => {
        setAiSuggestionCount((prev) => Math.min(prev + 1, 9));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentGraphId, isAIPanelOpen]);

  // Authentication check
  if (status === "loading") {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{
          backgroundColor: theme.colors.bg.primary,
          color: theme.colors.text.primary,
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: theme.colors.button.primary.bg }}
          />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{
          backgroundColor: theme.colors.bg.primary,
          color: theme.colors.text.primary,
        }}
      >
        <BrainCircuit className="w-16 h-16" style={{ color: theme.colors.button.primary.bg }} />
        <p className="text-xl">Access Denied - Please sign in</p>
        <button
          onClick={() => signIn()}
          style={{
            backgroundColor: theme.colors.button.primary.bg,
            color: theme.colors.button.primary.text,
            borderRadius: theme.radius.md,
          }}
          className="px-6 py-3 font-medium transition-colors"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.button.primary.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.button.primary.bg;
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen relative flex"
      style={{ backgroundColor: theme.colors.canvas.bg }}
    >
      {/* Graph Sidebar */}
      <GraphSidebar
        activeGraphs={activeGraphs}
        onToggleGraph={handleToggleGraph}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {/* Error notification */}
        {error && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#ef4444', // red-500
              color: '#ffffff',
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              boxShadow: theme.shadows.lg,
              zIndex: 1000,
              maxWidth: '400px',
            }}
          >
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Graph Canvas */}
        {currentGraphId ? (
          <>
            <GraphCanvas
              graphId={currentGraphId}
              onSave={handleSave}
              onError={handleError}
              showMinimap={true}
              showControls={true}
              showBackground={true}
              className="w-full h-full"
              activeUsers={activeUsers}
              onCursorMove={updateCursor}
            />
            <CollaborationPanel
              graphId={currentGraphId}
              currentUserId={currentUserId}
            />

            {/* AI Assistant FAB */}
            <AIAssistantFAB
              isOpen={isAIPanelOpen}
              onClick={handleToggleAIPanel}
              suggestionCount={aiSuggestionCount}
            />

            {/* AI Assistant Panel */}
            <AIAssistantPanel
              isOpen={isAIPanelOpen}
              onClose={handleToggleAIPanel}
              graphId={currentGraphId}
              selectedNodeIds={selectedNodeIds}
              onNodeClick={handleAINodeClick}
            />
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: theme.colors.text.secondary }}
          >
            <BrainCircuit className="w-20 h-20 opacity-50" />
            <div className="text-center">
              <p className="text-xl font-medium mb-2">No graph selected</p>
              <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
                Select a graph from the sidebar to begin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
