/**
 * ConsensusVotingWidget Component
 *
 * Shows community consensus voting with transparent vote weights.
 * Vote weights based on evidence quality, not authority.
 * Users can see their own reputation and submit votes.
 */

import React, { useState } from 'react';
import { Users, TrendingUp, MessageSquare, Send, Award } from 'lucide-react';
import { theme } from '../styles/theme';
import { ConsensusVote } from '../types/promotion';

export interface ConsensusVotingWidgetProps {
  graphId: string;
  overallScore: number;
  voteCount: number;
  votes: ConsensusVote[];
  targetConsensus: number;
  userVote?: {
    confidence: number;
    reasoning: string;
  };
  userReputation?: {
    score: number;
    level: number;
    canVote: boolean;
  };
  onSubmitVote?: (confidence: number, reasoning: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Individual vote display
 */
const VoteItem: React.FC<{ vote: ConsensusVote; isHighlighted?: boolean }> = ({
  vote,
  isHighlighted = false,
}) => {
  const voteColor = vote.confidence >= 70 ? '#10b981' : vote.confidence >= 40 ? '#eab308' : '#f97316';

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isHighlighted ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        backgroundColor: isHighlighted
          ? theme.colors.bg.elevated
          : theme.colors.bg.secondary,
        borderColor: theme.colors.border.primary,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: theme.colors.text.primary }}
          >
            {vote.username}
          </span>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs flex-shrink-0"
            style={{
              backgroundColor: theme.colors.bg.elevated,
              color: theme.colors.text.tertiary,
            }}
          >
            <Award size={10} />
            <span>{vote.reputationScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-lg font-bold"
            style={{ color: voteColor }}
          >
            {vote.confidence}%
          </span>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: theme.colors.bg.elevated,
              color: theme.colors.text.tertiary,
            }}
          >
            Weight: {vote.voteWeight.toFixed(2)}
          </span>
        </div>
      </div>
      {vote.reasoning && (
        <div
          className="flex items-start gap-2 mt-2 pt-2 border-t"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <MessageSquare
            size={14}
            style={{ color: theme.colors.text.tertiary, flexShrink: 0, marginTop: '2px' }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: theme.colors.text.secondary }}
          >
            {vote.reasoning}
          </p>
        </div>
      )}
      <div
        className="text-xs mt-2"
        style={{ color: theme.colors.text.muted }}
      >
        {new Date(vote.votedAt).toLocaleString()}
      </div>
    </div>
  );
};

/**
 * Consensus score display
 */
const ConsensusScoreDisplay: React.FC<{
  score: number;
  target: number;
  voteCount: number;
}> = ({ score, target, voteCount }) => {
  const isMet = score >= target;
  const scoreColor = isMet ? '#10b981' : score >= target * 0.7 ? '#eab308' : '#f97316';

  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.elevated,
        borderColor: theme.colors.border.primary,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} style={{ color: scoreColor }} />
          <span
            className="text-sm font-medium"
            style={{ color: theme.colors.text.secondary }}
          >
            Community Consensus
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={16} style={{ color: theme.colors.text.tertiary }} />
          <span
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <div
            className="text-4xl font-bold mb-1"
            style={{ color: scoreColor }}
          >
            {score}%
          </div>
          <div
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            Target: {target}%
          </div>
        </div>
        {isMet && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full mb-1"
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
            }}
          >
            <span className="text-xs font-semibold">Consensus Met</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Vote submission form
 */
