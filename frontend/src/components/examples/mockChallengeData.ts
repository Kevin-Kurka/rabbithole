/**
 * Mock Challenge Data for Testing and Storybook
 *
 * Provides realistic sample data for challenge system components.
 */

import {
  Challenge,
  ChallengeType,
  ChallengeStatus,
  ChallengeVoteType,
  UserReputation,
} from '@/types/challenge';

/**
 * Mock user reputations
 */
export const mockReputations: Record<string, UserReputation> = {
  user1: {
    userId: 'user1',
    score: 85,
    breakdown: {
      evidenceQuality: 90,
      voteAccuracy: 85,
      participationLevel: 80,
      communityTrust: 85,
    },
    rank: '#142',
    achievementsCount: 12,
  },
  user2: {
    userId: 'user2',
    score: 62,
    breakdown: {
      evidenceQuality: 70,
      voteAccuracy: 60,
      participationLevel: 55,
      communityTrust: 65,
    },
    rank: '#1,247',
    achievementsCount: 5,
  },
  user3: {
    userId: 'user3',
    score: 35,
    breakdown: {
      evidenceQuality: 40,
      voteAccuracy: 35,
      participationLevel: 30,
      communityTrust: 35,
    },
    rank: '#4,892',
    achievementsCount: 2,
  },
  user4: {
    userId: 'user4',
    score: 92,
    breakdown: {
      evidenceQuality: 95,
      voteAccuracy: 92,
      participationLevel: 88,
      communityTrust: 94,
    },
    rank: '#23',
    achievementsCount: 28,
  },
};

/**
 * Mock challenges
 */
