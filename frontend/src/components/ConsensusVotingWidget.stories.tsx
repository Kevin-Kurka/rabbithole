/**
 * Storybook Stories for ConsensusVotingWidget
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ConsensusVotingWidget } from './ConsensusVotingWidget';
import { ConsensusVote } from '../types/promotion';

const meta: Meta<typeof ConsensusVotingWidget> = {
  title: 'Promotion/ConsensusVotingWidget',
  component: ConsensusVotingWidget,
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
type Story = StoryObj<typeof ConsensusVotingWidget>;

const mockVotes: ConsensusVote[] = [
  {
    userId: 'user1',
    username: 'expert_researcher',
    reputationScore: 95,
    confidence: 92,
    reasoning:
      'Thoroughly reviewed all evidence. Sources are credible and methodology is sound. High confidence in these findings.',
    votedAt: '2025-10-08T10:30:00Z',
    voteWeight: 1.8,
  },
  {
    userId: 'user2',
    username: 'data_validator',
    reputationScore: 87,
    confidence: 88,
    reasoning:
      'Cross-referenced primary sources. Everything checks out. Minor concerns about sample size but overall very strong.',
    votedAt: '2025-10-08T12:15:00Z',
    voteWeight: 1.6,
  },
  {
    userId: 'user3',
    username: 'community_member',
    reputationScore: 65,
    confidence: 75,
    reasoning: 'Evidence looks solid. Would like to see one more independent source for the main claim.',
    votedAt: '2025-10-08T14:45:00Z',
    voteWeight: 1.2,
  },
  {
    userId: 'user4',
    username: 'skeptical_reviewer',
    reputationScore: 78,
    confidence: 68,
    reasoning:
      'Good work overall but I have concerns about the interpretation of data point #3. Needs clarification.',
    votedAt: '2025-10-08T16:20:00Z',
    voteWeight: 1.4,
  },
  {
    userId: 'user5',
    username: 'new_contributor',
    reputationScore: 42,
    confidence: 80,
    reasoning: 'Looks good to me based on my understanding.',
    votedAt: '2025-10-08T18:00:00Z',
    voteWeight: 0.8,
  },
];

export const HighConsensus: Story = {
  args: {
    graphId: 'graph-123',
    overallScore: 86,
    voteCount: 5,
    votes: mockVotes,
    targetConsensus: 80,
    userReputation: {
      score: 72,
      level: 2,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
  },
};

export const MediumConsensus: Story = {
  args: {
    graphId: 'graph-456',
    overallScore: 64,
    voteCount: 3,
    votes: mockVotes.slice(0, 3),
    targetConsensus: 80,
    userReputation: {
      score: 85,
      level: 3,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
    },
  },
};

export const LowConsensus: Story = {
  args: {
    graphId: 'graph-789',
    overallScore: 42,
    voteCount: 4,
    votes: [
      {
        userId: 'user1',
        username: 'critical_reviewer',
        reputationScore: 88,
        confidence: 35,
        reasoning:
          'Major concerns about the primary source credibility. Need more verification before I can support this.',
        votedAt: '2025-10-08T10:00:00Z',
        voteWeight: 1.6,
      },
      {
        userId: 'user2',
        username: 'supporter',
        reputationScore: 75,
        confidence: 70,
        reasoning: 'I think the evidence is sufficient despite some concerns.',
        votedAt: '2025-10-08T11:00:00Z',
        voteWeight: 1.4,
      },
      {
        userId: 'user3',
        username: 'neutral_observer',
        reputationScore: 60,
        confidence: 50,
        reasoning: 'On the fence. Could go either way with more data.',
        votedAt: '2025-10-08T12:00:00Z',
        voteWeight: 1.1,
      },
      {
        userId: 'user4',
        username: 'another_critic',
        reputationScore: 82,
        confidence: 30,
        reasoning: 'Methodology has significant flaws. Not ready for Level 0.',
        votedAt: '2025-10-08T13:00:00Z',
        voteWeight: 1.5,
      },
    ],
    targetConsensus: 80,
    userReputation: {
      score: 90,
      level: 3,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
    },
  },
};

export const UserAlreadyVoted: Story = {
  args: {
    graphId: 'graph-voted',
    overallScore: 78,
    voteCount: 4,
    votes: mockVotes.slice(0, 4),
    targetConsensus: 80,
    userVote: {
      confidence: 75,
      reasoning: 'Evidence looks solid. Would like to see one more independent source for the main claim.',
    },
    userReputation: {
      score: 65,
      level: 2,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote updated:', { confidence, reasoning });
    },
  },
};

export const NoVotesYet: Story = {
  args: {
    graphId: 'graph-empty',
    overallScore: 0,
    voteCount: 0,
    votes: [],
    targetConsensus: 80,
    userReputation: {
      score: 70,
      level: 2,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('First vote submitted:', { confidence, reasoning });
    },
  },
};

export const UserCannotVote: Story = {
  args: {
    graphId: 'graph-no-vote',
    overallScore: 75,
    voteCount: 3,
    votes: mockVotes.slice(0, 3),
    targetConsensus: 80,
    userReputation: {
      score: 25,
      level: 0,
      canVote: false,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
    },
  },
};

export const NewUser: Story = {
  args: {
    graphId: 'graph-new-user',
    overallScore: 82,
    voteCount: 5,
    votes: mockVotes,
    targetConsensus: 80,
    userReputation: {
      score: 10,
      level: 0,
      canVote: false,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
    },
  },
};

export const Loading: Story = {
  args: {
    graphId: 'graph-loading',
    overallScore: 0,
    voteCount: 0,
    votes: [],
    targetConsensus: 80,
    loading: true,
  },
};

export const ManyVotes: Story = {
  args: {
    graphId: 'graph-many-votes',
    overallScore: 81,
    voteCount: 12,
    votes: [
      ...mockVotes,
      {
        userId: 'user6',
        username: 'reviewer_six',
        reputationScore: 70,
        confidence: 85,
        reasoning: 'Excellent work on this research.',
        votedAt: '2025-10-08T19:00:00Z',
        voteWeight: 1.3,
      },
      {
        userId: 'user7',
        username: 'reviewer_seven',
        reputationScore: 90,
        confidence: 90,
        reasoning: 'Very thorough and well-documented.',
        votedAt: '2025-10-08T20:00:00Z',
        voteWeight: 1.7,
      },
      {
        userId: 'user8',
        username: 'reviewer_eight',
        reputationScore: 55,
        confidence: 72,
        reasoning: 'Good evidence base.',
        votedAt: '2025-10-08T21:00:00Z',
        voteWeight: 1.0,
      },
      {
        userId: 'user9',
        username: 'reviewer_nine',
        reputationScore: 80,
        confidence: 78,
        reasoning: 'Solid methodology, minor improvements possible.',
        votedAt: '2025-10-09T08:00:00Z',
        voteWeight: 1.5,
      },
      {
        userId: 'user10',
        username: 'reviewer_ten',
        reputationScore: 68,
        confidence: 83,
        reasoning: 'Well-researched and credible sources.',
        votedAt: '2025-10-09T09:00:00Z',
        voteWeight: 1.2,
      },
      {
        userId: 'user11',
        username: 'reviewer_eleven',
        reputationScore: 92,
        confidence: 88,
        reasoning: 'Comprehensive analysis with strong evidence.',
        votedAt: '2025-10-09T10:00:00Z',
        voteWeight: 1.8,
      },
      {
        userId: 'user12',
        username: 'reviewer_twelve',
        reputationScore: 76,
        confidence: 80,
        reasoning: 'Good overall, ready for promotion.',
        votedAt: '2025-10-09T11:00:00Z',
        voteWeight: 1.4,
      },
    ],
    targetConsensus: 80,
    userReputation: {
      score: 72,
      level: 2,
      canVote: true,
    },
    onSubmitVote: async (confidence, reasoning) => {
      console.log('Vote submitted:', { confidence, reasoning });
    },
  },
};
