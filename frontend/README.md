# Rabbithole Frontend

Next.js 14 application for collaborative knowledge graph visualization and evidence-based inquiry.

## 🔒 CRITICAL: Weight-Based Credibility System

**This frontend works with a weight-based credibility system:**

- **High Credibility (weight >= 0.90)**: Immutable nodes/edges displayed with green styling
- **User Workspace (weight < 0.90)**: Editable nodes/edges with color-coded confidence levels

### Credibility Color Scheme

```typescript
- weight >= 0.90: #10b981 (green-500) - High credibility (locked)
- weight >= 0.70: #84cc16 (lime-500) - High confidence
- weight >= 0.40: #eab308 (yellow-500) - Medium confidence
- weight >= 0.10: #f97316 (orange-500) - Low confidence
- weight < 0.10:  #ef4444 (red-500) - Provisional
```

### Data Transformation Pattern

The frontend **NEVER directly accesses backend `props` field**. Instead:

1. Backend GraphQL schema exposes getters: `weight`, `title`, `graphId`, etc.
2. Frontend GraphQL queries request these fields
3. `graphHelpers.ts` transforms to React Flow format with derived `level` and `isLocked`

See [/SCHEMA_COMPLIANCE_REPORT.md](../SCHEMA_COMPLIANCE_REPORT.md) for complete schema documentation.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on port 4000
- Docker (for full stack development)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```text
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Home page with search
│   │   ├── graph/             # Graph visualization pages
│   │   └── nodes/[id]/        # Node detail pages
│   ├── components/
│   │   ├── base/              # shadcn/ui primitives (kebab-case)
│   │   ├── graph/             # Graph visualization components
│   │   ├── veracity/          # Veracity analysis UI
│   │   ├── evidence/          # Evidence management
│   │   └── examples/          # Usage examples
│   ├── graphql/
│   │   ├── queries/           # GraphQL queries
│   │   └── subscriptions/     # GraphQL subscriptions
│   ├── hooks/                 # React hooks (kebab-case with use- prefix)
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   │   ├── graphHelpers.ts   # Data transformation layer
│   │   └── layouts/          # Graph layout algorithms
│   └── lib/                   # Shared libraries
├── public/                     # Static assets
└── package.json
```

## Key Features

### Graph Visualization (React Flow)

- **Interactive graph canvas** with zoom, pan, and node dragging
- **Weight-based visual styling** for credibility levels
- **Real-time updates** via GraphQL subscriptions
- **Multiple layout algorithms**: Force-directed, hierarchical, circular
- **Node locking** for high-credibility nodes (weight >= 0.90)

### Data Layer

**Critical transformation layer** in `utils/graphHelpers.ts`:

```typescript
// Convert backend GraphQL data to React Flow format
export function convertToFlowNode(node: GraphNode): GraphCanvasNode {
  const weight = node.weight || 0.5;
  const level = getLevelFromWeight(weight);  // Derived from weight

  return {
    id: node.id,
    position: { x: props.x || 0, y: props.y || 0 },
    data: {
      label: props.label || 'Node',
      weight,
      level,  // For backward compatibility
      isLocked: isHighCredibility(weight),  // weight >= 0.90
      ...props
    }
  };
}
```

### GraphQL Integration

- **Apollo Client** with split transport (HTTP + WebSocket)
- **Automatic reconnection** for subscriptions
- **Optimistic updates** for better UX
- **Type-safe queries** with generated types

**Environment detection** (SSR vs Browser):

```typescript
// Server-side uses Docker service name
const httpUri = typeof window === 'undefined'
  ? 'http://api:4000/graphql'
  : 'http://localhost:4000/graphql';
```

### Real-Time Subscriptions

```typescript
// Subscribe to node updates
const { data } = useSubscription(NODE_UPDATED_SUBSCRIPTION, {
  variables: { graphId }
});

// Update local state when subscription fires
useEffect(() => {
  if (data?.nodeUpdated) {
    updateNodeInGraph(data.nodeUpdated);
  }
}, [data]);
```

### Component Patterns

**File naming conventions**:

- **Components**: `kebab-case.tsx` (e.g., `graph-canvas.tsx`)
- **Component names**: `PascalCase` (e.g., `export function GraphCanvas()`)
- **Hooks**: `use-{name}.ts` (e.g., `use-graph-data.ts`)
- **UI primitives**: `kebab-case.tsx` in `base/` (e.g., `button.tsx`)

**Example component**:

```typescript
// graph-canvas.tsx
import { GraphCanvasNode, GraphCanvasEdge } from '@/types/graph';
import { convertToFlowNode, convertToFlowEdge } from '@/utils/graphHelpers';

export function GraphCanvas({ graphId }: { graphId: string }) {
  const { data } = useQuery(GET_GRAPH_QUERY, { variables: { id: graphId } });

  // Transform backend data
  const nodes = data?.graph?.nodes.map(convertToFlowNode) ?? [];
  const edges = data?.graph?.edges.map(convertToFlowEdge) ?? [];

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
    />
  );
}
```

## Available Scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Environment Variables

Create a `.env.local` file:

```bash
# GraphQL API (optional - auto-detects)
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:4000/graphql

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Styling

- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for base components
- **CSS variables** for theming
- **Dark mode** support via next-themes

## Common Development Tasks

### Adding a New Graph Component

1. Create component file: `src/components/graph/my-component.tsx`
2. Use `GraphCanvasNode` and `GraphCanvasEdge` types
3. Import helpers: `import { getVeracityColor } from '@/utils/graphHelpers'`
4. Never access `node.props` directly - use typed getters

### Adding a New GraphQL Query

1. Define query in `src/graphql/queries/my-query.ts`
2. Request backend getters (NOT props): `weight`, `title`, `graphId`
3. Use in component with `useQuery` hook
4. Transform data with `convertToFlowNode`/`convertToFlowEdge`

### Handling Weight-Based Logic

```typescript
import { isHighCredibility, getLevelFromWeight } from '@/types/graph';

// Check if node is locked
if (isHighCredibility(node.data.weight)) {
  // Prevent editing
}

// Get credibility color
const color = getVeracityColor(node.data.weight);

// Derive level for backward compatibility
const level = getLevelFromWeight(node.data.weight);
```

## Performance Considerations

- **Viewport-based rendering** for large graphs (1000+ nodes)
- **Memoized components** to prevent unnecessary re-renders
- **Debounced search** for autocomplete
- **Lazy loading** for heavy components
- **Static generation** for public pages

## Deployment

### Docker

```bash
docker-compose up -d frontend
```

### Vercel

```bash
vercel deploy
```

**Environment variables required**:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXTAUTH_SECRET`

## Testing

```bash
npm run test          # Run unit tests
npm run test:e2e      # Run Playwright E2E tests
npm run test:coverage # Generate coverage report
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Flow Documentation](https://reactflow.dev)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues and questions:

- Check [/SCHEMA_COMPLIANCE_REPORT.md](../SCHEMA_COMPLIANCE_REPORT.md) for schema reference
- Review [/CLAUDE.md](../CLAUDE.md) for development guidelines
- Create an issue in the repository
