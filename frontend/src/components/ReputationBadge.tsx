/**
 * ReputationBadge Component
 *
 * Displays user reputation score with color coding and detailed breakdown.
 * Shows score from 0-100 with tooltip containing breakdown of reputation factors.
 */

import React, { useState } from 'react';
import { UserReputation } from '@/types/challenge';
import { getReputationColor, getReputationLabel } from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';

export interface ReputationBadgeProps {
  userId: string;
  reputation?: UserReputation;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'h-6 px-2',
    text: 'text-xs',
    badge: 'w-16',
  },
  md: {
    container: 'h-8 px-3',
    text: 'text-sm',
    badge: 'w-20',
  },
  lg: {
    container: 'h-10 px-4',
    text: 'text-base',
    badge: 'w-24',
  },
};

/**
 * ReputationBadge component
 */
export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  userId,
  reputation,
  size = 'md',
  showLabel = true,
  showTooltip = true,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Default reputation if not provided
  const score = reputation?.score ?? 50;
  const breakdown = reputation?.breakdown ?? {
    evidenceQuality: 50,
    voteAccuracy: 50,
    participationLevel: 50,
    communityTrust: 50,
  };

  const color = getReputationColor(score);
  const label = getReputationLabel(score);
  const config = sizeConfig[size];

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => showTooltip && setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      <div
        className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 ${config.container} ${config.badge}`}
        style={{
          backgroundColor: color,
          color: '#ffffff',
        }}
        role="status"
        aria-label={`Reputation: ${score} - ${label}`}
      >
        <span className={config.text}>{score}</span>
        {showLabel && size !== 'sm' && (
          <span className={`ml-1 ${config.text} opacity-90`}>REP</span>
        )}
      </div>

      {/* Tooltip with breakdown */}
      {showTooltip && showBreakdown && (
        <div
          className="absolute z-50 w-64 p-4 rounded-lg shadow-xl"
          style={{
            backgroundColor: theme.colors.overlay.modal,
            border: `1px solid ${theme.colors.border.primary}`,
            top: '100%',
            marginTop: theme.spacing.sm,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: theme.colors.text.primary }}
          >
            Reputation Breakdown
          </div>

          <div className="space-y-2">
            <ReputationBreakdownItem
              label="Evidence Quality"
              value={breakdown.evidenceQuality}
            />
            <ReputationBreakdownItem
              label="Vote Accuracy"
              value={breakdown.voteAccuracy}
            />
            <ReputationBreakdownItem
              label="Participation"
              value={breakdown.participationLevel}
            />
            <ReputationBreakdownItem
              label="Community Trust"
              value={breakdown.communityTrust}
            />
          </div>

          <div
            className="mt-3 pt-3 text-xs"
            style={{
              borderTop: `1px solid ${theme.colors.border.primary}`,
              color: theme.colors.text.tertiary,
            }}
          >
            <div className="flex justify-between">
              <span>Level:</span>
              <span className="font-semibold" style={{ color }}>
                {label}
              </span>
            </div>
            {reputation?.rank && (
              <div className="flex justify-between mt-1">
                <span>Rank:</span>
                <span className="font-semibold">{reputation.rank}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Reputation breakdown item with progress bar
 */
interface ReputationBreakdownItemProps {
  label: string;
  value: number;
}

const ReputationBreakdownItem: React.FC<ReputationBreakdownItemProps> = ({
  label,
  value,
}) => {
  const color = getReputationColor(value);

  return (
    <div>
      <div
        className="flex justify-between text-xs mb-1"
        style={{ color: theme.colors.text.secondary }}
      >
        <span>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.colors.bg.elevated }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

export default ReputationBadge;
