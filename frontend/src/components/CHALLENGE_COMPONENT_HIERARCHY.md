# Challenge System Component Hierarchy

## Visual Component Structure

```
ChallengePanel (Main Container)
├── Header
│   ├── Title + Challenge Count
│   └── "New Challenge" Button → Opens ChallengeForm
│
├── Filter Tabs
│   ├── All
│   ├── Open
│   ├── Under Review
│   ├── Resolved
│   └── Dismissed
│
├── Challenge List
│   └── ChallengeCard (one per challenge)
│       ├── Type Icon + Badge
│       ├── Status Badge
│       ├── Creator + ReputationBadge
│       ├── Timestamp
│       ├── Evidence Preview
│       ├── Vote Distribution Bar
│       ├── Expand/Collapse Button
│       └── [Expanded State]
│           ├── Full Evidence
│           ├── Full Reasoning
│           ├── Claim Reference (optional)
│           ├── Vote Buttons (if votable)
│           │   ├── Uphold Challenge Button
│           │   └── Dismiss Challenge Button
│           └── Resolution Details (if resolved)
│               ├── Outcome
│               ├── Reasoning
│               └── Veracity Impact
│
└── ChallengeForm (Modal)
    ├── Header with Close Button
    ├── Challenge Type Selector (10 types)
    ├── Claim Reference Input (optional)
    ├── Evidence Text Area (required)
    ├── Reasoning Text Area (required)
    ├── Info Banner
    └── Action Buttons
        ├── Cancel
        └── Submit Challenge
```

## Standalone Components

### ChallengeVotingWidget
```
ChallengeVotingWidget (Voting Interface)
├── Header + User ReputationBadge
├── Vote Weight Info Box
├── Vote Buttons
│   ├── Uphold Challenge (Orange)
│   └── Dismiss Challenge (Green)
├── Vote Distribution Bar
│   ├── Current Percentages
│   └── Weight Totals
├── Reasoning Input (conditional)
│   └── Text Area
├── Submit Vote Button (conditional)
└── Already Voted Message (conditional)
```

### ChallengeHistory
```
ChallengeHistory (Timeline)
├── Title
├── Timeline Items
│   └── TimelineItem (one per event)
│       ├── Icon (colored by type)
│       ├── Event Description
│       ├── Username + Timestamp
│       └── Metadata (optional)
└── Resolution Impact (if resolved)
    ├── Outcome Badge
    ├── Reasoning
    └── Veracity Impact
```

### ReputationBadge
```
ReputationBadge
├── Score Display (colored)
├── Label "REP" (optional)
└── Tooltip (on hover)
    ├── Breakdown Title
    ├── Progress Bars
    │   ├── Evidence Quality
    │   ├── Vote Accuracy
    │   ├── Participation
    │   └── Community Trust
    └── Footer
        ├── Level (Expert/Trusted/etc)
        └── Rank (optional)
```

## Data Flow

### Challenge Creation Flow
```
User Clicks "New Challenge"
    ↓
ChallengeForm Opens (Modal)
    ↓
User Selects Type
    ↓
User Enters Evidence + Reasoning
    ↓
Form Validation
    ↓
onSubmit(CreateChallengeInput)
    ↓
GraphQL Mutation: CREATE_CHALLENGE
    ↓
Backend Creates Challenge
    ↓
Refetch Challenges
    ↓
ChallengePanel Updates
    ↓
New ChallengeCard Appears
    ↓
Node Badge Updates (+1)
```

### Voting Flow
```
User Opens ChallengeCard
    ↓
Card Expands
    ↓
Vote Buttons Shown
    ↓
User Clicks "Uphold" or "Dismiss"
    ↓
onVote(challengeId, voteType)
    ↓
GraphQL Mutation: VOTE_ON_CHALLENGE
    ↓
Backend Records Vote (weighted by reputation)
    ↓
Subscription Notifies Clients
    ↓
Vote Distribution Bar Updates
    ↓
User's Vote Locked (buttons disabled)
```

### Challenge Resolution Flow
```
Community Votes Reach Threshold
    ↓
Status Changes to "Under Review"
    ↓
Moderator/Algorithm Evaluates
    ↓
GraphQL Mutation: RESOLVE_CHALLENGE
    ↓
Backend Sets Resolution
    ↓
If Upheld:
    - Veracity Score Adjusted
    - Node Updated
If Dismissed:
    - Challenge Closed
    - No Score Change
    ↓
Status Changes to "Resolved/Dismissed"
    ↓
Resolution Shows in ChallengeCard
    ↓
ChallengeHistory Updated
```

## State Management

### ChallengePanel State
```typescript
{
  showCreateForm: boolean,
  filter: FilterOption,
  expandedChallenge: string | null,
  challenges: Challenge[],
  loading: boolean
}
```

### ChallengeCard State
```typescript
{
  isExpanded: boolean,
  challenge: Challenge,
  currentUserVote: ChallengeVoteType | null
}
```

### ChallengeVotingWidget State
```typescript
{
  reasoning: string,
  selectedVote: ChallengeVoteType | null,
  showReasoningInput: boolean
}
```

### ChallengeForm State
```typescript
{
  selectedType: ChallengeType | null,
  evidence: string,
  reasoning: string,
  claimReference: string,
  errors: Record<string, string>
}
```

## Props Interfaces

