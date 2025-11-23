# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Rabbit Hole** - A collaborative knowledge graph platform for evidence-based inquiry using structured methodologies (Scientific Method, Legal Discovery, Toulmin Argumentation). Features a weight-based credibility system:

- **High Credibility (weight >= 0.90)**: Immutable "truth layer" with verified facts
- **User Workspace (weight < 0.90)**: Editable theories and evolving knowledge

## 🔒 CRITICAL: Strict 4-Table Schema Requirement

**This project ONLY uses 4 core tables + 1 system table:**

1. `node_types` - Schema graph (node type definitions)
2. `edge_types` - Schema graph (edge type definitions)
3. `nodes` - Data graph (6 columns: id, node_type_id, props, ai, created_at, updated_at)
4. `edges` - Data graph (8 columns: id, source_node_id, target_node_id, edge_type_id, props, ai, created_at, updated_at)
5. `schema_migrations` - System table for tracking migrations

**ALL DATA MUST BE STORED IN JSONB `props` FIELD - NO EXCEPTIONS**

Any feature (Evidence, Challenges, Users, VeracityScores, ActivityPosts, etc.) must be implemented as:

- **Node types** with data in `props`
- **Edge types** with relationship data in `props`

See [SCHEMA_COMPLIANCE_REPORT.md](SCHEMA_COMPLIANCE_REPORT.md) for complete schema documentation.

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

### PostgreSQL Schema Rules (Props-Only Pattern)

- **All table names are quoted PascalCase**: `public."Nodes"`, `public."Edges"`, `public."NodeTypes"`, `public."EdgeTypes"`
- Always use double quotes in raw SQL queries
- **JSONB `props` field**: ALL data stored here (no separate columns)
- Query JSONB with `->` (JSON) or `->>` (text) operators
- **Type casting required**: `(n.props->>'graphId')::uuid` when comparing with UUID columns
- Migration files: `backend/migrations/NNN_description.up.sql` (numbered sequentially)
- **Example props structure**:

  ```json
  {
    "title": "Node Title",
    "weight": 0.95,
    "graphId": "uuid-here",
    "createdBy": "user-uuid",
    "content": "Text content",
    "metadata": { ... }
  }
  ```

### Real-Time Collaboration (Redis Pub/Sub)
- WebSocket server handles persistent connections via `graphql-ws`
- Subscription topics: `NODE_UPDATED`, `EDGE_UPDATED`, `NEW_COMMENT`, `ACTIVITY_POSTED`
- Redis enables horizontal scaling across multiple server instances
- Apollo Client uses split transport: WebSocket for subscriptions, HTTP for queries/mutations

### Weight-Based Credibility System

- **High Credibility (weight >= 0.90)**: Immutable nodes/edges - all update/delete operations throw errors
- **User Workspace (weight < 0.90)**: Fully editable - standard CRUD operations allowed
- Check `weight` value before any mutation (use `isHighCredibility(weight)` helper)
- All nodes/edges have `weight` property in their `props` JSONB field
- Frontend derives "level" from weight for backward compatibility: `getLevelFromWeight(weight)`

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
  - **DoclingProcessingService**: Documents (PDF, DOCX, etc.) - ✅ **Fully functional**
  - **AudioTranscriptionService**: Audio files (Whisper API) - ⚠️ **Stub implementation, not production-ready**
  - **VideoAnalysisService**: Video files (frame extraction, scene detection) - ⚠️ **Stub implementation, not production-ready**
- Updates processing status in Redis
- **Stores results as nodes** with file metadata in `props`

### File Upload System
- Uses `apollo-upload-client` for frontend multipart uploads
- Custom GraphQL Upload scalar (ESM compatibility fix)
- Max file size: 100MB per file, 10 files max per request
- Storage: Local filesystem (`/uploads` in Docker) or S3
- **Tracked as nodes** with node type `File` or `Evidence`, file paths in `props.filePath`

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
- **Coverage target**: 80% (branches, functions, lines, statements)
- **Current coverage**: ~10% (6 test files) - ⚠️ **Significant gap, needs improvement**
- Run with: `npm test`, `npm run test:coverage`
- Existing tests: FactCheckingService, ConversationalAIService, level0-system, document-processing, AudioProcessingService, MessageQueueService

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
- **SearchService**: Full-text and semantic vector similarity search - ✅ **Fully functional (hybrid search)**
- **EmbeddingService**: Generate embeddings (OpenAI or Ollama)

