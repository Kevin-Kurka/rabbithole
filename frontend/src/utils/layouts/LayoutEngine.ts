/**
 * Layout Engine
 *
 * Central orchestrator for all graph layout algorithms.
 * Provides unified interface for applying layouts with animation support.
 */

import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import {
  applyForceLayout,
  applyClusteredForceLayout,
  getRecommendedForceOptions,
  ForceLayoutOptions,
} from './ForceLayout';
import {
  applyHierarchicalLayout,
  applyLayeredLayout,
  applyTreeLayout,
  detectOptimalDirection,
  getRecommendedHierarchicalOptions,
  HierarchicalLayoutOptions,
} from './HierarchicalLayout';
import {
  applyTimelineLayout,
  applySwimLaneLayout,
  getRecommendedTimelineOptions,
  TimelineLayoutOptions,
} from './TimelineLayout';
import {
  applyCircularLayout,
  applyRadialLayout,
  applySpiralLayout,
  getRecommendedCircularOptions,
  CircularLayoutOptions,
} from './CircularLayout';

/**
 * Available layout algorithms
 */
export enum LayoutType {
  MANUAL = 'manual',
  FORCE = 'force',
  FORCE_CLUSTERED = 'force_clustered',
  HIERARCHICAL = 'hierarchical',
  HIERARCHICAL_TB = 'hierarchical_tb',
  HIERARCHICAL_LR = 'hierarchical_lr',
  LAYERED = 'layered',
  TREE = 'tree',
  TIMELINE = 'timeline',
  SWIMLANE = 'swimlane',
  CIRCULAR = 'circular',
  RADIAL = 'radial',
  SPIRAL = 'spiral',
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  type: LayoutType;
  animated?: boolean;
  animationDuration?: number;
  preserveLocked?: boolean; // Always preserve locked nodes (default: true)
  options?:
    | ForceLayoutOptions
    | HierarchicalLayoutOptions
    | TimelineLayoutOptions
    | CircularLayoutOptions;
  // Additional parameters for specific layouts
  clusterKey?: keyof GraphCanvasNode['data'];
  layerKey?: keyof GraphCanvasNode['data'];
  laneKey?: keyof GraphCanvasNode['data'];
  timeKey?: string;
  rootNodeId?: string;
}

/**
 * Layout metadata for UI display
 */
export interface LayoutMetadata {
  type: LayoutType;
  name: string;
  description: string;
  icon: string;
  category: 'automatic' | 'hierarchical' | 'temporal' | 'circular';
  recommended: boolean;
  requiresConfig?: boolean;
}

/**
 * Layout result with metadata
 */
