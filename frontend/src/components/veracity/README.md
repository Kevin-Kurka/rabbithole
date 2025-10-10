# Veracity Score Visual System

A comprehensive component library for displaying and interacting with veracity scores in the Rabbithole application.

## Overview

Veracity scores range from 0.0 (completely unreliable) to 1.0 (completely verified). Level 0 nodes always have a score of 1.0 and are considered verified sources.

## Components

### VeracityBadge

A colored badge displaying the veracity score as a percentage.

```tsx
import { VeracityBadge } from '@/components/veracity';

<VeracityBadge score={0.85} isLevel0={false} size="md" />
```

**Props:**
- `score` (number): Veracity score from 0.0 to 1.0
- `isLevel0` (boolean, optional): Whether this is a Level 0 verified node
- `size` ('sm' | 'md' | 'lg', optional): Badge size (default: 'md')

**Color Coding:**
- Level 0 (1.0): Green (#10b981) with lock icon
- 0.7-1.0: Lime (#84cc16) - High Confidence
- 0.4-0.7: Yellow (#eab308) - Medium Confidence
- 0.1-0.4: Orange (#f97316) - Low Confidence
- 0.0-0.1: Red (#ef4444) - Very Low Confidence

### VeracityIndicator

A minimal indicator for displaying veracity scores on canvas nodes.

```tsx
import { VeracityIndicator } from '@/components/veracity';

<VeracityIndicator score={0.75} size="sm" />
```

**Props:**
- `score` (number): Veracity score from 0.0 to 1.0
- `size` ('xs' | 'sm', optional): Indicator size (default: 'sm')
- `isLevel0` (boolean, optional): Whether this is a Level 0 verified node

**Features:**
- Colored dot with same color coding as badges
- Hover tooltip showing percentage
- Minimal footprint suitable for canvas nodes
- Smooth animations

### VeracityTimeline

A line chart showing veracity score changes over time.

```tsx
import { VeracityTimeline } from '@/components/veracity';

const history = [
  {
    score: 0.5,
    timestamp: new Date('2025-10-01'),
    reason: 'Initial claim submitted',
  },
  {
    score: 0.75,
    timestamp: new Date('2025-10-05'),
    reason: 'Evidence added',
    eventType: 'evidence_added',
  },
];

<VeracityTimeline history={history} height={300} />
```

**Props:**
- `history` (VeracityHistoryEntry[]): Array of historical score entries
- `height` (number, optional): Chart height in pixels (default: 200)

**VeracityHistoryEntry:**
- `score` (number): Score at this point in time
- `timestamp` (Date): When the change occurred
- `reason` (string): Description of why the score changed
- `eventType` (optional): Type of event ('evidence_added' | 'challenge_resolved' | 'consensus_changed' | 'manual_update')

**Features:**
- Interactive hover tooltips
- Highlighted markers for significant events
- Responsive SVG chart
- Y-axis labels for score reference

### VeracityBreakdown

Detailed breakdown of veracity score components with evidence list.

```tsx
import { VeracityBreakdown } from '@/components/veracity';

const data = {
  evidenceScore: 0.85,
  consensusScore: 0.9,
  challengePenalty: 0.05,
  totalScore: 0.9,
  evidence: [
    {
      id: '1',
      type: 'Academic Paper',
      description: 'Peer-reviewed study confirming claim',
      weight: 0.9,
      addedAt: new Date('2025-10-01'),
      addedBy: 'researcher_alice',
    },
  ],
};

<VeracityBreakdown data={data} isLoading={false} />
```

**Props:**
- `data` (VeracityBreakdownData): Breakdown data
- `isLoading` (boolean, optional): Show loading state

**VeracityBreakdownData:**
- `evidenceScore` (number): Quality and quantity of supporting evidence
- `consensusScore` (number): Agreement among contributors
- `challengePenalty` (number): Deductions from unresolved challenges
- `totalScore` (number): Overall veracity score
- `evidence` (Evidence[]): Array of evidence items

**Evidence:**
- `id` (string): Unique identifier
- `type` (string): Type of evidence
- `description` (string): Evidence description
- `weight` (number): Evidence weight (0.0 to 1.0)
- `addedAt` (Date): When evidence was added
- `addedBy` (string, optional): User who added the evidence

### VeracityPanel

A side panel showing complete veracity analysis with tabs.

```tsx
import { VeracityPanel } from '@/components/veracity';

<VeracityPanel
  nodeId="node123"
  isOpen={true}
  onClose={() => setIsOpen(false)}
  score={0.85}
  isLevel0={false}
  breakdownData={breakdownData}
  historyData={historyData}
/>
```

**Props:**
- `nodeId` (string, optional): Node ID being analyzed
- `edgeId` (string, optional): Edge ID being analyzed
- `isOpen` (boolean): Whether panel is visible
- `onClose` (() => void): Callback when panel is closed
- `score` (number): Current veracity score
- `isLevel0` (boolean, optional): Whether this is Level 0
- `breakdownData` (VeracityBreakdownData, optional): Breakdown data
- `historyData` (VeracityHistoryEntry[], optional): History data
- `isLoading` (boolean, optional): Loading state

**Features:**
- Three tabs: Breakdown, Timeline, Info
- Responsive design (full-width on mobile, 384px on desktop)
- Backdrop overlay
- Smooth slide-in animation
- Keyboard accessible

## Usage Examples

### Basic Badge Display

```tsx
import { VeracityBadge } from '@/components/veracity';

function NodeCard({ node }) {
  return (
    <div className="card">
      <h3>{node.title}</h3>
      <VeracityBadge score={node.veracityScore} isLevel0={node.level === 0} />
    </div>
  );
}
```

### Canvas Node Indicator

```tsx
import { VeracityIndicator } from '@/components/veracity';

function GraphNode({ data }) {
  return (
    <div className="node">
      <div className="node-content">{data.label}</div>
      <div className="node-indicator">
        <VeracityIndicator score={data.veracityScore} size="xs" />
      </div>
    </div>
  );
}
```

### Full Analysis Panel

```tsx
import { useState } from 'react';
import { VeracityPanel } from '@/components/veracity';

function NodeDetails({ node }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsPanelOpen(true)}>
        View Veracity Analysis
      </button>

      <VeracityPanel
        nodeId={node.id}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        score={node.veracityScore}
        isLevel0={node.level === 0}
        breakdownData={node.veracityBreakdown}
        historyData={node.veracityHistory}
      />
    </>
  );
}
```

## Design System Integration

All components use the zinc-based theme from `/src/styles/theme.ts`:

- Background colors: zinc-800, zinc-900, zinc-950
- Text colors: zinc-50, zinc-200, zinc-400
- Border colors: zinc-700, zinc-600, zinc-500
- Smooth transitions: 200ms duration
- Consistent spacing and border radius

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Sufficient color contrast
- Screen reader friendly
- Focus states for interactive elements

## Storybook

View all components in Storybook:

```bash
npm run storybook
```

Stories are available at:
- Components/Veracity/VeracityBadge
- Components/Veracity/VeracityTimeline
- Components/Veracity/VeracityBreakdown

## TypeScript Support

All components are fully typed with TypeScript. Import types:

```tsx
import type {
  VeracityScore,
  VeracityLevel,
  VeracityHistoryEntry,
  VeracityBreakdownData,
  Evidence,
} from '@/components/veracity';
```

Utility functions:

```tsx
import {
  getVeracityLevel,
  getVeracityLabel,
  getVeracityColorHex,
} from '@/components/veracity';

const level = getVeracityLevel(0.85, false); // 'high'
const label = getVeracityLabel(level); // 'High Confidence'
const color = getVeracityColorHex(0.85, false); // '#84cc16'
```

## GraphQL Integration

Components are designed to work with the veracity score system in the backend. Example query:

```graphql
query GetNodeVeracity($nodeId: ID!) {
  node(id: $nodeId) {
    id
    veracityScore
    level
    veracityBreakdown {
      evidenceScore
      consensusScore
      challengePenalty
      evidence {
        id
        type
        description
        weight
        addedAt
        addedBy
      }
    }
    veracityHistory {
      score
      timestamp
      reason
      eventType
    }
  }
}
```

## Performance Considerations

- Timeline chart uses SVG for efficient rendering
- Memoized calculations to prevent unnecessary re-renders
- Lazy loading of panel content
- Optimized hover states with CSS transitions
- Minimal re-renders with proper React keys

## Future Enhancements

Potential improvements for future releases:

- [ ] Export timeline chart as image
- [ ] Filter evidence by type
- [ ] Sort evidence by weight/date
- [ ] Compare veracity across multiple nodes
- [ ] Animated transitions between score changes
- [ ] Veracity trend predictions
- [ ] Bulk evidence upload
- [ ] Evidence quality scoring algorithm
