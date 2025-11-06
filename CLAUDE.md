# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Rabbit Hole** - A collaborative knowledge graph platform for evidence-based inquiry using structured methodologies (Scientific Method, Legal Discovery, Toulmin Argumentation). Features a two-tiered system:
- **Level 0**: Immutable "truth layer" with verified facts (veracity = 1.0)
- **Level 1**: User workspace for building theories (veracity 0.0-1.0)

## Development Commands

### Quick Start
```bash
# Start all services (Docker required)
docker-compose up --build

# Initialize database (run after containers start)
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# Seed Level 0 data (optional)
cd backend && npm run populate-level0
```

### Backend Commands
From `/backend` directory:
```bash
npm start                      # Start development server
npm run build                  # Compile TypeScript to /dist
npm test                       # Run test suite
npm run test:coverage          # Test with coverage report
npm run test:watch            # Watch mode for tests
npm run test:verbose          # Verbose test output
npm run seed:docker           # Seed database in Docker
npm run seed:achievements     # Seed achievement data
npm run worker:dev            # Start vectorization worker
npm run rabbitmq:health       # Check RabbitMQ health
```

### Frontend Commands
From `/frontend` directory:
```bash
npm run dev                   # Start dev server (port 3000)
npm run build                 # Production build
npm run lint                  # Run ESLint
```

### Database Management
```bash
# Connect to PostgreSQL
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Backup database
docker exec rabbithole-postgres-1 pg_dump -U postgres rabbithole_db > backup.sql

# Restore database
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backup.sql
```

## Architecture & Key Patterns

### TypeGraphQL Code-First Schema
- Entity classes in `backend/src/entities/` define both database models and GraphQL types
- Decorators generate schema automatically (no separate SDL files)
- **Critical**: `import 'reflect-metadata'` must be first import in index.ts
- `tsconfig.json` requires: `experimentalDecorators: true`, `emitDecoratorMetadata: true`

### PostgreSQL Schema Rules
- **All table names are quoted PascalCase**: `public."Nodes"`, `public."Edges"`
- Always use double quotes in raw SQL queries
- JSONB fields: `props` (user data), `meta` (system metadata)
- Query JSONB with `->` (JSON) or `->>` (text) operators

### Real-Time Collaboration (Redis Pub/Sub)
- WebSocket server handles persistent connections via `graphql-ws`
- Subscription topics: `NODE_UPDATED`, `EDGE_UPDATED`, `NEW_COMMENT`
- Redis enables horizontal scaling across multiple server instances

### Level 0 vs Level 1 Enforcement
- **Level 0**: Immutable graphs/nodes/edges - all create/update/delete operations throw errors
- **Level 1**: Fully editable - standard CRUD operations allowed
- Check `is_level_0` flag before any mutation
- Veracity score 1.0 = Level 0 (immutable truth)

### Database Context Pattern
All resolvers receive context with:
```typescript
{
  pool: Pool,          // PostgreSQL connection pool
  pubSub: PubSubEngine, // Redis pub/sub for subscriptions
  redis: Redis,        // Redis client
  userId?: string,     // Authenticated user ID
  notificationService: NotificationService
}
```

### Docker Service Names
Inside containers, use these hostnames:
- Database: `postgres` (not localhost)
- Redis: `redis` (not localhost)
- API: `api` (for frontend in Docker)

## Testing Strategy

### Backend Testing
- Test files: `src/__tests__/*.test.ts`
- Setup: `src/__tests__/setup.ts` runs before all tests
- Coverage threshold: 80% (branches, functions, lines, statements)
- Run with: `npm test`, `npm run test:coverage`

### Test Database Safety
- Tests validate DATABASE_URL doesn't contain "production"
- Use TEST_DATABASE_URL or mock database
- Global helper: `mockQueryResult()` for mocking PostgreSQL responses

## Critical Implementation Details

### Graph Traversal (Recursive CTEs)
```sql
WITH RECURSIVE paths AS (
  SELECT source_node_id, target_node_id, 1 AS depth
  FROM public."Edges" WHERE source_node_id = $1
  UNION ALL
  SELECT e.source_node_id, e.target_node_id, p.depth + 1
  FROM public."Edges" e
  INNER JOIN paths p ON e.source_node_id = p.target_node_id
  WHERE p.depth < $2
)
```

### Vector Similarity Search (pgvector)
```sql
SELECT * FROM public."Nodes"
ORDER BY ai <=> $1::vector  -- Cosine distance operator
LIMIT 10;
```
- HNSW index on `ai` column for performance
- 1536-dimensional vectors (OpenAI embeddings)

### Environment Variables
Backend requires:
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `RABBITMQ_URL`: Message queue
- `OPENAI_API_KEY`: For embeddings (optional)

Frontend requires:
- `NEXT_PUBLIC_API_URL`: GraphQL endpoint
- `NEXT_PUBLIC_WS_URL`: WebSocket endpoint
- `NEXTAUTH_SECRET`: Auth secret

## Common Development Tasks

### Adding a New GraphQL Resolver
1. Create entity class in `backend/src/entities/` with `@ObjectType()` decorator
2. Create resolver in `backend/src/resolvers/` with `@Resolver()` decorator
3. Add resolver to array in `backend/src/index.ts` buildSchema call
4. Use context for database access: `@Ctx() { pool }`

### Modifying Database Schema
1. Edit `init.sql` with schema changes
2. Restart containers to apply: `docker-compose down && docker-compose up`
3. Update TypeGraphQL entities to match new schema
4. Run tests to verify: `cd backend && npm test`

### Debugging GraphQL Errors
- Check console logs in backend container: `docker logs rabbithole-api-1`
- GraphQL Playground: http://localhost:4000/graphql
- Errors logged with operation name, variables, and full stack trace

### Working with ReactFlow (Frontend Graph)
- Located in: `frontend/src/app/graph/page.tsx`
- Transform GraphQL data to ReactFlow format: `{ id, position, data }`
- Handle node/edge updates via subscriptions for real-time sync

## Performance Considerations

- Large graphs (1000+ nodes): Implement viewport-based loading
- Vector searches: Regular `VACUUM ANALYZE` on tables with vectors
- Connection pool: Maximum 20 PostgreSQL connections
- Redis pub/sub: Scales to 1000s of concurrent users
- WebSocket scaling: Requires sticky sessions for multi-instance

## Security Notes

- All SQL queries use parameterized statements (no string concatenation)
- Input validation via class-validator decorators
- JWT authentication with NextAuth.js
- Level 0 immutability enforced at resolver level
- Never log: passwords, API keys, PII, tokens