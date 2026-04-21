import { useEffect, useState } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

export function useForceLayout(initialNodes: Node[], edges: Edge[], width = 1200, height = 800) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {
    if (initialNodes.length === 0) return;

    // Create simulation nodes
    const simNodes = initialNodes.map((n, i) => ({
      ...n,
      x: n.position?.x || Math.cos(i * 2 * Math.PI / initialNodes.length) * 300 + width / 2,
      y: n.position?.y || Math.sin(i * 2 * Math.PI / initialNodes.length) * 300 + height / 2,
    }));

    // Create simulation links
    const simLinks = edges.map(e => ({
      source: String(e.source),
      target: String(e.target),
    }));

    const simulation = forceSimulation(simNodes as any)
      .force('charge', forceManyBody().strength(-500))
      .force('link', forceLink(simLinks as any).id((d: any) => d.id).distance(250))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(130))
      .stop();

    // Run ticks synchronously
    for (let i = 0; i < 150; i++) simulation.tick();

    // Update positions
    const positioned = simNodes.map((sn: any) => ({
      ...initialNodes.find(n => n.id === sn.id)!,
      position: { x: sn.x - 100, y: sn.y - 40 },
    }));

    setNodes(positioned);
  }, [initialNodes.length, edges.length, width, height]);

  return nodes;
}
