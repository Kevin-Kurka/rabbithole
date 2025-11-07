# QUICK START GUIDE
## Getting Rabbit Hole to MVP in 10 Days

**Goal**: Transform current over-engineered codebase into a simple, Wikipedia-like knowledge graph platform

---

## 🎯 THE VISION

A **public knowledge graph** where:
- ✓ Articles are the main content (like Wikipedia)
- ✓ Graph connections link everything together
- ✓ Public reading (no auth)
- ✓ Auth required to contribute
- ✓ Simple credibility scores
- ✓ Discussion via comments

---

## 📊 CURRENT STATUS

**Database**: 8 tables → Need 6 (4 core + Users + Comments)
**Backend**: 27 resolvers → Need 8
**Frontend**: Partially cleaned up, but using MOCK data
**Estimate**: ~40% complete toward MVP

---

## ⚡ 10-DAY SPRINT PLAN

### 🗓️ DAYS 1-2: Database & Backend Cleanup

**Goal**: Simplify database schema and delete unused backend code

#### Database (init.sql)
```sql
-- REMOVE these tables:
DROP TABLE "Graphs";
DROP TABLE "Challenges";

-- MODIFY Nodes table:
ALTER TABLE "Nodes" DROP COLUMN graph_id;
ALTER TABLE "Nodes" DROP COLUMN is_level_0;

-- MODIFY Edges table:
ALTER TABLE "Edges" DROP COLUMN graph_id;
ALTER TABLE "Edges" DROP COLUMN is_level_0;

-- ADD search index:
CREATE INDEX nodes_title_search ON "Nodes"
  USING GIN (to_tsvector('english', props->>'title'));
```

#### Backend Cleanup
```bash
cd backend/src

# Delete 19 unused resolvers
rm resolvers/Methodology*.ts
rm resolvers/Veracity*.ts
rm resolvers/Evidence*.ts
rm resolvers/Source*.ts
rm resolvers/Challenge*.ts
rm resolvers/Curator*.ts
rm resolvers/Collaboration*.ts
rm resolvers/Gamification*.ts
rm resolvers/GraphVersion*.ts
rm resolvers/ContentAnalysis*.ts
rm resolvers/GraphTraversal*.ts
rm resolvers/ProcessValidation*.ts

# Delete 40+ unused entities
rm entities/Methodology*.ts
rm entities/VeracityScore*.ts
rm entities/Challenge*.ts
rm entities/Evidence*.ts
rm entities/Source*.ts
rm entities/*Curator*.ts
rm entities/*Collaboration*.ts
rm entities/*Gamification*.ts
rm entities/*Promotion*.ts
rm entities/Consensus*.ts
rm entities/UserReputation.ts
rm entities/UserStats.ts
rm entities/UserAchievement*.ts
rm entities/LeaderboardEntry.ts

# Keep only these resolvers:
# - NodeResolver
# - EdgeResolver
# - NodeTypeResolver
# - EdgeTypeResolver
# - UserResolver
# - CommentResolver
# - AIAssistantResolver (optional)

# Update index.ts
# Remove 19 resolver imports
# Change validate: false → validate: true
```

**Deliverable**: Backend compiles with only 8 resolvers

---

### 🗓️ DAYS 3-4: Frontend Cleanup & Wiring

**Goal**: Delete unused frontend code and connect to real GraphQL queries

#### Frontend Cleanup
```bash
cd frontend/src

# Delete unused components
rm components/Methodology*.tsx
rm components/Challenge*.tsx
rm components/Veracity*.tsx
rm components/Reputation*.tsx
rm components/EnhancedGraphCanvas.tsx
rm components/TimelineView.tsx
rm components/ClusterView.tsx
rm components/*Visualization*.tsx

# Delete unused queries
rm graphql/queries/methodologies.ts
rm graphql/queries/challenges.ts
rm graphql/queries/promotions.ts
rm graphql/queries/collaboration.ts
rm graphql/ai-queries.ts

# Delete unused types
rm types/methodology.ts
rm types/challenge.ts
rm types/veracity.ts
rm types/promotion.ts
rm types/collaboration.ts
```

