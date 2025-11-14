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
npm run worker:dev            # Start vectorization worker (dev)
npm run worker:start          # Start vectorization worker (production)
npm run worker:media          # Start media processing worker
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

# Run migrations (in order)
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/001_initial.sql

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
- All resolvers must be registered in `backend/src/index.ts` buildSchema call

### PostgreSQL Schema Rules
- **All table names are quoted PascalCase**: `public."Nodes"`, `public."Edges"`, `public."ActivityPosts"`
- Always use double quotes in raw SQL queries
- JSONB fields: `props` (user data), `meta` (system metadata)
- Query JSONB with `->` (JSON) or `->>` (text) operators
- Migration files: `backend/migrations/NNN_description.sql` (numbered sequentially)

### Real-Time Collaboration (Redis Pub/Sub)
- WebSocket server handles persistent connections via `graphql-ws`
- Subscription topics: `NODE_UPDATED`, `EDGE_UPDATED`, `NEW_COMMENT`, `ACTIVITY_POSTED`
- Redis enables horizontal scaling across multiple server instances
- Apollo Client uses split transport: WebSocket for subscriptions, HTTP for queries/mutations

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

### Background Workers Architecture
Two worker processes run alongside the main API:

**VectorizationWorker** (`npm run worker:start`):
- Consumes `vectorization_queue` from RabbitMQ
- Generates OpenAI embeddings for nodes (1536-dimensional vectors)
- Updates `ai` column in `public."Nodes"` table
- Enables vector similarity search via pgvector

**MediaProcessingWorker** (`npm run worker:media`):
- Consumes `media_processing_queue` from RabbitMQ
- Routes files to specialized services:
  - **DoclingProcessingService**: Documents (PDF, DOCX, etc.)
  - **AudioTranscriptionService**: Audio files (Whisper API)
  - **VideoAnalysisService**: Video files (frame extraction, scene detection)
- Updates processing status in Redis
- Writes results to database tables

### File Upload System
- Uses `apollo-upload-client` for frontend multipart uploads
- Custom GraphQL Upload scalar (ESM compatibility fix)
- Max file size: 100MB per file, 10 files max per request
- Storage: Local filesystem (`/uploads` in Docker) or S3
- Tracked in `public."EvidenceFiles"` table

### Docker Service Names
Inside containers, use these hostnames:
- Database: `postgres` (not localhost)
- Redis: `redis` (not localhost)
- RabbitMQ: `rabbitmq` (not localhost)
- Docling: `docling` (document processing service)
- API: `api` (for frontend in Docker)

Frontend Apollo Client auto-detects environment:
- SSR (server-side): Uses `http://api:4000/graphql`
- Browser: Uses `http://localhost:4000/graphql`

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
- 1536-dimensional vectors (OpenAI embeddings or Ollama alternatives)
- Embedding models: `text-embedding-3-large` (OpenAI), `nomic-embed-text` (Ollama)

### Environment Variables
Backend requires:
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `RABBITMQ_URL`: Message queue
- `OPENAI_API_KEY`: For embeddings (optional if using Ollama)
- `OLLAMA_URL`: Ollama server URL (default: `http://host.docker.internal:11434`)
- `OLLAMA_MODEL`: LLM model name (default: `deepseek-r1:1.5b`)
- `OLLAMA_EMBEDDING_MODEL`: Embedding model (default: `nomic-embed-text`)
- `DOCLING_URL`: Document processing service (default: `http://docling:5001`)

Frontend requires:
- `NEXT_PUBLIC_API_URL`: GraphQL endpoint (optional, auto-detects)
- `NEXT_PUBLIC_WS_URL`: WebSocket endpoint (optional, auto-detects)
- `NEXTAUTH_SECRET`: Auth secret

## Key Services & Capabilities

### AI & Analysis
- **AIAssistantService**: Ollama integration for chat, summarization, entity extraction
- **ConversationalAIService**: Context-aware conversations with memory
- **FactCheckingService**: Automated claim extraction and verification
- **ClaimExtractionService**: Extract factual claims from text
- **SearchService**: Vector similarity search across nodes
- **EmbeddingService**: Generate embeddings (OpenAI or Ollama)

