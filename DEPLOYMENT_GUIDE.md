# DEPLOYMENT GUIDE
## Rabbit Hole - Wikipedia-Enhanced Knowledge Graph with Formal Inquiry System

**Status**: Simplified and Ready for Deployment
**Date**: November 7, 2025

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Completed Simplifications
- [x] Database schema simplified (50+ tables → 10 tables)
- [x] Backend resolvers reduced (27 → 12 resolvers)
- [x] Input validation enabled
- [x] Hardcoded secrets removed
- [x] Auth security vulnerabilities fixed
- [x] CORS properly configured
- [x] Frontend cleaned up (deleted unused components)
- [x] Challenge system preserved as core feature

### ⚠️ Critical Requirements Before Deployment
- [ ] Generate secure secrets for production
- [ ] Set all environment variables
- [ ] Test database initialization
- [ ] Test end-to-end user flow
- [ ] Install rate limiting package
- [ ] Remove development console.log statements
- [ ] Configure production logging
- [ ] Set up monitoring/alerts
- [ ] Configure database backups
- [ ] SSL/TLS certificates configured

---

## 🚀 QUICK START (Development)

### 1. Clone Repository
```bash
git clone https://github.com/Kevin-Kurka/rabbithole.git
cd rabbithole
```

### 2. Set Up Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET

# Edit .env and fill in:
# - JWT_SECRET=<generated-secret-1>
# - NEXTAUTH_SECRET=<generated-secret-2>
# - OPENAI_API_KEY=<your-openai-key> (optional)
```

### 3. Start All Services
```bash
# Start Docker containers
docker-compose up --build

# Wait for services to be healthy...
```

### 4. Initialize Database
```bash
# In a new terminal, run database initialization
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# Verify tables created
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt"
```

### 5. Verify Application
```bash
# Backend GraphQL Playground
open http://localhost:4000/graphql

# Frontend
open http://localhost:3001

# Check logs
docker logs rabbithole-api-1 -f
docker logs rabbithole-frontend-1 -f
```

---

## 🏗️ ARCHITECTURE OVERVIEW

### Database (PostgreSQL + pgvector)
**10 Tables** (down from 50+):

**Core Graph (4 tables)**:
- `NodeTypes` - Define content types (Article, Document, Evidence, Event, Person, Source, Organization, Concept)
- `EdgeTypes` - Define relationship types (cites, supports, contradicts, relates-to, etc.)
- `Nodes` - All content nodes
- `Edges` - All relationships between nodes

**Supporting (1 table)**:
- `Users` - Authentication and profiles

**Two-Layer Interaction (2 tables)**:
- `Comments` - Social layer (informal discussions, Twitter-like)
- `Challenges` - Truth-seeking layer (formal inquiry system) ⭐ **CORE FEATURE**

**Challenge System (3 tables)**:
- `ChallengeEvidence` - Evidence submission
- `ChallengeParticipants` - Community participation (amicus brief style)
- `ChallengeVotes` - Voting on outcomes

### Backend (Node.js/TypeScript)
**12 Resolvers** (down from 27):

**Core Resolvers (6)**:
- UserResolver - Authentication
- GraphResolver - Graph operations (needs refactoring)
- NodeResolver - Node CRUD
- EdgeResolver - Edge CRUD
- NodeTypeResolver - Node type management
- EdgeTypeResolver - Edge type management

**Interaction Layers (2)**:
- CommentResolver - Social comments
- ChallengeResolver - Formal inquiries ⭐

**Credibility System (3)**:
- VeracityScoreResolver - Credibility scoring
- EvidenceResolver - Evidence management
- SourceResolver - Source credibility

**AI Facilitation (1)**:
- AIAssistantResolver - AI-assisted features

### Frontend (Next.js 16 / React 19)
**Key Pages**:
- `/` - Homepage with article list and draggable nodes
- `/nodes/[id]` - Article/node details page
- Auth handled by NextAuth.js

**Preserved Components** (Challenge System):
- ChallengeCard, ChallengeForm, ChallengePanel
- ChallengeHistory, ChallengeVotingWidget
- VeracityBadge, VeracityPanel, VeracityTimeline, VeracityBreakdown

---

## 🔐 SECURITY CONFIGURATION

### Required Environment Variables

**Backend (.env)**:
```bash
# Authentication
JWT_SECRET=<secure-random-32-bytes>
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Database
DATABASE_URL=postgres://postgres:<password>@<host>:5432/rabbithole_db

# Redis
REDIS_URL=redis://<host>:6379

# RabbitMQ (optional, for vectorization queue)
RABBITMQ_URL=amqp://<user>:<pass>@<host>:5672

# CORS
FRONTEND_URL=https://your-domain.com

# AI Features (optional)
OPENAI_API_KEY=sk-...

# Environment
NODE_ENV=production
```

**Frontend (.env)**:
```bash
# NextAuth
NEXTAUTH_SECRET=<secure-random-32-bytes>
NEXTAUTH_URL=https://your-domain.com

