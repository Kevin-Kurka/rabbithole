import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { SentientNode, SentientEdge } from '../lib/types';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphVisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (node: GraphNode) => void;
  height?: number;
  className?: string;
}

export function GraphVisualizer({
  nodes,
  edges,
  onNodeClick,
  height = 500,
  className = '',
}: GraphVisualizerProps) {
  const fgRef = useRef<any>(null);

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ARTICLE: '#00a6b2',      // crt-info
      CLAIM: '#e5e500',        // crt-warning
      EVIDENCE: '#00ff00',     // crt-fg
      THEORY: '#00a600',       // crt-muted
      SOURCE: '#666666',       // crt-dim
      CHALLENGE: '#e50000',    // crt-error
    };
    return colors[type] || '#666666';
  };

  const nodeData = nodes.map(n => ({
    id: n.id,
    name: n.label,
    val: 15,
    type: n.type,
  }));

  const linkData = edges.map(e => ({
    source: e.source,
    target: e.target,
  }));

  return (
    <div className={`w-full border border-crt-border overflow-hidden bg-black ${className}`}>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: nodeData, links: linkData }}
        nodeLabel="name"
        nodeColor={(node: any) => getNodeColor(node.type)}
        onNodeClick={(node: any) => {
          const graphNode = nodes.find(n => n.id === node.id);
          if (graphNode) onNodeClick(graphNode);
        }}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={height}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#000000"
        linkColor={() => '#00a600'}
        nodeCanvasObject={(node: any, ctx) => {
          const label = node.name;
          const fontSize = 12;
          ctx.font = `${fontSize}px 'SF Mono', Menlo, Monaco, monospace`;
          ctx.fillStyle = '#00ff00';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, node.x, node.y + node.val + 8);
        }}
      />
    </div>
  );
}
