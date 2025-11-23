/**
 * TimelineView Component
 *
 * Horizontal timeline layout showing nodes chronologically.
 * Groups nodes by date with configurable granularity (day/week/month).
 */

'use client';

import React, { useMemo, useState } from 'react';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import { getVeracityColor } from '@/utils/graphHelpers';

/**
 * Timeline grouping options
 */
export type TimelineGrouping = 'day' | 'week' | 'month';

/**
 * TimelineView props
 */
export interface TimelineViewProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onNodeClick?: (node: GraphCanvasNode) => void;
  className?: string;
}

/**
 * Group nodes by date
 */
function groupNodesByDate(
  nodes: GraphCanvasNode[],
  grouping: TimelineGrouping
): Map<string, GraphCanvasNode[]> {
  const groups = new Map<string, GraphCanvasNode[]>();

  nodes.forEach((node) => {
    const createdAt = node.data.metadata?.createdAt
      ? new Date(node.data.metadata.createdAt as string)
      : new Date();

    let key: string;

    switch (grouping) {
      case 'day':
        key = createdAt.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(createdAt);
        weekStart.setDate(createdAt.getDate() - createdAt.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = createdAt.toISOString().split('T')[0];
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(node);
  });

  return groups;
}

/**
 * Format date label based on grouping
 */
function formatDateLabel(dateKey: string, grouping: TimelineGrouping): string {
  const date = new Date(dateKey);

  switch (grouping) {
    case 'day':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'week':
      const weekEnd = new Date(date);
      weekEnd.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    default:
      return dateKey;
  }
}

/**
 * TimelineView Component
 */
export default function TimelineView({
  nodes,
  edges,
  onNodeClick,
  className = '',
}: TimelineViewProps) {
  const [grouping, setGrouping] = useState<TimelineGrouping>('day');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Sort nodes by date
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const dateA = a.data.metadata?.createdAt
        ? new Date(a.data.metadata.createdAt as string).getTime()
        : 0;
      const dateB = b.data.metadata?.createdAt
        ? new Date(b.data.metadata.createdAt as string).getTime()
        : 0;
      return dateA - dateB;
    });
  }, [nodes]);

  // Group nodes by date
  const groupedNodes = useMemo(() => {
    return groupNodesByDate(sortedNodes, grouping);
  }, [sortedNodes, grouping]);

  // Get sorted date keys
  const dateKeys = useMemo(() => {
    return Array.from(groupedNodes.keys()).sort();
  }, [groupedNodes]);

  // Handle node click
  const handleNodeClick = (node: GraphCanvasNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  // Find edges connected to a node
  const getConnectedNodeIds = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  };

  const connectedNodes = selectedNode ? getConnectedNodeIds(selectedNode) : new Set();

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Timeline View</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setGrouping('day')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setGrouping('week')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setGrouping('month')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-8 min-w-min">
          {dateKeys.map((dateKey) => {
            const nodesInGroup = groupedNodes.get(dateKey)!;

            return (
              <div key={dateKey} className="flex flex-col items-center min-w-[200px]">
                {/* Date label */}
                <div className="mb-4 text-center">
                  <div className="text-sm font-semibold text-gray-300">
                    {formatDateLabel(dateKey, grouping)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {nodesInGroup.length} node{nodesInGroup.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Vertical line */}
                <div className="w-0.5 bg-gray-700 flex-1 min-h-[400px] relative">
                  {/* Nodes */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-[180px] space-y-4 pt-4">
                    {nodesInGroup.map((node, index) => {
                      const isSelected = selectedNode === node.id;
                      const isConnected = connectedNodes.has(node.id);
                      const color = getVeracityColor(node.data.weight);

                      return (
                        <div
                          key={node.id}
                          className="relative"
                          style={{
                            marginLeft: index % 2 === 0 ? '-100px' : '100px',
                          }}
                        >
                          {/* Connector line */}
                          <div
                            className="absolute top-1/2 h-0.5 bg-gray-600"
                            style={{
                              width: '100px',
                              left: index % 2 === 0 ? '100%' : '-100px',
                            }}
                          />

                          {/* Node card */}
                          <div
                            onClick={() => handleNodeClick(node)}
                            className={`
                              p-3 rounded-lg cursor-pointer transition-all
                              ${isSelected ? 'ring-2 ring-blue-500 scale-105' : ''}
                              ${isConnected && !isSelected ? 'ring-1 ring-yellow-500' : ''}
                              hover:scale-105 shadow-lg
                            `}
                            style={{
                              backgroundColor: color,
                              borderColor: color,
                            }}
                          >
                            <div className="text-sm font-medium text-white truncate">
                              {node.data.label}
                            </div>
                            <div className="text-xs text-white/80 mt-1">
                              {(node.data.weight * 100).toFixed(0)}% veracity
                            </div>
                            {isHighCredibility(node.data.weight) && (
                              <div className="text-xs font-bold text-white bg-black/20 px-2 py-0.5 rounded mt-1 inline-block">
                                Level 0
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline marker */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-gray-900" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 p-4 border-t border-gray-700 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Verified (1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-lime-500 rounded" />
          <span>High (0.7+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span>Medium (0.4+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span>Low (0.1+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Provisional (0.0+)</span>
        </div>
      </div>
    </div>
  );
}
