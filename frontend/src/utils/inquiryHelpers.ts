/**
 * Challenge System Helper Functions
 *
 * Utilities for challenge type metadata, reputation colors,
 * vote calculations, and formatting.
 */

import {
  ChallengeType,
  ChallengeStatus,
  ChallengeTypeInfo,
  Challenge,
  VoteDistribution,
  ChallengeVoteType,
} from '@/types/challenge';

/**
 * Challenge type metadata with icons and colors
 */
export const CHALLENGE_TYPE_INFO: Record<ChallengeType, ChallengeTypeInfo> = {
  [ChallengeType.FACTUAL_ERROR]: {
    id: ChallengeType.FACTUAL_ERROR,
    name: 'Factual Error',
    description: 'Incorrect or false information',
    severity: 'high',
    icon: 'AlertTriangle',
    color: '#ef4444', // red-500
  },
  [ChallengeType.MISSING_CONTEXT]: {
    id: ChallengeType.MISSING_CONTEXT,
    name: 'Missing Context',
    description: 'Important context or nuance missing',
    severity: 'medium',
    icon: 'Info',
    color: '#eab308', // yellow-500
  },
  [ChallengeType.BIAS_MISLEADING]: {
    id: ChallengeType.BIAS_MISLEADING,
    name: 'Bias/Misleading',
    description: 'Biased framing or misleading presentation',
    severity: 'high',
    icon: 'AlertOctagon',
    color: '#f97316', // orange-500
  },
  [ChallengeType.SOURCE_CREDIBILITY]: {
    id: ChallengeType.SOURCE_CREDIBILITY,
    name: 'Source Credibility',
    description: 'Questionable or unreliable source',
    severity: 'high',
    icon: 'Link',
    color: '#ef4444', // red-500
  },
  [ChallengeType.LOGICAL_FALLACY]: {
    id: ChallengeType.LOGICAL_FALLACY,
    name: 'Logical Fallacy',
    description: 'Flawed reasoning or logical error',
    severity: 'medium',
    icon: 'GitBranch',
    color: '#f97316', // orange-500
  },
  [ChallengeType.OUTDATED]: {
    id: ChallengeType.OUTDATED,
    name: 'Outdated',
    description: 'Information no longer current',
    severity: 'medium',
    icon: 'Clock',
    color: '#eab308', // yellow-500
  },
  [ChallengeType.CONTRADICTORY]: {
    id: ChallengeType.CONTRADICTORY,
    name: 'Contradictory',
    description: 'Conflicts with established facts',
    severity: 'high',
    icon: 'Shuffle',
    color: '#f97316', // orange-500
  },
  [ChallengeType.SCOPE]: {
    id: ChallengeType.SCOPE,
    name: 'Scope',
    description: 'Overgeneralization or scope issue',
    severity: 'low',
    icon: 'Target',
    color: '#eab308', // yellow-500
  },
  [ChallengeType.METHODOLOGY]: {
    id: ChallengeType.METHODOLOGY,
    name: 'Methodology',
    description: 'Flawed research methodology',
    severity: 'high',
    icon: 'ClipboardCheck',
    color: '#ef4444', // red-500
  },
  [ChallengeType.UNSUPPORTED]: {
    id: ChallengeType.UNSUPPORTED,
    name: 'Unsupported',
    description: 'Claim lacks supporting evidence',
    severity: 'medium',
    icon: 'HelpCircle',
    color: '#eab308', // yellow-500
  },
};

/**
 * Get challenge type info by ID
 */
export const getChallengeTypeInfo = (type: ChallengeType): ChallengeTypeInfo => {
  return CHALLENGE_TYPE_INFO[type];
};

/**
 * Get all challenge types as array
 */
export const getAllChallengeTypes = (): ChallengeTypeInfo[] => {
  return Object.values(CHALLENGE_TYPE_INFO);
};

/**
 * Get reputation color based on score (0-100)
 */
export const getReputationColor = (score: number): string => {
  if (score >= 75) return '#10b981'; // green-500
  if (score >= 50) return '#84cc16'; // lime-500
  if (score >= 25) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
};

/**
 * Get reputation label based on score
 */
export const getReputationLabel = (score: number): string => {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Trusted';
  if (score >= 50) return 'Established';
  if (score >= 25) return 'Developing';
  return 'New';
};

/**
 * Calculate vote distribution from challenge votes
 */
export const calculateVoteDistribution = (challenge: Challenge): VoteDistribution => {
  const upholdVotes = challenge.votes.filter(
    (v) => v.voteType === ChallengeVoteType.UPHOLD
  );
  const dismissVotes = challenge.votes.filter(
    (v) => v.voteType === ChallengeVoteType.DISMISS
  );

  return {
    upholdCount: upholdVotes.length,
    dismissCount: dismissVotes.length,
    upholdWeight: upholdVotes.reduce((sum, v) => sum + v.weight, 0),
    dismissWeight: dismissVotes.reduce((sum, v) => sum + v.weight, 0),
    totalParticipants: challenge.votes.length,
  };
};

/**
 * Get percentage for vote type
 */
export const getVotePercentage = (
  distribution: VoteDistribution,
  type: 'uphold' | 'dismiss'
): number => {
  const totalWeight = distribution.upholdWeight + distribution.dismissWeight;
  if (totalWeight === 0) return 0;

  const weight =
    type === 'uphold' ? distribution.upholdWeight : distribution.dismissWeight;
  return Math.round((weight / totalWeight) * 100);
};

/**
 * Get status badge color
 */
export const getStatusColor = (status: ChallengeStatus): string => {
  switch (status) {
    case ChallengeStatus.OPEN:
      return '#eab308'; // yellow-500
    case ChallengeStatus.UNDER_REVIEW:
      return '#3b82f6'; // blue-500
    case ChallengeStatus.RESOLVED:
      return '#10b981'; // green-500
    case ChallengeStatus.DISMISSED:
      return '#71717a'; // zinc-500
    default:
      return '#a1a1aa'; // zinc-400
  }
};

/**
 * Get status label
 */
export const getStatusLabel = (status: ChallengeStatus): string => {
  switch (status) {
    case ChallengeStatus.OPEN:
      return 'Open';
    case ChallengeStatus.UNDER_REVIEW:
      return 'Under Review';
    case ChallengeStatus.RESOLVED:
      return 'Resolved';
    case ChallengeStatus.DISMISSED:
      return 'Dismissed';
    default:
      return 'Unknown';
  }
};

/**
 * Format time ago (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString();
};

/**
 * Sort challenges by status priority and date
 */
export const sortChallenges = (challenges: Challenge[]): Challenge[] => {
  const statusPriority: Record<ChallengeStatus, number> = {
    [ChallengeStatus.OPEN]: 1,
    [ChallengeStatus.UNDER_REVIEW]: 2,
    [ChallengeStatus.RESOLVED]: 3,
    [ChallengeStatus.DISMISSED]: 4,
  };

  return [...challenges].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Within same status, sort by date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

/**
 * Group challenges by status
 */
export const groupChallengesByStatus = (
  challenges: Challenge[]
): Record<ChallengeStatus, Challenge[]> => {
  return challenges.reduce(
    (acc, challenge) => {
      if (!acc[challenge.status]) {
        acc[challenge.status] = [];
      }
      acc[challenge.status].push(challenge);
      return acc;
    },
    {
      [ChallengeStatus.OPEN]: [],
      [ChallengeStatus.UNDER_REVIEW]: [],
      [ChallengeStatus.RESOLVED]: [],
      [ChallengeStatus.DISMISSED]: [],
    } as Record<ChallengeStatus, Challenge[]>
  );
};
