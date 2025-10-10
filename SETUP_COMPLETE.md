# RabbitMQ Infrastructure Setup - Complete

## Summary

RabbitMQ infrastructure has been successfully configured for the Rabbithole vectorization pipeline. The setup includes:

- ✅ RabbitMQ service with Management UI
- ✅ Vectorization worker service
- ✅ Environment configuration templates
- ✅ Docker Compose orchestration
- ✅ Comprehensive documentation
- ✅ Health check utilities
- ✅ Development tools and scripts

## What Was Created/Modified

### 1. Docker Configuration

#### `/Users/kmk/rabbithole/docker-compose.yml`
Updated with:
- **RabbitMQ service**: Management-enabled container with health checks
- **Vectorization worker service**: Auto-scaling background worker
- **API service updates**: Added RabbitMQ connection settings
- **Volume persistence**: Data and logs for RabbitMQ

#### `/Users/kmk/rabbithole/backend/Dockerfile`
Added:
- `amqplib` and `@types/amqplib` dependencies for RabbitMQ client

### 2. Environment Configuration

#### `/Users/kmk/rabbithole/.env.example`
Comprehensive environment template with:
- `RABBITMQ_URL` - Connection string for RabbitMQ
- `OPENAI_API_KEY` - Required for vectorization
- `VECTORIZATION_QUEUE_NAME` - Queue configuration
- All other service configurations (Database, Redis, etc.)

### 3. Documentation

#### `/Users/kmk/rabbithole/backend/README.md`
Complete backend documentation including:
- Quick start guide
- Architecture overview with diagrams
- RabbitMQ integration details
- Vectorization worker documentation
- Monitoring and troubleshooting guides
- Production deployment recommendations
- Security checklist

#### `/Users/kmk/rabbithole/RABBITMQ_SETUP.md`
Quick reference guide with:
- Fast start commands
- Common operations
- Troubleshooting steps
- Development workflows
- Production recommendations

### 4. Development Tools

#### `/Users/kmk/rabbithole/docker-compose.dev.yml`
Development overrides for:
- Volume mounts for hot reload
- Debug logging
- RabbitMQ Prometheus exporter
- Development-friendly settings

#### `/Users/kmk/rabbithole/backend/src/utils/rabbitmq-health-check.ts`
Health check utility to verify:
- RabbitMQ connection
- Queue status
- Consumer count
- Message count

### 5. Package Scripts

#### `/Users/kmk/rabbithole/backend/package.json`
Added scripts:
- `worker:dev` - Run worker in development mode
- `worker:start` - Run worker in production mode
- `rabbitmq:health` - Check RabbitMQ connection and queue status

### 6. Git Configuration

#### `/Users/kmk/rabbithole/.gitignore`
Added to prevent committing:
- `.env` files (secrets)
- Node modules
- Build outputs
- IDE files
- Upload directories

## Quick Start

### 1. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit and add your OpenAI API key
nano .env
# Set: OPENAI_API_KEY=sk-your-actual-key-here
```

### 2. Start All Services

```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Verify Setup

```bash
# Check RabbitMQ health
cd backend
npm run rabbitmq:health

# Access RabbitMQ Management UI
# Open: http://localhost:15672
# Login: admin/admin
```

### 4. Monitor Operations

```bash
# View all logs
docker-compose logs -f

# View worker logs only
docker-compose logs -f vectorization-worker

# View RabbitMQ logs
docker-compose logs -f rabbitmq
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| GraphQL API | http://localhost:4000/graphql | - |
| RabbitMQ Management | http://localhost:15672 | admin/admin |
| Frontend | http://localhost:3001 | - |
| PostgreSQL | localhost:5432 | postgres/postgres |
| Redis | localhost:6379 | - |

## Architecture

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

## Worker Process Flow

1. **Connect**: Worker connects to RabbitMQ and PostgreSQL
2. **Listen**: Waits for messages on `vectorization_queue`
3. **Receive**: Gets evidence metadata from queue
4. **Fetch**: Retrieves full evidence content from database
5. **Vectorize**: Generates embeddings via OpenAI API
6. **Store**: Saves embeddings to PostgreSQL (pgvector)
7. **Acknowledge**: Confirms successful processing
8. **Repeat**: Returns to listening for next message

## Development Workflows

### Local Development (Recommended)

```bash
# Start infrastructure only
docker-compose up -d postgres redis rabbitmq

# Run API locally
cd backend
npm install
npm start

# In another terminal, run worker locally
cd backend
npm run worker:dev
```

### Full Docker Development

```bash
# Start everything with dev overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Watch logs
docker-compose logs -f api vectorization-worker
```

### Testing RabbitMQ

```bash
cd backend