const VoteForm: React.FC<{
  userReputation?: { score: number; canVote: boolean };
  existingVote?: { confidence: number; reasoning: string };
  onSubmit: (confidence: number, reasoning: string) => Promise<void>;
  loading: boolean;
}> = ({ userReputation, existingVote, onSubmit, loading }) => {
  const [confidence, setConfidence] = useState(existingVote?.confidence || 50);
  const [reasoning, setReasoning] = useState(existingVote?.reasoning || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userReputation?.canVote || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(confidence, reasoning);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canVote = userReputation?.canVote ?? false;
  const sliderColor = confidence >= 70 ? '#10b981' : confidence >= 40 ? '#eab308' : '#f97316';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-sm font-medium"
            style={{ color: theme.colors.text.secondary }}
            htmlFor="confidence-slider"
          >
            Your Confidence Level
          </label>
          <span
            className="text-lg font-bold"
            style={{ color: sliderColor }}
          >
            {confidence}%
          </span>
        </div>
        <input
          id="confidence-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          value={confidence}
          onChange={(e) => setConfidence(parseInt(e.target.value))}
          disabled={!canVote || loading}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${confidence}%, ${theme.colors.bg.elevated} ${confidence}%, ${theme.colors.bg.elevated} 100%)`,
          }}
        />
      </div>

      <div>
        <label
          className="text-sm font-medium block mb-2"
          style={{ color: theme.colors.text.secondary }}
          htmlFor="reasoning-textarea"
        >
          Reasoning (Optional)
        </label>
        <textarea
          id="reasoning-textarea"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Explain your confidence level..."
          disabled={!canVote || loading}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
          style={{
            backgroundColor: theme.colors.input.bg,
            borderColor: theme.colors.input.border,
            color: theme.colors.text.primary,
          }}
        />
      </div>

      {userReputation && (
        <div
          className="flex items-center justify-between p-3 rounded-lg"
          style={{
            backgroundColor: theme.colors.bg.elevated,
          }}
        >
          <span
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            Your Reputation Score
          </span>
          <div className="flex items-center gap-2">
            <Award size={16} style={{ color: '#eab308' }} />
            <span
              className="text-sm font-bold"
              style={{ color: theme.colors.text.primary }}
            >
              {userReputation.score}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canVote || isSubmitting || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canVote ? sliderColor : theme.colors.bg.elevated,
          color: '#ffffff',
        }}
      >
        <Send size={16} />
        <span>{existingVote ? 'Update Vote' : 'Submit Vote'}</span>
      </button>

      {!canVote && (
        <p
          className="text-xs text-center"
          style={{ color: theme.colors.text.muted }}
        >
          You need a minimum reputation score to vote
        </p>
      )}
    </form>
  );
};

/**
 * Main component
 */
export const ConsensusVotingWidget: React.FC<ConsensusVotingWidgetProps> = ({
  graphId,
  overallScore,
  voteCount,
  votes,
  targetConsensus,
  userVote,
  userReputation,
  onSubmitVote,
  loading = false,
}) => {
  const sortedVotes = [...votes].sort(
    (a, b) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime()
  );

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.primary,
      }}
      role="region"
      aria-label="Consensus voting widget"
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: theme.colors.border.primary }}
      >
        <h3
          className="text-base font-semibold mb-1"
          style={{ color: theme.colors.text.primary }}
        >
          Community Consensus
        </h3>
        <p className="text-xs" style={{ color: theme.colors.text.tertiary }}>
          Vote weights based on evidence quality and reputation
        </p>
      </div>

      {/* Consensus Score */}
      <div className="p-4">
        <ConsensusScoreDisplay
          score={overallScore}
          target={targetConsensus}
          voteCount={voteCount}
        />
      </div>

      {/* Vote Form */}
      {onSubmitVote && (
        <div
          className="p-4 border-t border-b"
          style={{ borderColor: theme.colors.border.primary }}
        >
          <VoteForm
            userReputation={userReputation}
            existingVote={userVote}
            onSubmit={onSubmitVote}
            loading={loading}
          />
        </div>
      )}

      {/* Votes List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {sortedVotes.length > 0 ? (
          sortedVotes.map((vote) => (
            <VoteItem
              key={vote.userId}
              vote={vote}
              isHighlighted={userVote && vote.userId === 'current-user'}
            />
          ))
        ) : (
          <div
            className="text-center py-8"
            style={{ color: theme.colors.text.tertiary }}
          >
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No votes yet. Be the first to vote!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsensusVotingWidget;