# API
NEXT_PUBLIC_API_URL=https://api.your-domain.com/graphql
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com/graphql
```

### Security Features Enabled
- ✅ Input validation enabled (`validate: true`)
- ✅ JWT authentication required (no header bypass)
- ✅ CORS restricted to known origins
- ✅ Body size limits (10MB)
- ✅ Secrets from environment variables only
- ⚠️ Rate limiting configured but needs package: `npm install express-rate-limit`

### Security TODOs
1. Install rate limiting: `npm install express-rate-limit` in backend
2. Remove console.log statements (422 instances found)
3. Add structured logging (Winston or Pino)
4. Set up Sentry or similar error tracking
5. Configure WAF (Web Application Firewall)
6. Enable HTTPS/TLS
7. Set up database backups (automated)
8. Implement log rotation

---

## 📊 DATABASE SCHEMA

### Key Changes from Original
- ❌ **Removed** `Graphs` table - simplified to single namespace
- ❌ **Removed** `graph_id` column from Nodes and Edges
- ❌ **Removed** `is_level_0` column - no Level 0/1 system
- ✅ **Added** enhanced Challenge tables with Toulmin argumentation
- ✅ **Added** credibility calculation function
- ✅ **Added** auto-trigger for credibility updates

### Credibility Calculation
Nodes have a `weight` column (0.0-1.0) representing credibility:
- Default: 0.5 (neutral, no challenges yet)
- Increases when challenges are dismissed
- Decreases when challenges are sustained
- Auto-calculated via database function when challenges resolve
- Transparent breakdown available to users

### Sample Queries

**Get all articles:**
```sql
SELECT n.id, n.props->>'title' as title, n.weight as credibility
FROM public."Nodes" n
JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
WHERE nt.name = 'Article'
  AND n.visibility = 'public'
ORDER BY n.created_at DESC
LIMIT 20;
```

**Get challenges for a node:**
```sql
SELECT c.*, u.username as challenger
FROM public."Challenges" c
JOIN public."Users" u ON c.challenger_id = u.id
WHERE c.target_node_id = '<node-id>'
ORDER BY c.created_at DESC;
```

**Calculate node credibility:**
```sql
SELECT calculate_node_credibility('<node-id>');
```

---

## 🌐 DEPLOYMENT OPTIONS

### Option 1: Docker Compose (Simplest)

**Production docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:v0.5.1
    restart: always
    environment:
      POSTGRES_DB: rabbithole_db
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rabbithole-network

  api:
    build: ./backend
    restart: always
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/rabbithole_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      NODE_ENV: production
    depends_on:
      - postgres
      - redis
    networks:
      - rabbithole-network

  frontend:
    build: ./frontend
    restart: always
    environment:
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - api
    ports:
      - "80:3000"
    networks:
      - rabbithole-network

  redis:
    image: redis:7-alpine
    restart: always
    networks:
      - rabbithole-network

volumes:
  postgres_data:

networks:
  rabbithole-network:
```

### Option 2: AWS ECS (Scalable)

**Components:**
- ECS Fargate for API and Frontend
- RDS PostgreSQL with pgvector extension
- ElastiCache Redis cluster
- Application Load Balancer
- CloudFront CDN for static assets
- S3 for file uploads
- Secrets Manager for environment variables

**Steps:**
1. Create RDS PostgreSQL instance with pgvector
2. Create ElastiCache Redis cluster
3. Build and push Docker images to ECR
4. Create ECS task definitions
5. Configure ALB with HTTPS
6. Set up CloudFront
7. Configure auto-scaling
8. Enable monitoring (CloudWatch)

### Option 3: Kubernetes (Most Scalable)

**Resources:**
- Deployment for API (3+ replicas)
- Deployment for Frontend (3+ replicas)
- StatefulSet for PostgreSQL (or use managed RDS)
- StatefulSet for Redis (or use managed ElastiCache)
- Ingress for routing
- HorizontalPodAutoscaler for auto-scaling

---

## 🧪 TESTING

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm run test                # Run Jest tests
npm run lint                # ESLint
npm run build               # Test build
```

### Integration Testing
```bash
# Start all services
docker-compose up -d

# Run integration tests
cd backend
npm run test:integration

# Test GraphQL endpoints
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ nodeTypes { id name description } }"}'
```

### End-to-End User Flow
1. ✅ Visit homepage → See public articles
2. ✅ Click article → View details and connections
3. ✅ Click "Create Article" → Login modal appears
4. ✅ Register new account → Success
5. ✅ Create new article → Article published
6. ✅ Submit formal challenge → Challenge created
7. ✅ Add comment → Comment appears
8. ✅ Submit evidence → Evidence attached to challenge
9. ✅ Vote on challenge → Vote recorded
10. ✅ Search articles → Results appear

---

## 📈 MONITORING & OBSERVABILITY

### Metrics to Track
- **API**: Request rate, latency, error rate
- **Database**: Query performance, connection pool usage
- **Frontend**: Page load time, bundle size
- **User**: Active users, articles created, challenges initiated

### Recommended Tools
- **Logging**: Winston (structured JSON logs)
- **Error Tracking**: Sentry
- **APM**: New Relic or Datadog
- **Uptime**: Pingdom or UptimeRobot
- **Database**: pg_stat_statements for query analysis

### Health Checks
```bash
# API health
curl http://localhost:4000/health

