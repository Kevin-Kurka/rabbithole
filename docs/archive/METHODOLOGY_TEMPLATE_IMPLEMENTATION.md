# Methodology Template Loading Implementation

## Overview

This implementation adds pre-configured node and edge templates to methodology workflows. When users select a methodology (Scientific Method, Legal Discovery, Toulmin Argumentation), the canvas automatically loads starter nodes/edges to guide their investigation.

## Architecture

### Backend Components

#### 1. Template Configuration (`backend/src/config/methodology-templates.json`)

JSON configuration defining templates for each methodology:

```json
{
  "templates": [
    {
      "methodologyId": "scientific-method",
      "name": "Scientific Method",
      "initialNodes": [...],
      "initialEdges": [...]
    }
  ]
}
```

Each template includes:
- **methodologyId**: Matches database methodology ID
- **name**: Human-readable name
- **initialNodes**: Array of pre-positioned nodes with:
  - `id`: Temporary template ID (mapped to DB ID)
  - `type`: Node type ("methodology")
  - `position`: { x, y } coordinates on canvas
  - `data`: Node properties (label, description, nodeType, weight, level, metadata)
- **initialEdges**: Array of connections with:
  - `id`: Template edge ID
  - `source/target`: References to node IDs
  - `data`: Edge properties (label, weight, level)

#### 2. Template Service (`backend/src/services/MethodologyTemplateService.ts`)

**Key Methods:**

- **loadTemplates()**: Reads JSON config and caches in memory
- **getTemplate(methodologyId)**: Retrieves specific template
- **applyTemplate(graphId, methodologyId)**:
  - Creates nodes in database
  - Maps template IDs to DB UUIDs
  - Creates edges with mapped IDs
  - Returns created node/edge IDs
- **graphHasNodes(graphId)**: Prevents duplicate template application

**Transaction Safety:**
Uses PostgreSQL transactions to ensure atomicity - either all nodes/edges are created or none.

#### 3. GraphQL Mutation (`backend/src/resolvers/MethodologyResolver.ts`)

**Mutation:**
```graphql
mutation ApplyMethodologyTemplate($graphId: ID!, $methodologyId: ID!) {
  applyMethodologyTemplate(graphId: $graphId, methodologyId: $methodologyId) {
    nodeIds
    edgeIds
    graphId
    methodologyId
  }
}
```

**Authorization:**
- Verifies user authentication
- Checks graph ownership
- Validates methodology exists
- Prevents template application to non-empty graphs

**Side Effects:**
- Increments methodology usage_count
- Publishes TEMPLATE_APPLIED event for real-time subscriptions

#### 4. Database Migration (`backend/migrations/012_methodology_templates.sql`)

Seeds database with three methodologies:

**Scientific Method:**
- Hypothesis → Experiment → Data Collection → Analysis → Conclusion
- 5 nodes, 4 directed edges
- Linear workflow

**Legal Discovery (EDRM):**
- Identification → Preservation → Collection → Review → Production
- 5 nodes, 4 directed edges
- Legal compliance workflow

**Toulmin Argumentation:**
- Claim, Grounds, Warrant, Backing, Qualifier, Rebuttal
- 6 nodes, 5 edges (mix of directed/supportive)
- Non-linear argument structure

### Frontend Components

#### 1. GraphQL Mutation (`frontend/src/graphql/queries/methodologies.ts`)

```typescript
export const APPLY_METHODOLOGY_TEMPLATE_MUTATION = gql`
  mutation ApplyMethodologyTemplate($graphId: ID!, $methodologyId: ID!) {
    applyMethodologyTemplate(graphId: $graphId, methodologyId: $methodologyId) {
      nodeIds
      edgeIds
      graphId
      methodologyId
    }
  }
`;
```

#### 2. Enhanced MethodologySelector (`frontend/src/components/MethodologySelector.tsx`)

**New Props:**
- `graphId?: string | null` - If provided, applies template on selection
- `onTemplateApplied?: (result) => void` - Callback with created node/edge IDs

**Flow:**
1. User selects methodology
2. Clicks "Create Graph" button
3. If `graphId` provided:
   - Shows "Applying Template..." loading state
   - Calls `applyMethodologyTemplate` mutation
   - Invokes `onTemplateApplied` callback with result
   - Calls `onSelect` with methodology ID
4. GraphCanvas receives subscription update and renders new nodes

