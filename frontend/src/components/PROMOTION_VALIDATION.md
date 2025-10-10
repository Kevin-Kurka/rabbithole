# Promotion Validation UI Components

## Overview

Transparent, egalitarian system for Level 0 graph promotion. No hidden criteria, no gatekeepers. All progress visible to the community.

## Core Principles

### Transparency
- **All criteria visible**: Users see exactly what's needed for promotion
- **Real-time updates**: Scores update as community participates
- **No hidden requirements**: Every threshold and calculation is exposed

### Community-Driven
- **Vote weights visible**: Everyone can see how votes are weighted
- **Reputation-based**: Weight based on evidence quality, not authority
- **Participation tracking**: See who contributed and how

### Actionable
- **Clear next steps**: AI-powered suggestions for improvement
- **Progress indicators**: Visual feedback on every criterion
- **Prioritized actions**: High/medium/low priority recommendations

## Components

### 1. PromotionEligibilityDashboard

**Purpose**: Main overview showing all 4 promotion criteria with overall status.

**Location**: `/Users/kmk/rabbithole/frontend/src/components/PromotionEligibilityDashboard.tsx`

**Props**:
```typescript
interface PromotionEligibilityDashboardProps {
  graphId: string;
  eligibility: PromotionEligibility;
  loading?: boolean;
}
```

**Features**:
- Overall eligibility banner (green/yellow/red)
- 4 circular progress indicators:
  - Methodology Completion (target: 100%)
  - Community Consensus (target: ≥80%)
  - Evidence Quality (target: ≥70%)
  - Challenge Resolution (target: 100% - no open challenges)
- "What's Next" panel with actionable items
- Last updated timestamp

**Usage**:
```tsx
import { PromotionEligibilityDashboard } from './PromotionEligibilityDashboard';

<PromotionEligibilityDashboard
  graphId="graph-123"
  eligibility={eligibilityData}
/>
```

### 2. MethodologyProgressPanel

**Purpose**: Detailed checklist of methodology workflow steps.

**Location**: `/Users/kmk/rabbithole/frontend/src/components/MethodologyProgressPanel.tsx`

**Props**:
```typescript
interface MethodologyProgressPanelProps {
  graphId: string;
  methodologyName: string;
  steps: MethodologyStep[];
  completionPercentage: number;
  nextStepSuggestion?: string;
  loading?: boolean;
}
```

**Features**:
- Checklist with green checkmarks (completed) or gray circles (incomplete)
- Progress bar showing overall completion
- Shows who completed each step and when
- AI-powered "next step" suggestion
- Completion celebration when 100%

**Usage**:
```tsx
import { MethodologyProgressPanel } from './MethodologyProgressPanel';

<MethodologyProgressPanel
  graphId="graph-123"
  methodologyName="Scientific Method"
  steps={methodologySteps}
  completionPercentage={68}
  nextStepSuggestion="Focus on cross-referencing claims..."
/>
```

### 3. ConsensusVotingWidget

**Purpose**: Community voting interface with transparent vote weights.

**Location**: `/Users/kmk/rabbithole/frontend/src/components/ConsensusVotingWidget.tsx`

**Props**:
```typescript
interface ConsensusVotingWidgetProps {
  graphId: string;
  overallScore: number;
  voteCount: number;
  votes: ConsensusVote[];
  targetConsensus: number;
  userVote?: { confidence: number; reasoning: string };
  userReputation?: { score: number; level: number; canVote: boolean };
  onSubmitVote?: (confidence: number, reasoning: string) => Promise<void>;
  loading?: boolean;
}
```

**Features**:
- Overall consensus score display
- List of all votes with:
  - Username and reputation score
  - Confidence level (0-100%)
  - Vote weight (calculated from reputation + evidence quality)
  - Reasoning (optional)
  - Timestamp
- Vote submission form with:
  - Confidence slider (0-100%)
  - Reasoning text area
  - User's reputation display
- Vote weight calculation transparency
- Color-coded confidence levels

**Usage**:
```tsx
import { ConsensusVotingWidget } from './ConsensusVotingWidget';

<ConsensusVotingWidget
  graphId="graph-123"
  overallScore={86}
  voteCount={5}
  votes={consensusVotes}
  targetConsensus={80}
  userReputation={{ score: 72, level: 2, canVote: true }}
  onSubmitVote={handleVoteSubmit}
/>
```

