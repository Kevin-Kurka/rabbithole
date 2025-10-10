# Quick Start: Advanced Visualization Features

Get started with the advanced graph visualization features in 5 minutes.

## Installation

The dependencies are already installed. If you need to reinstall:

```bash
npm install d3-force html2canvas
npm install --save-dev @types/d3-force
```

## Basic Usage

### 1. Simple Enhanced Canvas

```tsx
import { ReactFlowProvider } from '@xyflow/react';
import EnhancedGraphCanvas from '@/components/EnhancedGraphCanvas';

function MyGraph() {
  const nodes = [
    {
      id: '1',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        label: 'Node 1',
        weight: 0.8,
        level: 1,
        isLocked: false,
      },
    },
    // ... more nodes
  ];

  const edges = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'custom',
      data: { weight: 0.7, level: 1, isLocked: false },
    },
    // ... more edges
  ];

  return (
    <div style={{ height: '100vh' }}>
      <ReactFlowProvider>
        <EnhancedGraphCanvas
          graphId="my-graph"
          initialNodes={nodes}
          initialEdges={edges}
        />
      </ReactFlowProvider>
    </div>
  );
}
```

### 2. Apply a Layout

```tsx
import { applyLayout } from '@/utils/layoutAlgorithms';

// Force-directed layout
const { nodes: layoutedNodes } = applyLayout(nodes, edges, {
  algorithm: 'force',
  iterations: 300,
  strength: -400,
  spacing: 150,
});

// Hierarchical layout
const { nodes: hierarchicalNodes } = applyLayout(nodes, edges, {
  algorithm: 'hierarchical',
  spacing: 200,
});

// Circular layout
const { nodes: circularNodes } = applyLayout(nodes, edges, {
  algorithm: 'circular',
});
```

### 3. Export a Graph

```tsx
import { exportGraph } from '@/utils/exportGraph';

// Export as PNG
await exportGraph('png', graphId, nodes, edges, {
  filename: 'my-graph',
  quality: 0.95,
  scale: 2,
});

// Export as SVG
await exportGraph('svg', graphId, nodes, edges, {
  filename: 'my-graph',
});

// Export as JSON
await exportGraph('json', graphId, nodes, edges, {
  filename: 'my-graph',
  metadata: {
    title: 'My Knowledge Graph',
    methodology: 'scientific',
  },
});
```

### 4. Use Timeline View

```tsx
import TimelineView from '@/components/TimelineView';

// Nodes must have metadata.createdAt for timeline
const nodesWithDates = nodes.map(node => ({
  ...node,
  data: {
    ...node.data,
    metadata: {
      createdAt: new Date().toISOString(),
    },
  },
}));

<TimelineView
  nodes={nodesWithDates}
  edges={edges}
  onNodeClick={(node) => console.log('Clicked:', node)}
/>
```

### 5. Use Cluster View

```tsx
import ClusterView from '@/components/ClusterView';

// Nodes should have methodology for clustering
const nodesWithMethodology = nodes.map(node => ({
  ...node,
  data: {
    ...node.data,
    methodology: 'scientific', // or 'journalistic', 'crowdsourced', 'expert'
  },
}));

<ClusterView
  nodes={nodesWithMethodology}
  edges={edges}
  onNodeClick={(node) => console.log('Clicked:', node)}
/>
```

### 6. Add Filtering

```tsx
import FilterPanel from '@/components/FilterPanel';

const [filteredNodes, setFilteredNodes] = useState(nodes);
const [filteredEdges, setFilteredEdges] = useState(edges);

<FilterPanel
  nodes={nodes}
  edges={edges}
  onFilterChange={(newNodes, newEdges) => {
    setFilteredNodes(newNodes);
    setFilteredEdges(newEdges);
  }}
/>
```

## View the Demo

```bash
npm run dev
```

Navigate to: `http://localhost:3000/demo/enhanced-graph`

## Common Patterns

### Custom Layout Parameters

```tsx
// Stronger repulsion force (nodes spread more)
const { nodes } = applyLayout(nodes, edges, {
  algorithm: 'force',
  strength: -800,
});

// More iterations (more stable but slower)
const { nodes } = applyLayout(nodes, edges, {
  algorithm: 'force',
  iterations: 500,
});

// Wider spacing
const { nodes } = applyLayout(nodes, edges, {
  algorithm: 'hierarchical',
  spacing: 300,
});
```

### Filtering by Multiple Criteria

```tsx
// Filter state
const filters = {
  veracityRange: [0.7, 1.0],          // High confidence only
  methodologies: ['scientific'],       // Scientific only
  levels: [0, 1],                      // Both levels
  dateRange: { start: null, end: null },
};

// Apply in FilterPanel component automatically
```

### Export with Custom Metadata

```tsx
await exportGraph('json', graphId, nodes, edges, {
  metadata: {
    title: 'Climate Change Evidence',
    description: 'Scientific consensus data',
    methodology: 'scientific',
    author: 'Research Team',
    version: '2.0',
  },
});
```

### Center a Layout

```tsx
import { centerLayout } from '@/utils/layoutAlgorithms';

// Apply layout
const { nodes: layoutedNodes } = applyLayout(nodes, edges, {
  algorithm: 'force',
});

// Center at origin (0, 0)
const centeredNodes = centerLayout(layoutedNodes);
```

## Integration Checklist

- [ ] Install dependencies
- [ ] Wrap component in ReactFlowProvider
- [ ] Add metadata.createdAt for timeline view
- [ ] Add methodology for cluster view
- [ ] Set up filtering state (if using FilterPanel)
- [ ] Configure layout options
- [ ] Test export functionality
- [ ] Check performance with your data size

## Performance Tips

### For Large Graphs (>200 nodes)

1. Use simpler layouts:
   ```tsx
   // Circular is O(n) - fastest
   algorithm: 'circular'

   // Hierarchical is O(n + m) - fast
   algorithm: 'hierarchical'

   // Force is O(n²) - slowest
   algorithm: 'force'
   ```

2. Reduce force iterations:
   ```tsx
   iterations: 100  // Instead of 300
   ```

3. Disable minimap:
   ```tsx
   showMinimap: false
   ```

4. Use filtering to reduce visible nodes

### For Timeline View

- Ensure all nodes have `metadata.createdAt`
- Use appropriate grouping (month for large date ranges)

### For Cluster View

- Keep clusters under 50 nodes each for performance
- Use expand/collapse to manage visibility

## Troubleshooting

### Layout doesn't apply
- Check that nodes array has position properties
- Verify algorithm name is correct: 'force', 'hierarchical', 'circular', or 'timeline'
- Ensure iterations > 0

### Export fails
- Check browser console for specific error
- Verify canvas element exists (only works in canvas mode)
- Try a different format (SVG is most reliable)

### Timeline view empty
- Ensure nodes have `metadata.createdAt` field
- Check date format is ISO 8601 string
- Verify dates are valid

### Filters not working
- Check that FilterPanel onFilterChange callback is connected
- Verify filter state is being used
- Ensure nodes have the properties you're filtering on

## Next Steps

- Read [VISUALIZATION_FEATURES.md](./VISUALIZATION_FEATURES.md) for detailed documentation
- Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture details
- Check the demo at `/src/app/demo/enhanced-graph/page.tsx` for complete example
- Explore layout algorithm tests at `/src/utils/__tests__/layoutAlgorithms.test.ts`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full documentation
3. Examine the demo implementation
4. Check component TypeScript interfaces for available props
