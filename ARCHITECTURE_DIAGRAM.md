# GraphCanvas Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          /graph Page (page.tsx)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  State Management:                                                     │  │
│  │  - commandMenuOpen: boolean                                            │  │
│  │  - activeGraphs: string[]                                              │  │
│  │  - error: string | null                                                │  │
│  │  - currentGraphId: string | null (first active graph)                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────┐     ┌──────────────────────┐                       │
│  │   CommandMenu FAB   │────▶│   CommandMenu        │                       │
│  │   (BrainCircuit)    │     │   - Search graphs    │                       │
│  └─────────────────────┘     │   - Create graph     │                       │
│                               │   - Toggle active    │                       │
│                               └──────────┬───────────┘                       │
│                                          │                                   │
│                                          ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        GraphCanvas Component                           │  │
│  │  Props: graphId, onSave, onError, showMinimap, showControls           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────┐     ┌──────────────────────┐                       │
│  │   Error Toast       │     │   Veracity Legend    │                       │
│  │   (auto-dismiss)    │     │   (color scheme)     │                       │
│  └─────────────────────┘     └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GraphCanvas Internal Flow                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Query GRAPH_QUERY(graphId)                                        │  │
│  │     ↓                                                                  │  │
│  │  2. Transform backend data to React Flow format                       │  │
│  │     - Parse JSON props                                                 │  │
│  │     - Map node.id → FlowNode                                          │  │
│  │     - Map edge.from/to → FlowEdge source/target                       │  │
│  │     ↓                                                                  │  │
│  │  3. Initialize React Flow state                                       │  │
│  │     - nodes: GraphCanvasNode[]                                         │  │
│  │     - edges: GraphCanvasEdge[]                                         │  │
│  │     - history: HistoryItem[]                                           │  │
│  │     ↓                                                                  │  │
│  │  4. Render React Flow with custom components                          │  │
│  │     - nodeTypes: { custom: GraphNode }                                │  │
│  │     - edgeTypes: { custom: GraphEdge }                                │  │
│  │     ↓                                                                  │  │
│  │  5. Subscribe to real-time updates                                    │  │
│  │     - NODE_CREATED, NODE_UPDATED, NODE_DELETED                        │  │
│  │     - EDGE_CREATED, EDGE_UPDATED, EDGE_DELETED                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Component Hierarchy                                │
│                                                                               │
│  GraphCanvas (ReactFlowProvider wrapper)                                     │
│    │                                                                          │
│    ├─▶ ReactFlow                                                             │
│    │    │                                                                     │
│    │    ├─▶ GraphNode (custom node type)                                     │
│    │    │    ├─ Veracity color background                                    │
│    │    │    ├─ Lock icon (if Level 0)                                       │
│    │    │    ├─ Node label                                                   │
│    │    │    ├─ Veracity badge                                               │
│    │    │    └─ Connection handles                                           │
│    │    │                                                                     │
│    │    ├─▶ GraphEdge (custom edge type)                                     │
│    │    │    ├─ Veracity color stroke                                        │
│    │    │    ├─ Lock icon label (if Level 0)                                 │
│    │    │    ├─ Edge label with %                                            │
│    │    │    └─ Animated dash (if low confidence)                            │
│    │    │                                                                     │
│    │    ├─▶ Controls (zoom, fit, lock)                                       │
│    │    ├─▶ MiniMap (with veracity colors)                                   │
│    │    └─▶ Background (dots grid)                                           │
│    │                                                                          │
│    └─▶ ContextMenu                                                           │
│         ├─ Node menu: Edit, Duplicate, Copy, Delete                          │
│         ├─ Edge menu: Edit, Delete                                           │
│         └─ Canvas menu: Paste                                                │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GraphQL Data Flow                                    │
│                                                                               │
│  ┌─────────────────────┐          ┌──────────────────────┐                  │
│  │   HTTP Transport    │          │   WebSocket (WS)     │                  │
│  │  (queries/mutations)│          │   (subscriptions)    │                  │
│  └──────────┬──────────┘          └──────────┬───────────┘                  │
│             │                                 │                              │
│             └─────────────┬───────────────────┘                              │
│                           ▼                                                  │
│              ┌─────────────────────────────┐                                 │
│              │   Apollo Client (split)     │                                 │
│              │   - InMemoryCache           │                                 │
│              │   - Automatic batching      │                                 │
│              │   - Optimistic updates      │                                 │
│              └─────────────┬───────────────┘                                 │
│                            │                                                 │
│           ┌────────────────┼────────────────┐                                │
│           ▼                ▼                ▼                                │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐                             │
│    │ Queries  │    │Mutations │    │Subscript.│                             │
│    │          │    │          │    │          │                             │
│    │ GetGraph │    │CreateNode│    │NodeUpd'd │                             │
│    │          │    │UpdateNode│    │NodeCrea'd│                             │
│    │          │    │DeleteNode│    │NodeDel'd │                             │
│    │          │    │CreateEdge│    │EdgeUpd'd │                             │
│    │          │    │UpdateEdge│    │EdgeCrea'd│                             │
│    │          │    │DeleteEdge│    │EdgeDel'd │                             │
│    └──────────┘    └──────────┘    └──────────┘                             │
│           │                │                │                                │
│           └────────────────┼────────────────┘                                │
│                            ▼                                                 │
│              ┌─────────────────────────────┐                                 │
│              │   Backend GraphQL Server    │                                 │
│              │   (localhost:4000/graphql)  │                                 │
│              └─────────────┬───────────────┘                                 │
│                            ▼                                                 │
│              ┌─────────────────────────────┐                                 │
│              │     PostgreSQL Database     │                                 │
│              │   - graphs table            │                                 │
│              │   - nodes table             │                                 │
│              │   - edges table             │                                 │
│              └─────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        User Opens /graph Page                                │
└────────────────────────────┬────────────────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Authenticated?  │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
         ┌──────────────┐        ┌───────────────┐
         │     No       │        │      Yes      │
         │ Show Sign In │        │   Continue    │
         └──────────────┘        └───────┬───────┘
                                         ▼
                              ┌────────────────────┐
                              │ Active Graph Set?  │
                              └─────────┬──────────┘
                                        │
                           ┌────────────┴────────────┐
                           ▼                         ▼
                    ┌──────────────┐        ┌────────────────┐
                    │      No      │        │      Yes       │
                    │ Show Empty   │        │ Load Graph     │
                    │ State + Hint │        │ with Canvas    │
                    └──────────────┘        └────────┬───────┘
                                                     ▼
                                          ┌──────────────────┐
                                          │  User Actions:   │
                                          │  • Drag nodes    │
                                          │  • Connect edges │
                                          │  • Right-click   │
                                          │  • Delete        │
                                          │  • Undo/Redo     │
                                          └──────────────────┘
