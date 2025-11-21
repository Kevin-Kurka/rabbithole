/**
 * ChallengeCard Component
 *
 * Compact view of a single challenge with expandable details.
 * Shows type badge, status, vote buttons, and current vote score.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Challenge, ChallengeVoteType } from '@/types/challenge';
import {
  getChallengeTypeInfo,
  getStatusColor,
  getStatusLabel,
  calculateVoteDistribution,
  getVotePercentage,
  formatTimeAgo,
} from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';
import { ReputationBadge } from './reputation-badge';

export interface ChallengeCardProps {
  challenge: Challenge;
  onVote?: (challengeId: string, voteType: ChallengeVoteType) => void;
  onExpand?: (challengeId: string) => void;
  currentUserId?: string;
  currentUserVote?: ChallengeVoteType | null;
  expanded?: boolean;
}

/**
 * ChallengeCard component
 */
export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onVote,
  onExpand,
  currentUserId,
  currentUserVote,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const typeInfo = getChallengeTypeInfo(challenge.type);
  const statusColor = getStatusColor(challenge.status);
  const statusLabel = getStatusLabel(challenge.status);
  const voteDistribution = calculateVoteDistribution(challenge);
  const upholdPercentage = getVotePercentage(voteDistribution, 'uphold');
  const dismissPercentage = getVotePercentage(voteDistribution, 'dismiss');

  // Get icon component
  const IconComponent = (Icons as any)[typeInfo.icon] || Icons.AlertCircle;

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand(challenge.id);
    }
  };

  const handleVote = (voteType: ChallengeVoteType) => {
    if (onVote) {
      onVote(challenge.id, voteType);
    }
  };

  const isVotingDisabled = challenge.status !== 'open' && challenge.status !== 'under_review';

  return (
    <div
      className="rounded-lg p-4 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: theme.colors.bg.primary,
        border: `1px solid ${theme.colors.border.primary}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${typeInfo.color}20`,
            color: typeInfo.color,
          }}
        >
          <IconComponent size={20} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Type and Status Badges */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: `${typeInfo.color}20`,
                color: typeInfo.color,
              }}
            >
              {typeInfo.name}
            </span>
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Creator and Date */}
          <div
            className="text-sm mb-2"
            style={{ color: theme.colors.text.secondary }}
          >
            by <span className="font-semibold">{challenge.createdByName || 'Anonymous'}</span>
            {' · '}
            {formatTimeAgo(challenge.createdAt)}
          </div>

          {/* Evidence Preview (collapsed) */}
          {!isExpanded && (
            <div
              className="text-sm line-clamp-2"
              style={{ color: theme.colors.text.tertiary }}
            >
              {challenge.evidence}
            </div>
          )}

          {/* Vote Score */}
          <div className="mt-3">
            <div
              className="flex items-center justify-between text-xs mb-1"
              style={{ color: theme.colors.text.secondary }}
            >
              <span>Vote Distribution</span>
              <span className="font-semibold">
                {voteDistribution.totalParticipants} votes
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div
                className="transition-all duration-300"
                style={{
                  width: `${upholdPercentage}%`,
                  backgroundColor: '#f97316', // orange-500
                }}
                title={`Uphold: ${upholdPercentage}%`}
              />
              <div
                className="transition-all duration-300"
                style={{
                  width: `${dismissPercentage}%`,
                  backgroundColor: '#10b981', // green-500
                }}
                title={`Dismiss: ${dismissPercentage}%`}
              />
            </div>
            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: theme.colors.text.tertiary }}
            >
              <span>{upholdPercentage}% Uphold</span>
              <span>{dismissPercentage}% Dismiss</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className="flex-shrink-0 p-1 rounded hover:bg-zinc-700 transition-colors"
          style={{ color: theme.colors.text.secondary }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.colors.border.primary}` }}>
          {/* Full Evidence */}
          <div className="mb-4">
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
            >
              Evidence
            </div>
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: theme.colors.text.primary }}
            >
              {challenge.evidence}
            </div>
          </div>

          {/* Reasoning */}
          <div className="mb-4">
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
            >
              Reasoning
            </div>
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: theme.colors.text.primary }}
            >
              {challenge.reasoning}
            </div>
          </div>

          {/* Claim Reference */}
          {challenge.claimReference && (
            <div className="mb-4">
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: theme.colors.text.secondary }}
              >
                Specific Claim
              </div>
              <div
                className="text-sm italic p-2 rounded"
                style={{
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.bg.elevated,
                }}
              >
                "{challenge.claimReference}"
              </div>
            </div>
          )}

          {/* Vote Buttons */}
          {!isVotingDisabled && (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote(ChallengeVoteType.UPHOLD)}
                disabled={currentUserVote === ChallengeVoteType.UPHOLD}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor:
                    currentUserVote === ChallengeVoteType.UPHOLD
                      ? '#f97316'
                      : theme.colors.bg.elevated,
                  color:
                    currentUserVote === ChallengeVoteType.UPHOLD
                      ? '#ffffff'
                      : theme.colors.text.primary,
                  border: `1px solid ${
                    currentUserVote === ChallengeVoteType.UPHOLD
                      ? '#ea580c'
                      : theme.colors.border.primary
                  }`,
                }}
              >
                Uphold Challenge
              </button>
              <button
                onClick={() => handleVote(ChallengeVoteType.DISMISS)}
                disabled={currentUserVote === ChallengeVoteType.DISMISS}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  backgroundColor:
                    currentUserVote === ChallengeVoteType.DISMISS
                      ? '#10b981'
                      : theme.colors.bg.elevated,
                  color:
                    currentUserVote === ChallengeVoteType.DISMISS
                      ? '#ffffff'
                      : theme.colors.text.primary,
                  border: `1px solid ${
                    currentUserVote === ChallengeVoteType.DISMISS
                      ? '#059669'
                      : theme.colors.border.primary
                  }`,
                }}
              >
                Dismiss Challenge
              </button>
            </div>
          )}

          {/* Resolution (if resolved) */}
          {challenge.resolution && (
            <div
              className="mt-4 p-3 rounded-lg"
              style={{
                backgroundColor: theme.colors.bg.elevated,
                border: `1px solid ${statusColor}`,
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: statusColor }}
              >
                Resolution: {challenge.resolution.outcome.toUpperCase()}
              </div>
              <div
                className="text-sm"
                style={{ color: theme.colors.text.primary }}
              >
                {challenge.resolution.reasoning}
              </div>
              {challenge.resolution.veracityImpact !== undefined && (
                <div
                  className="text-xs mt-2"
                  style={{ color: theme.colors.text.tertiary }}
                >
                  Veracity score adjusted by {challenge.resolution.veracityImpact > 0 ? '+' : ''}
                  {(challenge.resolution.veracityImpact * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallengeCard;
