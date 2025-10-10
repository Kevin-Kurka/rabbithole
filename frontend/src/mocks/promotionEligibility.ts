/**
 * Mock Data for Promotion Eligibility
 *
 * Used for development and testing of promotion validation UI.
 */

import {
  PromotionEligibility,
  PromotionEligibilityBadgeData,
  MethodologyStep,
  ConsensusVote,
  Challenge,
} from '../types/promotion';

export const mockMethodologySteps: MethodologyStep[] = [
  {
    id: 'step-1',
    name: 'Define Research Question',
    description: 'Clearly articulate the hypothesis or question being investigated',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user-1',
      username: 'researcher_alice',
    },
    completedAt: '2025-10-01T10:00:00Z',
    evidenceIds: ['ev-1', 'ev-2'],
  },
  {
    id: 'step-2',
    name: 'Gather Primary Sources',
    description: 'Collect and document all primary evidence sources with proper citations',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user-2',
      username: 'curator_bob',
    },
    completedAt: '2025-10-03T14:30:00Z',
    evidenceIds: ['ev-3', 'ev-4', 'ev-5', 'ev-6'],
  },
  {
    id: 'step-3',
    name: 'Validate Source Credibility',
    description: 'Verify the authenticity and reliability of all sources',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user-3',
      username: 'validator_carol',
    },
    completedAt: '2025-10-05T09:15:00Z',
  },
  {
    id: 'step-4',
    name: 'Cross-Reference Claims',
    description: 'Compare claims across multiple independent sources for verification',
    isCompleted: false,
    completionPercentage: 70,
  },
  {
    id: 'step-5',
    name: 'Community Review',
    description: 'Open work for peer review and community feedback',
    isCompleted: false,
    completionPercentage: 0,
  },
];

export const mockConsensusVotes: ConsensusVote[] = [
  {
    userId: 'user-1',
    username: 'expert_researcher',
    reputationScore: 95,
    confidence: 92,
    reasoning:
      'Thoroughly reviewed all evidence. Sources are credible, methodology is sound. High confidence in these findings.',
    votedAt: '2025-10-08T10:30:00Z',
    voteWeight: 1.8,
  },
  {
    userId: 'user-2',
    username: 'data_validator',
    reputationScore: 87,
    confidence: 88,
    reasoning:
      'Cross-referenced primary sources. Everything checks out. Minor concerns about sample size but overall very strong.',
    votedAt: '2025-10-08T12:15:00Z',
    voteWeight: 1.6,
  },
  {
    userId: 'user-3',
    username: 'community_member_charlie',
    reputationScore: 65,
    confidence: 75,
    reasoning:
      'Evidence looks solid. Would like to see one more independent source for the main claim.',
    votedAt: '2025-10-08T14:45:00Z',
    voteWeight: 1.2,
  },
  {
    userId: 'user-4',
    username: 'skeptical_reviewer',
    reputationScore: 78,
    confidence: 68,
    reasoning:
      'Good work overall but I have concerns about the interpretation of data point #3. Needs clarification.',
    votedAt: '2025-10-08T16:20:00Z',
    voteWeight: 1.4,
  },
  {
    userId: 'user-5',
    username: 'peer_reviewer_dana',
    reputationScore: 90,
    confidence: 85,
    reasoning: 'Excellent methodology and strong evidence base. Ready for Level 0.',
    votedAt: '2025-10-08T18:00:00Z',
    voteWeight: 1.7,
  },
];

export const mockChallenges: Challenge[] = [
  {
    id: 'challenge-1',
    raisedBy: {
      id: 'user-6',
      username: 'critical_thinker',
    },
    description:
      'The interpretation of source #4 seems to contradict the main conclusion. Can you clarify this discrepancy?',
    status: 'resolved',
    raisedAt: '2025-10-06T11:00:00Z',
    resolvedAt: '2025-10-07T15:30:00Z',
    resolution:
      'Added additional context showing that source #4 addresses a different time period. Updated documentation to clarify.',
  },
  {
    id: 'challenge-2',
    raisedBy: {
      id: 'user-7',
      username: 'fact_checker',
    },
    description:
      'Source #8 appears to have publication date issues. Can you verify the authenticity?',
    status: 'resolved',
    raisedAt: '2025-10-07T09:00:00Z',
    resolvedAt: '2025-10-08T10:00:00Z',
    resolution:
      'Verified with publisher. Date was correct but formatting was unusual. Added publisher confirmation as evidence.',
  },
];

export const mockEligibilityFullyEligible: PromotionEligibility = {
  graphId: 'graph-eligible-123',
  overallScore: 86,
  isEligible: true,
  promotionThreshold: 80,
  lastUpdated: '2025-10-09T12:00:00Z',
  methodologyCompletion: {
    id: 'methodology',
    name: 'Methodology Completion',
    currentScore: 100,
    targetScore: 100,
    isMet: true,
    description: 'All workflow steps have been completed and verified',
    recommendations: [],
    steps: mockMethodologySteps.map((step) => ({ ...step, isCompleted: true, completionPercentage: 100 })),
  },
  consensus: {
    id: 'consensus',
    name: 'Community Consensus',
    currentScore: 86,
    targetScore: 80,
    isMet: true,
    description: 'Weighted community voting indicates strong consensus',
    recommendations: [],
    details: {
      overallScore: 86,
      voteCount: 5,
      weightedAverage: 84.5,
      targetConsensus: 80,
      isMet: true,
      votes: mockConsensusVotes,
    },
  },
  evidenceQuality: {
    id: 'evidence',
    name: 'Evidence Quality',
    currentScore: 78,
    targetScore: 70,
    isMet: true,
    description: 'Evidence sources meet quality and credibility standards',
    recommendations: [],
    details: {
      overallScore: 78,
      evidenceCount: 12,
      qualityBreakdown: {
        high: 8,
        medium: 3,
        low: 1,
      },
      averageCredibility: 0.82,
      isMet: true,
      targetScore: 70,
    },
  },
  challengeResolution: {
    id: 'challenges',
    name: 'Challenge Resolution',
    currentScore: 100,
    targetScore: 100,
    isMet: true,
    description: 'All raised challenges have been addressed',
    recommendations: [],
    details: {
      overallScore: 100,
      openChallenges: 0,
      resolvedChallenges: 2,
      isMet: true,
      challenges: mockChallenges,
    },
  },
};

