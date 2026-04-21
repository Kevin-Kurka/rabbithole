import { useEffect, useRef, useState } from 'react';
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
  rootNodeId?: string;
}

export function GraphVisualizer({
  nodes,
  edges,
  onNodeClick,
  height = 500,
  className = '',
  rootNodeId,
}: GraphVisualizerProps) {
  const fgRef = useRef<any>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ARTICLE: '#00a6b2',      // cyan
      CLAIM: '#e5e500',        // yellow
      CHALLENGE: '#e50000',    // red
      EVIDENCE: '#00d900',     // bright green
      THEORY: '#b200b2',       // purple
      SOURCE: '#666666',       // gray
    };
    return colors[type] || '#00ff00'; // default green
  };

  const nodeData = nodes.map(n => ({
    id: n.id,
    name: n.label,
    val: n.id === rootNodeId ? 12 : 8,  // Larger root node
    type: n.type,
    isRoot: n.id === rootNodeId,
  }));

  const linkData = edges.map(e => ({
    source: e.source,
    target: e.target,
  }));

  useEffect(() => {
    if (fgRef.current) {
      // Auto-center and zoom to fit
      const canvas = fgRef.current.canvas;
      if (canvas) {
        fgRef.current.zoomToFit(400);
      }
    }
  }, [nodes]);

  return (
    <div className={`w-full h-full flex flex-col border border-crt-border overflow-hidden bg-black ${className}`}>
      <div className="flex-1 relative">
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes: nodeData, links: linkData }}
          nodeLabel="name"
          nodeColor={(node: any) => getNodeColor(node.type)}
          onNodeClick={(node: any) => {
            const graphNode = nodes.find(n => n.id === node.id);
            if (graphNode) onNodeClick(graphNode);
          }}
          onNodeHover={(node: any) => setHoveredNodeId(node ? node.id : null)}
          width={typeof window !== 'undefined' ? window.innerWidth : 800}
          height={height}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkColor={() => '#0a3d0a'}  // dark green connections
          linkWidth={1}
          backgroundColor="#000000"
          nodeCanvasObject={(node: any, ctx) => {
            // Draw node circle
            ctx.fillStyle = getNodeColor(node.type);
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
            ctx.fill();

            // Draw label below node
            const label = node.name.substring(0, 25);  // Truncate to 25 chars
            const fontSize = 10;
            ctx.font = `${fontSize}px 'SF Mono', Menlo, Monaco, monospace`;
            ctx.fillStyle = '#00ff00';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, node.x, node.y + node.val + 4);

            // Draw tooltip on hover
            if (hoveredNodeId === node.id) {
              const tooltipWidth = Math.min(200, node.name.length * 6);
              const tooltipHeight = 24;
              const tooltipX = node.x - tooltipWidth / 2;
              const tooltipY = node.y - node.val - tooltipHeight - 8;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(tooltipX - 4, tooltipY - 4, tooltipWidth + 8, tooltipHeight + 8);
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 1;
              ctx.strokeRect(tooltipX - 4, tooltipY - 4, tooltipWidth + 8, tooltipHeight + 8);

              ctx.fillStyle = '#00ff00';
              ctx.font = `bold ${fontSize}px 'SF Mono', Menlo, Monaco, monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(node.name, node.x, tooltipY + tooltipHeight / 2);
            }
          }}
        />
      </div>
    </div>
  );
}
