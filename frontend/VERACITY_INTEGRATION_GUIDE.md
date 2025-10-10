# Veracity Score System Integration Guide

This guide provides step-by-step instructions for integrating the Veracity Score Visual System into your Rabbithole application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component Integration](#component-integration)
3. [GraphQL Setup](#graphql-setup)
4. [Advanced Usage](#advanced-usage)
5. [Customization](#customization)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

All components are already included in the codebase. No additional dependencies needed.

### Basic Usage

```tsx
import { VeracityBadge } from '@/components/veracity';

function MyComponent() {
  return <VeracityBadge score={0.85} isLevel0={false} size="md" />;
}
```

## Component Integration

### 1. Graph Nodes

The `GraphNode` component has been updated to include a `VeracityIndicator` in the top-left corner.

**File:** `/Users/kmk/rabbithole/frontend/src/components/GraphNode.tsx`

**Changes made:**
- Added `VeracityIndicator` import
- Positioned indicator in top-left corner (6px from top and left)
- Indicator shows on hover with percentage tooltip

**No additional changes needed** - nodes automatically show veracity indicators.

### 2. Graph Edges

The `GraphEdge` component has been updated to include a `VeracityIndicator` in the edge label.

**File:** `/Users/kmk/rabbithole/frontend/src/components/GraphEdge.tsx`

**Changes made:**
- Added `VeracityIndicator` import
- Included indicator dot in edge label
- Works alongside existing lock icons and labels

**No additional changes needed** - edges automatically show veracity indicators.

### 3. Adding the Veracity Panel

To add the full veracity analysis panel to your graph view:

```tsx
import { useState, useCallback } from 'react';
import { VeracityPanel } from '@/components/veracity';

function GraphView() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsPanelOpen(true);
  }, []);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        // ... other props
      />

      {selectedNode && (
        <VeracityPanel
          nodeId={selectedNode.id}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          score={selectedNode.data.weight}
          isLevel0={selectedNode.data.level === 0}
          // Add these once GraphQL is set up:
          // breakdownData={veracityData?.breakdown}
          // historyData={veracityData?.history}
        />
      )}
    </>
  );
}
```

**See full example:** `/Users/kmk/rabbithole/frontend/src/components/examples/GraphWithVeracityPanel.tsx`

## GraphQL Setup

### 1. Define the Schema

Add these types to your GraphQL schema:

```graphql
type VeracityBreakdown {
  evidenceScore: Float!
  consensusScore: Float!
  challengePenalty: Float!
  totalScore: Float!
  evidence: [Evidence!]!
}

type Evidence {
  id: ID!
  type: String!
  description: String!
  weight: Float!
  addedAt: DateTime!
  addedBy: String
}

type VeracityHistory {
  score: Float!
  timestamp: DateTime!
  reason: String!
  eventType: String
}

type Node {
  id: ID!
  # ... existing fields
  veracityScore: Float!
  level: Int!
  veracityBreakdown: VeracityBreakdown
  veracityHistory: [VeracityHistory!]
}

type Edge {
  id: ID!
  # ... existing fields
  veracityScore: Float!
  level: Int!
  veracityBreakdown: VeracityBreakdown
  veracityHistory: [VeracityHistory!]
}
```

### 2. Create Query

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

### 3. Use with Apollo Client

```tsx
import { useQuery } from '@apollo/client';
import { GET_NODE_VERACITY } from '@/graphql/queries';

function NodeDetailsPanel({ nodeId }) {
  const { data, loading, error } = useQuery(GET_NODE_VERACITY, {
    variables: { nodeId },
  });

  if (loading) return <VeracityPanel isLoading={true} />;
  if (error) return <div>Error loading veracity data</div>;

  return (
    <VeracityPanel
      nodeId={nodeId}
      isOpen={true}
      onClose={onClose}
      score={data.node.veracityScore}
      isLevel0={data.node.level === 0}
      breakdownData={data.node.veracityBreakdown}
      historyData={data.node.veracityHistory.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }))}
    />
  );
}
```

## Advanced Usage

### Custom Veracity Display

Create custom displays using the core components:

```tsx
import {
  VeracityBadge,
  VeracityIndicator,
  getVeracityLevel,
  getVeracityLabel,
} from '@/components/veracity';

function CustomNodeCard({ node }) {
  const level = getVeracityLevel(node.score, node.isLevel0);
  const label = getVeracityLabel(level);

  return (
    <div className="card">
      <div className="header">
        <h3>{node.title}</h3>
        <VeracityIndicator score={node.score} size="sm" />
      </div>

      <div className="body">
        <p>{node.description}</p>
      </div>

      <div className="footer">
        <VeracityBadge score={node.score} isLevel0={node.isLevel0} />
        <span>{label}</span>
      </div>
    </div>
  );
}
```

### Standalone Timeline

Display veracity history outside the panel:

```tsx
import { VeracityTimeline } from '@/components/veracity';

function HistoryView({ history }) {
  return (
    <div className="history-container">
      <h2>Veracity Score History</h2>
      <VeracityTimeline history={history} height={400} />
    </div>
  );
}
```

### Comparison View

Compare veracity scores across multiple nodes:

```tsx
import { VeracityBadge, VeracityBreakdown } from '@/components/veracity';

function ComparisonView({ nodes }) {
  return (
    <div className="comparison-grid">
      {nodes.map(node => (
        <div key={node.id} className="comparison-item">
          <h3>{node.title}</h3>
          <VeracityBadge score={node.score} size="lg" />
          <VeracityBreakdown data={node.breakdown} />
        </div>
      ))}
    </div>
  );
}
```

## Customization

### Custom Colors

Override default colors by modifying the color functions:

```tsx
// Create a custom version
const getCustomVeracityColor = (score: number, isLevel0: boolean) => {
  if (isLevel0) return '#yourColor';
  // ... custom logic
};
```

### Custom Size Presets

Extend size configurations:

```tsx
const customSizes = {
  ...sizeConfig,
  xl: {
    container: 'h-10 px-4',
    text: 'text-lg',
    icon: 16,
    gap: 'gap-2',
  },
};
```

### Theme Integration

All components use the zinc theme from `/Users/kmk/rabbithole/frontend/src/styles/theme.ts`.

To modify:
1. Update `theme.ts` with new color values
2. Components will automatically use new theme colors
3. Veracity color coding remains unchanged for consistency

## Best Practices

### 1. Loading States

Always handle loading states when fetching veracity data:

```tsx
<VeracityPanel
  isLoading={loading}
  // ... other props
/>
```

### 2. Error Handling

Gracefully handle missing veracity data:

```tsx
const breakdownData = data?.node?.veracityBreakdown || {
  evidenceScore: 0,
  consensusScore: 0,
  challengePenalty: 0,
  totalScore: score,
  evidence: [],
};
```

### 3. Performance

- Use memoization for expensive calculations
- Lazy load the VeracityPanel (only render when needed)
- Batch GraphQL queries when possible

```tsx
import { useMemo } from 'react';

const processedHistory = useMemo(
  () => history.map(entry => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  })),
  [history]
);
```

### 4. Accessibility

Components are accessible by default, but ensure:
- Panel can be closed with Escape key
- Focus management when panel opens/closes
- ARIA labels are present

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isPanelOpen) {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isPanelOpen, onClose]);
```

### 5. Mobile Responsiveness

VeracityPanel is responsive:
- Full-width on mobile (< 768px)
- 384px width on desktop
- Touch-friendly interactions

Test on mobile devices and ensure:
- Badges are large enough (use 'md' or 'lg')
- Timeline is scrollable
- Panel is dismissible

## Troubleshooting

### Issue: Components not displaying

**Solution:**
1. Check imports are correct
2. Verify theme.ts is accessible
3. Ensure Tailwind is configured properly

```tsx
// Correct import
import { VeracityBadge } from '@/components/veracity';

// Or direct import
import VeracityBadge from '@/components/VeracityBadge';
```

### Issue: Colors not showing correctly

**Solution:**
1. Verify score is between 0.0 and 1.0
2. Check theme colors are defined
3. Inspect element to see applied styles

```tsx
// Ensure score is normalized
const normalizedScore = Math.max(0, Math.min(1, score));
```

### Issue: Timeline not rendering

**Solution:**
1. Verify history data has valid timestamps
2. Check history array is not empty
3. Ensure timestamps are Date objects

```tsx
const validHistory = history.map(entry => ({
  ...entry,
  timestamp: new Date(entry.timestamp), // Convert to Date
}));
```

### Issue: Panel not opening

**Solution:**
1. Check `isOpen` state is managed correctly
2. Verify z-index is high enough
3. Ensure no conflicting CSS

```tsx
// Debug state
console.log('Panel open:', isPanelOpen);
console.log('Selected node:', selectedNodeId);
```

### Issue: GraphQL errors

**Solution:**
1. Verify schema matches component expectations
2. Check query returns all required fields
3. Handle null/undefined values

```tsx
// Defensive data access
const breakdown = data?.node?.veracityBreakdown;
const history = data?.node?.veracityHistory || [];
```

## Testing

### Unit Tests

Example using React Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { VeracityBadge } from '@/components/veracity';

describe('VeracityBadge', () => {
  it('displays high confidence score', () => {
    render(<VeracityBadge score={0.85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows lock icon for Level 0', () => {
    render(<VeracityBadge score={1.0} isLevel0={true} />);
    expect(screen.getByLabelText(/verified/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

Test with React Flow:

```tsx
import { render, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import GraphWithVeracityPanel from './GraphWithVeracityPanel';

describe('GraphWithVeracityPanel', () => {
  it('opens panel when node is clicked', async () => {
    const { getByText, findByRole } = render(
      <ReactFlowProvider>
        <GraphWithVeracityPanel nodes={mockNodes} edges={mockEdges} />
      </ReactFlowProvider>
    );

    fireEvent.click(getByText('Test Node'));
    const panel = await findByRole('dialog');
    expect(panel).toBeInTheDocument();
  });
});
```

## Support

For issues or questions:
1. Check Storybook examples
2. Review component README: `/Users/kmk/rabbithole/frontend/src/components/veracity/README.md`
3. Inspect example implementation: `/Users/kmk/rabbithole/frontend/src/components/examples/GraphWithVeracityPanel.tsx`

## Next Steps

1. **Set up GraphQL queries** for veracity data
2. **Integrate VeracityPanel** into your main graph view
3. **Test on real data** from your backend
4. **Customize as needed** for your specific use cases
5. **Add analytics** to track veracity score trends