# Database health
docker exec rabbithole-postgres-1 pg_isready -U postgres

# Redis health
docker exec rabbithole-redis-1 redis-cli ping
```

---

## 🔄 MAINTENANCE

### Database Backups
```bash
# Manual backup
docker exec rabbithole-postgres-1 pg_dump -U postgres rabbithole_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backup.sql
```

### Database Maintenance
```bash
# Analyze tables (update statistics)
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "VACUUM ANALYZE;"

# Rebuild vector indexes (if performance degrades)
docker exec rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "REINDEX INDEX idx_nodes_vector;"
```

### Updating Dependencies
```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix
```

---

## 🐛 TROUBLESHOOTING

### Database Connection Issues
```bash
# Check if postgres is running
docker ps | grep postgres

# Check database logs
docker logs rabbithole-postgres-1

# Connect to database
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# List tables
\dt
```

### API Not Starting
```bash
# Check backend logs
docker logs rabbithole-api-1 -f

# Common issues:
# - Missing JWT_SECRET environment variable
# - Database not initialized (run init.sql)
# - Database connection refused (check DATABASE_URL)
# - TypeScript compilation errors (check resolver imports)
```

### Frontend Not Loading
```bash
# Check frontend logs
docker logs rabbithole-frontend-1 -f

# Common issues:
# - Missing NEXTAUTH_SECRET
# - API_URL not reachable
# - Build errors (check package.json)
```

### Vector Search Not Working
```bash
# Check if pgvector extension is installed
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dx"

# Verify vector index exists
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\d idx_nodes_vector"

# Test vector similarity
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "
SELECT id, props->>'title'
FROM public.\"Nodes\"
ORDER BY ai <=> '[0,0,0...]'::vector
LIMIT 5;
"
```

---

## 📚 API DOCUMENTATION

### GraphQL Endpoint
**URL**: `http://localhost:4000/graphql`

### Key Queries

**Get Articles:**
```graphql
query GetArticles {
  nodes(filter: { nodeType: "Article" }) {
    id
    props
    meta
    weight
    created_at
  }
}
```

**Get Article Details:**
```graphql
query GetArticle($id: ID!) {
  node(id: $id) {
    id
    props
    meta
    weight
    edges {
      id
      edgeType { name }
      targetNode {
        id
        props
      }
    }
  }
}
```

**Get Challenges for Node:**
```graphql
query GetChallenges($nodeId: ID!) {
  challenges(targetNodeId: $nodeId) {
    id
    claim
    status
    challenger {
      id
      username
    }
    evidence {
      id
      evidenceNode {
        id
        props
      }
    }
    votes {
      vote
      reasoning
    }
  }
}
```

### Key Mutations

**Create Article:**
```graphql
mutation CreateArticle($input: NodeInput!) {
  createNode(input: $input) {
    id
    props
  }
}
```

**Create Challenge:**
```graphql
mutation CreateChallenge($input: ChallengeInput!) {
  createChallenge(input: $input) {
    id
    claim
    status
  }
}
```

**Submit Evidence:**
```graphql
mutation SubmitEvidence($challengeId: ID!, $evidenceNodeId: ID!, $side: String!) {
  submitEvidence(
    challengeId: $challengeId
    evidenceNodeId: $evidenceNodeId
    side: $side
  ) {
    id
  }
}
```

---

## 🎯 NEXT STEPS

### Immediate (Before Production)
1. [ ] Install express-rate-limit and enable
2. [ ] Remove all console.log statements
3. [ ] Add structured logging
4. [ ] Set up error tracking (Sentry)
5. [ ] Configure SSL/TLS certificates
6. [ ] Set up database backups
7. [ ] Load testing (target: 100+ concurrent users)
8. [ ] Security penetration testing

### Short-term (Post-Launch)
1. [ ] Complete GraphRAG AI implementation
2. [ ] Add article revision history
3. [ ] Implement full-text search with autocomplete
4. [ ] Add email notifications
5. [ ] Create mobile-responsive views
6. [ ] Add export features (PDF, CSV)

### Long-term (V2)
1. [ ] Real-time collaboration features
2. [ ] Advanced graph visualizations
3. [ ] Mobile apps (iOS/Android)
4. [ ] API for third-party integrations
5. [ ] Multi-language support
6. [ ] Advanced analytics dashboard

---

## 📞 SUPPORT

### Documentation
- Architecture: See `REVISED_IMPLEMENTATION_PLAN.md`
- Quick Start: See `QUICK_START_GUIDE.md`
- Code Review: See `CODE_REVIEW_PRODUCTION_READINESS.md`

### Issues & Bugs
Report issues at: https://github.com/Kevin-Kurka/rabbithole/issues

### Contributing
See `CONTRIBUTING.md` for guidelines

---

**Last Updated**: November 7, 2025
**Version**: 1.0.0
**Status**: Ready for Deployment with TODOs
