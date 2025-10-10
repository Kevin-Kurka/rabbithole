/**
 * ChallengeVotingWidget Component
 *
 * Dedicated voting interface for challenges.
 * Shows vote distribution, allows users to cast weighted votes with reasoning.
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { ChallengeVoteType, Challenge, UserReputation } from '@/types/challenge';
import {
  calculateVoteDistribution,
  getVotePercentage,
  getReputationColor,
} from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';
import { ReputationBadge } from './ReputationBadge';

export interface ChallengeVotingWidgetProps {
  challengeId: string;
  challenge?: Challenge;
  currentVotes?: { upholdWeight: number; dismissWeight: number; totalParticipants: number };
  onVote: (challengeId: string, voteType: ChallengeVoteType, reasoning?: string) => void;
  userReputation?: UserReputation;
  currentUserVote?: ChallengeVoteType | null;
  disabled?: boolean;
}

/**
 * ChallengeVotingWidget component
 */
export const ChallengeVotingWidget: React.FC<ChallengeVotingWidgetProps> = ({
  challengeId,
  challenge,
  currentVotes,
  onVote,
  userReputation,
  currentUserVote,
  disabled = false,
}) => {
  const [reasoning, setReasoning] = useState('');
  const [selectedVote, setSelectedVote] = useState<ChallengeVoteType | null>(
    currentUserVote || null
  );
  const [showReasoningInput, setShowReasoningInput] = useState(false);

  // Calculate vote distribution
  const distribution = challenge
    ? calculateVoteDistribution(challenge)
    : currentVotes || { upholdWeight: 0, dismissWeight: 0, totalParticipants: 0 };

  const upholdPercentage = getVotePercentage(distribution, 'uphold');
  const dismissPercentage = getVotePercentage(distribution, 'dismiss');

  const voteWeight = userReputation?.score || 50;
  const weightColor = getReputationColor(voteWeight);

  const handleVoteClick = (voteType: ChallengeVoteType) => {
    if (disabled) return;

    if (selectedVote === voteType) {
      // Deselect if clicking the same vote
      setSelectedVote(null);
      setShowReasoningInput(false);
    } else {
      setSelectedVote(voteType);
      setShowReasoningInput(true);
    }
  };

  const handleSubmitVote = () => {
    if (!selectedVote) return;

    onVote(challengeId, selectedVote, reasoning.trim() || undefined);
    setReasoning('');
    setShowReasoningInput(false);
  };

  const canSubmit = selectedVote !== null && !disabled;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: theme.colors.bg.primary,
        border: `1px solid ${theme.colors.border.primary}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: theme.colors.text.primary }}
        >
          Cast Your Vote
        </h3>
        {userReputation && (
          <ReputationBadge
            userId={userReputation.userId}
            reputation={userReputation}
            size="sm"
            showTooltip={true}
          />
        )}
      </div>

      {/* Vote Weight Info */}
      <div
        className="flex items-center gap-2 mb-4 p-3 rounded-lg"
        style={{ backgroundColor: theme.colors.bg.elevated }}
      >
        <Info size={16} style={{ color: theme.colors.text.tertiary }} />
        <div className="flex-1">
          <div
            className="text-sm"
            style={{ color: theme.colors.text.secondary }}
          >
            Your vote weight:
            <span
              className="font-semibold ml-1"
              style={{ color: weightColor }}
            >
              {voteWeight}
            </span>
          </div>
          <div
            className="text-xs mt-0.5"
            style={{ color: theme.colors.text.tertiary }}
          >
            Based on your reputation and contribution history
          </div>
        </div>
      </div>

      {/* Vote Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Uphold Button */}
        <button
          onClick={() => handleVoteClick(ChallengeVoteType.UPHOLD)}
          disabled={disabled || currentUserVote === ChallengeVoteType.UPHOLD}
          className="p-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              selectedVote === ChallengeVoteType.UPHOLD
                ? '#f97316'
                : theme.colors.bg.elevated,
            color:
              selectedVote === ChallengeVoteType.UPHOLD
                ? '#ffffff'
                : theme.colors.text.primary,
            border: `2px solid ${
              selectedVote === ChallengeVoteType.UPHOLD
                ? '#ea580c'
                : theme.colors.border.primary
            }`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <ThumbsDown
              size={24}
              className={selectedVote === ChallengeVoteType.UPHOLD ? 'animate-pulse' : ''}
            />
            <span className="font-semibold">Uphold Challenge</span>
            <span className="text-xs opacity-80">
              Claim has issues
            </span>
          </div>
        </button>

        {/* Dismiss Button */}
        <button
          onClick={() => handleVoteClick(ChallengeVoteType.DISMISS)}
          disabled={disabled || currentUserVote === ChallengeVoteType.DISMISS}
          className="p-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              selectedVote === ChallengeVoteType.DISMISS
                ? '#10b981'
                : theme.colors.bg.elevated,
            color:
              selectedVote === ChallengeVoteType.DISMISS
                ? '#ffffff'
                : theme.colors.text.primary,
            border: `2px solid ${
              selectedVote === ChallengeVoteType.DISMISS
                ? '#059669'
                : theme.colors.border.primary
            }`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <ThumbsUp
              size={24}
              className={selectedVote === ChallengeVoteType.DISMISS ? 'animate-pulse' : ''}
            />
            <span className="font-semibold">Dismiss Challenge</span>
            <span className="text-xs opacity-80">
              Claim is valid
            </span>
          </div>
        </button>
      </div>

      {/* Vote Distribution Bar */}
      <div className="mb-4">
        <div
          className="flex items-center justify-between text-xs mb-2"
          style={{ color: theme.colors.text.secondary }}
        >
          <span>Current Distribution</span>
          <span className="font-semibold">
            {distribution.totalParticipants} votes
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div
            className="transition-all duration-500"
            style={{
              width: `${upholdPercentage}%`,
              backgroundColor: '#f97316',
            }}
            title={`Uphold: ${upholdPercentage}%`}
          />
          <div
            className="transition-all duration-500"
            style={{
              width: `${dismissPercentage}%`,
              backgroundColor: '#10b981',
            }}
            title={`Dismiss: ${dismissPercentage}%`}
          />
        </div>
        <div
          className="flex justify-between text-xs mt-1"
          style={{ color: theme.colors.text.tertiary }}
        >
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
            {upholdPercentage}% Uphold ({distribution.upholdWeight.toFixed(0)} weight)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
            {dismissPercentage}% Dismiss ({distribution.dismissWeight.toFixed(0)} weight)
          </span>
        </div>
      </div>

      {/* Reasoning Input (conditional) */}
      {showReasoningInput && (
        <div className="mb-4">
          <label
            className="block text-sm font-semibold mb-2"
            style={{ color: theme.colors.text.secondary }}
            htmlFor="vote-reasoning"
          >
            Explain your vote (optional)
          </label>
          <textarea
            id="vote-reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Why do you believe this challenge should be upheld or dismissed?"
            className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-colors"
            style={{
              backgroundColor: theme.colors.input.bg,
              border: `1px solid ${theme.colors.input.border}`,
              color: theme.colors.text.primary,
              minHeight: '80px',
            }}
            rows={3}
          />
        </div>
      )}

      {/* Submit Button */}
      {showReasoningInput && (
        <button
          onClick={handleSubmitVote}
          disabled={!canSubmit}
          className="w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: canSubmit ? '#3b82f6' : theme.colors.bg.elevated,
            color: '#ffffff',
            border: `1px solid ${canSubmit ? '#2563eb' : theme.colors.border.primary}`,
          }}
        >
          Submit Vote
        </button>
      )}

      {/* Already Voted Message */}
      {currentUserVote && !showReasoningInput && (
        <div
          className="p-3 rounded-lg text-center text-sm"
          style={{
            backgroundColor: theme.colors.bg.elevated,
            color: theme.colors.text.secondary,
          }}
        >
          You have voted to{' '}
          <span className="font-semibold">
            {currentUserVote === ChallengeVoteType.UPHOLD ? 'uphold' : 'dismiss'}
          </span>{' '}
          this challenge
        </div>
      )}
    </div>
  );
};

export default ChallengeVotingWidget;