export interface LayoutResult {
  nodes: GraphCanvasNode[];
  metadata: {
    algorithm: LayoutType;
    nodeCount: number;
    edgeCount: number;
    duration: number;
    boundingBox: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
}

/**
 * Main Layout Engine class
 */
export class LayoutEngine {
  /**
   * Apply layout algorithm to graph
   */
  static applyLayout(
    nodes: GraphCanvasNode[],
    edges: GraphCanvasEdge[],
    config: LayoutConfig
  ): LayoutResult {
    const startTime = performance.now();

    let layoutedNodes: GraphCanvasNode[];

    switch (config.type) {
      case LayoutType.MANUAL:
        layoutedNodes = nodes; // No layout change
        break;

      case LayoutType.FORCE:
        layoutedNodes = applyForceLayout(
          nodes,
          edges,
          config.options as ForceLayoutOptions
        );
        break;

      case LayoutType.FORCE_CLUSTERED:
        if (!config.clusterKey) {
          throw new Error('clusterKey required for clustered force layout');
        }
        layoutedNodes = applyClusteredForceLayout(
          nodes,
          edges,
          config.clusterKey,
          config.options as ForceLayoutOptions
        );
        break;

      case LayoutType.HIERARCHICAL:
        layoutedNodes = applyHierarchicalLayout(
          nodes,
          edges,
          config.options as HierarchicalLayoutOptions
        );
        break;

      case LayoutType.HIERARCHICAL_TB:
        layoutedNodes = applyHierarchicalLayout(nodes, edges, {
          ...(config.options as HierarchicalLayoutOptions),
          direction: 'TB',
        });
        break;

      case LayoutType.HIERARCHICAL_LR:
        layoutedNodes = applyHierarchicalLayout(nodes, edges, {
          ...(config.options as HierarchicalLayoutOptions),
          direction: 'LR',
        });
        break;

      case LayoutType.LAYERED:
        if (!config.layerKey) {
          throw new Error('layerKey required for layered layout');
        }
        layoutedNodes = applyLayeredLayout(
          nodes,
          edges,
          config.layerKey,
          config.options as HierarchicalLayoutOptions
        );
        break;

      case LayoutType.TREE:
        if (!config.rootNodeId) {
          // Auto-detect root (node with no incoming edges)
          const targets = new Set(edges.map((e) => e.target));
          const root = nodes.find((n) => !targets.has(n.id));
          config.rootNodeId = root?.id || nodes[0]?.id;
        }
        if (!config.rootNodeId) {
          throw new Error('rootNodeId required for tree layout');
        }
        layoutedNodes = applyTreeLayout(
          nodes,
          edges,
          config.rootNodeId,
          config.options as HierarchicalLayoutOptions
        );
        break;

      case LayoutType.TIMELINE:
        layoutedNodes = applyTimelineLayout(
          nodes,
          edges,
          config.options as TimelineLayoutOptions
        );
        break;

      case LayoutType.SWIMLANE:
        if (!config.laneKey) {
          throw new Error('laneKey required for swimlane layout');
        }
        layoutedNodes = applySwimLaneLayout(
          nodes,
          edges,
          config.laneKey,
          config.options as TimelineLayoutOptions
        );
        break;

      case LayoutType.CIRCULAR:
        layoutedNodes = applyCircularLayout(
          nodes,
          edges,
          config.options as CircularLayoutOptions
        );
        break;

      case LayoutType.RADIAL:
        if (!config.rootNodeId) {
          config.rootNodeId = nodes[0]?.id;
        }
        if (!config.rootNodeId) {
          throw new Error('rootNodeId required for radial layout');
        }
        layoutedNodes = applyRadialLayout(
          nodes,
          edges,
          config.rootNodeId,
          config.options as CircularLayoutOptions
        );
        break;

      case LayoutType.SPIRAL:
        layoutedNodes = applySpiralLayout(
          nodes,
          edges,
          config.options as CircularLayoutOptions
        );
        break;

      default:
        throw new Error(`Unknown layout type: ${config.type}`);
    }

    const duration = performance.now() - startTime;
    const boundingBox = calculateBoundingBox(layoutedNodes);

    return {
      nodes: layoutedNodes,
      metadata: {
        algorithm: config.type,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        duration,
        boundingBox,
      },
    };
  }

  /**
   * Get recommended layout for graph
   */
  static recommendLayout(
    nodes: GraphCanvasNode[],
    edges: GraphCanvasEdge[]
  ): LayoutType {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const density = nodeCount > 0 ? edgeCount / nodeCount : 0;

    // Check if graph is a DAG (useful for hierarchical layouts)
    const isDAG = this.isDirectedAcyclic(nodes, edges);

    // Check if nodes have timestamps
    const hasTimestamps = nodes.some(
      (n) => n.data.createdAt || n.data.timestamp
    );

    // Decision tree for layout recommendation
    if (hasTimestamps) {
      return LayoutType.TIMELINE;
    }

    if (isDAG && nodeCount < 100) {
      return LayoutType.HIERARCHICAL;
    }

    if (density > 2 && nodeCount < 200) {
      return LayoutType.CIRCULAR;
    }

    if (nodeCount < 500) {
      return LayoutType.FORCE;
    }

    // For large graphs, use simpler layouts
    return LayoutType.CIRCULAR;
  }

  /**
   * Check if graph is a directed acyclic graph
   */
  static isDirectedAcyclic(
    nodes: GraphCanvasNode[],
    edges: GraphCanvasEdge[]
  ): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    nodes.forEach((node) => {
      adjacency.set(node.id, []);
    });
    edges.forEach((edge) => {
      adjacency.get(edge.source)?.push(edge.target);
    });