```

## Data Transformation Pipeline

```
Backend Node Format              →    React Flow Node Format
─────────────────────                 ─────────────────────
{                                     {
  id: "uuid-123",                       id: "uuid-123",
  weight: 0.85,                         type: "custom",
  level: 1,                             position: { x: 100, y: 200 },
  props: "{                             data: {
    \"label\":\"My Node\",                label: "My Node",
    \"x\":100,                            weight: 0.85,
    \"y\":200                             level: 1,
  }"                                      isLocked: false,
}                                         methodology: "scientific"
                                        }
                                      }

Backend Edge Format              →    React Flow Edge Format
─────────────────────                 ─────────────────────
{                                     {
  id: "uuid-456",                       id: "uuid-456",
  from: { id: "uuid-123" },             source: "uuid-123",
  to: { id: "uuid-789" },               target: "uuid-789",
  weight: 0.7,                          type: "custom",
  level: 1,                             data: {
  props: "{}"                             weight: 0.7,
}                                         level: 1,
                                          isLocked: false
                                        }
                                      }
```

## Real-Time Update Flow

```
User A                          Server                          User B
───────                         ──────                          ──────
  │                               │                               │
  │ 1. Drag node to new position  │                               │
  ├──────────────────────────────▶│                               │
  │                               │                               │
  │                          2. Save to DB                        │
  │                               │                               │
  │                          3. Broadcast via WS                  │
  │                               ├──────────────────────────────▶│
  │                               │                               │
  │ 4. Optimistic update          │          5. Receive update    │
  │    (instant feedback)         │             (real-time)       │
  │                               │                               │
  │◀──────────────────────────────┤                               │
  │ 6. Confirmation from server   │                               │
  │                               │                               │

