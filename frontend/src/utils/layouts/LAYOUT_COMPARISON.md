# Layout Algorithm Visual Comparison

This guide provides visual descriptions and use case comparisons for all layout algorithms.

## Layout Selection Decision Tree

```
Start
  |
  ├─ Has timestamps? ──Yes──> TIMELINE
  |                            └─ Multiple categories? ──Yes──> SWIMLANE
  |
  ├─ Is DAG (no cycles)? ──Yes──> HIERARCHICAL
  |                                └─ Single root? ──Yes──> TREE
  |                                └─ Explicit layers? ──Yes──> LAYERED
  |
  ├─ Dense graph (edges/nodes > 2)? ──Yes──> CIRCULAR
  |                                            └─ Central node? ──Yes──> RADIAL
  |
  └─ Default ──> FORCE
                  └─ Multiple clusters? ──Yes──> FORCE_CLUSTERED
```

## Layout Type Comparison

### Automatic Layouts

#### 1. Manual Layout
```
Before: A---B          After: A---B
        |   |                 |   |
        C---D                 C---D

Status: No change (preserves user positioning)
```

**When to Use**:
- User has manually fine-tuned positions
- Custom layouts that shouldn't be modified
- Testing other features without layout changes

**Performance**: Instant (no computation)

---

#### 2. Force-Directed Layout
```
Before: Clustered     After: Organic spread
  A B                      A     B
  C D E                  C   E   D

Characteristics:
- Nodes repel each other
- Connected nodes attract
- Natural clustering emerges
- Organic, network-like appearance
```

**When to Use**:
- General purpose network visualization
- Social networks and relationship graphs
- Dependency graphs
- When you want natural clustering to emerge

**Performance**: O(n²) - Slow for > 500 nodes

**Best Graph Sizes**: 10-500 nodes

**Example Use Cases**:
- Citation networks
- Protein interaction networks
- Social media connections
- Knowledge graph exploration

---

#### 3. Clustered Force Layout
```
Before: Mixed         After: Grouped clusters
  A1 B1                 Cluster A    Cluster B
  A2 B2                 [A1 A2]      [B1 B2]
  A3 B3                 [A3]         [B3]

Characteristics:
- Groups by property (level, category, methodology)
- Each cluster has its own center force
- Clear visual separation between groups
```

**When to Use**:
- Multi-category data visualization
- Community detection results
- Grouped methodologies
- Level-based separation (Level 0 vs Level 1)

**Performance**: O(n²) - Similar to force layout

**Configuration**:
```typescript
clusterKey: 'level' | 'methodology' | 'category'
```

---

### Hierarchical Layouts

#### 4. Hierarchical (Top-Bottom)
```
Before: Flat          After: Layered
  A B C D               A   B
  E F                   |   |
                       C D E F

Characteristics:
- Top-down tree structure
- Clear parent-child relationships
- Minimizes edge crossings
```

**When to Use**:
- Organizational charts
- Process flows (top to bottom)
- Dependency trees
- Scientific method steps

**Performance**: O(n + e) - Very fast

**Variations**:
- **TB** (Top-Bottom): Parent at top
- **BT** (Bottom-Top): Parent at bottom
- **LR** (Left-Right): Parent at left
- **RL** (Right-Left): Parent at right

---

#### 5. Hierarchical (Left-Right)
```
Before: Flat          After: Left-to-right flow
  A B                 A ──┬── C
  C D                     ├── D
                      B ──┼── E
                          └── F

Characteristics:
- Left-to-right reading order
- Good for wide, shallow trees
- Natural for Western reading patterns
```

**When to Use**:
- File system trees
- Decision flows
- Wide hierarchies
- Process pipelines

---

#### 6. Layered Layout
```
Before: Random        After: Explicit layers
  A B C             Layer 0: [A]
  D E               Layer 1: [B C]
                    Layer 2: [D E]

Characteristics:
- Manual layer assignment
- Perfect alignment within layers
- Controlled vertical spacing
```

**When to Use**:
- Methodology workflows (hypothesis→experiment→analysis)
- Legal discovery phases (identification→preservation→review)
- Toulmin argument structure (claim→grounds→warrant)
- Any workflow with explicit stages

**Configuration**:
```typescript
layerKey: 'methodologyStep' | 'phase' | 'stage'
```

---

#### 7. Tree Layout
```
Before: Cyclic        After: Tree from root
  A──B                    A
  |  |                   / \
  C──D                  B   C
                           / \
                          D   E

Characteristics:
- Single root node
- Optimized for tree structures
- Tight spacing for parent-child
```

**When to Use**:
- Family trees
- File systems
- Single-source graphs
- Toulmin arguments from main claim

**Configuration**:
```typescript
rootNodeId: 'node-id' // Optional - auto-detects
```

---

### Temporal Layouts

