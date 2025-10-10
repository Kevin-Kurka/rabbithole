/**
 * Storybook Stories for ChallengeCard Component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ChallengeCard } from './ChallengeCard';
import { mockChallenges, mockReputations } from './examples/mockChallengeData';
import { ChallengeVoteType } from '@/types/challenge';

const meta: Meta<typeof ChallengeCard> = {
  title: 'Challenge System/ChallengeCard',
  component: ChallengeCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a single challenge with expandable details. Shows challenge type, status, vote distribution, and allows voting.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px', padding: '20px', backgroundColor: '#18181b' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChallengeCard>;

/**
 * Open challenge with no votes yet
 */
export const OpenChallenge: Story = {
  args: {
    challenge: {
      ...mockChallenges[0],
      votes: [],
    },
    currentUserId: 'user1',
    currentUserVote: null,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};

/**
 * Challenge with mixed votes
 */
export const WithMixedVotes: Story = {
  args: {
    challenge: mockChallenges[1],
    currentUserId: 'user5',
    currentUserVote: null,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};

/**
 * Challenge where user has voted to uphold
 */
export const UserVotedUphold: Story = {
  args: {
    challenge: mockChallenges[0],
    currentUserId: 'user2',
    currentUserVote: ChallengeVoteType.UPHOLD,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};

/**
 * Challenge where user has voted to dismiss
 */
export const UserVotedDismiss: Story = {
  args: {
    challenge: mockChallenges[1],
    currentUserId: 'user2',
    currentUserVote: ChallengeVoteType.DISMISS,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};

/**
 * Resolved challenge (upheld)
 */
export const ResolvedUpheld: Story = {
  args: {
    challenge: mockChallenges[2],
    currentUserId: 'user1',
    currentUserVote: ChallengeVoteType.UPHOLD,
  },
};

/**
 * Resolved challenge (dismissed)
 */
export const ResolvedDismissed: Story = {
  args: {
    challenge: mockChallenges[4],
    currentUserId: 'user1',
    currentUserVote: ChallengeVoteType.UPHOLD,
  },
};

/**
 * Expanded challenge showing full details
 */
export const Expanded: Story = {
  args: {
    challenge: mockChallenges[1],
    currentUserId: 'user5',
    currentUserVote: null,
    expanded: true,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};

/**
 * Under review challenge
 */
export const UnderReview: Story = {
  args: {
    challenge: mockChallenges[1],
    currentUserId: 'user5',
    currentUserVote: null,
    onVote: (challengeId, voteType) => {
      console.log('Vote cast:', { challengeId, voteType });
    },
  },
};
