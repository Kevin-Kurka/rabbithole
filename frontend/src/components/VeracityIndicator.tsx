import React, { useState } from 'react';
import { theme } from '../styles/theme';

export interface VeracityIndicatorProps {
  score: number;
  size?: 'xs' | 'sm';
  isLevel0?: boolean;
}

const getVeracityColor = (score: number, isLevel0: boolean): string => {
  if (isLevel0) return '#10b981';
  if (score >= 0.7) return '#84cc16';
  if (score >= 0.4) return '#eab308';
  if (score >= 0.1) return '#f97316';
  return '#ef4444';
};

const sizeConfig = {
  xs: {
    dot: 'w-2 h-2',
    ring: 'w-3 h-3',
  },
  sm: {
    dot: 'w-3 h-3',
    ring: 'w-4 h-4',
  },
};

export const VeracityIndicator: React.FC<VeracityIndicatorProps> = ({
  score,
  size = 'sm',
  isLevel0 = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const color = getVeracityColor(score, isLevel0);
  const config = sizeConfig[size];
  const percentage = Math.round(score * 100);

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="status"
      aria-label={`Veracity score: ${percentage}%`}
    >
      {/* Outer ring on hover */}
      <div
        className={`absolute transition-opacity duration-200 rounded-full ${config.ring}`}
        style={{
          opacity: isHovered ? 0.3 : 0,
          backgroundColor: color,
        }}
      />

      {/* Main dot */}
      <div
        className={`rounded-full transition-all duration-200 ${config.dot}`}
        style={{
          backgroundColor: color,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      />

      {/* Tooltip on hover */}
      {isHovered && (
        <div
          className="absolute bottom-full mb-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
          style={{
            backgroundColor: theme.colors.overlay.modal,
            color: theme.colors.text.primary,
            boxShadow: theme.shadows.md,
          }}
        >
          {percentage}% {isLevel0 && '(Verified)'}
        </div>
      )}
    </div>
  );
};

export default VeracityIndicator;
