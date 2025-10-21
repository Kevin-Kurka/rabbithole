/**
 * Circular Layout Algorithm
 *
 * Arranges nodes in a circle or concentric circles.
 * Useful for showing connectivity patterns and network topology.
 *
 * Best for:
 * - Network topology visualization
 * - Equal-weight relationships
 * - Highlighting central/peripheral nodes
 */

import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

export interface CircularLayoutOptions {
  /** Center X coordinate */
  centerX?: number;
  /** Center Y coordinate */
  centerY?: number;
  /** Radius of the circle */
  radius?: number;
  /** Start angle in radians (0 = right, Math.PI/2 = top) */
  startAngle?: number;
  /** Sweep direction: 'clockwise' or 'counterclockwise' */
  direction?: 'clockwise' | 'counterclockwise';
  /** Sort nodes before arranging: 'none', 'degree', 'weight', 'label' */
  sort?: 'none' | 'degree' | 'weight' | 'label';
  /** Use concentric circles for different groups */
  concentric?: boolean;
  /** Group key for concentric layout */
  groupKey?: keyof GraphCanvasNode['data'];
  /** Spacing between concentric circles */
  concentricSpacing?: number;
}

const DEFAULT_OPTIONS: Required<CircularLayoutOptions> = {
  centerX: 500,
  centerY: 500,
  radius: 300,
  startAngle: -Math.PI / 2, // Start at top
  direction: 'clockwise',
  sort: 'none',
  concentric: false,
  groupKey: 'level',
  concentricSpacing: 200,
};

/**
 * Apply circular layout to nodes
 *
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges (used for degree calculation)
 * @param options - Layout configuration options
 * @returns Nodes with updated positions
 */
export function applyCircularLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: CircularLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Filter out locked nodes
  const unlocked = nodes.filter((n) => !n.data.isLocked);
  const locked = nodes.filter((n) => n.data.isLocked);

  if (unlocked.length === 0) return nodes;

  // Sort nodes if requested
  const sorted = sortNodes(unlocked, edges, opts.sort);

  // Apply layout
  const laid = opts.concentric
    ? applyConcentricCircularLayout(sorted, edges, opts)
    : applySingleCircularLayout(sorted, opts);

  // Combine with locked nodes
  return [...laid, ...locked];
}

/**
 * Apply single circle layout
 */
function applySingleCircularLayout(
  nodes: GraphCanvasNode[],
  opts: Required<CircularLayoutOptions>
): GraphCanvasNode[] {
  const angleStep = (2 * Math.PI) / nodes.length;
  const direction = opts.direction === 'clockwise' ? 1 : -1;

  return nodes.map((node, index) => {
    const angle = opts.startAngle + direction * angleStep * index;
    const x = opts.centerX + opts.radius * Math.cos(angle);
    const y = opts.centerY + opts.radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
    };
  });
}

/**
 * Apply concentric circles layout
 */
function applyConcentricCircularLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  opts: Required<CircularLayoutOptions>
): GraphCanvasNode[] {
  // Group nodes by the groupKey
  const groups = new Map<unknown, GraphCanvasNode[]>();
  nodes.forEach((node) => {
    const groupValue = node.data[opts.groupKey];
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)!.push(node);
  });

  // Sort groups (e.g., by level)
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const aNum = Number(a[0]);
    const bNum = Number(b[0]);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return String(a[0]).localeCompare(String(b[0]));
  });

  // Layout each group on concentric circles
  const result: GraphCanvasNode[] = [];

  sortedGroups.forEach(([_, groupNodes], groupIndex) => {
    const radius = opts.radius + groupIndex * opts.concentricSpacing;
    const angleStep = (2 * Math.PI) / groupNodes.length;
    const direction = opts.direction === 'clockwise' ? 1 : -1;

    groupNodes.forEach((node, nodeIndex) => {
      const angle = opts.startAngle + direction * angleStep * nodeIndex;
      const x = opts.centerX + radius * Math.cos(angle);
      const y = opts.centerY + radius * Math.sin(angle);

      result.push({
        ...node,
        position: { x, y },
      });
    });
  });

  return result;
}