**Error Handling:**
- Displays console error but continues graph creation
- Prevents user from getting stuck on template failure

## Database Schema

### Methodologies Table
```sql
CREATE TABLE public."Methodologies" (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'analytical', 'creative', 'strategic', 'investigative'
  status TEXT,    -- 'draft', 'private', 'shared', 'published'
  is_system BOOLEAN,
  usage_count INTEGER,
  ...
);
```

### MethodologyNodeTypes Table
```sql
CREATE TABLE public."MethodologyNodeTypes" (
  id UUID PRIMARY KEY,
  methodology_id UUID REFERENCES public."Methodologies",
  name TEXT NOT NULL,
  display_name TEXT,
  icon TEXT,
  color TEXT,
  properties_schema JSONB,
  display_order INTEGER,
  ...
);
```

### MethodologyEdgeTypes Table
```sql
CREATE TABLE public."MethodologyEdgeTypes" (
  id UUID PRIMARY KEY,
  methodology_id UUID REFERENCES public."Methodologies",
  name TEXT NOT NULL,
  is_directed BOOLEAN,
  line_style TEXT,
  arrow_style TEXT,
  ...
);
```

### MethodologyWorkflows Table
```sql
CREATE TABLE public."MethodologyWorkflows" (
  id UUID PRIMARY KEY,
  methodology_id UUID UNIQUE REFERENCES public."Methodologies",
  steps JSONB,
  is_linear BOOLEAN,
  allow_skip BOOLEAN,
  instructions TEXT,
  ...
);
```

## Template Structure Details

### Scientific Method Template

**Nodes:**
1. **Hypothesis** (100, 100) - Yellow - "What do you think will happen?"
2. **Experiment** (350, 100) - Blue - "Design your test"
3. **Data Collection** (600, 100) - Cyan - "Record observations"
4. **Analysis** (350, 300) - Purple - "Identify patterns"
5. **Conclusion** (350, 500) - Green - "Evaluate hypothesis"

**Edges:**
- Hypothesis → Experiment ("informs")
- Experiment → Data Collection ("generates")
- Data Collection → Analysis ("feeds into")
- Analysis → Conclusion ("leads to")

**Position Strategy:** Top-down flow with return path implied

### Legal Discovery Template

**Nodes:**
1. **Identification** (100, 150) - Orange - "Locate data sources"
2. **Preservation** (350, 150) - Blue - "Legal hold"
3. **Collection** (600, 150) - Cyan - "Gather materials"
4. **Review** (350, 350) - Purple - "Assess relevance"
5. **Production** (350, 550) - Green - "Deliver to opposing party"

**Edges:**
- Identification → Preservation ("requires")
- Preservation → Collection ("enables")
- Collection → Review ("provides")
- Review → Production ("determines")

**Position Strategy:** Waterfall model matching EDRM framework

### Toulmin Argumentation Template

**Nodes:**
1. **Claim** (350, 100) - Red - Central thesis
2. **Grounds** (100, 250) - Blue - Evidence
3. **Warrant** (350, 250) - Purple - Logical connection
4. **Backing** (600, 250) - Cyan - Additional support
5. **Qualifier** (200, 400) - Orange - Limitations
6. **Rebuttal** (500, 400) - Orange - Counter-arguments

**Edges:**
- Grounds → Claim ("supports")
- Warrant → Claim ("justifies")
- Backing → Warrant ("strengthens")
- Qualifier → Claim ("qualifies")
- Rebuttal → Claim ("challenges")

**Position Strategy:** Hub-and-spoke with claim at center

## Usage Examples

### Basic Usage (No Auto-Apply)

```tsx
<MethodologySelector
  onSelect={(methodologyId) => {
    // Store methodology ID for graph creation
    setSelectedMethodology(methodologyId);
  }}
  onCancel={() => setShowSelector(false)}
/>
```

### With Auto-Apply Template

```tsx
const [graphId, setGraphId] = useState<string | null>(null);

// After creating graph
const handleGraphCreated = async (newGraphId: string) => {
  setGraphId(newGraphId);
};

<MethodologySelector
  graphId={graphId}
  onSelect={(methodologyId) => {
    // Template already applied by this point
    navigateToGraph(graphId);
  }}
  onTemplateApplied={(result) => {
    console.log(`Created ${result.nodeIds.length} nodes`);
    // Refresh graph canvas
    refetchGraph();
  }}
  onCancel={() => setShowSelector(false)}
/>
```

