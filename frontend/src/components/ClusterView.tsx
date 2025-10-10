/**
 * ClusterView Component
 *
 * Groups nodes by methodology or veracity range with visual clustering.
 * Provides expand/collapse functionality for each cluster.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { GraphCanvasNode, GraphCanvasEdge, GraphLevel } from '@/types/graph';
import { getVeracityColor, getVeracityLabel } from '@/utils/graphHelpers';

/**
 * Cluster grouping options
 */
export type ClusterGrouping = 'methodology' | 'veracity' | 'level';

/**
 * Veracity ranges for clustering
 */
export enum VeracityRange {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * ClusterView props
 */
export interface ClusterViewProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onNodeClick?: (node: GraphCanvasNode) => void;
  className?: string;
}

/**
 * Get veracity range category
 */
function getVeracityRange(weight: number): VeracityRange {
  if (weight >= 0.7) return VeracityRange.HIGH;
  if (weight >= 0.4) return VeracityRange.MEDIUM;
  return VeracityRange.LOW;
}

/**
 * Get cluster color
 */
function getClusterColor(key: string, grouping: ClusterGrouping): string {
  if (grouping === 'veracity') {
    switch (key) {
      case VeracityRange.HIGH:
        return 'bg-green-900/30 border-green-600';
      case VeracityRange.MEDIUM:
        return 'bg-yellow-900/30 border-yellow-600';
      case VeracityRange.LOW:
        return 'bg-red-900/30 border-red-600';
      default:
        return 'bg-gray-800 border-gray-600';
    }
  }

  if (grouping === 'level') {
    return key === '0'
      ? 'bg-blue-900/30 border-blue-600'
      : 'bg-purple-900/30 border-purple-600';
  }

  // Methodology - use hash-based colors
  const colors = [
    'bg-pink-900/30 border-pink-600',
    'bg-indigo-900/30 border-indigo-600',
    'bg-teal-900/30 border-teal-600',
    'bg-orange-900/30 border-orange-600',
    'bg-cyan-900/30 border-cyan-600',
  ];
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Format cluster label
 */
function formatClusterLabel(key: string, grouping: ClusterGrouping): string {
  if (grouping === 'veracity') {
    switch (key) {
      case VeracityRange.HIGH:
        return 'High Confidence (0.7-1.0)';
      case VeracityRange.MEDIUM:
        return 'Medium Confidence (0.4-0.69)';
      case VeracityRange.LOW:
        return 'Low Confidence (0.0-0.39)';
      default:
        return key;
    }
  }

  if (grouping === 'level') {
    return key === '0' ? 'Level 0 (Verified)' : 'Level 1 (Editable)';
  }

  return key || 'Uncategorized';
}

/**
 * ClusterView Component
 */
export default function ClusterView({
  nodes,
  edges,
  onNodeClick,
  className = '',
}: ClusterViewProps) {
  const [grouping, setGrouping] = useState<ClusterGrouping>('methodology');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Group nodes by selected criterion
  const clusters = useMemo(() => {
    const groups = new Map<string, GraphCanvasNode[]>();

    nodes.forEach((node) => {
      let key: string;

      switch (grouping) {
        case 'methodology':
          key = node.data.methodology || 'uncategorized';
          break;
        case 'veracity':
          key = getVeracityRange(node.data.weight);
          break;
        case 'level':
          key = String(node.data.level);
          break;
        default:
          key = 'other';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(node);
    });

    // Sort clusters by size
    return new Map(
      Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)
    );
  }, [nodes, grouping]);

  // Toggle cluster expansion
  const toggleCluster = (clusterKey: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterKey)) {
        next.delete(clusterKey);
      } else {
        next.add(clusterKey);
      }
      return next;
    });
  };

  // Handle node click
  const handleNodeClick = (node: GraphCanvasNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  // Get connections for a node
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Cluster View</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setGrouping('methodology')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'methodology'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Methodology
          </button>
          <button
            onClick={() => setGrouping('veracity')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'veracity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Veracity
          </button>
          <button
            onClick={() => setGrouping('level')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              grouping === 'level'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Level
          </button>
        </div>
      </div>

      {/* Clusters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.from(clusters.entries()).map(([clusterKey, clusterNodes]) => {
          const isExpanded = expandedClusters.has(clusterKey);
          const clusterColor = getClusterColor(clusterKey, grouping);
          const clusterLabel = formatClusterLabel(clusterKey, grouping);

          // Calculate cluster stats
          const avgVeracity =
            clusterNodes.reduce((sum, n) => sum + n.data.weight, 0) /
            clusterNodes.length;
          const level0Count = clusterNodes.filter(
            (n) => n.data.level === GraphLevel.LEVEL_0
          ).length;

          return (
            <div
              key={clusterKey}
              className={`border-2 rounded-lg overflow-hidden ${clusterColor}`}
            >
              {/* Cluster Header */}
              <div
                onClick={() => toggleCluster(clusterKey)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-gray-300 transition-transform ${
                      isExpanded ? 'transform rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {clusterLabel}
                    </h3>
                    <div className="text-sm text-gray-400 mt-1">
                      {clusterNodes.length} node{clusterNodes.length !== 1 ? 's' : ''}{' '}
                      • Avg veracity: {(avgVeracity * 100).toFixed(0)}%
                      {level0Count > 0 && ` • ${level0Count} verified`}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white/20">
                  {clusterNodes.length}
                </div>
              </div>

              {/* Cluster Content */}
              {isExpanded && (
                <div className="p-4 border-t border-current/20 bg-black/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {clusterNodes.map((node) => {
                      const isSelected = selectedNode === node.id;
                      const isConnected = connectedNodes.has(node.id);
                      const nodeColor = getVeracityColor(
                        node.data.weight,
                        node.data.level
                      );

                      return (
                        <div
                          key={node.id}
                          onClick={() => handleNodeClick(node)}
                          className={`
                            p-3 rounded-lg cursor-pointer transition-all
                            ${isSelected ? 'ring-2 ring-blue-500 scale-105' : ''}
                            ${
                              isConnected && !isSelected
                                ? 'ring-1 ring-yellow-500'
                                : ''
                            }
                            hover:scale-105 shadow-lg
                          `}
                          style={{
                            backgroundColor: nodeColor,
                          }}
                        >
                          <div className="text-sm font-medium text-white truncate">
                            {node.data.label}
                          </div>
                          <div className="text-xs text-white/80 mt-1">
                            Veracity: {(node.data.weight * 100).toFixed(0)}%
                          </div>
                          {node.data.level === GraphLevel.LEVEL_0 && (
                            <div className="text-xs font-bold text-white bg-black/20 px-2 py-0.5 rounded mt-1 inline-block">
                              Level 0
                            </div>
                          )}
                          {node.data.metadata?.createdAt && (
                            <div className="text-xs text-white/60 mt-1">
                              {new Date(
                                node.data.metadata.createdAt as string
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center gap-6 p-4 border-t border-gray-700 text-sm text-gray-400">
        <div>
          <span className="font-semibold text-white">{clusters.size}</span> cluster
          {clusters.size !== 1 ? 's' : ''}
        </div>
        <div>
          <span className="font-semibold text-white">{nodes.length}</span> total
          nodes
        </div>
        <div>
          <span className="font-semibold text-white">{edges.length}</span> total
          edges
        </div>
      </div>
    </div>
  );
}
