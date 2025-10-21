# Dynamic Layout System

A comprehensive graph layout engine for Project Rabbit Hole, providing multiple automatic layout algorithms with animation support.

## Overview

The layout system enables automatic arrangement of graph nodes using industry-standard algorithms:

- **Force-Directed**: Physics-based organic layouts (d3-force)
- **Hierarchical**: Top-down tree structures (dagre)
- **Timeline**: Chronological arrangements
- **Circular**: Radial and circular patterns

## Features

- **10 Layout Algorithms**: Force, hierarchical, timeline, circular, and variations
- **Smooth Animations**: Interpolated transitions between layouts
- **Smart Recommendations**: Auto-detection of optimal layout based on graph structure
- **Locked Node Preservation**: Level 0 (verified) nodes maintain positions
- **Responsive**: Auto-tuned parameters based on graph size
- **TypeScript**: Full type safety with comprehensive interfaces

## Architecture

```
layouts/
├── ForceLayout.ts         # d3-force physics simulations
├── HierarchicalLayout.ts  # Dagre tree/DAG layouts
├── TimelineLayout.ts      # Chronological arrangements
├── CircularLayout.ts      # Radial and circular patterns
├── LayoutEngine.ts        # Central orchestrator
├── index.ts              # Public API exports
├── README.md             # This file
└── LAYOUT_EXAMPLES.md    # Usage examples
```

## Quick Start

### 1. Using Layout Controls (UI)

The `LayoutControls` component is automatically integrated into `GraphCanvas`:

```typescript
import GraphCanvas from '@/components/GraphCanvas';

<GraphCanvas
  graphId="my-graph"
  showControls={true}  // Layout controls visible
  readOnly={false}     // Allow layout changes
/>
```

Users can click the layout button (bottom-right) to select from available algorithms.

### 2. Programmatic Usage

```typescript
import { LayoutEngine, LayoutType, LayoutConfig } from '@/utils/layouts';

// Apply force-directed layout
const config: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 500,
};

const result = LayoutEngine.applyLayout(nodes, edges, config);
setNodes(result.nodes);
```

### 3. Auto-Recommendation

```typescript
const recommendedType = LayoutEngine.recommendLayout(nodes, edges);
const autoOptions = LayoutEngine.getAutoOptions(recommendedType, nodes, edges);

const config: LayoutConfig = {
  type: recommendedType,
  animated: true,
  animationDuration: 600,
  options: autoOptions,
};
```

## Layout Types

### Automatic Layouts

| Layout | Algorithm | Best For | Time Complexity |
|--------|-----------|----------|----------------|
| `FORCE` | d3-force | General networks, clustering | O(n²) per iteration |
| `FORCE_CLUSTERED` | d3-force + clusters | Multi-category data | O(n²) per iteration |

### Hierarchical Layouts

| Layout | Algorithm | Best For | Time Complexity |
|--------|-----------|----------|----------------|
| `HIERARCHICAL` | Dagre | DAGs, process flows | O(n + e) |
| `HIERARCHICAL_TB` | Dagre (top-bottom) | Top-down hierarchies | O(n + e) |
| `HIERARCHICAL_LR` | Dagre (left-right) | Left-right hierarchies | O(n + e) |
| `LAYERED` | Dagre (manual layers) | Explicit layer control | O(n + e) |
| `TREE` | Dagre (optimized) | Single-root trees | O(n + e) |

### Temporal Layouts

| Layout | Algorithm | Best For | Time Complexity |
|--------|-----------|----------|----------------|
| `TIMELINE` | Custom | Event sequences | O(n log n) |
| `SWIMLANE` | Custom | Multi-lane timelines | O(n log n) |

### Circular Layouts

| Layout | Algorithm | Best For | Time Complexity |
|--------|-----------|----------|----------------|
| `CIRCULAR` | Custom | Equal relationships | O(n log n) |
| `RADIAL` | Custom (BFS) | Hub-and-spoke | O(n + e) |
| `SPIRAL` | Custom | Dense circular | O(n log n) |

### Utility Layouts

| Layout | Description |
|--------|-------------|
| `MANUAL` | No layout change (preserve positions) |

## API Reference

### LayoutEngine

Central orchestrator for all layout operations.

#### Methods

##### `applyLayout(nodes, edges, config): LayoutResult`

Applies a layout algorithm to the graph.

**Parameters**:
- `nodes: GraphCanvasNode[]` - Array of nodes to layout
- `edges: GraphCanvasEdge[]` - Array of edges defining connections
- `config: LayoutConfig` - Layout configuration

**Returns**: `LayoutResult` with layouted nodes and metadata

**Example**:
```typescript
const result = LayoutEngine.applyLayout(nodes, edges, {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 500,
});

console.log(result.metadata.duration); // Layout computation time
console.log(result.metadata.boundingBox); // Graph dimensions
```

##### `recommendLayout(nodes, edges): LayoutType`

Recommends optimal layout based on graph structure.

**Analysis**:
- Checks for timestamps → recommends `TIMELINE`
- Detects DAG structure → recommends `HIERARCHICAL`
- High density (> 2 edges/node) → recommends `CIRCULAR`
- Default → recommends `FORCE`

