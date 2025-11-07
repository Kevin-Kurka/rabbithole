# SIMPLIFIED IMPLEMENTATION PLAN
## Wikipedia-Like Knowledge Graph Platform

**Status**: Current codebase is ~40% complete toward simplified MVP
**Estimated Time to MVP**: 6-10 days
**Last Updated**: November 7, 2025

---

## 🎯 VISION: Simplified Wikipedia-Like Platform

### Core Concept
A **public knowledge graph** where:
- **Articles** are the primary content (like Wikipedia articles)
- Other content types (documents, evidence, events, sources) **connect to Articles**
- **Graph edges** create rich interconnections
- **Public reading** (no auth required)
- **Auth required** to contribute/edit
- **Credibility scores** provide trust indicators
- **Formal inquiry system** for challenging facts
- **Discussion/comments** for collaboration

### Key Differentiators from Wikipedia
1. **Graph-first**: Everything is connected via typed relationships
2. **Credibility**: Transparent scoring based on sources and verification
3. **Structured inquiry**: Formal process for challenging claims
4. **Interactivity**: Real-time collaboration and discussion

---

## 📊 CURRENT STATE ANALYSIS

### Database Schema (init.sql)
**Current**: 8 tables
```
✓ NodeTypes      - Keep (defines Article, Document, Evidence, etc.)
✓ EdgeTypes      - Keep (defines relationship types)
✗ Graphs         - REMOVE (no longer using graph containers)
✓ Nodes          - Keep (but simplify: remove graph_id, is_level_0)
✓ Edges          - Keep (but simplify: remove graph_id, is_level_0)
✗ Challenges     - REMOVE (use Comments for discussions instead)
± Users          - Keep (needed for auth)
± Comments       - Keep (needed for discussions)
```

**Target**: 6 tables (4 core + 2 supporting)
- Core: NodeTypes, EdgeTypes, Nodes, Edges
- Supporting: Users, Comments

### Backend Architecture
**Current**: 27 resolvers, 50+ entity classes, 20+ services (8,900 lines)

**Target**: 6-8 resolvers, 5-6 entity classes, 3 services (~2,500 lines)

**Resolvers to KEEP**:
1. ✓ NodeResolver - CRUD for all nodes (Articles, Documents, etc.)
2. ✓ EdgeResolver - Create relationships between nodes
3. ✓ NodeTypeResolver - Manage node type definitions
4. ✓ EdgeTypeResolver - Manage edge type definitions
5. ✓ UserResolver - Auth and user management
6. ✓ CommentResolver - Discussions on nodes/edges
7. ± AIAssistantResolver - Basic AI queries (optional for MVP)
8. ± SearchResolver - Full-text search (add new)

**Resolvers to DELETE** (19 resolvers, ~6,400 lines):
```
DELETE:
- MethodologyResolver (1083 lines)
- MethodologyNodeTypeResolver
- MethodologyEdgeTypeResolver
- MethodologyWorkflowResolver
- UserMethodologyResolver (234 lines)
- VeracityResolver (560 lines)
- VeracityScoreHistoryResolver
- EvidenceResolver
- SourceResolver
- SourceCredibilityResolver
- ProcessValidationResolver (934 lines)
- ChallengeResolver (468 lines)
- CuratorResolver (947 lines)
- CuratorApplicationResolver
- CollaborationResolver (909 lines)
- GamificationResolver
- GraphVersionResolver
- ContentAnalysisResolver (451 lines)
- GraphTraversalResolver (423 lines)
```

### Frontend Architecture
**Current**: 3 pages, 95 components

**Status**: ✓ Recent cleanup removed login/register/graph pages (good progress!)

**Current Pages**:
1. `/` - Homepage with starfield + draggable nodes (MOCK DATA)
2. `/nodes/[id]` - Node details page (MOCK DATA)
3. Auth routes handled by NextAuth

