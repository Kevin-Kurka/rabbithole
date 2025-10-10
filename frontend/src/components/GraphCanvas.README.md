# GraphCanvas Component

A comprehensive React Flow-based graph visualization and editing component for the RabbitHole knowledge graph system.

## Overview

The GraphCanvas component provides a complete solution for visualizing and interacting with knowledge graphs, supporting both Level 0 (verified, read-only) and Level 1 (editable) nodes and edges with visual veracity score indicators.

## Features

### Core Functionality
- **Level 0 & Level 1 Support**: Visual distinction between verified (Level 0) and editable (Level 1) elements
- **Veracity Score Visualization**: Color-coded nodes and edges based on confidence scores
- **Real-time Updates**: GraphQL subscriptions for live collaborative editing
- **Undo/Redo**: Full history management with up to 50 operations
- **Copy/Paste**: Duplicate nodes and subgraphs
- **Context Menu**: Right-click operations for nodes, edges, and canvas
- **Keyboard Shortcuts**: Quick access to common operations
- **Minimap**: Bird's-eye view of the entire graph
- **Controls**: Zoom, pan, fit view, and lock controls

### Visual Features
- **Lock Icons**: Read-only indicators on Level 0 elements
- **Color Coding**: 5-tier veracity color scheme
  - Green: Verified (Level 0, weight ≥ 1.0)
  - Lime: High confidence (0.7-0.99)
  - Yellow: Medium confidence (0.4-0.69)
  - Orange: Low confidence (0.1-0.39)
  - Red: Provisional (0-0.09)
- **Animated Edges**: Low-confidence edges animate for visibility
- **Selection Highlights**: Blue ring around selected elements
- **Zinc Theme**: Consistent dark theme throughout

## Installation

```bash
npm install @xyflow/react @apollo/client graphql lucide-react
```

## Usage

### Basic Usage

```tsx
import GraphCanvas from '@/components/GraphCanvas';

function MyGraphPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphCanvas
        graphId="your-graph-id"
        methodologyId="optional-methodology-id"
      />
    </div>
  );
}
```

### With Custom Callbacks

```tsx
import GraphCanvas from '@/components/GraphCanvas';
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';

function MyGraphPage() {
  const handleSave = (nodes: GraphCanvasNode[], edges: GraphCanvasEdge[]) => {
    console.log('Graph updated:', { nodes, edges });
  };

  const handleError = (error: Error) => {
    console.error('Graph error:', error);
    // Show error toast, etc.
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphCanvas
        graphId="your-graph-id"
        onSave={handleSave}
        onError={handleError}
        showMinimap={true}
        showControls={true}
        showBackground={true}
      />
    </div>
  );
}
```

### Read-Only Mode

```tsx
<GraphCanvas
  graphId="your-graph-id"
  readOnly={true}
  showControls={false}
/>
```

### With Initial Data

```tsx
const initialNodes = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: 'Start Node',
      weight: 1.0,
      level: GraphLevel.LEVEL_0,
      isLocked: true,
    },
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'custom',
    data: {
      weight: 0.8,
      level: GraphLevel.LEVEL_1,
      isLocked: false,
    },
  },
];

<GraphCanvas
  graphId="your-graph-id"
  initialNodes={initialNodes}
  initialEdges={initialEdges}
/>
```

## Props

### GraphCanvasProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `graphId` | `string` | **required** | Unique identifier for the graph |
| `onSave` | `(nodes, edges) => void` | - | Callback fired when graph changes |
| `onError` | `(error) => void` | - | Callback fired on errors |
| `readOnly` | `boolean` | `false` | Disable all editing operations |
| `initialNodes` | `GraphCanvasNode[]` | `[]` | Initial nodes (before GraphQL load) |
| `initialEdges` | `GraphCanvasEdge[]` | `[]` | Initial edges (before GraphQL load) |
| `methodologyId` | `string` | - | Associated methodology ID |
| `showMinimap` | `boolean` | `true` | Show/hide minimap |
| `showControls` | `boolean` | `true` | Show/hide zoom controls |
| `showBackground` | `boolean` | `true` | Show/hide grid background |
| `className` | `string` | `''` | Additional CSS classes |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` | Redo |
| `⌘/Ctrl + C` | Copy selected elements |
| `⌘/Ctrl + V` | Paste (via context menu) |
| `Delete` / `Backspace` | Delete selected elements |
| `E` | Edit selected element (context menu) |
| `⌘/Ctrl + D` | Duplicate selected node (context menu) |

## Context Menu

### Node Context Menu
- **Edit Node**: Open node properties editor
- **Duplicate**: Create a copy of the node
- **Copy**: Copy node to clipboard
- **Delete**: Remove node and connected edges

### Edge Context Menu
- **Edit Edge**: Open edge properties editor
- **Delete**: Remove edge

### Canvas Context Menu
- **Paste**: Paste copied elements at cursor position

## GraphQL Integration

The component automatically handles:
- Loading graph data on mount
- Creating nodes and edges
- Updating node positions and properties
- Deleting nodes and edges
- Real-time subscriptions for collaborative editing

### Required GraphQL Schema

```graphql
type Query {
  graph(id: String!): Graph
}