### 4. PromotionEligibilityBadge

**Purpose**: Compact badge for graph lists and preview cards.

**Location**: `/Users/kmk/rabbithole/frontend/src/components/PromotionEligibilityBadge.tsx`

**Props**:
```typescript
interface PromotionEligibilityBadgeProps {
  graphId: string;
  eligibilityData: PromotionEligibilityBadgeData;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}
```

**Features**:
- Color-coded badge (red/yellow/green)
- Shows overall score percentage
- "Ready" indicator when eligible
- Hover tooltip with breakdown:
  - Criteria met count
  - Next action suggestion
- Compact version for tight spaces

**Usage**:
```tsx
import { PromotionEligibilityBadge } from './PromotionEligibilityBadge';

<PromotionEligibilityBadge
  graphId="graph-123"
  eligibilityData={badgeData}
  size="md"
  showTooltip={true}
/>
```

## GraphQL Integration

### Queries

**GET_PROMOTION_ELIGIBILITY**: Complete eligibility data
```graphql
query GetPromotionEligibility($graphId: ID!) {
  promotionEligibility(graphId: $graphId) {
    overallScore
    isEligible
    methodologyCompletion { ... }
    consensus { ... }
    evidenceQuality { ... }
    challengeResolution { ... }
  }
}
```

**GET_METHODOLOGY_PROGRESS**: Methodology steps only
```graphql
query GetMethodologyProgress($graphId: ID!) {
  methodologyProgress(graphId: $graphId) {
    steps { ... }
    completionPercentage
  }
}
```

**GET_CONSENSUS_VOTING**: Voting data with user's vote
```graphql
query GetConsensusVoting($graphId: ID!) {
  consensusVoting(graphId: $graphId) {
    votes { ... }
    userVote { ... }
    userReputation { ... }
  }
}
```

### Subscriptions

**PROMOTION_ELIGIBILITY_UPDATED**: Real-time eligibility updates
```graphql
subscription PromotionEligibilityUpdated($graphId: ID!) {
  promotionEligibilityUpdated(graphId: $graphId) {
    overallScore
    isEligible
  }
}
```

**CONSENSUS_VOTE_UPDATED**: Real-time vote updates
```graphql
subscription ConsensusVoteUpdated($graphId: ID!) {
  consensusVoteUpdated(graphId: $graphId) {
    overallScore
    voteCount
  }
}
```

### Mutations

**SUBMIT_CONSENSUS_VOTE**: Submit or update vote
```graphql
mutation SubmitConsensusVote($input: VoteSubmissionInput!) {
  submitConsensusVote(input: $input) {
    success
    updatedConsensusScore
  }
}
```

**UPDATE_METHODOLOGY_STEP**: Mark step complete
```graphql
mutation UpdateMethodologyStep($graphId: ID!, $stepId: ID!, $isCompleted: Boolean!) {
  updateMethodologyStep(graphId: $graphId, stepId: $stepId, isCompleted: $isCompleted) {
    success
    overallCompletionPercentage
  }
}
```

## Color Scheme

### Eligibility Colors
- **Green** (≥80%): `#10b981` - Eligible for promotion
- **Yellow** (50-79%): `#eab308` - In progress
- **Red** (<50%): `#ef4444` - Early stage

### Confidence Colors
- **High** (≥70%): `#10b981` - Strong confidence
- **Medium** (40-69%): `#eab308` - Moderate confidence
- **Low** (<40%): `#f97316` - Low confidence

## Example Integration

See `/Users/kmk/rabbithole/frontend/src/components/examples/PromotionValidationExample.tsx` for complete integration example.

### Graph Detail Page Integration