### Integration with GraphCanvas

```tsx
const GraphPage = () => {
  const [graphId] = useState(params.id);
  const { data, refetch } = useQuery(GRAPH_QUERY, { variables: { id: graphId }});

  return (
    <>
      {showMethodologySelector && (
        <MethodologySelector
          graphId={graphId}
          onTemplateApplied={() => {
            // Canvas will update via subscriptions
            // But can manually refetch if needed
            refetch();
          }}
          onSelect={() => setShowMethodologySelector(false)}
          onCancel={() => setShowMethodologySelector(false)}
        />
      )}
      <GraphCanvas graphId={graphId} />
    </>
  );
};
```

## Real-Time Updates

Template application triggers GraphQL subscriptions:

1. **NODE_CREATED_SUBSCRIPTION**: Fires for each node created
2. **EDGE_CREATED_SUBSCRIPTION**: Fires for each edge created
3. **TEMPLATE_APPLIED event** (optional): Custom event for bulk updates

GraphCanvas automatically updates via existing subscription handlers.

## API Reference

### Backend

**MethodologyTemplateService**

```typescript
class MethodologyTemplateService {
  loadTemplates(): Promise<void>
  getTemplate(methodologyId: string): Promise<MethodologyTemplate | null>
  applyTemplate(graphId: string, methodologyId: string): Promise<{
    nodes: string[];
    edges: string[];
  }>
  graphHasNodes(graphId: string): Promise<boolean>
  getTemplateMetadata(methodologyId: string): Promise<{
    methodologyId: string;
    name: string;
    nodeCount: number;
    edgeCount: number;
  } | null>
}
```

**GraphQL Mutation**

```graphql
type ApplyTemplateResult {
  nodeIds: [String!]!
  edgeIds: [String!]!
  graphId: String!
  methodologyId: String!
}

type Mutation {
  applyMethodologyTemplate(
    graphId: ID!
    methodologyId: ID!
  ): ApplyTemplateResult!
}
```

### Frontend

**MethodologySelector Props**

```typescript
interface MethodologySelectorProps {
  onSelect: (methodologyId: string | null) => void;
  onCancel: () => void;
  selectedMethodology?: string | null;
  graphId?: string | null;
  onTemplateApplied?: (result: {
    nodeIds: string[];
    edgeIds: string[];
  }) => void;
}
```

## Error Handling

### Backend Errors

**Template Not Found:**
```
Error: Template not found for methodology: <id>
```

**Graph Not Found:**
```
Error: Graph not found: <id>
```

**Unauthorized:**
```
Error: Unauthorized: You do not own this graph
```

**Graph Has Nodes:**
```
Error: Cannot apply template to graph that already has nodes.
        Create a new graph or clear existing nodes first.
```

**Database Transaction Failure:**
```
Transaction rolled back, no nodes/edges created
```

### Frontend Errors

Handled gracefully:
- Console.error logged
- Template application fails silently
- User can still use graph without template
- onSelect callback still invoked

## Testing

### Backend Tests

```typescript
describe('MethodologyTemplateService', () => {
  test('loads templates from JSON', async () => {
    const service = new MethodologyTemplateService(pool);
    await service.loadTemplates();
    const template = await service.getTemplate('scientific-method');
    expect(template).toBeDefined();
    expect(template.initialNodes).toHaveLength(5);
  });

  test('applies template to empty graph', async () => {
    const result = await service.applyTemplate(graphId, 'scientific-method');
    expect(result.nodes).toHaveLength(5);
    expect(result.edges).toHaveLength(4);
  });

  test('prevents duplicate application', async () => {
    await service.applyTemplate(graphId, 'scientific-method');
    await expect(
      service.applyTemplate(graphId, 'scientific-method')
    ).rejects.toThrow('already has nodes');
  });
});
```

### Frontend Tests

```typescript
test('applies template on graph creation', async () => {
  const onTemplateApplied = jest.fn();

  render(
    <MethodologySelector
      graphId="test-graph-id"
      onSelect={jest.fn()}
      onCancel={jest.fn()}
      onTemplateApplied={onTemplateApplied}
    />
  );

  fireEvent.click(screen.getByText('Scientific Method'));
  fireEvent.click(screen.getByText('Create Graph'));

  await waitFor(() => {
    expect(onTemplateApplied).toHaveBeenCalledWith({
      nodeIds: expect.arrayContaining([expect.any(String)]),
      edgeIds: expect.arrayContaining([expect.any(String)])
    });
  });
});
```

