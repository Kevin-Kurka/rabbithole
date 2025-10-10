/**
 * Storybook Stories for ReputationBadge Component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ReputationBadge } from './ReputationBadge';
import { mockReputations } from './examples/mockChallengeData';

const meta: Meta<typeof ReputationBadge> = {
  title: 'Challenge System/ReputationBadge',
  component: ReputationBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays user reputation score with color coding. Hover to see detailed breakdown.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '40px', backgroundColor: '#18181b' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReputationBadge>;

/**
 * High reputation (expert level)
 */
export const HighReputation: Story = {
  args: {
    userId: 'user4',
    reputation: mockReputations.user4,
    size: 'md',
    showLabel: true,
    showTooltip: true,
  },
};

/**
 * Medium reputation (established)
 */
export const MediumReputation: Story = {
  args: {
    userId: 'user2',
    reputation: mockReputations.user2,
    size: 'md',
    showLabel: true,
    showTooltip: true,
  },
};

/**
 * Low reputation (new user)
 */
export const LowReputation: Story = {
  args: {
    userId: 'user3',
    reputation: mockReputations.user3,
    size: 'md',
    showLabel: true,
    showTooltip: true,
  },
};

/**
 * Small size
 */
export const SmallSize: Story = {
  args: {
    userId: 'user1',
    reputation: mockReputations.user1,
    size: 'sm',
    showLabel: false,
    showTooltip: true,
  },
};

/**
 * Large size
 */
export const LargeSize: Story = {
  args: {
    userId: 'user1',
    reputation: mockReputations.user1,
    size: 'lg',
    showLabel: true,
    showTooltip: true,
  },
};

/**
 * Without tooltip
 */
export const NoTooltip: Story = {
  args: {
    userId: 'user1',
    reputation: mockReputations.user1,
    size: 'md',
    showLabel: true,
    showTooltip: false,
  },
};

/**
 * Without reputation data (uses default)
 */
export const NoReputationData: Story = {
  args: {
    userId: 'user999',
    size: 'md',
    showLabel: true,
    showTooltip: true,
  },
};

/**
 * Comparison of all reputation levels
 */
export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <span style={{ color: '#fafafa', width: '100px' }}>Expert (92):</span>
        <ReputationBadge
          userId="user4"
          reputation={mockReputations.user4}
          size="md"
          showLabel={true}
        />
      </div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <span style={{ color: '#fafafa', width: '100px' }}>Trusted (85):</span>
        <ReputationBadge
          userId="user1"
          reputation={mockReputations.user1}
          size="md"
          showLabel={true}
        />
      </div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <span style={{ color: '#fafafa', width: '100px' }}>Established (62):</span>
        <ReputationBadge
          userId="user2"
          reputation={mockReputations.user2}
          size="md"
          showLabel={true}
        />
      </div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <span style={{ color: '#fafafa', width: '100px' }}>Developing (35):</span>
        <ReputationBadge
          userId="user3"
          reputation={mockReputations.user3}
          size="md"
          showLabel={true}
        />
      </div>
    </div>
  ),
};