### Media Processing
- **DocumentProcessingService**: PDF text extraction, entity detection, summarization - ✅ **Fully functional**
- **DoclingProcessingService**: Advanced document parsing (PDFs, DOCX, etc.) - ✅ **Fully functional**
- **AudioProcessingService**: Audio analysis and metadata extraction - ✅ **Metadata only**
- **AudioTranscriptionService**: OpenAI Whisper + AssemblyAI speaker diarization - ✅ **Fully functional (NEW!)**
- **VideoProcessingService**: Video metadata and scene analysis - ✅ **Metadata only**
- **VideoAnalysisService**: Frame extraction, scene detection, object detection - ✅ **Fully functional (NEW!)**
- **VideoFrameExtractionService**: Intelligent frame sampling with scene-based detection - ✅ **Fully functional (NEW!)**
- **ObjectDetectionService**: TensorFlow.js COCO-SSD (90 object classes) - ✅ **Fully functional (NEW!)**
- **MediaQueueService**: Job queue management for async processing - ✅ **Fully functional**

### Content & Collaboration
- **GraphTraversalService**: Path finding, connected nodes, relationship queries
- **ContentAnalysisService**: Duplicate detection, content fingerprinting
- **DeduplicationService**: MinHash-based similarity detection
- **NotificationService**: Real-time notifications via Redis pub/sub
- **ChatService**: In-graph chat functionality
- **ActivityResolver**: Twitter-like activity feed (posts, replies, shares)
- **ChallengeResolver**: Node/edge challenge system with voting and resolution - ✅ **Fully functional**
- **CuratorResolver**: Four-tier curator system (CuratorRole, UserCurator, Application, AuditLog) - ✅ **Fully functional**

### Infrastructure
- **MessageQueueService**: RabbitMQ integration
- **QueueService**: Generic queue abstraction
- **CacheService**: Redis caching layer
- **FileStorageService**: Local filesystem or S3 storage
- **ConfigurationService**: System-wide settings

## Media Processing Configuration (NEW!)

### Audio Transcription with Speaker Diarization

The AudioTranscriptionService supports two providers:

**OpenAI Whisper API** (default):
- 25MB file size limit
- Model: `whisper-1`
- Languages: Auto-detect or specify (en, es, fr, etc.)
- No speaker diarization

**AssemblyAI** (optional, requires API key):
- Speaker diarization with labeled utterances
- Async processing with polling (5-second intervals, 10-minute timeout)
- Speaker identification with timestamps and confidence scores
- Supports same languages as Whisper

**Configuration** (`.env`):
```bash
# Basic transcription
USE_LOCAL_WHISPER=false
WHISPER_MODEL=whisper-1
MAX_AUDIO_FILE_SIZE_MB=25
AUDIO_PROCESSING_TIMEOUT_MS=300000

# Speaker diarization (optional)
ENABLE_SPEAKER_DIARIZATION=true
ASSEMBLYAI_API_KEY=your_api_key_here
```

**Usage Example**:
```typescript
const result = await audioTranscriptionService.transcribe('/path/to/audio.mp3', {
  language: 'en',
  speakerDiarization: true
});

// result.speakers contains:
// [
//   { id: 'speaker_A', label: 'Speaker A', segments: [0, 2, 4] },
//   { id: 'speaker_B', label: 'Speaker B', segments: [1, 3, 5] }
// ]
// result.segments contains timestamped text segments
```

### Video Analysis with Object Detection

The VideoAnalysisService provides comprehensive video processing:

**Features**:
- Frame extraction at configurable intervals (default: 1 fps, max: 300 frames)
- Scene-based frame extraction using histogram analysis (threshold: 0-100%)
- Object detection using TensorFlow.js COCO-SSD (90 object classes)
- Metadata extraction (duration, resolution, codec, bitrate)
- Thumbnail generation
- Audio track detection

**COCO Object Classes** (90 total):
- People: person
- Vehicles: bicycle, car, motorcycle, airplane, bus, train, truck, boat
- Animals: bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe
- Objects: backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket
- Food: bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake
- Furniture: chair, couch, potted plant, bed, dining table, toilet
- Electronics: tv, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator
- Other: book, clock, vase, scissors, teddy bear, hair drier, toothbrush

