import type { Meta, StoryObj } from '@storybook/react';
import VeracityTimeline from './veracity-timeline';

const meta: Meta<typeof VeracityTimeline> = {
  title: 'Components/Veracity/VeracityTimeline',
  component: VeracityTimeline,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VeracityTimeline>;

const generateSampleHistory = () => {
  const now = new Date();
  return [
    {
      score: 0.5,
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      reason: 'Initial claim submitted without evidence',
    },
    {
      score: 0.65,
      timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      reason: 'First piece of supporting evidence added',
      eventType: 'evidence_added' as const,
    },
    {
      score: 0.75,
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      reason: 'Additional evidence from reliable source',
      eventType: 'evidence_added' as const,
    },
    {
      score: 0.6,
      timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      reason: 'Challenge raised questioning source reliability',
    },
    {
      score: 0.8,
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      reason: 'Challenge resolved with additional verification',
      eventType: 'challenge_resolved' as const,
    },
    {
      score: 0.85,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      reason: 'Consensus reached among validators',
      eventType: 'consensus_changed' as const,
    },
    {
      score: 0.9,
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      reason: 'High-quality evidence added from academic source',
      eventType: 'evidence_added' as const,
    },
  ];
};

const generateUpwardTrend = () => {
  const now = new Date();
  return [
    {
      score: 0.2,
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      reason: 'Initial low-confidence claim',
    },
    {
      score: 0.35,
      timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      reason: 'First evidence added',
      eventType: 'evidence_added' as const,
    },
    {
      score: 0.5,
      timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      reason: 'More supporting evidence',
      eventType: 'evidence_added' as const,
    },
    {
      score: 0.7,
      timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      reason: 'Strong consensus building',
      eventType: 'consensus_changed' as const,
    },
    {
      score: 0.85,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      reason: 'High-quality verification',
      eventType: 'evidence_added' as const,
    },
  ];
};

const generateDownwardTrend = () => {
  const now = new Date();
  return [
    {
      score: 0.9,
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      reason: 'Initially high confidence',
    },
    {
      score: 0.75,
      timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      reason: 'Challenge raised with counter-evidence',
    },
    {
      score: 0.6,
      timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      reason: 'Additional challenges',
    },
    {
      score: 0.45,
      timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      reason: 'Consensus weakening',
      eventType: 'consensus_changed' as const,
    },
    {
      score: 0.3,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      reason: 'Significant doubts raised',
    },
  ];
};

const generateVolatileHistory = () => {
  const now = new Date();
  return [
    {
      score: 0.5,
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      reason: 'Initial claim',
    },
    {
      score: 0.8,
      timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      reason: 'Strong evidence added',
      eventType: 'evidence_added' as const,
    },
    {
      score: 0.4,
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      reason: 'Major challenge',
    },
    {
      score: 0.7,
      timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      reason: 'Challenge resolved',
      eventType: 'challenge_resolved' as const,
    },
    {
      score: 0.35,
      timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      reason: 'New contradictory evidence',
    },
    {
      score: 0.65,
      timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      reason: 'Clarification provided',
    },
    {
      score: 0.55,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      reason: 'Minor adjustment',
    },
  ];
};

export const StandardHistory: Story = {
  args: {
    history: generateSampleHistory(),
    height: 300,
  },
};

export const UpwardTrend: Story = {
  args: {
    history: generateUpwardTrend(),
    height: 300,
  },
};

export const DownwardTrend: Story = {
  args: {
    history: generateDownwardTrend(),
    height: 300,
  },
};

export const VolatileHistory: Story = {
  args: {
    history: generateVolatileHistory(),
    height: 300,
  },
};

export const SingleDataPoint: Story = {
  args: {
    history: [
      {
        score: 0.75,
        timestamp: new Date(),
        reason: 'Only one data point available',
      },
    ],
    height: 300,
  },
};

export const TwoDataPoints: Story = {
  args: {
    history: [
      {
        score: 0.5,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reason: 'Initial state',
      },
      {
        score: 0.8,
        timestamp: new Date(),
        reason: 'Current state after improvement',
        eventType: 'evidence_added' as const,
      },
    ],
    height: 300,
  },
};

export const EmptyHistory: Story = {
  args: {
    history: [],
    height: 300,
  },
};

export const CompactView: Story = {
  args: {
    history: generateSampleHistory(),
    height: 150,
  },
};

export const TallView: Story = {
  args: {
    history: generateSampleHistory(),
    height: 500,
  },
};
