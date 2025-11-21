/**
 * Storybook Stories for PromotionEligibilityDashboard
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PromotionEligibilityDashboard } from './promotion/promotion-eligibility-dashboard';
import { PromotionEligibility } from '../types/promotion';

const meta: Meta<typeof PromotionEligibilityDashboard> = {
  title: 'Promotion/PromotionEligibilityDashboard',
  component: PromotionEligibilityDashboard,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#27272a' }],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromotionEligibilityDashboard>;

const baseEligibility: PromotionEligibility = {
  graphId: 'graph-123',
  overallScore: 85,
  isEligible: true,
  promotionThreshold: 80,
  lastUpdated: '2025-10-09T12:00:00Z',
  methodologyCompletion: {
    id: 'methodology',
    name: 'Methodology Completion',
    currentScore: 100,
    targetScore: 100,
    isMet: true,
    description: 'All methodology workflow steps completed',
    recommendations: [],
    steps: [
      {
        id: '1',
        name: 'Define Research Question',
        description: 'Clearly state the hypothesis',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u1', username: 'researcher_alice' },
        completedAt: '2025-10-01T10:00:00Z',
      },
      {
        id: '2',
        name: 'Gather Sources',
        description: 'Collect evidence',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u2', username: 'curator_bob' },
        completedAt: '2025-10-03T14:00:00Z',
      },
    ],
  },
  consensus: {
    id: 'consensus',
    name: 'Community Consensus',
    currentScore: 86,
    targetScore: 80,
    isMet: true,
    description: 'Weighted community voting score',
    recommendations: [],
    details: {
      overallScore: 86,
      voteCount: 8,
      weightedAverage: 84.5,
      targetConsensus: 80,
      isMet: true,
      votes: [],
    },
  },
  evidenceQuality: {
    id: 'evidence',
    name: 'Evidence Quality',
    currentScore: 78,
    targetScore: 70,
    isMet: true,
    description: 'Quality and credibility of evidence sources',
    recommendations: [],
    details: {
      overallScore: 78,
      evidenceCount: 12,
      qualityBreakdown: { high: 8, medium: 3, low: 1 },
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
    description: 'All challenges addressed',
    recommendations: [],
    details: {
      overallScore: 100,
      openChallenges: 0,
      resolvedChallenges: 2,
      isMet: true,
      challenges: [],
    },
  },
  nextAction: undefined,
};

export const FullyEligible: Story = {
  args: {
    graphId: 'graph-123',
    eligibility: baseEligibility,
  },
};

export const NeedsConsensus: Story = {
  args: {
    graphId: 'graph-456',
    eligibility: {
      ...baseEligibility,
      overallScore: 68,
      isEligible: false,
      consensus: {
        id: 'consensus',
        name: 'Community Consensus',
        currentScore: 62,
        targetScore: 80,
        isMet: false,
        description: 'Weighted community voting score',
        recommendations: ['Encourage more community members to vote', 'Address concerns raised in existing votes'],
        details: {
          overallScore: 62,
          voteCount: 3,
          weightedAverage: 60.5,
          targetConsensus: 80,
          isMet: false,
          votes: [],
        },
      },
      nextAction: {
        criterion: 'Consensus',
        action: 'Need 18% more consensus - respond to community concerns and encourage voting',
        priority: 'high',
      },
    },
  },
};

export const NeedsMethodology: Story = {
  args: {
    graphId: 'graph-789',
    eligibility: {
      ...baseEligibility,
      overallScore: 72,
      isEligible: false,
      methodologyCompletion: {
        id: 'methodology',
        name: 'Methodology Completion',
        currentScore: 67,
        targetScore: 100,
        isMet: false,
        description: 'Some methodology steps incomplete',
        recommendations: ['Complete cross-referencing step', 'Finish community review'],
        steps: [
          {
            id: '1',
            name: 'Define Research Question',
            description: 'Clearly state the hypothesis',
            isCompleted: true,
            completionPercentage: 100,
          },
          {
            id: '2',
            name: 'Gather Sources',
            description: 'Collect evidence',
            isCompleted: true,
            completionPercentage: 100,
          },
          {
            id: '3',
            name: 'Cross-Reference',
            description: 'Verify across sources',
            isCompleted: false,
            completionPercentage: 50,
          },
          {
            id: '4',
            name: 'Community Review',
            description: 'Open for feedback',
            isCompleted: false,
            completionPercentage: 0,
          },
        ],
      },
      nextAction: {
        criterion: 'Methodology',
        action: 'Complete the cross-referencing step - verify claims across at least 3 sources',
        priority: 'high',
      },
    },
  },
};

export const HasOpenChallenges: Story = {
  args: {
    graphId: 'graph-challenge',
    eligibility: {
      ...baseEligibility,
      overallScore: 75,
      isEligible: false,
      challengeResolution: {
        id: 'challenges',
        name: 'Challenge Resolution',
        currentScore: 0,
        targetScore: 100,
        isMet: false,
        description: 'Open challenges must be resolved',
        recommendations: ['Address data interpretation concern', 'Respond to source credibility question'],
        details: {
          overallScore: 0,
          openChallenges: 2,
          resolvedChallenges: 1,
          isMet: false,
          challenges: [
            {
              id: 'ch1',
              raisedBy: { id: 'u1', username: 'skeptic_sam' },
              description: 'Data interpretation seems flawed in section 3',
              status: 'open',
              raisedAt: '2025-10-08T10:00:00Z',
            },
            {
              id: 'ch2',
              raisedBy: { id: 'u2', username: 'reviewer_rita' },
              description: 'Source #5 credibility needs verification',
              status: 'open',
              raisedAt: '2025-10-08T14:00:00Z',
            },
          ],
        },
      },
      nextAction: {
        criterion: 'Challenges',
        action: 'Address 2 open challenges - provide clarifications and additional evidence',
        priority: 'high',
      },
    },
  },
};

export const LowEvidenceQuality: Story = {
  args: {
    graphId: 'graph-evidence',
    eligibility: {
      ...baseEligibility,
      overallScore: 64,
      isEligible: false,
      evidenceQuality: {
        id: 'evidence',
        name: 'Evidence Quality',
        currentScore: 55,
        targetScore: 70,
        isMet: false,
        description: 'Evidence quality below threshold',
        recommendations: [
          'Add more high-quality sources',
          'Replace low-credibility sources',
          'Increase source diversity',
        ],
        details: {
          overallScore: 55,
          evidenceCount: 8,
          qualityBreakdown: { high: 2, medium: 3, low: 3 },
          averageCredibility: 0.58,
          isMet: false,
          targetScore: 70,
        },
      },
      nextAction: {
        criterion: 'Evidence Quality',
        action: 'Add at least 3 more high-quality sources to improve evidence score',
        priority: 'medium',
      },
    },
  },
};

export const MultipleIssues: Story = {
  args: {
    graphId: 'graph-multiple',
    eligibility: {
      ...baseEligibility,
      overallScore: 48,
      isEligible: false,
      methodologyCompletion: {
        ...baseEligibility.methodologyCompletion,
        currentScore: 50,
        isMet: false,
        steps: [
          {
            id: '1',
            name: 'Define Research Question',
            description: 'Clearly state the hypothesis',
            isCompleted: true,
            completionPercentage: 100,
          },
          {
            id: '2',
            name: 'Gather Sources',
            description: 'Collect evidence',
            isCompleted: false,
            completionPercentage: 0,
          },
        ],
      },
      consensus: {
        ...baseEligibility.consensus,
        currentScore: 45,
        isMet: false,
        details: {
          ...baseEligibility.consensus.details,
          overallScore: 45,
          voteCount: 2,
          isMet: false,
        },
      },
      evidenceQuality: {
        ...baseEligibility.evidenceQuality,
        currentScore: 52,
        isMet: false,
        details: {
          ...baseEligibility.evidenceQuality.details,
          overallScore: 52,
          isMet: false,
        },
      },
      challengeResolution: {
        ...baseEligibility.challengeResolution,
        currentScore: 50,
        isMet: false,
        details: {
          ...baseEligibility.challengeResolution.details,
          overallScore: 50,
          openChallenges: 1,
          isMet: false,
        },
      },
      nextAction: {
        criterion: 'Methodology',
        action: 'Start by gathering evidence sources - this is blocking other criteria',
        priority: 'high',
      },
    },
  },
};

export const JustStarted: Story = {
  args: {
    graphId: 'graph-new',
    eligibility: {
      ...baseEligibility,
      overallScore: 15,
      isEligible: false,
      methodologyCompletion: {
        ...baseEligibility.methodologyCompletion,
        currentScore: 20,
        isMet: false,
        steps: [
          {
            id: '1',
            name: 'Define Research Question',
            description: 'Clearly state the hypothesis',
            isCompleted: true,
            completionPercentage: 100,
          },
          {
            id: '2',
            name: 'Gather Sources',
            description: 'Collect evidence',
            isCompleted: false,
            completionPercentage: 0,
          },
          {
            id: '3',
            name: 'Validate Sources',
            description: 'Check credibility',
            isCompleted: false,
            completionPercentage: 0,
          },
          {
            id: '4',
            name: 'Community Review',
            description: 'Open for feedback',
            isCompleted: false,
            completionPercentage: 0,
          },
        ],
      },
      consensus: {
        ...baseEligibility.consensus,
        currentScore: 0,
        isMet: false,
        details: {
          ...baseEligibility.consensus.details,
          overallScore: 0,
          voteCount: 0,
          isMet: false,
        },
      },
      evidenceQuality: {
        ...baseEligibility.evidenceQuality,
        currentScore: 25,
        isMet: false,
        details: {
          ...baseEligibility.evidenceQuality.details,
          overallScore: 25,
          evidenceCount: 2,
          isMet: false,
        },
      },
      nextAction: {
        criterion: 'Methodology',
        action: 'Continue gathering evidence sources - aim for at least 8 quality sources',
        priority: 'high',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    graphId: 'graph-loading',
    eligibility: baseEligibility,
    loading: true,
  },
};
