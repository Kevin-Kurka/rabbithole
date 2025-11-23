/**
 * GraphCanvas Component
 *
 * Main graph canvas component using React Flow for visualizing and
 * interacting with knowledge graphs.
 *
 * Features:
 * - Level 0 (read-only) and Level 1 (editable) support
 * - Visual veracity score indicators
 * - Lock icons on Level 0 nodes/edges
 * - Context menu for operations
 * - Minimap and controls
 * - Zoom and pan functionality
 * - Undo/redo support
 * - Copy/paste functionality
 * - GraphQL integration
 * - Real-time updates via subscriptions
 */

'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  GraphCanvasNode,
  GraphCanvasEdge,
  GraphCanvasProps,
  ContextMenuState,
  ContextMenuItem,
  ContextMenuAction,
  HistoryItem,
  GraphLevel,
  NodeData,
  EdgeData,
} from '@/types/graph';
import {
  GRAPH_QUERY,
  CREATE_NODE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  CREATE_EDGE_MUTATION,
  UPDATE_EDGE_MUTATION,
  DELETE_EDGE_MUTATION,
  NODE_UPDATED_SUBSCRIPTION,
  NODE_CREATED_SUBSCRIPTION,
  NODE_DELETED_SUBSCRIPTION,
  EDGE_UPDATED_SUBSCRIPTION,
  EDGE_CREATED_SUBSCRIPTION,
  EDGE_DELETED_SUBSCRIPTION,
} from '@/graphql/queries/graphs';
import GraphNode from './graph-node';
import GraphEdge from './graph-edge';
import ContextMenu from './context-menu';
import RemoteCursor from './collaboration/remote-cursor';
import LayoutControls from './visualization/layout-controls';
import { ActiveUser } from '@/types/collaboration';
import { theme } from '@/styles/theme';
import {
  LayoutEngine,
  LayoutType,
  LayoutConfig,
  interpolateNodePositions,
} from '@/utils/layouts';
import { getGraphColor } from '@/utils/graphColors';

import '@xyflow/react/dist/style.css';
import '@/styles/graph-canvas.css';

/**
 * Custom node types for different methodologies
 */
const nodeTypes: NodeTypes = {
  default: GraphNode,
  custom: GraphNode,
  methodology: GraphNode, // Can be extended for specific methodology types
};

/**
 * Custom edge types
 */
const edgeTypes: EdgeTypes = {
  default: GraphEdge,
  custom: GraphEdge,
};

/**
 * Maximum history items for undo/redo
 */
const MAX_HISTORY_SIZE = 50;

/**
 * GraphCanvas inner component (requires ReactFlowProvider)
 */