## Performance Considerations

**Template Loading:**
- Lazy-loaded on first service instantiation
- Cached in memory (Map<string, Template>)
- ~10KB JSON file, negligible load time

**Database Performance:**
- Single transaction for all nodes/edges
- Batch insert possible for optimization
- 5-10 nodes per template = ~100ms

**Network:**
- Single GraphQL mutation
- Returns minimal data (IDs only)
- Subscriptions handle UI updates

## Future Enhancements

1. **Template Customization**
   - Allow users to modify templates before applying
   - Save custom templates for reuse

2. **Template Preview**
   - Show minimap preview before applying
   - Zoom/pan to preview layout

3. **Incremental Templates**
   - Apply additional nodes to existing graph
   - "Add Scientific Method Phase" to current work

4. **AI-Generated Templates**
   - Analyze user's topic and generate custom template
   - Suggest optimal methodology based on content

5. **Template Marketplace**
   - Share custom templates with community
   - Rate and review templates
   - Fork/clone popular templates

6. **Position Algorithms**
   - Auto-layout using force-directed graphs
   - Hierarchical layouts for tree structures
   - Circular layouts for cyclical workflows

7. **Template Validation**
   - Check template integrity before applying
   - Validate node type compatibility
   - Ensure edge source/target exist

8. **Undo Template Application**
   - Allow users to remove template nodes
   - Preserve manual modifications
   - Reset to blank canvas

## File Locations

**Backend:**
- `/Users/kmk/rabbithole/backend/src/config/methodology-templates.json`
- `/Users/kmk/rabbithole/backend/src/services/MethodologyTemplateService.ts`
- `/Users/kmk/rabbithole/backend/src/resolvers/MethodologyResolver.ts` (lines 24, 31, 39-52, 966-1034)
- `/Users/kmk/rabbithole/backend/migrations/012_methodology_templates.sql`

**Frontend:**
- `/Users/kmk/rabbithole/frontend/src/graphql/queries/methodologies.ts` (lines 163-172)
- `/Users/kmk/rabbithole/frontend/src/components/MethodologySelector.tsx` (lines 18-30, 47-114, 336-366)
- `/Users/kmk/rabbithole/frontend/src/components/GraphCanvas.tsx` (existing subscription handlers)

## Installation

### 1. Run Database Migration

```bash
cd /Users/kmk/rabbithole
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/012_methodology_templates.sql
```

### 2. Restart Backend

```bash
cd backend
npm start
```

Backend automatically loads templates on first use.

### 3. Test in GraphQL Playground

```graphql
# 1. Create a test graph
mutation {
  createGraph(input: { name: "Test Template", level: 1 }) {
    id
  }
}

# 2. Apply template
mutation {
  applyMethodologyTemplate(
    graphId: "YOUR_GRAPH_ID"
    methodologyId: "scientific-method"
  ) {
    nodeIds
    edgeIds
    graphId
    methodologyId
  }
}

# 3. Verify nodes created
query {
  graph(id: "YOUR_GRAPH_ID") {
    nodes {
      id
      props
      weight
      level
    }
    edges {
      id
      from { id }
      to { id }
      props
    }
  }
}
```

### 4. Test in Frontend

```bash
cd frontend
npm run dev
```

Navigate to graph creation flow and select a methodology.

## Troubleshooting

**Template Not Loading:**
- Check JSON syntax in `methodology-templates.json`
- Verify file path in `MethodologyTemplateService.ts`
- Check backend console for loading errors

**Mutation Fails:**
- Verify methodology ID exists in database
- Check user authentication
- Ensure graph ID is valid
- Check graph doesn't already have nodes

**Nodes Not Appearing:**
- Check GraphQL subscriptions are active
- Verify frontend subscription handlers
- Manual refetch may be needed
- Check browser console for errors

**Position Incorrect:**
- Verify ReactFlow viewport settings
- Check node position.x/position.y in template
- Ensure GraphCanvas loads positions from props

## Support

For questions or issues:
1. Check backend logs: `docker logs rabbithole-api-1`
2. Check frontend console for errors
3. Test mutation in GraphQL playground
4. Verify database seeding: `SELECT * FROM public."Methodologies" WHERE is_system = true`
