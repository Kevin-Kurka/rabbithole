# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Rabbit Hole** is a collaborative knowledge graph platform for evidence-based inquiry. Users create interactive graph visualizations to explore complex topics, connect evidence, and build theories using structured methodologies (Scientific Method, Legal Discovery, Toulmin Argumentation). The platform features a two-tiered system:

- **Level 0**: Immutable "truth layer" with verified facts (veracity score = 1.0)
- **Level 1**: User workspace for building and challenging theories (veracity scores 0.0-1.0)

## Architecture

### Technology Stack

**Backend:**
- Node.js + TypeScript
- Apollo Server (GraphQL API)
- TypeGraphQL (code-first schema)
- PostgreSQL with pgvector extension (graph + vector database)
- Redis (pub/sub for real-time collaboration)
- WebSockets (GraphQL subscriptions)

**Frontend:**
- Next.js 15 (App Router)
- React 19 + TypeScript
- Apollo Client (GraphQL + subscriptions)
- ReactFlow/XYFlow (graph visualization)
- NextAuth.js (authentication)
- Tailwind CSS

**Infrastructure:**
- Docker + Docker Compose
- PostgreSQL with pgvector for vector similarity search
- Redis for pub/sub messaging

### Database Schema

PostgreSQL database with graph-structured tables:

- `NodeTypes` / `EdgeTypes`: Define entity and relationship schemas
- `Nodes` / `Edges`: Store graph instances with JSONB props, vector embeddings, and veracity weights (0.0-1.0)
- `Graphs`: Container for user workspaces
- `Users`, `Comments`, `Challenges`: User management and collaboration

**Key Columns:**
- `weight`: REAL (0.0-1.0) - veracity score; Level 0 = 1.0
- `ai`: VECTOR(1536) - embeddings for semantic search (HNSW index)
- `props`/`meta`: JSONB - flexible schema for entity data
- `content_hash`: Perceptual hash for duplicate detection

## Development Commands

### Local Development

**Start all services:**
```bash
docker-compose up --build
```

**Access points:**
- Frontend: http://localhost:3001
- GraphQL API: http://localhost:4000/graphql
- PostgreSQL: localhost:5432

### Backend (Node.js/TypeScript)

**From `/backend` directory:**

```bash
# Development
npm start                # Start with ts-node

# Build
npm run build           # Compile TypeScript to /dist

# Database seeding
npm run populate-level0 # Seed Level 0 with foundational data
```

**Database initialization:**
```bash
# Execute SQL schema (from project root)
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql
```

### Frontend (Next.js)

**From `/frontend` directory:**

```bash
npm run dev    # Start dev server (port 3000, exposed as 3001 in Docker)
npm run build  # Production build
npm start      # Start production server
npm run lint   # Run ESLint
```

## Code Architecture

### GraphQL API Design

**Code-First Schema (TypeGraphQL):**
- Entity classes in `backend/src/entities/` define both database models and GraphQL types
- Decorators (`@ObjectType`, `@Field`, `@Resolver`) generate schema automatically
- Resolvers in `backend/src/resolvers/` implement queries, mutations, and subscriptions

**Key Patterns:**
- Field resolvers load related data (e.g., `Node.comments` field resolver)
- Context object `{ pool, pubSub }` injected into all resolvers
- Raw SQL queries via `pg.Pool` (no ORM) for direct PostgreSQL access
- `pubSub.publish()` triggers real-time subscriptions

**Example Mutation:**
```typescript
@Mutation(() => Node)
async createNode(
  @Arg("input") { graphId, props }: NodeInput,
  @Ctx() { pool, pubSub }: { pool: Pool, pubSub: PubSubEngine }
): Promise<Node> {
  const result = await pool.query(
    'INSERT INTO public."Nodes" (graph_id, props) VALUES ($1, $2) RETURNING *',
    [graphId, props]
  );
  const newNode = result.rows[0];
  await pubSub.publish(NODE_UPDATED, newNode);
  return newNode;
}
```

### Real-Time Collaboration

**Redis Pub/Sub:**
- `graphql-redis-subscriptions` enables multi-instance subscription broadcasting
- WebSocket server (`graphql-ws`) handles persistent connections
- Subscription topics: `NODE_UPDATED`, `EDGE_UPDATED`, `NEW_COMMENT`, `NEW_USER`

**Frontend subscription pattern:**
```typescript
useSubscription(NODE_UPDATED_SUBSCRIPTION, {
  onData: ({ data }) => {
    // Update local React Flow state
  }
});
```

### Graph Visualization (ReactFlow)

**Located in:** `frontend/src/app/graph/page.tsx`

**State Management:**
- ReactFlow manages node/edge positions and interactions
- Apollo Client caches GraphQL data
- Local state via `useState` for UI controls

