# Project Rabbit Hole - Implementation Progress Report
## Session Date: 2025-01-XX

---

## 🎯 OBJECTIVE
Build a full-featured truth-seeking platform with:
- **Multi-AI agent validation** (Federal Rules of Evidence)
- **Level 0 truth corpus** (verified facts + verified falsehoods)
- **Theory overlay visualization** over truth layer
- **Deduplication & merging** to prevent redundancy
- **Community-driven validation** (99% consensus threshold)
- **Transparent promotion pipeline** to Level 0

---

## ✅ COMPLETED (This Session)

### **Wave 1: Foundation & Critical Fixes** ✓

#### Backend Infrastructure
- [x] **JWT Authentication System** (`/backend/src/middleware/auth.ts`)
  - Access token + refresh token generation
  - Token verification middleware
  - Backwards-compatible with header-based auth
  - Integrated into GraphQL context

- [x] **Updated UserResolver** (`/backend/src/resolvers/UserResolver.ts`)
  - Returns `AuthResponse` with user + tokens
  - Proper error messages
  - Duplicate user detection

- [x] **Multi-AI Agent Orchestrator** (`/backend/src/services/AIOrchestrator.ts`) - **737 lines**
  - Central coordination service for 7 specialized agents:
    1. **Evidence Validator** - FRE compliance (7 rules)
    2. **Deduplication Agent** - Duplicate detection
    3. **Legal Reasoning** - Toulmin/IRAC/CRAC analysis
    4. **Source Credibility** - 6-factor assessment
    5. **Inconsistency Detector** - Contradiction finding
    6. **Promotion Evaluator** - Level 0 readiness
    7. **Fallacy Detector** - Logical fallacy identification
  - Ollama integration for LLM inference
  - Agent execution logging for transparency
  - Confidence scoring for all outputs

- [x] **Deduplication Service** (`/backend/src/services/DeduplicationService.ts`) - **450+ lines**
  - 3-tier duplicate detection:
    1. Exact hash matching (SHA256)
    2. Perceptual hashing (images/videos)
    3. Semantic similarity (vector embeddings)
  - Intelligent merge recommendations
  - Merge strategies (canonical, metadata, evidence consolidation)
  - Prevents duplicate challenges on same node

- [x] **Promotion Eligibility Service** (`/backend/src/services/PromotionEligibilityService.ts`) - **450+ lines**
  - 4 transparent criteria:
    1. **Methodology Completion** (100% required)
    2. **Community Consensus** (99%+ required, reputation-weighted)
    3. **Evidence Quality** (95%+ required, FRE-validated)
    4. **Challenge Resolution** (0 open challenges)
  - Real-time eligibility tracking
  - Blocker identification
  - AI-assisted recommendations
  - Curator-approved Level 0 promotion workflow

- [x] **Database Migration 014** (`/backend/migrations/014_ai_agents_deduplication.sql`)
  - **14 new tables**:
    - `AgentExecutionLog` - AI agent transparency
    - `MergeHistory` - Deduplication tracking
    - `EvidenceValidation` - FRE compliance results
    - `PromotionEligibility` - Level 0 eligibility scores
    - `PromotionEvents` - Public ledger of promotions
    - `ChallengeAppeals` - Appeal process
    - `ReputationHistory` - User reputation tracking
    - `SuspiciousActivity` - Anti-gaming measures
    - And more...
  - **New columns added**:
    - `Nodes`: `perceptual_hash`, `canonical_node_id`, `search_vector`
    - `Graphs`: `is_public`, `is_unlisted`, `allow_forking`, `parent_graph_id`, `view_count`, `fork_count`
    - `Users`: `reputation`, `reputation_tier`
  - **HNSW vector indexes** for fast similarity search
  - **Full-text search** with tsvector and GIN indexes
  - **Helper functions**: `hamming_distance()`, `update_node_search_vector()`
  - **pg_trgm extension** for challenge similarity detection

- [x] **Backend Index.ts Updated** (`/backend/src/index.ts`)
  - Integrated JWT authentication via `getAuthContext()`
  - Auth context includes: `userId`, `isAuthenticated`, `user`
  - Development logging for debugging

- [x] **Package Dependencies**
  - Added `jsonwebtoken` + `@types/jsonwebtoken`

---

### **Federal Rules of Evidence (FRE) Implementation**

The Evidence Validator Agent implements **7 core FRE rules** used in USA courts:

| Rule | Description | Check |
|------|-------------|-------|
| **FRE 401** | Relevance | Does evidence relate to the claim? |
| **FRE 403** | Prejudice vs. Probative Value | Flags emotional/biased language |
| **FRE 602** | Personal Knowledge | Source must be firsthand or cited |
| **FRE 702** | Expert Testimony | Identifies claims requiring experts |
| **FRE 801-802** | Hearsay | Detects secondhand information |
| **FRE 901** | Authentication | Verifies source metadata |
| **FRE 1002** | Best Evidence Rule | Requires original documents |

