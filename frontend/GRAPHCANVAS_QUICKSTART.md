# GraphCanvas Quick Start Guide

## 1. Basic Usage (5 minutes)

### Import and Use

```tsx
import GraphCanvas from '@/components/GraphCanvas';

export default function MyPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphCanvas graphId="your-graph-id" />
    </div>
  );
}
```

That's it! The component will:
- ✅ Connect to GraphQL automatically
- ✅ Load your graph data
- ✅ Enable editing (drag, create, delete)
- ✅ Show minimap and controls
- ✅ Handle real-time updates

## 2. Add Callbacks (2 minutes)

```tsx
import GraphCanvas from '@/components/GraphCanvas';

export default function MyPage() {
  const handleSave = (nodes, edges) => {
    console.log('Graph changed!', { nodes, edges });
  };

  const handleError = (error) => {
    alert(`Error: ${error.message}`);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphCanvas
        graphId="your-graph-id"
        onSave={handleSave}
        onError={handleError}
      />
    </div>
  );
}
```

## 3. Make it Read-Only (1 minute)

```tsx
<GraphCanvas
  graphId="your-graph-id"
  readOnly={true}
/>
```

## 4. Customize Appearance (2 minutes)

```tsx
<GraphCanvas
  graphId="your-graph-id"
  showMinimap={false}      // Hide minimap
  showControls={false}     // Hide zoom controls
  showBackground={true}    // Show grid
  className="my-custom-class"
/>
```

## 5. Add Initial Data (3 minutes)

```tsx
import { GraphLevel } from '@/types/graph';

const initialNodes = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: {
      label: 'Start Here',
      weight: 1.0,
      level: GraphLevel.LEVEL_0,
      isLocked: true,
    },
  },
];

<GraphCanvas
  graphId="your-graph-id"
  initialNodes={initialNodes}
/>
```

## User Instructions

### For End Users

**Basic Operations:**
1. **Add Node**: Right-click on canvas → Paste (after copying)
2. **Move Node**: Click and drag
3. **Connect Nodes**: Drag from one node's handle to another
4. **Delete**: Select node/edge → Press Delete
5. **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z

**Understanding Colors:**
- 🟢 Green = Verified (Level 0)
- 🟡 Lime = High confidence
- 🟡 Yellow = Medium confidence
- 🟠 Orange = Low confidence
- 🔴 Red = Provisional

**Lock Icon** = Read-only (cannot edit)

**Right-Click Menu:**
- On Node: Edit, Duplicate, Copy, Delete
- On Edge: Edit, Delete
- On Canvas: Paste

## Common Patterns

### Pattern 1: Graph Viewer (Read-Only)

```tsx
function GraphViewer({ graphId }: { graphId: string }) {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <GraphCanvas
        graphId={graphId}
        readOnly={true}
        showMinimap={true}
        showControls={false}
      />
    </div>
  );
}
```

### Pattern 2: Graph Editor with Stats

```tsx
import { useState } from 'react';
import { calculateGraphStats } from '@/utils/graphHelpers';

function GraphEditor({ graphId }: { graphId: string }) {
  const [stats, setStats] = useState({ totalNodes: 0, totalEdges: 0 });

  const handleSave = (nodes, edges) => {
    const newStats = calculateGraphStats(nodes, edges);
    setStats(newStats);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: '#18181b',
        padding: '1rem',
        borderRadius: '4px',
        zIndex: 10
      }}>
        <div>Nodes: {stats.totalNodes}</div>
        <div>Edges: {stats.totalEdges}</div>
      </div>

      <GraphCanvas
        graphId={graphId}
        onSave={handleSave}
      />
    </div>
  );
}
```

### Pattern 3: Methodology-Specific Graph

```tsx
function MethodologyGraph({ graphId, methodologyId }: {
  graphId: string;
  methodologyId: string;
}) {
  return (
    <GraphCanvas
      graphId={graphId}
      methodologyId={methodologyId}
      showMinimap={true}
      showControls={true}
    />
  );
}
```

### Pattern 4: With Authentication Check

```tsx
import { useSession } from 'next-auth/react';

function ProtectedGraph({ graphId }: { graphId: string }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Please sign in to view this graph</div>;
  }

  return (
    <GraphCanvas
      graphId={graphId}
      onError={(error) => console.error(error)}
    />
  );
}
```

## Helper Functions

### Calculate Statistics

```tsx
import { calculateGraphStats } from '@/utils/graphHelpers';

const stats = calculateGraphStats(nodes, edges);
console.log(stats);
// {
//   totalNodes: 10,
//   totalEdges: 15,
//   level0Nodes: 3,
//   avgNodeVeracity: 0.75
// }
```

### Find Path Between Nodes

```tsx
import { findPath } from '@/utils/graphHelpers';

const path = findPath('node-1', 'node-5', edges);
if (path) {
  console.log('Path found:', path);
} else {
  console.log('No path exists');
}
```

### Detect Cycles

```tsx
import { detectCycles } from '@/utils/graphHelpers';

if (detectCycles(nodes, edges)) {
  console.log('Graph contains cycles');
}
```

### Export/Import

```tsx
import { exportGraphToJSON, importGraphFromJSON } from '@/utils/graphHelpers';

// Export
const json = exportGraphToJSON(nodes, edges);
localStorage.setItem('graph-backup', json);

// Import
const json = localStorage.getItem('graph-backup');
const data = importGraphFromJSON(json);
if (data) {
  // Use data.nodes and data.edges
}
```

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy selected |
| `Delete` or `Backspace` | Delete selected |
| `Right Click` | Open context menu |
| `E` (in context menu) | Edit |
| `Ctrl/Cmd + D` (in context menu) | Duplicate |

## Troubleshooting

### Problem: Graph not loading

**Solution:**
1. Check graphId is correct
2. Verify GraphQL connection
3. Check browser console for errors
4. Ensure user is authenticated

### Problem: Can't edit nodes

**Solution:**
1. Check if `readOnly={true}` is set
2. Verify node is not Level 0 (locked)
3. Check user permissions

### Problem: Context menu not appearing

**Solution:**
1. Ensure right-click is enabled
2. Check if element is locked
3. Try different browser

### Problem: Performance issues

**Solution:**
1. Reduce number of nodes (< 1000)
2. Set `showMinimap={false}`
3. Set `showBackground={false}`
4. Check browser performance tools

## File Locations

- Component: `/src/components/GraphCanvas.tsx`
- Types: `/src/types/graph.ts`
- GraphQL: `/src/graphql/queries/graphs.ts`
- Helpers: `/src/utils/graphHelpers.ts`
- Styles: `/src/styles/graph-canvas.css`
- Example: `/src/app/graph/example/page.tsx`
- Docs: `/src/components/GraphCanvas.README.md`

## Need More Help?

1. **Read full documentation**: `GraphCanvas.README.md`
2. **Check examples**: `/src/app/graph/example/page.tsx`
3. **View Storybook**: Run `npm run storybook`
4. **Run tests**: Run `npm test`

## Next Steps

1. ✅ Try the basic example above
2. ✅ Customize with your graph ID
3. ✅ Add callbacks for your needs
4. ✅ Style to match your UI
5. ✅ Add helper functions as needed
6. ✅ Read full docs for advanced features

Happy graphing! 🎉
