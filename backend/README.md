# Rabbithole Backend

GraphQL API server with real-time subscriptions, AI assistant integration, and asynchronous vectorization processing.

## 🔒 CRITICAL: Strict 4-Table Schema Requirement

**This backend uses a props-only schema with ONLY 4 core tables:**

1. **`node_types`** - Schema graph (defines what types of nodes can exist)
2. **`edge_types`** - Schema graph (defines what types of relationships can exist)
3. **`nodes`** - Data graph (6 columns: id, node_type_id, props, ai, created_at, updated_at)
4. **`edges`** - Data graph (8 columns: id, source_node_id, target_node_id, edge_type_id, props, ai, created_at, updated_at)

**ALL application data MUST be stored in JSONB `props` field - NO additional tables allowed.**

See [/SCHEMA_COMPLIANCE_REPORT.md](../SCHEMA_COMPLIANCE_REPORT.md) for complete schema documentation and migration from legacy tables.

### Weight-Based Credibility System

- **High Credibility (weight >= 0.90)**: Immutable nodes/edges (cannot be edited/deleted)
- **User Workspace (weight < 0.90)**: Fully editable
- All nodes/edges have `weight` property in their `props` JSONB field
- Backend GraphQL schema exposes getters that extract from props: `weight`, `title`, `graphId`, etc.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [RabbitMQ Integration](#rabbitmq-integration)
- [Vectorization Worker](#vectorization-worker)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 14+ with pgvector extension
- Redis 7+
- RabbitMQ 3.13+
- OpenAI API key (for AI features)

## Quick Start

### 1. Clone and Setup

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp ../.env.example .env
```

Edit `.env` and set your configuration:

```bash
# REQUIRED: Add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here

# Other settings have sensible defaults for local development
```

### 3. Start Infrastructure with Docker Compose

From the project root directory:

```bash
docker-compose up -d postgres redis rabbitmq
```

This starts:
- PostgreSQL with pgvector on port 5432
- Redis on port 6379
- RabbitMQ on ports 5672 (AMQP) and 15672 (Management UI)

### 4. Run Database Migrations

```bash
npm run migrate  # If migrations exist
```

### 5. Start the API Server

```bash
npm start
```

The GraphQL API will be available at `http://localhost:4000/graphql`

### 6. Start the Vectorization Worker

In a separate terminal:

```bash
npm run worker:dev
```

## Architecture

### Services Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         │ GraphQL/WebSocket
         │
┌────────▼────────┐      ┌──────────────┐
│   API Server    │◄─────┤   Redis      │
│   (Apollo)      │      │  (Pub/Sub)   │
└────────┬────────┘      └──────────────┘
         │
         │ Publish Jobs
         │
┌────────▼────────┐      ┌──────────────┐
│   RabbitMQ      │      │  PostgreSQL  │
│   (Message      │      │  + pgvector  │
│    Broker)      │      └──────────────┘
└────────┬────────┘              ▲
         │                       │
         │ Consume Jobs          │
         │                       │
┌────────▼────────┐              │
│ Vectorization   │──────────────┘
│    Worker       │   Store Embeddings
└─────────────────┘
```

### Technology Stack

- **GraphQL API**: Apollo Server with Type-GraphQL
- **Real-time**: GraphQL Subscriptions via Redis Pub/Sub
- **Database**: PostgreSQL 14 with pgvector extension
- **Caching**: Redis for session and pub/sub
- **Message Queue**: RabbitMQ for async job processing
- **AI Integration**: OpenAI API for embeddings and chat
- **File Storage**: Configurable (local, S3, Cloudflare R2)

## RabbitMQ Integration

### Overview

RabbitMQ is used for asynchronous processing of vectorization tasks. When evidence is uploaded, the API server publishes a message to the queue, and the vectorization worker processes it independently.

### Starting RabbitMQ

#### Using Docker Compose (Recommended)

```bash
docker-compose up -d rabbitmq
```

#### Standalone Docker

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3.13-management-alpine
```

#### Local Installation (macOS)

```bash
brew install rabbitmq
brew services start rabbitmq
```

### Accessing RabbitMQ Management UI

Navigate to `http://localhost:15672` in your browser:

- **Username**: `admin`
- **Password**: `admin`

The management UI provides:
- Queue monitoring and statistics
- Message browser
- Connection and channel details
- Exchange management
- Performance metrics

### Monitoring the Queue

#### Via Management UI

1. Go to `http://localhost:15672`
2. Click on "Queues" tab
3. Find `vectorization_queue`
4. Monitor:
   - Messages ready
   - Messages unacknowledged
   - Consumer count
   - Message rates

#### Via CLI (if RabbitMQ tools installed)

```bash
rabbitmqctl list_queues name messages consumers
```

#### Via Docker

```bash
docker exec rabbithole-rabbitmq rabbitmqctl list_queues name messages consumers
```

### Queue Configuration

The vectorization queue is configured with:

- **Queue Name**: `vectorization_queue`
- **Durability**: Durable (survives broker restart)
- **Auto-delete**: No
- **Prefetch Count**: 1 (worker processes one message at a time)
- **Acknowledgment**: Manual (only removed after successful processing)

## Vectorization Worker

The vectorization worker is a separate process that consumes messages from the RabbitMQ queue and generates embeddings using OpenAI's API.

### Starting the Worker

#### Development Mode

```bash
npm run worker:dev
```

#### Production Mode (via Docker Compose)

```bash
docker-compose up -d vectorization-worker
```

#### Standalone

```bash
node dist/workers/VectorizationWorker.js
```

### Worker Process Flow

1. **Connect** to RabbitMQ and PostgreSQL
2. **Consume** messages from `vectorization_queue`
3. **Fetch** evidence content from database
4. **Generate** embeddings via OpenAI API
5. **Store** embeddings in PostgreSQL (pgvector)
6. **Acknowledge** message on success
7. **Retry** on failure (with exponential backoff)

### Monitoring Worker Health

#### Check Worker Logs

```bash
# Docker Compose
docker-compose logs -f vectorization-worker

# Local development
# Watch the terminal where worker is running
```

#### Check for Active Consumers

```bash
# Via RabbitMQ Management UI
# Navigate to Queues > vectorization_queue > Consumers

# Via CLI
docker exec rabbithole-rabbitmq rabbitmqctl list_consumers
```

### Worker Configuration

Environment variables for the worker:

```bash
# Required
RABBITMQ_URL=amqp://admin:admin@localhost:5672
OPENAI_API_KEY=sk-your-api-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rabbithole_db

# Optional
VECTORIZATION_QUEUE_NAME=vectorization_queue  # Default
REDIS_URL=redis://localhost:6379              # For caching
```

## Development

### Available Scripts

```bash
# Start API server
npm start

# Start vectorization worker
npm run worker:dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Database seeds
npm run seed
npm run seed:docker
npm run seed:achievements

# Build for production
npm run build
```

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── entities/        # TypeORM entities
│   ├── resolvers/       # GraphQL resolvers
│   ├── services/        # Business logic
│   ├── workers/         # Background workers
│   │   └── VectorizationWorker.ts
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── __tests__/           # Test files
├── Dockerfile           # Container definition
└── package.json
```

## Testing

### Run All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Test RabbitMQ Connection

```bash
# Create a test script
cat > test-rabbitmq.ts << 'EOF'
import amqp from 'amqplib';

async function testConnection() {
  try {
    const connection = await amqp.connect('amqp://admin:admin@localhost:5672');
    const channel = await connection.createChannel();
    console.log('✅ RabbitMQ connection successful!');
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
  }
}

testConnection();
EOF

ts-node test-rabbitmq.ts
```

## Troubleshooting

### RabbitMQ Issues

#### Worker Can't Connect to RabbitMQ

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5672`

**Solutions**:

1. Verify RabbitMQ is running:
   ```bash
   docker ps | grep rabbitmq
   # or
   brew services list | grep rabbitmq
   ```

2. Check RabbitMQ logs:
   ```bash
   docker logs rabbithole-rabbitmq
   ```

3. Verify connection URL in `.env`:
   ```bash
   # For local Docker
   RABBITMQ_URL=amqp://admin:admin@localhost:5672

   # For Docker Compose services
   RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
   ```

4. Test connection:
   ```bash
   curl http://localhost:15672/api/overview \
     -u admin:admin
   ```

#### Messages Not Being Processed

**Symptom**: Messages accumulate in queue but worker shows no activity

**Solutions**:

1. Check worker is running:
   ```bash
   docker-compose ps vectorization-worker
   # or check your terminal
   ```

2. Check worker logs for errors:
   ```bash
   docker-compose logs vectorization-worker
   ```

3. Verify OpenAI API key is set:
   ```bash
   echo $OPENAI_API_KEY
   # Should output: sk-...
   ```

4. Check message format in RabbitMQ Management UI
   - Navigate to Queues > vectorization_queue > Get Messages
   - Verify message structure matches expected format

5. Manually requeue failed messages:
   - In Management UI, go to the queue
   - Click "Get Messages" > "Requeue"

#### Queue Fills Up Faster Than Processing

**Symptom**: `vectorization_queue` has thousands of ready messages

**Solutions**:

1. Scale workers horizontally:
   ```bash
   docker-compose up -d --scale vectorization-worker=3
   ```

2. Increase worker prefetch count (process multiple messages):
   Edit `VectorizationWorker.ts` and increase prefetch

3. Optimize vectorization logic (batch processing)

4. Add dead letter queue for failed messages

### Database Issues

#### Connection Refused

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d rabbithole_db
```

#### Missing pgvector Extension

```sql
-- Connect to database and run:
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify:
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### OpenAI API Issues

#### Rate Limits

**Symptom**: `429 Too Many Requests`

**Solutions**:

1. Add exponential backoff in worker
2. Reduce worker concurrency
3. Upgrade OpenAI plan
4. Implement request queuing

#### Invalid API Key

**Symptom**: `401 Unauthorized`

**Solutions**:

1. Verify API key in `.env`:
   ```bash
   cat .env | grep OPENAI_API_KEY
   ```

2. Check key is valid at https://platform.openai.com/api-keys

3. Ensure no extra whitespace in `.env` file

### Redis Issues

#### Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Should output: PONG
```

### General Debugging

#### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug

# Then restart services
docker-compose restart api vectorization-worker
```

#### View All Service Logs

```bash
docker-compose logs -f --tail=100
```

#### Restart All Services

```bash
docker-compose down
docker-compose up -d
```

#### Clean Slate Restart

```bash
# Warning: This deletes all data!
docker-compose down -v
docker-compose up -d
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings | `sk-...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://admin:admin@localhost:5672` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VECTORIZATION_QUEUE_NAME` | `vectorization_queue` | RabbitMQ queue name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `4000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `OPENAI_MODEL` | `gpt-4-turbo` | OpenAI model for chat |
| `AI_MAX_TOKENS` | `1000` | Max tokens for AI responses |
| `AI_TEMPERATURE` | `0.7` | AI response creativity |

See `.env.example` for complete list.

## Production Deployment

### Using Docker Compose

```bash
# Set environment variables
export OPENAI_API_KEY=sk-your-production-key

# Start all services
docker-compose up -d

# Check health
docker-compose ps
docker-compose logs -f
```

### Scaling Workers

```bash
# Run 5 worker instances
docker-compose up -d --scale vectorization-worker=5
```

### Health Checks

The API includes health check endpoints:

```bash
# Check API health
curl http://localhost:4000/health

# Check RabbitMQ health
curl http://localhost:15672/api/health/checks/alarms \
  -u admin:admin
```

### Monitoring Recommendations

- Use RabbitMQ Management UI for queue monitoring
- Set up Prometheus/Grafana for metrics
- Configure alerting for:
  - Queue depth exceeding threshold
  - Worker failures
  - OpenAI API errors
  - Database connection issues

## Security Considerations

### Production Checklist

- [ ] Change default RabbitMQ credentials
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/TLS
- [ ] Restrict CORS origins
- [ ] Use environment-specific secrets
- [ ] Enable RabbitMQ authentication
- [ ] Configure firewall rules
- [ ] Regular dependency updates
- [ ] Enable audit logging

### Secrets Management

Never commit secrets to version control. Use:

- Environment variables
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

## License

ISC

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review RabbitMQ Management UI for queue issues