Each rule returns:
- **Pass/Fail** boolean
- **Score** (0.0 - 1.0)
- **Explanation** (human-readable)
- **Suggestions** for improvement

---

## 🚧 IN PROGRESS

### **Wave 2: GraphRAG & AI Features**

#### Next Steps (Priority Order):
1. **Complete GraphRAG Implementation** (GraphRAGService.ts has TODOs)
   - Vector similarity search using pgvector
   - Recursive graph traversal with CTEs
   - Prompt generation for LLM
   - Citation extraction from responses

2. **Frontend Evidence Wizard** (guided claim creation)
   - Step-by-step UI for FRE compliance
   - AI-suggested improvements at each step
   - Real-time validation feedback

3. **Theory Overlay Visualization** (GraphCanvas enhancement)
   - Multi-layer rendering (Level 0 base + Level 1 theories)
   - Toggle visibility per theory
   - Connection highlighting (green glow for Level 0 links)
   - Credibility boost tooltips

4. **Challenge Voting Logic** (reputation-weighted consensus)
   - Vote weight = sqrt(reputation) × confidence
   - Auto-resolution after threshold
   - Appeal process integration

---

## 📊 IMPLEMENTATION STATISTICS

### Code Written (This Session):
- **Backend Services**: 4 new files (~1,800 lines)
- **Middleware**: 1 new file (150 lines)
- **Database Migration**: 1 file (400+ lines)
- **Updated Files**: 3 files

### Database Changes:
- **Tables Added**: 14
- **Columns Added**: 10+
- **Indexes Created**: 15+
- **Functions Created**: 2

### Key Features Completed:
- ✅ JWT Authentication
- ✅ Multi-AI Agent System (7 agents)
- ✅ Deduplication (exact, perceptual, semantic)
- ✅ Promotion Pipeline (4 criteria @ 99% threshold)
- ✅ FRE Validation (7 rules)
- ✅ Anti-Gaming Infrastructure
- ✅ Public Promotion Ledger
- ✅ Appeal Process Framework

---

## 🎯 REMAINING WORK

### **Critical Path to MVP (Functional Application):**

#### **Week 1-2: Complete Core AI**
- [ ] Finish GraphRAG vector search implementation
- [ ] Connect vectorization worker to Ollama
- [ ] Test end-to-end AI validation
- [ ] Build Evidence Wizard UI

#### **Week 3-4: Theory Overlay & Visualization**
- [ ] Implement multi-layer graph rendering
- [ ] Add theory overlay controls
- [ ] Build Level 0 wiki interface
- [ ] Create public API for AI agents

#### **Week 5-6: Challenge System & Community**
- [ ] Complete voting logic with reputation weighting
- [ ] Build challenge appeal UI
- [ ] Implement reputation display
- [ ] Add theory sharing/forking

#### **Week 7-8: Testing & Deployment**
- [ ] Run database migration on production DB
- [ ] Populate conspiracy theory graphs (JFK, UFOs, etc.)
- [ ] Integration testing
- [ ] AWS infrastructure setup
- [ ] Production deployment

---

## 🔧 TESTING CHECKLIST

### To Test Locally:

1. **Run Database Migration:**
```bash
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/014_ai_agents_deduplication.sql
```

2. **Install Ollama (for AI agents):**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull nomic-embed-text
ollama pull llama3.2
```

3. **Set Environment Variables:**
```bash
# Backend .env
JWT_SECRET=your-secret-key-change-in-production
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_MODEL=llama3.2
```

4. **Start Services:**
```bash
docker-compose up --build
```

5. **Test JWT Authentication:**
```graphql
mutation Register {
  register(input: {
    username: "testuser"
    email: "test@example.com"
    password: "password123"
  }) {
    user {
      id
      username
      email
    }
    accessToken
    refreshToken
  }
}

mutation Login {
  login(input: {
    email: "test@example.com"
    password: "password123"
  }) {
    user { id username }
    accessToken
    refreshToken
  }
}

# Use token in subsequent requests:
# Authorization: Bearer <accessToken>
```

6. **Test AI Agent (Evidence Validation):**
```typescript
// In backend resolver or service
const orchestrator = new AIOrchestrator(pool, redis);

const result = await orchestrator.validateEvidence(
  nodeId,
  "The moon landing occurred on July 20, 1969.",
  { source: "NASA Archives", author: "Neil Armstrong" },
  []
);