export const mockChallenges: Challenge[] = [
  {
    id: 'challenge1',
    type: ChallengeType.FACTUAL_ERROR,
    status: ChallengeStatus.OPEN,
    targetNodeId: 'node1',
    createdBy: 'user1',
    createdByName: 'Dr. Sarah Chen',
    createdAt: '2025-10-08T14:30:00Z',
    evidence:
      'According to the latest peer-reviewed study published in Nature (doi:10.1038/nature12345), the claim about water boiling at 90°C is incorrect. The standard boiling point at sea level atmospheric pressure (101.325 kPa) is 100°C. Source: https://nature.com/articles/nature12345',
    reasoning:
      'This is a fundamental error in thermodynamics. The boiling point of water is well-established and should be corrected to maintain the integrity of the knowledge graph.',
    claimReference: 'Water boils at 90 degrees Celsius at sea level',
    votes: [
      {
        id: 'vote1',
        challengeId: 'challenge1',
        userId: 'user2',
        userName: 'Prof. Michael Torres',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 62,
        reasoning: 'The evidence is clear and well-sourced. This is a factual error.',
        createdAt: '2025-10-08T15:00:00Z',
      },
      {
        id: 'vote2',
        challengeId: 'challenge1',
        userId: 'user4',
        userName: 'Dr. Emily Watson',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 92,
        reasoning: 'Confirmed. Standard boiling point is 100°C at 1 atm.',
        createdAt: '2025-10-08T16:30:00Z',
      },
    ],
  },
  {
    id: 'challenge2',
    type: ChallengeType.MISSING_CONTEXT,
    status: ChallengeStatus.UNDER_REVIEW,
    targetNodeId: 'node1',
    createdBy: 'user3',
    createdByName: 'Alex Johnson',
    createdAt: '2025-10-07T10:15:00Z',
    evidence:
      'While the claim about renewable energy growth is accurate, it lacks important context about the baseline comparison. The 300% growth is from a very small starting point (2% of total energy in 2010 to 8% in 2020). This context is critical for proper interpretation.',
    reasoning:
      'Without the baseline context, readers might misinterpret the significance of this growth. The percentage sounds impressive but represents a smaller absolute change than it appears.',
    claimReference: 'Renewable energy has grown by 300% in the last decade',
    votes: [
      {
        id: 'vote3',
        challengeId: 'challenge2',
        userId: 'user1',
        userName: 'Dr. Sarah Chen',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 85,
        reasoning: 'Valid point. Context about absolute numbers is important.',
        createdAt: '2025-10-07T11:00:00Z',
      },
      {
        id: 'vote4',
        challengeId: 'challenge2',
        userId: 'user2',
        userName: 'Prof. Michael Torres',
        voteType: ChallengeVoteType.DISMISS,
        weight: 62,
        reasoning: 'The claim is still accurate. Context can be added separately.',
        createdAt: '2025-10-07T14:20:00Z',
      },
      {
        id: 'vote5',
        challengeId: 'challenge2',
        userId: 'user4',
        userName: 'Dr. Emily Watson',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 92,
        reasoning: 'Missing context makes this misleading. Should be clarified.',
        createdAt: '2025-10-07T16:45:00Z',
      },
    ],
  },
  {
    id: 'challenge3',
    type: ChallengeType.SOURCE_CREDIBILITY,
    status: ChallengeStatus.RESOLVED,
    targetNodeId: 'node2',
    createdBy: 'user4',
    createdByName: 'Dr. Emily Watson',
    createdAt: '2025-10-05T09:00:00Z',
    evidence:
      'The cited blog post has no academic credentials or peer review. Multiple reputable sources (CDC, WHO, NIH) contradict this claim. The blog author has a history of spreading misinformation. See fact-check: https://factcheck.org/example',
    reasoning:
      'Using non-credible sources undermines the entire knowledge graph. This node should cite peer-reviewed research or be removed.',
    votes: [
      {
        id: 'vote6',
        challengeId: 'challenge3',
        userId: 'user1',
        userName: 'Dr. Sarah Chen',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 85,
        createdAt: '2025-10-05T10:30:00Z',
      },
      {
        id: 'vote7',
        challengeId: 'challenge3',
        userId: 'user2',
        userName: 'Prof. Michael Torres',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 62,
        createdAt: '2025-10-05T11:15:00Z',
      },
    ],
    resolution: {
      outcome: 'upheld',
      reasoning:
        'Community consensus confirms the source is not credible. The claim has been updated with peer-reviewed sources.',
      resolvedAt: '2025-10-06T12:00:00Z',
      resolvedBy: 'moderator1',
      veracityImpact: -0.35,
    },
  },
  {
    id: 'challenge4',
    type: ChallengeType.OUTDATED,
    status: ChallengeStatus.RESOLVED,
    targetNodeId: 'node3',
    createdBy: 'user2',
    createdByName: 'Prof. Michael Torres',
    createdAt: '2025-10-04T13:45:00Z',
    evidence:
      'This data is from 2015. Updated figures from 2024 show a completely different picture. Current statistics available at: https://statistics.gov/latest-data',
    reasoning:
      'Using outdated data can lead to incorrect conclusions. The graph should reflect current information.',
    votes: [
      {
        id: 'vote8',
        challengeId: 'challenge4',
        userId: 'user1',
        userName: 'Dr. Sarah Chen',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 85,
        createdAt: '2025-10-04T14:00:00Z',
      },
      {
        id: 'vote9',
        challengeId: 'challenge4',
        userId: 'user4',
        userName: 'Dr. Emily Watson',
        voteType: ChallengeVoteType.UPHOLD,
        weight: 92,
        createdAt: '2025-10-04T15:30:00Z',
      },
    ],
    resolution: {
      outcome: 'upheld',
      reasoning: 'Data has been updated to reflect 2024 statistics.',
      resolvedAt: '2025-10-05T09:00:00Z',
      resolvedBy: 'moderator2',
      veracityImpact: -0.20,
    },
  },
  {
    id: 'challenge5',
    type: ChallengeType.LOGICAL_FALLACY,
    status: ChallengeStatus.DISMISSED,
    targetNodeId: 'node3',
    createdBy: 'user3',
    createdByName: 'Alex Johnson',
    createdAt: '2025-10-03T16:20:00Z',
    evidence:
      'The claim uses correlation to imply causation without sufficient evidence of a causal mechanism.',
    reasoning:
      'This is a correlation vs causation fallacy that could mislead readers.',
    votes: [
      {
        id: 'vote10',
        challengeId: 'challenge5',
        userId: 'user1',
        userName: 'Dr. Sarah Chen',
        voteType: ChallengeVoteType.DISMISS,
        weight: 85,
        reasoning: 'The claim explicitly states correlation, not causation.',
        createdAt: '2025-10-03T17:00:00Z',
      },
      {
        id: 'vote11',
        challengeId: 'challenge5',
        userId: 'user4',
        userName: 'Dr. Emily Watson',
        voteType: ChallengeVoteType.DISMISS,
        weight: 92,
        reasoning: 'The original claim is appropriately qualified.',
        createdAt: '2025-10-03T18:15:00Z',
      },
    ],
    resolution: {
      outcome: 'dismissed',
      reasoning:
        'The original claim properly qualifies the relationship as correlational. No change needed.',
      resolvedAt: '2025-10-04T10:00:00Z',
      resolvedBy: 'moderator1',
    },
  },
];

/**
 * Get challenges by status
 */
export const getChallengesByStatus = (status: ChallengeStatus): Challenge[] => {
  return mockChallenges.filter((c) => c.status === status);
};

/**
 * Get challenges by node
 */
export const getChallengesByNode = (nodeId: string): Challenge[] => {
  return mockChallenges.filter((c) => c.targetNodeId === nodeId);
};

/**
 * Get user reputation by ID
 */
export const getUserReputation = (userId: string): UserReputation => {
  return mockReputations[userId] || mockReputations.user3;
};
