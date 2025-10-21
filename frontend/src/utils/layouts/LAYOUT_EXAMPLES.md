# Graph Layout System - Examples & Usage Guide

This document provides comprehensive examples for using the dynamic layout algorithms in Project Rabbit Hole.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Layout Types](#layout-types)
3. [Advanced Usage](#advanced-usage)
4. [Performance Tips](#performance-tips)
5. [Custom Configurations](#custom-configurations)

---

## Quick Start

### Basic Usage in GraphCanvas

The layout controls are automatically integrated into `GraphCanvas`. Users can access them via the floating layout button in the bottom-right corner.

```typescript
import GraphCanvas from '@/components/GraphCanvas';

function MyGraph() {
  return (
    <GraphCanvas
      graphId="my-graph-id"
      showControls={true}
      readOnly={false}
    />
  );
}
```

### Programmatic Layout Application

```typescript
import { LayoutEngine, LayoutType, LayoutConfig } from '@/utils/layouts';

// Apply force-directed layout
const config: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 500,
  options: {
    chargeStrength: -300,
    linkDistance: 100,
  },
};

const result = LayoutEngine.applyLayout(nodes, edges, config);
setNodes(result.nodes);
```

---

## Layout Types

### 1. Manual Layout

**Description**: Preserves current node positions. No automatic arrangement.

**Use Cases**:
- User has manually positioned nodes
- Custom layouts that shouldn't be changed
- After manual fine-tuning

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.MANUAL,
};
```

---

### 2. Force-Directed Layout

**Description**: Physics-based layout using attractive and repulsive forces. Creates organic, network-like visualizations.

**Best For**:
- Social networks
- Dependency graphs
- General purpose network visualization
- Highlighting natural clusters

**Options**:
```typescript
import { ForceLayoutOptions } from '@/utils/layouts';

const options: ForceLayoutOptions = {
  chargeStrength: -300,    // Node repulsion (-100 = strong)
  linkStrength: 0.7,       // Edge attraction (0-1)
  linkDistance: 100,       // Desired edge length
  centerStrength: 0.1,     // Pull toward center (0-1)
  collisionRadius: 50,     // Node collision radius
  iterations: 300,         // Simulation iterations
  width: 1000,            // Layout area width
  height: 1000,           // Layout area height
};

const config: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 800,
  options,
};
```

**Examples**:

```typescript
// Small graph (< 50 nodes) - spread out layout
const smallGraphOptions: ForceLayoutOptions = {
  chargeStrength: -400,
  linkDistance: 150,
  collisionRadius: 60,
};

// Large graph (> 200 nodes) - compact layout
const largeGraphOptions: ForceLayoutOptions = {
  chargeStrength: -200,
  linkDistance: 80,
  iterations: 200,
};

// Auto-recommended options
const autoOptions = getRecommendedForceOptions(nodes.length);
```

---

### 3. Clustered Force Layout

**Description**: Force layout with nodes grouped by a property (e.g., methodology, level, category).

**Best For**:
- Multi-category data
- Highlighting group relationships
- Community detection visualization

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.FORCE_CLUSTERED,
  animated: true,
  animationDuration: 800,
  clusterKey: 'level', // Group by node.data.level
  options: {
    chargeStrength: -300,
    linkDistance: 100,
  },
};

// Alternative: cluster by methodology
const methodologyCluster: LayoutConfig = {
  type: LayoutType.FORCE_CLUSTERED,
  clusterKey: 'methodology',
  animated: true,
  animationDuration: 500,
};
```

---

### 4. Hierarchical Layout

**Description**: Top-down tree structure using Dagre algorithm. Arranges nodes in layers.

**Best For**:
- Directed acyclic graphs (DAGs)
- Process flows
- Organizational charts
- Dependency trees

**Options**:
```typescript
import { HierarchicalLayoutOptions } from '@/utils/layouts';

const options: HierarchicalLayoutOptions = {
  direction: 'TB',         // 'TB', 'BT', 'LR', 'RL'
  nodeSpacing: 80,         // Horizontal spacing
  rankSpacing: 100,        // Vertical spacing
  edgeSpacing: 10,         // Edge separation
  nodeWidth: 200,          // Node width for layout
  nodeHeight: 80,          // Node height for layout
  align: 'UL',            // 'UL', 'UR', 'DL', 'DR'
  ranker: 'network-simplex', // Algorithm
};
```

**Examples**:

```typescript
// Top-to-bottom hierarchy
const config: LayoutConfig = {
  type: LayoutType.HIERARCHICAL_TB,
  animated: true,
  animationDuration: 600,
};

// Left-to-right hierarchy
const lrConfig: LayoutConfig = {
  type: LayoutType.HIERARCHICAL_LR,
  animated: true,
  animationDuration: 600,
};

// Auto-detect optimal direction
import { detectOptimalDirection } from '@/utils/layouts';
const direction = detectOptimalDirection(nodes, edges);

const adaptiveConfig: LayoutConfig = {
  type: LayoutType.HIERARCHICAL,
  options: { direction },
  animated: true,
  animationDuration: 600,
};
```

---

### 5. Tree Layout

**Description**: Hierarchical layout optimized for tree structures with a single root.

**Best For**:
- File systems
- Family trees
- Decision trees
- Single-root hierarchies

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.TREE,
  rootNodeId: 'root-node-id', // Optional - auto-detects if omitted
  animated: true,
  animationDuration: 600,
  options: {
    direction: 'TB',
    ranker: 'tight-tree', // Optimized for trees
  },
};
```

---

### 6. Timeline Layout

**Description**: Chronological arrangement based on timestamps or sequential data.

**Best For**:
- Event sequences
- Historical data
- Process timelines
- Temporal analysis

**Options**:
```typescript
import { TimelineLayoutOptions } from '@/utils/layouts';

const options: TimelineLayoutOptions = {
  orientation: 'horizontal', // 'horizontal' or 'vertical'
  timeKey: 'createdAt',     // Property for timestamps
  spacing: 150,             // Distance between positions
  trackSpacing: 100,        // Distance between tracks
  startPosition: 100,       // Starting offset
  maxTracks: 5,            // Max parallel tracks
  groupWindow: 0,          // Group nodes within time window (ms)
  reverse: false,          // Reverse chronological order
};
```

**Examples**:

```typescript
// Simple timeline
const config: LayoutConfig = {
  type: LayoutType.TIMELINE,
  animated: true,
  animationDuration: 700,
  timeKey: 'createdAt',
};

// Vertical timeline with grouping
const verticalConfig: LayoutConfig = {
  type: LayoutType.TIMELINE,
  animated: true,
  animationDuration: 700,
  options: {
    orientation: 'vertical',
    timeKey: 'timestamp',
    groupWindow: 86400000, // Group within 1 day
    spacing: 120,
  },
};

// Auto-optimized timeline
import { getRecommendedTimelineOptions } from '@/utils/layouts';
const autoOptions = getRecommendedTimelineOptions(nodes, 'createdAt');
```

---

### 7. Swimlane Layout

**Description**: Timeline layout with separate lanes for categories.

**Best For**:
- Multi-actor timelines
- Process flows across departments
- Categorized event sequences

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.SWIMLANE,
  laneKey: 'methodology',  // Property for lane grouping
  timeKey: 'createdAt',    // Property for timeline ordering
  animated: true,
  animationDuration: 700,
  options: {
    orientation: 'horizontal',
    spacing: 150,
    trackSpacing: 120,
  },
};

// Use case: Legal discovery process
const legalSwimlane: LayoutConfig = {
  type: LayoutType.SWIMLANE,
  laneKey: 'phase', // 'identification', 'preservation', 'review', 'production'
  timeKey: 'createdAt',
  animated: true,
  animationDuration: 700,
};
```

---

### 8. Circular Layout

**Description**: Arranges nodes in a circle or concentric circles.

**Best For**:
- Network topology
- Equal-weight relationships
- Highlighting connectivity patterns

**Options**:
```typescript
import { CircularLayoutOptions } from '@/utils/layouts';

const options: CircularLayoutOptions = {
  centerX: 500,            // Center X coordinate
  centerY: 500,            // Center Y coordinate
  radius: 300,             // Circle radius
  startAngle: -Math.PI/2,  // Start angle (top)
  direction: 'clockwise',  // 'clockwise' or 'counterclockwise'
  sort: 'degree',         // 'none', 'degree', 'weight', 'label'
  concentric: false,       // Use concentric circles
  groupKey: 'level',       // Property for concentric grouping
  concentricSpacing: 200,  // Spacing between circles
};
```

**Examples**:

```typescript
// Simple circle sorted by connectivity
const config: LayoutConfig = {
  type: LayoutType.CIRCULAR,
  animated: true,
  animationDuration: 600,
  options: {
    sort: 'degree', // Most connected nodes first
  },
};

// Concentric circles by level
const concentricConfig: LayoutConfig = {
  type: LayoutType.CIRCULAR,
  animated: true,
  animationDuration: 600,
  options: {
    concentric: true,
    groupKey: 'level', // Level 0 inner, Level 1 outer
    sort: 'weight',
  },
};
```

---

### 9. Radial Layout

**Description**: Circular tree layout with root at center and children in concentric circles.

**Best For**:
- Hub-and-spoke networks
- Radial dependency trees
- Central node visualization

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.RADIAL,
  rootNodeId: 'central-node-id', // Optional - uses first node if omitted
  animated: true,
  animationDuration: 700,
  options: {
    radius: 250,
    concentricSpacing: 150,
    sort: 'degree',
  },
};
```

---

### 10. Spiral Layout

**Description**: Outward spiral pattern from center.

**Best For**:
- Continuous growth visualization
- Dense circular graphs
- Aesthetic layouts

**Example**:
```typescript
const config: LayoutConfig = {
  type: LayoutType.SPIRAL,
  animated: true,
  animationDuration: 800,
  options: {
    centerX: 500,
    centerY: 500,
    sort: 'weight', // Sort by veracity
  },
};
```

---

## Advanced Usage

### Auto-Recommendation

The layout engine can recommend the best layout based on graph structure:

```typescript
import { LayoutEngine } from '@/utils/layouts';

