/**
 * Layout Demo Component
 *
 * Interactive demonstration of all available graph layout algorithms.
 * Shows before/after comparisons and performance metrics.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { LayoutEngine, LayoutType, LayoutConfig } from '@/utils/layouts';
import { GraphCanvasNode, GraphCanvasEdge, GraphLevel } from '@/types/graph';
import { theme } from '@/styles/theme';

/**
 * Generate sample graph data
 */
function generateSampleGraph(type: 'small' | 'medium' | 'dag' | 'timeline'): {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
} {
  if (type === 'small') {
    // Simple 5-node network
    const nodes: GraphCanvasNode[] = [
      { id: '1', position: { x: 100, y: 100 }, data: { label: 'A', weight: 0.9, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '2', position: { x: 200, y: 100 }, data: { label: 'B', weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '3', position: { x: 150, y: 200 }, data: { label: 'C', weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '4', position: { x: 100, y: 300 }, data: { label: 'D', weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '5', position: { x: 200, y: 300 }, data: { label: 'E', weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
    ];
    const edges: GraphCanvasEdge[] = [
      { id: 'e1', source: '1', target: '2', data: { weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e2', source: '1', target: '3', data: { weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e3', source: '2', target: '3', data: { weight: 0.9, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e4', source: '3', target: '4', data: { weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e5', source: '3', target: '5', data: { weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
    ];
    return { nodes, edges };
  }

  if (type === 'dag') {
    // Directed acyclic graph (tree-like)
    const nodes: GraphCanvasNode[] = [
      { id: '1', position: { x: 250, y: 50 }, data: { label: 'Root', weight: 1.0, level: GraphLevel.LEVEL_0, isLocked: true } },
      { id: '2', position: { x: 150, y: 150 }, data: { label: 'A', weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '3', position: { x: 350, y: 150 }, data: { label: 'B', weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '4', position: { x: 100, y: 250 }, data: { label: 'A1', weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '5', position: { x: 200, y: 250 }, data: { label: 'A2', weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '6', position: { x: 300, y: 250 }, data: { label: 'B1', weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: '7', position: { x: 400, y: 250 }, data: { label: 'B2', weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
    ];
    const edges: GraphCanvasEdge[] = [
      { id: 'e1', source: '1', target: '2', data: { weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e2', source: '1', target: '3', data: { weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e3', source: '2', target: '4', data: { weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e4', source: '2', target: '5', data: { weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e5', source: '3', target: '6', data: { weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e6', source: '3', target: '7', data: { weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
    ];
    return { nodes, edges };
  }

  if (type === 'timeline') {
    // Timeline graph with timestamps
    const now = Date.now();
    const nodes: GraphCanvasNode[] = [
      { id: '1', position: { x: 100, y: 200 }, data: { label: 'Event 1', weight: 0.9, level: GraphLevel.LEVEL_1, isLocked: false, createdAt: new Date(now - 86400000 * 5).toISOString() } },
      { id: '2', position: { x: 200, y: 200 }, data: { label: 'Event 2', weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false, createdAt: new Date(now - 86400000 * 4).toISOString() } },
      { id: '3', position: { x: 300, y: 200 }, data: { label: 'Event 3', weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false, createdAt: new Date(now - 86400000 * 3).toISOString() } },
      { id: '4', position: { x: 400, y: 200 }, data: { label: 'Event 4', weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false, createdAt: new Date(now - 86400000 * 1).toISOString() } },
      { id: '5', position: { x: 500, y: 200 }, data: { label: 'Event 5', weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false, createdAt: new Date(now).toISOString() } },
    ];
    const edges: GraphCanvasEdge[] = [
      { id: 'e1', source: '1', target: '2', data: { weight: 0.8, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e2', source: '2', target: '3', data: { weight: 0.7, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e3', source: '3', target: '4', data: { weight: 0.6, level: GraphLevel.LEVEL_1, isLocked: false } },
      { id: 'e4', source: '4', target: '5', data: { weight: 0.5, level: GraphLevel.LEVEL_1, isLocked: false } },
    ];
    return { nodes, edges };
  }

  // Medium graph (15 nodes)
  const nodes: GraphCanvasNode[] = Array.from({ length: 15 }, (_, i) => ({
    id: String(i + 1),
    position: { x: Math.random() * 500, y: Math.random() * 500 },
    data: {
      label: `Node ${i + 1}`,
      weight: Math.random() * 0.5 + 0.5,
      level: i === 0 ? GraphLevel.LEVEL_0 : GraphLevel.LEVEL_1,
      isLocked: i === 0,
    },
  }));

  const edges: GraphCanvasEdge[] = [];
  for (let i = 0; i < 20; i++) {
    const source = String(Math.floor(Math.random() * 15) + 1);
    const target = String(Math.floor(Math.random() * 15) + 1);
    if (source !== target) {
      edges.push({
        id: `e${i + 1}`,
        source,
        target,
        data: { weight: Math.random() * 0.5 + 0.5, level: GraphLevel.LEVEL_1, isLocked: false },
      });
    }
  }

  return { nodes, edges };
}

export default function LayoutDemo() {
  const [graphType, setGraphType] = useState<'small' | 'medium' | 'dag' | 'timeline'>('small');
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>(LayoutType.FORCE);
  const [layoutResult, setLayoutResult] = useState<string>('');

  const { nodes: originalNodes, edges } = useMemo(
    () => generateSampleGraph(graphType),
    [graphType]
  );

  const handleApplyLayout = () => {
    const config: LayoutConfig = {
      type: selectedLayout,
      animated: false,
      options: LayoutEngine.getAutoOptions(selectedLayout, originalNodes, edges),
    };

    // Add layout-specific parameters
    if (selectedLayout === LayoutType.FORCE_CLUSTERED) {
      config.clusterKey = 'level';
    } else if (selectedLayout === LayoutType.TIMELINE) {
      config.timeKey = 'createdAt';
    } else if (selectedLayout === LayoutType.RADIAL) {
      config.rootNodeId = originalNodes[0]?.id;
    }

    const startTime = performance.now();
    const result = LayoutEngine.applyLayout(originalNodes, edges, config);
    const endTime = performance.now();

    const output = `
Layout Applied: ${selectedLayout}
Duration: ${(endTime - startTime).toFixed(2)}ms
Nodes: ${result.metadata.nodeCount}
Edges: ${result.metadata.edgeCount}
Bounding Box: ${result.metadata.boundingBox.width.toFixed(0)}x${result.metadata.boundingBox.height.toFixed(0)}

Sample Node Positions:
${result.nodes.slice(0, 3).map(n => `  ${n.data.label}: (${n.position.x.toFixed(0)}, ${n.position.y.toFixed(0)})`).join('\n')}
    `.trim();

    setLayoutResult(output);
  };

  const recommendedLayout = useMemo(
    () => LayoutEngine.recommendLayout(originalNodes, edges),
    [originalNodes, edges]
  );

  const availableLayouts = useMemo(
    () => LayoutEngine.getAvailableLayouts(originalNodes, edges),
    [originalNodes, edges]
  );

  return (
    <div
      style={{
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.bg.primary,
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: theme.spacing.lg,
            color: theme.colors.text.primary,
          }}
        >
          Layout Algorithm Demo
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg }}>
          {/* Controls */}
          <div
            style={{
              backgroundColor: theme.colors.bg.elevated,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 'semibold',
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
              }}
            >
              Configuration
            </h2>

            {/* Graph Type */}
            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: theme.colors.text.secondary,
                  fontSize: '0.875rem',
                }}
              >
                Graph Type
              </label>
              <select
                value={graphType}
                onChange={(e) => setGraphType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.secondary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  color: theme.colors.text.primary,
                }}
              >
                <option value="small">Small Network (5 nodes)</option>
                <option value="medium">Medium Network (15 nodes)</option>
                <option value="dag">Hierarchical DAG (7 nodes)</option>
                <option value="timeline">Timeline (5 events)</option>
              </select>
            </div>

            {/* Layout Algorithm */}
            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: theme.spacing.xs,
                  color: theme.colors.text.secondary,
                  fontSize: '0.875rem',
                }}
              >
                Layout Algorithm
              </label>
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value as LayoutType)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.secondary,
                  border: `1px solid ${theme.colors.border.primary}`,
                  color: theme.colors.text.primary,
                }}
              >
                {availableLayouts.map((layout) => (
                  <option key={layout.type} value={layout.type}>
                    {layout.name}
                    {layout.recommended ? ' (Recommended)' : ''}
                  </option>
                ))}
              </select>
              <p
                style={{
                  marginTop: theme.spacing.xs,
                  fontSize: '0.75rem',
                  color: theme.colors.text.tertiary,
                }}
              >
                Recommended: {availableLayouts.find(l => l.type === recommendedLayout)?.name}
              </p>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyLayout}
              style={{
                width: '100%',
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.button.primary.bg,
                color: theme.colors.button.primary.text,
                fontWeight: 'semibold',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Apply Layout
            </button>
          </div>

          {/* Results */}
          <div
            style={{
              backgroundColor: theme.colors.bg.elevated,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border.primary}`,
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 'semibold',
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
              }}
            >
              Results
            </h2>

            <pre
              style={{
                backgroundColor: theme.colors.bg.secondary,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                fontSize: '0.875rem',
                color: theme.colors.text.primary,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                minHeight: '200px',
              }}
            >
              {layoutResult || 'Click "Apply Layout" to see results'}
            </pre>
          </div>
        </div>

        {/* Documentation */}
        <div
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: theme.colors.bg.elevated,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 'semibold',
              marginBottom: theme.spacing.md,
              color: theme.colors.text.primary,
            }}
          >
            Available Layouts
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            {availableLayouts.map((layout) => (
              <div
                key={layout.type}
                style={{
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.bg.secondary,
                  borderRadius: theme.radius.md,
                  border: layout.recommended
                    ? `2px solid ${theme.colors.button.primary.bg}`
                    : `1px solid ${theme.colors.border.primary}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 'semibold',
                      color: theme.colors.text.primary,
                    }}
                  >
                    {layout.name}
                  </h3>
                  {layout.recommended && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.button.primary.bg,
                        color: theme.colors.button.primary.text,
                      }}
                    >
                      Recommended
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: theme.colors.text.secondary,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  {layout.description}
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: theme.colors.text.tertiary,
                    marginTop: theme.spacing.xs,
                    textTransform: 'capitalize',
                  }}
                >
                  Category: {layout.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
