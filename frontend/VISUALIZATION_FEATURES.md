# Advanced Visualization Features

This document describes the advanced visualization features implemented for the Rabbit Hole graph canvas (Wave 5, Phase 5.2).

## Overview

The enhanced graph visualization system provides multiple viewing modes, layout algorithms, filtering capabilities, and export options to help users explore and analyze knowledge graphs effectively.

## Components

### 1. EnhancedGraphCanvas

**Location**: `/src/components/EnhancedGraphCanvas.tsx`

Main wrapper component that integrates all visualization features.

**Features**:
- Multiple view modes (Canvas, Timeline, Cluster)
- Layout algorithm selection
- Filter panel integration
- Visualization controls
- State persistence (localStorage)

**Usage**:
```tsx
import { ReactFlowProvider } from '@xyflow/react';
import EnhancedGraphCanvas from '@/components/EnhancedGraphCanvas';

<ReactFlowProvider>
  <EnhancedGraphCanvas
    graphId="my-graph"
    initialNodes={nodes}
    initialEdges={edges}
    enableFilters={true}
    enableVisualizationControls={true}
    defaultViewMode="canvas"
    defaultLayout="force"
  />
</ReactFlowProvider>
```

### 2. TimelineView

**Location**: `/src/components/TimelineView.tsx`

Horizontal timeline layout showing nodes chronologically.

**Features**:
- Chronological node arrangement
- Date grouping (day/week/month)
- Visual timeline with nodes on alternating sides
- Connection highlighting on hover
- Color-coded by veracity score

**Props**:
```typescript
interface TimelineViewProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onNodeClick?: (node: GraphCanvasNode) => void;
  className?: string;
}
```

### 3. ClusterView

**Location**: `/src/components/ClusterView.tsx`

Groups nodes by methodology, veracity range, or level.

**Features**:
- Three grouping modes:
  - Methodology (scientific, journalistic, crowdsourced, expert)
  - Veracity (high/medium/low)
  - Level (Level 0/Level 1)
- Expand/collapse clusters
- Cluster statistics (count, avg veracity, verified count)
- Color-coded clusters
- Connection highlighting

**Props**:
```typescript
interface ClusterViewProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onNodeClick?: (node: GraphCanvasNode) => void;
  className?: string;
}
```

### 4. FilterPanel

**Location**: `/src/components/FilterPanel.tsx`

Comprehensive filtering system for graph nodes and edges.

**Filters Available**:
- **Veracity Score Range**: Dual sliders (0.0 - 1.0)
- **Methodology**: Checkboxes for each methodology
- **Node Type**: Checkboxes for node types
- **Graph Level**: Level 0 (Verified) / Level 1 (Editable)
- **Date Range**: Start/end date pickers

**Features**:
- Real-time filter preview
- "Apply Filters" button
- "Clear Filters" button
- Active filter indicator
- Auto-filters connected edges

**Props**:
```typescript
interface FilterPanelProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  onFilterChange: (
    filteredNodes: GraphCanvasNode[],
    filteredEdges: GraphCanvasEdge[]
  ) => void;
  className?: string;
}
```

### 5. VisualizationControls

**Location**: `/src/components/VisualizationControls.tsx`

Control panel for visualization settings and actions.

**Features**:
- **View Mode Toggle**: Canvas / Timeline / Cluster
- **Layout Selector**: Force-Directed / Hierarchical / Circular / Timeline
- **Zoom Controls**: Zoom In / Zoom Out / Fit View
- **Display Options**: Minimap toggle
- **Export**: PNG / SVG / JSON
- **Statistics**: Node count, edge count, average veracity

**Props**:
```typescript
interface VisualizationControlsProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  graphId: string;
  currentViewMode: ViewMode;
  currentLayout: LayoutAlgorithm;
  showMinimap: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onLayoutChange: (algorithm: LayoutAlgorithm) => void;
  onMinimapToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  className?: string;
}
```

## Utilities

### 1. Layout Algorithms

**Location**: `/src/utils/layoutAlgorithms.ts`

Provides four layout algorithms for node positioning.

**Algorithms**:

1. **Force-Directed Layout** (d3-force)
   - Physics-based simulation
   - Nodes repel each other
   - Edges act as springs
   - Collision detection
   - Configurable iterations, strength, spacing

2. **Hierarchical Layout**
   - Tree-like structure
   - Root nodes at top (no incoming edges)
   - BFS-based level assignment
   - Configurable spacing

3. **Circular Layout**
   - Nodes arranged in a circle
   - Even angular distribution
   - Radius scales with node count

4. **Timeline Layout**
   - Horizontal arrangement by creation date
   - Multiple lanes to avoid overlap
   - Sorted chronologically

**Usage**:
```typescript
import { applyLayout } from '@/utils/layoutAlgorithms';

const { nodes: layoutedNodes } = applyLayout(nodes, edges, {
  algorithm: 'force',
  iterations: 300,
  strength: -400,
  spacing: 150,
});
```

### 2. Export Graph

**Location**: `/src/utils/exportGraph.ts`

