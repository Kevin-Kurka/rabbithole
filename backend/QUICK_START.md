# Methodology System - Quick Start Guide

## Prerequisites

1. PostgreSQL database running
2. Database migration applied
3. Node.js and npm installed

## Setup in 3 Steps

### Step 1: Apply Database Migration

```bash
# Navigate to the project root
cd /Users/kmk/rabbithole

# Apply the migration (adjust connection details as needed)
psql -U postgres -d rabbithole_db -f frontend/docs/methodology-system/database-migration.sql
```

### Step 2: Seed Core Methodologies

```bash
# Navigate to backend
cd backend

# Install dependencies if needed
npm install

# Run the seed script
npm run seed

# Or for Docker environment
npm run seed:docker
```

Expected output:
```
Seeding core methodologies...
Created methodology: 5 Whys Root Cause Analysis (uuid)
  Created 4 node types
  Created 3 edge types
  Created workflow with 5 steps
✓ Successfully seeded: 5 Whys Root Cause Analysis

... (7 more methodologies)

✓ All core methodologies seeded successfully!
```

### Step 3: Start the Server

```bash
# Start the GraphQL server
npm start

# Server will be available at:
# http://localhost:4000/graphql
```

## Test the Implementation

### 1. Open GraphQL Playground

Navigate to `http://localhost:4000/graphql`

### 2. Run Test Queries

#### Get All System Methodologies
```graphql
query GetSystemMethodologies {
  systemMethodologies {
    id
    name
    description
    category
    icon
    color
    tags
    nodeTypes {
      id
      name
      displayName
      icon
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
```

#### Get Specific Methodology with Workflow
```graphql
query Get5Whys {
  methodologyByName(name: "5 Whys Root Cause Analysis") {
    id
    name
    description
    workflow {
      steps
      isLinear
      allowSkip
      instructions
    }
    nodeTypes {
      name
      displayName
      propertiesSchema
      requiredProperties
    }
  }
}
```

#### Get Trending Methodologies
```graphql
query GetTrending {
  trendingMethodologies(limit: 5) {
    id
    name
    usageCount
    rating
    category
  }
}
```

## Create a Custom Methodology

```graphql
mutation CreateCustomMethodology {
  createMethodology(input: {
    name: "My Investigation Method"
    description: "Custom methodology for my specific use case"
    category: INVESTIGATIVE
    icon: "search"
    color: "#6366F1"
    tags: ["custom", "investigation"]
  }) {
    id
    name
    status
    createdAt
  }
}
```

## Add Node Types to Custom Methodology

```graphql
mutation AddEvidenceNodeType {
  createMethodologyNodeType(input: {
    methodologyId: "YOUR_METHODOLOGY_ID"
    name: "evidence"
    displayName: "Evidence"
    description: "A piece of evidence"
    icon: "file-text"
    color: "#10B981"
    propertiesSchema: "{\"type\": \"object\", \"properties\": {\"title\": {\"type\": \"string\"}, \"source\": {\"type\": \"string\"}}}"
    requiredProperties: ["title"]
    displayOrder: 0
  }) {
    id
    name
    displayName
  }
}
```

## Fork an Existing Methodology

```graphql
mutation ForkMethodology {
  forkMethodology(
    id: "METHODOLOGY_ID"
    newName: "My Custom 5 Whys"
  ) {
    id
    name
    status
    parentMethodology {
      id
      name
    }
    nodeTypes {
      name
    }
    edgeTypes {
      name
    }
  }
}
```

## Start Using a Methodology

### 1. Create a Graph with Methodology
```graphql
mutation CreateGraph {
  createGraph(input: {
    name: "RCA for Server Downtime"
    description: "Investigating recent server issues"
    level: 1
    privacy: "private"
  }) {
    id
    name
  }
}
```

### 2. Start Methodology Workflow
```graphql
mutation StartWorkflow {
  startMethodologyWorkflow(
    graphId: "YOUR_GRAPH_ID"
    methodologyId: "5_WHYS_METHODOLOGY_ID"
  ) {
    id
    currentStep
    status
    methodology {
      name
    }
  }
}
```

### 3. Track Progress
```graphql
mutation CompleteStep {
  completeWorkflowStep(
    graphId: "YOUR_GRAPH_ID"
    stepId: "step1"
  ) {
    id
    completedSteps
    completionPercentage
    status
  }
}
```

### 4. Subscribe to Progress Updates
```graphql
subscription WatchProgress {
  workflowProgressUpdated(graphId: "YOUR_GRAPH_ID") {
    id
    currentStep
    completionPercentage
    status
  }
}
```

## Common Issues & Solutions

### Issue: "Authentication required"
**Solution**: Add userId to GraphQL context. For testing, you can modify the context in `index.ts`:
```typescript
context: async () => ({ pool, pubSub, userId: 'test-user-id' })
```

### Issue: Seed script fails with "relation does not exist"
**Solution**: Run the database migration first:
```bash
psql -U postgres -d rabbithole_db -f frontend/docs/methodology-system/database-migration.sql
```

### Issue: "Methodology already exists"
**Solution**: This is normal - the seed script is idempotent and skips existing methodologies.

### Issue: Cannot connect to database
**Solution**: Check DATABASE_URL environment variable:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/rabbithole_db"
npm run seed
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/rabbithole_db
PORT=4000
```

## Verify Installation

Run this query to verify all methodologies were seeded:

```graphql
query VerifySeeds {
  systemMethodologies {
    name
    category
    nodeTypes {
      name
    }
    edgeTypes {
      name
    }
  }
}
```

Expected: 8 methodologies with the following names:
1. 5 Whys Root Cause Analysis
2. Fishbone (Ishikawa) Diagram
3. Mind Mapping
4. SWOT Analysis
5. Systems Thinking Causal Loop
6. Decision Tree
7. Concept Mapping
8. Timeline Analysis

## Next Steps

1. **Frontend Integration**: Connect your React components to these resolvers
2. **Authentication**: Implement proper user authentication
3. **UI Components**: Build methodology selector and workflow UI
4. **Testing**: Add integration tests for resolvers
5. **Documentation**: Add JSDoc comments to all resolvers

## Useful Commands

```bash
# Re-seed database (safe to run multiple times)
npm run seed

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Getting Help

- **Full Documentation**: `/backend/src/resolvers/README.md`
- **Implementation Summary**: `/backend/METHODOLOGY_SYSTEM.md`
- **Database Schema**: `/frontend/docs/methodology-system/database-migration.sql`
- **GraphQL Schema**: `/frontend/docs/methodology-system/graphql-schema.graphql`

## API Endpoints

- **GraphQL API**: `http://localhost:4000/graphql`
- **GraphQL WebSocket**: `ws://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/`

---

**Ready to use!** 🚀

Your Methodology System is now fully functional with 8 pre-built methodologies and complete CRUD operations.