### ChallengePanel Props
```typescript
interface ChallengePanelProps {
  nodeId?: string;                    // Target node
  edgeId?: string;                    // Target edge
  challenges: Challenge[];            // All challenges
  onCreateChallenge?: (input: CreateChallengeInput) => void;
  onVote?: (challengeId: string, voteType: ChallengeVoteType) => void;
  currentUserId?: string;             // For vote tracking
  loading?: boolean;                  // Loading state
}
```

### ChallengeCard Props
```typescript
interface ChallengeCardProps {
  challenge: Challenge;               // Full challenge data
  onVote?: (challengeId: string, voteType: ChallengeVoteType) => void;
  onExpand?: (challengeId: string) => void;
  currentUserId?: string;             // For vote display
  currentUserVote?: ChallengeVoteType | null;
  expanded?: boolean;                 // Initial state
}
```

### ChallengeVotingWidget Props
```typescript
interface ChallengeVotingWidgetProps {
  challengeId: string;
  challenge?: Challenge;              // Full data (optional)
  currentVotes?: VoteDistribution;    // Manual counts (optional)
  onVote: (challengeId: string, voteType: ChallengeVoteType, reasoning?: string) => void;
  userReputation?: UserReputation;    // For weight display
  currentUserVote?: ChallengeVoteType | null;
  disabled?: boolean;                 // Disable voting
}
```

## Event Handlers

### Required Handlers
```typescript
// Challenge creation
onCreateChallenge: (input: CreateChallengeInput) => void

// Vote casting
onVote: (challengeId: string, voteType: ChallengeVoteType, reasoning?: string) => void
```

### Optional Handlers
```typescript
// Card expansion
onExpand: (challengeId: string) => void

// Cancel actions
onCancel: () => void
```

## Component Communication

### Parent → Child (Props)
- ChallengePanel → ChallengeCard: `challenge`, `currentUserId`, `onVote`
- ChallengePanel → ChallengeForm: `nodeId`, `edgeId`, `onSubmit`, `onCancel`
- ChallengeCard → ReputationBadge: `userId`, `reputation`

### Child → Parent (Callbacks)
- ChallengeForm → ChallengePanel: `onSubmit(input)`
- ChallengeCard → ChallengePanel: `onVote(id, type)`
- ChallengeVotingWidget → Parent: `onVote(id, type, reasoning)`

### Sibling Communication (via Parent State)
- ChallengeCard updates → ChallengePanel refetches → All cards update
- Vote submission → Vote distribution updates in all affected cards

## Integration Points

### GraphNode Integration
```
GraphNode
├── Challenge Indicator Badge (if challengeCount > 0)
│   ├── Orange background
│   ├── AlertCircle icon
│   ├── Challenge count
│   └── onClick → Opens ChallengePanel
└── Lock Icon (if needed, positioned below)
```

### Context Menu Integration
```
GraphCanvas Context Menu
├── [Existing Items]
├── ───────────────
└── Challenge Claim → Opens ChallengePanel
```

## Styling Layers

### Theme Colors
- Background: `theme.colors.bg.primary` (#27272a)
- Elevated: `theme.colors.bg.elevated` (#3f3f46)
- Text: `theme.colors.text.*` (zinc palette)
- Borders: `theme.colors.border.primary` (#3f3f46)

### Challenge Colors
- Open: Orange (#f97316)
- Under Review: Blue (#3b82f6)
- Resolved: Green (#10b981)
- Dismissed: Zinc (#71717a)

### Challenge Type Colors
- High Severity: Red (#ef4444)
- Medium Severity: Orange/Yellow
- Low Severity: Yellow (#eab308)

### Reputation Colors
- Expert (90+): Green (#10b981)
- Trusted (75-89): Lime (#84cc16)
- Established (50-74): Yellow (#eab308)
- Developing (25-49): Yellow
- New (0-24): Red (#ef4444)

## Responsive Behavior

### Desktop (> 768px)
- Full panel width (500px)
- Side-by-side vote buttons
- Full reputation tooltips

### Tablet (768px - 1024px)
- Adaptive panel width
- Stacked vote buttons
- Condensed tooltips

### Mobile (< 768px)
- Full-width panel
- Stacked layouts
- Touch-optimized buttons
- Collapsed by default

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter to expand/collapse cards
- Space to toggle votes
- Escape to close modals

### Screen Reader Support
- ARIA labels on all buttons
- ARIA roles on status badges
- Live regions for vote updates
- Descriptive link text

### Visual Accessibility
- 4.5:1+ color contrast
- Focus indicators
- Icon + text labels
- Status icons with colors

## Performance Optimizations

### Memoization
- ChallengeCard memoized on challenge.id
- Vote distribution calculated once
- Reputation badges cached

### Lazy Loading
- ChallengePanel can be code-split
- Challenge history loaded on-demand
- Reputation details fetched on hover

### Virtualization (Future)
- Long challenge lists can be virtualized
- Infinite scroll for history
- Paginated votes

## Error States

### No Challenges
- Empty state with illustration
- "Create First Challenge" CTA
- Helpful description text

### Loading
- Skeleton screens
- Progress indicators
- Optimistic updates

### Error
- Error boundaries
- Retry buttons
- Clear error messages

## Success States

### Challenge Created
- Toast notification
- Smooth panel update
- Badge count increments

### Vote Submitted
- Instant visual feedback
- Progress bar updates
- Confirmation message

### Challenge Resolved
- Resolution badge appears
- Timeline updates
- Veracity score changes

This hierarchy provides a complete map of the challenge system architecture and data flow!