**Example**:
```typescript
const recommended = LayoutEngine.recommendLayout(nodes, edges);
// Returns: LayoutType.TIMELINE (if nodes have timestamps)
```

##### `getAutoOptions(layoutType, nodes, edges): LayoutOptions`

Returns auto-tuned options for specified layout.

**Example**:
```typescript
const options = LayoutEngine.getAutoOptions(
  LayoutType.FORCE,
  nodes,
  edges
);
// Returns: { chargeStrength: -300, linkDistance: 100, ... }
```

##### `isDirectedAcyclic(nodes, edges): boolean`

Checks if graph is a directed acyclic graph (DAG).

**Example**:
```typescript
const isDAG = LayoutEngine.isDirectedAcyclic(nodes, edges);
// Returns: true if no cycles detected
```

##### `getAvailableLayouts(nodes, edges): LayoutMetadata[]`

Returns all available layouts with metadata and recommendations.

**Example**:
```typescript
const layouts = LayoutEngine.getAvailableLayouts(nodes, edges);
layouts.forEach(layout => {
  console.log(layout.name, layout.recommended ? '(recommended)' : '');
});
```

### LayoutConfig

Configuration object for layout application.

```typescript
interface LayoutConfig {
  type: LayoutType;              // Layout algorithm to use
  animated?: boolean;            // Enable transition animation
  animationDuration?: number;    // Animation duration (ms)
  preserveLocked?: boolean;      // Preserve locked nodes (default: true)
  options?: LayoutOptions;       // Algorithm-specific options

  // Algorithm-specific parameters
  clusterKey?: string;          // For FORCE_CLUSTERED
  layerKey?: string;            // For LAYERED
  laneKey?: string;             // For SWIMLANE
  timeKey?: string;             // For TIMELINE/SWIMLANE
  rootNodeId?: string;          // For TREE/RADIAL
}
```

### LayoutResult

Result object from layout application.

```typescript
interface LayoutResult {
  nodes: GraphCanvasNode[];     // Layouted nodes with new positions
  metadata: {
    algorithm: LayoutType;      // Applied algorithm
    nodeCount: number;          // Number of nodes
    edgeCount: number;          // Number of edges
    duration: number;           // Computation time (ms)
    boundingBox: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
}
```

## Layout Options

### ForceLayoutOptions

```typescript
interface ForceLayoutOptions {
  chargeStrength?: number;      // Node repulsion (-100 = strong)
  linkStrength?: number;        // Edge attraction (0-1)
  linkDistance?: number;        // Desired edge length
  centerStrength?: number;      // Pull toward center (0-1)
  collisionRadius?: number;     // Node collision radius
  iterations?: number;          // Simulation iterations
  width?: number;              // Layout area width
  height?: number;             // Layout area height
}
```

**Defaults**:
```typescript
{
  chargeStrength: -300,
  linkStrength: 0.7,
  linkDistance: 100,
  centerStrength: 0.1,
  collisionRadius: 50,
  iterations: 300,
  width: 1000,
  height: 1000,
}
```

### HierarchicalLayoutOptions

```typescript
interface HierarchicalLayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';  // Layout direction
  nodeSpacing?: number;                    // Horizontal spacing
  rankSpacing?: number;                    // Vertical spacing
  edgeSpacing?: number;                    // Edge separation
  nodeWidth?: number;                      // Node width for calculation
  nodeHeight?: number;                     // Node height for calculation
  align?: 'UL' | 'UR' | 'DL' | 'DR';      // Node alignment
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
}
```

**Defaults**:
```typescript
{
  direction: 'TB',
  nodeSpacing: 80,
  rankSpacing: 100,
  edgeSpacing: 10,
  nodeWidth: 200,
  nodeHeight: 80,
  align: 'UL',
  ranker: 'network-simplex',
}
```

### TimelineLayoutOptions

```typescript
interface TimelineLayoutOptions {
  orientation?: 'horizontal' | 'vertical';  // Timeline direction
  timeKey?: string;                         // Property for timestamps
  spacing?: number;                         // Distance between positions
  trackSpacing?: number;                    // Distance between tracks
  startPosition?: number;                   // Starting offset
  maxTracks?: number;                       // Max parallel tracks
  groupWindow?: number;                     // Group time window (ms)
  reverse?: boolean;                        // Reverse order
}
```

**Defaults**:
```typescript
{
  orientation: 'horizontal',
  timeKey: 'createdAt',
  spacing: 150,
  trackSpacing: 100,
  startPosition: 100,
  maxTracks: 5,
  groupWindow: 0,
  reverse: false,
}
```

### CircularLayoutOptions

```typescript
interface CircularLayoutOptions {
  centerX?: number;                         // Center X coordinate
  centerY?: number;                         // Center Y coordinate
  radius?: number;                          // Circle radius
  startAngle?: number;                      // Start angle (radians)
  direction?: 'clockwise' | 'counterclockwise';
  sort?: 'none' | 'degree' | 'weight' | 'label';
  concentric?: boolean;                     // Use concentric circles
  groupKey?: string;                        // Property for grouping
  concentricSpacing?: number;               // Circle spacing
}
```

