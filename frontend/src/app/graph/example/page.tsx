/**
 * GraphCanvas Example Page
 *
 * Demonstrates usage of the GraphCanvas component with various features.
 */
'use client';
import React, { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import GraphCanvas from '@/components/GraphCanvas';
import {
  GraphCanvasNode,
  GraphCanvasEdge,
  GraphLevel,
} from '@/types/graph';
import { calculateGraphStats } from '@/utils/graphHelpers';
import { theme } from '@/styles/theme';
export default function GraphCanvasExample() {
  const { data: session, status } = useSession();
  const [graphId] = useState('c14f48ce-b474-48ec-acc9-187c45555c4a');
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalEdges: 0,
    level0Nodes: 0,
    level1Nodes: 0,
    avgNodeVeracity: 0,
    avgEdgeVeracity: 0,
  });
  const handleSave = (nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => {
    const newStats = calculateGraphStats(nodes, edges);
    setStats(newStats);
    console.log('Graph saved:', { nodes, edges, stats: newStats });
  };
  const handleError = (error: Error) => {
    console.error('Graph error:', error);
    // In production, you'd show a toast notification here
    alert(`Error: ${error.message}`);
  };
  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: theme.colors.bg.primary,
          color: theme.colors.text.primary,
        }}
      >
        Loading...
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem',
          backgroundColor: theme.colors.bg.primary,
          color: theme.colors.text.primary,
        }}
      >
        <h1 style={{ fontSize: '1.5rem' }}>Access Denied</h1>
        <p>Please sign in to view the graph</p>
        <button
          onClick={() => signIn()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: theme.colors.button.primary.bg,
            color: theme.colors.button.primary.text,
            border: 'none',
            borderRadius: theme.radius.md,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
      </div>
    );
  }
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Stats Panel */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 10,
          backgroundColor: theme.colors.overlay.modal,
          border: `1px solid ${theme.colors.border.primary}`,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          minWidth: '200px',
          boxShadow: theme.shadows.lg,
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: theme.spacing.sm,
            fontSize: '14px',
            fontWeight: 600,
            color: theme.colors.text.primary,
          }}
        >
          Graph Statistics
        </h3>
        <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <span>Total Nodes:</span>
            <span style={{ fontWeight: 500 }}>{stats.totalNodes}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <span>Total Edges:</span>
            <span style={{ fontWeight: 500 }}>{stats.totalEdges}</span>
          </div>
          <div
            style={{
              height: '1px',
              backgroundColor: theme.colors.border.primary,
              margin: `${theme.spacing.sm} 0`,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <span>Level 0 Nodes:</span>
            <span style={{ fontWeight: 500, color: '#10b981' }}>
              {stats.level0Nodes}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <span>Level 1 Nodes:</span>
            <span style={{ fontWeight: 500 }}>{stats.level1Nodes}</span>
          </div>
          <div
            style={{
              height: '1px',
              backgroundColor: theme.colors.border.primary,
              margin: `${theme.spacing.sm} 0`,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <span>Avg Node Veracity:</span>
            <span style={{ fontWeight: 500 }}>
              {(stats.avgNodeVeracity * 100).toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Avg Edge Veracity:</span>
            <span style={{ fontWeight: 500 }}>
              {(stats.avgEdgeVeracity * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      {/* Instructions Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          zIndex: 10,
          backgroundColor: theme.colors.overlay.modal,
          border: `1px solid ${theme.colors.border.primary}`,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          maxWidth: '300px',
          boxShadow: theme.shadows.lg,
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: theme.spacing.sm,
            fontSize: '14px',
            fontWeight: 600,
            color: theme.colors.text.primary,
          }}
        >
          Keyboard Shortcuts
        </h3>
        <div style={{ fontSize: '11px', color: theme.colors.text.secondary }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <kbd>⌘/Ctrl + Z</kbd> - Undo
          </div>
          <div style={{ marginBottom: '0.25rem' }}>
            <kbd>⌘/Ctrl + Shift + Z</kbd> - Redo
          </div>
          <div style={{ marginBottom: '0.25rem' }}>
            <kbd>⌘/Ctrl + C</kbd> - Copy
          </div>
          <div style={{ marginBottom: '0.25rem' }}>
            <kbd>Del/Backspace</kbd> - Delete
          </div>
          <div style={{ marginBottom: '0.25rem' }}>
            <kbd>Right Click</kbd> - Context Menu
          </div>
        </div>
      </div>
      {/* Graph Canvas */}
      <GraphCanvas
        graphIds={[graphId]}
        onSave={handleSave}
        onError={handleError}
        showMinimap={true}
        showControls={true}
        showBackground={true}
        methodologyId="zettelkasten"
      />
    </div>
  );
}
