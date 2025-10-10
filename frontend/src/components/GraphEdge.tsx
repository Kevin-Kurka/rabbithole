/**
 * GraphEdge Component
 *
 * Custom edge component for React Flow with:
 * - Veracity score color coding
 * - Level 0/1 visual distinction
 * - Lock icons for read-only edges
 * - Edge labels with veracity scores
 */

import React, { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { Lock } from 'lucide-react';
import { EdgeData, GraphLevel } from '@/types/graph';
import { theme } from '@/styles/theme';
import { VeracityIndicator } from './veracity';

/**
 * Get edge color based on veracity score
 */
const getEdgeColor = (weight: number, level: GraphLevel): string => {
  if (level === GraphLevel.LEVEL_0 || weight >= 1.0) {
    return '#10b981'; // green-500
  }

  if (weight >= 0.7) {
    return '#84cc16'; // lime-500
  }

  if (weight >= 0.4) {
    return '#eab308'; // yellow-500
  }

  if (weight >= 0.1) {
    return '#f97316'; // orange-500
  }

  return '#ef4444'; // red-500
};

/**
 * Get edge stroke width based on level and selection
 */
const getStrokeWidth = (level: GraphLevel, selected: boolean): number => {
  if (selected) return 3;
  if (level === GraphLevel.LEVEL_0) return 2.5;
  return 2;
};

/**
 * GraphEdge component
 */
function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<EdgeData>) {
  const { label, weight, level, isLocked } = data || {
    weight: 0.5,
    level: GraphLevel.LEVEL_1,
    isLocked: false,
  };

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = getEdgeColor(weight, level);
  const strokeWidth = getStrokeWidth(level, selected || false);

  // Animate low-confidence edges
  const shouldAnimate = level === GraphLevel.LEVEL_1 && weight < 0.4;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray: shouldAnimate ? '5,5' : undefined,
          animation: shouldAnimate ? 'dashdraw 0.5s linear infinite' : undefined,
          opacity: isLocked ? 0.7 : 1,
        }}
      />

      {/* Edge label with veracity score */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: '11px',
            pointerEvents: 'all',
            backgroundColor: theme.colors.bg.primary,
            padding: '2px 6px',
            borderRadius: theme.radius.sm,
            border: `1px solid ${edgeColor}`,
            color: theme.colors.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: theme.shadows.sm,
          }}
          className="nodrag nopan"
        >
          {/* Veracity indicator dot */}
          <VeracityIndicator
            score={weight}
            size="xs"
            isLevel0={level === GraphLevel.LEVEL_0}
          />

          {(level === GraphLevel.LEVEL_0 || isLocked) && (
            <Lock size={10} style={{ color: edgeColor }} />
          )}
          {label && <span>{label}</span>}
          {!label && (
            <span style={{ color: theme.colors.text.tertiary }}>
              {level === GraphLevel.LEVEL_0 || weight >= 1.0
                ? 'Verified'
                : `${(weight * 100).toFixed(0)}%`}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(GraphEdge);
