# Challenge System UI Implementation

## Overview

The Challenge System provides a community-driven mechanism for disputing and improving claims in the knowledge graph. Users can create challenges, vote on them with reputation-weighted votes, and see transparent resolution processes.

## Components

### 1. ChallengePanel

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ChallengePanel.tsx`

Main interface for viewing and managing challenges on a node or edge.

**Features:**
- Lists all challenges grouped by status (Open, Under Review, Resolved, Dismissed)
- Filter tabs for quick navigation
- Create new challenge button
- Expandable challenge cards
- Empty state with call-to-action

**Props:**
```typescript
{
  nodeId?: string;           // Target node ID
  edgeId?: string;           // Target edge ID
  challenges: Challenge[];   // List of challenges
  onCreateChallenge?: (input: CreateChallengeInput) => void;
  onVote?: (challengeId: string, voteType: ChallengeVoteType) => void;
  currentUserId?: string;
  loading?: boolean;
}
```

**Usage:**
```tsx
<ChallengePanel
  nodeId="node123"
  challenges={challenges}
  onCreateChallenge={handleCreate}
  onVote={handleVote}
  currentUserId={userId}
/>
```

### 2. ChallengeCard

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ChallengeCard.tsx`

Compact view of a single challenge with expandable details.

**Features:**
- Type and status badges with color coding
- Vote distribution bar chart
- Expandable full evidence and reasoning
- Vote buttons (Uphold/Dismiss)
- Resolution details if resolved
- Creator and timestamp information

**Props:**
```typescript
{
  challenge: Challenge;
  onVote?: (challengeId: string, voteType: ChallengeVoteType) => void;
  onExpand?: (challengeId: string) => void;
  currentUserId?: string;
  currentUserVote?: ChallengeVoteType | null;
  expanded?: boolean;
}
```

### 3. ChallengeForm

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ChallengeForm.tsx`

Modal form for creating new challenges.

**Features:**
- 10 challenge types with icons and descriptions
- Evidence input (minimum 20 characters)
- Reasoning input (minimum 20 characters)
- Optional specific claim reference
- Validation and error messages
- Community review process information

**Props:**
```typescript
{
  nodeId?: string;
  edgeId?: string;
  claimText?: string;
  onSubmit: (input: CreateChallengeInput) => void;
  onCancel: () => void;
}
```

### 4. ChallengeVotingWidget

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ChallengeVotingWidget.tsx`

Dedicated voting interface with reputation-weighted votes.

**Features:**
- Vote buttons (Uphold/Dismiss)
- Live vote distribution visualization
- User reputation display with weight
- Optional reasoning input
- Vote weight explanation
- Current vote status

**Props:**
```typescript
{
  challengeId: string;
  challenge?: Challenge;
  currentVotes?: { upholdWeight: number; dismissWeight: number; totalParticipants: number };
  onVote: (challengeId: string, voteType: ChallengeVoteType, reasoning?: string) => void;
  userReputation?: UserReputation;
  currentUserVote?: ChallengeVoteType | null;
  disabled?: boolean;
}
```

