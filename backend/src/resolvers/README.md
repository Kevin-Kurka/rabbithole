# Methodology System GraphQL Resolvers

## Overview

The Methodology System provides a flexible framework for defining and using investigation methodologies with custom node and edge types. This implementation includes TypeGraphQL entities, resolvers, and seed data for 8 core methodologies.

## Architecture

### Entities

**Location**: `/backend/src/entities/`

- **Methodology.ts**: Core methodology entity with category, status, version control
- **MethodologyNodeType.ts**: Custom node types with schema validation
- **MethodologyEdgeType.ts**: Custom edge types with connection rules
- **MethodologyWorkflow.ts**: Step-by-step workflow definitions
- **UserMethodology.ts**: Progress tracking and permissions

### Resolvers

**Location**: `/backend/src/resolvers/`

- **MethodologyResolver.ts**: Main resolver with queries, mutations, and subscriptions
- **MethodologyNodeTypeResolver.ts**: Field resolvers for node types
- **MethodologyEdgeTypeResolver.ts**: Field resolvers for edge types
- **MethodologyWorkflowResolver.ts**: Field resolvers for workflows
- **UserMethodologyResolver.ts**: Progress tracking and permissions

### Input Types

**Location**: `/backend/src/resolvers/MethodologyInput.ts`

Comprehensive input types for all CRUD operations on methodologies and related entities.

## Core Methodologies

The system includes 8 pre-built methodologies:

### 1. 5 Whys Root Cause Analysis
- **Category**: Analytical
- **Use Case**: Simple to moderately complex problem-solving
- **Node Types**: Problem, Why Question, Root Cause, Solution
- **Includes**: Guided workflow with 5 steps

### 2. Fishbone (Ishikawa) Diagram
- **Category**: Analytical
- **Use Case**: Structured cause-and-effect analysis
- **Node Types**: Effect, Category (6Ms), Cause, Sub-Cause
- **Features**: Hierarchical cause categorization

### 3. Mind Mapping
- **Category**: Creative
- **Use Case**: Brainstorming and knowledge organization
- **Node Types**: Central Idea, Main Branch, Sub-Branch, Leaf
- **Features**: Both hierarchical and associative connections

### 4. SWOT Analysis
- **Category**: Strategic
- **Use Case**: Strategic planning and decision-making
- **Node Types**: Objective, Strength, Weakness, Opportunity, Threat, Strategy
- **Features**: Links strategies to SWOT elements

### 5. Systems Thinking Causal Loop
- **Category**: Systems
- **Use Case**: Understanding feedback loops and systemic relationships
- **Node Types**: Variable, Loop Indicator
- **Edge Types**: Same Direction (+), Opposite Direction (-), Delayed
- **Features**: Reinforcing and balancing loop identification

### 6. Decision Tree
- **Category**: Strategic
- **Use Case**: Decision analysis with probabilities
- **Node Types**: Decision Point, Chance Node, Outcome
- **Features**: Expected value calculations

### 7. Concept Mapping
- **Category**: Investigative
- **Use Case**: Knowledge representation and learning
- **Node Types**: Concept, Sub-Concept
- **Edge Types**: Is-A, Has-A, Leads-To, Related-To
- **Features**: Multiple relationship types

### 8. Timeline Analysis
- **Category**: Investigative
- **Use Case**: Chronological event analysis
- **Node Types**: Event, Period, Milestone
- **Features**: Temporal and causal relationships

## API Usage

### Queries

```graphql
# Get all published system methodologies
query {
  systemMethodologies {
    id
    name
    description
    category
    nodeTypes {
      id
      name
      displayName
      color
    }
    edgeTypes {
      id
      name
      displayName
      validSourceTypes
      validTargetTypes
    }
  }
}

# Get a specific methodology with full details
query {
  methodology(id: "uuid") {
    id
    name
    description
    workflow {
      steps
      isLinear
      instructions
    }
    nodeTypes {
      name
      propertiesSchema
      requiredProperties
    }
  }
}

# Get user's methodologies
query {
  myMethodologies {
    id
    name
    status
    usageCount
    rating
  }
}

# Get trending methodologies
query {
  trendingMethodologies(limit: 10) {
    id
    name
    usageCount
    rating
  }
}
```

### Mutations

```graphql
# Create a custom methodology
mutation {
  createMethodology(input: {
    name: "My Custom Methodology"
    description: "Description here"
    category: ANALYTICAL
    icon: "search"
    color: "#3B82F6"
    tags: ["custom", "analysis"]
  }) {
    id
    name
    status
  }
}

# Add a node type to methodology
mutation {
  createMethodologyNodeType(input: {
    methodologyId: "uuid"
    name: "evidence"
    displayName: "Evidence"
    description: "A piece of evidence"
    icon: "file-text"
    color: "#10B981"
    propertiesSchema: "{\"type\": \"object\", \"properties\": {\"title\": {\"type\": \"string\"}}}"
    requiredProperties: ["title"]
  }) {
    id
    name
  }
}

# Publish methodology
mutation {
  publishMethodology(id: "uuid") {
    id
    status
    publishedAt
  }
}

# Fork an existing methodology
mutation {
  forkMethodology(id: "uuid", newName: "My Forked Methodology") {
    id
    name
    parentMethodology {
      id
      name
    }
  }
}

# Start a workflow
mutation {
  startMethodologyWorkflow(
    graphId: "uuid"
    methodologyId: "uuid"
  ) {
    id
    currentStep
    status
  }
}

# Complete a workflow step
mutation {
  completeWorkflowStep(
    graphId: "uuid"
    stepId: "step1"
  ) {
    id
    completedSteps
    completionPercentage
  }
}
```

