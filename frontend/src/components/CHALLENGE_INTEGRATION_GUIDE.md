# Challenge System Integration Guide

## Quick Start

### 1. Import Components

```typescript
import {
  ChallengePanel,
  ChallengeCard,
  ChallengeForm,
  ChallengeVotingWidget,
  ChallengeHistory,
  ReputationBadge,
} from '@/components/challenges';
```

### 2. Add to GraphCanvas Context Menu

**File:** `/Users/kmk/rabbithole/frontend/src/components/GraphCanvas.tsx`

```typescript
// Add state for challenge panel
const [showChallengePanel, setShowChallengePanel] = useState(false);
const [selectedTargetForChallenge, setSelectedTargetForChallenge] = useState<{
  id: string;
  type: 'node' | 'edge';
} | null>(null);

// Add to node context menu handler
const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
  event.preventDefault();

  const menuItems = [
    // ...existing items
    {
      label: 'Challenge Claim',
      icon: AlertCircle,
      onClick: () => {
        setSelectedTargetForChallenge({ id: node.id, type: 'node' });
        setShowChallengePanel(true);
      },
    },
  ];

  // Show context menu
};

// Add challenge panel to render
return (
  <div>
    {/* Existing canvas */}
    <ReactFlow {...props} />

    {/* Challenge Panel Sidebar */}
    {showChallengePanel && selectedTargetForChallenge && (
      <div className="fixed right-0 top-0 bottom-0 w-[500px] shadow-xl z-50">
        <ChallengePanel
          nodeId={selectedTargetForChallenge.type === 'node' ? selectedTargetForChallenge.id : undefined}
          edgeId={selectedTargetForChallenge.type === 'edge' ? selectedTargetForChallenge.id : undefined}
          challenges={challenges}
          onCreateChallenge={handleCreateChallenge}
          onVote={handleVote}
          currentUserId={currentUser?.id}
        />
      </div>
    )}
  </div>
);
```

### 3. Add GraphQL Hooks

```typescript
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_CHALLENGES_FOR_NODE,
  CREATE_CHALLENGE,
  VOTE_ON_CHALLENGE,
} from '@/graphql/queries/challenges';

// In your component
const { data: challengeData, loading } = useQuery(GET_CHALLENGES_FOR_NODE, {
  variables: { nodeId: selectedTargetForChallenge?.id },
  skip: !selectedTargetForChallenge || selectedTargetForChallenge.type !== 'node',
});

const [createChallenge] = useMutation(CREATE_CHALLENGE, {
  refetchQueries: [GET_CHALLENGES_FOR_NODE],
  onCompleted: () => {
    console.log('Challenge created successfully');
  },
});

const [voteOnChallenge] = useMutation(VOTE_ON_CHALLENGE, {
  refetchQueries: [GET_CHALLENGES_FOR_NODE],
  onCompleted: () => {
    console.log('Vote cast successfully');
  },
});

const handleCreateChallenge = (input: CreateChallengeInput) => {
  createChallenge({
    variables: { input },
  });
};

const handleVote = (challengeId: string, voteType: ChallengeVoteType) => {
  voteOnChallenge({
    variables: { challengeId, voteType },
  });
};
```

### 4. Update NodeData Type

**File:** `/Users/kmk/rabbithole/frontend/src/types/graph.ts`

```typescript
export interface NodeData {
  label: string;
  weight: number;
  level: GraphLevel;
  methodology?: string;
  isLocked: boolean;
  metadata?: Record<string, unknown>;
  challengeCount?: number; // ADD THIS LINE
  [key: string]: unknown;
}
```

### 5. Add Challenge Count to Graph Data Transform

When loading graph data, include challenge counts:

```typescript
const transformGraphData = (graphData: Graph): { nodes: GraphCanvasNode[], edges: GraphCanvasEdge[] } => {
  const nodes = graphData.nodes.map((node) => {
    const props = JSON.parse(node.props);

    // Fetch challenge count for this node
    const challengeCount = challenges.filter(
      c => c.targetNodeId === node.id &&
           (c.status === 'open' || c.status === 'under_review')
    ).length;

    return {
      id: node.id,
      type: 'custom',
      position: props.position || { x: 0, y: 0 },
      data: {
        label: props.label || 'Untitled',
        weight: node.weight,
        level: node.level || GraphLevel.LEVEL_1,
        isLocked: node.level === GraphLevel.LEVEL_0,
        methodology: props.methodology,
        challengeCount, // ADD THIS
        ...props,
      },
    };
  });

  // ...transform edges similarly

  return { nodes, edges };
};
```

### 6. Add Click Handler for Challenge Indicator

Update GraphNode to handle clicks on challenge indicator:

```typescript
// In GraphNode.tsx
{hasChallenges && (
  <div
    style={{
      position: 'absolute',
      top: '4px',
      right: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      backgroundColor: 'rgba(249, 115, 22, 0.9)',
      borderRadius: theme.radius.full,
      padding: '2px 6px',
      cursor: 'pointer', // ADD THIS
    }}
    title={`${challengeCount} active challenge${challengeCount !== 1 ? 's' : ''}`}
    onClick={(e) => {
      e.stopPropagation(); // ADD THIS
      data.onChallengeClick?.(data.id); // ADD THIS
    }}
  >
    <AlertCircle size={10} style={{ color: '#ffffff' }} />
    <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 600 }}>
      {challengeCount}
    </span>
  </div>
)}
```

## Advanced Integration

