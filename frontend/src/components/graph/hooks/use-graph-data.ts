/**
 * useGraphData Hook
 *
 * Manages GraphQL queries for fetching graph data from multiple graphs.
 * Consolidates data loading logic into a reusable hook.
 */

import { useQuery } from '@apollo/client';
import { GRAPH_QUERY } from '@/graphql/queries/graphs';
import type { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

interface GraphData {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
}

interface UseGraphDataResult {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  loading: boolean;
  error: Error | undefined;
}

/**
 * Fetch and merge data from multiple graph sources
 */
export function useGraphData(graphIds: string[]): UseGraphDataResult {
  // Query each graph
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

  // Combine loading states
  const loading = [graph1, graph2, graph3, graph4, graph5].some((g) => g.loading);

  // Collect errors
  const error = [graph1, graph2, graph3, graph4, graph5]
    .map((g) => g.error)
    .find((e) => e !== undefined);

  // Merge data from all graphs
  const allGraphs = [graph1, graph2, graph3, graph4, graph5]
    .filter((g) => g.data?.graph)
    .map((g) => g.data.graph);

  const nodes: GraphCanvasNode[] = [];
  const edges: GraphCanvasEdge[] = [];

  allGraphs.forEach((graph) => {
    if (graph.nodes) {
      nodes.push(...graph.nodes.map((node: any) => ({
        id: node.id,
        type: 'custom',
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.label || node.title,
          description: node.description,
          weight: node.weight,
          level: getLevelFromWeight(node.weight),
          ...node.data,
        },
      })));
    }

    if (graph.edges) {
      edges.push(...graph.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        data: {
          label: edge.label,
          relationship: edge.relationship,
          level: edge.level || 1,
          ...edge.data,
        },
      })));
    }
  });

  return {
    nodes,
    edges,
    loading,
    error,
  };
}
