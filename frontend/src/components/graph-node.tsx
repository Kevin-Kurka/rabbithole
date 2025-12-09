/**
 * GraphNode Component
 *
 * Custom node component for React Flow with:
 * - Credibility score color coding
 * - Level 0/1 visual distinction
 * - Lock icons for read-only nodes
 * - Zinc theme styling
 */

import React, { memo, CSSProperties } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { NodeData } from '@/types/graph';
import { theme } from '@/styles/theme';

/**
 * Get color based on credibility score (weight)
 */
const getCredibilityColor = (weight: number): CSSProperties => {
  // Verified nodes (100% confidence)
  if (weight >= 1.0) {
    return {
      backgroundColor: '#10b981', // green-500
      borderColor: '#059669', // green-600
      color: '#ffffff',
    };
  }

  // Level 1 nodes with graduated colors based on weight
  if (weight >= 0.7) {
    return {
      backgroundColor: '#84cc16', // lime-500
      borderColor: '#65a30d', // lime-600
      color: '#ffffff',
    };
  }

  if (weight >= 0.4) {
    return {
      backgroundColor: '#eab308', // yellow-500
      borderColor: '#ca8a04', // yellow-600
      color: '#27272a', // zinc-800
    };
  }

  if (weight >= 0.1) {
    return {
      backgroundColor: '#f97316', // orange-500
      borderColor: '#ea580c', // orange-600
      color: '#ffffff',
    };
  }

  return {
    backgroundColor: '#ef4444', // red-500
    borderColor: '#dc2626', // red-600
    color: '#ffffff',
  };
};

/**
 * Format credibility score for display
 */
const formatCredibility = (weight: number): string => {
  if (weight >= 1.0) {
    return 'Verified';
  }
  return `${(weight * 100).toFixed(0)}% confidence`;
};

/**
 * GraphNode component
 */
function GraphNode({ data: dataProp, selected, dragging }: NodeProps) {
  const data = dataProp as NodeData;
  const { label, weight, isLocked, methodology } = data;
  const colors = getCredibilityColor(weight);

  return (
    <div
      style={{
        ...colors,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        minWidth: '160px',
        maxWidth: '240px',
        boxShadow: selected
          ? '0 0 0 2px #3b82f6' // blue-500 ring for selection
          : dragging
            ? theme.shadow.lg
            : theme.shadow.md,
        transition: 'all 0.2s ease',
        opacity: dragging ? 0.8 : 1,
        cursor: isLocked ? 'not-allowed' : 'grab',
      }}
      className="relative"
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          backgroundColor: theme.colors.border.DEFAULT,
          width: '12px',
          height: '12px',
          border: `2px solid ${colors.borderColor}`,
        }}
      />





      {/* Lock icon for Level 0 or locked nodes */}
      {(weight >= 1.0 || isLocked) && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: theme.radius.sm,
            padding: '2px',
          }}
        >
          <Lock size={12} style={{ color: colors.color }} />
        </div>
      )}

      {/* Node label */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '4px',
          wordWrap: 'break-word',
          color: colors.color,
        }}
      >
        {label || 'Untitled Node'}
      </div>

      {/* Credibility badge */}
      <div
        style={{
          fontSize: '11px',
          opacity: 0.9,
          marginTop: '4px',
          color: colors.color,
        }}
      >
        {formatCredibility(weight)}
      </div>

      {/* Methodology tag (if present) */}
      {methodology && (
        <div
          style={{
            fontSize: '10px',
            marginTop: '4px',
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: theme.radius.sm,
            display: 'inline-block',
            color: colors.color,
          }}
        >
          {methodology}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          backgroundColor: theme.colors.border.DEFAULT,
          width: '12px',
          height: '12px',
          border: `2px solid ${colors.borderColor}`,
        }}
      />
    </div>
  );
}

export default memo(GraphNode);
