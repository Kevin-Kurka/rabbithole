# MethodologySelector Architecture

## Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    MethodologySelector                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Header                               │  │
│  │  • Title: "Select Methodology"                           │  │
│  │  • Description text                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Methodology Grid                         │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                     │  │
│  │  │ Card 1 │  │ Card 2 │  │ Card 3 │  ← Row 1            │  │
│  │  │ Icon   │  │ Icon   │  │ Icon   │                     │  │
│  │  │ Name   │  │ Name   │  │ Name   │                     │  │
│  │  │ Desc   │  │ Desc   │  │ Desc   │                     │  │
│  │  │[Learn ]│  │[Learn ]│  │[Learn ]│                     │  │
│  │  └────────┘  └────────┘  └────────┘                     │  │
│  │                                                           │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                     │  │
│  │  │ Card 4 │  │ Card 5 │  │ Custom │  ← Row 2            │  │
│  │  │ ...    │  │ ...    │  │ ┄┄┄┄┄┄ │  (dashed)           │  │
│  │  └────────┘  └────────┘  └────────┘                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Action Buttons                          │  │
│  │  [ Cancel ]              [ Continue → ]                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Methodology Card Structure

```
┌─────────────────────────────────┐
│  ┌──────┐                    ●  │  ← Selection indicator
│  │ Icon │  Title                │
│  │      │  Category             │
│  └──────┘                        │
│                                  │
│  Description text that wraps     │
│  to multiple lines (3 max)...    │
│                                  │
│  [ℹ Learn More]                  │
└─────────────────────────────────┘
```

## Details Modal Structure

```
                Backdrop (overlay)
┌─────────────────────────────────────────────┐
│                                             │
│   ┌──────────────────────────────────┐     │
│   │ ┌────────────────────────────┐ × │  ← Sticky Header
│   │ │ Icon  Title                │   │
│   │ │       Category             │   │
│   │ └────────────────────────────┘   │
│   ├──────────────────────────────────┤
│   │                                  │  ← Scrollable Content
│   │  Description                     │
│   │  Lorem ipsum dolor sit...        │
│   │                                  │
│   │  How It Works                    │
│   │  1. Step one                     │
│   │  2. Step two                     │
│   │  3. Step three                   │
│   │                                  │
│   │  Benefits                        │
│   │  • Benefit one                   │
│   │  • Benefit two                   │
│   │                                  │
│   │  Use Cases                       │
│   │  ┌─────────────────┐            │
│   │  │ Example 1       │            │
│   │  └─────────────────┘            │
│   │                                  │
│   │  [Select This Methodology →]    │
│   │                                  │
│   └──────────────────────────────────┘
│                                             │
└─────────────────────────────────────────────┘
```

## Component Flow Diagram

```
┌──────────────┐
│   Mount      │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Execute GraphQL  │
│ Query            │
└──────┬───────────┘
       │
       ├─────► [Loading State]
       │
       ├─────► [Error State]
       │
       ▼
┌──────────────────┐
│ Render Grid      │
│ with Cards       │
└──────┬───────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼                        ▼
┌──────────────┐        ┌──────────────┐
│ Click Card   │        │ Click Learn  │
│              │        │ More         │
└──────┬───────┘        └──────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ Set Selected │        │ Open Details │
│ State        │        │ Modal        │
└──────┬───────┘        └──────┬───────┘
       │                       │
       │                       ├────► [ESC Key]
       │                       │
       │                       ├────► [Backdrop Click]
       │                       │
       │                       ▼
       │                ┌──────────────┐
       │                │ Close Modal  │
       │                └──────────────┘
       │
       ▼
┌──────────────┐
│ Click        │
│ Continue     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ onSelect()   │
│ Callback     │
└──────────────┘
```

## State Management

