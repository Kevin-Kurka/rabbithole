# RabbitMQ Infrastructure Setup - Quick Reference

## Quick Start

### 1. Set Your OpenAI API Key

```bash
# Copy the example file
cp .env.example .env

# Edit and add your OpenAI API key
nano .env
# Set: OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL with pgvector (port 5432)
- Redis (port 6379)
- RabbitMQ (ports 5672, 15672)
- API Server (port 4000)
- Vectorization Worker (background)
- Frontend (port 3001)

### 3. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| GraphQL API | http://localhost:4000/graphql | - |
| RabbitMQ Management | http://localhost:15672 | admin/admin |
| Frontend | http://localhost:3001 | - |
| PostgreSQL | localhost:5432 | postgres/postgres |
| Redis | localhost:6379 | - |

## Monitoring RabbitMQ

### Management UI

1. Open http://localhost:15672
2. Login with `admin` / `admin`
3. Go to "Queues" tab
4. Monitor `vectorization_queue`:
   - Ready messages
   - Consumer count
   - Message rate

### Check Queue Status

```bash
docker exec rabbithole-rabbitmq rabbitmqctl list_queues name messages consumers
```

### View Worker Logs

```bash
docker-compose logs -f vectorization-worker
```

## Common Commands

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d rabbitmq postgres redis

# Scale workers
docker-compose up -d --scale vectorization-worker=3
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (DELETES DATA!)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f vectorization-worker
docker-compose logs -f rabbitmq
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 vectorization-worker
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart vectorization-worker
docker-compose restart rabbitmq
```

## Development Workflow

### Run API Locally (Outside Docker)

```bash
cd backend

# Install dependencies
npm install

# Start infrastructure only
docker-compose up -d postgres redis rabbitmq

# Run API locally
npm start
```

### Run Worker Locally

```bash
cd backend

# In a separate terminal
npm run worker:dev
```

### Run Everything in Docker

```bash
# From project root
docker-compose up -d

# View all logs
docker-compose logs -f
```

## Troubleshooting

### Worker Not Processing Messages

1. Check worker is running:
   ```bash
   docker-compose ps vectorization-worker
   ```

2. Check worker logs:
   ```bash
   docker-compose logs vectorization-worker
   ```

3. Verify OpenAI API key in `.env`

4. Restart worker:
   ```bash
   docker-compose restart vectorization-worker
   ```

### RabbitMQ Connection Failed

1. Check RabbitMQ is running:
   ```bash
   docker-compose ps rabbitmq
   ```

2. Check RabbitMQ logs:
   ```bash
   docker-compose logs rabbitmq
   ```

3. Test connection:
   ```bash
   curl http://localhost:15672/api/overview -u admin:admin
   ```

4. Restart RabbitMQ:
   ```bash
   docker-compose restart rabbitmq
   ```

### Queue Filling Up

1. Scale workers:
   ```bash
   docker-compose up -d --scale vectorization-worker=5
   ```

2. Check for errors in worker logs

3. Verify OpenAI API quota

### Clean Slate Reset

```bash
# WARNING: Deletes all data!
docker-compose down -v
docker-compose up -d
```

## Message Format

The vectorization queue expects messages in this format:

```json
{
  "evidenceId": "uuid-here",
  "userId": "user-uuid",
  "content": "Text to vectorize",
  "timestamp": "2025-01-09T12:00:00Z"
}
```

## Queue Configuration

- **Queue Name**: `vectorization_queue`
- **Durable**: Yes (survives restart)
- **Auto-delete**: No
- **Prefetch**: 1 message per worker
- **Acknowledgment**: Manual

## Scaling Considerations

### Horizontal Scaling (More Workers)

```bash
# Run 5 workers
docker-compose up -d --scale vectorization-worker=5

# Check all workers
docker-compose ps vectorization-worker
```

### Vertical Scaling (More Resources)

Edit `docker-compose.yml`:

```yaml
vectorization-worker:
  # ... existing config ...
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

## Production Recommendations

### Security

1. **Change RabbitMQ credentials**:
   ```yaml
   environment:
     RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
     RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
   ```

2. **Use secrets for sensitive data**:
   - Store `OPENAI_API_KEY` in secure vault
   - Use Docker secrets or k8s secrets

3. **Enable TLS/SSL for RabbitMQ**

### Monitoring

1. **Set up alerts** for:
   - Queue depth > 1000 messages
   - No active consumers
   - Worker failures
   - OpenAI API errors

2. **Use Prometheus + Grafana** for metrics

3. **Configure log aggregation** (ELK, Datadog, etc.)

### High Availability

1. **Run multiple RabbitMQ nodes** (cluster)
2. **Use RabbitMQ quorum queues**
3. **Deploy workers across availability zones**
4. **Configure auto-scaling** based on queue depth

## Additional Resources

- Backend README: `backend/README.md`
- RabbitMQ Docs: https://www.rabbitmq.com/documentation.html
- Management UI Guide: https://www.rabbitmq.com/management.html
- Docker Compose Docs: https://docs.docker.com/compose/

## Support

For detailed troubleshooting, see `backend/README.md`.