function GraphCanvasInner({
  graphIds,
  onSave,
  onError,
  onNodeSelect,
  onEdgeSelect,
  readOnly = false,
  initialNodes = [],
  initialEdges = [],
  methodologyId,
  showMinimap = true,
  showControls = true,
  showBackground = true,
  className = '',
  activeUsers = [],
  onCursorMove,
}: GraphCanvasProps) {
  // State
  const [nodes, setNodes] = useState<GraphCanvasNode[]>(initialNodes);
  const [edges, setEdges] = useState<GraphCanvasEdge[]>(initialEdges);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetType: null,
    targetId: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<{
    nodes: GraphCanvasNode[];
    edges: GraphCanvasEdge[];
  } | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(LayoutType.MANUAL);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // GraphQL - Fetch graphs individually (max 5 concurrent graphs supported)
  // Using fixed number of hooks to comply with React rules of hooks
  const graph1 = useQuery(GRAPH_QUERY, {
    variables: { id: graphIds[0] },
    skip: !graphIds[0],
  });
  const graph2 = useQuery(GRAPH_QUERY, {
    variables: { id: graphIds[1] },
    skip: !graphIds[1],
  });
  const graph3 = useQuery(GRAPH_QUERY, {
    variables: { id: graphIds[2] },
    skip: !graphIds[2],
  });
  const graph4 = useQuery(GRAPH_QUERY, {
    variables: { id: graphIds[3] },
    skip: !graphIds[3],
  });
  const graph5 = useQuery(GRAPH_QUERY, {
    variables: { id: graphIds[4] },
    skip: !graphIds[4],
  });

  // Collect active queries
  const graphQueries = useMemo(() => {
    const queries = [];
    if (graphIds[0]) queries.push({ graphId: graphIds[0], result: graph1 });
    if (graphIds[1]) queries.push({ graphId: graphIds[1], result: graph2 });
    if (graphIds[2]) queries.push({ graphId: graphIds[2], result: graph3 });
    if (graphIds[3]) queries.push({ graphId: graphIds[3], result: graph4 });
    if (graphIds[4]) queries.push({ graphId: graphIds[4], result: graph5 });
    return queries;
  }, [graphIds, graph1, graph2, graph3, graph4, graph5]);

  // Determine the "primary" writable graph (first Level 1 graph in the list)
  // New nodes/edges will be created in this graph
  const primaryWritableGraphId = useMemo(() => {
    // Find the first Level 1 (writable) graph from loaded data
    for (const { graphId, result } of graphQueries) {
      if (result.data?.graph && result.data.graph.weight < 0.90) {
        return graphId;
      }
    }
    // Fallback: if no Level 1 graph found, return empty string (will disable mutations)
    return '';
  }, [graphQueries]);

  // Aggregate loading and error states
  const graphLoading = graphQueries.some((q) => q.result.loading);
  const graphError = graphQueries.find((q) => q.result.error)?.result.error;

  // Extract graph data for use in dependencies (stable references)
  const graphDataList = useMemo(() => {
    return graphQueries.map((q) => q.result.data?.graph).filter(Boolean);
  }, [graphQueries]);

  const [createNode] = useMutation(CREATE_NODE_MUTATION);
  const [updateNode] = useMutation(UPDATE_NODE_MUTATION);
  const [deleteNodeMutation] = useMutation(DELETE_NODE_MUTATION);
  const [createEdgeMutation] = useMutation(CREATE_EDGE_MUTATION);
  const [updateEdgeMutation] = useMutation(UPDATE_EDGE_MUTATION);
  const [deleteEdgeMutation] = useMutation(DELETE_EDGE_MUTATION);

  // Subscriptions for real-time updates (subscribe to primary graph for now)
  // TODO: Implement multi-graph subscriptions properly
  useSubscription(NODE_UPDATED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.nodeUpdated) {
        const updatedNode = data.data.nodeUpdated;
        const graphColor = getGraphColor(primaryWritableGraphId, graphIds);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === updatedNode.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    weight: updatedNode.weight,
                    level: updatedNode.level,
                    graphId: primaryWritableGraphId,
                    graphColor,
                    ...JSON.parse(updatedNode.props || '{}'),
                  },
                }
              : n
          )
        );
      }
    },
  });

  useSubscription(NODE_CREATED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.nodeCreated) {
        const newNode = data.data.nodeCreated;
        const props = JSON.parse(newNode.props || '{}');

        setNodes((nds) => {
          // Avoid duplicates
          if (nds.find((n) => n.id === newNode.id)) return nds;

          return [
            ...nds,
            {
              id: newNode.id,
              type: 'custom',
              position: { x: props.x || 0, y: props.y || 0 },
              data: {
                label: props.label || 'New Node',
                weight: newNode.weight,
                level: newNode.level,
                isLocked: newNode.level === GraphLevel.LEVEL_0,
                methodology: methodologyId,
                ...props,
              },
            },
          ];
        });
      }
    },
  });

  useSubscription(NODE_DELETED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.nodeDeleted) {
        const deletedId = data.data.nodeDeleted.id;
        setNodes((nds) => nds.filter((n) => n.id !== deletedId));
        setEdges((eds) =>
          eds.filter((e) => e.source !== deletedId && e.target !== deletedId)
        );
      }
    },
  });

  useSubscription(EDGE_UPDATED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.edgeUpdated) {
        const updatedEdge = data.data.edgeUpdated;
        setEdges((eds) =>
          eds.map((e) =>
            e.id === updatedEdge.id
              ? {
                  ...e,
                  data: {
                    ...e.data,
                    weight: updatedEdge.weight,
                    level: updatedEdge.level,
                    ...JSON.parse(updatedEdge.props || '{}'),
                  } as EdgeData,
                }
              : e
          )
        );
      }
    },
  });

  useSubscription(EDGE_CREATED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.edgeCreated) {
        const newEdge = data.data.edgeCreated;
        const props = JSON.parse(newEdge.props || '{}');

        setEdges((eds) => {
          // Avoid duplicates
          if (eds.find((e) => e.id === newEdge.id)) return eds;

          return [
            ...eds,
            {
              id: newEdge.id,
              source: newEdge.from.id,
              target: newEdge.to.id,
              type: 'custom',
              data: {
                weight: newEdge.weight,
                level: newEdge.level,
                isLocked: newEdge.level === GraphLevel.LEVEL_0,
                ...props,
              },
            },
          ];
        });
      }
    },
  });

  useSubscription(EDGE_DELETED_SUBSCRIPTION, {
    variables: { graphId: primaryWritableGraphId },
    skip: !primaryWritableGraphId,
    onData: ({ data }) => {
      if (data?.data?.edgeDeleted) {
        const deletedId = data.data.edgeDeleted.id;
        setEdges((eds) => eds.filter((e) => e.id !== deletedId));
      }
    },
  });

  // Track if initial load has happened
  const initialLoadRef = useRef(false);

  // Load and merge graph data from multiple graphs
  useEffect(() => {
    if (!graphLoading && graphDataList.length > 0) {
      // Merge nodes and edges from all loaded graphs
      const allLoadedNodes: GraphCanvasNode[] = [];
      const allLoadedEdges: GraphCanvasEdge[] = [];

      graphQueries.forEach(({ graphId, result }) => {
        if (result.data?.graph) {
          const graphColor = getGraphColor(graphId, graphIds);

          // Map nodes with graph color indicator
          const graphNodes: GraphCanvasNode[] = result.data.graph.nodes.map(
            (node: any) => {
              const props = JSON.parse(node.props || '{}');
              return {
                id: node.id,
                type: 'custom',
                position: { x: props.x || Math.random() * 500, y: props.y || Math.random() * 500 },
                data: {
                  label: props.label || 'Node',
                  weight: node.weight || 0.5,
                  level: node.level ?? GraphLevel.LEVEL_1,
                  isLocked: node.level === GraphLevel.LEVEL_0,
                  methodology: methodologyId,
                  graphId, // Track which graph this node belongs to
                  graphColor, // Color indicator for this graph
                  metadata: props.metadata,
                  ...props,
                },
              };
            }
          );

          // Map edges with graph color indicator
          const graphEdges: GraphCanvasEdge[] = result.data.graph.edges.map(
            (edge: any) => {
              const props = JSON.parse(edge.props || '{}');
              return {
                id: edge.id,
                source: edge.from.id,
                target: edge.to.id,
                type: 'custom',
                animated: false,
                data: {
                  label: props.label,
                  weight: edge.weight || 0.5,
                  level: edge.level ?? GraphLevel.LEVEL_1,
                  isLocked: edge.level === GraphLevel.LEVEL_0,
                  graphId, // Track which graph this edge belongs to
                  graphColor, // Color indicator for this graph
                  metadata: props.metadata,
                  ...props,
                },
              };
            }
          );

          allLoadedNodes.push(...graphNodes);
          allLoadedEdges.push(...graphEdges);
        }
      });

      setNodes(allLoadedNodes);
      setEdges(allLoadedEdges);

      // Initialize history only once
      if (!initialLoadRef.current && (allLoadedNodes.length > 0 || allLoadedEdges.length > 0)) {
        initialLoadRef.current = true;
        setHistory([{
          nodes: JSON.parse(JSON.stringify(allLoadedNodes)),
          edges: JSON.parse(JSON.stringify(allLoadedEdges)),
          timestamp: Date.now(),
          action: 'initial',
        }]);
        setHistoryIndex(0);
      }
    }
  }, [graphDataList, graphLoading, graphIds, methodologyId]);

  // Error handling
  useEffect(() => {
    if (graphError && onError) {
      onError(graphError);
    }
  }, [graphError, onError]);

  // History management
  const addToHistory = useCallback(
    (nodes: GraphCanvasNode[], edges: GraphCanvasEdge[], action: string) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          timestamp: Date.now(),
          action,
        });

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    },
    [historyIndex]
  );

  // Undo operation
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(JSON.parse(JSON.stringify(prevState.nodes)));
      setEdges(JSON.parse(JSON.stringify(prevState.edges)));
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo operation
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;

      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);

        // Save position changes to database
        changes.forEach((change) => {
          if (change.type === 'position' && change.position && !change.dragging) {
            const node = updatedNodes.find((n) => n.id === change.id);
            if (node && !node.data.isLocked) {
              const props = {
                ...node.data,
                x: change.position.x,
                y: change.position.y,
              };
              updateNode({
                variables: {
                  id: node.id,
                  props: JSON.stringify(props),
                },
              }).catch((err) => onError?.(err));
            }
          }
        });

        return updatedNodes;
      });
    },
    [readOnly, updateNode, onError]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [readOnly]
  );

  // Handle node click for selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: GraphCanvasNode) => {
      console.log('Node clicked:', node);
      if (onNodeSelect) {
        console.log('Calling onNodeSelect with:', node);
        onNodeSelect(node);
      }
      // Deselect edge when node is selected
      if (onEdgeSelect) {
        onEdgeSelect(null);
      }
    },
    [onNodeSelect, onEdgeSelect]
  );

  // Handle edge click for selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: GraphCanvasEdge) => {
      console.log('Edge clicked:', edge);
      if (onEdgeSelect) {
        console.log('Calling onEdgeSelect with:', edge);
        onEdgeSelect(edge);
      }
      // Deselect node when edge is selected
      if (onNodeSelect) {
        onNodeSelect(null);
      }
    },
    [onEdgeSelect, onNodeSelect]
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    console.log('Pane clicked - deselecting');
    if (onNodeSelect) {
      onNodeSelect(null);
    }
    if (onEdgeSelect) {
      onEdgeSelect(null);
    }
  }, [onNodeSelect, onEdgeSelect]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log('onConnect called:', connection);
      if (readOnly) {
        console.log('Canvas is read-only, aborting edge creation');
        return;
      }

      if (connection.source && connection.target) {
        console.log('Creating edge from', connection.source, 'to', connection.target);

        // Check if source or target is locked
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (sourceNode?.data.isLocked || targetNode?.data.isLocked) {
          console.log('Cannot create edge - source or target is locked');
          return; // Cannot create edge from/to locked nodes
        }

        console.log('Creating edge mutation...');
        createEdgeMutation({
          variables: {
            input: {
              graphId: primaryWritableGraphId,
              from: connection.source,
              to: connection.target,
              props: JSON.stringify({ label: '' }),
            },
          },
        })
          .then((result) => {
            console.log('Edge creation result:', result);
            if (result.data?.createEdge) {
              const newEdge = result.data.createEdge;
              setEdges((eds) =>
                addEdge(
                  {
                    id: newEdge.id,
                    source: connection.source!,
                    target: connection.target!,
                    type: 'custom',
                    data: {
                      weight: newEdge.weight || 0.5,
                      level: newEdge.level ?? GraphLevel.LEVEL_1,
                      isLocked: false,
                    },
                  },
                  eds
                )
              );
              addToHistory(nodes, edges, 'create_edge');
              console.log('Edge added to canvas');
            }
          })
          .catch((err) => {
            console.error('Failed to create edge:', err);
            onError?.(err);
          });
      }
    },
    [readOnly, nodes, edges, primaryWritableGraphId, createEdgeMutation, onError, addToHistory]
  );

  // Handle node/edge context menu
  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: GraphCanvasNode) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        targetType: 'node',
        targetId: node.id,
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: GraphCanvasEdge) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        targetType: 'edge',
        targetId: edge.id,
      });
    },
    []
  );

  const onPaneContextMenu = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      targetType: 'canvas',
      targetId: null,
    });
  }, []);

  // Handle mouse move for cursor tracking
  const onPaneMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      if (onCursorMove && reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        onCursorMove(x, y);
      }
    },
    [onCursorMove]
  );

  // Context menu items based on target type
  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    const { targetType, targetId } = contextMenu;

    if (targetType === 'node' && targetId) {
      const node = nodes.find((n) => n.id === targetId);
      const isLocked = node?.data.isLocked || false;

      return [
        {
          id: ContextMenuAction.EDIT,
          label: 'Edit Node',
          icon: 'edit',
          shortcut: 'E',
          disabled: isLocked || readOnly,
        },
        {
          id: ContextMenuAction.DUPLICATE,
          label: 'Duplicate',
          icon: 'duplicate',
          shortcut: '⌘D',
          disabled: readOnly,
        },
        {
          id: ContextMenuAction.COPY,
          label: 'Copy',
          icon: 'copy',
          shortcut: '⌘C',
        },
        { id: ContextMenuAction.DELETE, label: '', separator: true },
        {
          id: ContextMenuAction.DELETE,
          label: 'Delete',
          icon: 'delete',
          shortcut: 'Del',
          disabled: isLocked || readOnly,
        },
      ];
    }

    if (targetType === 'edge' && targetId) {
      const edge = edges.find((e) => e.id === targetId);
      const isLocked = edge?.data?.isLocked || false;

      return [
        {
          id: ContextMenuAction.EDIT,
          label: 'Edit Edge',
          icon: 'edit',
          shortcut: 'E',
          disabled: isLocked || readOnly,
        },
        { id: ContextMenuAction.DELETE, label: '', separator: true },
        {
          id: ContextMenuAction.DELETE,
          label: 'Delete',
          icon: 'delete',
          shortcut: 'Del',
          disabled: isLocked || readOnly,
        },
      ];
    }

    if (targetType === 'canvas') {
      return [
        {
          id: ContextMenuAction.CREATE_NODE,
          label: 'New Node',
          icon: 'plus',
          shortcut: '⌘N',
          disabled: readOnly,
        },
        { id: ContextMenuAction.PASTE, label: '', separator: true },
        {
          id: ContextMenuAction.PASTE,
          label: 'Paste',
          icon: 'paste',
          shortcut: '⌘V',
          disabled: !clipboard || readOnly,
        },
      ];
    }

    return [];
  }, [contextMenu, nodes, edges, clipboard, readOnly]);

  // Handle context menu actions
  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      const { targetType, targetId } = contextMenu;

      switch (actionId) {
        case ContextMenuAction.CREATE_NODE: {
          console.log('Creating new node...');
          const position = contextMenu.x && contextMenu.y
            ? screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y })
            : { x: 250, y: 250 };

          console.log('Position:', position);

          const props = {
            label: 'New Node',
            x: position.x,
            y: position.y,
          };

          console.log('Creating node with props:', props);
          console.log('GraphId:', primaryWritableGraphId);

          createNode({
            variables: {
              input: {
                graphId: primaryWritableGraphId,
                props: JSON.stringify(props),
              },
            },
          })
            .then((result) => {
              console.log('Node created successfully:', result);
            })
            .catch((err) => {
              console.error('Failed to create node:', err);
              onError?.(err);
            });
          break;
        }

        case ContextMenuAction.EDIT:
          // TODO: Open edit modal/panel
          console.log('Edit:', targetType, targetId);
          break;

        case ContextMenuAction.DELETE:
          if (targetType === 'node' && targetId) {
            const node = nodes.find((n) => n.id === targetId);
            if (node && !node.data.isLocked) {
              deleteNodeMutation({ variables: { id: targetId } })
                .then(() => {
                  setNodes((nds) => nds.filter((n) => n.id !== targetId));
                  setEdges((eds) =>
                    eds.filter((e) => e.source !== targetId && e.target !== targetId)
                  );
                  addToHistory(nodes, edges, 'delete_node');
                })
                .catch((err) => onError?.(err));
            }
          } else if (targetType === 'edge' && targetId) {
            const edge = edges.find((e) => e.id === targetId);
            if (edge && !edge.data?.isLocked) {
              deleteEdgeMutation({ variables: { id: targetId } })
                .then(() => {
                  setEdges((eds) => eds.filter((e) => e.id !== targetId));
                  addToHistory(nodes, edges, 'delete_edge');
                })
                .catch((err) => onError?.(err));
            }
          }
          break;

        case ContextMenuAction.DUPLICATE:
          if (targetType === 'node' && targetId) {
            const node = nodes.find((n) => n.id === targetId);
            if (node) {
              const newPos = {
                x: node.position.x + 50,
                y: node.position.y + 50,
              };
              const props = {
                ...node.data,
                label: `${node.data.label} (copy)`,
                x: newPos.x,
                y: newPos.y,
              };

              createNode({
                variables: {
                  input: {
                    graphId: primaryWritableGraphId,
                    props: JSON.stringify(props),
                  },
                },
              }).catch((err) => onError?.(err));
            }
          }
          break;

        case ContextMenuAction.COPY:
          if (targetType === 'node' && targetId) {
            const node = nodes.find((n) => n.id === targetId);
            if (node) {
              setClipboard({
                nodes: [node],
                edges: [],
              });
            }
          }
          break;

        case ContextMenuAction.PASTE:
          if (clipboard && reactFlowWrapper.current) {
            const position = screenToFlowPosition({
              x: contextMenu.x,
              y: contextMenu.y,
            });

            clipboard.nodes.forEach((node) => {
              const props = {
                ...node.data,
                x: position.x,
                y: position.y,
              };

              createNode({
                variables: {
                  input: {
                    graphId: primaryWritableGraphId,
                    props: JSON.stringify(props),
                  },
                },
              }).catch((err) => onError?.(err));
            });
          }
          break;

        default:
          console.log('Unhandled action:', actionId);
      }

      setContextMenu({
        visible: false,
        x: 0,
        y: 0,
        targetType: null,
        targetId: null,
      });
    },
    [
      contextMenu,
      nodes,
      edges,
      clipboard,
      primaryWritableGraphId,
      readOnly,
      createNode,
      deleteNodeMutation,
      deleteEdgeMutation,
      onError,
      addToHistory,
      screenToFlowPosition,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Undo/Redo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Copy
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault();
          setClipboard({ nodes: selectedNodes, edges: selectedEdges });
        }
      }

      // New Node (Cmd+N)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        if (!readOnly) {
          event.preventDefault();
          handleContextMenuAction(ContextMenuAction.CREATE_NODE);
        }
      }

      // Delete
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!readOnly) {
          event.preventDefault();
          const selectedNodes = nodes.filter((n) => n.selected && !n.data.isLocked);
          const selectedEdges = edges.filter((e) => e.selected && !e.data?.isLocked);

          selectedNodes.forEach((node) => {
            deleteNodeMutation({ variables: { id: node.id } }).catch((err) =>
              onError?.(err)
            );
          });

          selectedEdges.forEach((edge) => {
            deleteEdgeMutation({ variables: { id: edge.id } }).catch((err) =>
              onError?.(err)
            );
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    nodes,
    edges,
    readOnly,
    undo,
    redo,
    deleteNodeMutation,
    deleteEdgeMutation,
    onError,
    handleContextMenuAction,
  ]);

  // Layout change handler with animation
  const handleLayoutChange = useCallback(
    (config: LayoutConfig) => {
      if (readOnly || nodes.length === 0) return;

      try {
        // Apply layout algorithm
        const layoutResult = LayoutEngine.applyLayout(nodes, edges, config);
        const targetNodes = layoutResult.nodes;

        setCurrentLayout(config.type);

        // Animate transition if enabled
        if (config.animated && config.animationDuration) {
          setIsAnimating(true);
          const startTime = performance.now();
          const duration = config.animationDuration;
          const startNodes = [...nodes];

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-in-out function
            const eased =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const interpolated = interpolateNodePositions(
              startNodes,
              targetNodes,
              eased
            );

            setNodes(interpolated);

            if (progress < 1) {
              animationFrameRef.current = requestAnimationFrame(animate);
            } else {
              setNodes(targetNodes);
              setIsAnimating(false);
              addToHistory(targetNodes, edges, `layout_${config.type}`);

              // Fit view after layout
              setTimeout(() => {
                fitView({ padding: 0.1, duration: 500 });
              }, 100);
            }
          };

          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Apply immediately without animation
          setNodes(targetNodes);
          addToHistory(targetNodes, edges, `layout_${config.type}`);

          setTimeout(() => {
            fitView({ padding: 0.1, duration: 500 });
          }, 100);
        }
      } catch (error) {
        console.error('Layout error:', error);
        if (onError) {
          onError(
            error instanceof Error ? error : new Error('Layout failed')
          );
        }
      }
    },
    [nodes, edges, readOnly, fitView, addToHistory, onError]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Save callback - debounced to avoid excessive calls
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (onSave) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save calls by 500ms
      saveTimeoutRef.current = setTimeout(() => {
        onSave(nodes, edges);
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, onSave]);

  if (graphLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: theme.colors.bg.primary,
          color: theme.colors.text.primary,
        }}
      >
        Loading graph...
      </div>
    );
  }

  if (graphError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: theme.colors.bg.primary,
          color: '#ef4444', // red-500
        }}
      >
        Error loading graph: {graphError.message}
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onPaneMouseMove={onPaneMouseMove}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'custom',
          animated: false,
        }}
        style={{
          backgroundColor: theme.colors.canvas.bg,
        }}
      >
        {showControls && <Controls style={{ backgroundColor: theme.colors.bg.elevated }} />}

        {showMinimap && (
          <MiniMap
            style={{
              backgroundColor: theme.colors.bg.secondary,
              borderColor: theme.colors.border.primary,
            }}
            nodeColor={(node) => {
              const data = node.data as NodeData;
              if (data.level === GraphLevel.LEVEL_0 || data.weight >= 1.0) {
                return '#10b981'; // green-500
              }
              if (data.weight >= 0.7) return '#84cc16'; // lime-500
              if (data.weight >= 0.4) return '#eab308'; // yellow-500
              if (data.weight >= 0.1) return '#f97316'; // orange-500
              return '#ef4444'; // red-500
            }}
          />
        )}

        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color={theme.colors.canvas.dots}
          />
        )}
      </ReactFlow>

      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        items={contextMenuItems}
        onItemClick={handleContextMenuAction}
        onClose={() =>
          setContextMenu({
            visible: false,
            x: 0,
            y: 0,
            targetType: null,
            targetId: null,
          })
        }
      />

      {/* Remote Cursors */}
      {activeUsers.map((user) => (
        <RemoteCursor key={user.userId} user={user} />
      ))}

      {/* Layout Controls */}
      {!readOnly && (
        <LayoutControls
          nodes={nodes}
          edges={edges}
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
        />
      )}
    </div>
  );
}

/**
 * GraphCanvas component with ReactFlowProvider wrapper
 */
export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
