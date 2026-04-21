import { useState, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CardNode, type CardNodeData } from './card-node';
import { DetailPanel } from './detail-panel';
import { EdgeDetailPanel } from './edge-detail-panel';
import { useForceLayout } from './use-force-layout';
import type { SentientEdge } from '../../lib/types';

interface TraversedNode {
  id: string;
  node_type: string;
  properties: Record<string, any>;
  depth: number;
  path: string[];
}

interface KnowledgeGraphProps {
  traversedNodes: TraversedNode[];
  edges?: SentientEdge[];
  rootNodeId?: string;
  height?: number;
  onEdgeChallenge?: (edgeId: string) => void;
}

const nodeTypes: NodeTypes = { card: CardNode as any };

// Helper functions for edge styling based on confidence
function getEdgeColor(confidence: number): string {
  if (confidence >= 70) return '#00d900'; // high confidence - green
  if (confidence >= 40) return '#e5e500'; // medium confidence - yellow
  return '#e50000'; // low confidence - red
}

function getEdgeStyle(confidence: number): string {
  // Dashed for low confidence, solid for high
  return confidence < 30 ? '5,5' : 'none';
}

export function KnowledgeGraph({ traversedNodes, edges = [], rootNodeId, height = 600, onEdgeChallenge }: KnowledgeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<TraversedNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SentientEdge | null>(null);

  // Build React Flow nodes and edges from traversed data and rich edge data
  const { initialNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const flowEdgesArray: Edge[] = [];
    const seen = new Set<string>();

    for (const tn of traversedNodes) {
      if (seen.has(tn.id)) continue;
      seen.add(tn.id);

      const props = (tn.properties || {}) as Record<string, unknown>;
      const title = (props.title as string) || (props.text as string) || (props.url as string) || 'Untitled';
      const excerpt = (props.summary as string) || (props.body as string) || (props.text as string) || (props.rationale as string) || '';

      nodes.push({
        id: tn.id,
        type: 'card',
        position: { x: 0, y: 0 },
        data: {
          nodeType: tn.node_type,
          title,
          excerpt: excerpt.slice(0, 100),
          status: (props.status as string) || (props.verdict as string),
          side: props.side as string,
          sourceType: props.source_type as string,
        } as CardNodeData,
      });

      // Create edges from path (connect consecutive nodes in path)
      if (tn.path && tn.path.length > 1) {
        const parentId = tn.path[tn.path.length - 2];
        const edgeId = `${parentId}-${tn.id}`;
        if (!flowEdgesArray.find(e => e.id === edgeId)) {
          flowEdgesArray.push({
            id: edgeId,
            source: parentId,
            target: tn.id,
            style: { stroke: '#0a3d0a', strokeWidth: 1.5 },
            animated: false,
          });
        }
      }
    }

    // Merge rich edge data from the edges prop
    for (const edge of edges) {
      const existingEdge = flowEdgesArray.find(
        e => e.source === edge.source_node_id && e.target === edge.target_node_id
      );

      const props = (edge.properties || {}) as Record<string, unknown>;
      const confidence = (props.confidence as number) || 50;
      const edgeColor = getEdgeColor(confidence);
      const edgeStyle = getEdgeStyle(confidence);
      const label = (props.label as string) || (props.relationship_type as string) || edge.edge_type;

      if (existingEdge) {
        // Update existing edge with rich properties
        existingEdge.label = label;
        existingEdge.style = { ...existingEdge.style, stroke: edgeColor, strokeDasharray: edgeStyle };
        existingEdge.data = { sentientEdge: edge }; // Store edge data for click handling
      } else {
        // Create new edge
        flowEdgesArray.push({
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label,
          style: { stroke: edgeColor, strokeWidth: 1.5, strokeDasharray: edgeStyle },
          data: { sentientEdge: edge },
          animated: false,
        });
      }
    }

    return { initialNodes: nodes, flowEdges: flowEdgesArray };
  }, [traversedNodes, edges]);

  // Position nodes with d3-force
  const positionedNodes = useForceLayout(initialNodes, flowEdges);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const tn = traversedNodes.find(n => n.id === node.id);
    setSelectedNode(tn || null);
    setSelectedEdge(null);
  }, [traversedNodes]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const sentientEdge = (edge.data as any)?.sentientEdge;
    if (sentientEdge) {
      setSelectedEdge(sentientEdge);
      setSelectedNode(null);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className="border border-crt-border">
      <ReactFlow
        nodes={positionedNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#000000' }}
      >
        <Background color="#0a3d0a" gap={40} size={1} />
        <Controls
          style={{ background: '#0a0a0a', border: '1px solid #0a3d0a', borderRadius: 0 }}
        />
        <MiniMap
          style={{ background: '#0a0a0a', border: '1px solid #0a3d0a', borderRadius: 0 }}
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              ARTICLE: '#00a6b2', CLAIM: '#e5e500', CHALLENGE: '#e50000',
              EVIDENCE: '#00d900', THEORY: '#b200b2', SOURCE: '#666666',
            };
            return colors[(n.data as any)?.nodeType] || '#00ff00';
          }}
        />
      </ReactFlow>

      {/* Node Detail panel */}
      <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />

      {/* Edge Detail panel */}
      <EdgeDetailPanel
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
        onChallenge={onEdgeChallenge}
      />
    </div>
  );
}
