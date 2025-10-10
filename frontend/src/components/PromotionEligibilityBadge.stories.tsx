/**
 * Storybook Stories for PromotionEligibilityBadge
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PromotionEligibilityBadge, PromotionEligibilityBadgeCompact } from './PromotionEligibilityBadge';
import { PromotionEligibilityBadgeData } from '../types/promotion';

const meta: Meta<typeof PromotionEligibilityBadge> = {
  title: 'Promotion/PromotionEligibilityBadge',
  component: PromotionEligibilityBadge,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#27272a' }],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromotionEligibilityBadge>;

const eligibleData: PromotionEligibilityBadgeData = {
  overallScore: 92,
  isEligible: true,
  criteriaMet: 4,
  totalCriteria: 4,
  nextAction: undefined,
};

const almostEligibleData: PromotionEligibilityBadgeData = {
  overallScore: 76,
  isEligible: false,
  criteriaMet: 3,
  totalCriteria: 4,
  nextAction: 'Need 4% more consensus',
};

const midProgressData: PromotionEligibilityBadgeData = {
  overallScore: 58,
  isEligible: false,
  criteriaMet: 2,
  totalCriteria: 4,
  nextAction: 'Complete methodology steps',
};

const earlyStageData: PromotionEligibilityBadgeData = {
  overallScore: 32,
  isEligible: false,
  criteriaMet: 1,
  totalCriteria: 4,
  nextAction: 'Gather evidence sources',
};

export const EligibleSmall: Story = {
  args: {
    graphId: 'graph-eligible',
    eligibilityData: eligibleData,
    size: 'sm',
    showTooltip: true,
  },
};

export const EligibleMedium: Story = {
  args: {
    graphId: 'graph-eligible',
    eligibilityData: eligibleData,
    size: 'md',
    showTooltip: true,
  },
};

export const EligibleLarge: Story = {
  args: {
    graphId: 'graph-eligible',
    eligibilityData: eligibleData,
    size: 'lg',
    showTooltip: true,
  },
};

export const AlmostEligible: Story = {
  args: {
    graphId: 'graph-almost',
    eligibilityData: almostEligibleData,
    size: 'md',
    showTooltip: true,
  },
};

export const MidProgress: Story = {
  args: {
    graphId: 'graph-mid',
    eligibilityData: midProgressData,
    size: 'md',
    showTooltip: true,
  },
};

export const EarlyStage: Story = {
  args: {
    graphId: 'graph-early',
    eligibilityData: earlyStageData,
    size: 'md',
    showTooltip: true,
  },
};

export const WithoutTooltip: Story = {
  args: {
    graphId: 'graph-no-tooltip',
    eligibilityData: almostEligibleData,
    size: 'md',
    showTooltip: false,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <PromotionEligibilityBadge
        graphId="graph-1"
        eligibilityData={eligibleData}
        size="sm"
      />
      <PromotionEligibilityBadge
        graphId="graph-2"
        eligibilityData={eligibleData}
        size="md"
      />
      <PromotionEligibilityBadge
        graphId="graph-3"
        eligibilityData={eligibleData}
        size="lg"
      />
    </div>
  ),
};

export const AllScores: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-100"
          eligibilityData={{ ...eligibleData, overallScore: 100 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">100% - Perfect</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-85"
          eligibilityData={{ ...eligibleData, overallScore: 85 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">85% - Eligible</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-75"
          eligibilityData={{ ...almostEligibleData, overallScore: 75 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">75% - Almost</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-60"
          eligibilityData={{ ...midProgressData, overallScore: 60 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">60% - Mid Progress</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-40"
          eligibilityData={{ ...midProgressData, overallScore: 40 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">40% - Early Stage</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadge
          graphId="graph-20"
          eligibilityData={{ ...earlyStageData, overallScore: 20 }}
          size="md"
        />
        <p className="text-xs text-zinc-400 mt-2">20% - Just Started</p>
      </div>
    </div>
  ),
};

// Compact Badge Stories
export const CompactEligible: StoryObj<typeof PromotionEligibilityBadgeCompact> = {
  render: () => (
    <PromotionEligibilityBadgeCompact score={92} isEligible={true} />
  ),
};

export const CompactInProgress: StoryObj<typeof PromotionEligibilityBadgeCompact> = {
  render: () => (
    <PromotionEligibilityBadgeCompact score={68} isEligible={false} />
  ),
};

export const CompactEarlyStage: StoryObj<typeof PromotionEligibilityBadgeCompact> = {
  render: () => (
    <PromotionEligibilityBadgeCompact score={35} isEligible={false} />
  ),
};

export const CompactAllScores: StoryObj<typeof PromotionEligibilityBadgeCompact> = {
  render: () => (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={100} isEligible={true} />
        <p className="text-xs text-zinc-400 mt-2">100%</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={85} isEligible={true} />
        <p className="text-xs text-zinc-400 mt-2">85%</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={70} isEligible={false} />
        <p className="text-xs text-zinc-400 mt-2">70%</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={55} isEligible={false} />
        <p className="text-xs text-zinc-400 mt-2">55%</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={35} isEligible={false} />
        <p className="text-xs text-zinc-400 mt-2">35%</p>
      </div>
      <div className="text-center">
        <PromotionEligibilityBadgeCompact score={15} isEligible={false} />
        <p className="text-xs text-zinc-400 mt-2">15%</p>
      </div>
    </div>
  ),
};

export const InGraphList: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      {[
        { id: 'g1', name: 'Climate Change Analysis', score: 92, eligible: true },
        { id: 'g2', name: 'Historical Event Timeline', score: 78, eligible: false },
        { id: 'g3', name: 'Medical Research Study', score: 55, eligible: false },
        { id: 'g4', name: 'Legal Precedent Map', score: 32, eligible: false },
      ].map((graph) => (
        <div
          key={graph.id}
          className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800"
        >
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-zinc-50">{graph.name}</h4>
            <p className="text-xs text-zinc-400 mt-1">Updated 2 hours ago</p>
          </div>
          <PromotionEligibilityBadge
            graphId={graph.id}
            eligibilityData={{
              overallScore: graph.score,
              isEligible: graph.eligible,
              criteriaMet: Math.floor(graph.score / 25),
              totalCriteria: 4,
            }}
            size="sm"
          />
        </div>
      ))}
    </div>
  ),
};