#### Create GraphQL Queries
Create `frontend/src/graphql/queries/articles.ts`:
```typescript
import { gql } from '@apollo/client';

export const GET_ARTICLES = gql`
  query GetArticles {
    nodes(filter: { nodeType: "Article" }) {
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
    node(id: $id) {
      id
      props
      meta
      weight
      created_at
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
`;
```

#### Wire Homepage to Real Data
Update `frontend/src/app/page.tsx`:
```typescript
import { useQuery } from '@apollo/client';
import { GET_ARTICLES } from '@/graphql/queries/articles';

export default function HomePage() {
  const { data, loading } = useQuery(GET_ARTICLES);

  const nodes = data?.nodes.map(node => ({
    id: node.id,
    title: node.props.title,
    type: node.meta.nodeTypeName,
    credibility: node.weight * 100,
    x: Math.random() * 100,
    y: Math.random() * 100,
  })) || [];

  // Render nodes (keep existing UI)
}
```

**Deliverable**: Homepage shows real articles from database

---

### 🗓️ DAY 5: Auth & Article Creation

**Goal**: Restore auth UI and enable article creation

#### Restore Auth UI
Create `frontend/src/components/LoginModal.tsx`:
```typescript
// Simple modal with username/password form
// Calls NextAuth signIn()
```

Create `frontend/src/components/RegisterModal.tsx`:
```typescript
// Simple modal with username/email/password form
// Calls backend register mutation
```

#### Article Editor
Create `frontend/src/components/ArticleEditor.tsx`:
```typescript
import { useMutation } from '@apollo/client';
import { CREATE_NODE } from '@/graphql/mutations/nodes';

export default function ArticleEditor() {
  const [createNode] = useMutation(CREATE_NODE);

  const handleSubmit = async (data) => {
    await createNode({
      variables: {
        input: {
          nodeTypeId: ARTICLE_TYPE_ID,
          props: {
            title: data.title,
            content: data.content,
            tags: data.tags,
          },
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Article title" />
      <textarea name="content" placeholder="Content..." />
      <button type="submit">Create Article</button>
    </form>
  );
}
```

**Deliverable**: Users can sign up, log in, and create articles

---

### 🗓️ DAYS 6-7: Core Features

**Goal**: Implement search, comments, and credibility scoring

#### Full-Text Search (Backend)
Update `backend/src/resolvers/NodeResolver.ts`:
```typescript
@Query(() => [Node])
async searchArticles(
  @Arg('query') query: string,
  @Ctx() { pool }: Context
): Promise<Node[]> {
  const result = await pool.query(`
    SELECT * FROM public."Nodes"
    WHERE to_tsvector('english', props->>'title' || ' ' || props->>'content')
      @@ plainto_tsquery('english', $1)
    ORDER BY ts_rank(
      to_tsvector('english', props->>'title'),
      plainto_tsquery('english', $1)
    ) DESC
    LIMIT 20
  `, [query]);

  return result.rows;
}
```

#### Comment Section (Frontend)
Create `frontend/src/components/CommentSection.tsx`:
```typescript
import { useQuery, useMutation } from '@apollo/client';
import { GET_COMMENTS, CREATE_COMMENT } from '@/graphql/queries/comments';

export default function CommentSection({ nodeId }) {
  const { data } = useQuery(GET_COMMENTS, { variables: { nodeId } });
  const [createComment] = useMutation(CREATE_COMMENT);

  return (
    <div>
      {data?.comments.map(comment => (
        <div key={comment.id}>
          <p>{comment.text}</p>
          <small>by {comment.author.username}</small>
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <textarea placeholder="Add comment..." />
        <button>Post</button>
      </form>
    </div>
  );
}
```

#### Credibility Scoring
Simple algorithm stored in `Nodes.weight`:
```typescript
// Backend service
calculateCredibility(node: Node): number {
  const sourceQuality = 0.8; // Based on source credibility
  const peerReview = 0.9;    // Based on community validation
  const citations = 0.7;     // Based on citation count
  const author = 0.85;       // Based on author reputation

  return (
    sourceQuality * 0.4 +
    peerReview * 0.3 +
    citations * 0.2 +
    author * 0.1
  );
}
```

**Deliverable**: Search works, comments functional, credibility visible

---

### 🗓️ DAYS 8-9: Security & Performance

**Goal**: Fix critical security issues and optimize performance

#### Security Fixes

1. **Enable Input Validation**
```typescript
// backend/src/index.ts
const schema = await buildSchema({
  resolvers: [...],
  validate: true, // ✓ ENABLE
});
```

2. **Add Rate Limiting**
```typescript
// backend/src/index.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/graphql', limiter);
```

3. **Fix CORS**
```typescript
// backend/src/index.ts
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
```

4. **Remove Console Logs**
```bash
# Find and remove all console.log
grep -r "console\.log" backend/src/ | wc -l
# (422 found - remove them all)
```

#### Performance Optimizations

1. **Add Database Indexes**
```sql
CREATE INDEX nodes_created_at ON "Nodes" (created_at DESC);
CREATE INDEX edges_source_target ON "Edges" (source_node_id, target_node_id);
```

2. **Implement Caching**
```typescript
// Cache popular articles in Redis
@Query(() => Node)
async article(@Arg('id') id: string, @Ctx() { redis }: Context) {
  const cached = await redis.get(`article:${id}`);
  if (cached) return JSON.parse(cached);

  const article = await fetchArticle(id);
  await redis.setex(`article:${id}`, 3600, JSON.stringify(article));

  return article;
}
```

**Deliverable**: All critical security issues fixed, page load < 2s

---

### 🗓️ DAY 10: Deploy & Test

**Goal**: Deploy to production and validate end-to-end

#### Pre-Deployment Checklist
```
✓ Database migrations tested
✓ All env variables documented
✓ Secrets in environment (not hardcoded)
✓ Rate limiting enabled
✓ Input validation enabled
✓ CORS configured
✓ HTTPS/TLS configured
✓ Health check endpoint working
✓ Monitoring configured
✓ Backup strategy documented
```

#### Deployment Steps
```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Run database migrations
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# 3. Seed initial data
docker exec rabbithole-api-1 npm run seed:nodetypes

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify health
curl http://localhost:4000/health
curl http://localhost:3000/
```

#### End-to-End Testing
```
1. ✓ Visit homepage → See articles
2. ✓ Click article → See details page
3. ✓ Click "Create Article" → Login modal appears
4. ✓ Register new account → Success
5. ✓ Create article → Article appears
6. ✓ Add comment → Comment appears
7. ✓ Search for article → Results appear
8. ✓ View related articles → Connections shown
```

**Deliverable**: Production deployment running, all features tested

---

## 📋 FILES TO MODIFY (Quick Reference)

### Database
- ✏️ `init.sql` - Simplify to 6 tables

### Backend
- ✏️ `backend/src/index.ts` - Remove 19 resolver imports, enable validation
- ✏️ `backend/src/resolvers/NodeResolver.ts` - Add article queries
- ✏️ `backend/src/resolvers/CommentResolver.ts` - Implement comments
- ➕ `backend/src/resolvers/SearchResolver.ts` - NEW: Full-text search
- 🗑️ Delete 19 resolver files
- 🗑️ Delete 40+ entity files
- 🗑️ Delete 17 service files

### Frontend
- ✏️ `frontend/src/app/page.tsx` - Wire to real GraphQL
- ✏️ `frontend/src/app/nodes/[id]/page.tsx` - Wire to real GraphQL
- ➕ `frontend/src/graphql/queries/articles.ts` - NEW: Article queries
- ➕ `frontend/src/components/ArticleEditor.tsx` - NEW: Create articles
- ➕ `frontend/src/components/CommentSection.tsx` - NEW: Comments
- ➕ `frontend/src/components/LoginModal.tsx` - NEW: Auth UI
- 🗑️ Delete 70 unused component files
- 🗑️ Delete 10 unused query files
- 🗑️ Delete 10 unused type files

---

## 🚨 CRITICAL FIXES (Must Do)

These issues from the original code review MUST be fixed:

1. ✓ Remove hardcoded secrets (docker-compose.yml)
2. ✓ Enable input validation (backend/src/index.ts)
3. ✓ Remove header-based auth bypass (backend/src/middleware/auth.ts)
4. ✓ Add rate limiting
5. ✓ Fix CORS configuration
6. ✓ Remove console.log statements (422 instances)
7. ✓ Simplify database schema (50 tables → 6)
8. ✓ Delete unused code (72% reduction)

---

## 📊 SUCCESS METRICS

After 10 days, you should have:

- ✓ Working MVP deployed
- ✓ 70% less code complexity
- ✓ Zero critical security issues
- ✓ < 2 second page load time
- ✓ End-to-end user flow tested

**User Flow**:
1. Visit site → Browse articles (no auth)
2. Click article → See details + connections
3. Click "Create" → Login required
4. Sign up → Create account
5. Create article → Article published
6. Add comment → Discussion started
7. Search → Find related articles

---

## 🎯 WHAT GETS CUT (For Now)

These features are **deferred to v2**:

- ❌ Methodology templates
- ❌ Formal inquiry/challenge system
- ❌ Complex veracity scoring algorithm
- ❌ Gamification (reputation, badges, leaderboards)
- ❌ Graph versioning
- ❌ Multi-agent AI orchestrator
- ❌ Level 0/Level 1 promotion pipeline
- ❌ Curator roles and permissions
- ❌ Advanced graph visualizations
- ❌ Timeline/cluster views
- ❌ Consensus voting mechanisms

**Rationale**: These are nice-to-have features that add complexity without being essential for core Wikipedia-like functionality.

---

## 💡 KEY ARCHITECTURAL DECISIONS

### 1. No Graph Containers
**Before**: Nodes/Edges belonged to "Graphs"
**After**: All nodes exist in one shared public namespace

**Why**: Simpler model, matches Wikipedia's single shared space

### 2. Comments Replace Challenges
**Before**: Complex Challenge system with voting
**After**: Simple comments, can be flagged as "inquiry"

**Why**: Easier to implement, still allows discussions

### 3. Simple Credibility Score
**Before**: Multi-factor veracity algorithm
**After**: Single 0-100% score in `Nodes.weight`

**Why**: Transparent, easy to understand, sufficient for MVP

### 4. Keep Vector Search
**Before**: pgvector for AI features
**After**: Keep it for "Related Articles"

**Why**: Key differentiator from Wikipedia, already works

---

## 🔧 HELPFUL COMMANDS

```bash
# Start development environment
docker-compose up --build

# Initialize database
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < init.sql

# Backend development
cd backend && npm start

# Frontend development
cd frontend && npm run dev

# Run backend tests
cd backend && npm test

# Check TypeScript errors
cd backend && npm run build
cd frontend && npm run build

# Database CLI
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# View logs
docker logs rabbithole-api-1 -f
docker logs rabbithole-frontend-1 -f
```

---

## 📞 SUPPORT

If you get stuck:
1. Check `SIMPLIFIED_IMPLEMENTATION_PLAN.md` for detailed instructions
2. Review original code review: `CODE_REVIEW_PRODUCTION_READINESS.md`
3. Refer to `CLAUDE.md` for project architecture

---

**Last Updated**: November 7, 2025
**Status**: Ready to Execute
**Estimated Time**: 10 days (1 developer) or 5 days (2 developers in parallel)

Let's build this! 🚀