const recommendedType = LayoutEngine.recommendLayout(nodes, edges);
const autoOptions = LayoutEngine.getAutoOptions(recommendedType, nodes, edges);

const config: LayoutConfig = {
  type: recommendedType,
  animated: true,
  animationDuration: 600,
  options: autoOptions,
};

LayoutEngine.applyLayout(nodes, edges, config);
```

### Custom Animation

```typescript
import { interpolateNodePositions } from '@/utils/layouts';

// Manual animation control
const startNodes = [...nodes];
const layoutResult = LayoutEngine.applyLayout(nodes, edges, config);
const targetNodes = layoutResult.nodes;

// Animate over 1 second
const duration = 1000;
const startTime = Date.now();

const animate = () => {
  const elapsed = Date.now() - startTime;
  const progress = Math.min(elapsed / duration, 1);

  // Custom easing (bounce)
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const interpolated = interpolateNodePositions(startNodes, targetNodes, eased);
  setNodes(interpolated);

  if (progress < 1) {
    requestAnimationFrame(animate);
  }
};

animate();
```

### Preserving Locked Nodes

All layouts automatically preserve Level 0 (locked) node positions:

```typescript
// Locked nodes (Level 0) will maintain their positions
const nodes = [
  { id: '1', data: { isLocked: true, level: 0 }, position: { x: 100, y: 100 } },
  { id: '2', data: { isLocked: false, level: 1 }, position: { x: 200, y: 200 } },
];