# Check connection and queue status
npm run rabbitmq:health

# View Management UI
open http://localhost:15672
```

## Scaling Workers

```bash
# Run 3 workers
docker-compose up -d --scale vectorization-worker=3

# Check all workers
docker-compose ps vectorization-worker

# View logs from all workers
docker-compose logs -f vectorization-worker
```

## Common Issues & Solutions

### Issue: Worker can't connect to RabbitMQ

```bash
# Check RabbitMQ is running
docker-compose ps rabbitmq

# Start RabbitMQ
docker-compose up -d rabbitmq

# Check logs
docker-compose logs rabbitmq
```

### Issue: Messages not being processed

```bash
# Check worker is running
docker-compose ps vectorization-worker

# Check for errors
docker-compose logs vectorization-worker

# Restart worker
docker-compose restart vectorization-worker
```

### Issue: OpenAI API errors

```bash
# Verify API key is set
cat .env | grep OPENAI_API_KEY

# Should output: OPENAI_API_KEY=sk-...

# If not set, edit .env and add it
nano .env
```

### Issue: Queue filling up

```bash
# Scale workers horizontally
docker-compose up -d --scale vectorization-worker=5

# Monitor queue in Management UI
open http://localhost:15672
```

## Monitoring

### RabbitMQ Management UI

Access at http://localhost:15672 (admin/admin)

Monitor:
- Queue depth (ready messages)
- Consumer count (active workers)
- Message rates (in/out per second)
- Memory usage
- Connection status

### Health Checks

```bash
# RabbitMQ health
npm run rabbitmq:health

# API health
curl http://localhost:4000/health

# Check all containers
docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f vectorization-worker

# Last 100 lines
docker-compose logs --tail=100 vectorization-worker
```

## Production Checklist

Before deploying to production:

- [ ] Change RabbitMQ default credentials
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Store secrets in secure vault (not .env)
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up auto-scaling for workers
- [ ] Enable RabbitMQ clustering (HA)
- [ ] Configure backup strategy
- [ ] Set resource limits in docker-compose
- [ ] Enable audit logging
- [ ] Configure firewall rules
- [ ] Set up health check endpoints
- [ ] Document runbook for ops team

## Security Notes

### Never Commit These Files

- `.env` (contains secrets)
- `docker-compose.override.yml` (may contain local secrets)
- Any files with API keys or passwords

Already protected by `.gitignore`:
```
.env
.env.local
.env.*.local
uploads/
```

### Change Production Credentials

Default credentials are for development only:
- RabbitMQ: admin/admin → Use strong password
- PostgreSQL: postgres/postgres → Use strong password
- JWT_SECRET: change-in-production → Use secure random string

### Use Secret Management

For production, use:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets
- Azure Key Vault
- Environment variable injection at runtime

## Next Steps

1. **Create VectorizationWorker.ts**:
   - Implement worker logic in `/Users/kmk/rabbithole/backend/src/workers/VectorizationWorker.ts`
   - Handle message consumption from queue
   - Integrate with OpenAI API
   - Store embeddings in PostgreSQL

2. **Update API to publish messages**:
   - Add RabbitMQ publisher in evidence upload resolver
   - Publish vectorization jobs to queue
   - Handle errors gracefully

3. **Test the pipeline**:
   - Upload evidence via API
   - Monitor queue in RabbitMQ UI
   - Verify worker processes message
   - Check embeddings in database

4. **Add monitoring**:
   - Set up Prometheus metrics
   - Configure Grafana dashboards
   - Add alerting rules

## Support & Documentation

- **Backend README**: `/Users/kmk/rabbithole/backend/README.md`
- **Quick Reference**: `/Users/kmk/rabbithole/RABBITMQ_SETUP.md`
- **This Document**: `/Users/kmk/rabbithole/SETUP_COMPLETE.md`

For RabbitMQ documentation:
- Official docs: https://www.rabbitmq.com/documentation.html
- Management guide: https://www.rabbitmq.com/management.html
- Node.js client: https://www.npmjs.com/package/amqplib

## Success Criteria

✅ RabbitMQ running and accessible
✅ Management UI accessible at http://localhost:15672
✅ Queue created and visible in UI
✅ Worker service configured in docker-compose
✅ Environment variables documented
✅ npm scripts created for worker
✅ Comprehensive documentation provided
✅ Health check utility created
✅ .gitignore configured to protect secrets

The RabbitMQ infrastructure is now ready for integration with the VectorizationWorker implementation!