```
┌─────────────────────────────────────────────┐
│          MethodologySelector                │
├─────────────────────────────────────────────┤
│                                             │
│  Internal State:                            │
│  • detailsModalOpen: boolean                │
│  • selectedForDetails: Methodology | null   │
│  • hoveredCard: string | null               │
│                                             │
│  External State (Props):                    │
│  • selectedMethodology: string | null       │
│                                             │
│  Query State:                               │
│  • loading: boolean                         │
│  • error: Error | null                      │
│  • data: { methodologies: [] }              │
│                                             │
└─────────────────────────────────────────────┘
```

## Data Flow

```
Backend GraphQL
      │
      │ HTTP Request
      ▼
┌─────────────────┐
│  Apollo Client  │
└────────┬────────┘
         │
         │ useQuery Hook
         ▼
┌─────────────────────────────┐
│  MethodologySelector        │
│  Component                  │
│                             │
│  data.methodologies         │
│    ↓                        │
│  [ Methodology Cards ]      │
│    ↓                        │
│  User Interaction           │
│    ↓                        │
│  onSelect(methodologyId)    │
└─────────┬───────────────────┘
          │
          │ Callback
          ▼
┌─────────────────────────────┐
│  Parent Component           │
│  (e.g., CommandMenu)        │
│                             │
│  • Update selected state    │
│  • Navigate to next step    │
│  • Create graph with        │
│    methodology              │
└─────────────────────────────┘
```

## GraphQL Integration

```
┌──────────────────────────────────────────┐
│  METHODOLOGIES_QUERY                     │
│  /src/graphql/queries/methodologies.ts   │
└────────────────┬─────────────────────────┘
                 │
                 │ Import
                 ▼
┌──────────────────────────────────────────┐
│  MethodologySelector Component           │
│                                          │
│  const { data, loading, error } =        │
│    useQuery(METHODOLOGIES_QUERY)         │
└────────────────┬─────────────────────────┘
                 │
                 │ Response
                 ▼
┌──────────────────────────────────────────┐
│  {                                       │
│    methodologies: [                      │
│      {                                   │
│        id: "zettelkasten",              │
│        name: "Zettelkasten",            │
│        description: "...",              │
│        category: "Note-taking",         │
│        steps: [...],                    │
│        benefits: [...],                 │
│        examples: [...]                  │
│      }                                   │
│    ]                                     │
│  }                                       │
└──────────────────────────────────────────┘
```

## Theme Integration

```
┌────────────────────────────────────────┐
│  /src/styles/theme.ts                  │
│                                        │
│  export const theme = {                │
│    colors: {                           │
│      bg: { primary, elevated, hover }  │
│      text: { primary, muted, ... }     │
│      border: { primary, secondary }    │
│    }                                   │
│  }                                     │
└──────────────┬─────────────────────────┘
               │
               │ Import
               ▼
┌────────────────────────────────────────┐
│  MethodologySelector                   │
│                                        │
│  style={{                              │
│    backgroundColor:                    │
│      theme.colors.bg.primary,          │
│    color:                              │
│      theme.colors.text.primary,        │
│    borderColor:                        │
│      theme.colors.border.primary       │
│  }}                                    │
└────────────────────────────────────────┘
```

## Responsive Breakpoints

```
Mobile (< 640px)          Tablet (640-1024px)       Desktop (> 1024px)
┌────────────────┐        ┌────────────────┐        ┌────────────────┐
│   [Card 1]     │        │  [C1]  [C2]    │        │ [C1] [C2] [C3] │
│                │        │                │        │                │
│   [Card 2]     │        │  [C3]  [C4]    │        │ [C4] [C5] [C6] │
│                │        │                │        │                │
│   [Card 3]     │        │  [C5]  [C6]    │        │ [C7] [C8] [C9] │
│                │        │                │        │                │
│   [Custom]     │        │  [Custom]      │        │     [Custom]   │
└────────────────┘        └────────────────┘        └────────────────┘
  1 Column                  2 Columns                 3 Columns
```

## Icon Selection Logic

```
Methodology Name/Category
        │
        ▼
┌───────────────────────────┐
│ getMethodologyIcon()      │
└───────┬───────────────────┘
        │
        ├── "zettelkasten" ──► BookOpen
        │
        ├── "mind map" ──────► Brain
        │
        ├── "workflow" ──────► Workflow
        │
        ├── "network" ───────► Network
        │
        ├── "hierarchical" ──► Layers
        │
        ├── "branch" ────────► GitBranch
        │
        └── default ─────────► Sparkles
```