#### 8. Timeline Layout
```
Before: Spatial       After: Chronological
  E C B               Day 1: [A B]
  A D                 Day 2: [C]
                      Day 3: [D E]

Characteristics:
- Ordered by timestamp
- Multiple tracks for simultaneous events
- Automatic track assignment
```

**When to Use**:
- Event sequences
- Historical analysis
- Process timelines
- Evidence chronology in legal discovery

**Configuration**:
```typescript
timeKey: 'createdAt' | 'timestamp' | 'discoveryDate'
orientation: 'horizontal' | 'vertical'
groupWindow: 86400000 // 1 day in ms
```

**Variations**:
- **Horizontal**: Left to right timeline
- **Vertical**: Top to bottom timeline
- **Grouped**: Clusters events within time windows

---

#### 9. Swimlane Layout
```
Before: Mixed         After: Lanes + Timeline
  A1 B1 A2            Lane A: [A1]──[A2]────[A3]
  B2 A3               Lane B: [B1]────[B2]

Characteristics:
- Timeline with category lanes
- Each lane is chronological
- Clear separation by category
```

**When to Use**:
- Multi-actor timelines
- Legal discovery phases
- Cross-department processes
- Methodology comparisons

**Configuration**:
```typescript
laneKey: 'methodology' | 'department' | 'phase'
timeKey: 'createdAt'
```

**Example: Legal Discovery**
```
Lane Identification: [Doc1]──[Doc2]
Lane Preservation:   [Store1]────[Store2]
Lane Review:         [Review1]──────[Review2]
Lane Production:     ─────────[Produce1]
```

---

### Circular Layouts

#### 10. Circular Layout
```
Before: Clustered     After: Circle
  A B                    B
  C D E              A       C
                         D
                       E

Characteristics:
- Equal spacing on circle
- Optional sorting (degree, weight, label)
- Symmetric appearance
```

**When to Use**:
- Network topology
- Peer-to-peer relationships
- Communication patterns
- When all nodes have equal importance

**Configuration**:
```typescript
sort: 'degree' // Most connected first
sort: 'weight' // Highest veracity first
sort: 'label'  // Alphabetical
```

---

#### 11. Concentric Circular Layout
```
Before: Flat          After: Concentric
  L0 L1a              Inner: [L0 nodes]
  L1b L1c             Outer: [L1a L1b L1c]

Characteristics:
- Multiple concentric circles
- Grouped by property
- Level-based visualization
```

**When to Use**:
- Level 0 (verified) vs Level 1 visualization
- Hub-and-spoke patterns
- Hierarchical importance
- Centrality visualization

**Configuration**:
```typescript
concentric: true
groupKey: 'level' // Level 0 inner, Level 1 outer
```

---

#### 12. Radial Layout
```
Before: Tree          After: Radial tree
    A                     C D
   / \                  B     E
  B   C              A ─┴─────┴─ F
 / \                    G H
D   E

Characteristics:
- Root at center
- Children in concentric circles
- BFS-based placement
```

**When to Use**:
- Hub-and-spoke networks
- Central authority graphs
- Root-focused visualization
- Citation networks (from key paper)

**Configuration**:
```typescript
rootNodeId: 'central-node-id'
```

---

#### 13. Spiral Layout
```
Before: Random        After: Spiral
  A E                    E
  B D                  D   A
  C                      C B

Characteristics:
- Outward spiral from center
- Continuous growth pattern
- Dense circular packing
```

**When to Use**:
- Dense circular graphs
- Growth/evolution visualization
- Aesthetic presentations
- When circular layout feels too spread out

---

## Methodology-Specific Recommendations

### Scientific Method
```
Best Layout: LAYERED or HIERARCHICAL_TB

Layer/Rank Assignment:
  Layer 0: Hypothesis
  Layer 1: Experiment Design
  Layer 2: Data Collection
  Layer 3: Analysis
  Layer 4: Conclusion

Alternative: TIMELINE (if experiments have dates)
```

### Legal Discovery
```
Best Layout: SWIMLANE

Lane Assignment:
  Lane 1: Identification phase nodes
  Lane 2: Preservation phase nodes
  Lane 3: Review phase nodes
  Lane 4: Production phase nodes

Time Axis: discoveryDate

Alternative: LAYERED (if dates not available)
```

### Toulmin Argumentation
```
Best Layout: TREE or HIERARCHICAL_TB

Structure:
  Root: Main Claim
  Level 1: Grounds (evidence)
  Level 2: Warrants (reasoning)
  Level 3: Backing (support)
  Branches: Rebuttals, Qualifiers

Alternative: FORCE (to see relationships)
```

---

## Performance vs Quality Trade-offs

