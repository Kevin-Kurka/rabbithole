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
      ARTICLE: '#3b82f6',      // blue
      CLAIM: '#eab308',        // yellow
      EVIDENCE: '#10b981',     // green
      THEORY: '#a855f7',       // purple
      SOURCE: '#6b7280',       // gray
      CHALLENGE: '#f97316',    // orange
    };
    return colors[type] || '#6b7280';
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
    <div className={`w-full rounded-lg border border-gray-200 overflow-hidden ${className}`}>
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
        nodeCanvasObject={(node: any, ctx) => {
          const label = node.name;
          const fontSize = 12;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, node.x, node.y + node.val + 8);
        }}
      />
    </div>
  );
}
