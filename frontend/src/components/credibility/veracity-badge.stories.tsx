import type { Meta, StoryObj } from '@storybook/react';
import VeracityBadge from './credibility/veracity-badge';

const meta: Meta<typeof VeracityBadge> = {
  title: 'Components/Veracity/VeracityBadge',
  component: VeracityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Veracity score from 0.0 to 1.0',
    },
    isLevel0: {
      control: 'boolean',
      description: 'Whether this is a Level 0 verified node',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
    },
  },
};

export default meta;
type Story = StoryObj<typeof VeracityBadge>;

export const Level0Verified: Story = {
  args: {
    score: 1.0,
    isLevel0: true,
    size: 'md',
  },
};

export const HighConfidence: Story = {
  args: {
    score: 0.85,
    isLevel0: false,
    size: 'md',
  },
};

export const MediumConfidence: Story = {
  args: {
    score: 0.55,
    isLevel0: false,
    size: 'md',
  },
};

export const LowConfidence: Story = {
  args: {
    score: 0.25,
    isLevel0: false,
    size: 'md',
  },
};

export const VeryLowConfidence: Story = {
  args: {
    score: 0.05,
    isLevel0: false,
    size: 'md',
  },
};

export const SmallSize: Story = {
  args: {
    score: 0.75,
    isLevel0: false,
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    score: 0.75,
    isLevel0: false,
    size: 'lg',
  },
};

export const AllScoreRanges: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex items-center gap-3">
        <VeracityBadge score={1.0} isLevel0={true} size="md" />
        <span className="text-sm text-gray-400">Level 0 (Verified)</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.95} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">95% - High Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.7} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">70% - High Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.55} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">55% - Medium Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.4} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">40% - Medium Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.25} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">25% - Low Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.1} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">10% - Low Confidence</span>
      </div>
      <div className="flex items-center gap-3">
        <VeracityBadge score={0.05} isLevel0={false} size="md" />
        <span className="text-sm text-gray-400">5% - Very Low Confidence</span>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <VeracityBadge score={0.85} size="sm" />
        <span className="text-xs text-gray-400">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <VeracityBadge score={0.85} size="md" />
        <span className="text-xs text-gray-400">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <VeracityBadge score={0.85} size="lg" />
        <span className="text-xs text-gray-400">Large</span>
      </div>
    </div>
  ),
};
