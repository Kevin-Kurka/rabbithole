# Project Rabbit Hole

[![Test Suite](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/test.yml)
[![Lint & Type Check](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/lint.yml/badge.svg)](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/lint.yml)
[![Coverage Report](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/coverage.yml/badge.svg)](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/coverage.yml)
[![Deploy](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/rabbithole/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/rabbithole/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/rabbithole)

A collaborative knowledge graph platform for evidence-based inquiry. Build interactive graph visualizations to explore complex topics, connect evidence, and develop theories using structured methodologies.

## Features

- **Two-Tiered Knowledge System**
  - Level 0: Immutable truth layer with verified facts (veracity = 1.0)
  - Level 1: User workspace for theory building and challenges (veracity 0.0-1.0)

- **Structured Methodologies**
  - Scientific Method
  - Legal Discovery
  - Toulmin Argumentation

- **Real-Time Collaboration**
  - WebSocket-based live updates
  - Multi-user graph editing
  - Comment system and challenges

- **Advanced Features**
  - Vector similarity search (pgvector)
  - Content fingerprinting for duplicate detection
  - AI-assisted evidence connection (GraphRAG)
  - Veracity scoring and community voting

## Technology Stack

### Backend
- Node.js + TypeScript
- Apollo Server (GraphQL)
- TypeGraphQL (code-first schema)
- PostgreSQL with pgvector
- Redis (pub/sub)
- RabbitMQ (message queue)

### Frontend
- Next.js 15 (App Router)
- React 19 + TypeScript
- Apollo Client
- ReactFlow (graph visualization)
- NextAuth.js (authentication)
- Tailwind CSS

### Infrastructure
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- AWS (ECS, RDS, S3)

## Getting Started

### Prerequisites

- Docker Desktop
- Node.js 20+
- npm or yarn
- PostgreSQL 14+ (with pgvector)

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/rabbithole.git
cd rabbithole
```

2. Create environment files:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. Start all services with Docker:
```bash
docker-compose up --build
```

4. Initialize the database:
```bash
# Wait for containers to start, then run:
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql
```

5. Seed Level 0 data (optional):
```bash
cd backend
npm run populate-level0
```

### Access Points

- **Frontend**: http://localhost:3001
- **GraphQL API**: http://localhost:4000/graphql
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **RabbitMQ Management**: http://localhost:15672 (admin/admin)

## Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build TypeScript
npm run build

# Run database seeding
npm run seed:docker

# Start vectorization worker
npm run worker:dev
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Run migrations
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < migrations/001_initial.sql

# Backup database
docker exec rabbithole-postgres-1 pg_dump -U postgres rabbithole_db > backup.sql

# Restore database
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backup.sql
```

## Project Structure

```
rabbithole/
├── backend/
│   ├── src/
│   │   ├── entities/         # TypeGraphQL entity definitions
│   │   ├── resolvers/        # GraphQL resolvers
│   │   ├── services/         # Business logic
│   │   ├── workers/          # Background workers
│   │   ├── utils/            # Utility functions
│   │   ├── __tests__/        # Test files
│   │   └── index.ts          # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── jest.config.js
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app directory
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and configs
│   │   └── styles/           # CSS/Tailwind
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   └── workflows/            # CI/CD pipelines
│       ├── test.yml          # Test suite
│       ├── lint.yml          # Linting & type checks
│       ├── coverage.yml      # Coverage reports
│       └── deploy.yml        # Deployment
│
├── docker-compose.yml        # Local development
├── init.sql                  # Database schema
└── README.md
```

## API Documentation

### GraphQL Schema

The API uses a code-first schema generated from TypeGraphQL decorators. Key types:

#### Queries
```graphql
type Query {
  # Nodes
  node(id: ID!): Node
  nodes(graphId: ID!, filters: NodeFilters): [Node!]!

  # Graphs
  graph(id: ID!): Graph
  graphs(userId: ID): [Graph!]!

  # Users
  me: User
  user(id: ID!): User

  # Search
  searchNodes(query: String!, graphId: ID): [Node!]!
  similarNodes(nodeId: ID!, limit: Int): [Node!]!
}
```

#### Mutations
```graphql
type Mutation {
  # Node operations
  createNode(input: NodeInput!): Node!
  updateNode(id: ID!, input: NodeInput!): Node!
  deleteNode(id: ID!): Boolean!

  # Edge operations
  createEdge(input: EdgeInput!): Edge!
  deleteEdge(id: ID!): Boolean!

  # Graph operations
  createGraph(input: GraphInput!): Graph!
  updateGraph(id: ID!, input: GraphInput!): Graph!

  # Challenges
  createChallenge(input: ChallengeInput!): Challenge!
  voteOnChallenge(id: ID!, vote: VoteType!): Challenge!
}
```

#### Subscriptions
```graphql
type Subscription {
  nodeUpdated(graphId: ID!): Node!
  edgeUpdated(graphId: ID!): Edge!
  newComment(nodeId: ID!): Comment!
  graphMemberJoined(graphId: ID!): User!
}
```

### REST Endpoints

Health check:
```bash
GET /health
Response: { "status": "healthy", "timestamp": "2025-01-15T00:00:00Z" }
```

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/rabbithole_db

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
VECTORIZATION_QUEUE_NAME=vectorization_queue

# OpenAI (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=4000
NODE_ENV=development

# AWS (for S3 uploads)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=rabbithole-uploads
```

### Frontend (.env)
```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:4000/graphql

# Auth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret

# Features
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_CHALLENGES=true
```

## Testing Strategy

### Backend Tests
- **Unit Tests**: Individual resolver/service functions
- **Integration Tests**: Database operations and GraphQL queries
- **E2E Tests**: Complete user workflows

Coverage goals:
- Critical paths: 100%
- Overall: 80%+
- Minimum threshold: 60%

### Frontend Tests
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright
- **Visual Regression**: Chromatic (future)

## CI/CD Pipeline

### Workflows

1. **Test Suite** (`test.yml`)
   - Runs on: Push to main/develop, all PRs
   - Backend tests with PostgreSQL/Redis/RabbitMQ
   - Frontend build verification
   - Integration tests
   - Coverage reporting

2. **Lint & Type Check** (`lint.yml`)
   - Runs on: Push to main/develop, all PRs
   - ESLint + TypeScript compilation
   - Security audits (npm audit)
   - Code quality checks (no console.log, TODOs)
   - Docker configuration validation

3. **Coverage Report** (`coverage.yml`)
   - Runs on: Push, PRs, weekly schedule
   - Detailed coverage metrics
   - Trend analysis
   - Codecov integration
   - PR comments with coverage changes

4. **Deploy** (`deploy.yml`)
   - Runs on: Push to main (production), develop (staging)
   - Docker image builds
   - Blue-green deployment to AWS ECS
   - Database migrations
   - Smoke tests
   - Automatic rollback on failure

### Deployment Strategy

**Staging** (develop branch):
- Single instance
- Auto-deploy on commit
- Test environment
- URL: https://staging.rabbithole.app

**Production** (main branch):
- Multi-instance (3+ replicas)
- Blue-green deployment
- Database backup before deploy
- Smoke tests required
- Manual approval option
- URL: https://rabbithole.app

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat(scope): add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Architecture Decisions

### Why TypeGraphQL?
Code-first schema generation keeps TypeScript types and GraphQL schema in sync, reducing duplication and potential bugs.

### Why pgvector?
Native PostgreSQL extension for vector similarity search enables efficient AI-powered features without separate vector database.

### Why Redis Pub/Sub?
Enables horizontal scaling of WebSocket servers while maintaining real-time collaboration across instances.

### Why RabbitMQ?
Reliable message queue for background processing (vectorization, notifications) with at-least-once delivery guarantees.

## Performance Considerations

- **Large Graphs**: Viewport-based loading for 1000+ nodes
- **Vector Search**: HNSW index for sub-100ms similarity queries
- **Real-Time Updates**: Redis pub/sub scales to 1000s of concurrent users
- **Database**: Connection pooling (max 20 connections)
- **Caching**: Apollo Client + Redis for frequently accessed data

## Security

- Input validation with class-validator
- Parameterized SQL queries (no string interpolation)
- JWT authentication with NextAuth.js
- Rate limiting on public APIs
- HTTPS in production
- Regular dependency audits
- No secrets in code/logs

## Monitoring & Observability

- CloudWatch dashboards (AWS)
- Error tracking: Sentry (future)
- APM: New Relic (future)
- Log aggregation: CloudWatch Logs

## License

MIT License - see LICENSE file for details

## Contact

- GitHub Issues: [Report bugs](https://github.com/YOUR_USERNAME/rabbithole/issues)
- Discussions: [Ask questions](https://github.com/YOUR_USERNAME/rabbithole/discussions)
- Email: support@rabbithole.app

## Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Graph visualization: [ReactFlow](https://reactflow.dev/)
- Vector search: [pgvector](https://github.com/pgvector/pgvector)
- Icon library: [Lucide](https://lucide.dev/)

---

**Status**: Active Development | **Version**: 0.1.0 (MVP Phase 1)