// After layout, node '1' stays at (100, 100), node '2' moves
const result = LayoutEngine.applyLayout(nodes, edges, config);
```

---

## Performance Tips

### Large Graphs (> 500 nodes)

```typescript
// Use simpler layouts
const config: LayoutConfig = {
  type: LayoutType.CIRCULAR,
  animated: false, // Disable animation for large graphs
  options: {
    sort: 'none', // Skip sorting for speed
  },
};

// Or reduce iterations for force layout
const forceConfig: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: false,
  options: {
    iterations: 100, // Reduced from default 300
    chargeStrength: -200,
  },
};
```

### Progressive Layout

For very large graphs, consider applying layout in batches:

```typescript
// Layout visible nodes first
const visibleNodes = nodes.slice(0, 100);
const visibleEdges = edges.filter(e =>
  visibleNodes.find(n => n.id === e.source || n.id === e.target)
);

const config: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 500,
};

const result = LayoutEngine.applyLayout(visibleNodes, visibleEdges, config);
```

---

## Custom Configurations

### Scientific Method Workflow

```typescript
// Hierarchical layout for methodology steps
const scientificConfig: LayoutConfig = {
  type: LayoutType.LAYERED,
  layerKey: 'methodologyStep', // 'hypothesis', 'experiment', 'analysis', 'conclusion'
  animated: true,
  animationDuration: 600,
  options: {
    direction: 'TB',
    rankSpacing: 150,
  },
};
```

### Legal Discovery Timeline

```typescript
// Swimlane timeline for legal phases
const legalConfig: LayoutConfig = {
  type: LayoutType.SWIMLANE,
  laneKey: 'phase',        // 'identification', 'preservation', 'review', 'production'
  timeKey: 'discoveryDate',
  animated: true,
  animationDuration: 700,
  options: {
    orientation: 'horizontal',
    spacing: 200,
    trackSpacing: 150,
  },
};
```

### Veracity Visualization

```typescript
// Circular layout sorted by veracity weight
const veracityConfig: LayoutConfig = {
  type: LayoutType.CIRCULAR,
  animated: true,
  animationDuration: 600,
  options: {
    concentric: true,
    groupKey: 'level',  // Level 0 (verified) inner, Level 1 outer
    sort: 'weight',     // Highest veracity first
    direction: 'clockwise',
  },
};
```

---

## Integration Examples

### React Component with Layout Selector

```typescript
import { useState } from 'react';
import { LayoutType, LayoutConfig } from '@/utils/layouts';
import GraphCanvas from '@/components/GraphCanvas';