export const mockEligibilityInProgress: PromotionEligibility = {
  graphId: 'graph-progress-456',
  overallScore: 68,
  isEligible: false,
  promotionThreshold: 80,
  lastUpdated: '2025-10-09T12:00:00Z',
  methodologyCompletion: {
    id: 'methodology',
    name: 'Methodology Completion',
    currentScore: 68,
    targetScore: 100,
    isMet: false,
    description: 'Some workflow steps remain incomplete',
    recommendations: [
      'Complete cross-referencing step',
      'Open for community review',
    ],
    steps: mockMethodologySteps,
  },
  consensus: {
    id: 'consensus',
    name: 'Community Consensus',
    currentScore: 82,
    targetScore: 80,
    isMet: true,
    description: 'Weighted community voting indicates strong consensus',
    recommendations: [],
    details: {
      overallScore: 82,
      voteCount: 5,
      weightedAverage: 81.2,
      targetConsensus: 80,
      isMet: true,
      votes: mockConsensusVotes,
    },
  },
  evidenceQuality: {
    id: 'evidence',
    name: 'Evidence Quality',
    currentScore: 65,
    targetScore: 70,
    isMet: false,
    description: 'Evidence quality needs improvement',
    recommendations: [
      'Add 2-3 more high-quality sources',
      'Improve source diversity',
    ],
    details: {
      overallScore: 65,
      evidenceCount: 8,
      qualityBreakdown: {
        high: 4,
        medium: 3,
        low: 1,
      },
      averageCredibility: 0.68,
      isMet: false,
      targetScore: 70,
    },
  },
  challengeResolution: {
    id: 'challenges',
    name: 'Challenge Resolution',
    currentScore: 100,
    targetScore: 100,
    isMet: true,
    description: 'All raised challenges have been addressed',
    recommendations: [],
    details: {
      overallScore: 100,
      openChallenges: 0,
      resolvedChallenges: 2,
      isMet: true,
      challenges: mockChallenges,
    },
  },
  nextAction: {
    criterion: 'Methodology Completion',
    action: 'Focus on completing the cross-referencing step. Verify claims with at least 3 independent sources.',
    priority: 'high',
  },
};

export const mockEligibilityEarlyStage: PromotionEligibility = {
  graphId: 'graph-early-789',
  overallScore: 32,
  isEligible: false,
  promotionThreshold: 80,
  lastUpdated: '2025-10-09T12:00:00Z',
  methodologyCompletion: {
    id: 'methodology',
    name: 'Methodology Completion',
    currentScore: 40,
    targetScore: 100,
    isMet: false,
    description: 'Early stage - most steps incomplete',
    recommendations: [
      'Continue gathering primary sources',
      'Document methodology choices',
    ],
    steps: mockMethodologySteps.slice(0, 2).concat(
      mockMethodologySteps.slice(2).map((step) => ({
        ...step,
        isCompleted: false,
        completionPercentage: 0,
        completedBy: undefined,
        completedAt: undefined,
      }))
    ),
  },
  consensus: {
    id: 'consensus',
    name: 'Community Consensus',
    currentScore: 0,
    targetScore: 80,
    isMet: false,
    description: 'No votes yet',
    recommendations: ['Share work with community for initial feedback'],
    details: {
      overallScore: 0,
      voteCount: 0,
      weightedAverage: 0,
      targetConsensus: 80,
      isMet: false,
      votes: [],
    },
  },
  evidenceQuality: {
    id: 'evidence',
    name: 'Evidence Quality',
    currentScore: 45,
    targetScore: 70,
    isMet: false,
    description: 'Limited evidence available',
    recommendations: [
      'Add more high-quality sources',
      'Focus on credible, primary sources',
    ],
    details: {
      overallScore: 45,
      evidenceCount: 3,
      qualityBreakdown: {
        high: 1,
        medium: 1,
        low: 1,
      },
      averageCredibility: 0.48,
      isMet: false,
      targetScore: 70,
    },
  },
  challengeResolution: {
    id: 'challenges',
    name: 'Challenge Resolution',
    currentScore: 100,
    targetScore: 100,
    isMet: true,
    description: 'No challenges raised yet',
    recommendations: [],
    details: {
      overallScore: 100,
      openChallenges: 0,
      resolvedChallenges: 0,
      isMet: true,
      challenges: [],
    },
  },
  nextAction: {
    criterion: 'Evidence Quality',
    action: 'Gather at least 8 high-quality evidence sources before proceeding to next steps.',
    priority: 'high',
  },
};

export const mockBadgeData: Record<string, PromotionEligibilityBadgeData> = {
  'graph-eligible-123': {
    overallScore: 86,
    isEligible: true,
    criteriaMet: 4,
    totalCriteria: 4,
  },
  'graph-progress-456': {
    overallScore: 68,
    isEligible: false,
    criteriaMet: 2,
    totalCriteria: 4,
    nextAction: 'Complete methodology steps',
  },
  'graph-early-789': {
    overallScore: 32,
    isEligible: false,
    criteriaMet: 1,
    totalCriteria: 4,
    nextAction: 'Gather more evidence',
  },
};
