/**
 * FilterPanel Component
 *
 * Provides filtering controls for graph visualization:
 * - Veracity score range
 * - Methodology selection
 * - Node type selection
 * - Graph level (Level 0/1)
 * - Date range
 */

'use client';

import React, { useState, useCallback } from 'react';
import { GraphCanvasNode, GraphCanvasEdge, GraphLevel } from '@/types/graph';

/**
 * Filter state interface
 */
export interface FilterState {
  veracityRange: [number, number];
  methodologies: string[];
  nodeTypes: string[];
  levels: GraphLevel[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

/**
 * FilterPanel props
 */
export interface FilterPanelProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onFilterChange: (
    filteredNodes: GraphCanvasNode[],
    filteredEdges: GraphCanvasEdge[]
  ) => void;
  className?: string;
}

/**
 * Default filter state
 */
const defaultFilters: FilterState = {
  veracityRange: [0, 1],
  methodologies: [],
  nodeTypes: [],
  levels: [GraphLevel.LEVEL_0, GraphLevel.LEVEL_1],
  dateRange: {
    start: null,
    end: null,
  },
};

/**
 * FilterPanel Component
 */
export default function FilterPanel({
  nodes,
  edges,
  onFilterChange,
  className = '',
}: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract available methodologies and node types
  const availableMethodologies = Array.from(
    new Set(nodes.map((n) => n.data.methodology).filter(Boolean))
  ) as string[];

  const availableNodeTypes = Array.from(
    new Set(nodes.map((n) => n.type).filter(Boolean))
  ) as string[];

  /**
   * Apply filters to nodes and edges
   */
  const applyFilters = useCallback(() => {
    let filteredNodes = [...nodes];

    // Filter by veracity score
    filteredNodes = filteredNodes.filter(
      (node) =>
        node.data.weight >= filters.veracityRange[0] &&
        node.data.weight <= filters.veracityRange[1]
    );

    // Filter by methodology
    if (filters.methodologies.length > 0) {
      filteredNodes = filteredNodes.filter((node) =>
        filters.methodologies.includes(node.data.methodology || '')
      );
    }

    // Filter by node type
    if (filters.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter((node) =>
        filters.nodeTypes.includes(node.type || 'custom')
      );
    }

    // Filter by level
    filteredNodes = filteredNodes.filter((node) =>
      filters.levels.includes(node.data.level)
    );

    // Filter by date range
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredNodes = filteredNodes.filter((node) => {
        const createdAt = node.data.metadata?.createdAt
          ? new Date(node.data.metadata.createdAt as string)
          : null;

        if (!createdAt) return false;

        if (filters.dateRange.start && createdAt < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end && createdAt > filters.dateRange.end) {
          return false;
        }

        return true;
      });
    }

    // Filter edges to only include those connected to visible nodes
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    onFilterChange(filteredNodes, filteredEdges);
  }, [nodes, edges, filters, onFilterChange]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    onFilterChange(nodes, edges);
  }, [nodes, edges, onFilterChange]);

  /**
   * Handle veracity range change
   */
  const handleVeracityChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filters.veracityRange];
    newRange[index] = value;
    setFilters((prev) => ({ ...prev, veracityRange: newRange }));
  };

  /**
   * Toggle methodology filter
   */
  const toggleMethodology = (methodology: string) => {
    setFilters((prev) => ({
      ...prev,
      methodologies: prev.methodologies.includes(methodology)
        ? prev.methodologies.filter((m) => m !== methodology)
        : [...prev.methodologies, methodology],
    }));
  };

  /**
   * Toggle node type filter
   */
  const toggleNodeType = (nodeType: string) => {
    setFilters((prev) => ({
      ...prev,
      nodeTypes: prev.nodeTypes.includes(nodeType)
        ? prev.nodeTypes.filter((t) => t !== nodeType)
        : [...prev.nodeTypes, nodeType],
    }));
  };

  /**
   * Toggle level filter
   */
  const toggleLevel = (level: GraphLevel) => {
    setFilters((prev) => ({
      ...prev,
      levels: prev.levels.includes(level)
        ? prev.levels.filter((l) => l !== level)
        : [...prev.levels, level],
    }));
  };

  const hasActiveFilters =
    filters.veracityRange[0] !== 0 ||
    filters.veracityRange[1] !== 1 ||
    filters.methodologies.length > 0 ||
    filters.nodeTypes.length > 0 ||
    filters.levels.length < 2 ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null;

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg ${className}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              Active
            </span>
          )}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="p-4 space-y-6 border-t border-gray-700">
          {/* Veracity Score Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Veracity Score: {filters.veracityRange[0].toFixed(2)} -{' '}
              {filters.veracityRange[1].toFixed(2)}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.veracityRange[0]}
                onChange={(e) => handleVeracityChange(0, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.veracityRange[1]}
                onChange={(e) => handleVeracityChange(1, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* Methodologies */}
          {availableMethodologies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Methodology
              </label>
              <div className="space-y-2">
                {availableMethodologies.map((methodology) => (
                  <label
                    key={methodology}
                    className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={filters.methodologies.includes(methodology)}
                      onChange={() => toggleMethodology(methodology)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    {methodology}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Node Types */}
          {availableNodeTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Node Type
              </label>
              <div className="space-y-2">
                {availableNodeTypes.map((nodeType) => (
                  <label
                    key={nodeType}
                    className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={filters.nodeTypes.includes(nodeType)}
                      onChange={() => toggleNodeType(nodeType)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    {nodeType}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Graph Level
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.levels.includes(GraphLevel.LEVEL_0)}
                  onChange={() => toggleLevel(GraphLevel.LEVEL_0)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                Level 0 (Verified)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.levels.includes(GraphLevel.LEVEL_1)}
                  onChange={() => toggleLevel(GraphLevel.LEVEL_1)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                Level 1 (Editable)
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={
                  filters.dateRange.start
                    ? filters.dateRange.start.toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      start: e.target.value ? new Date(e.target.value) : null,
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={
                  filters.dateRange.end
                    ? filters.dateRange.end.toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      end: e.target.value ? new Date(e.target.value) : null,
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