### 5. ChallengeHistory

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ChallengeHistory.tsx`

Timeline view of a challenge's lifecycle.

**Features:**
- Timeline of events (created, votes, status changes, resolved)
- Resolution impact on veracity score
- Event icons and color coding
- Formatted timestamps
- Metadata display

**Props:**
```typescript
{
  challengeId: string;
  challenge?: Challenge;
  events?: ChallengeTimelineEvent[];
}
```

### 6. ReputationBadge

**Location:** `/Users/kmk/rabbithole/frontend/src/components/ReputationBadge.tsx`

Displays user reputation score with detailed breakdown.

**Features:**
- Color-coded reputation (0-100)
- Hover tooltip with breakdown
- Reputation levels (Expert, Trusted, Established, Developing, New)
- Detailed metrics (Evidence Quality, Vote Accuracy, Participation, Community Trust)
- Multiple sizes (sm, md, lg)

**Props:**
```typescript
{
  userId: string;
  reputation?: UserReputation;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
}
```

## Challenge Types

| Type | Icon | Color | Severity | Description |
|------|------|-------|----------|-------------|
| Factual Error | AlertTriangle | Red | High | Incorrect or false information |
| Missing Context | Info | Yellow | Medium | Important context missing |
| Bias/Misleading | AlertOctagon | Orange | High | Biased or misleading presentation |
| Source Credibility | Link | Red | High | Questionable source |
| Logical Fallacy | GitBranch | Orange | Medium | Flawed reasoning |
| Outdated | Clock | Yellow | Medium | Information no longer current |
| Contradictory | Shuffle | Orange | High | Conflicts with facts |
| Scope | Target | Yellow | Low | Overgeneralization |
| Methodology | ClipboardCheck | Red | High | Flawed methodology |
| Unsupported | HelpCircle | Yellow | Medium | Lacks evidence |

## Integration with GraphCanvas

### GraphNode Updates

The `GraphNode` component has been updated to show challenge indicators:

**Location:** `/Users/kmk/rabbithole/frontend/src/components/GraphNode.tsx`

**Changes:**
- Added `challengeCount` to `NodeData` type
- Orange badge with count appears in top-right corner
- Badge shows alert icon and number of active challenges
- Click indicator to open ChallengePanel (requires context menu integration)

**Example:**
```tsx
// In graph data transformation
const nodeData: NodeData = {
  label: node.label,
  weight: node.weight,
  level: node.level,
  challengeCount: node.openChallenges, // NEW
  // ...other properties
};
```

### Context Menu Integration

Add "Challenge" option to node/edge context menu:

```typescript
// In GraphCanvas.tsx or ContextMenu.tsx
const contextMenuItems = [
  // ...existing items
  {
    id: 'challenge',
    label: 'Challenge Claim',
    icon: 'AlertCircle',
    action: (targetId, targetType) => {
      setSelectedTarget({ id: targetId, type: targetType });
      setShowChallengePanel(true);
    }
  }
];
```

## GraphQL Queries

**Location:** `/Users/kmk/rabbithole/frontend/src/graphql/queries/challenges.ts`

### Queries

- `GET_CHALLENGE_TYPES` - Get all available challenge types
- `GET_CHALLENGES_FOR_NODE` - Get challenges for a specific node
- `GET_CHALLENGES_FOR_EDGE` - Get challenges for a specific edge
- `GET_CHALLENGE_BY_ID` - Get single challenge with full details
- `GET_CHALLENGES_FOR_GRAPH` - Get all challenges in a graph
- `GET_USER_REPUTATION` - Get user reputation and breakdown
- `GET_CHALLENGE_STATS` - Get challenge statistics

### Mutations

- `CREATE_CHALLENGE` - Create a new challenge
- `VOTE_ON_CHALLENGE` - Cast a vote on a challenge
- `UPDATE_CHALLENGE_VOTE` - Update an existing vote
- `RESOLVE_CHALLENGE` - Resolve a challenge (admin/moderator)

### Subscriptions

- `CHALLENGE_CREATED_SUBSCRIPTION` - Real-time challenge creation
- `CHALLENGE_VOTE_SUBSCRIPTION` - Real-time vote updates
- `CHALLENGE_STATUS_SUBSCRIPTION` - Real-time status changes

## Mock Data

**Location:** `/Users/kmk/rabbithole/frontend/src/components/examples/mockChallengeData.ts`

Provides realistic test data including:
- 4 user reputations (Expert, Trusted, Established, Developing)
- 5 challenges with various statuses
- Multiple votes on challenges
- Resolved challenges with outcomes

## Storybook Stories

Four complete story files demonstrating all components:

1. **ChallengeCard.stories.tsx** - 8 stories covering all states
2. **ChallengePanel.stories.tsx** - 6 stories including empty/loading states
3. **ReputationBadge.stories.tsx** - 8 stories with size/reputation variations
4. **ChallengeVotingWidget.stories.tsx** - 9 stories covering voting scenarios

Run Storybook to view:
```bash
npm run storybook
```

## Theme Integration

All components use the existing zinc theme from `/Users/kmk/rabbithole/frontend/src/styles/theme.ts`:

- Background colors: `theme.colors.bg.primary`, `theme.colors.bg.elevated`
- Text colors: `theme.colors.text.primary`, `theme.colors.text.secondary`
- Borders: `theme.colors.border.primary`
- Spacing: `theme.spacing.*`
- Shadows: `theme.shadows.*`

## Type Definitions

**Location:** `/Users/kmk/rabbithole/frontend/src/types/challenge.ts`

Complete TypeScript definitions for:
- `Challenge` - Full challenge record
- `ChallengeVote` - Vote record
- `ChallengeType` - Enum of 10 types
- `ChallengeStatus` - Enum of statuses
- `ChallengeVoteType` - Uphold/Dismiss
- `UserReputation` - Reputation data
- `ChallengeTypeInfo` - Type metadata
- `CreateChallengeInput` - Creation input
- `SubmitVoteInput` - Vote input
- `ChallengeTimelineEvent` - History events

## Helper Functions

**Location:** `/Users/kmk/rabbithole/frontend/src/utils/challengeHelpers.ts`

Utility functions:
- `getChallengeTypeInfo()` - Get type metadata
- `getAllChallengeTypes()` - Get all types
- `getReputationColor()` - Color for reputation score
- `getReputationLabel()` - Label for reputation level
- `calculateVoteDistribution()` - Calculate vote stats
- `getVotePercentage()` - Get vote percentage
- `getStatusColor()` - Color for status
- `formatTimeAgo()` - Format timestamp
- `sortChallenges()` - Sort by priority
- `groupChallengesByStatus()` - Group challenges

## Usage Examples

### Basic Challenge Panel

```tsx
import { ChallengePanel } from '@/components/challenges';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CHALLENGES_FOR_NODE, CREATE_CHALLENGE, VOTE_ON_CHALLENGE } from '@/graphql/queries/challenges';

