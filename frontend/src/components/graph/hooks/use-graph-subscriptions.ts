/**
 * useGraphSubscriptions Hook
 *
 * Manages GraphQL subscriptions for real-time graph updates.
 * Handles node and edge creation, updates, and deletions.
 */

import { useSubscription } from '@apollo/client';
import {
  NODE_UPDATED_SUBSCRIPTION,
  NODE_CREATED_SUBSCRIPTION,
  NODE_DELETED_SUBSCRIPTION,
  EDGE_UPDATED_SUBSCRIPTION,
  EDGE_CREATED_SUBSCRIPTION,
  EDGE_DELETED_SUBSCRIPTION,
} from '@/graphql/queries/graphs';
import type { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

interface UseGraphSubscriptionsProps {
  graphId: string;
  onNodeUpdated?: (node: GraphCanvasNode) => void;
  onNodeCreated?: (node: GraphCanvasNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onEdgeUpdated?: (edge: GraphCanvasEdge) => void;
  onEdgeCreated?: (edge: GraphCanvasEdge) => void;
  onEdgeDeleted?: (edgeId: string) => void;
}

/**
 * Hook for subscribing to real-time graph updates
 */
export function useGraphSubscriptions({
  graphId,
  onNodeUpdated,
  onNodeCreated,
  onNodeDeleted,
  onEdgeUpdated,
  onEdgeCreated,
  onEdgeDeleted,
}: UseGraphSubscriptionsProps): void {
  // Node subscriptions
  useSubscription(NODE_UPDATED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.nodeUpdated && onNodeUpdated) {
        const updatedNode = data.data.nodeUpdated;
        onNodeUpdated({
          id: updatedNode.id,
          type: 'custom',
          position: updatedNode.position || { x: 0, y: 0 },
          data: {
            label: updatedNode.label || updatedNode.title,
            description: updatedNode.description,
            veracity: updatedNode.veracity,
            level: updatedNode.level || 1,
            ...updatedNode.data,
          },
        });
      }
    },
  });

  useSubscription(NODE_CREATED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.nodeCreated && onNodeCreated) {
        const newNode = data.data.nodeCreated;
        onNodeCreated({
          id: newNode.id,
          type: 'custom',
          position: newNode.position || { x: 0, y: 0 },
          data: {
            label: newNode.label || newNode.title,
            description: newNode.description,
            veracity: newNode.veracity,
            level: newNode.level || 1,
            ...newNode.data,
          },
        });
      }
    },
  });

  useSubscription(NODE_DELETED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.nodeDeleted && onNodeDeleted) {
        onNodeDeleted(data.data.nodeDeleted.id);
      }
    },
  });

  // Edge subscriptions
  useSubscription(EDGE_UPDATED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.edgeUpdated && onEdgeUpdated) {
        const updatedEdge = data.data.edgeUpdated;
        onEdgeUpdated({
          id: updatedEdge.id,
          source: updatedEdge.source,
          target: updatedEdge.target,
          type: 'custom',
          data: {
            label: updatedEdge.label,
            relationship: updatedEdge.relationship,
            level: updatedEdge.level || 1,
            ...updatedEdge.data,
          },
        });
      }
    },
  });

  useSubscription(EDGE_CREATED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.edgeCreated && onEdgeCreated) {
        const newEdge = data.data.edgeCreated;
        onEdgeCreated({
          id: newEdge.id,
          source: newEdge.source,
          target: newEdge.target,
          type: 'custom',
          data: {
            label: newEdge.label,
            relationship: newEdge.relationship,
            level: newEdge.level || 1,
            ...newEdge.data,
          },
        });
      }
    },
  });

  useSubscription(EDGE_DELETED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      if (data?.data?.edgeDeleted && onEdgeDeleted) {
        onEdgeDeleted(data.data.edgeDeleted.id);
      }
    },
  });
}
