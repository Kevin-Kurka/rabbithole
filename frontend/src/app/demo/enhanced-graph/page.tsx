/**
 * Enhanced Graph Demo Page
 *
 * Demonstrates the advanced visualization features of the graph canvas.
 */
'use client';
import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import EnhancedGraphCanvas from '@/components/EnhancedGraphCanvas';
import { GraphCanvasNode, GraphCanvasEdge, GraphLevel } from '@/types/graph';
/**
 * Generate sample graph data
 */
function generateSampleData(): {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
} {
  const now = new Date();
  const nodes: GraphCanvasNode[] = [
    {
      id: '1',
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        label: 'Climate Change Evidence',
        weight: 0.95,
        level: GraphLevel.LEVEL_0,
        isLocked: true,
        methodology: 'scientific',
        metadata: {
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '2',
      type: 'custom',
      position: { x: 300, y: 100 },
      data: {
        label: 'Rising Global Temperatures',
        weight: 0.88,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'scientific',
        metadata: {
          createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '3',
      type: 'custom',
      position: { x: 500, y: 100 },
      data: {
        label: 'Ocean Acidification',
        weight: 0.82,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'scientific',
        metadata: {
          createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '4',
      type: 'custom',
      position: { x: 100, y: 300 },
      data: {
        label: 'Polar Ice Melting',
        weight: 0.91,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'scientific',
        metadata: {
          createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '5',
      type: 'custom',
      position: { x: 300, y: 300 },
      data: {
        label: 'News Report: Arctic Ice Loss',
        weight: 0.65,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'journalistic',
        metadata: {
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '6',
      type: 'custom',
      position: { x: 500, y: 300 },
      data: {
        label: 'Sea Level Rise Projections',
        weight: 0.78,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'expert',
        metadata: {
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '7',
      type: 'custom',
      position: { x: 100, y: 500 },
      data: {
        label: 'Extreme Weather Events',
        weight: 0.72,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'crowdsourced',
        metadata: {
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '8',
      type: 'custom',
      position: { x: 300, y: 500 },
      data: {
        label: 'Carbon Emissions Data',
        weight: 1.0,
        level: GraphLevel.LEVEL_0,
        isLocked: true,
        methodology: 'scientific',
        metadata: {
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    {
      id: '9',
      type: 'custom',
      position: { x: 500, y: 500 },
      data: {
        label: 'Renewable Energy Impact',
        weight: 0.58,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'expert',
        metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    },
    {
      id: '10',
      type: 'custom',
      position: { x: 700, y: 300 },
      data: {
        label: 'Public Opinion Survey',
        weight: 0.42,
        level: GraphLevel.LEVEL_1,
        isLocked: false,
        methodology: 'crowdsourced',
        metadata: {
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
  ];
  const edges: GraphCanvasEdge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'custom',
      data: { weight: 0.9, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      type: 'custom',
      data: { weight: 0.85, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e1-4',
      source: '1',
      target: '4',
      type: 'custom',
      data: { weight: 0.88, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e2-5',
      source: '2',
      target: '5',
      type: 'custom',
      data: { weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e3-6',
      source: '3',
      target: '6',
      type: 'custom',
      data: { weight: 0.75, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e4-5',
      source: '4',
      target: '5',
      type: 'custom',
      data: { weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e4-6',
      source: '4',
      target: '6',
      type: 'custom',
      data: { weight: 0.72, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e5-7',
      source: '5',
      target: '7',
      type: 'custom',
      data: { weight: 0.55, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e6-7',
      source: '6',
      target: '7',
      type: 'custom',
      data: { weight: 0.65, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e8-2',
      source: '8',
      target: '2',
      type: 'custom',
      data: { weight: 0.92, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e8-9',
      source: '8',
      target: '9',
      type: 'custom',
      data: { weight: 0.68, level: GraphLevel.LEVEL_1, isLocked: false },
    },
    {
      id: 'e5-10',
      source: '5',
      target: '10',
      type: 'custom',
      data: { weight: 0.48, level: GraphLevel.LEVEL_1, isLocked: false },
    },
  ];
  return { nodes, edges };
}
/**
 * Enhanced Graph Demo Page Component
 */
export default function EnhancedGraphDemoPage() {
  const [graphData] = useState(generateSampleData);
  return (
    <div className="h-screen bg-gray-900">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            Enhanced Graph Visualization Demo
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Explore advanced visualization features: layouts, filtering, timeline, and
            clustering
          </p>
        </header>
        {/* Graph Canvas */}
        <main className="flex-1 overflow-hidden">
          <ReactFlowProvider>
            <EnhancedGraphCanvas
              graphIds={["demo-graph"]}
              initialNodes={graphData.nodes}
              initialEdges={graphData.edges}
              enableFilters={true}
              enableVisualizationControls={true}
              defaultViewMode="canvas"
              defaultLayout="force"
              onSave={(nodes, edges) => {
                console.log('Graph saved:', { nodes, edges });
              }}
              onError={(error) => {
                console.error('Graph error:', error);
              }}
            />
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}