**Components to DELETE** (~70 components):
```
DELETE:
- Methodology*.tsx (3 files)
- Challenge*.tsx (4 files)
- Veracity*.tsx (2 files)
- Reputation*.tsx
- GraphCanvas*.tsx (enhanced visualization - too complex)
- TimelineView.tsx
- ClusterView.tsx
- *Visualization*.tsx (3 files)
```

---

## 🚀 IMPLEMENTATION ROADMAP

### PHASE 1: Database Cleanup (1-2 days)

#### Tasks:
1. **Simplify init.sql**
   - Remove `Graphs` table
   - Remove `Challenges` table
   - Update `Nodes` table: remove `graph_id`, `is_level_0` columns
   - Update `Edges` table: remove `graph_id`, `is_level_0` columns
   - Keep Users and Comments tables
   - Add full-text search index on Nodes

2. **Create seed data**
   - Seed NodeTypes: Article, Document, Evidence, Event, Person, Source
   - Seed EdgeTypes: cites, supports, contradicts, relates-to, authored-by
   - Create sample Articles (JFK Assassination example)

3. **Update indexes**
   - Remove graph_id indexes
   - Add GIN index for full-text search on props->>'title'
   - Add HNSW index for vector similarity (ai column)

**Files to Modify**:
- `/home/user/rabbithole/init.sql` - Major simplification

**Acceptance Criteria**:
- ✓ Database starts with only 6 tables
- ✓ Seed data creates 5+ NodeTypes, 5+ EdgeTypes
- ✓ Sample Article nodes exist with connections
- ✓ Full-text search works on article titles

---

### PHASE 2: Backend Refactoring (2-3 days)

#### Step 1: Delete Unused Resolvers (1 hour)
```bash
# Delete methodology resolvers
rm backend/src/resolvers/Methodology*.ts

# Delete veracity/evidence resolvers
rm backend/src/resolvers/Veracity*.ts
rm backend/src/resolvers/Evidence*.ts
rm backend/src/resolvers/Source*.ts
rm backend/src/resolvers/ProcessValidation*.ts

# Delete curator/challenge resolvers
rm backend/src/resolvers/Challenge*.ts
rm backend/src/resolvers/Curator*.ts

# Delete collaboration/gamification
rm backend/src/resolvers/Collaboration*.ts
rm backend/src/resolvers/Gamification*.ts
rm backend/src/resolvers/GraphVersion*.ts
rm backend/src/resolvers/ContentAnalysis*.ts
rm backend/src/resolvers/GraphTraversal*.ts
```

#### Step 2: Delete Unused Entity Classes (1 hour)
```bash
# Keep only: Node, Edge, NodeType, EdgeType, User, Comment
cd backend/src/entities/

# Delete methodology entities
rm Methodology*.ts

# Delete veracity/evidence
rm VeracityScore*.ts
rm Evidence*.ts
rm Source*.ts

# Delete challenges
rm Challenge*.ts

# Delete curator/collaboration
rm *Curator*.ts
rm *Collaboration*.ts
rm GraphVersion*.ts

# Delete gamification
rm *Reputation*.ts
rm *Achievement*.ts
rm Leaderboard*.ts
rm UserStats.ts

# Delete promotion system
rm *Promotion*.ts
rm Consensus*.ts
```

#### Step 3: Simplify Core Resolvers (1 day)
**NodeResolver** (`backend/src/resolvers/NodeResolver.ts`):
- Remove graph_id references
- Implement article-specific queries:
  - `articles()` - List all Article nodes
  - `article(id)` - Get single article
  - `searchArticles(query)` - Full-text search
  - `createArticle(input)` - Create new article
  - `updateArticle(id, input)` - Edit article
  - `deleteArticle(id)` - Delete article (auth required)
  - `relatedNodes(nodeId)` - Get connected nodes via edges

**CommentResolver** (`backend/src/resolvers/CommentResolver.ts`):
- Implement discussion features:
  - `comments(nodeId)` - Get comments for a node
  - `createComment(nodeId, text)` - Add comment (auth required)
  - `deleteComment(id)` - Delete comment (owner only)

