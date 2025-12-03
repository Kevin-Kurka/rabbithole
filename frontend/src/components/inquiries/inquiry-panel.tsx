/**
 * ChallengePanel Component
 *
 * Shows list of challenges for a selected node or edge.
 * Groups challenges by status and provides filtering options.
 */

import React, { useState } from 'react';
import { AlertCircle, Filter, Plus } from 'lucide-react';
import { Challenge, ChallengeStatus, ChallengeType } from '@/types/challenge';
import { groupChallengesByStatus, sortChallenges } from '@/utils/challengeHelpers';
import { theme } from '@/styles/theme';
import { ChallengeCard } from './challenge-card';
import { ChallengeForm } from './forms/challenge-form';

export interface ChallengePanelProps {
  nodeId?: string;
  edgeId?: string;
  challenges: Challenge[];
  onCreateChallenge?: (input: any) => void;
  onVote?: (challengeId: string, voteType: any) => void;
  currentUserId?: string;
  loading?: boolean;
}

type FilterOption = 'all' | ChallengeStatus;

/**
 * ChallengePanel component
 */
export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  nodeId,
  edgeId,
  challenges,
  onCreateChallenge,
  onVote,
  currentUserId,
  loading = false,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  const targetId = nodeId || edgeId;
  const targetType = nodeId ? 'node' : 'edge';

  // Filter and sort challenges
  const filteredChallenges =
    filter === 'all'
      ? challenges
      : challenges.filter((c) => c.status === filter);

  const sortedChallenges = sortChallenges(filteredChallenges);
  const groupedChallenges = groupChallengesByStatus(sortedChallenges);

  // Count challenges by status
  const statusCounts = {
    all: challenges.length,
    [ChallengeStatus.OPEN]: groupedChallenges[ChallengeStatus.OPEN].length,
    [ChallengeStatus.UNDER_REVIEW]: groupedChallenges[ChallengeStatus.UNDER_REVIEW].length,
    [ChallengeStatus.RESOLVED]: groupedChallenges[ChallengeStatus.RESOLVED].length,
    [ChallengeStatus.DISMISSED]: groupedChallenges[ChallengeStatus.DISMISSED].length,
  };

  const handleCreateChallenge = (input: any) => {
    if (onCreateChallenge) {
      onCreateChallenge(input);
    }
    setShowCreateForm(false);
  };

  return (
    <div
      className="h-full flex flex-col rounded-lg"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        border: `1px solid ${theme.colors.border.primary}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottom: `1px solid ${theme.colors.border.primary}` }}
      >
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text.primary }}
          >
            Challenges
          </h2>
          <div
            className="text-sm mt-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            {challenges.length} total challenge{challenges.length !== 1 ? 's' : ''}
          </div>
        </div>
        {onCreateChallenge && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200"
            style={{
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: '1px solid #ea580c',
            }}
          >
            <Plus size={18} />
            New Challenge
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto"
        style={{ borderBottom: `1px solid ${theme.colors.border.primary}` }}
      >
        <Filter size={16} style={{ color: theme.colors.text.tertiary }} />
        <button
          onClick={() => setFilter('all')}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              filter === 'all' ? theme.colors.bg.elevated : 'transparent',
            color:
              filter === 'all'
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          All ({statusCounts.all})
        </button>
        <button
          onClick={() => setFilter(ChallengeStatus.OPEN)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              filter === ChallengeStatus.OPEN
                ? theme.colors.bg.elevated
                : 'transparent',
            color:
              filter === ChallengeStatus.OPEN
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          Open ({statusCounts[ChallengeStatus.OPEN]})
        </button>
        <button
          onClick={() => setFilter(ChallengeStatus.UNDER_REVIEW)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              filter === ChallengeStatus.UNDER_REVIEW
                ? theme.colors.bg.elevated
                : 'transparent',
            color:
              filter === ChallengeStatus.UNDER_REVIEW
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          Under Review ({statusCounts[ChallengeStatus.UNDER_REVIEW]})
        </button>
        <button
          onClick={() => setFilter(ChallengeStatus.RESOLVED)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              filter === ChallengeStatus.RESOLVED
                ? theme.colors.bg.elevated
                : 'transparent',
            color:
              filter === ChallengeStatus.RESOLVED
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          Resolved ({statusCounts[ChallengeStatus.RESOLVED]})
        </button>
        <button
          onClick={() => setFilter(ChallengeStatus.DISMISSED)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              filter === ChallengeStatus.DISMISSED
                ? theme.colors.bg.elevated
                : 'transparent',
            color:
              filter === ChallengeStatus.DISMISSED
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
          }}
        >
          Dismissed ({statusCounts[ChallengeStatus.DISMISSED]})
        </button>
      </div>

      {/* Challenge List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="text-sm"
              style={{ color: theme.colors.text.tertiary }}
            >
              Loading challenges...
            </div>
          </div>
        ) : sortedChallenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle
              size={48}
              className="mb-4"
              style={{ color: theme.colors.text.tertiary }}
            />
            <div
              className="text-lg font-semibold mb-2"
              style={{ color: theme.colors.text.secondary }}
            >
              No challenges found
            </div>
            <div
              className="text-sm text-center max-w-sm"
              style={{ color: theme.colors.text.tertiary }}
            >
              {filter === 'all'
                ? 'This node has no challenges yet. Create one to help improve accuracy.'
                : `No ${filter} challenges for this ${targetType}.`}
            </div>
            {onCreateChallenge && filter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                style={{
                  backgroundColor: theme.colors.bg.elevated,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.primary}`,
                }}
              >
                <Plus size={18} />
                Create First Challenge
              </button>
            )}
          </div>
        ) : (
          sortedChallenges.map((challenge) => {
            const userVote = challenge.votes.find(
              (v) => v.userId === currentUserId
            )?.voteType;

            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onVote={onVote}
                onExpand={(id) => setExpandedChallenge(id)}
                currentUserId={currentUserId}
                currentUserVote={userVote || null}
                expanded={expandedChallenge === challenge.id}
              />
            );
          })
        )}
      </div>

      {/* Create Challenge Modal */}
      {showCreateForm && (
        <ChallengeForm
          nodeId={nodeId}
          edgeId={edgeId}
          onSubmit={handleCreateChallenge}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default ChallengePanel;
