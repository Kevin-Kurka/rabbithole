# Frontend Integration Guide - Graph Versioning & Forking

## Apollo Client Integration

### GraphQL Queries

```typescript
// frontend/src/graphql/queries/graphVersion.ts
import { gql } from '@apollo/client';

export const GET_GRAPH_VERSION_HISTORY = gql`
  query GetGraphVersionHistory($graphId: ID!) {
    graphVersionHistory(graphId: $graphId) {
      version_id
      version_number
      created_at
      created_by
      snapshot_metadata
    }
  }
`;

export const GET_GRAPH_FORKS = gql`
  query GetGraphForks($graphId: ID!) {
    graphForks(graphId: $graphId) {
      fork_id
      fork_name
      fork_description
      created_at
      created_by
      fork_metadata
    }
  }
`;

export const GET_GRAPH_ANCESTRY = gql`
  query GetGraphAncestry($graphId: ID!) {
    graphAncestry(graphId: $graphId) {
      ancestor_id
      ancestor_name
      ancestor_level
      depth
    }
  }
`;

export const GET_GRAPH_VERSION = gql`
  query GetGraphVersion($graphId: ID!, $versionNumber: Int!) {
    graphVersion(graphId: $graphId, versionNumber: $versionNumber) {
      id
      version_number
      snapshot_data
      snapshot_metadata
      created_at
      created_by {
        id
        username
      }
    }
  }
`;
```

### GraphQL Mutations

```typescript
// frontend/src/graphql/mutations/graphVersion.ts
import { gql } from '@apollo/client';

export const CREATE_GRAPH_SNAPSHOT = gql`
  mutation CreateGraphSnapshot($graphId: ID!, $userId: ID) {
    createGraphSnapshot(graphId: $graphId, userId: $userId) {
      id
      version_number
      created_at
      snapshot_metadata
    }
  }
`;

export const FORK_GRAPH = gql`
  mutation ForkGraph($graphId: ID!, $newName: String!, $userId: ID, $forkReason: String) {
    forkGraph(graphId: $graphId, newName: $newName, userId: $userId, forkReason: $forkReason) {
      id
      name
      description
      parent_graph_id
      fork_metadata
      nodes {
        id
        props
        weight
      }
      edges {
        id
        source_node_id
        target_node_id
        props
      }
    }
  }
`;

export const REVERT_GRAPH = gql`
  mutation RevertGraph($graphId: ID!, $versionNumber: Int!, $userId: ID) {
    revertGraph(graphId: $graphId, versionNumber: $versionNumber, userId: $userId)
  }
`;

export const DELETE_GRAPH_VERSION = gql`
  mutation DeleteGraphVersion($graphId: ID!, $versionNumber: Int!) {
    deleteGraphVersion(graphId: $graphId, versionNumber: $versionNumber)
  }
`;
```

## React Components

### Version History Dropdown

```typescript
// frontend/src/components/VersionHistory.tsx
import { useQuery, useMutation } from '@apollo/client';
import { GET_GRAPH_VERSION_HISTORY, REVERT_GRAPH } from '../graphql/queries/graphVersion';
import { useState } from 'react';

interface VersionHistoryProps {
  graphId: string;
  userId?: string;
}

export function VersionHistory({ graphId, userId }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_GRAPH_VERSION_HISTORY, {
    variables: { graphId },
  });

  const [revertGraph, { loading: reverting }] = useMutation(REVERT_GRAPH, {
    onCompleted: () => {
      alert('Graph reverted successfully!');
      refetch(); // Refresh version history
      window.location.reload(); // Reload graph data
    },
    onError: (err) => {
      alert(`Revert failed: ${err.message}`);
    },
  });

  const handleRevert = () => {
    if (!selectedVersion) return;

    if (confirm(`Are you sure you want to revert to version ${selectedVersion}? This will create a backup snapshot of the current state.`)) {
      revertGraph({
        variables: {
          graphId,
          versionNumber: selectedVersion,
          userId,
        },
      });
    }
  };

  if (loading) return <div>Loading version history...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="version-history">
      <h3>Version History</h3>
      <select
        value={selectedVersion || ''}
        onChange={(e) => setSelectedVersion(parseInt(e.target.value))}
        className="version-select"
      >
        <option value="">Select a version</option>
        {data?.graphVersionHistory.map((version: any) => (
          <option key={version.version_id} value={version.version_number}>
            Version {version.version_number} - {new Date(version.created_at).toLocaleString()}
          </option>
        ))}
      </select>

      <button
        onClick={handleRevert}
        disabled={!selectedVersion || reverting}
        className="btn-revert"
      >
        {reverting ? 'Reverting...' : 'Revert to Selected Version'}
      </button>
    </div>
  );
}
```

