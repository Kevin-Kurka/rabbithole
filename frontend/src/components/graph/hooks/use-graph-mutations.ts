/**
 * useGraphMutations Hook
 *
 * Consolidates all GraphQL mutations for nodes and edges.
 * Provides a clean API for CRUD operations on graph elements.
 */

import { useMutation } from '@apollo/client';
import {
  CREATE_NODE_MUTATION,
  UPDATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  CREATE_EDGE_MUTATION,
  UPDATE_EDGE_MUTATION,
  DELETE_EDGE_MUTATION,
} from '@/graphql/queries/graphs';
import type { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

interface UseGraphMutationsResult {
  // Node mutations
  createNode: (variables: any) => Promise<any>;
  updateNode: (variables: any) => Promise<any>;
  deleteNode: (variables: any) => Promise<any>;

  // Edge mutations
  createEdge: (variables: any) => Promise<any>;
  updateEdge: (variables: any) => Promise<any>;
  deleteEdge: (variables: any) => Promise<any>;

  // Loading states
  loading: {
    createNode: boolean;
    updateNode: boolean;
    deleteNode: boolean;
    createEdge: boolean;
    updateEdge: boolean;
    deleteEdge: boolean;
  };
}

/**
 * Hook for managing graph mutations (CRUD operations)
 */
export function useGraphMutations(): UseGraphMutationsResult {
  const [createNodeMutation, { loading: createNodeLoading }] = useMutation(CREATE_NODE_MUTATION);
  const [updateNodeMutation, { loading: updateNodeLoading }] = useMutation(UPDATE_NODE_MUTATION);
  const [deleteNodeMutation, { loading: deleteNodeLoading }] = useMutation(DELETE_NODE_MUTATION);
  const [createEdgeMutation, { loading: createEdgeLoading }] = useMutation(CREATE_EDGE_MUTATION);
  const [updateEdgeMutation, { loading: updateEdgeLoading }] = useMutation(UPDATE_EDGE_MUTATION);
  const [deleteEdgeMutation, { loading: deleteEdgeLoading }] = useMutation(DELETE_EDGE_MUTATION);

  return {
    createNode: (variables: any) => createNodeMutation({ variables }),
    updateNode: (variables: any) => updateNodeMutation({ variables }),
    deleteNode: (variables: any) => deleteNodeMutation({ variables }),
    createEdge: (variables: any) => createEdgeMutation({ variables }),
    updateEdge: (variables: any) => updateEdgeMutation({ variables }),
    deleteEdge: (variables: any) => deleteEdgeMutation({ variables }),
    loading: {
      createNode: createNodeLoading,
      updateNode: updateNodeLoading,
      deleteNode: deleteNodeLoading,
      createEdge: createEdgeLoading,
      updateEdge: updateEdgeLoading,
      deleteEdge: deleteEdgeLoading,
    },
  };
}