**Configuration** (`.env`):
```bash
# Video analysis
ENABLE_VIDEO_ANALYSIS=true
VIDEO_FRAME_RATE=1
VIDEO_MAX_FRAMES=300
VIDEO_PROCESSING_TIMEOUT_MS=600000

# Object detection (requires TensorFlow.js)
ENABLE_OBJECT_DETECTION=true
TENSORFLOW_MODEL=coco-ssd

# Scene detection
SCENE_DETECTION_THRESHOLD=30.0

# FFmpeg paths (auto-detected if in PATH)
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```

**Usage Example**:
```typescript
const result = await videoAnalysisService.analyzeVideo('/path/to/video.mp4', {
  extractFrames: true,
  frameRate: 1,           // 1 frame per second
  maxFrames: 300,
  detectScenes: true,     // Use scene detection
  detectObjects: true,    // Enable object detection
  generateThumbnail: true
});

// result.detectedObjects contains:
// {
//   totalObjects: 42,
//   totalFrames: 15,
//   avgObjectsPerFrame: 2.8,
//   allClasses: ['person', 'car', 'dog', 'chair'],
//   classFrequency: Map { 'person' => 12, 'car' => 8, ... },
//   frameResults: Map { 0 => [...], 1 => [...] }
// }
```

### Media Processing Worker Queue

Submit jobs to the media processing worker via RabbitMQ:

```typescript
import { mediaQueueService } from './services/MediaQueueService';

// Queue audio transcription
await mediaQueueService.queueMediaProcessing({
  jobId: 'unique-job-id',
  fileId: 'file-123',
  fileType: 'audio',
  filePath: '/uploads/audio.mp3',
  options: {
    speakerDiarization: true,
    language: 'en'
  }
});

// Queue video analysis
await mediaQueueService.queueMediaProcessing({
  jobId: 'unique-job-id-2',
  fileId: 'file-456',
  fileType: 'video',
  filePath: '/uploads/video.mp4',
  options: {
    extractFrames: true,
    frameRate: 1,
    maxFrames: 300,
    detectScenes: true,
    detectObjects: true
  }
});
```

### Performance Characteristics

**Audio Transcription**:
- OpenAI Whisper: ~1-2 minutes per 10-minute audio file
- AssemblyAI: ~2-3 minutes per 10-minute audio file (includes speaker diarization)
- File size limit: 25MB (configurable)

**Video Analysis**:
- Frame extraction: ~1-5 seconds per 100 frames (depends on resolution)
- Scene detection: ~2-10 seconds per minute of video
- Object detection: ~0.5-2 seconds per frame (TensorFlow.js Lite model)
- Full analysis (300 frames + objects): ~5-10 minutes for 30-minute video

**Resource Requirements**:
- Audio: Minimal CPU, ~100MB RAM per job
- Video: High CPU for frame extraction, ~500MB-1GB RAM per job
- Object detection: High CPU, ~500MB RAM per model instance
- TensorFlow.js: CPU-only (Node.js), consider GPU version for heavy loads

## Common Development Tasks

### Running Database Migrations (NEW!)
```bash
cd backend
npm run migrate:status  # Check migration status
npm run migrate         # Run pending migrations
```

**Automated Migration System Features:**
- ✅ Tracks applied migrations in `public."SchemaMigrations"` table
- ✅ SHA-256 checksums detect modified migrations
- ✅ Transaction-based execution (rollback on failure)
- ✅ Records execution time and errors
- ✅ Warns about modified migrations

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
5. Run migration: `npm run migrate` (NEW automated system!)
6. Update TypeGraphQL entity to match schema

### Modifying Database Schema
1. Create new migration file (don't edit existing ones)
2. Run migrations: `npm run migrate`
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

- **Stored as nodes** with node type `ActivityPost`
- Props contain: `content`, `isReply`, `isShare`, `parentPostId`, `sharedPostId`
- Edges: `POSTED_ON` (ActivityPost → Node), `AUTHORED_BY` (ActivityPost → User)
- Node mentions via edges: `MENTIONS` (ActivityPost → Node)
- File attachments stored as separate nodes with edges to activity post
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
- **High credibility immutability** (weight >= 0.90) enforced at resolver level
- File upload size limits: 100MB per file
- Never log: passwords, API keys, PII, tokens
- Rate limiting: Consider adding for public-facing mutations
- **Props validation**: Validate all data going into JSONB props field to prevent injection attacks