Timeline: ~50ms for optimistic, ~200ms for server confirmation
```

## Veracity Color System

```
Weight Range    Color      Hex         Node Visual           Minimap
────────────    ─────      ───         ───────────           ───────
1.0 (Level 0)   Green      #10b981     ┏━━━━━━━━━┓          ●
                                       ┃  🔒 Node ┃          Green
                                       ┃ VERIFIED ┃
                                       ┗━━━━━━━━━┛

0.7 - 0.99      Lime       #84cc16     ┏━━━━━━━━━┓          ●
                                       ┃   Node   ┃          Lime
                                       ┃   85%    ┃
                                       ┗━━━━━━━━━┛

0.4 - 0.69      Yellow     #eab308     ┏━━━━━━━━━┓          ●
                                       ┃   Node   ┃          Yellow
                                       ┃   55%    ┃
                                       ┗━━━━━━━━━┛

0.1 - 0.39      Orange     #f97316     ┏━━━━━━━━━┓          ●
                                       ┃   Node   ┃          Orange
                                       ┃   25%    ┃
                                       ┗━━━━━━━━━┛

0.0 - 0.09      Red        #ef4444     ┏━━━━━━━━━┓          ●
                                       ┃   Node   ┃          Red
                                       ┃    5%    ┃
                                       ┗━━━━━━━━━┛
```

## Event Handling Matrix

```
Event Type          Level 0 Node    Level 1 Node    Edge        Canvas
──────────          ────────────    ────────────    ────        ──────
Left Click          Select          Select          Select      Deselect
Right Click         Context Menu    Context Menu    Context     Paste Menu
                    (read-only)     (full options)  Menu
Drag                ❌ Locked       ✓ Move + Save   N/A         Pan
Delete Key          ❌ Disabled     ✓ Delete        ✓ Delete    N/A
Connect Handle      ❌ Blocked      ✓ Create Edge   N/A         N/A
Cmd+C               ✓ Copy          ✓ Copy          ✓ Copy      N/A
Cmd+Z               ✓ Undo          ✓ Undo          ✓ Undo      N/A
Double Click        View Details    Edit            Edit        N/A
```

## Performance Optimization Layers

```
Layer 1: Component Memoization
─────────────────────────────
GraphNode → React.memo()
GraphEdge → React.memo()
ContextMenu → React.memo()

Layer 2: State Management
────────────────────────
useState() for local state
useCallback() for event handlers
useMemo() for computed values
History limited to 50 items

Layer 3: Network Optimization
────────────────────────────
Debounced position updates (drag end only)
Batched mutations
Subscription filtering by graphId
Apollo Cache normalization

Layer 4: Rendering Optimization
──────────────────────────────
React Flow viewport culling
Snap-to-grid reduces calculations
fitView() only on initial load
CSS transforms for smooth animations
```

---

## File Locations

```
/Users/kmk/rabbithole/frontend/src/
├── app/graph/page.tsx                    [UPDATED] Main page
├── components/
│   ├── GraphCanvas.tsx                   [EXISTING] Canvas component
│   ├── GraphNode.tsx                     [EXISTING] Node renderer
│   ├── GraphEdge.tsx                     [EXISTING] Edge renderer
│   ├── ContextMenu.tsx                   [EXISTING] Context menu
│   └── CommandMenu.tsx                   [EXISTING] Graph selector
├── graphql/queries/graphs.ts             [EXISTING] GraphQL operations
├── lib/apollo-client.ts                  [EXISTING] Apollo setup
├── types/graph.ts                        [EXISTING] TypeScript types
└── styles/
    ├── theme.ts                          [EXISTING] Theme config
    └── graph-canvas.css                  [EXISTING] Canvas styles
```

This architecture provides a clean separation between UI (page.tsx), visualization (GraphCanvas), and data (GraphQL), enabling maintainability and future enhancements.
