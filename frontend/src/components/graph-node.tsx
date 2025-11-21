/**
 * GraphNode Component
 *
 * Custom node component for React Flow with:
 * - Veracity score color coding
 * - Level 0/1 visual distinction
 * - Lock icons for read-only nodes
 * - Zinc theme styling
 */

import React, { memo, CSSProperties } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Lock, AlertCircle } from 'lucide-react';
import { NodeData, GraphLevel } from '@/types/graph';
import { theme } from '@/styles/theme';
import { VeracityIndicator } from './veracity';

/**
 * Get color based on veracity score (weight)
 */
const getVeracityColor = (weight: number, level: GraphLevel): CSSProperties => {
  // Level 0 nodes always get verified styling
  if (level === GraphLevel.LEVEL_0 || weight >= 1.0) {
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
 * Format veracity score for display
 */
const formatVeracity = (weight: number, level: GraphLevel): string => {
  if (level === GraphLevel.LEVEL_0 || weight >= 1.0) {
    return 'Level 0 - Verified';
  }
  return `${(weight * 100).toFixed(0)}% confidence`;
};

/**
 * GraphNode component
 */
function GraphNode({ data, selected, dragging }: NodeProps<NodeData>) {
  const { label, weight, level, isLocked, methodology, challengeCount } = data;
  const colors = getVeracityColor(weight, level);
  const hasChallenges = challengeCount && challengeCount > 0;

  return (
    <div
      style={{
        ...colors,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        minWidth: '160px',
        maxWidth: '240px',
        boxShadow: selected
          ? '0 0 0 2px #3b82f6' // blue-500 ring for selection
          : dragging
          ? theme.shadows.lg
          : theme.shadows.md,
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
          backgroundColor: theme.colors.border.primary,
          width: '12px',
          height: '12px',
          border: `2px solid ${colors.borderColor}`,
        }}
      />

      {/* Veracity Indicator in top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
        }}
      >
        <VeracityIndicator
          score={weight}
          size="xs"
          isLevel0={level === GraphLevel.LEVEL_0}
        />
      </div>

      {/* Challenge indicator (orange dot) */}
      {hasChallenges && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: 'rgba(249, 115, 22, 0.9)', // orange-500
            borderRadius: theme.radius.full,
            padding: '2px 6px',
          }}
          title={`${challengeCount} active challenge${challengeCount !== 1 ? 's' : ''}`}
        >
          <AlertCircle size={10} style={{ color: '#ffffff' }} />
          <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 600 }}>
            {challengeCount}
          </span>
        </div>
      )}

      {/* Lock icon for Level 0 or locked nodes */}
      {(level === GraphLevel.LEVEL_0 || isLocked) && (
        <div
          style={{
            position: 'absolute',
            top: hasChallenges ? '26px' : '4px',
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

      {/* Veracity badge */}
      <div
        style={{
          fontSize: '11px',
          opacity: 0.9,
          marginTop: '4px',
          color: colors.color,
        }}
      >
        {formatVeracity(weight, level)}
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
          backgroundColor: theme.colors.border.primary,
          width: '12px',
          height: '12px',
          border: `2px solid ${colors.borderColor}`,
        }}
      />
    </div>
  );
}

export default memo(GraphNode);