function NodeChallenges({ nodeId }) {
  const { data, loading } = useQuery(GET_CHALLENGES_FOR_NODE, {
    variables: { nodeId }
  });

  const [createChallenge] = useMutation(CREATE_CHALLENGE);
  const [voteOnChallenge] = useMutation(VOTE_ON_CHALLENGE);

  return (
    <ChallengePanel
      nodeId={nodeId}
      challenges={data?.challengesByNode || []}
      loading={loading}
      onCreateChallenge={(input) => createChallenge({ variables: { input } })}
      onVote={(challengeId, voteType) =>
        voteOnChallenge({ variables: { challengeId, voteType } })
      }
      currentUserId={currentUser.id}
    />
  );
}
```

### Inline Challenge Indicator

```tsx
import { ReputationBadge } from '@/components/challenges';

function UserProfile({ user, reputation }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <ReputationBadge
        userId={user.id}
        reputation={reputation}
        size="lg"
      />
    </div>
  );
}
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Color contrast ratios > 4.5:1
- Screen reader friendly

## Testing

Components are designed for testing:
- Pure functions for business logic
- Controlled components with clear props
- Mock data provided
- Storybook for visual testing
- TypeScript for type safety

## Next Steps

### Backend Integration

1. Implement GraphQL resolvers for challenge queries
2. Set up challenge voting algorithm with reputation weighting
3. Implement challenge resolution workflow
4. Add real-time subscriptions via WebSocket
5. Create reputation calculation system

### UI Enhancements

1. Add challenge filtering by type
2. Implement challenge search
3. Add vote reasoning display
4. Create admin moderation interface
5. Add challenge impact visualization

### Future Features

1. Challenge templates for common issues
2. Automated challenge detection
3. Challenge quality scoring
4. Community guidelines integration
5. Challenge analytics dashboard

## File Summary

### Created Files

1. `/Users/kmk/rabbithole/frontend/src/types/challenge.ts` - Type definitions
2. `/Users/kmk/rabbithole/frontend/src/utils/challengeHelpers.ts` - Helper functions
3. `/Users/kmk/rabbithole/frontend/src/components/ReputationBadge.tsx` - Reputation display
4. `/Users/kmk/rabbithole/frontend/src/components/ChallengeCard.tsx` - Challenge card
5. `/Users/kmk/rabbithole/frontend/src/components/ChallengeVotingWidget.tsx` - Voting interface
6. `/Users/kmk/rabbithole/frontend/src/components/ChallengeForm.tsx` - Challenge creation
7. `/Users/kmk/rabbithole/frontend/src/components/ChallengePanel.tsx` - Main panel
8. `/Users/kmk/rabbithole/frontend/src/components/ChallengeHistory.tsx` - Timeline view
9. `/Users/kmk/rabbithole/frontend/src/graphql/queries/challenges.ts` - GraphQL operations
10. `/Users/kmk/rabbithole/frontend/src/components/examples/mockChallengeData.ts` - Mock data
11. `/Users/kmk/rabbithole/frontend/src/components/ChallengeCard.stories.tsx` - Stories
12. `/Users/kmk/rabbithole/frontend/src/components/ChallengePanel.stories.tsx` - Stories
13. `/Users/kmk/rabbithole/frontend/src/components/ReputationBadge.stories.tsx` - Stories
14. `/Users/kmk/rabbithole/frontend/src/components/ChallengeVotingWidget.stories.tsx` - Stories
15. `/Users/kmk/rabbithole/frontend/src/components/challenges/index.ts` - Barrel export

### Modified Files

1. `/Users/kmk/rabbithole/frontend/src/components/GraphNode.tsx` - Added challenge indicator

## Design Philosophy

The challenge system emphasizes:

1. **Transparency** - All votes and reasoning are visible
2. **Community Moderation** - Reputation-weighted democratic process
3. **Quality Over Quantity** - Evidence and reasoning required
4. **Accountability** - All actions tracked and visible
5. **Accessibility** - Easy to understand and use
6. **Scalability** - Efficient even with many challenges