console.log(result.freCompliance); // FRE scores
console.log(result.overallScore); // 0.0 - 1.0
console.log(result.suggestions); // AI recommendations
```

7. **Test Deduplication:**
```typescript
const dedupService = new DeduplicationService(pool);

const result = await dedupService.checkDuplicate(
  "Content to check...",
  "text"
);

console.log(result.isDuplicate); // boolean
console.log(result.duplicateCandidates); // Similar nodes
console.log(result.recommendation); // merge | link | separate
```

8. **Test Promotion Eligibility:**
```typescript
const promotionService = new PromotionEligibilityService(pool);

const eligibility = await promotionService.evaluateEligibility(nodeId);

console.log(eligibility.eligible); // boolean
console.log(eligibility.criteria); // 4 scores
console.log(eligibility.blockers); // What's preventing promotion
console.log(eligibility.recommendations); // How to improve
```

---

## 🚀 NEXT ACTIONS

### Immediate (Now):
1. Commit all changes to Git
2. Create GraphRAG implementation (complete TODOs)
3. Build Evidence Wizard frontend component
4. Test AI agent integration with Ollama

### Short-term (This Week):
1. Theory overlay visualization
2. Challenge voting logic
3. Level 0 wiki interface
4. Populate sample conspiracy theory graphs

### Medium-term (Next 2 Weeks):
1. Appeal process UI
2. Reputation system display
3. Theory sharing/forking
4. Performance optimization

### Long-term (Next Month):
1. AWS production deployment
2. Monitoring & analytics
3. User onboarding flow
4. Documentation & tutorials

---

## 📝 TECHNICAL NOTES

### Architecture Decisions:

1. **JWT vs. Session Cookies**
   - Chose JWT for stateless auth + mobile compatibility
   - Refresh tokens for security (30-day expiry)
   - Access tokens short-lived (7 days)

2. **Multi-AI Agent Pattern**
   - Each agent has specialized prompt + config
   - Ollama provides local LLM inference (no API costs)
   - Agent execution logged for transparency
   - Agents can invoke other agents

3. **Deduplication Strategy**
   - 3-tier approach catches exact, near, and semantic duplicates
   - Hamming distance for perceptual hashes
   - Vector cosine similarity for semantic matching
   - User controls merge decisions (not automatic)

4. **Promotion Pipeline**
   - 99% consensus threshold prevents gaming
   - Reputation weighting (sqrt function) reduces whale votes
   - 4 independent criteria must all pass
   - Curator final approval required

5. **Database Performance**
   - HNSW indexes for O(log n) vector search
   - GIN indexes for full-text search
   - Partial indexes for common filters
   - Triggers for auto-updating search vectors

---

## 🐛 KNOWN ISSUES

1. **File Uploads Still Disabled**
   - ESM compatibility issue with `graphql-upload`
   - TODO: Migrate to ESM or find alternative package

2. **GraphRAG Service Incomplete**
   - 18 TODOs in GraphRAGService.ts
   - Vector search logic stubbed out
   - Needs Ollama integration

3. **TypeScript Strict Mode Disabled**
   - `strict: false` in tsconfig.json
   - Allows implicit `any` types
   - TODO: Enable and fix type errors

4. **No Frontend Auth Integration Yet**
   - Frontend still uses x-user-id header
   - Needs Apollo Client auth link for JWT
   - TODO: Update frontend apollo-client.ts

---

## 💡 RECOMMENDATIONS

### For Fastest Time to MVP:

1. **Focus on Core Loop First:**
   - User creates claim → AI validates (FRE) → Community votes → Promotion to Level 0
   - This demonstrates the full value proposition

2. **Defer Advanced Features:**
   - Complex debate workflows (IRAC/CRAC) → Post-MVP
   - Methodology templates → Post-MVP
   - Advanced gamification → Post-MVP

3. **Leverage Existing UI:**
   - GraphCanvas already has overlay logic started
   - Challenge UI components already exist
   - Veracity visualization already works

4. **Quick Wins:**
   - Run migration 014 (unlocks all new features)
   - Install Ollama (enables AI agents)
   - Update frontend auth (1-hour task)
   - Build Evidence Wizard (2-day task)

---

## 📞 SUPPORT RESOURCES

- **Ollama Docs**: https://ollama.com/docs
- **pgvector Guide**: https://github.com/pgvector/pgvector
- **Federal Rules of Evidence**: https://www.rulesofevidence.org/
- **GraphQL Subscriptions**: https://www.apollographql.com/docs/react/data/subscriptions/

---

**Status**: ✅ **Foundation Complete - Ready for AI Integration & UI Development**

**Total Implementation**: ~30% Complete
**Core Backend**: ~50% Complete
**Core Frontend**: ~20% Complete
**Testing & Deployment**: ~0% Complete
