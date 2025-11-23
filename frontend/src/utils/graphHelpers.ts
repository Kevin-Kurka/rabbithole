/**
 * Graph Helper Utilities
 *
 * Helper functions for graph operations, conversions,
 * and data transformations.
 */

import {
  GraphNode,
  GraphEdge,
  GraphCanvasNode,
  GraphCanvasEdge,
  GraphLevel,
  NodeData,
  EdgeData,
  getLevelFromWeight,
  isHighCredibility,
} from '@/types/graph';

/**
 * Convert backend graph node to React Flow node
 */
export function convertToFlowNode(
  node: GraphNode,
  methodologyId?: string
): GraphCanvasNode {
  const props = JSON.parse(node.props || '{}');
  const weight = node.weight || 0.5;
  const level = getLevelFromWeight(weight);

  return {
    id: node.id,
    type: props.type || 'custom',
    position: {
      x: props.x || Math.random() * 500,
      y: props.y || Math.random() * 500,
    },
    data: {
      label: props.label || 'Node',
      weight,
      level,
      isLocked: isHighCredibility(weight),
      methodology: methodologyId,
      metadata: props.metadata,
      ...props,
    },
  };
}

/**
 * Convert backend graph edge to React Flow edge
 */
export function convertToFlowEdge(edge: GraphEdge): GraphCanvasEdge {
  const props = JSON.parse(edge.props || '{}');
  const weight = edge.weight || 0.5;
  const level = getLevelFromWeight(weight);

  return {
    id: edge.id,
    source: edge.from.id,
    target: edge.to.id,
    type: props.type || 'custom',
    data: {
      label: props.label,
      weight,
      level,
      isLocked: isHighCredibility(weight),
      metadata: props.metadata,
      ...props,
    },
  };
}

/**
 * Convert React Flow node to backend format for mutations
 */
export function convertFromFlowNode(node: GraphCanvasNode): string {
  const { label, weight, level, methodology, metadata, ...rest } = node.data;

  return JSON.stringify({
    label,
    x: node.position.x,
    y: node.position.y,
    type: node.type,
    metadata,
    ...rest,
  });
}

/**
 * Convert React Flow edge to backend format for mutations
 */
export function convertFromFlowEdge(edge: GraphCanvasEdge): string {
  const { label, weight, level, metadata, ...rest } = edge.data || {};

  return JSON.stringify({
    label,
    type: edge.type,
    metadata,
    ...rest,
  });
}

/**
 * Get veracity color hex code
 */
export function getVeracityColor(weight: number): string {
  if (weight >= 0.90) {
    return '#10b981'; // green-500 - high credibility
  }

  if (weight >= 0.7) {
    return '#84cc16'; // lime-500 - high confidence
  }

  if (weight >= 0.4) {
    return '#eab308'; // yellow-500 - medium confidence
  }

  if (weight >= 0.1) {
    return '#f97316'; // orange-500 - low confidence
  }

  return '#ef4444'; // red-500 - provisional
}

/**
 * Get veracity label
 */
export function getVeracityLabel(weight: number, level: GraphLevel): string {
  if (level === GraphLevel.LEVEL_0 || weight >= 1.0) {
    return 'Verified';
  }

  if (weight >= 0.7) {
    return 'High Confidence';
  }

  if (weight >= 0.4) {
    return 'Medium Confidence';
  }

  if (weight >= 0.1) {
    return 'Low Confidence';
  }

  return 'Provisional';
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStats(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
) {
  const totalNodes = nodes.length;
  const totalEdges = edges.length;

  const level0Nodes = nodes.filter(
    (n) => n.data.level === GraphLevel.LEVEL_0
  ).length;
  const level1Nodes = nodes.filter(
    (n) => n.data.level === GraphLevel.LEVEL_1
  ).length;

  const level0Edges = edges.filter(
    (e) => e.data?.level === GraphLevel.LEVEL_0
  ).length;
  const level1Edges = edges.filter(
    (e) => e.data?.level === GraphLevel.LEVEL_1
  ).length;

  const avgNodeVeracity =
    nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.data.weight, 0) / nodes.length
      : 0;

  const avgEdgeVeracity =
    edges.length > 0
      ? edges.reduce((sum, e) => sum + (e.data?.weight || 0), 0) / edges.length
      : 0;

  return {
    totalNodes,
    totalEdges,
    level0Nodes,
    level1Nodes,
    level0Edges,
    level1Edges,
    avgNodeVeracity,
    avgEdgeVeracity,
  };
}

/**
 * Validate node data
 */
export function validateNodeData(data: Partial<NodeData>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.label || data.label.trim() === '') {
    errors.push('Node label is required');
  }

  if (data.weight !== undefined) {
    if (data.weight < 0 || data.weight > 1) {
      errors.push('Weight must be between 0 and 1');
    }
  }

  if (data.level !== undefined) {
    if (![GraphLevel.LEVEL_0, GraphLevel.LEVEL_1].includes(data.level)) {
      errors.push('Invalid level value');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate edge data
 */
export function validateEdgeData(data: Partial<EdgeData>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.weight !== undefined) {
    if (data.weight < 0 || data.weight > 1) {
      errors.push('Weight must be between 0 and 1');
    }
  }

  if (data.level !== undefined) {
    if (![GraphLevel.LEVEL_0, GraphLevel.LEVEL_1].includes(data.level)) {
      errors.push('Invalid level value');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Find connected nodes (direct neighbors)
 */
export function findConnectedNodes(
  nodeId: string,
  edges: GraphCanvasEdge[]
): string[] {
  const connected = new Set<string>();

  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      connected.add(edge.target);
    }
    if (edge.target === nodeId) {
      connected.add(edge.source);
    }
  });

  return Array.from(connected);
}

/**
 * Find path between two nodes (BFS)
 */
export function findPath(
  startId: string,
  endId: string,
  edges: GraphCanvasEdge[]
): string[] | null {
  if (startId === endId) return [startId];

  const queue: Array<{ id: string; path: string[] }> = [
    { id: startId, path: [startId] },
  ];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    const neighbors = findConnectedNodes(current.id, edges);

    for (const neighbor of neighbors) {
      if (neighbor === endId) {
        return [...current.path, neighbor];
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          id: neighbor,
          path: [...current.path, neighbor],
        });
      }
    }
  }

  return null; // No path found
}

/**
 * Detect cycles in graph
 */
export function detectCycles(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    visited.add(nodeId);
    recStack.add(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) return true;
      } else if (recStack.has(edge.target)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) return true;
    }
  }

  return false;
}

/**
 * Export graph to JSON
 */
export function exportGraphToJSON(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
): string {
  return JSON.stringify(
    {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data,
      })),
    },
    null,
    2
  );
}

/**
 * Import graph from JSON
 */
export function importGraphFromJSON(json: string): {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
} | null {
  try {
    const data = JSON.parse(json);

    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Invalid nodes data');
    }

    if (!data.edges || !Array.isArray(data.edges)) {
      throw new Error('Invalid edges data');
    }

    return {
      nodes: data.nodes,
      edges: data.edges,
    };
  } catch (error) {
    console.error('Failed to import graph:', error);
    return null;
  }
}