### Media Processing
- **DocumentProcessingService**: PDF text extraction, entity detection, summarization
- **DoclingProcessingService**: Advanced document parsing (PDFs, DOCX, etc.)
- **AudioProcessingService**: Audio analysis and metadata extraction
- **AudioTranscriptionService**: Whisper-based transcription
- **VideoProcessingService**: Video metadata and scene analysis
- **VideoAnalysisService**: Frame extraction, scene detection
- **MediaQueueService**: Job queue management for async processing

### Content & Collaboration
- **GraphTraversalService**: Path finding, connected nodes, relationship queries
- **ContentAnalysisService**: Duplicate detection, content fingerprinting
- **DeduplicationService**: MinHash-based similarity detection
- **NotificationService**: Real-time notifications via Redis pub/sub
- **ChatService**: In-graph chat functionality
- **ActivityResolver**: Twitter-like activity feed (posts, replies, shares)

### Infrastructure
- **MessageQueueService**: RabbitMQ integration
- **QueueService**: Generic queue abstraction
- **CacheService**: Redis caching layer
- **FileStorageService**: Local filesystem or S3 storage
- **ConfigurationService**: System-wide settings

## Common Development Tasks

### Adding a New GraphQL Resolver
1. Create entity class in `backend/src/entities/` with `@ObjectType()` decorator
2. Create resolver in `backend/src/resolvers/` with `@Resolver()` decorator
3. **Critical**: Add resolver to array in `backend/src/index.ts` buildSchema call
4. Use context for database access: `@Ctx() { pool }`

### Adding a New Database Migration
1. Create numbered SQL file: `backend/migrations/0XX_feature_name.sql`
2. Use PascalCase quoted table names: `CREATE TABLE public."NewTable"`
3. Include indexes for foreign keys and frequently queried columns
4. Add timestamps: `created_at`, `updated_at`, `deleted_at` (for soft deletes)
5. Run migration: `docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/0XX_feature_name.sql`
6. Update TypeGraphQL entity to match schema

### Modifying Database Schema
1. Create new migration file (don't edit existing ones)
2. Restart containers to apply: `docker-compose down && docker-compose up`
3. Update TypeGraphQL entities to match new schema
4. Run tests to verify: `cd backend && npm test`

### Working with RabbitMQ Workers
- Check queue health: `npm run rabbitmq:health`
- View RabbitMQ management UI: http://localhost:15672 (admin/admin)
- Monitor worker logs: `docker logs rabbithole-vectorization-worker-1`
- Submit to vectorization queue: Use `MessageQueueService.publishVectorizationJob()`
- Submit to media queue: Use `MediaQueueService.queueMediaProcessing()`

### Debugging GraphQL Errors
- Check console logs in backend container: `docker logs rabbithole-api-1`
- GraphQL Playground: http://localhost:4000/graphql
- Errors logged with operation name, variables, and full stack trace

### Working with ReactFlow (Frontend Graph)
- Main graph page: `frontend/src/app/graph/page.tsx`
- Node detail page: `frontend/src/app/nodes/[id]/page.tsx`
- Transform GraphQL data to ReactFlow format: `{ id, position, data }`
- Handle node/edge updates via subscriptions for real-time sync

### Working with Activity Feed (Twitter-like)
- Activity posts table: `public."ActivityPosts"`
- Supports replies (`parent_post_id`), shares (`shared_post_id`)
- Node mentions: `mentioned_node_ids` array
- File attachments: `attachment_ids` references `public."EvidenceFiles"`
- Components: `activity-feed.tsx`, `activity-post.tsx`, `post-composer.tsx`

## Performance Considerations

- Large graphs (1000+ nodes): Implement viewport-based loading
- Vector searches: Regular `VACUUM ANALYZE` on tables with vectors
- Connection pool: Maximum 20 PostgreSQL connections
- Redis pub/sub: Scales to 1000s of concurrent users
- WebSocket scaling: Requires sticky sessions for multi-instance
- Media processing: Offloaded to worker processes via RabbitMQ
- File uploads: Direct to S3 for production (local filesystem for dev)

## Security Notes

- All SQL queries use parameterized statements (no string concatenation)
- Input validation via class-validator decorators
- JWT authentication with NextAuth.js
- Level 0 immutability enforced at resolver level
- File upload size limits: 100MB per file
- Never log: passwords, API keys, PII, tokens
- Rate limiting: Consider adding for public-facing mutations