```tsx
import { useQuery, useSubscription } from '@apollo/client';
import { GET_PROMOTION_ELIGIBILITY, PROMOTION_ELIGIBILITY_UPDATED } from '../graphql/queries/promotion';
import { PromotionEligibilityDashboard } from '../components/PromotionEligibilityDashboard';
import { MethodologyProgressPanel } from '../components/MethodologyProgressPanel';
import { ConsensusVotingWidget } from '../components/ConsensusVotingWidget';

function GraphDetailPage({ graphId }: { graphId: string }) {
  // Query initial data
  const { data, loading } = useQuery(GET_PROMOTION_ELIGIBILITY, {
    variables: { graphId },
  });

  // Subscribe to real-time updates
  useSubscription(PROMOTION_ELIGIBILITY_UPDATED, {
    variables: { graphId },
    onData: ({ data: subData }) => {
      // Update UI with new eligibility data
    },
  });

  return (
    <div>
      {/* Main Dashboard */}
      <PromotionEligibilityDashboard
        graphId={graphId}
        eligibility={data?.promotionEligibility}
        loading={loading}
      />

      {/* Sidebar: Methodology Progress */}
      <MethodologyProgressPanel
        graphId={graphId}
        methodologyName={data?.promotionEligibility.methodologyCompletion.name}
        steps={data?.promotionEligibility.methodologyCompletion.steps}
        completionPercentage={data?.promotionEligibility.methodologyCompletion.currentScore}
      />

      {/* Bottom Panel: Consensus Voting */}
      <ConsensusVotingWidget
        graphId={graphId}
        overallScore={data?.promotionEligibility.consensus.currentScore}
        voteCount={data?.promotionEligibility.consensus.details.voteCount}
        votes={data?.promotionEligibility.consensus.details.votes}
        targetConsensus={data?.promotionEligibility.consensus.targetScore}
        onSubmitVote={handleVoteSubmit}
      />
    </div>
  );
}
```

### Graph List Integration

```tsx
import { PromotionEligibilityBadge } from '../components/PromotionEligibilityBadge';

function GraphListItem({ graph }: { graph: Graph }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3>{graph.name}</h3>
        <p>{graph.description}</p>
      </div>
      <PromotionEligibilityBadge
        graphId={graph.id}
        eligibilityData={graph.eligibilityBadge}
        size="sm"
      />
    </div>
  );
}
```

## Mock Data

For development and testing, use mock data from:
`/Users/kmk/rabbithole/frontend/src/mocks/promotionEligibility.ts`

Available mock datasets:
- `mockEligibilityFullyEligible` - 86% score, eligible
- `mockEligibilityInProgress` - 68% score, in progress
- `mockEligibilityEarlyStage` - 32% score, early stage
- `mockMethodologySteps` - Sample methodology steps
- `mockConsensusVotes` - Sample community votes
- `mockChallenges` - Sample challenges

## Storybook Stories

All components have comprehensive Storybook stories:
- `MethodologyProgressPanel.stories.tsx`
- `ConsensusVotingWidget.stories.tsx`
- `PromotionEligibilityDashboard.stories.tsx`
- `PromotionEligibilityBadge.stories.tsx`

Run Storybook: `npm run storybook`

## Design Decisions

### Why 4 Criteria?

1. **Methodology Completion** - Ensures structured workflow
2. **Community Consensus** - Democratic validation
3. **Evidence Quality** - Maintains high standards
4. **Challenge Resolution** - Handles disputes transparently

### Why Visible Vote Weights?

Transparency builds trust. Users can see:
- How reputation affects voting power
- Why some votes count more (evidence quality)
- That weights are algorithmic, not arbitrary

### Why AI Suggestions?

Guides users without being prescriptive. Suggestions are:
- Based on current state analysis
- Actionable and specific
- Optional - users can choose their path

### Why Real-Time Updates?

- Encourages collaboration
- Shows community activity
- Reduces wait time for feedback
- Makes system feel alive

## Accessibility

All components follow WCAG 2.1 AA standards:
- Proper ARIA labels and roles
- Keyboard navigation support
- Color contrast ratios ≥4.5:1
- Screen reader friendly
- Focus indicators

## Testing

Unit tests cover:
- Component rendering
- User interactions (voting, form submission)
- Data transformations
- Color calculations
- Edge cases (no data, loading states)

Integration tests cover:
- GraphQL query/mutation integration
- Subscription handling
- Real-time updates
- Error states

## Future Enhancements

Potential improvements:
- Historical eligibility tracking
- Comparison with similar graphs
- Predictive eligibility timeline
- Automated notifications for threshold events
- Batch voting on multiple graphs
- Export eligibility reports

## Support

For questions or issues:
1. Check Storybook for component examples
2. Review integration example
3. Consult GraphQL schema documentation
4. Review type definitions in `/types/promotion.ts`
