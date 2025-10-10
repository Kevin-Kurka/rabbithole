import React, { useState, useMemo } from 'react';
import { theme } from '../styles/theme';

export interface VeracityHistoryEntry {
  score: number;
  timestamp: Date;
  reason: string;
  eventType?: 'evidence_added' | 'challenge_resolved' | 'consensus_changed' | 'manual_update';
}

export interface VeracityTimelineProps {
  history: VeracityHistoryEntry[];
  height?: number;
}

const getVeracityColor = (score: number): string => {
  if (score >= 0.7) return '#84cc16';
  if (score >= 0.4) return '#eab308';
  if (score >= 0.1) return '#f97316';
  return '#ef4444';
};

const eventTypeLabels = {
  evidence_added: 'Evidence Added',
  challenge_resolved: 'Challenge Resolved',
  consensus_changed: 'Consensus Changed',
  manual_update: 'Manual Update',
};

export const VeracityTimeline: React.FC<VeracityTimelineProps> = ({
  history,
  height = 200,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [history]);

  const chartData = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const minTime = sortedHistory[0].timestamp.getTime();
    const maxTime = sortedHistory[sortedHistory.length - 1].timestamp.getTime();
    const timeRange = maxTime - minTime || 1;

    return sortedHistory.map((entry) => ({
      ...entry,
      x: ((entry.timestamp.getTime() - minTime) / timeRange) * 100,
      y: (1 - entry.score) * 100,
    }));
  }, [sortedHistory]);

  if (!chartData || chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded"
        style={{
          height,
          backgroundColor: theme.colors.bg.secondary,
          color: theme.colors.text.tertiary,
        }}
      >
        No history data available
      </div>
    );
  }

  const pathData = chartData
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');

  return (
    <div
      className="relative rounded overflow-hidden"
      style={{
        height,
        backgroundColor: theme.colors.bg.secondary,
      }}
    >
      {/* Chart area */}
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <line
            key={value}
            x1="0"
            y1={value * 100}
            x2="100"
            y2={value * 100}
            stroke={theme.colors.border.primary}
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />
        ))}

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke={theme.colors.interactive.active}
          strokeWidth="0.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Area fill */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill={theme.colors.interactive.active}
          fillOpacity="0.1"
        />

        {/* Data points */}
        {chartData.map((point, index) => {
          const isSignificant = point.eventType !== undefined;
          const isHovered = hoveredIndex === index;

          return (
            <g key={index}>
              {/* Hover area */}
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Point marker */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isSignificant ? '1.2' : '0.8'}
                fill={isHovered ? '#ffffff' : getVeracityColor(point.score)}
                stroke={isHovered ? getVeracityColor(point.score) : 'none'}
                strokeWidth={isHovered ? '0.5' : '0'}
                style={{
                  transition: 'all 0.2s',
                  pointerEvents: 'none',
                }}
              />

              {/* Significant event marker */}
              {isSignificant && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="none"
                  stroke={getVeracityColor(point.score)}
                  strokeWidth="0.3"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none py-1 px-1">
        {['100%', '75%', '50%', '25%', '0%'].map((label) => (
          <span
            key={label}
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute rounded px-3 py-2 shadow-lg pointer-events-none z-10"
          style={{
            left: `${chartData[hoveredIndex].x}%`,
            top: `${chartData[hoveredIndex].y}%`,
            transform: 'translate(-50%, -120%)',
            backgroundColor: theme.colors.overlay.modal,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.primary}`,
            maxWidth: '250px',
          }}
        >
          <div className="text-sm font-semibold mb-1">
            {Math.round(chartData[hoveredIndex].score * 100)}%
          </div>
          <div className="text-xs mb-1" style={{ color: theme.colors.text.secondary }}>
            {chartData[hoveredIndex].timestamp.toLocaleString()}
          </div>
          {chartData[hoveredIndex].eventType && (
            <div className="text-xs font-medium mb-1" style={{ color: getVeracityColor(chartData[hoveredIndex].score) }}>
              {eventTypeLabels[chartData[hoveredIndex].eventType!]}
            </div>
          )}
          <div className="text-xs" style={{ color: theme.colors.text.tertiary }}>
            {chartData[hoveredIndex].reason}
          </div>
        </div>
      )}
    </div>
  );
};

export default VeracityTimeline;