**SearchResolver** (NEW - `backend/src/resolvers/SearchResolver.ts`):
- Full-text search across articles
- Vector similarity search (find related articles)

#### Step 4: Update index.ts (1 hour)
```typescript
// backend/src/index.ts
const schema = await buildSchema({
  resolvers: [
    NodeResolver,
    EdgeResolver,
    NodeTypeResolver,
    EdgeTypeResolver,
    UserResolver,
    CommentResolver,
    SearchResolver, // NEW
    // Remove 19 other resolvers
  ],
  validate: true, // ⚠️ RE-ENABLE VALIDATION
});
```

#### Step 5: Remove Unused Services (30 minutes)
Keep only:
- `NotificationService.ts`
- `CacheService.ts`
- `AuthService.ts`

Delete all others (~17 service files)

**Acceptance Criteria**:
- ✓ Backend compiles without errors
- ✓ Only 8 resolvers registered
- ✓ Only 6 entity classes exist
- ✓ Input validation re-enabled
- ✓ Articles query returns sample data
- ✓ Full-text search works

---

### PHASE 3: Frontend Cleanup (1-2 days)

#### Step 1: Delete Unused Components (1 hour)
```bash
cd frontend/src/components/

# Delete methodology
rm Methodology*.tsx

# Delete challenges/veracity
rm Challenge*.tsx
rm Veracity*.tsx
rm Reputation*.tsx

# Delete complex visualizations
rm EnhancedGraphCanvas.tsx
rm GraphCanvas.stories.tsx
rm TimelineView.tsx
rm ClusterView.tsx
rm *Visualization*.tsx
```

#### Step 2: Delete Unused GraphQL Queries (30 minutes)
```bash
cd frontend/src/graphql/

# Keep only queries for nodes, edges, users, comments
rm queries/methodologies.ts
rm queries/challenges.ts
rm queries/promotions.ts
rm queries/collaboration.ts
rm ai-queries.ts
```

#### Step 3: Delete Unused Types (30 minutes)
```bash
cd frontend/src/types/

# Keep only: node.ts, edge.ts, user.ts, comment.ts
rm methodology.ts
rm challenge.ts
rm veracity.ts
rm promotion.ts
rm collaboration.ts
```

#### Step 4: Implement GraphQL Queries (2-3 hours)
Create `frontend/src/graphql/queries/articles.ts`:
```typescript
import { gql } from '@apollo/client';

export const GET_ARTICLES = gql`
  query GetArticles {
    articles {
      id
      props
      meta
      weight
      created_at
    }
  }
`;

export const GET_ARTICLE = gql`
  query GetArticle($id: ID!) {
    article(id: $id) {
      id
      props
      meta
      weight
      created_at
      edges {
        id
        edgeType {
          name
        }
        targetNode {
          id
          props
        }
      }
    }
  }
`;

export const SEARCH_ARTICLES = gql`
  query SearchArticles($query: String!) {
    searchArticles(query: $query) {
      id
      props
      meta
      weight
    }
  }
`;

export const CREATE_ARTICLE = gql`
  mutation CreateArticle($input: NodeInput!) {
    createArticle(input: $input) {
      id
      props
    }
  }
`;
```

**Acceptance Criteria**:
- ✓ Only 20-30 components remain
- ✓ GraphQL queries for articles exist
- ✓ Unused query files deleted
- ✓ Type definitions cleaned up

---

### PHASE 4: Wire Frontend to Backend (2-3 days)

#### Task 1: Homepage - Real Data (1 day)
**File**: `frontend/src/app/page.tsx`

Replace mock data with:
```typescript
import { useQuery } from '@apollo/client';
import { GET_ARTICLES } from '@/graphql/queries/articles';

export default function HomePage() {
  const { data, loading, error } = useQuery(GET_ARTICLES);

  const nodes = data?.articles.map(article => ({
    id: article.id,
    title: article.props.title,
    type: article.nodeType.name,
    credibility: article.weight * 100,
    x: Math.random() * 100,
    y: Math.random() * 100,
    connections: article.edges.map(e => e.targetNode.id)
  })) || [];

  // Rest of component...
}
```

