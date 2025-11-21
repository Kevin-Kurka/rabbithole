# Graph Hooks

Custom React hooks extracted from `graph-canvas.tsx` for better modularity and reusability.

## Overview

These hooks encapsulate distinct concerns from the monolithic GraphCanvas component:

- **Data Management**: GraphQL queries and caching
- **State Management**: Mutations and optimistic updates
- **History**: Undo/redo functionality
- **Real-time**: WebSocket subscriptions

## Hooks

### `useGraphData(graphIds: string[])`

Fetches and merges data from multiple graph sources.

**Returns:**
```typescript
{
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  loading: boolean;
  error: Error | undefined;
}
```

**Example:**
```tsx
const { nodes, edges, loading } = useGraphData(['graph-1', 'graph-2']);
```

---

### `useGraphMutations()`

Provides CRUD operations for nodes and edges.

**Returns:**
```typescript
{
  createNode: (variables) => Promise<any>;
  updateNode: (variables) => Promise<any>;
  deleteNode: (variables) => Promise<any>;
  createEdge: (variables) => Promise<any>;
  updateEdge: (variables) => Promise<any>;
  deleteEdge: (variables) => Promise<any>;
  loading: {...};
}
```

**Example:**
```tsx
const { createNode, updateNode, loading } = useGraphMutations();

await createNode({
  graphId: 'graph-1',
  title: 'New Node',
  position: { x: 100, y: 100 }
});
```

---

### `useGraphHistory()`

Manages undo/redo history for graph operations.

**Returns:**
```typescript
{
  history: HistoryItem[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addToHistory: (item: HistoryItem) => void;
  undo: () => HistoryItem | null;
  redo: () => HistoryItem | null;
  clearHistory: () => void;
}
```

**Example:**
```tsx
const { canUndo, canRedo, undo, redo, addToHistory } = useGraphHistory();

// Add operation to history
addToHistory({
  type: 'node_created',
  data: newNode,
  timestamp: Date.now()
});

// Undo last operation
if (canUndo) {
  const lastOp = undo();
  // Revert the operation
}
```

---

### `useGraphSubscriptions(props)`

Subscribes to real-time graph updates via WebSocket.

**Props:**
```typescript
{
  graphId: string;
  onNodeUpdated?: (node: GraphCanvasNode) => void;
  onNodeCreated?: (node: GraphCanvasNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onEdgeUpdated?: (edge: GraphCanvasEdge) => void;
  onEdgeCreated?: (edge: GraphCanvasEdge) => void;
  onEdgeDeleted?: (edgeId: string) => void;
}
```

**Example:**
```tsx
useGraphSubscriptions({
  graphId: 'graph-1',
  onNodeUpdated: (node) => {
    setNodes((prev) =>
      prev.map((n) => n.id === node.id ? node : n)
    );
  },
  onNodeCreated: (node) => {
    setNodes((prev) => [...prev, node]);
  },
  onNodeDeleted: (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }
});
```

## Benefits

### Before (Monolithic)
```tsx
// graph-canvas.tsx: 1,266 lines
function GraphCanvas() {
  // 5 separate useQuery calls
  // 6 useMutation calls
  // 6 useSubscription calls
  // History state management (80+ lines)
  // Layout computation (200+ lines)
  // Event handlers (400+ lines)
  // Rendering logic (400+ lines)
}
```

### After (Modular)
```tsx
// graph-canvas.tsx: ~400 lines (estimated)
function GraphCanvas() {
  const { nodes, edges, loading } = useGraphData(graphIds);
  const mutations = useGraphMutations();
  const history = useGraphHistory();

  useGraphSubscriptions({
    graphId,
    onNodeUpdated: handleNodeUpdate,
    onNodeCreated: handleNodeCreate,
    // ...
  });

  // Focus on rendering and user interaction
}
```

## Testing

Each hook can be tested independently:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useGraphHistory } from './use-graph-history';

test('adds items to history', () => {
  const { result } = renderHook(() => useGraphHistory());

  act(() => {
    result.current.addToHistory({
      type: 'node_created',
      data: { id: '1' },
      timestamp: Date.now()
    });
  });

  expect(result.current.history).toHaveLength(1);
  expect(result.current.canUndo).toBe(true);
});
```

## Migration Guide

To migrate existing code to use these hooks:

1. Replace direct GraphQL calls with `useGraphData()`
2. Replace mutation logic with `useGraphMutations()`
3. Replace history state with `useGraphHistory()`
4. Replace subscription logic with `useGraphSubscriptions()`

See [graph-canvas.tsx](../graph-canvas.tsx) for implementation examples.
