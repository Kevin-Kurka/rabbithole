/**
 * PromotionEligibilityBadge Component
 *
 * Compact badge showing promotion eligibility at a glance.
 * Color-coded with tooltip breakdown on hover.
 * Used in graph lists and preview cards.
 */

import React, { useState } from 'react';
import { Target, CheckCircle2, Info } from 'lucide-react';
import { theme } from '../styles/theme';
import {
  PromotionEligibilityBadgeData,
  getEligibilityColor,
  eligibilityColors,
} from '../types/promotion';

export interface PromotionEligibilityBadgeProps {
  graphId: string;
  eligibilityData: PromotionEligibilityBadgeData;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

/**
 * Tooltip content
 */
const TooltipContent: React.FC<{
  data: PromotionEligibilityBadgeData;
}> = ({ data }) => (
  <div
    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 rounded-lg shadow-xl z-50 w-64"
    style={{
      backgroundColor: theme.colors.bg.secondary,
      borderWidth: '1px',
      borderColor: theme.colors.border.primary,
    }}
  >
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border.primary }}>
        <span
          className="text-xs font-semibold"
          style={{ color: theme.colors.text.secondary }}
        >
          Promotion Eligibility
        </span>
        <span
          className="text-lg font-bold"
          style={{
            color: eligibilityColors[getEligibilityColor(data.overallScore)].bg,
          }}
        >
          {data.overallScore}%
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: theme.colors.text.tertiary }}>
            Criteria Met
          </span>
          <span
            className="font-semibold"
            style={{ color: theme.colors.text.primary }}
          >
            {data.criteriaMet}/{data.totalCriteria}
          </span>
        </div>
        {data.nextAction && (
          <div
            className="pt-2 mt-2 border-t text-xs"
            style={{ borderColor: theme.colors.border.primary }}
          >
            <div
              className="font-medium mb-1"
              style={{ color: theme.colors.text.secondary }}
            >
              Next Step:
            </div>
            <div style={{ color: theme.colors.text.tertiary }}>
              {data.nextAction}
            </div>
          </div>
        )}
      </div>
    </div>
    {/* Tooltip arrow */}
    <div
      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
      style={{
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `6px solid ${theme.colors.border.primary}`,
      }}
    />
  </div>
);

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    container: 'h-6 px-2 text-xs',
    icon: 12,
    score: 'text-xs',
    gap: 'gap-1',
  },
  md: {
    container: 'h-7 px-2.5 text-sm',
    icon: 14,
    score: 'text-sm',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'h-8 px-3 text-base',
    icon: 16,
    score: 'text-base',
    gap: 'gap-2',
  },
};

/**
 * Main component
 */
export const PromotionEligibilityBadge: React.FC<
  PromotionEligibilityBadgeProps
> = ({ graphId, eligibilityData, size = 'md', showTooltip = true }) => {
  const [isHovered, setIsHovered] = useState(false);

  const color = getEligibilityColor(eligibilityData.overallScore);
  const colorScheme = eligibilityColors[color];
  const config = sizeConfig[size];

  const IconComponent = eligibilityData.isEligible ? CheckCircle2 : Target;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 cursor-default ${config.container} ${config.gap}`}
        style={{
          backgroundColor: colorScheme.bg,
          color: colorScheme.text,
          borderWidth: '1px',
          borderColor: colorScheme.border,
        }}
        role="status"
        aria-label={`Promotion eligibility: ${eligibilityData.overallScore}%`}
      >
        <IconComponent size={config.icon} strokeWidth={2.5} />
        <span className={config.score}>
          {eligibilityData.overallScore}%
        </span>
        {eligibilityData.isEligible && (
          <span className="ml-0.5 text-xs font-normal opacity-90">
            Ready
          </span>
        )}
        {showTooltip && (
          <Info
            size={config.icon - 2}
            strokeWidth={2}
            className="opacity-70"
          />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <TooltipContent data={eligibilityData} />
      )}
    </div>
  );
};

/**
 * Compact version without tooltip (for tight spaces)
 */
export const PromotionEligibilityBadgeCompact: React.FC<{
  score: number;
  isEligible: boolean;
}> = ({ score, isEligible }) => {
  const color = getEligibilityColor(score);
  const colorScheme = eligibilityColors[color];

  return (
    <div
      className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs transition-all duration-200"
      style={{
        backgroundColor: colorScheme.bg,
        color: colorScheme.text,
        borderWidth: '2px',
        borderColor: colorScheme.border,
      }}
      role="status"
      aria-label={`${score}% eligible`}
      title={isEligible ? 'Eligible for promotion' : `${score}% complete`}
    >
      {isEligible ? (
        <CheckCircle2 size={16} strokeWidth={3} />
      ) : (
        <span>{score}</span>
      )}
    </div>
  );
};

export default PromotionEligibilityBadge;