| Layout | Quality | Performance | Best For |
|--------|---------|-------------|----------|
| MANUAL | User-defined | Instant | Pre-arranged |
| FORCE | High (organic) | Slow O(n²) | < 500 nodes |
| FORCE_CLUSTERED | High (grouped) | Slow O(n²) | < 300 nodes |
| HIERARCHICAL | High (structured) | Fast O(n+e) | DAGs, any size |
| TREE | High (optimal) | Fast O(n+e) | Trees, any size |
| LAYERED | High (explicit) | Fast O(n+e) | Staged, any size |
| TIMELINE | Medium (linear) | Fast O(n log n) | Temporal, any size |
| SWIMLANE | High (organized) | Fast O(n log n) | Multi-lane, any size |
| CIRCULAR | Medium (symmetric) | Fast O(n log n) | Large graphs |
| RADIAL | High (focused) | Fast O(n+e) | Hub-centric, any size |
| SPIRAL | Medium (aesthetic) | Fast O(n log n) | Dense graphs |

---

## Animation Recommendations

| Graph Size | Recommendation |
|------------|----------------|
| < 50 nodes | Always animate (500-800ms) |
| 50-200 nodes | Animate (300-500ms) |
| 200-500 nodes | Optional (reduce to 200ms or disable) |
| > 500 nodes | Disable animation |

---

## Common Layout Switching Patterns

### Exploration Workflow
```
1. Start: FORCE (discover natural clusters)
2. If clusters found: FORCE_CLUSTERED (emphasize groups)
3. If DAG detected: HIERARCHICAL (show flow)
4. If timeline relevant: TIMELINE (chronological view)
5. Final: MANUAL (fine-tune specific positions)
```

### Analysis Workflow
```
1. HIERARCHICAL (understand structure)
2. TIMELINE (temporal analysis)
3. CIRCULAR (connectivity patterns)
4. FORCE (relationship discovery)
```

### Presentation Workflow
```
1. HIERARCHICAL (show structure)
2. RADIAL (emphasize central concept)
3. TIMELINE (tell the story)
```

---

## Edge Cases

### Disconnected Graphs
- **FORCE**: Creates separate clusters
- **HIERARCHICAL**: Places disconnected components in sequence
- **CIRCULAR**: Distributes evenly around circle
- **TIMELINE**: Places by timestamp (may overlap)

### Single Node
- All layouts: Node at center/origin
- No layout needed (instant)

### Large Dense Graphs (> 500 nodes)
- **Recommended**: CIRCULAR (fastest, scales well)
- **Avoid**: FORCE (too slow)
- **Consider**: Progressive layout (visible nodes first)

### Cyclic Graphs
- **Recommended**: FORCE, CIRCULAR
- **Avoid**: HIERARCHICAL, TREE (expect DAG)
- **Note**: Hierarchical will still work but may create back edges

---

## Layout Combination Strategies

### Multi-View Analysis
Apply different layouts to same graph for different insights:

1. **Structure View**: HIERARCHICAL
2. **Connectivity View**: FORCE
3. **Timeline View**: TIMELINE
4. **Overview**: CIRCULAR

### Progressive Refinement
```
FORCE → Adjust manually → MANUAL
HIERARCHICAL → Fine-tune spacing → MANUAL
CIRCULAR → Reorder nodes → MANUAL
```

---

## Troubleshooting Guide

### Nodes Overlapping
**Problem**: Nodes overlap after layout

**Solutions**:
- FORCE: Increase `collisionRadius` or `linkDistance`
- HIERARCHICAL: Increase `nodeSpacing` or `rankSpacing`
- CIRCULAR: Increase `radius`
- TIMELINE: Increase `spacing` or `trackSpacing`

### Layout Too Spread Out
**Problem**: Graph uses too much space

**Solutions**:
- FORCE: Increase `centerStrength`, decrease `chargeStrength`
- CIRCULAR: Decrease `radius`
- HIERARCHICAL: Decrease spacing parameters

### Layout Too Compact
**Problem**: Nodes too close together

**Solutions**:
- FORCE: Increase `chargeStrength` (more negative)
- HIERARCHICAL: Increase spacing
- CIRCULAR: Increase `radius` or use `SPIRAL`

### Performance Issues
**Problem**: Layout takes too long

**Solutions**:
- FORCE: Reduce `iterations` (from 300 to 100-150)
- Switch to faster layout: CIRCULAR, HIERARCHICAL
- Disable animation
- Layout visible nodes only

### Wrong Recommendation
**Problem**: Auto-recommended layout doesn't look good

**Solutions**:
- Try other layouts in same category
- Check graph structure (cycles, disconnected components)
- Consider manual selection
- Use custom options for selected layout

---

## Summary

Choose layout based on:
1. **Graph Structure**: DAG → Hierarchical, Cyclic → Force/Circular
2. **Data Type**: Temporal → Timeline/Swimlane, Hierarchical → Tree/Layered
3. **Size**: Large → Circular, Small → Force
4. **Purpose**: Analysis → Multiple views, Presentation → Hierarchical/Radial

The layout system provides the flexibility to switch between algorithms quickly, enabling iterative exploration and analysis of your knowledge graph.
