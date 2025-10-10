/**
 * Layout Algorithms for Graph Visualization
 *
 * Provides various layout algorithms for arranging nodes in the graph canvas:
 * - Force-directed layout (d3-force)
 * - Hierarchical layout
 * - Circular layout
 * - Timeline layout
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

/**
 * Layout algorithm types
 */
export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'timeline';

/**
 * Layout options configuration
 */
export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  iterations?: number;
  strength?: number;
  spacing?: number;
  animate?: boolean;
}

/**
 * Node with simulation properties
 */
interface SimNode extends SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Edge with simulation properties
 */
interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

/**
 * Apply layout algorithm to nodes and edges
 */
export function applyLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: LayoutOptions
): { nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } {
  switch (options.algorithm) {
    case 'force':
      return applyForceLayout(nodes, edges, options);
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges, options);
    case 'circular':
      return applyCircularLayout(nodes, edges, options);
    case 'timeline':
      return applyTimelineLayout(nodes, edges, options);
    default:
      return { nodes, edges };
  }
}

/**
 * Force-directed layout using d3-force
 */
export function applyForceLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: LayoutOptions
): { nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } {
  const iterations = options.iterations || 300;
  const strength = options.strength || -400;
  const spacing = options.spacing || 100;

  // Convert to d3 simulation format
  const simNodes: SimNode[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
  }));

  const simLinks: SimLink[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  // Create force simulation
  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(spacing)
        .strength(0.5)
    )
    .force('charge', forceManyBody().strength(strength))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(50).strength(0.7))
    .stop();

  // Run simulation
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  // Update node positions
  const updatedNodes = nodes.map((node) => {
    const simNode = simNodes.find((n) => n.id === node.id);
    if (simNode && simNode.x !== undefined && simNode.y !== undefined) {
      return {
        ...node,
        position: {
          x: simNode.x,
          y: simNode.y,
        },
      };
    }
    return node;
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Hierarchical layout (tree-like structure)
 */
export function applyHierarchicalLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: LayoutOptions
): { nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } {
  const spacing = options.spacing || 150;
  const levelHeight = 200;

  // Find root nodes (nodes with no incoming edges)
  const incomingEdges = new Map<string, number>();
  nodes.forEach((node) => incomingEdges.set(node.id, 0));
  edges.forEach((edge) => {
    incomingEdges.set(edge.target, (incomingEdges.get(edge.target) || 0) + 1);
  });

  const rootNodes = nodes.filter((node) => incomingEdges.get(node.id) === 0);

  // If no roots found, use nodes with highest veracity
  const roots =
    rootNodes.length > 0
      ? rootNodes
      : [nodes.reduce((max, node) => (node.data.weight > max.data.weight ? node : max))];

  // Build hierarchy levels using BFS
  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = roots.map((node) => ({
    id: node.id,
    level: 0,
  }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;

    visited.add(current.id);
    levels.set(current.id, current.level);

    // Find children
    edges
      .filter((edge) => edge.source === current.id)
      .forEach((edge) => {
        if (!visited.has(edge.target)) {
          queue.push({ id: edge.target, level: current.level + 1 });
        }
      });
  }

  // Assign remaining nodes to level 0
  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, GraphCanvasNode[]>();
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  // Position nodes
  const updatedNodes = nodes.map((node) => {
    const level = levels.get(node.id) || 0;
    const nodesInLevel = nodesByLevel.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node);

    const totalWidth = nodesInLevel.length * spacing;
    const x = -totalWidth / 2 + indexInLevel * spacing;
    const y = level * levelHeight;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Circular layout (nodes arranged in a circle)
 */
export function applyCircularLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  _options: LayoutOptions
): { nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } {
  const radius = Math.max(300, nodes.length * 20);
  const angleStep = (2 * Math.PI) / nodes.length;

  const updatedNodes = nodes.map((node, index) => {
    const angle = index * angleStep;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Timeline layout (horizontal arrangement by date)
 */
export function applyTimelineLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: LayoutOptions
): { nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } {
  const spacing = options.spacing || 200;
  const laneHeight = 150;

  // Sort nodes by creation date (if available in metadata)
  const sortedNodes = [...nodes].sort((a, b) => {
    const dateA = a.data.metadata?.createdAt
      ? new Date(a.data.metadata.createdAt as string).getTime()
      : 0;
    const dateB = b.data.metadata?.createdAt
      ? new Date(b.data.metadata.createdAt as string).getTime()
      : 0;
    return dateA - dateB;
  });

  // Track lanes to avoid overlaps
  const lanes: Array<{ nodeId: string; endX: number }[]> = [[]];

  const updatedNodes = sortedNodes.map((node, index) => {
    const x = index * spacing;

    // Find available lane
    let laneIndex = 0;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const canFit = lane.length === 0 || lane[lane.length - 1].endX < x - 100;
      if (canFit) {
        laneIndex = i;
        break;
      }
    }

    // Create new lane if needed
    if (laneIndex === lanes.length - 1 && lanes[laneIndex].length > 0) {
      const lastNode = lanes[laneIndex][lanes[laneIndex].length - 1];
      if (lastNode.endX >= x - 100) {
        lanes.push([]);
        laneIndex = lanes.length - 1;
      }
    }

    const y = laneIndex * laneHeight;

    lanes[laneIndex].push({ nodeId: node.id, endX: x + 150 });

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Get layout bounds (min/max x and y coordinates)
 */
export function getLayoutBounds(nodes: GraphCanvasNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Center layout at origin (0, 0)
 */
export function centerLayout(nodes: GraphCanvasNode[]): GraphCanvasNode[] {
  const bounds = getLayoutBounds(nodes);
  const offsetX = -(bounds.minX + bounds.width / 2);
  const offsetY = -(bounds.minY + bounds.height / 2);

  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}