    // DFS to detect cycles
    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true; // Back edge found, cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check all nodes for cycles
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return false;
      }
    }

    return true; // No cycles found
  }

  /**
   * Get auto-tuned layout options for graph
   */
  static getAutoOptions(
    layoutType: LayoutType,
    nodes: GraphCanvasNode[],
    edges: GraphCanvasEdge[]
  ): LayoutConfig['options'] {
    switch (layoutType) {
      case LayoutType.FORCE:
      case LayoutType.FORCE_CLUSTERED:
        return getRecommendedForceOptions(nodes.length);

      case LayoutType.HIERARCHICAL:
      case LayoutType.HIERARCHICAL_TB:
      case LayoutType.HIERARCHICAL_LR:
      case LayoutType.LAYERED:
      case LayoutType.TREE:
        return getRecommendedHierarchicalOptions(nodes.length, edges.length);

      case LayoutType.TIMELINE:
      case LayoutType.SWIMLANE:
        return getRecommendedTimelineOptions(nodes, 'createdAt');

      case LayoutType.CIRCULAR:
      case LayoutType.RADIAL:
      case LayoutType.SPIRAL:
        return getRecommendedCircularOptions(nodes.length);

      default:
        return {};
    }
  }

  /**
   * Get available layout algorithms with metadata
   */
  static getAvailableLayouts(
    nodes: GraphCanvasNode[],
    edges: GraphCanvasEdge[]
  ): LayoutMetadata[] {
    const recommended = this.recommendLayout(nodes, edges);

    return [
      {
        type: LayoutType.MANUAL,
        name: 'Manual',
        description: 'Keep current node positions',
        icon: 'hand',
        category: 'automatic',
        recommended: false,
      },
      {
        type: LayoutType.FORCE,
        name: 'Force-Directed',
        description: 'Physics-based organic layout',
        icon: 'zap',
        category: 'automatic',
        recommended: recommended === LayoutType.FORCE,
      },
      {
        type: LayoutType.FORCE_CLUSTERED,
        name: 'Clustered Force',
        description: 'Force layout with grouped nodes',
        icon: 'layers',
        category: 'automatic',
        recommended: false,
        requiresConfig: true,
      },
      {
        type: LayoutType.HIERARCHICAL,
        name: 'Hierarchical',
        description: 'Top-down tree structure',
        icon: 'git-branch',
        category: 'hierarchical',
        recommended: recommended === LayoutType.HIERARCHICAL,
      },
      {
        type: LayoutType.HIERARCHICAL_LR,
        name: 'Hierarchical (Left-Right)',
        description: 'Left-to-right tree structure',
        icon: 'arrow-right',
        category: 'hierarchical',
        recommended: false,
      },
      {
        type: LayoutType.TREE,
        name: 'Tree',
        description: 'Tree layout from root node',
        icon: 'tree-deciduous',
        category: 'hierarchical',
        recommended: false,
        requiresConfig: true,
      },
      {
        type: LayoutType.TIMELINE,
        name: 'Timeline',
        description: 'Chronological arrangement',
        icon: 'clock',
        category: 'temporal',
        recommended: recommended === LayoutType.TIMELINE,
      },
      {
        type: LayoutType.SWIMLANE,
        name: 'Swimlane',
        description: 'Timeline with category lanes',
        icon: 'rows',
        category: 'temporal',
        recommended: false,
        requiresConfig: true,
      },
      {
        type: LayoutType.CIRCULAR,
        name: 'Circular',
        description: 'Nodes arranged in a circle',
        icon: 'circle',
        category: 'circular',
        recommended: recommended === LayoutType.CIRCULAR,
      },
      {
        type: LayoutType.RADIAL,
        name: 'Radial',
        description: 'Circular tree from center',
        icon: 'target',
        category: 'circular',
        recommended: false,
        requiresConfig: true,
      },
      {
        type: LayoutType.SPIRAL,
        name: 'Spiral',
        description: 'Outward spiral pattern',
        icon: 'rotate-cw',
        category: 'circular',
        recommended: false,
      },
    ];
  }
}

/**
 * Calculate bounding box of nodes
 */
function calculateBoundingBox(nodes: GraphCanvasNode[]): LayoutResult['metadata']['boundingBox'] {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Interpolate between two node position sets for animation
 */
export function interpolateNodePositions(
  startNodes: GraphCanvasNode[],
  endNodes: GraphCanvasNode[],
  progress: number // 0 to 1
): GraphCanvasNode[] {
  const endPositions = new Map(endNodes.map((n) => [n.id, n.position]));

  return startNodes.map((node) => {
    const endPos = endPositions.get(node.id);
    if (!endPos) return node;

    return {
      ...node,
      position: {
        x: node.position.x + (endPos.x - node.position.x) * progress,
        y: node.position.y + (endPos.y - node.position.y) * progress,
      },
    };
  });
}
