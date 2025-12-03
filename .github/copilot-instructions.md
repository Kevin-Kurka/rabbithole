## Purpose

This file gives concise, repo-specific guidance to AI coding assistants working in Project Rabbit Hole. Focus on being productive quickly: follow the 4-table schema, use JSONB `props`, and prefer node/edge types over new tables.

**Big Picture**
- **Backend**: `backend/` is a TypeGraphQL Node/TypeScript API that uses PostgreSQL + `pgvector`, Redis (pub/sub), and RabbitMQ (workers).
- **Frontend**: `frontend/` is a Next.js app (App Router) using Apollo Client and ReactFlow for graph visualization.
- **Workers**: Two main workers live in `backend/src/workers/`: vectorization (`VectorizationWorker`) and media processing (`MediaProcessingWorker`).

**Critical Conventions (Do not break)**
- **4 core tables only**: `public."NodeTypes"`, `public."EdgeTypes"`, `public."Nodes"`, `public."Edges"` (plus `schema_migrations`). Never add new tables for features.
- **Props-only storage**: All domain data belongs in the JSONB `props` column. Query/parse with `typeof row.props === 'string' ? JSON.parse(row.props) : row.props`.
- **PascalCase quoted table names**: Use `public."Nodes"` style in raw SQL.
- **Migrations**: Create numbered SQL files under `backend/migrations/` (follow existing `NNN_description.up.sql` pattern). Use Node/Edge types to add features.

**Developer Workflows & Key Commands**
- **Start all services**: `docker-compose up --build` (or for dev override: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`).
- **Init DB**: `docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql`.
- **Backend dev**: `cd backend && npm install && npm start`.
- **Workers**: `cd backend && npm run worker:dev` (dev) or `npm run worker:start` / `npm run worker:media`.
- **Migrations**: `cd backend && npm run migrate` and check with `npm run migrate:status`.
- **Tests**: Backend `cd backend && npm test` / `npm run test:coverage`; E2E `npm run test:e2e` from repo root (uses Playwright).

**Patterns & Examples**
- **Create a new feature**: model it as a node type (insert into `NodeTypes`) and, if needed, an edge type. Store all fields in `props` (JSONB). See `CLAUDE.md` examples and `backend/src/resolvers/VeracityResolver.ts` for correct patterns.
- **Vector search**: `ORDER BY ai <=> $1::vector` (pgvector distance operator). Vectors are 1536-dim produced by embeddings.
- **Graph traversal**: use recursive CTEs for depth-limited traversals (see `CLAUDE.md` SQL snippet).

**Where to look (quick references)**
- Schema & migrations: `backend/migrations/` (e.g. `001_create_node_types.up.sql` → verify structure).
- Resolver examples: `backend/src/resolvers/VeracityResolver.ts`, `backend/src/resolvers/GraphResolver.ts`.
- Entities & schema: `backend/src/entities/` and `backend/src/index.ts` (buildSchema registration).
- Workers: `backend/src/workers/VectorizationWorker.ts`, `backend/src/workers/MediaProcessingWorker.ts`.
- Dev scripts: `backend/package.json` (migrate, seed, workers), root `package.json` (Playwright scripts).

**Quick troubleshooting notes**
- Containers hostnames: `postgres`, `redis`, `rabbitmq`, `docling`, `api` — use these inside Docker.
- If tests or migrations fail: check container logs `docker logs <container>` and ensure `DATABASE_URL` points to the dev Postgres provided by compose.
- Do not edit applied migrations; add new migration files instead.

If anything here is unclear or you want me to expand examples (migration template, resolver stub, or a short PR-ready patch), tell me which area to expand.
