/**
 * VisualizationControls Component
 *
 * Control panel for graph visualization options:
 * - Layout algorithm selection
 * - View mode toggle (canvas/timeline/cluster)
 * - Export functionality
 * - Zoom controls
 * - Minimap toggle
 */

'use client';

import React, { useState } from 'react';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import { LayoutAlgorithm, LayoutOptions } from '@/utils/layoutAlgorithms';
import { ExportFormat, exportGraph } from '@/utils/exportGraph';

/**
 * View mode options
 */
export type ViewMode = 'canvas' | 'timeline' | 'cluster';

/**
 * VisualizationControls props
 */
export interface VisualizationControlsProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  graphId: string;
  currentViewMode: ViewMode;
  currentLayout: LayoutAlgorithm;
  showMinimap: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onLayoutChange: (algorithm: LayoutAlgorithm) => void;
  onMinimapToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  className?: string;
}

/**
 * VisualizationControls Component
 */
export default function VisualizationControls({
  nodes,
  edges,
  graphId,
  currentViewMode,
  currentLayout,
  showMinimap,
  onViewModeChange,
  onLayoutChange,
  onMinimapToggle,
  onZoomIn,
  onZoomOut,
  onFitView,
  className = '',
}: VisualizationControlsProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * Handle export
   */
  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      await exportGraph(format, graphId, nodes, edges, {
        metadata: {
          title: `Graph ${graphId}`,
          exportDate: new Date().toISOString(),
        },
      });
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg ${className}`}>
      {/* View Mode Selector */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          View Mode
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onViewModeChange('canvas')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              currentViewMode === 'canvas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Canvas
            </div>
          </button>
          <button
            onClick={() => onViewModeChange('timeline')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              currentViewMode === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Timeline
            </div>
          </button>
          <button
            onClick={() => onViewModeChange('cluster')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
              currentViewMode === 'cluster'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Cluster
            </div>
          </button>
        </div>
      </div>

      {/* Layout Selector (only visible in canvas mode) */}
      {currentViewMode === 'canvas' && (
        <div className="p-4 border-b border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Layout Algorithm
          </label>
          <select
            value={currentLayout}
            onChange={(e) => onLayoutChange(e.target.value as LayoutAlgorithm)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="force">Force-Directed</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="circular">Circular</option>
            <option value="timeline">Timeline</option>
          </select>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Zoom
        </label>
        <div className="flex gap-2">
          <button
            onClick={onZoomIn}
            disabled={!onZoomIn}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              Zoom In
            </div>
          </button>
          <button
            onClick={onZoomOut}
            disabled={!onZoomOut}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
              Zoom Out
            </div>
          </button>
          <button
            onClick={onFitView}
            disabled={!onFitView}
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Fit View
            </div>
          </button>
        </div>
      </div>

      {/* Display Options */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Display Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showMinimap}
              onChange={onMinimapToggle}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            Show Minimap
          </label>
        </div>
      </div>

      {/* Export */}
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Export
        </label>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {exporting ? 'Exporting...' : 'Export Graph'}
            </div>
          </button>

          {/* Export Menu */}
          {showExportMenu && !exporting && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 border border-gray-600 rounded shadow-lg overflow-hidden">
              <button
                onClick={() => handleExport('png')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors"
              >
                Export as PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors"
              >
                Export as SVG
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors"
              >
                Export as JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-750 border-t border-gray-700 text-xs text-gray-400 space-y-1">
        <div className="flex justify-between">
          <span>Nodes:</span>
          <span className="font-semibold text-white">{nodes.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Edges:</span>
          <span className="font-semibold text-white">{edges.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Veracity:</span>
          <span className="font-semibold text-white">
            {nodes.length > 0
              ? `${((nodes.reduce((sum, n) => sum + n.data.weight, 0) / nodes.length) * 100).toFixed(0)}%`
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