### Fork Graph Dialog

```typescript
// frontend/src/components/ForkGraphDialog.tsx
import { useMutation } from '@apollo/client';
import { FORK_GRAPH } from '../graphql/mutations/graphVersion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ForkGraphDialogProps {
  graphId: string;
  graphName: string;
  userId?: string;
  onClose: () => void;
}

export function ForkGraphDialog({ graphId, graphName, userId, onClose }: ForkGraphDialogProps) {
  const router = useRouter();
  const [forkName, setForkName] = useState(`${graphName} (Fork)`);
  const [forkReason, setForkReason] = useState('');

  const [forkGraph, { loading }] = useMutation(FORK_GRAPH, {
    onCompleted: (data) => {
      alert('Graph forked successfully!');
      // Navigate to the new forked graph
      router.push(`/graph/${data.forkGraph.id}`);
    },
    onError: (err) => {
      alert(`Fork failed: ${err.message}`);
    },
  });

  const handleFork = () => {
    if (!forkName.trim()) {
      alert('Please enter a name for the fork');
      return;
    }

    forkGraph({
      variables: {
        graphId,
        newName: forkName,
        userId,
        forkReason: forkReason || undefined,
      },
    });
  };

  return (
    <div className="fork-dialog-overlay">
      <div className="fork-dialog">
        <h2>Fork Graph</h2>

        <div className="form-group">
          <label htmlFor="fork-name">Fork Name:</label>
          <input
            id="fork-name"
            type="text"
            value={forkName}
            onChange={(e) => setForkName(e.target.value)}
            placeholder="Enter name for forked graph"
          />
        </div>

        <div className="form-group">
          <label htmlFor="fork-reason">Reason (optional):</label>
          <textarea
            id="fork-reason"
            value={forkReason}
            onChange={(e) => setForkReason(e.target.value)}
            placeholder="Why are you creating this fork?"
            rows={3}
          />
        </div>

        <div className="dialog-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={handleFork} disabled={loading} className="btn-primary">
            {loading ? 'Forking...' : 'Create Fork'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Fork Network Visualization

```typescript
// frontend/src/components/ForkNetwork.tsx
import { useQuery } from '@apollo/client';
import { GET_GRAPH_FORKS, GET_GRAPH_ANCESTRY } from '../graphql/queries/graphVersion';
import Link from 'next/link';

interface ForkNetworkProps {
  graphId: string;
}

