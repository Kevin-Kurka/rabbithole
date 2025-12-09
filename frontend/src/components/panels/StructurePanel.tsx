"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Circle, Diamond, Square } from 'lucide-react';
import { theme } from '@/styles/theme';
import { useQuery, gql } from '@apollo/client';

export interface StructurePanelProps {
  graphId?: string;
  onNodeClick?: (nodeId: string) => void;
}

// Basic query to fetch nodes for structure
// We fetch the graph and its nodes if possible.
const GET_GRAPH_NODES = gql`
  query GetGraphNodes($graphId: ID!) {
    graph(id: $graphId) {
      id
      name
      nodes {
         id
         title
         type
         veracityScore {
            veracityScore
         }
      }
    }
  }
`;

export default function StructurePanel({ graphId, onNodeClick }: StructurePanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  // Fetch real data
  const { data, loading } = useQuery(GET_GRAPH_NODES, {
    variables: { graphId },
    skip: !graphId,
    // Add error policy to ignore errors since 'nodes' field might not exist on graph in all schemas
    // or to gracefully handle missing data.
    errorPolicy: 'ignore'
  });

  // Extract nodes from graph response
  const nodes = data?.graph?.nodes || [];

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'hypothesis':
        return <Diamond size={12} />;
      case 'evidence':
        return <Square size={12} />;
      case 'theory':
        return <Circle size={12} />;
      default:
        return <Circle size={12} />;
    }
  };

  const getVeracityColor = (veracity: number) => {
    if (veracity >= 0.9) return '#10b981'; // green
    if (veracity >= 0.7) return '#f59e0b'; // amber
    if (veracity >= 0.5) return '#ef4444'; // red
    return theme.colors.text.tertiary;
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.bg.secondary,
      }}
    >
      {/* Header */}
      <div style={{ padding: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border.primary}` }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs
        }}>
          Structure
        </h3>
        <p style={{
          fontSize: '10px',
          color: theme.colors.text.tertiary
        }}>
          Graph nodes
        </p>
      </div>

      {/* List View */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: theme.colors.text.tertiary }}>
            Loading...
          </div>
        ) : graphId && nodes.length > 0 ? (
          nodes.map((node: any) => (
            <div key={node.id}
              onClick={() => onNodeClick && onNodeClick(node.id)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: theme.colors.text.primary,
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ color: getVeracityColor(node.veracityScore?.veracityScore || 0) }}>
                {getNodeIcon(node.type)}
              </span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</span>
            </div>
          ))
        ) : (
          <div style={{
            padding: theme.spacing.lg,
            textAlign: 'center',
            color: theme.colors.text.tertiary,
            fontSize: '12px'
          }}>
            <p>{graphId ? 'No nodes found' : 'Select a graph to view structure'}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        padding: theme.spacing.sm,
        borderTop: `1px solid ${theme.colors.border.primary}`,
        backgroundColor: theme.colors.bg.tertiary,
      }}>
        <div style={{ fontSize: '10px', color: theme.colors.text.tertiary, marginBottom: '4px' }}>
          Legend
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
            <Diamond size={10} style={{ color: theme.colors.text.secondary }} />
            <span style={{ color: theme.colors.text.tertiary }}>Hypothesis</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
            <Square size={10} style={{ color: theme.colors.text.secondary }} />
            <span style={{ color: theme.colors.text.tertiary }}>Evidence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
            <Circle size={10} style={{ color: theme.colors.text.secondary }} />
            <span style={{ color: theme.colors.text.tertiary }}>Theory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
