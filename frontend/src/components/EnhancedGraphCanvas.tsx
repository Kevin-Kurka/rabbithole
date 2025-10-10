/**
 * EnhancedGraphCanvas Component
 *
 * Wrapper component that integrates GraphCanvas with advanced visualization features:
 * - Multiple view modes (canvas, timeline, cluster)
 * - Layout algorithms
 * - Filtering
 * - Export functionality
 * - Visualization controls
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { GraphCanvasNode, GraphCanvasEdge, GraphCanvasProps } from '@/types/graph';
import GraphCanvas from './GraphCanvas';
import TimelineView from './TimelineView';
import ClusterView from './ClusterView';
import FilterPanel from './FilterPanel';
import VisualizationControls, { ViewMode } from './VisualizationControls';
import {
  applyLayout,
  LayoutAlgorithm,
  centerLayout,
} from '@/utils/layoutAlgorithms';

/**
 * EnhancedGraphCanvas props
 */
export interface EnhancedGraphCanvasProps extends GraphCanvasProps {
  enableFilters?: boolean;
  enableVisualizationControls?: boolean;
  defaultViewMode?: ViewMode;
  defaultLayout?: LayoutAlgorithm;
}

/**
 * EnhancedGraphCanvas Inner Component (requires ReactFlowProvider)
 */
function EnhancedGraphCanvasInner({
  enableFilters = true,
  enableVisualizationControls = true,
  defaultViewMode = 'canvas',
  defaultLayout = 'force',
  ...graphCanvasProps
}: EnhancedGraphCanvasProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [layout, setLayout] = useState<LayoutAlgorithm>(defaultLayout);
  const [showMinimap, setShowMinimap] = useState(
    graphCanvasProps.showMinimap ?? true
  );
  const [allNodes, setAllNodes] = useState<GraphCanvasNode[]>(
    graphCanvasProps.initialNodes || []
  );
  const [allEdges, setAllEdges] = useState<GraphCanvasEdge[]>(
    graphCanvasProps.initialEdges || []
  );
  const [filteredNodes, setFilteredNodes] = useState<GraphCanvasNode[]>(allNodes);
  const [filteredEdges, setFilteredEdges] = useState<GraphCanvasEdge[]>(allEdges);
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);

  // React Flow instance (only available in canvas mode)
  const reactFlowInstance = useReactFlow();

  // Update all nodes/edges when initial data changes
  useEffect(() => {
    if (graphCanvasProps.initialNodes) {
      setAllNodes(graphCanvasProps.initialNodes);
      setFilteredNodes(graphCanvasProps.initialNodes);
    }
  }, [graphCanvasProps.initialNodes]);

  useEffect(() => {
    if (graphCanvasProps.initialEdges) {
      setAllEdges(graphCanvasProps.initialEdges);
      setFilteredEdges(graphCanvasProps.initialEdges);
    }
  }, [graphCanvasProps.initialEdges]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback(
    (newFilteredNodes: GraphCanvasNode[], newFilteredEdges: GraphCanvasEdge[]) => {
      setFilteredNodes(newFilteredNodes);
      setFilteredEdges(newFilteredEdges);
    },
    []
  );

  /**
   * Handle layout change
   */
  const handleLayoutChange = useCallback(
    (newLayout: LayoutAlgorithm) => {
      setLayout(newLayout);
      setIsApplyingLayout(true);

      // Apply layout to filtered nodes
      const { nodes: layoutedNodes } = applyLayout(filteredNodes, filteredEdges, {
        algorithm: newLayout,
        iterations: 300,
        strength: -400,
        spacing: 150,
      });

      // Center the layout
      const centeredNodes = centerLayout(layoutedNodes);

      setFilteredNodes(centeredNodes);

      // Fit view after layout
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        }
        setIsApplyingLayout(false);
      }, 100);
    },
    [filteredNodes, filteredEdges, reactFlowInstance]
  );

  /**
   * Handle zoom controls
   */
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 300 });
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 300 });
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }
  }, [reactFlowInstance]);

  /**
   * Handle minimap toggle
   */
  const handleMinimapToggle = useCallback(() => {
    setShowMinimap((prev) => !prev);
  }, []);

  /**
   * Handle node click in timeline/cluster views
   */
  const handleNodeClick = useCallback((node: GraphCanvasNode) => {
    console.log('Node clicked:', node);
    // Could add node selection logic here
  }, []);

  /**
   * Handle save callback (pass through to parent)
   */
  const handleSave = useCallback(
    (nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => {
      setAllNodes(nodes);
      setAllEdges(edges);
      setFilteredNodes(nodes);
      setFilteredEdges(edges);

      if (graphCanvasProps.onSave) {
        graphCanvasProps.onSave(nodes, edges);
      }
    },
    [graphCanvasProps]
  );

  // Store layout preference in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rabbithole-graph-layout', layout);
    }
  }, [layout]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rabbithole-graph-viewmode', viewMode);
    }
  }, [viewMode]);

  // Load preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayout = localStorage.getItem('rabbithole-graph-layout');
      const savedViewMode = localStorage.getItem('rabbithole-graph-viewmode');

      if (savedLayout && ['force', 'hierarchical', 'circular', 'timeline'].includes(savedLayout)) {
        setLayout(savedLayout as LayoutAlgorithm);
      }

      if (savedViewMode && ['canvas', 'timeline', 'cluster'].includes(savedViewMode)) {
        setViewMode(savedViewMode as ViewMode);
      }
    }
  }, []);

  return (
    <div className="flex h-full w-full gap-4 bg-gray-900 p-4">
      {/* Left Sidebar - Filters */}
      {enableFilters && (
        <div className="w-80 flex-shrink-0">
          <FilterPanel
            nodes={allNodes}
            edges={allEdges}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Render view based on mode */}
        {viewMode === 'canvas' && (
          <div className="flex-1 relative">
            <GraphCanvas
              {...graphCanvasProps}
              initialNodes={filteredNodes}
              initialEdges={filteredEdges}
              showMinimap={showMinimap}
              onSave={handleSave}
            />
            {isApplyingLayout && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-gray-800 px-6 py-4 rounded-lg shadow-xl">
                  <div className="text-white font-medium">Applying layout...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'timeline' && (
          <TimelineView
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodeClick={handleNodeClick}
          />
        )}

        {viewMode === 'cluster' && (
          <ClusterView
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {/* Right Sidebar - Visualization Controls */}
      {enableVisualizationControls && (
        <div className="w-80 flex-shrink-0">
          <VisualizationControls
            nodes={filteredNodes}
            edges={filteredEdges}
            graphId={graphCanvasProps.graphId}
            currentViewMode={viewMode}
            currentLayout={layout}
            showMinimap={showMinimap}
            onViewModeChange={setViewMode}
            onLayoutChange={handleLayoutChange}
            onMinimapToggle={handleMinimapToggle}
            onZoomIn={viewMode === 'canvas' ? handleZoomIn : undefined}
            onZoomOut={viewMode === 'canvas' ? handleZoomOut : undefined}
            onFitView={viewMode === 'canvas' ? handleFitView : undefined}
          />
        </div>
      )}
    </div>
  );
}

/**
 * EnhancedGraphCanvas Component with ReactFlowProvider wrapper
 */
export default function EnhancedGraphCanvas(props: EnhancedGraphCanvasProps) {
  return <EnhancedGraphCanvasInner {...props} />;
}