type Mutation {
  createNode(input: NodeInput!): Node
  updateNode(id: ID!, props: String!, weight: Float): Node
  deleteNode(id: ID!): Boolean
  createEdge(input: EdgeInput!): Edge
  updateEdge(id: ID!, props: String!, weight: Float): Edge
  deleteEdge(id: ID!): Boolean
}

type Subscription {
  nodeUpdated(graphId: String!): Node
  nodeCreated(graphId: String!): Node
  nodeDeleted(graphId: String!): NodeDeleted
  edgeUpdated(graphId: String!): Edge
  edgeCreated(graphId: String!): Edge
  edgeDeleted(graphId: String!): EdgeDeleted
}

type Graph {
  id: ID!
  name: String!
  nodes: [Node!]!
  edges: [Edge!]!
}

type Node {
  id: ID!
  weight: Float!
  props: String!
  level: Int
}

type Edge {
  id: ID!
  from: Node!
  to: Node!
  weight: Float!
  props: String!
  level: Int
}
```

## Custom Node Types

You can extend the node types by creating custom components:

```tsx
import { NodeProps } from '@xyflow/react';
import { NodeData } from '@/types/graph';

function MyCustomNode({ data }: NodeProps<NodeData>) {
  return (
    <div className="custom-node">
      <h3>{data.label}</h3>
      {/* Your custom content */}
    </div>
  );
}

// Register in nodeTypes
const nodeTypes = {
  default: GraphNode,
  custom: GraphNode,
  myCustom: MyCustomNode,
};
```

## Styling

The component uses the zinc theme from `/src/styles/theme.ts`. All colors and spacing follow the theme constants.

### Veracity Colors

```typescript
const colors = {
  verified: '#10b981',    // green-500
  high: '#84cc16',        // lime-500
  medium: '#eab308',      // yellow-500
  low: '#f97316',         // orange-500
  provisional: '#ef4444', // red-500
};
```

## Helper Utilities

### Graph Statistics

```typescript
import { calculateGraphStats } from '@/utils/graphHelpers';

const stats = calculateGraphStats(nodes, edges);
console.log(stats);
// {
//   totalNodes: 10,
//   totalEdges: 15,
//   level0Nodes: 3,
//   level1Nodes: 7,
//   avgNodeVeracity: 0.75,
//   avgEdgeVeracity: 0.68
// }
```

### Path Finding

```typescript
import { findPath } from '@/utils/graphHelpers';

const path = findPath('node-1', 'node-5', edges);
console.log(path); // ['node-1', 'node-3', 'node-5']
```

### Cycle Detection

```typescript
import { detectCycles } from '@/utils/graphHelpers';

const hasCycles = detectCycles(nodes, edges);
console.log(hasCycles); // true or false
```

### Export/Import

```typescript
import { exportGraphToJSON, importGraphFromJSON } from '@/utils/graphHelpers';

// Export
const json = exportGraphToJSON(nodes, edges);
localStorage.setItem('graph', json);

// Import
const json = localStorage.getItem('graph');
const data = importGraphFromJSON(json);
if (data) {
  setNodes(data.nodes);
  setEdges(data.edges);
}
```

## Performance Considerations

- **Large Graphs**: For graphs with >1000 nodes, consider implementing pagination or clustering
- **Real-time Updates**: Subscriptions are throttled to avoid excessive re-renders
- **History Size**: Limited to 50 operations to prevent memory issues
- **Memoization**: All callbacks use `useCallback` for optimal performance

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all operations
- **Screen Readers**: Semantic HTML and ARIA labels where appropriate
- **Color Contrast**: All text meets WCAG 2.1 AA standards
- **Focus Indicators**: Clear visual indicators for keyboard focus

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Nodes not appearing
- Verify `graphId` prop is correct
- Check GraphQL connection and authentication
- Ensure node positions are within viewport

### Context menu not showing
- Check if `readOnly` prop is set
- Verify right-click event is not prevented by parent elements

### Real-time updates not working
- Verify WebSocket connection for subscriptions
- Check GraphQL subscription configuration
- Ensure `graphId` matches subscription variable

### Performance issues
- Reduce number of visible nodes (implement pagination)
- Disable minimap with `showMinimap={false}`
- Disable background with `showBackground={false}`
- Check browser console for errors

## Examples

See `/src/app/graph/page.tsx` for a complete implementation example.

## Contributing

When contributing to GraphCanvas:
1. Follow the zinc theme for all styling
2. Add TypeScript types for all new features
3. Include JSDoc comments for public APIs
4. Test with both Level 0 and Level 1 nodes
5. Verify keyboard shortcuts work
6. Test real-time collaboration scenarios

## License

Part of the RabbitHole project.
