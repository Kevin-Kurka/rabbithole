/**
 * Storybook Stories for MethodologyProgressPanel
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MethodologyProgressPanel } from './MethodologyProgressPanel';
import { MethodologyStep } from '../types/promotion';

const meta: Meta<typeof MethodologyProgressPanel> = {
  title: 'Promotion/MethodologyProgressPanel',
  component: MethodologyProgressPanel,
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
type Story = StoryObj<typeof MethodologyProgressPanel>;

const mockSteps: MethodologyStep[] = [
  {
    id: '1',
    name: 'Define Research Question',
    description: 'Clearly state the hypothesis or question being investigated',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user1',
      username: 'researcher_alice',
    },
    completedAt: '2025-10-01T10:00:00Z',
    evidenceIds: ['ev1', 'ev2'],
  },
  {
    id: '2',
    name: 'Gather Primary Sources',
    description: 'Collect and document all primary evidence sources',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user2',
      username: 'data_curator_bob',
    },
    completedAt: '2025-10-03T14:30:00Z',
    evidenceIds: ['ev3', 'ev4', 'ev5'],
  },
  {
    id: '3',
    name: 'Validate Source Credibility',
    description: 'Verify authenticity and reliability of all sources',
    isCompleted: true,
    completionPercentage: 100,
    completedBy: {
      id: 'user3',
      username: 'verifier_carol',
    },
    completedAt: '2025-10-05T09:15:00Z',
  },
  {
    id: '4',
    name: 'Cross-Reference Claims',
    description: 'Compare claims across multiple independent sources',
    isCompleted: false,
    completionPercentage: 65,
  },
  {
    id: '5',
    name: 'Community Review',
    description: 'Open for peer review and feedback from community',
    isCompleted: false,
    completionPercentage: 0,
  },
  {
    id: '6',
    name: 'Address Challenges',
    description: 'Respond to any challenges or concerns raised',
    isCompleted: false,
    completionPercentage: 0,
  },
];

export const InProgress: Story = {
  args: {
    graphId: 'graph-123',
    methodologyName: 'Scientific Method',
    steps: mockSteps,
    completionPercentage: 61,
    nextStepSuggestion:
      'Focus on cross-referencing claims with at least 3 independent sources. This will strengthen the evidence base.',
  },
};

export const JustStarted: Story = {
  args: {
    graphId: 'graph-456',
    methodologyName: 'Historical Analysis',
    steps: [
      {
        id: '1',
        name: 'Identify Primary Sources',
        description: 'Locate and document historical documents',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u1', username: 'historian_dave' },
        completedAt: '2025-10-08T12:00:00Z',
      },
      {
        id: '2',
        name: 'Contextualize Period',
        description: 'Research historical context and background',
        isCompleted: false,
        completionPercentage: 0,
      },
      {
        id: '3',
        name: 'Analyze Sources',
        description: 'Critical analysis of source materials',
        isCompleted: false,
        completionPercentage: 0,
      },
      {
        id: '4',
        name: 'Synthesize Findings',
        description: 'Draw connections and conclusions',
        isCompleted: false,
        completionPercentage: 0,
      },
    ],
    completionPercentage: 25,
    nextStepSuggestion:
      'Begin contextualizing the historical period. Add background information about the time and place.',
  },
};

export const AlmostComplete: Story = {
  args: {
    graphId: 'graph-789',
    methodologyName: 'Legal Research Methodology',
    steps: [
      {
        id: '1',
        name: 'Identify Relevant Statutes',
        description: 'Find applicable laws and regulations',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u1', username: 'legal_expert_eve' },
        completedAt: '2025-09-20T10:00:00Z',
      },
      {
        id: '2',
        name: 'Review Case Law',
        description: 'Analyze relevant judicial precedents',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u2', username: 'case_analyst_frank' },
        completedAt: '2025-09-25T15:30:00Z',
      },
      {
        id: '3',
        name: 'Synthesize Legal Arguments',
        description: 'Combine statutes and precedents into coherent analysis',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u1', username: 'legal_expert_eve' },
        completedAt: '2025-10-01T11:00:00Z',
      },
      {
        id: '4',
        name: 'Final Peer Review',
        description: 'Expert review by legal professionals',
        isCompleted: false,
        completionPercentage: 80,
      },
    ],
    completionPercentage: 95,
    nextStepSuggestion:
      'Almost there! Request final review from at least 2 legal experts in the community.',
  },
};

export const FullyCompleted: Story = {
  args: {
    graphId: 'graph-complete',
    methodologyName: 'Medical Research Protocol',
    steps: [
      {
        id: '1',
        name: 'Literature Review',
        description: 'Comprehensive review of existing research',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u1', username: 'dr_researcher' },
        completedAt: '2025-09-10T09:00:00Z',
      },
      {
        id: '2',
        name: 'Data Collection',
        description: 'Gather and document medical data',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u2', username: 'data_scientist_grace' },
        completedAt: '2025-09-15T14:00:00Z',
      },
      {
        id: '3',
        name: 'Statistical Analysis',
        description: 'Perform rigorous statistical analysis',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u3', username: 'statistician_henry' },
        completedAt: '2025-09-20T16:30:00Z',
      },
      {
        id: '4',
        name: 'Peer Validation',
        description: 'External validation by medical experts',
        isCompleted: true,
        completionPercentage: 100,
        completedBy: { id: 'u4', username: 'peer_reviewer_iris' },
        completedAt: '2025-09-25T10:00:00Z',
      },
    ],
    completionPercentage: 100,
  },
};

export const NoSteps: Story = {
  args: {
    graphId: 'graph-empty',
    methodologyName: 'Custom Methodology',
    steps: [],
    completionPercentage: 0,
    nextStepSuggestion:
      'Define your methodology steps to get started. What\'s the first step in your process?',
  },
};

export const Loading: Story = {
  args: {
    graphId: 'graph-loading',
    methodologyName: 'Loading...',
    steps: [],
    completionPercentage: 0,
    loading: true,
  },
};
