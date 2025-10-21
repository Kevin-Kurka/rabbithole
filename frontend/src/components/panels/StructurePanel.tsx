"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Circle, Diamond, Square } from 'lucide-react';
import { theme } from '@/styles/theme';

export interface StructurePanelProps {
  graphId?: string;
  onNodeClick?: (nodeId: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  children: TreeNode[];
  veracity: number;
}

// Mock data for demonstration
const MOCK_STRUCTURE: TreeNode = {
  id: 'root',
  label: 'Climate Change Investigation',
  type: 'hypothesis',
  veracity: 0.85,
  children: [
    {
      id: 'evidence-1',
      label: 'Temperature Records',
      type: 'evidence',
      veracity: 1.0,
      children: [
        {
          id: 'data-1',
          label: 'NASA GISS Data',
          type: 'data',
          veracity: 1.0,
          children: []
        },
        {
          id: 'data-2',
          label: 'NOAA Records',
          type: 'data',
          veracity: 1.0,
          children: []
        }
      ]
    },
    {
      id: 'evidence-2',
      label: 'CO2 Measurements',
      type: 'evidence',
      veracity: 1.0,
      children: []
    },
    {
      id: 'theory-1',
      label: 'Greenhouse Effect Theory',
      type: 'theory',
      veracity: 0.92,
      children: []
    }
  ]
};

/**
 * StructurePanel Component
 *
 * Displays hierarchical outline/tree view of the current graph structure.
 */
export default function StructurePanel({ graphId, onNodeClick }: StructurePanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

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

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            if (onNodeClick) onNodeClick(node.id);
          }}
          style={{
            paddingLeft: `${depth * 16 + 8}px`,
            paddingRight: theme.spacing.sm,
            paddingTop: '4px',
            paddingBottom: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: theme.colors.text.primary,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={12} style={{ color: theme.colors.text.tertiary }} />
            ) : (
              <ChevronRight size={12} style={{ color: theme.colors.text.tertiary }} />
            )
          ) : (
            <span style={{ width: '12px' }} />
          )}

          {/* Node Type Icon */}
          <span style={{ color: getVeracityColor(node.veracity) }}>
            {getNodeIcon(node.type)}
          </span>

          {/* Node Label */}
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.label}
          </span>

          {/* Veracity Badge */}
          <span style={{
            fontSize: '9px',
            padding: '1px 4px',
            borderRadius: '3px',
            backgroundColor: getVeracityColor(node.veracity),
            color: '#ffffff',
            fontWeight: 600,
          }}>
            {(node.veracity * 100).toFixed(0)}%
          </span>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
          Hierarchical outline of graph nodes
        </p>
      </div>

      {/* Tree View */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {graphId ? (
          renderTreeNode(MOCK_STRUCTURE)
        ) : (
          <div style={{
            padding: theme.spacing.lg,
            textAlign: 'center',
            color: theme.colors.text.tertiary,
            fontSize: '12px'
          }}>
            <p>Select a graph to view its structure</p>
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