export function ForkNetwork({ graphId }: ForkNetworkProps) {
  const { data: forksData, loading: forksLoading } = useQuery(GET_GRAPH_FORKS, {
    variables: { graphId },
  });

  const { data: ancestryData, loading: ancestryLoading } = useQuery(GET_GRAPH_ANCESTRY, {
    variables: { graphId },
  });

  if (forksLoading || ancestryLoading) {
    return <div>Loading fork network...</div>;
  }

  const forks = forksData?.graphForks || [];
  const ancestors = ancestryData?.graphAncestry || [];
  const parent = ancestors.find((a: any) => a.depth === 1);

  return (
    <div className="fork-network">
      <h3>Fork Network</h3>

      {parent && (
        <div className="parent-graph">
          <h4>Parent Graph:</h4>
          <Link href={`/graph/${parent.ancestor_id}`}>
            {parent.ancestor_name}
          </Link>
        </div>
      )}

      {ancestors.length > 2 && (
        <div className="ancestors">
          <h4>Ancestry Chain:</h4>
          <ul>
            {ancestors.slice(1).map((ancestor: any) => (
              <li key={ancestor.ancestor_id} style={{ marginLeft: `${ancestor.depth * 20}px` }}>
                <Link href={`/graph/${ancestor.ancestor_id}`}>
                  {ancestor.ancestor_name} (Level {ancestor.ancestor_level})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {forks.length > 0 && (
        <div className="child-forks">
          <h4>Forks ({forks.length}):</h4>
          <ul>
            {forks.map((fork: any) => (
              <li key={fork.fork_id}>
                <Link href={`/graph/${fork.fork_id}`}>
                  {fork.fork_name}
                </Link>
                <span className="fork-date">
                  {new Date(fork.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {forks.length === 0 && !parent && (
        <p className="no-forks">No forks or parents for this graph.</p>
      )}
    </div>
  );
}
```

### Snapshot Button Component

```typescript
// frontend/src/components/SnapshotButton.tsx
import { useMutation } from '@apollo/client';
import { CREATE_GRAPH_SNAPSHOT, GET_GRAPH_VERSION_HISTORY } from '../graphql/mutations/graphVersion';

interface SnapshotButtonProps {
  graphId: string;
  userId?: string;
}

export function SnapshotButton({ graphId, userId }: SnapshotButtonProps) {
  const [createSnapshot, { loading }] = useMutation(CREATE_GRAPH_SNAPSHOT, {
    refetchQueries: [
      { query: GET_GRAPH_VERSION_HISTORY, variables: { graphId } }
    ],
    onCompleted: (data) => {
      alert(`Snapshot created: Version ${data.createGraphSnapshot.version_number}`);
    },
    onError: (err) => {
      alert(`Snapshot failed: ${err.message}`);
    },
  });

  const handleSnapshot = () => {
    if (confirm('Create a snapshot of the current graph state?')) {
      createSnapshot({
        variables: { graphId, userId },
      });
    }
  };

  return (
    <button
      onClick={handleSnapshot}
      disabled={loading}
      className="btn-snapshot"
      title="Save current state"
    >
      {loading ? 'Saving...' : '📸 Create Snapshot'}
    </button>
  );
}
```

## Integration into Graph Page

```typescript
// frontend/src/app/graph/[id]/page.tsx (additions)
import { VersionHistory } from '@/components/VersionHistory';
import { ForkGraphDialog } from '@/components/ForkGraphDialog';
import { ForkNetwork } from '@/components/ForkNetwork';
import { SnapshotButton } from '@/components/SnapshotButton';
import { useState } from 'react';

export default function GraphPage({ params }: { params: { id: string } }) {
  const [showForkDialog, setShowForkDialog] = useState(false);
  const graphId = params.id;
  const userId = 'current-user-id'; // Get from session/auth

  return (
    <div className="graph-page">
      {/* Existing graph visualization */}

      {/* Add toolbar with version controls */}
      <div className="graph-toolbar">
        <SnapshotButton graphId={graphId} userId={userId} />

        <button onClick={() => setShowForkDialog(true)} className="btn-fork">
          🔀 Fork Graph
        </button>
      </div>

      {/* Sidebar with version history and fork network */}
      <aside className="graph-sidebar">
        <VersionHistory graphId={graphId} userId={userId} />
        <ForkNetwork graphId={graphId} />
      </aside>

      {/* Fork dialog */}
      {showForkDialog && (
        <ForkGraphDialog
          graphId={graphId}
          graphName="Current Graph Name"
          userId={userId}
          onClose={() => setShowForkDialog(false)}
        />
      )}
    </div>
  );
}
```

## Tailwind CSS Styles

```css
/* Add to frontend/src/app/globals.css */

.version-history {
  @apply p-4 bg-white rounded-lg shadow-md mb-4;
}

.version-select {
  @apply w-full p-2 border border-gray-300 rounded mb-2;
}

.btn-revert {
  @apply w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400;
}

.btn-snapshot {
  @apply bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400;
}

.btn-fork {
  @apply bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700;
}

.fork-dialog-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.fork-dialog {
  @apply bg-white p-6 rounded-lg shadow-xl max-w-md w-full;
}

.form-group {
  @apply mb-4;
}

.form-group label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.form-group input,
.form-group textarea {
  @apply w-full p-2 border border-gray-300 rounded;
}

.dialog-actions {
  @apply flex justify-end gap-2 mt-4;
}

.fork-network {
  @apply p-4 bg-white rounded-lg shadow-md;
}

.fork-network h3,
.fork-network h4 {
  @apply font-semibold mb-2;
}

.fork-network ul {
  @apply list-disc list-inside;
}

.fork-date {
  @apply text-sm text-gray-500 ml-2;
}

.no-forks {
  @apply text-gray-500 italic;
}
```

## TypeScript Types

```typescript
// frontend/src/types/graphVersion.ts

export interface GraphVersion {
  id: string;
  graph_id: string;
  version_number: number;
  snapshot_data: string; // JSON string
  snapshot_metadata?: string;
  created_at: string;
  created_by?: {
    id: string;
    username: string;
  };
}

export interface GraphVersionHistory {
  version_id: string;
  version_number: number;
  created_at: string;
  created_by?: string;
  snapshot_metadata?: string;
}

export interface GraphFork {
  fork_id: string;
  fork_name: string;
  fork_description?: string;
  created_at: string;
  created_by?: string;
  fork_metadata?: string;
}

export interface GraphAncestor {
  ancestor_id: string;
  ancestor_name: string;
  ancestor_level: number;
  depth: number;
}

export interface SnapshotMetadata {
  manual_snapshot?: boolean;
  trigger_type?: string;
  snapshot_timestamp: string;
}

export interface ForkMetadata {
  forked_from: string;
  forked_at: string;
  fork_reason: string;
  original_name: string;
}
```

## Error Handling

```typescript
// frontend/src/utils/graphVersionErrors.ts

export function handleGraphVersionError(error: Error): string {
  if (error.message.includes('Level 0')) {
    return 'Cannot modify Level 0 (immutable) graphs. Please fork this graph to make changes.';
  }

  if (error.message.includes('not found')) {
    return 'The requested version or graph could not be found.';
  }

  if (error.message.includes('foreign key constraint')) {
    return 'Cannot complete operation due to missing dependencies.';
  }

  return `Operation failed: ${error.message}`;
}
```

## Usage Example

```typescript
// Example: Complete version control workflow
import { useQuery, useMutation } from '@apollo/client';

function MyGraphComponent({ graphId }: { graphId: string }) {
  // Get version history
  const { data: versions } = useQuery(GET_GRAPH_VERSION_HISTORY, {
    variables: { graphId }
  });

  // Fork mutation
  const [forkGraph] = useMutation(FORK_GRAPH);

  // Revert mutation
  const [revertGraph] = useMutation(REVERT_GRAPH);

  // Snapshot mutation
  const [createSnapshot] = useMutation(CREATE_GRAPH_SNAPSHOT);

  const handleFork = async () => {
    const result = await forkGraph({
      variables: {
        graphId,
        newName: 'My Fork',
        userId: 'user-123',
        forkReason: 'Testing alternative approach'
      }
    });
    console.log('Forked graph:', result.data.forkGraph.id);
  };

  const handleRevert = async (versionNumber: number) => {
    await revertGraph({
      variables: { graphId, versionNumber, userId: 'user-123' }
    });
    console.log('Reverted successfully');
  };

  const handleSnapshot = async () => {
    await createSnapshot({
      variables: { graphId, userId: 'user-123' }
    });
    console.log('Snapshot created');
  };

  return (
    <div>
      <button onClick={handleSnapshot}>Create Snapshot</button>
      <button onClick={handleFork}>Fork Graph</button>
      {versions?.graphVersionHistory.map((v: any) => (
        <button key={v.version_id} onClick={() => handleRevert(v.version_number)}>
          Revert to v{v.version_number}
        </button>
      ))}
    </div>
  );
}
```

## Best Practices

### 1. Optimistic UI Updates
Use Apollo's optimistic responses for better UX:

```typescript
const [createSnapshot] = useMutation(CREATE_GRAPH_SNAPSHOT, {
  optimisticResponse: {
    createGraphSnapshot: {
      __typename: 'GraphVersion',
      id: 'temp-id',
      version_number: 999,
      created_at: new Date().toISOString(),
      snapshot_metadata: '{"manual_snapshot":true}',
    },
  },
});
```

### 2. Cache Management
Invalidate relevant queries after mutations:

```typescript
const [forkGraph] = useMutation(FORK_GRAPH, {
  refetchQueries: [
    { query: GET_GRAPH_FORKS, variables: { graphId } },
    { query: GET_GRAPH_ANCESTRY, variables: { graphId: result.data.forkGraph.id } },
  ],
});
```

### 3. Loading States
Always show loading indicators for long operations:

```typescript
{loading && <div className="loading-overlay">Creating fork...</div>}
```

### 4. Confirmation Dialogs
Require confirmation for destructive operations:

```typescript
const handleRevert = () => {
  if (window.confirm('This will restore a previous version. Continue?')) {
    revertGraph({ variables: { graphId, versionNumber } });
  }
};
```

This completes the frontend integration guide!
