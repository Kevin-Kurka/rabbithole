'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { VOTE_ON_CHALLENGE, GET_CHALLENGE_VOTES } from '@/graphql/mutations';

// ============================================================================
// Types
// ============================================================================

interface ChallengeVotingProps {
  challengeId: string;
  currentUserId: string;
  onVoteComplete?: () => void;
}

interface Challenge {
  id: string;
  votes: Vote[];
  consensus: number | null;
  status: string;
}

interface Vote {
  voterId: string;
  voteType: 'UPHOLD' | 'OVERTURN' | 'ABSTAIN';
  confidence: number;
  voteWeight: number;
  voter: {
    username: string;
    reputation: number;
  };
}

type VoteType = 'UPHOLD' | 'OVERTURN' | 'ABSTAIN';

// ============================================================================
// Main Component
// ============================================================================

export default function ChallengeVoting({
  challengeId,
  currentUserId,
  onVoteComplete,
}: ChallengeVotingProps) {
  // State
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [confidence, setConfidence] = useState<number>(0.8);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // GraphQL
  const { data, loading, refetch } = useQuery(GET_CHALLENGE_VOTES, {
    variables: { challengeId },
  });

  const [voteOnChallenge, { loading: voting }] = useMutation(VOTE_ON_CHALLENGE, {
    onCompleted: () => {
      setHasVoted(true);
      setShowVoteModal(false);
      refetch();
      onVoteComplete?.();
    },
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const challenge: Challenge | null = data?.challenge || null;
  const currentUserVote = challenge?.votes.find((v) => v.voterId === currentUserId);

  const upholdVotes = challenge?.votes.filter((v) => v.voteType === 'UPHOLD') || [];
  const overturnVotes = challenge?.votes.filter((v) => v.voteType === 'OVERTURN') || [];
  const abstainVotes = challenge?.votes.filter((v) => v.voteType === 'ABSTAIN') || [];

  const upholdWeight = upholdVotes.reduce((sum, v) => sum + v.voteWeight, 0);
  const overturnWeight = overturnVotes.reduce((sum, v) => sum + v.voteWeight, 0);
  const totalWeight = upholdWeight + overturnWeight;

  const upholdPercentage = totalWeight > 0 ? (upholdWeight / totalWeight) * 100 : 0;
  const overturnPercentage = totalWeight > 0 ? (overturnWeight / totalWeight) * 100 : 0;

  // Consensus threshold (99%)
  const CONSENSUS_THRESHOLD = 99;
  const hasConsensus = challenge?.consensus !== null && challenge.consensus >= CONSENSUS_THRESHOLD;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleOpenVoteModal = (voteType: VoteType) => {
    setSelectedVote(voteType);
    setShowVoteModal(true);
  };

  const handleSubmitVote = async () => {
    if (!selectedVote) return;

    try {
      await voteOnChallenge({
        variables: {
          challengeId,
          voteType: selectedVote,
          confidence,
        },
      });
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderVoteButton = (
    voteType: VoteType,
    label: string,
    description: string,
    color: string,
    icon: string
  ) => {
    const isSelected = currentUserVote?.voteType === voteType;
    const isDisabled = currentUserVote !== undefined;

    return (
      <button
        onClick={() => !isDisabled && handleOpenVoteModal(voteType)}
        disabled={isDisabled}
        className={`
          relative p-6 rounded-xl border-2 transition-all
          ${isSelected ? `border-${color}-500 bg-${color}-50` : 'border-gray-200 bg-white'}
          ${!isDisabled ? `hover:border-${color}-400 hover:shadow-md` : 'opacity-60 cursor-not-allowed'}
        `}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="text-4xl">{icon}</div>
          <div>
            <h3 className={`text-lg font-semibold ${isSelected ? `text-${color}-900` : 'text-gray-800'}`}>
              {label}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          {isSelected && (
            <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              ✓ Your Vote
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderVoteDistribution = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Vote Distribution</h3>

      {/* Uphold Votes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            ✅ Uphold ({upholdVotes.length} votes)
          </span>
          <span className="text-sm font-semibold text-green-600">
            {upholdPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${upholdPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Overturn Votes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            ❌ Overturn ({overturnVotes.length} votes)
          </span>
          <span className="text-sm font-semibold text-red-600">
            {overturnPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${overturnPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Abstain Votes */}
      {abstainVotes.length > 0 && (
        <div className="text-sm text-gray-600">
          🤷 {abstainVotes.length} abstain vote{abstainVotes.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Consensus Status */}
      <div
        className={`mt-4 p-4 rounded-lg ${
          hasConsensus
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-semibold ${hasConsensus ? 'text-green-900' : 'text-yellow-900'}`}>
              {hasConsensus ? '✓ Consensus Reached' : '⏳ Voting in Progress'}
            </h4>
            <p className={`text-sm mt-1 ${hasConsensus ? 'text-green-700' : 'text-yellow-700'}`}>
              {hasConsensus
                ? `${challenge?.consensus?.toFixed(1)}% agreement - Challenge will be ${
                    upholdPercentage > overturnPercentage ? 'upheld' : 'overturned'
                  }`
                : `${CONSENSUS_THRESHOLD}% agreement needed for consensus`}
            </p>
          </div>
          {hasConsensus && (
            <div className="text-3xl">
              {upholdPercentage > overturnPercentage ? '✅' : '❌'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderVoterList = () => {
    if (!challenge || challenge.votes.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No votes yet. Be the first to vote!</p>
        </div>
      );
    }

    // Sort by vote weight (reputation-weighted)
    const sortedVotes = [...challenge.votes].sort((a, b) => b.voteWeight - a.voteWeight);

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800">Voter Details</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedVotes.map((vote) => (
            <div
              key={vote.voterId}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    vote.voteType === 'UPHOLD'
                      ? 'bg-green-100'
                      : vote.voteType === 'OVERTURN'
                      ? 'bg-red-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {vote.voteType === 'UPHOLD' ? '✅' : vote.voteType === 'OVERTURN' ? '❌' : '🤷'}
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    {vote.voter.username}
                    {vote.voterId === currentUserId && (
                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Reputation: {vote.voter.reputation} • Confidence: {(vote.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-800">
                  {vote.voteWeight.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">Vote Weight</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVoteModal = () => {
    if (!showVoteModal || !selectedVote) return null;

    const voteDetails = {
      UPHOLD: {
        label: 'Uphold Challenge',
        description: 'You believe this challenge is valid and should be accepted',
        color: 'green',
        icon: '✅',
      },
      OVERTURN: {
        label: 'Overturn Challenge',
        description: 'You believe this challenge is invalid and should be rejected',
        color: 'red',
        icon: '❌',
      },
      ABSTAIN: {
        label: 'Abstain',
        description: 'You choose not to vote on this challenge',
        color: 'gray',
        icon: '🤷',
      },
    };

    const details = voteDetails[selectedVote];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{details.label}</h2>
            <button
              onClick={() => setShowVoteModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-4xl">{details.icon}</div>
              <p className="text-gray-700">{details.description}</p>
            </div>

            {/* Confidence Slider */}
            {selectedVote !== 'ABSTAIN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Level: {(confidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            )}

            {/* Reputation-Weighted Voting Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How Voting Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your vote is weighted by your reputation</li>
                <li>• Higher confidence = more impact on consensus</li>
                <li>• 99% consensus required to resolve challenge</li>
                <li>• Fair voting prevents gaming and Sybil attacks</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowVoteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={voting}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition-colors ${
                  voting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `bg-${details.color}-600 hover:bg-${details.color}-700`
                }`}
              >
                {voting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Challenge not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voting Buttons */}
      {!currentUserVote && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Cast Your Vote</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderVoteButton(
              'UPHOLD',
              'Uphold',
              'Challenge is valid',
              'green',
              '✅'
            )}
            {renderVoteButton(
              'OVERTURN',
              'Overturn',
              'Challenge is invalid',
              'red',
              '❌'
            )}
            {renderVoteButton(
              'ABSTAIN',
              'Abstain',
              'No strong opinion',
              'gray',
              '🤷'
            )}
          </div>
        </div>
      )}

      {/* Vote Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {renderVoteDistribution()}
      </div>

      {/* Voter List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {renderVoterList()}
      </div>

      {/* Vote Modal */}
      {renderVoteModal()}
    </div>
  );
}