## Event Handling

```
User Interaction
        │
        ├── Hover Card
        │   └── setHoveredCard(id)
        │       └── Update card background
        │
        ├── Click Card
        │   └── handleSelectMethodology(id)
        │       └── onSelect(id)
        │           └── Parent updates state
        │
        ├── Click "Learn More"
        │   └── handleLearnMore(methodology, event)
        │       └── event.stopPropagation()
        │       └── setSelectedForDetails(methodology)
        │       └── setDetailsModalOpen(true)
        │
        ├── Click "Custom"
        │   └── handleSelectCustom()
        │       └── onSelect(null)
        │           └── Parent opens builder
        │
        ├── Click "Continue"
        │   └── onSelect(selectedMethodology)
        │       └── Parent proceeds to next step
        │
        ├── Click "Cancel"
        │   └── onCancel()
        │       └── Parent closes selector
        │
        ├── Press ESC (in modal)
        │   └── closeDetailsModal()
        │
        └── Click Backdrop
            └── closeDetailsModal()
```

## Testing Architecture

```
┌─────────────────────────────────────────┐
│          Test Strategy                  │
├─────────────────────────────────────────┤
│                                         │
│  Unit Tests                             │
│  • Component rendering                  │
│  • State updates                        │
│  • Event handlers                       │
│  • Icon selection logic                 │
│                                         │
│  Integration Tests                      │
│  • Apollo MockedProvider                │
│  • Query execution                      │
│  • Loading/Error states                 │
│  • User interactions                    │
│                                         │
│  Visual Tests                           │
│  • Storybook stories                    │
│  • All component states                 │
│  • Responsive layouts                   │
│  • Theme consistency                    │
│                                         │
│  E2E Tests                              │
│  • Full selection flow                  │
│  • Graph creation                       │
│  • Custom methodology                   │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Optimizations

```
┌─────────────────────────────────────────┐
│                                         │
│  1. Query Caching                       │
│     └── Apollo Client in-memory cache   │
│                                         │
│  2. Lazy Modal Rendering                │
│     └── Only render when open           │
│                                         │
│  3. Memoized Icon Lookups               │
│     └── getMethodologyIcon cached       │
│                                         │
│  4. Hover State Debouncing              │
│     └── Prevent excessive re-renders    │
│                                         │
│  5. Optimistic UI Updates               │
│     └── Instant selection feedback      │
│                                         │
└─────────────────────────────────────────┘
```

## Component Lifecycle

```
Mount
  │
  ├─► useQuery() executes
  │   └─► Apollo fetches data
  │
  ├─► Render loading state
  │
  ├─► Data received
  │   └─► Re-render with cards
  │
  ├─► User interactions
  │   ├─► Hover → State update → Re-render
  │   ├─► Click → Callback → Parent update
  │   └─► Modal → State update → Re-render
  │
  └─► Unmount
      └─► Cleanup (Apollo unsubscribe)
```

## File Dependencies

```
MethodologySelector.tsx
  │
  ├── react (useState)
  ├── @apollo/client (useQuery)
  ├── lucide-react (Icons)
  │
  ├── @/styles/theme
  │   └── theme.ts
  │
  ├── @/graphql/queries/methodologies
  │   └── methodologies.ts
  │       └── METHODOLOGIES_QUERY
  │
  └── @/types/methodology
      └── methodology.ts
          └── Methodology interface
```

## Integration Pattern

```
CommandMenu (Parent)
        │
        ├── State: step, methodology
        │
        ├── Renders:
        │   └── <MethodologySelector
        │         onSelect={handleSelect}
        │         onCancel={handleCancel}
        │         selectedMethodology={methodology}
        │       />
        │
        └── Handles:
            ├── Step navigation
            ├── Methodology storage
            └── Graph creation
```