**Data Flow:**
1. Fetch graph via GraphQL query → Apollo cache
2. Transform to ReactFlow format (`Node[]`, `Edge[]`)
3. User interactions → optimistic UI updates
4. Mutations → database → subscriptions → sync across clients

### Database Queries

**Graph Traversal:**
Use PostgreSQL Recursive CTEs for path finding:
```sql
WITH RECURSIVE paths AS (
  SELECT source_node_id, target_node_id, 1 AS depth
  FROM public."Edges"
  WHERE source_node_id = $1
  UNION ALL
  SELECT e.source_node_id, e.target_node_id, p.depth + 1
  FROM public."Edges" e
  INNER JOIN paths p ON e.source_node_id = p.target_node_id
  WHERE p.depth < $2
)
SELECT * FROM paths;
```

**Vector Similarity (AI features - future):**
```sql
SELECT * FROM public."Nodes"
ORDER BY ai <=> $1::vector
LIMIT 10;
```
Uses pgvector's cosine distance operator `<=>` with HNSW index.

## Important Implementation Notes

### TypeGraphQL Setup

**Reflection metadata required:**
- `import 'reflect-metadata';` must be first import in `index.ts`
- `tsconfig.json` needs: `"experimentalDecorators": true`, `"emitDecoratorMetadata": true`

### PostgreSQL Schema Rules

**All table names are quoted and PascalCase:** `public."Nodes"`, `public."Edges"`
- This matches TypeGraphQL entity naming
- Always use double quotes in raw SQL queries

**JSONB fields:**
- `props`: User-defined entity properties (flexible schema)
- `meta`: System metadata (timestamps, audit trail)
- Query with `->` (JSON) or `->>` (text) operators

### Docker Networking

**Service hostnames in containers:**
- Database: `postgres` (not `localhost`)
- Redis: `redis` (not `localhost`)
- API: `api` (for frontend in Docker)

**Environment variables:**
```bash
DATABASE_URL=postgres://postgres:postgres@postgres:5432/rabbithole_db
REDIS_URL=redis://redis:6379
```

### Authentication Flow

**NextAuth.js + JWT:**
1. User logs in → NextAuth creates session
2. Frontend includes credentials in GraphQL context
3. Backend `UserResolver.me` verifies session
4. Mutations check auth status from context

## Key Methodologies (Product Requirements)

### Structured Workflows

Users can select methodology templates that scaffold their investigation:

1. **Scientific Method**: Hypothesis → Experiment → Analysis → Conclusion
2. **Legal Discovery**: Identification → Preservation → Review → Production
3. **Toulmin Argumentation**: Claim → Grounds → Warrant → Backing

**Implementation:** Custom node components with methodology-specific fields (future feature).

### Veracity Scoring System

**Weight field (0.0 to 1.0):**
- Level 1 nodes start near 0.0 (provisional)
- Community votes + evidence quality → increase weight
- Curator approval at 0.95+ → promotion to Level 0 (weight = 1.0)

**Challenge System:**
- Formal rebuttals using Toulmin model
- Freezes target's weight during debate
- Community votes resolve challenges

### AI Assistant (Future)

**GraphRAG Architecture:**
1. Vector search finds semantically similar nodes
2. Recursive CTE expands to related subgraph
3. Structured context + user query → LLM
4. AI suggests connections, evidence, inconsistencies

**Vectorization Pipeline:**
- Message queue (RabbitMQ/Kafka) receives node creation events
- AI service generates embeddings (OpenAI API)
- Updates `ai` column in PostgreSQL

## Development Priorities

**Current Phase (MVP - Milestone 1):**
- ✅ Core graph CRUD operations
- ✅ Basic ReactFlow canvas
- ✅ Real-time collaboration (WebSockets)
- ✅ User authentication
- 🚧 Custom node components for methodologies
- 🚧 Veracity scoring UI

**Next Phases:**
- Milestone 2: Challenge system, curator dashboard, Level 0 population
- Milestone 3: AI assistant, content fingerprinting, gamification

## Testing Approach

**Backend:**
- Integration tests for GraphQL resolvers
- Database query tests with test fixtures
- WebSocket subscription tests

**Frontend:**
- Component tests (React Testing Library)
- E2E tests for graph interactions (Playwright - see `/e2e`)

## Critical Constraints

**Graph Performance:**
- Large graphs (1000+ nodes) may require pagination
- Consider viewport-based loading for ReactFlow
- HNSW index on vectors requires regular `VACUUM ANALYZE`

**Real-Time Scalability:**
- Redis pub/sub required for multi-instance deployments
- WebSocket connections scale horizontally via sticky sessions

**Data Integrity:**
- Level 0 is append-only (no deletes, only versioned updates)
- All promotions to Level 0 require full audit trail in `meta` field