#### Task 2: Node Details Page - Real Data (1 day)
**File**: `frontend/src/app/nodes/[id]/page.tsx`

Replace mock data with:
```typescript
import { useQuery } from '@apollo/client';
import { GET_ARTICLE } from '@/graphql/queries/articles';

export default function NodeDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, loading, error } = useQuery(GET_ARTICLE, {
    variables: { id }
  });

  const node = data?.article;

  // Render actual data...
}
```

#### Task 3: Add Article Creation Form (1 day)
Create `frontend/src/components/ArticleEditor.tsx`:
- Rich text editor (TipTap or similar)
- Title field
- Tags/categories
- Source citations
- Submit to createArticle mutation

#### Task 4: Add Comment Section (4-6 hours)
Create `frontend/src/components/CommentSection.tsx`:
- List comments for a node
- Add comment form (auth required)
- Delete own comments

#### Task 5: Restore Auth UI (2-3 hours)
Create simple login/register modals:
- `frontend/src/components/LoginModal.tsx`
- `frontend/src/components/RegisterModal.tsx`
- Wire to NextAuth API routes

**Acceptance Criteria**:
- ✓ Homepage shows real articles from database
- ✓ Clicking node navigates to real article details
- ✓ Article details show connected nodes
- ✓ Users can create new articles (when authenticated)
- ✓ Users can comment on articles (when authenticated)
- ✓ Auth modal appears when needed

---

### PHASE 5: Core Features (2-3 days)

#### Feature 1: Full-Text Search (1 day)
- Add search bar to homepage
- Implement SearchResolver on backend
- Wire to frontend with autocomplete

#### Feature 2: Credibility Scoring (1 day)
**Simple algorithm**:
```
Credibility = (
  sourceQuality * 0.4 +
  peerReview * 0.3 +
  citationCount * 0.2 +
  authorReputation * 0.1
) * 100
```

Store in `Nodes.weight` column (0.0-1.0)

#### Feature 3: Related Articles (1 day)
- Vector similarity search using pgvector
- Show "Related Articles" sidebar on node details page
- Based on content embeddings (ai column)

#### Feature 4: Article History (optional)
- Track edits over time
- Show "Last edited by X on Y"
- Diff viewer (future enhancement)

**Acceptance Criteria**:
- ✓ Search finds articles by title/content
- ✓ Credibility score visible on all articles
- ✓ Related articles shown on details page
- ✓ Article metadata shows edit history

---

### PHASE 6: Polish & Deploy (1-2 days)

#### Task 1: Security Hardening
- ✓ Enable input validation (validate: true)
- ✓ Add rate limiting middleware
- ✓ Fix CORS configuration (whitelist domains)
- ✓ Remove console.log statements
- ✓ Add proper error handling

#### Task 2: Performance Optimization
- Add database indexes
- Implement Redis caching for popular articles
- Optimize GraphQL queries (DataLoader for N+1)
- Lazy load article content (pagination)

#### Task 3: Documentation
- API documentation (GraphQL schema)
- User guide (how to create articles)
- Contributor guide
- README update

#### Task 4: Deployment
- Docker Compose for production
- Environment variables checklist
- Health check endpoints
- Database backup strategy

**Acceptance Criteria**:
- ✓ All security issues from code review fixed
- ✓ Page load time < 2 seconds
- ✓ API documentation accessible
- ✓ Deployment guide exists

---

## 📋 IMPLEMENTATION CHECKLIST

### Week 1: Core Simplification
**Day 1-2: Database & Backend**
- [ ] Simplify init.sql to 6 tables
- [ ] Create seed data for NodeTypes, EdgeTypes
- [ ] Delete 19 unused resolvers
- [ ] Delete 40+ unused entity classes
- [ ] Simplify NodeResolver for articles
- [ ] Re-enable input validation

