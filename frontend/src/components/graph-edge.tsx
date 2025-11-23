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
import { EdgeData, isHighCredibility } from '@/types/graph';
import { theme } from '@/styles/theme';
import { VeracityIndicator } from './veracity';

/**
 * Get edge color based on veracity score
 */
const getEdgeColor = (weight: number): string => {
  if (weight >= 0.90) {
    return '#10b981'; // green-500 - High credibility
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
 * Get edge stroke width based on weight and selection
 */
const getStrokeWidth = (weight: number, selected: boolean): number => {
  if (selected) return 3;
  if (isHighCredibility(weight)) return 2.5;
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
  const { label, weight = 0.5, isLocked } = data || {};

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = getEdgeColor(weight);
  const strokeWidth = getStrokeWidth(weight, selected || false);
  const highCredibility = isHighCredibility(weight);

  // Animate low-confidence edges
  const shouldAnimate = !highCredibility && weight < 0.4;

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
            isLevel0={highCredibility}
          />

          {(highCredibility || isLocked) && (
            <Lock size={10} style={{ color: edgeColor }} />
          )}
          {label && <span>{label}</span>}
          {!label && (
            <span style={{ color: theme.colors.text.tertiary }}>
              {highCredibility
                ? 'High Credibility'
                : `${(weight * 100).toFixed(0)}%`}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(GraphEdge);
