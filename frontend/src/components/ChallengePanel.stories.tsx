/**
 * Storybook Stories for ChallengePanel Component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ChallengePanel } from './ChallengePanel';
import { mockChallenges, getChallengesByNode } from './examples/mockChallengeData';
import { ChallengeVoteType } from '@/types/challenge';

const meta: Meta<typeof ChallengePanel> = {
  title: 'Challenge System/ChallengePanel',
  component: ChallengePanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full panel for viewing and managing challenges on a node or edge. Includes filtering, creation, and voting.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          padding: '20px',
          backgroundColor: '#18181b',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChallengePanel>;

/**
 * Panel with multiple challenges
 */
export const WithChallenges: Story = {
  args: {
    nodeId: 'node1',
    challenges: mockChallenges,
    currentUserId: 'user1',
    onCreateChallenge: (input) => {
      console.log('Create challenge:', input);
    },
    onVote: (challengeId, voteType) => {
      console.log('Vote:', { challengeId, voteType });
    },
  },
};

/**
 * Empty panel (no challenges)
 */
export const Empty: Story = {
  args: {
    nodeId: 'node999',
    challenges: [],
    currentUserId: 'user1',
    onCreateChallenge: (input) => {
      console.log('Create challenge:', input);
    },
    onVote: (challengeId, voteType) => {
      console.log('Vote:', { challengeId, voteType });
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    nodeId: 'node1',
    challenges: [],
    currentUserId: 'user1',
    loading: true,
  },
};

/**
 * Node with only one challenge
 */
export const SingleChallenge: Story = {
  args: {
    nodeId: 'node1',
    challenges: [mockChallenges[0]],
    currentUserId: 'user1',
    onCreateChallenge: (input) => {
      console.log('Create challenge:', input);
    },
    onVote: (challengeId, voteType) => {
      console.log('Vote:', { challengeId, voteType });
    },
  },
};

/**
 * For an edge instead of node
 */
export const ForEdge: Story = {
  args: {
    edgeId: 'edge1',
    challenges: mockChallenges.slice(0, 2),
    currentUserId: 'user1',
    onCreateChallenge: (input) => {
      console.log('Create challenge:', input);
    },
    onVote: (challengeId, voteType) => {
      console.log('Vote:', { challengeId, voteType });
    },
  },
};

/**
 * Read-only mode (no create or vote actions)
 */
export const ReadOnly: Story = {
  args: {
    nodeId: 'node1',
    challenges: mockChallenges,
    currentUserId: undefined,
  },
};
