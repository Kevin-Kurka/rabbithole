import { useState, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CardNode, type CardNodeData } from './card-node';
import { DetailPanel } from './detail-panel';
import { useForceLayout } from './use-force-layout';

interface TraversedNode {
  id: string;
  node_type: string;
  properties: Record<string, any>;
  depth: number;
  path: string[];
}

interface KnowledgeGraphProps {
  traversedNodes: TraversedNode[];
  rootNodeId?: string;
  height?: number;
}

const nodeTypes: NodeTypes = { card: CardNode as any };

export function KnowledgeGraph({ traversedNodes, rootNodeId, height = 600 }: KnowledgeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<TraversedNode | null>(null);

  // Build React Flow nodes and edges from traversed data
  const { initialNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const seen = new Set<string>();

    for (const tn of traversedNodes) {
      if (seen.has(tn.id)) continue;
      seen.add(tn.id);

      const props = tn.properties || {};
      const title = props.title || props.text || props.url || 'Untitled';
      const excerpt = props.summary || props.body || props.text || props.rationale || '';

      nodes.push({
        id: tn.id,
        type: 'card',
        position: { x: 0, y: 0 },
        data: {
          nodeType: tn.node_type,
          title,
          excerpt: excerpt.slice(0, 100),
          status: props.status || props.verdict,
          side: props.side,
          sourceType: props.source_type,
        } as CardNodeData,
      });

      // Create edges from path (connect consecutive nodes in path)
      if (tn.path && tn.path.length > 1) {
        const parentId = tn.path[tn.path.length - 2];
        const edgeId = `${parentId}-${tn.id}`;
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: parentId,
            target: tn.id,
            style: { stroke: '#0a3d0a', strokeWidth: 1.5 },
            animated: false,
          });
        }
      }
    }

    return { initialNodes: nodes, flowEdges: edges };
  }, [traversedNodes]);

  // Position nodes with d3-force
  const positionedNodes = useForceLayout(initialNodes, flowEdges);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const tn = traversedNodes.find(n => n.id === node.id);
    setSelectedNode(tn || null);
  }, [traversedNodes]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className="border border-crt-border">
      <ReactFlow
        nodes={positionedNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
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

      {/* Detail panel */}
      <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