/**
 * Sort nodes based on criteria
 */
function sortNodes(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  sortBy: CircularLayoutOptions['sort']
): GraphCanvasNode[] {
  const sorted = [...nodes];

  switch (sortBy) {
    case 'degree': {
      // Calculate node degrees (number of connections)
      const degrees = new Map<string, number>();
      nodes.forEach((node) => {
        degrees.set(node.id, 0);
      });

      edges.forEach((edge) => {
        degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
        degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
      });

      sorted.sort((a, b) => (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0));
      break;
    }

    case 'weight':
      sorted.sort((a, b) => b.data.weight - a.data.weight);
      break;

    case 'label':
      sorted.sort((a, b) => a.data.label.localeCompare(b.data.label));
      break;

    case 'none':
    default:
      // Keep original order
      break;
  }

  return sorted;
}

/**
 * Apply radial layout (tree-like circular layout)
 *
 * Places root node at center and arranges children in concentric circles
 */
export function applyRadialLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  rootNodeId: string,
  options: CircularLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => {
    adjacency.set(node.id, new Set());
  });
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    // For undirected behavior, also add reverse edge
    adjacency.get(edge.target)?.add(edge.source);
  });

  // BFS to determine node levels
  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [{ id: rootNodeId, level: 0 }];

  visited.add(rootNodeId);
  levels.set(rootNodeId, 0);

  let maxLevel = 0;

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    maxLevel = Math.max(maxLevel, level);

    adjacency.get(id)?.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        levels.set(neighborId, level + 1);
        queue.push({ id: neighborId, level: level + 1 });
      }
    });
  }

  // Group nodes by level
  const levelGroups = new Map<number, GraphCanvasNode[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) ?? maxLevel + 1;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  // Layout each level
  const result: GraphCanvasNode[] = [];

  levelGroups.forEach((levelNodes, level) => {
    if (level === 0) {
      // Place root at center
      levelNodes.forEach((node) => {
        if (node.data.isLocked) {
          result.push(node);
        } else {
          result.push({
            ...node,
            position: { x: opts.centerX, y: opts.centerY },
          });
        }
      });
    } else {
      // Place on concentric circle
      const radius = opts.radius + (level - 1) * opts.concentricSpacing;
      const angleStep = (2 * Math.PI) / levelNodes.length;
      const direction = opts.direction === 'clockwise' ? 1 : -1;

      levelNodes.forEach((node, index) => {
        if (node.data.isLocked) {
          result.push(node);
          return;
        }

        const angle = opts.startAngle + direction * angleStep * index;
        const x = opts.centerX + radius * Math.cos(angle);
        const y = opts.centerY + radius * Math.sin(angle);

        result.push({
          ...node,
          position: { x, y },
        });
      });
    }
  });

  return result;
}

/**
 * Apply spiral layout
 *
 * Arranges nodes in an outward spiral pattern
 */
export function applySpiralLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: CircularLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Filter and sort nodes
  const unlocked = nodes.filter((n) => !n.data.isLocked);
  const locked = nodes.filter((n) => n.data.isLocked);
  const sorted = sortNodes(unlocked, edges, opts.sort);

  // Spiral parameters
  const spiralSpacing = 15; // Distance between spiral arms
  const angleIncrement = Math.PI / 4; // Angle increment per node

  const result: GraphCanvasNode[] = sorted.map((node, index) => {
    const angle = opts.startAngle + angleIncrement * index;
    const radius = spiralSpacing * angle / (2 * Math.PI);

    const x = opts.centerX + radius * Math.cos(angle);
    const y = opts.centerY + radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
    };
  });

  return [...result, ...locked];
}

/**
 * Get recommended circular options based on graph size
 */
export function getRecommendedCircularOptions(
  nodeCount: number
): CircularLayoutOptions {
  // Adjust radius based on node count
  const baseRadius = Math.max(300, Math.sqrt(nodeCount) * 50);

  return {
    radius: baseRadius,
    concentricSpacing: baseRadius * 0.4,
    sort: nodeCount > 50 ? 'degree' : 'none', // Sort large graphs by connectivity
  };
}
