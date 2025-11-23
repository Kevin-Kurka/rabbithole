/**
 * Example: GraphWithVeracityPanel
 *
 * Demonstrates how to integrate the VeracityPanel with a graph visualization.
 * This example shows:
 * - Node selection handling
 * - Opening the veracity panel when a node is selected
 * - Fetching veracity data from GraphQL
 * - Displaying comprehensive veracity analysis
 */

import React, { useState, useCallback } from 'react';
import { ReactFlow, Node, Edge, NodeMouseHandler } from '@xyflow/react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { VeracityPanel } from '../veracity';
import GraphNode from '../graph-node';
import GraphEdge from '../graph-edge';
import { NodeData, EdgeData, isHighCredibility } from '@/types/graph';

// GraphQL query for fetching veracity data
const GET_NODE_VERACITY = gql`
  query GetNodeVeracity($nodeId: ID!) {
    node(id: $nodeId) {
      id
      veracityScore
      level
      veracityBreakdown {
        evidenceScore
        consensusScore
        challengePenalty
        evidence {
          id
          type
          description
          weight
          addedAt
          addedBy
        }
      }
      veracityHistory {
        score
        timestamp
        reason
        eventType
      }
    }
  }
`;

const nodeTypes = {
  custom: GraphNode,
};

const edgeTypes = {
  custom: GraphEdge,
};

interface GraphWithVeracityPanelProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
}

export const GraphWithVeracityPanel: React.FC<GraphWithVeracityPanelProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch veracity data when a node is selected
  const { data, loading } = useQuery(GET_NODE_VERACITY, {
    variables: { nodeId: selectedNodeId },
    skip: !selectedNodeId,
  });

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
  }, []);

  // Handle panel close
  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    // Delay clearing selection to allow smooth panel animation
    setTimeout(() => setSelectedNodeId(null), 300);
  }, []);

  // Get selected node data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const veracityData = data?.node;

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      />

      {/* Veracity Analysis Panel */}
      {selectedNode && (
        <VeracityPanel
          nodeId={selectedNodeId || undefined}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
          score={selectedNode.data.weight}
          isLevel0={isHighCredibility(selectedNode.data.weight)}
          breakdownData={veracityData?.veracityBreakdown}
          historyData={veracityData?.veracityHistory?.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }))}
          isLoading={loading}
        />
      )}
    </>
  );
};

export default GraphWithVeracityPanel;
