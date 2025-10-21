/**
 * Force-Directed Layout Algorithm
 *
 * Uses d3-force for physics-based graph layout.
 * Simulates attractive forces along edges and repulsive forces between nodes.
 *
 * Best for:
 * - Organic, network-like visualizations
 * - Highlighting natural clustering
 * - Medium-sized graphs (< 500 nodes)
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

export interface ForceLayoutOptions {
  /** Strength of node repulsion (-100 = strong repulsion) */
  chargeStrength?: number;
  /** Strength of edge attraction (0-1) */
  linkStrength?: number;
  /** Desired edge length */
  linkDistance?: number;
  /** Center force strength (0-1) */
  centerStrength?: number;
  /** Node collision radius */
  collisionRadius?: number;
  /** Number of simulation iterations */
  iterations?: number;
  /** Width of the layout area */
  width?: number;
  /** Height of the layout area */
  height?: number;
}

interface D3Node extends SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

const DEFAULT_OPTIONS: Required<ForceLayoutOptions> = {
  chargeStrength: -300,
  linkStrength: 0.7,
  linkDistance: 100,
  centerStrength: 0.1,
  collisionRadius: 50,
  iterations: 300,
  width: 1000,
  height: 1000,
};

/**
 * Apply force-directed layout to nodes
 *
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges defining connections
 * @param options - Layout configuration options
 * @returns Nodes with updated positions
 */
export function applyForceLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  options: ForceLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Convert to d3-force compatible format
  const d3Nodes: D3Node[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    fx: node.data.isLocked ? node.position.x : null,
    fy: node.data.isLocked ? node.position.y : null,
  }));

  const d3Links: D3Link[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  // Create simulation
  const simulation = forceSimulation<D3Node>(d3Nodes)
    .force(
      'link',
      forceLink<D3Node, D3Link>(d3Links)
        .id((d) => d.id)
        .distance(opts.linkDistance)
        .strength(opts.linkStrength)
    )
    .force('charge', forceManyBody().strength(opts.chargeStrength))
    .force('center', forceCenter(opts.width / 2, opts.height / 2).strength(opts.centerStrength))
    .force('collision', forceCollide().radius(opts.collisionRadius))
    .stop();

  // Run simulation synchronously
  simulation.tick(opts.iterations);

  // Update node positions
  return nodes.map((node) => {
    const d3Node = d3Nodes.find((n) => n.id === node.id);
    if (!d3Node || node.data.isLocked) return node;

    return {
      ...node,
      position: {
        x: d3Node.x ?? node.position.x,
        y: d3Node.y ?? node.position.y,
      },
    };
  });
}

/**
 * Get recommended force layout options based on graph size
 */
export function getRecommendedForceOptions(nodeCount: number): ForceLayoutOptions {
  // Adjust parameters based on graph size
  if (nodeCount < 50) {
    return {
      chargeStrength: -400,
      linkDistance: 150,
      linkStrength: 0.8,
      collisionRadius: 60,
    };
  } else if (nodeCount < 200) {
    return {
      chargeStrength: -300,
      linkDistance: 100,
      linkStrength: 0.7,
      collisionRadius: 50,
    };
  } else {
    return {
      chargeStrength: -200,
      linkDistance: 80,
      linkStrength: 0.6,
      collisionRadius: 40,
      iterations: 200, // Fewer iterations for large graphs
    };
  }
}

/**
 * Create a clustered force layout with multiple center forces
 *
 * Groups nodes by a property (e.g., methodology, level) and applies
 * separate center forces to each cluster.
 */
export function applyClusteredForceLayout(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[],
  clusterKey: keyof GraphCanvasNode['data'],
  options: ForceLayoutOptions = {}
): GraphCanvasNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) return nodes;

  // Group nodes by cluster key
  const clusters = new Map<unknown, D3Node[]>();
  nodes.forEach((node) => {
    const clusterValue = node.data[clusterKey];
    if (!clusters.has(clusterValue)) {
      clusters.set(clusterValue, []);
    }
    clusters.get(clusterValue)!.push({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      fx: node.data.isLocked ? node.position.x : null,
      fy: node.data.isLocked ? node.position.y : null,
    });
  });

  // Calculate cluster center positions in a circle
  const clusterCount = clusters.size;
  const radius = Math.min(opts.width, opts.height) * 0.3;
  const clusterCenters = new Map<unknown, { x: number; y: number }>();

  Array.from(clusters.keys()).forEach((key, index) => {
    const angle = (2 * Math.PI * index) / clusterCount;
    clusterCenters.set(key, {
      x: opts.width / 2 + radius * Math.cos(angle),
      y: opts.height / 2 + radius * Math.sin(angle),
    });
  });

  const d3Nodes: D3Node[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    fx: node.data.isLocked ? node.position.x : null,
    fy: node.data.isLocked ? node.position.y : null,
  }));

  const d3Links: D3Link[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  // Create simulation with cluster-specific center forces
  const simulation = forceSimulation<D3Node>(d3Nodes)
    .force(
      'link',
      forceLink<D3Node, D3Link>(d3Links)
        .id((d) => d.id)
        .distance(opts.linkDistance)
        .strength(opts.linkStrength)
    )
    .force('charge', forceManyBody().strength(opts.chargeStrength))
    .force('collision', forceCollide().radius(opts.collisionRadius))
    .force('cluster', () => {
      // Custom force to pull nodes toward their cluster center
      d3Nodes.forEach((d3Node) => {
        const node = nodes.find((n) => n.id === d3Node.id);
        if (!node || node.data.isLocked) return;

        const clusterValue = node.data[clusterKey];
        const center = clusterCenters.get(clusterValue);
        if (!center || !d3Node.x || !d3Node.y) return;

        const dx = center.x - d3Node.x;
        const dy = center.y - d3Node.y;
        const strength = 0.1;

        d3Node.vx = (d3Node.vx || 0) + dx * strength;
        d3Node.vy = (d3Node.vy || 0) + dy * strength;
      });
    })
    .stop();

  simulation.tick(opts.iterations);

  return nodes.map((node) => {
    const d3Node = d3Nodes.find((n) => n.id === node.id);
    if (!d3Node || node.data.isLocked) return node;

    return {
      ...node,
      position: {
        x: d3Node.x ?? node.position.x,
        y: d3Node.y ?? node.position.y,
      },
    };
  });
}
