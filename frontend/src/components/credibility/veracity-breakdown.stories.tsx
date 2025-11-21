import type { Meta, StoryObj } from '@storybook/react';
import VeracityBreakdown from './veracity-breakdown';

const meta: Meta<typeof VeracityBreakdown> = {
  title: 'Components/Veracity/VeracityBreakdown',
  component: VeracityBreakdown,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VeracityBreakdown>;

const highQualityEvidence = [
  {
    id: '1',
    type: 'Academic Paper',
    description: 'Peer-reviewed study from Nature confirming the claim with statistical significance',
    weight: 0.9,
    addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    addedBy: 'researcher_alice',
  },
  {
    id: '2',
    type: 'Primary Source',
    description: 'Original documentation from the World Health Organization',
    weight: 0.85,
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    addedBy: 'validator_bob',
  },
  {
    id: '3',
    type: 'Expert Opinion',
    description: 'Statement from leading expert in the field with 20+ years experience',
    weight: 0.75,
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    addedBy: 'contributor_charlie',
  },
];

const mediumQualityEvidence = [
  {
    id: '1',
    type: 'News Article',
    description: 'Report from reputable news outlet with verified sources',
    weight: 0.6,
    addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    addedBy: 'contributor_delta',
  },
  {
    id: '2',
    type: 'Blog Post',
    description: 'Analysis from industry professional with supporting data',
    weight: 0.45,
    addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
];

const lowQualityEvidence = [
  {
    id: '1',
    type: 'Social Media',
    description: 'Tweet from verified account, but unverified claim',
    weight: 0.25,
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    addedBy: 'user_echo',
  },
  {
    id: '2',
    type: 'Anecdotal',
    description: 'Personal testimony without corroborating evidence',
    weight: 0.15,
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

export const HighConfidenceWithEvidence: Story = {
  args: {
    data: {
      evidenceScore: 0.85,
      consensusScore: 0.9,
      challengePenalty: 0.05,
      totalScore: 0.9,
      evidence: highQualityEvidence,
    },
    isLoading: false,
  },
};

export const MediumConfidenceWithEvidence: Story = {
  args: {
    data: {
      evidenceScore: 0.55,
      consensusScore: 0.6,
      challengePenalty: 0.15,
      totalScore: 0.55,
      evidence: mediumQualityEvidence,
    },
    isLoading: false,
  },
};

export const LowConfidenceWithEvidence: Story = {
  args: {
    data: {
      evidenceScore: 0.25,
      consensusScore: 0.3,
      challengePenalty: 0.35,
      totalScore: 0.2,
      evidence: lowQualityEvidence,
    },
    isLoading: false,
  },
};

export const NoEvidence: Story = {
  args: {
    data: {
      evidenceScore: 0,
      consensusScore: 0.1,
      challengePenalty: 0.05,
      totalScore: 0.05,
      evidence: [],
    },
    isLoading: false,
  },
};

export const HighlyDisputed: Story = {
  args: {
    data: {
      evidenceScore: 0.7,
      consensusScore: 0.4,
      challengePenalty: 0.5,
      totalScore: 0.35,
      evidence: [
        {
          id: '1',
          type: 'Academic Paper',
          description: 'Original supporting study',
          weight: 0.8,
          addedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          addedBy: 'researcher_alice',
        },
        {
          id: '2',
          type: 'Counter Study',
          description: 'Conflicting research with different methodology',
          weight: 0.7,
          addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          addedBy: 'researcher_bob',
        },
      ],
    },
    isLoading: false,
  },
};

export const StrongConsensusLowEvidence: Story = {
  args: {
    data: {
      evidenceScore: 0.3,
      consensusScore: 0.85,
      challengePenalty: 0.1,
      totalScore: 0.6,
      evidence: [
        {
          id: '1',
          type: 'Expert Agreement',
          description: 'Multiple experts agree despite limited formal evidence',
          weight: 0.5,
          addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    isLoading: false,
  },
};

export const ManyEvidencePieces: Story = {
  args: {
    data: {
      evidenceScore: 0.8,
      consensusScore: 0.75,
      challengePenalty: 0.1,
      totalScore: 0.8,
      evidence: [
        ...highQualityEvidence,
        ...mediumQualityEvidence,
        {
          id: '6',
          type: 'Government Report',
          description: 'Official statistics from government agency',
          weight: 0.8,
          addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          addedBy: 'validator_frank',
        },
      ],
    },
    isLoading: false,
  },
};

export const LoadingState: Story = {
  args: {
    data: {
      evidenceScore: 0,
      consensusScore: 0,
      challengePenalty: 0,
      totalScore: 0,
      evidence: [],
    },
    isLoading: true,
  },
};

export const PerfectScore: Story = {
  args: {
    data: {
      evidenceScore: 1.0,
      consensusScore: 1.0,
      challengePenalty: 0,
      totalScore: 1.0,
      evidence: [
        {
          id: '1',
          type: 'Primary Source',
          description: 'Direct observation with photographic evidence',
          weight: 1.0,
          addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          addedBy: 'verified_source',
        },
      ],
    },
    isLoading: false,
  },
};

export const ZeroScore: Story = {
  args: {
    data: {
      evidenceScore: 0,
      consensusScore: 0,
      challengePenalty: 0.9,
      totalScore: 0,
      evidence: [
        {
          id: '1',
          type: 'Disputed Claim',
          description: 'Claim thoroughly debunked by multiple sources',
          weight: 0.05,
          addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    isLoading: false,
  },
};
