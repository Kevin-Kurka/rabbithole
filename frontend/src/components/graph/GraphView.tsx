'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMutation, useQuery, useSubscription, useApolloClient } from '@apollo/client';
import { gql } from '@apollo/client';
import ArticleNode from './ArticleNode';
import StickyNoteNode from './StickyNoteNode';
import { Article } from '@/graphql/queries/articles';
import { useToast } from '@/hooks/use-toast';

// GraphQL queries and mutations
const GET_NODE_RELATIONSHIPS = gql`
  query GetNodeRelationships($nodeId: ID!) {
    getNodeAssociations(nodeId: $nodeId) {
      id
      sourceNodeId
      targetNodeId
      associationType
      metadata
      targetNode {
        id
        title
        type
        props
      }
    }
  }
`;

const GET_NODE_COMMENTS = gql`
  query GetNodeComments($nodeId: ID!) {
    getActivityPosts(nodeId: $nodeId) {
      id
      content
      authorName
      createdAt
      mentionedNodeIds
      attachmentIds
      canvasProps
    }
  }
`;

const CREATE_EDGE_MUTATION = gql`
  mutation CreateEdge($input: CreateEdgeInput!) {
    createEdge(input: $input) {
      id
      sourceNodeId
      targetNodeId
      edgeType
    }
  }
`;

const NODE_UPDATED_SUBSCRIPTION = gql`
  subscription OnNodeUpdated($graphId: ID!) {
    nodeUpdated(graphId: $graphId) {
      id
      title
      type
      props
    }
  }
`;

interface GraphViewProps {
  articles: Article[];
  graphId?: string;
}

const nodeTypes = {
  article: ArticleNode,
  stickyNote: StickyNoteNode,
};

export default function GraphView({ articles, graphId }: GraphViewProps) {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Convert articles to initial nodes
  useEffect(() => {
    const initialNodes: Node[] = articles.map((article, index) => ({
      id: article.id,
      type: 'article',
      position: {
        x: 200 + (index % 3) * 400,
        y: 100 + Math.floor(index / 3) * 300,
      },
      data: {
        article,
        isExpanded: false,
        onExpand: (nodeId: string) => handleNodeExpand(nodeId),
        onCollapse: (nodeId: string) => handleNodeCollapse(nodeId),
      },
    }));
    setNodes(initialNodes);
  }, [articles]);

  // Subscribe to real-time updates
  useSubscription(NODE_UPDATED_SUBSCRIPTION, {
    variables: { graphId: graphId || 'default' },
    onData: ({ data }) => {
      if (data?.data?.nodeUpdated) {
        const updatedNode = data.data.nodeUpdated;
        setNodes((nds) =>
          nds.map((node) =>
            node.id === updatedNode.id
              ? { ...node, data: { ...node.data, ...updatedNode } }
              : node
          )
        );
      }
    },
  });

  const [createEdge] = useMutation(CREATE_EDGE_MUTATION);

  // Apollo Client instance
  const apolloClient = useApolloClient();

  // Handle node collapse
  const handleNodeCollapse = useCallback((nodeId: string) => {
    // Find all nodes that were added as children of this node
    const nodesToRemove = new Set<string>();
    const edgesToRemove = edges.filter((edge) => {
      if (edge.source === nodeId) {
        nodesToRemove.add(edge.target);
        return true;
      }
      return false;
    });

    // Remove nodes and edges
    setNodes((nds) =>
      nds
        .filter((node) => !nodesToRemove.has(node.id))
        .map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, isExpanded: false } }
            : node
        )
    );
    setEdges((eds) => eds.filter((edge) => !edgesToRemove.includes(edge)));
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, [edges]);

  // Handle node expansion
  const handleNodeExpand = useCallback(async (nodeId: string) => {
    if (expandedNodes.has(nodeId)) return;

    try {
      // Fetch related nodes using Apollo Client
      const { data } = await apolloClient.query({
        query: GET_NODE_RELATIONSHIPS,
        variables: { nodeId },
        fetchPolicy: 'network-only',
      });

      if (data?.getNodeAssociations) {
        const associations = data.getNodeAssociations;
        const parentNode = nodes.find((n) => n.id === nodeId);
        if (!parentNode) return;

        // Create new nodes for relationships
        const newNodes: Node[] = associations.map((assoc: any, index: number) => {
          const angle = (index * 2 * Math.PI) / associations.length;
          const radius = 250;
          return {
            id: assoc.targetNode.id,
            type: 'article',
            position: {
              x: parentNode.position.x + Math.cos(angle) * radius,
              y: parentNode.position.y + Math.sin(angle) * radius,
            },
            data: {
              article: assoc.targetNode,
              isExpanded: false,
              onExpand: handleNodeExpand,
              onCollapse: handleNodeCollapse,
            },
          };
        });

        // Create edges
        const newEdges: Edge[] = associations.map((assoc: any) => ({
          id: assoc.id,
          source: nodeId,
          target: assoc.targetNode.id,
          type: 'smoothstep',
          animated: true,
          label: assoc.associationType,
        }));

        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        setExpandedNodes((prev) => new Set(prev).add(nodeId));

        // Update the parent node's expansion state
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, isExpanded: true } }
              : node
          )
        );
      }
    } catch (error) {
      console.error('Error expanding node:', error);
      toast({
        title: 'Error',
        description: 'Failed to load related nodes',
        variant: 'destructive',
      });
    }
  }, [nodes, expandedNodes, toast, apolloClient, handleNodeCollapse]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;

      try {
        const { data } = await createEdge({
          variables: {
            input: {
              sourceNodeId: params.source,
              targetNodeId: params.target,
              edgeType: 'reference',
            },
          },
        });

        if (data?.createEdge) {
          setEdges((eds) => addEdge({ ...params, id: data.createEdge.id }, eds));
          toast({
            title: 'Success',
            description: 'Connection created',
          });
        }
      } catch (error) {
        console.error('Error creating edge:', error);
        toast({
          title: 'Error',
          description: 'Failed to create connection',
          variant: 'destructive',
        });
      }
    },
    [createEdge, toast]
  );

  return (
    <div className="w-full h-[800px] bg-background rounded-lg border">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'article':
                  return '#60a5fa';
                case 'stickyNote':
                  return '#fbbf24';
                default:
                  return '#9ca3af';
              }
            }}
            style={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}