function MyGraphView() {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>(LayoutType.FORCE);

  const handleLayoutChange = (type: LayoutType) => {
    setSelectedLayout(type);
    // Layout is automatically applied by GraphCanvas
  };

  return (
    <div>
      <select value={selectedLayout} onChange={(e) => handleLayoutChange(e.target.value as LayoutType)}>
        <option value={LayoutType.FORCE}>Force-Directed</option>
        <option value={LayoutType.HIERARCHICAL}>Hierarchical</option>
        <option value={LayoutType.TIMELINE}>Timeline</option>
        <option value={LayoutType.CIRCULAR}>Circular</option>
      </select>

      <GraphCanvas graphId="my-graph" />
    </div>
  );
}
```

### Custom Layout Button

```typescript
import { LayoutEngine, LayoutType } from '@/utils/layouts';

function CustomLayoutButton({ nodes, edges, onApply }) {
  const applyCustomLayout = () => {
    const config: LayoutConfig = {
      type: LayoutType.FORCE_CLUSTERED,
      clusterKey: 'category',
      animated: true,
      animationDuration: 800,
      options: {
        chargeStrength: -400,
        linkDistance: 150,
      },
    };

    const result = LayoutEngine.applyLayout(nodes, edges, config);
    onApply(result.nodes);
  };

  return (
    <button onClick={applyCustomLayout}>
      Apply Custom Layout
    </button>
  );
}
```

---

## Troubleshooting

### Layout Not Applying

**Issue**: Layout doesn't change after calling `applyLayout`

**Solution**: Ensure nodes are mutable and state is updated
```typescript
const result = LayoutEngine.applyLayout(nodes, edges, config);
setNodes([...result.nodes]); // Force new array reference
```

### Animation Stuttering

**Issue**: Animation is choppy

**Solution**: Reduce complexity or disable animation
```typescript
const config: LayoutConfig = {
  type: LayoutType.FORCE,
  animated: true,
  animationDuration: 300, // Shorter duration
  options: {
    iterations: 150, // Fewer iterations
  },
};
```

### Nodes Overlapping

**Issue**: Nodes overlap after layout

**Solution**: Increase spacing or collision radius
```typescript
const config: LayoutConfig = {
  type: LayoutType.FORCE,
  options: {
    collisionRadius: 80,  // Increase from default 50
    linkDistance: 150,    // Increase spacing
  },
};
```

---

## API Reference

See individual layout files for detailed API documentation:
- `/utils/layouts/ForceLayout.ts`
- `/utils/layouts/HierarchicalLayout.ts`
- `/utils/layouts/TimelineLayout.ts`
- `/utils/layouts/CircularLayout.ts`
- `/utils/layouts/LayoutEngine.ts`