Export graph visualizations in multiple formats.

**Formats**:

1. **PNG Export**
   - Uses html2canvas
   - Captures entire canvas
   - Configurable quality (0-1) and scale (1-3)
   - Triggers browser download

2. **SVG Export**
   - Vector graphics format
   - Nodes and edges as SVG elements
   - Preserves veracity colors
   - Scalable without quality loss

3. **JSON Export**
   - Complete graph data structure
   - Includes metadata (title, date, version)
   - Node and edge properties
   - Statistics (counts, averages)

**Usage**:
```typescript
import { exportGraph } from '@/utils/exportGraph';

await exportGraph('png', graphId, nodes, edges, {
  filename: 'my-graph',
  metadata: {
    title: 'My Knowledge Graph',
    methodology: 'scientific',
  },
  quality: 0.95,
  scale: 2,
});
```

## Layout Options

### Force-Directed Layout

Best for:
- General-purpose graphs
- Discovering natural clusters
- Emphasizing connections

Configuration:
```typescript
{
  algorithm: 'force',
  iterations: 300,    // More iterations = more stable
  strength: -400,     // Negative = repulsion
  spacing: 150,       // Edge length
}
```

### Hierarchical Layout

Best for:
- Dependency graphs
- Causal chains
- Parent-child relationships

Configuration:
```typescript
{
  algorithm: 'hierarchical',
  spacing: 150,       // Horizontal spacing
}
```

### Circular Layout

Best for:
- Showing all nodes equally
- Small to medium graphs
- Ring topologies

### Timeline Layout

Best for:
- Temporal analysis
- Historical progression
- Event sequences

## Filter Combinations

Filters work together using AND logic:

```
Visible Nodes = Nodes WHERE
  veracity >= minVeracity AND
  veracity <= maxVeracity AND
  (methodologies.length == 0 OR methodology IN methodologies) AND
  (nodeTypes.length == 0 OR type IN nodeTypes) AND
  level IN levels AND
  (dateRange.start == null OR createdAt >= dateRange.start) AND
  (dateRange.end == null OR createdAt <= dateRange.end)
```

Edges are filtered to only show connections between visible nodes.

## View Modes

### Canvas View
- Traditional node-link diagram
- Interactive dragging and zooming
- Layout algorithms applied
- Minimap available
- Full editing capabilities

### Timeline View
- Horizontal chronological layout
- Grouped by date (day/week/month)
- Read-only interaction
- Best for understanding temporal relationships

### Cluster View
- Nodes grouped by criteria
- Expandable clusters
- Grid layout within clusters
- Best for categorical analysis

## Export Workflow

1. Select export format from VisualizationControls
2. System prepares export based on current view
3. Metadata automatically added
4. Browser download triggered
5. File saved to default downloads folder

**Export Filenames**:
- Format: `{filename}-{timestamp}.{extension}`
- Example: `graph-demo-1234567890.png`

## State Persistence

The following preferences are saved to localStorage:
- Layout algorithm selection
- View mode selection
- Minimap visibility

Keys:
- `rabbithole-graph-layout`
- `rabbithole-graph-viewmode`

## Performance Considerations

### Layout Algorithms
- Force-directed: O(n²) per iteration
- Use fewer iterations (100-200) for large graphs (>100 nodes)
- Consider hierarchical or circular for very large graphs

### Filtering
- Filters are applied client-side
- Re-filtering is fast (O(n))
- Edge filtering is O(m) where m = edge count

### Export
- PNG export captures DOM (can be slow for large canvases)
- SVG export is faster and produces smaller files
- JSON export is instant

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (html2canvas may have limitations)

## Dependencies

- `d3-force`: ^3.0.0 - Force-directed layout
- `html2canvas`: ^1.4.1 - PNG export
- `@xyflow/react`: ^12.8.6 - Graph rendering
- `react`: 19.1.0

## Demo

A complete demo is available at:
- **Path**: `/src/app/demo/enhanced-graph/page.tsx`
- **URL**: `http://localhost:3000/demo/enhanced-graph`

The demo includes:
- Sample climate change knowledge graph
- 10 nodes with varying veracity scores
- Multiple methodologies
- Temporal metadata
- All visualization features enabled

## Future Enhancements

Potential improvements:
- 3D graph visualization
- Animated transitions between layouts
- Custom layout algorithms
- Advanced clustering (k-means, hierarchical)
- Real-time collaborative filtering
- Saved filter presets
- Export templates
- PDF export with report generation

## Troubleshooting

### Layout not applying
- Check that nodes have position properties
- Ensure algorithm name is correct
- Verify iterations > 0

### Export fails
- Check browser console for errors
- Ensure canvas element exists
- Try different export format
- Check file permissions

### Filters not working
- Verify filter state is updating
- Check that nodes have required metadata
- Ensure onFilterChange callback is provided

### Performance issues
- Reduce iteration count for layouts
- Use simpler layout (circular, hierarchical)
- Enable filtering to reduce visible nodes
- Disable minimap for large graphs

## API Reference

See individual component files for complete TypeScript interfaces and JSDoc documentation.
