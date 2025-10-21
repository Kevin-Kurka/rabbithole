/**
 * Hierarchical Layout Algorithm
 *
 * Uses Dagre for hierarchical directed graph layout.
 * Arranges nodes in layers based on graph structure.
 *
 * Best for:
 * - Directed acyclic graphs (DAGs)
 * - Process flows and dependencies
 * - Clear hierarchy visualization
 */

import dagre from 'dagre';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

export interface HierarchicalLayoutOptions {
  /** Layout direction: 'TB' (top-bottom), 'BT', 'LR' (left-right), 'RL' */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Horizontal spacing between nodes */
  nodeSpacing?: number;
  /** Vertical spacing between ranks/layers */
  rankSpacing?: number;
  /** Edge separation */
  edgeSpacing?: number;
  /** Node width for layout calculation */
  nodeWidth?: number;
  /** Node height for layout calculation */
  nodeHeight?: number;
  /** Alignment of nodes in rank: 'UL', 'UR', 'DL', 'DR' */
  align?: 'UL' | 'UR' | 'DL' | 'DR';
  /** Ranker algorithm: 'network-simplex', 'tight-tree', 'longest-path' */
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
}

const DEFAULT_OPTIONS: Required<HierarchicalLayoutOptions> = {
  direction: 'TB',
  nodeSpacing: 80,
  rankSpacing: 100,
  edgeSpacing: 10,
  nodeWidth: 200,
  nodeHeight: 80,
  align: 'UL',
  ranker: 'network-simplex',
};

/**
 * Apply hierarchical layout using Dagre
 *
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges defining connections
 * @param options - Layout configuration options
 * @returns Nodes with updated positions
 */
export function applyHierarchicalLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: HierarchicalLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Create a new directed graph
  const g = new dagre.graphlib.Graph();

  // Set graph options
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
    edgesep: opts.edgeSpacing,
    align: opts.align,
    ranker: opts.ranker,
  });

  // Default edge label
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      // Preserve locked node positions by not adding them to layout
      fixed: node.data.isLocked,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Perform the layout
  dagre.layout(g);

  // Update node positions
  return nodes.map((node) => {
    if (node.data.isLocked) return node;

    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        // Dagre uses center position, ReactFlow uses top-left
        x: dagreNode.x - opts.nodeWidth / 2,
        y: dagreNode.y - opts.nodeHeight / 2,
      },
    };
  });
}

/**
 * Automatically detect best hierarchical direction based on graph structure
 *
 * Analyzes edge directions and node distribution to suggest optimal layout
 */
export function detectOptimalDirection(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
): HierarchicalLayoutOptions['direction'] {
  if (nodes.length === 0) return 'TB';

  // Count edge directions
  const currentPositions = new Map(nodes.map((n) => [n.id, n.position]));

  let horizontalFlow = 0;
  let verticalFlow = 0;

  edges.forEach((edge) => {
    const sourcePos = currentPositions.get(edge.source);
    const targetPos = currentPositions.get(edge.target);

    if (!sourcePos || !targetPos) return;

    const dx = Math.abs(targetPos.x - sourcePos.x);
    const dy = Math.abs(targetPos.y - sourcePos.y);

    if (dx > dy) {
      horizontalFlow += targetPos.x > sourcePos.x ? 1 : -1;
    } else {
      verticalFlow += targetPos.y > sourcePos.y ? 1 : -1;
    }
  });

  // Determine best direction based on flow analysis
  if (Math.abs(horizontalFlow) > Math.abs(verticalFlow)) {
    return horizontalFlow > 0 ? 'LR' : 'RL';
  } else {
    return verticalFlow > 0 ? 'TB' : 'BT';
  }
}

/**
 * Apply layered layout with manual layer assignment
 *
 * Useful when you want explicit control over which nodes appear in which layer
 */
export function applyLayeredLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  layerKey: keyof GraphCanvasNode['data'],
  options: HierarchicalLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Group nodes by layer
  const layers = new Map<unknown, GraphCanvasNode[]>();
  nodes.forEach((node) => {
    const layerValue = node.data[layerKey];
    if (!layers.has(layerValue)) {
      layers.set(layerValue, []);
    }
    layers.get(layerValue)!.push(node);
  });

  // Sort layers
  const sortedLayers = Array.from(layers.entries()).sort((a, b) => {
    // Try to sort numerically if possible
    const aNum = Number(a[0]);
    const bNum = Number(b[0]);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return String(a[0]).localeCompare(String(b[0]));
  });

  // Layout parameters based on direction
  const isHorizontal = opts.direction === 'LR' || opts.direction === 'RL';
  const reverse = opts.direction === 'BT' || opts.direction === 'RL';

  const updatedNodes: GraphCanvasNode[] = [];

  sortedLayers.forEach(([_, layerNodes], layerIndex) => {
    const actualLayerIndex = reverse ? sortedLayers.length - 1 - layerIndex : layerIndex;

    // Calculate layer position
    const layerPosition = actualLayerIndex * (opts.rankSpacing + opts.nodeHeight);

    // Layout nodes within layer
    layerNodes.forEach((node, nodeIndex) => {
      if (node.data.isLocked) {
        updatedNodes.push(node);
        return;
      }

      const nodePosition = nodeIndex * (opts.nodeSpacing + opts.nodeWidth);

      updatedNodes.push({
        ...node,
        position: isHorizontal
          ? { x: layerPosition, y: nodePosition }
          : { x: nodePosition, y: layerPosition },
      });
    });
  });

  return updatedNodes;
}

/**
 * Apply tree layout (special case of hierarchical for tree structures)
 *
 * Optimized for graphs with a clear root node and tree-like structure
 */
export function applyTreeLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  rootNodeId: string,
  options: HierarchicalLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Use tight-tree ranker which is optimized for tree structures
  return applyHierarchicalLayout(nodes, edges, {
    ...opts,
    ranker: 'tight-tree',
  });
}

/**
 * Get recommended hierarchical options based on graph characteristics
 */
export function getRecommendedHierarchicalOptions(
  nodeCount: number,
  edgeCount: number
): HierarchicalLayoutOptions {
  const density = nodeCount > 0 ? edgeCount / nodeCount : 0;

  // Dense graphs need more spacing
  if (density > 2) {
    return {
      nodeSpacing: 100,
      rankSpacing: 120,
      edgeSpacing: 15,
    };
  }

  // Sparse graphs can be more compact
  if (density < 1.5) {
    return {
      nodeSpacing: 60,
      rankSpacing: 80,
      edgeSpacing: 8,
    };
  }

  // Default spacing for medium density
  return {
    nodeSpacing: 80,
    rankSpacing: 100,
    edgeSpacing: 10,
  };
}