### Real-time Updates with Subscriptions

```typescript
import { useSubscription } from '@apollo/client';
import { CHALLENGE_CREATED_SUBSCRIPTION } from '@/graphql/queries/challenges';

function ChallengeSystem({ graphId }) {
  // Subscribe to new challenges
  useSubscription(CHALLENGE_CREATED_SUBSCRIPTION, {
    variables: { graphId },
    onData: ({ data }) => {
      const newChallenge = data.data?.challengeCreated;
      if (newChallenge) {
        // Show notification
        showNotification(`New challenge created on ${newChallenge.targetNodeId}`);

        // Refetch challenges
        refetch();
      }
    },
  });

  return <ChallengePanel {...props} />;
}
```

### Custom Challenge Notification System

```typescript
import { useEffect } from 'react';

function useChallengeBadgeUpdates(nodeId: string) {
  const { data } = useQuery(GET_CHALLENGES_FOR_NODE, {
    variables: { nodeId },
    pollInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    const openChallenges = data?.challengesByNode?.filter(
      c => c.status === 'open' || c.status === 'under_review'
    );

    if (openChallenges?.length > 0) {
      // Update node badge
      updateNodeBadge(nodeId, openChallenges.length);
    }
  }, [data, nodeId]);
}
```

### Inline Challenge Card Display

For showing challenges in tooltips or popovers:

```typescript
function NodeTooltip({ node }) {
  const { data } = useQuery(GET_CHALLENGES_FOR_NODE, {
    variables: { nodeId: node.id },
  });

  const openChallenges = data?.challengesByNode?.filter(
    c => c.status === 'open'
  ) || [];

  return (
    <div>
      <h3>{node.label}</h3>
      <p>Veracity: {node.weight * 100}%</p>

      {openChallenges.length > 0 && (
        <div className="mt-2">
          <h4 className="font-semibold text-orange-500">
            Active Challenges ({openChallenges.length})
          </h4>
          {openChallenges.slice(0, 2).map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              compact={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Styling Customization

All components use the zinc theme. To customize:

```typescript
// Create custom theme overrides
const challengeTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    challenge: {
      open: '#f97316',      // orange
      review: '#3b82f6',    // blue
      resolved: '#10b981',  // green
      dismissed: '#71717a', // zinc
    },
  },
};
```

## Testing Integration

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ChallengePanel } from '@/components/challenges';
import { mockChallenges } from '@/components/examples/mockChallengeData';

describe('ChallengePanel Integration', () => {
  it('renders challenges for a node', () => {
    render(
      <MockedProvider mocks={[]}>
        <ChallengePanel
          nodeId="node1"
          challenges={mockChallenges}
          currentUserId="user1"
        />
      </MockedProvider>
    );

    expect(screen.getByText(/Challenges/i)).toBeInTheDocument();
  });

  it('allows creating a new challenge', async () => {
    const handleCreate = jest.fn();

    render(
      <MockedProvider mocks={[]}>
        <ChallengePanel
          nodeId="node1"
          challenges={[]}
          onCreateChallenge={handleCreate}
          currentUserId="user1"
        />
      </MockedProvider>
    );

    fireEvent.click(screen.getByText(/New Challenge/i));
    // Fill form and submit
    // Assert handleCreate was called
  });
});
```

## Performance Optimization

### Lazy Load Challenges

```typescript
import { lazy, Suspense } from 'react';

const ChallengePanel = lazy(() => import('@/components/challenges').then(m => ({ default: m.ChallengePanel })));

function GraphWithChallenges() {
  return (
    <Suspense fallback={<div>Loading challenges...</div>}>
      <ChallengePanel {...props} />
    </Suspense>
  );
}
```

### Memoize Challenge Cards

```typescript
import { memo } from 'react';

const MemoizedChallengeCard = memo(ChallengeCard, (prev, next) => {
  return (
    prev.challenge.id === next.challenge.id &&
    prev.currentUserVote === next.currentUserVote &&
    prev.expanded === next.expanded
  );
});
```

## Troubleshooting

### Challenge count not updating

Ensure you're refetching after mutations:

```typescript
const [createChallenge] = useMutation(CREATE_CHALLENGE, {
  refetchQueries: [
    { query: GET_CHALLENGES_FOR_NODE, variables: { nodeId } },
    { query: GET_CHALLENGES_FOR_GRAPH, variables: { graphId } },
  ],
  awaitRefetchQueries: true,
});
```

### Challenge indicator not showing

1. Check `NodeData` includes `challengeCount`
2. Verify challenge count is > 0
3. Check GraphNode component received updated data

### Votes not reflecting immediately

Use optimistic updates:

```typescript
const [voteOnChallenge] = useMutation(VOTE_ON_CHALLENGE, {
  optimisticResponse: {
    voteOnChallenge: {
      id: 'temp-id',
      challengeId,
      voteType,
      userId: currentUser.id,
      weight: currentUser.reputation.score,
      createdAt: new Date().toISOString(),
      __typename: 'ChallengeVote',
    },
  },
  update: (cache, { data }) => {
    // Update cache manually
  },
});
```

## Complete Example

See `/Users/kmk/rabbithole/frontend/src/components/examples/ChallengeSystemExample.tsx` for a complete working example.

## Support

For questions or issues:
1. Check Storybook stories for component examples
2. Review mock data in `mockChallengeData.ts`
3. Check type definitions in `types/challenge.ts`
4. Review GraphQL schema documentation
