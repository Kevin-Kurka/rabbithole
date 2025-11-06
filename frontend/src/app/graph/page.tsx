"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';
import GraphCanvas from '@/components/GraphCanvas';
import VSCodeLayout from '@/components/layout/VSCodeLayout';
import { useCollaboration } from '@/hooks/useCollaboration';
import { theme } from '@/styles/theme';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
/**
 * Graph Page Component
 *
 * Main graph visualization page with VS Code-style layout:
 * - VSCodeLayout wrapper with resizable panels
 * - GraphCanvas as main content
 * - Real-time subscriptions
 * - Veracity visualization
 * - Level 0/1 node support
 * - AI Assistant integration (in right panel)
 * - Collaboration features (in right panel)
 */
export default function GraphPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeGraphs, setActiveGraphs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphCanvasNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  // Use the first active graph as the current graph for the canvas
  const currentGraphId = activeGraphs.length > 0 ? activeGraphs[0] : undefined;
  // Collaboration hook (only active when a graph is selected)
  const { activeUsers, updateCursor, isConnected } = useCollaboration(currentGraphId);
  const currentUserId = session?.user?.id;
  // Mock stats for status bar (TODO: Get from GraphCanvas)
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  /**
   * Handle graph selection toggle (called from GraphListPanel in left sidebar)
   * Supports multiple graph overlay - toggle individual graphs on/off
   */
  const handleToggleGraph = useCallback((graphId: string) => {
    setActiveGraphs((prev) => {
      if (prev.includes(graphId)) {
        // Remove graph from active list
        return prev.filter((g) => g !== graphId);
      }
      // Add graph to active list (allow multiple graphs)
      return [...prev, graphId];
    });
  }, []);
  /**
   * Handle graph save callback
   */
  const handleSave = useCallback((nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => {
    console.log('Graph saved:', { nodes: nodes.length, edges: edges.length });
    setNodeCount(nodes.length);
    setEdgeCount(edges.length);
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
   * Handle main menu search
   */
  const handleSearch = useCallback((query: string) => {
    console.log('Search query:', query);
    // TODO: Implement global search functionality
  }, []);
  /**
   * Handle node selection - navigate to node detail page
   */
  const handleNodeSelect = useCallback((node: GraphCanvasNode | null) => {
    console.log('Node selected:', node);
    setSelectedNode(node);
    // Navigate to node detail page
    if (node?.id) {
      router.push(`/nodes/${node.id}`);
    }
  }, [router]);
  /**
   * Handle edge selection
   */
  const handleEdgeSelect = useCallback((edge: any) => {
    console.log('Edge selected:', edge);
    setSelectedEdge(edge);
  }, []);
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
    <VSCodeLayout
      onSearch={handleSearch}
      graphName={currentGraphId ? `Graph ${currentGraphId.slice(0, 8)}` : undefined}
      nodeCount={nodeCount}
      edgeCount={edgeCount}
      isConnected={isConnected}
      aiActive={false}
      layoutAlgorithm="Force"
      zoomLevel={zoomLevel}
      activeGraphs={activeGraphs}
      onToggleGraph={handleToggleGraph}
      selectedNode={selectedNode}
      selectedEdge={selectedEdge}
    >
      {/* Error notification */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
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
      {activeGraphs.length > 0 ? (
        <GraphCanvas
          graphIds={activeGraphs}
          onSave={handleSave}
          onError={handleError}
          onNodeSelect={handleNodeSelect}
          onEdgeSelect={handleEdgeSelect}
          showMinimap={true}
          showControls={true}
          showBackground={true}
          className="w-full h-full"
          activeUsers={activeUsers}
          onCursorMove={updateCursor}
        />
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
    </VSCodeLayout>
  );
}