**Day 3-4: Frontend Cleanup**
- [ ] Delete 70 unused components
- [ ] Delete unused GraphQL query files
- [ ] Create articles.ts query file
- [ ] Wire homepage to GET_ARTICLES query
- [ ] Wire node details to GET_ARTICLE query

**Day 5: Auth & Creation**
- [ ] Restore login/register UI (modals)
- [ ] Implement article creation form
- [ ] Implement comment section
- [ ] Test end-to-end flow

### Week 2: Features & Polish
**Day 6-7: Core Features**
- [ ] Implement full-text search
- [ ] Implement credibility scoring
- [ ] Implement related articles (vector search)
- [ ] Add article history tracking

**Day 8-9: Security & Performance**
- [ ] Fix all critical security issues
- [ ] Add rate limiting
- [ ] Optimize database queries
- [ ] Implement caching

**Day 10: Deploy**
- [ ] Write deployment documentation
- [ ] Test production build
- [ ] Deploy to staging
- [ ] User acceptance testing

---

## 🎯 MVP FEATURE SET

### Must-Have (Week 1)
- ✓ Public article browsing (no auth)
- ✓ Article creation (auth required)
- ✓ Comments/discussion (auth required)
- ✓ Basic credibility score
- ✓ Graph connections visible
- ✓ User authentication

### Nice-to-Have (Week 2)
- ✓ Full-text search
- ✓ Related articles (AI-powered)
- ✓ Article history
- ✓ Rich text editor
- ✓ Inline citations

### Future Enhancements (Post-MVP)
- Article versioning with diffs
- Formal inquiry system (structured challenges)
- Voting/consensus mechanisms
- Gamification (reputation, badges)
- Advanced visualizations
- Real-time collaboration
- Methodology templates

---

## 📊 COMPLEXITY COMPARISON

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Database Tables | 50+ | 6 | 88% |
| Backend Resolvers | 27 | 8 | 70% |
| Entity Classes | 50 | 6 | 88% |
| Services | 20+ | 3 | 85% |
| Frontend Components | 95 | 25-30 | 68% |
| Lines of Code (Backend) | 8,900 | 2,500 | 72% |

---

## 🚨 CRITICAL DECISIONS

### Decision 1: Remove Graph Containers ✓
**Rationale**: Simplified model doesn't need separate "Graphs" - all nodes exist in one shared namespace

**Changes**:
- Remove Graphs table
- Remove graph_id from Nodes/Edges
- All articles are public by default
- Privacy controlled at node level (props.visibility)

### Decision 2: Comments Replace Challenges ✓
**Rationale**: Formal inquiry system is over-engineered for MVP

**Changes**:
- Use Comments for all discussions
- Add props.isInquiry flag to differentiate formal challenges
- Future: Upgrade to structured Challenge system if needed

### Decision 3: Simple Credibility Score ✓
**Rationale**: Complex veracity algorithm is unnecessary for MVP

**Changes**:
- Store single credibility % in Nodes.weight (0.0-1.0)
- Calculate based on: sources, peer review, citations, author
- Future: Add transparent breakdown view

### Decision 4: Keep Vector Search ✓
**Rationale**: AI-powered related articles are a key differentiator

**Keep**:
- pgvector extension
- Nodes.ai column (1536-dimensional embeddings)
- Vector similarity queries for "Related Articles"

---

## 📁 FILES TO DELETE (Summary)