### Subscriptions

```graphql
# Subscribe to methodology updates
subscription {
  methodologyUpdated(id: "uuid") {
    id
    name
    updatedAt
  }
}

# Subscribe to new published methodologies
subscription {
  newMethodologyPublished(category: ANALYTICAL) {
    id
    name
    category
  }
}

# Subscribe to workflow progress
subscription {
  workflowProgressUpdated(graphId: "uuid") {
    id
    currentStep
    completionPercentage
  }
}
```

## Database Seeding

### Seed Core Methodologies

Run the seed script to populate the database with 8 core methodologies:

```bash
# Local development
npm run seed

# Docker environment
npm run seed:docker
```

The seed script is idempotent - it will skip methodologies that already exist.

### Seed Script Location

- **Main seed file**: `/backend/src/seeds/methodologies.ts`
- **Runner script**: `/backend/src/scripts/seed.ts`

## Authentication & Authorization

All mutations require authentication. The `userId` should be provided in the GraphQL context.

### Authorization Rules

- **Create**: Any authenticated user can create methodologies
- **Update**: Only the creator can update their methodologies
- **Delete**: Only the creator can delete non-system methodologies
- **Publish**: Only the creator can publish their methodologies
- **Fork**: Any user can fork published methodologies
- **System Methodologies**: Cannot be modified or deleted

## Validation

### Node Type Validation

Node types include JSON Schema for property validation:

```typescript
{
  propertiesSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  requiredProperties: ['title']
}
```

### Edge Type Validation

Edge types define valid source and target node types:

```typescript
{
  validSourceTypes: ['problem', 'why'],
  validTargetTypes: ['why', 'root_cause']
}
```

Database triggers automatically validate node and edge types against their methodology.

## Workflow System

Workflows guide users through a methodology step-by-step:

### Workflow Step Types

- **INSTRUCTION**: Display instructions to user
- **NODE_CREATION**: Prompt user to create a specific node type
- **EDGE_CREATION**: Prompt user to create connections
- **VALIDATION**: Validate current graph state
- **BRANCH**: Conditional branching based on graph state
- **COMPLETION**: Mark workflow as complete

### Workflow Configuration

```typescript
{
  isLinear: true,        // Must follow steps in order
  allowSkip: false,      // Cannot skip steps
  requireCompletion: false  // Optional to complete all steps
}
```

## Error Handling

All resolvers include comprehensive error handling:

- **Authentication errors**: "Authentication required"
- **Authorization errors**: "Unauthorized: You do not own this methodology"
- **Not found errors**: "Methodology not found"
- **Validation errors**: Schema validation failures
- **Database errors**: Wrapped with context

## Performance Considerations

- **Indexes**: All foreign keys and commonly queried fields are indexed
- **Pagination**: List queries support limit/offset pagination
- **Field Resolvers**: Use DataLoader pattern for N+1 prevention (future enhancement)
- **Caching**: Methodology definitions cached in Redis (future enhancement)

## Testing

Test files should be added to `/backend/src/__tests__/` following the existing pattern:

```typescript
describe('MethodologyResolver', () => {
  it('should create a methodology', async () => {
    // Test implementation
  });

  it('should fork a methodology', async () => {
    // Test implementation
  });
});
```

## Future Enhancements

1. **DataLoader Integration**: Prevent N+1 queries for related entities
2. **Caching Layer**: Cache methodology definitions in Redis
3. **Versioning**: Full methodology versioning with diffs
4. **Marketplace**: Template marketplace with ratings and downloads
5. **AI Suggestions**: AI-powered node/edge suggestions
6. **Collaboration**: Real-time collaborative editing
7. **Analytics**: Usage analytics and pattern detection
8. **Export/Import**: Share methodologies as JSON files

## File Structure

```
backend/src/
├── entities/
│   ├── Methodology.ts
│   ├── MethodologyNodeType.ts
│   ├── MethodologyEdgeType.ts
│   ├── MethodologyWorkflow.ts
│   └── UserMethodology.ts
├── resolvers/
│   ├── MethodologyResolver.ts
│   ├── MethodologyNodeTypeResolver.ts
│   ├── MethodologyEdgeTypeResolver.ts
│   ├── MethodologyWorkflowResolver.ts
│   ├── UserMethodologyResolver.ts
│   ├── MethodologyInput.ts
│   └── README.md (this file)
├── seeds/
│   └── methodologies.ts
└── scripts/
    └── seed.ts
```

## Related Documentation

- **Database Schema**: `/frontend/docs/methodology-system/database-migration.sql`
- **GraphQL Schema**: `/frontend/docs/methodology-system/graphql-schema.graphql`
- **Main Index**: `/backend/src/index.ts` (resolver registration)