**Defaults**:
```typescript
{
  centerX: 500,
  centerY: 500,
  radius: 300,
  startAngle: -Math.PI / 2,
  direction: 'clockwise',
  sort: 'none',
  concentric: false,
  groupKey: 'level',
  concentricSpacing: 200,
}
```

## Helper Functions

### interpolateNodePositions()

Interpolates between two node position sets for smooth animation.

```typescript
function interpolateNodePositions(
  startNodes: GraphCanvasNode[],
  endNodes: GraphCanvasNode[],
  progress: number  // 0 to 1
): GraphCanvasNode[]
```

**Example**:
```typescript
const startNodes = [...nodes];
const endNodes = layoutResult.nodes;

// Animate from 0 to 1
const progress = 0.5; // 50% through animation
const interpolated = interpolateNodePositions(startNodes, endNodes, progress);
```

### getRecommendedForceOptions()

Returns recommended force layout options based on graph size.

```typescript
function getRecommendedForceOptions(
  nodeCount: number
): ForceLayoutOptions
```

### detectOptimalDirection()

Analyzes graph structure to suggest optimal hierarchical direction.

```typescript
function detectOptimalDirection(
  nodes: GraphCanvasNode[],
  edges: GraphCanvasEdge[]
): 'TB' | 'BT' | 'LR' | 'RL'
```

## Integration

### GraphCanvas Integration

The layout system is automatically integrated into `GraphCanvas.tsx`:

1. **State Management**: Tracks current layout type and animation state
2. **Layout Controls**: Renders `LayoutControls` component
3. **Animation**: Handles smooth transitions using `requestAnimationFrame`
4. **Fit View**: Auto-fits viewport after layout application

### LayoutControls Component

Provides UI for layout selection:

- **Compact Mode**: Shows current layout with quick "Auto" button
- **Expanded Mode**: Grid of all available layouts with categories
- **Recommendations**: Highlights recommended layout with badge
- **Categories**: Filters by automatic, hierarchical, temporal, circular

## Performance Considerations

### Graph Size Guidelines

| Graph Size | Recommended Layouts | Notes |
|------------|-------------------|-------|
| < 50 nodes | All layouts work well | Enable animation |
| 50-200 nodes | Force, Hierarchical, Circular | Consider reducing iterations |
| 200-500 nodes | Circular, Hierarchical | Disable animation for Force |
| > 500 nodes | Circular, Manual | Use simpler layouts |

### Optimization Tips

1. **Disable Animation**: For large graphs (> 200 nodes)
   ```typescript
   const config = { type: LayoutType.FORCE, animated: false };
   ```

2. **Reduce Iterations**: For force layouts
   ```typescript
   const config = {
     type: LayoutType.FORCE,
     options: { iterations: 100 }  // Default is 300
   };
   ```

3. **Progressive Layout**: Layout visible nodes first
   ```typescript
   const visibleNodes = nodes.slice(0, 100);
   const result = LayoutEngine.applyLayout(visibleNodes, edges, config);
   ```

4. **Use Simpler Layouts**: Circular has O(n log n) vs Force O(n²)

## Dependencies

- **d3-force** (^3.0.0): Physics simulation for force layouts
- **dagre** (^0.8.5): Hierarchical layout algorithm
- **elkjs** (^0.11.0): Alternative hierarchical layout (future)

## Browser Support

- Modern browsers with ES2020+ support
- Requires `requestAnimationFrame` for animations
- TypeScript 5.0+
- React 19+

## Testing

```typescript
import { LayoutEngine, LayoutType } from '@/utils/layouts';

// Test basic layout application
const nodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'A', weight: 0.8 } },
  { id: '2', position: { x: 0, y: 0 }, data: { label: 'B', weight: 0.6 } },
];
const edges = [{ id: 'e1', source: '1', target: '2' }];

const result = LayoutEngine.applyLayout(nodes, edges, {
  type: LayoutType.FORCE,
  animated: false,
});

expect(result.nodes[0].position.x).not.toBe(0);
expect(result.metadata.nodeCount).toBe(2);
```

## Contributing

When adding new layout algorithms:

1. Create new file in `/utils/layouts/`
2. Implement layout function with signature:
   ```typescript
   function applyMyLayout(
     nodes: GraphCanvasNode[],
     edges: GraphCanvasEdge[],
     options?: MyLayoutOptions
   ): GraphCanvasNode[]
   ```
3. Add layout type to `LayoutType` enum
4. Register in `LayoutEngine.applyLayout()` switch statement
5. Add metadata to `LayoutEngine.getAvailableLayouts()`
6. Document in `LAYOUT_EXAMPLES.md`

## License

Part of Project Rabbit Hole. See project LICENSE.

## References

- [ReactFlow Auto-Layout](https://reactflow.dev/examples/layout)
- [d3-force Documentation](https://d3js.org/d3-force)
- [Dagre Wiki](https://github.com/dagrejs/dagre/wiki)
- [Graph Layout Algorithms (Wikipedia)](https://en.wikipedia.org/wiki/Graph_drawing)
