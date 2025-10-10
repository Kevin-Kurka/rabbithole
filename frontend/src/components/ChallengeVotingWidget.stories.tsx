/**
 * Storybook Stories for ChallengeVotingWidget Component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ChallengeVotingWidget } from './ChallengeVotingWidget';
import { mockChallenges, mockReputations } from './examples/mockChallengeData';
import { ChallengeVoteType } from '@/types/challenge';

const meta: Meta<typeof ChallengeVotingWidget> = {
  title: 'Challenge System/ChallengeVotingWidget',
  component: ChallengeVotingWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dedicated voting interface showing vote distribution and allowing users to cast weighted votes.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '500px', padding: '20px', backgroundColor: '#18181b' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChallengeVotingWidget>;

/**
 * Default voting widget
 */
export const Default: Story = {
  args: {
    challengeId: 'challenge1',
    challenge: mockChallenges[0],
    userReputation: mockReputations.user1,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * With mixed votes (close competition)
 */
export const MixedVotes: Story = {
  args: {
    challengeId: 'challenge2',
    challenge: mockChallenges[1],
    userReputation: mockReputations.user1,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * User with high reputation
 */
export const HighReputationUser: Story = {
  args: {
    challengeId: 'challenge1',
    challenge: mockChallenges[0],
    userReputation: mockReputations.user4,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * User with low reputation
 */
export const LowReputationUser: Story = {
  args: {
    challengeId: 'challenge1',
    challenge: mockChallenges[0],
    userReputation: mockReputations.user3,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * User already voted to uphold
 */
export const AlreadyVotedUphold: Story = {
  args: {
    challengeId: 'challenge1',
    challenge: mockChallenges[0],
    userReputation: mockReputations.user2,
    currentUserVote: ChallengeVoteType.UPHOLD,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * User already voted to dismiss
 */
export const AlreadyVotedDismiss: Story = {
  args: {
    challengeId: 'challenge2',
    challenge: mockChallenges[1],
    userReputation: mockReputations.user2,
    currentUserVote: ChallengeVoteType.DISMISS,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * Disabled (challenge closed)
 */
export const Disabled: Story = {
  args: {
    challengeId: 'challenge3',
    challenge: mockChallenges[2],
    userReputation: mockReputations.user1,
    currentUserVote: null,
    disabled: true,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * Challenge with no votes yet
 */
export const NoVotes: Story = {
  args: {
    challengeId: 'challenge1',
    challenge: {
      ...mockChallenges[0],
      votes: [],
    },
    userReputation: mockReputations.user1,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};

/**
 * Without challenge data (manual vote counts)
 */
export const ManualVoteCounts: Story = {
  args: {
    challengeId: 'challenge1',
    currentVotes: {
      upholdWeight: 150,
      dismissWeight: 85,
      totalParticipants: 5,
    },
    userReputation: mockReputations.user1,
    currentUserVote: null,
    onVote: (challengeId, voteType, reasoning) => {
      console.log('Vote cast:', { challengeId, voteType, reasoning });
    },
  },
};