**Backend** (~25 files, ~6,400 lines):
```
backend/src/resolvers/Methodology*.ts (5 files)
backend/src/resolvers/Veracity*.ts (3 files)
backend/src/resolvers/Evidence*.ts
backend/src/resolvers/Source*.ts (2 files)
backend/src/resolvers/Challenge*.ts (2 files)
backend/src/resolvers/Curator*.ts (2 files)
backend/src/resolvers/Collaboration*.ts
backend/src/resolvers/Gamification*.ts
backend/src/resolvers/GraphVersion*.ts
backend/src/resolvers/ContentAnalysis*.ts
backend/src/resolvers/GraphTraversal*.ts
backend/src/resolvers/ProcessValidation*.ts

backend/src/entities/Methodology*.ts (4 files)
backend/src/entities/VeracityScore*.ts (2 files)
backend/src/entities/Challenge*.ts (5 files)
backend/src/entities/Evidence*.ts (3 files)
backend/src/entities/Source*.ts (2 files)
backend/src/entities/*Curator*.ts (4 files)
backend/src/entities/*Collaboration*.ts (2 files)
backend/src/entities/*Gamification*.ts (3 files)
backend/src/entities/Graph*.ts (multiple)
backend/src/entities/*Promotion*.ts (3 files)
backend/src/entities/Consensus*.ts (2 files)
backend/src/entities/UserReputation.ts
backend/src/entities/UserStats.ts
backend/src/entities/UserAchievement*.ts (2 files)
backend/src/entities/LeaderboardEntry.ts

backend/src/services/ (keep only 3 files, delete ~17)
```

**Frontend** (~70 files):
```
frontend/src/components/Methodology*.tsx (3 files)
frontend/src/components/Challenge*.tsx (4 files)
frontend/src/components/Veracity*.tsx (2 files)
frontend/src/components/Reputation*.tsx
frontend/src/components/EnhancedGraphCanvas.tsx
frontend/src/components/GraphCanvas.stories.tsx
frontend/src/components/TimelineView.tsx
frontend/src/components/ClusterView.tsx
frontend/src/components/*Visualization*.tsx (3 files)

frontend/src/graphql/queries/methodologies.ts
frontend/src/graphql/queries/challenges.ts
frontend/src/graphql/queries/promotions.ts
frontend/src/graphql/queries/collaboration.ts
frontend/src/graphql/ai-queries.ts

frontend/src/types/methodology.ts
frontend/src/types/challenge.ts
frontend/src/types/veracity.ts
frontend/src/types/promotion.ts
frontend/src/types/collaboration.ts

frontend/src/hooks/useCollaboration.ts
frontend/src/hooks/useAIAssistant.ts

frontend/src/mocks/methodologies.ts
frontend/src/mocks/promotionEligibility.ts

frontend/src/utils/challengeHelpers.ts
```

---

## 🎉 SUCCESS METRICS

### Technical Metrics
- ✓ Codebase reduced by 70%+
- ✓ Complexity reduced by 85%+
- ✓ Build time < 30 seconds
- ✓ Test coverage > 60%
- ✓ Zero critical security issues

### User Metrics (Post-Launch)
- 100+ articles created in first month
- 500+ comments/discussions
- 50+ active contributors
- < 2 second page load time
- > 90% uptime

---

## 📞 NEXT STEPS

### Immediate (Today)
1. Review and approve this plan
2. Create GitHub issues for each phase
3. Set up project board (Kanban)

### This Week
1. Start Phase 1: Database cleanup
2. Start Phase 2: Backend refactoring
3. Daily standup to track progress

### Next Week
1. Complete frontend wiring
2. Implement core features
3. Security hardening
4. Deploy to staging

---

## 📚 APPENDIX

### Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, Apollo Server 4, TypeGraphQL
- **Database**: PostgreSQL 15, pgvector extension
- **Cache**: Redis
- **Auth**: NextAuth.js with JWT
- **Search**: PostgreSQL full-text search + pgvector
- **Deployment**: Docker, AWS ECS

### Helpful Commands
```bash
# Start all services
docker-compose up --build

# Initialize database
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# Backend dev
cd backend && npm start

# Frontend dev
cd frontend && npm run dev

# Run tests
cd backend && npm test
```

---

**Document Version**: 1.0
**Author**: Claude (AI Assistant)
**Status**: Ready for Review
