'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_GRAPH_WITH_LAYERS, GET_USER_THEORIES } from '@/graphql/mutations';

// ============================================================================
// Types
// ============================================================================

interface TheoryOverlayProps {
  userId: string;
  onGraphSelect?: (graphId: string) => void;
}

interface GraphLayer {
  graphId: string;
  isLevel0: boolean;
  name?: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  visible: boolean;
  color: string;
}

interface GraphNode {
  id: string;
  nodeTypeId: string;
  props: any;
  meta: any;
  weight: number;
  isLevel0: boolean;
  graphId: string;
}

interface GraphEdge {
  id: string;
  edgeTypeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  props: any;
  weight: number;
  isLevel0: boolean;
  graphId: string;
}

interface UserTheory {
  id: string;
  name: string;
  description: string;
  privacy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function TheoryOverlay({ userId, onGraphSelect }: TheoryOverlayProps) {
  // State
  const [selectedGraphIds, setSelectedGraphIds] = useState<string[]>([]);
  const [includeLevel0, setIncludeLevel0] = useState(true);
  const [layers, setLayers] = useState<GraphLayer[]>([]);
  const [expandedTheory, setExpandedTheory] = useState<string | null>(null);

  // Colors for different theory layers
  const LAYER_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EF4444', // red
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  // GraphQL Queries
  const { data: theoriesData, loading: theoriesLoading } = useQuery(GET_USER_THEORIES, {
    variables: { userId },
    skip: !userId,
  });

  const { data: layersData, loading: layersLoading, refetch: refetchLayers } = useQuery(
    GET_GRAPH_WITH_LAYERS,
    {
      variables: {
        graphIds: selectedGraphIds,
        includeLevel0,
      },
      skip: selectedGraphIds.length === 0,
    }
  );

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (layersData?.graphsWithLayers) {
      const newLayers: GraphLayer[] = layersData.graphsWithLayers.map(
        (layer: any, index: number) => {
          const theory = theoriesData?.userGraphs?.find((t: UserTheory) => t.id === layer.graphId);
          return {
            graphId: layer.graphId,
            isLevel0: layer.isLevel0,
            name: layer.isLevel0 ? 'Level 0 (Truth Corpus)' : theory?.name || 'Unnamed Theory',
            description: layer.isLevel0
              ? 'Verified facts with 99%+ consensus'
              : theory?.description || '',
            nodes: layer.nodes,
            edges: layer.edges,
            visible: true,
            color: layer.isLevel0 ? '#22C55E' : LAYER_COLORS[index % LAYER_COLORS.length],
          };
        }
      );

      setLayers(newLayers);
    }
  }, [layersData, theoriesData]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleTheory = (theoryId: string) => {
    if (selectedGraphIds.includes(theoryId)) {
      setSelectedGraphIds(selectedGraphIds.filter((id) => id !== theoryId));
    } else {
      setSelectedGraphIds([...selectedGraphIds, theoryId]);
    }
  };

  const handleToggleLayerVisibility = (graphId: string) => {
    setLayers(
      layers.map((layer) =>
        layer.graphId === graphId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const handleToggleLevel0 = () => {
    setIncludeLevel0(!includeLevel0);
    if (selectedGraphIds.length > 0) {
      refetchLayers();
    }
  };

  const handleExpandTheory = (theoryId: string) => {
    setExpandedTheory(expandedTheory === theoryId ? null : theoryId);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderTheoryList = () => {
    if (theoriesLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const theories: UserTheory[] = theoriesData?.userGraphs || [];

    if (theories.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No theories yet. Create your first theory to get started!</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {theories.map((theory, index) => {
          const isSelected = selectedGraphIds.includes(theory.id);
          const isExpanded = expandedTheory === theory.id;
          const color = LAYER_COLORS[index % LAYER_COLORS.length];

          return (
            <div
              key={theory.id}
              className={`border rounded-lg transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{theory.name}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {theory.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>
                          {theory.isPublic ? '🌐 Public' : '🔒 Private'}
                        </span>
                        <span>
                          Updated {new Date(theory.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExpandTheory(theory.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
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
                    </button>
                    <button
                      onClick={() => handleToggleTheory(theory.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {isSelected ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Privacy:</span>
                        <span className="ml-2 text-gray-600">{theory.privacy}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(theory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onGraphSelect?.(theory.id)}
                      className="mt-4 w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Open Theory
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderActiveLayersPanel = () => {
    if (layers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Select theories from the list to see them overlaid on the graph.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {layers.map((layer) => (
          <div
            key={layer.graphId}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div
                  className="w-4 h-4 rounded-full mt-1"
                  style={{ backgroundColor: layer.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800">{layer.name}</h4>
                  {layer.description && (
                    <p className="text-sm text-gray-600 mt-1">{layer.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{layer.nodes.length} nodes</span>
                    <span>{layer.edges.length} edges</span>
                    {layer.isLevel0 && (
                      <span className="text-green-600 font-semibold">✓ Verified</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleLayerVisibility(layer.graphId)}
                className={`ml-4 p-2 rounded-lg transition-colors ${
                  layer.visible
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                      clipRule="evenodd"
                    />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Layer Statistics */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-gray-800">
                    {layer.nodes.filter((n) => n.isLevel0).length}
                  </div>
                  <div className="text-xs text-gray-500">Level 0 Links</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {(
                      layer.nodes.reduce((sum, n) => sum + n.weight, 0) / layer.nodes.length || 0
                    ).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Avg Weight</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {layer.edges.filter((e) => e.isLevel0).length}
                  </div>
                  <div className="text-xs text-gray-500">Verified Edges</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel: Theory Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Theories</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            + New Theory
          </button>
        </div>

        {/* Level 0 Toggle */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <div>
                <h3 className="font-semibold text-green-900">Level 0 (Truth Corpus)</h3>
                <p className="text-sm text-green-700">Verified facts with 99%+ consensus</p>
              </div>
            </div>
            <button
              onClick={handleToggleLevel0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                includeLevel0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {includeLevel0 ? 'Shown' : 'Hidden'}
            </button>
          </div>
        </div>

        {/* Theory List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Level 1 Theories:</h3>
          {renderTheoryList()}
        </div>
      </div>

      {/* Right Panel: Active Layers */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Active Layers</h2>

        {layersLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          renderActiveLayersPanel()
        )}

        {/* Legend */}
        {layers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Visualization Key:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Level 0 nodes (verified truth)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-white"></div>
                <span className="text-gray-600">Nodes connected to Level 0 (credibility boost)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-0.5 bg-green-500"></div>
                <span className="text-gray-600">Verified connections (green glow)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
