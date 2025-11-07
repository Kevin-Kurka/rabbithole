# REVISED IMPLEMENTATION PLAN
## Wikipedia-Enhanced Platform with Formal Inquiry System

**Status**: Architecture Updated - Challenges are CORE, not overhead
**Estimated Time to MVP**: 8-12 days
**Last Updated**: November 7, 2025

---

## 🎯 CORRECTED VISION

### The Platform
A **Wikipedia-enhanced knowledge graph** with a unique **formal inquiry system**:

#### Two Types of Interaction:
1. **Comments** (Social Layer)
   - Simple opinions and discussions
   - Like Twitter activity feed
   - Informal, quick interactions
   - No structured process

2. **Challenges** (Truth-Seeking Layer) ⭐ **CORE DIFFERENTIATOR**
   - Formal inquiry process
   - Mimics court proceedings + scientific method
   - Evidence submission (subject to scrutiny)
   - Structured argumentation (claims, grounds, warrants)
   - Community participation (amicus brief style)
   - AI-facilitated process
   - Fact-based certainty outcomes
   - **Basis for credibility scores**

### Key Features
- ✓ **Articles** as primary content (Wikipedia-like)
- ✓ **Graph connections** linking all knowledge
- ✓ **Public reading** (no auth required)
- ✓ **Auth for contributions** (create, edit, challenge)
- ✓ **Formal inquiry system** (court-like challenges)
- ✓ **Evidence-based credibility** (from challenge outcomes)
- ✓ **AI facilitation** (objective process management)
- ✓ **Community participation** (collaborative truth-seeking)

---

## 🔄 ARCHITECTURE CORRECTION

### ❌ WHAT I GOT WRONG (Original Plan)
I incorrectly identified Challenges as "over-engineering" to be removed.

**Challenges are actually the CORE innovation** that differentiates this from Wikipedia!

### ✅ CORRECTED ARCHITECTURE

#### Database Schema (7 tables, not 6)
```
CORE GRAPH (4 tables):
✓ NodeTypes      - Article, Document, Evidence, Event, Person, Source
✓ EdgeTypes      - cites, supports, contradicts, relates-to
✓ Nodes          - All content nodes
✓ Edges          - Relationships between nodes

SUPPORTING (3 tables):
✓ Users          - Authentication
✓ Comments       - Informal social discussions
✓ Challenges     - Formal inquiry process ⭐ KEEP THIS
```

#### What Actually Needs Removal
```
REMOVE:
✗ Graphs table          - Simplify to single namespace
✗ Methodology templates - Pre-built workflow templates (not core)
✗ Level 0/1 promotion   - Over-engineered elevation system
✗ Curator roles         - Complex permission system
✗ Gamification          - Badges, achievements, leaderboards
✗ Graph versioning      - Unnecessary complexity
```

#### What to KEEP (Challenges System)
```
KEEP:
✓ Challenges table                    - Formal inquiries
✓ ChallengeResolver                   - GraphQL API
✓ Challenge components (frontend)     - UI for inquiry process
✓ Evidence submission system          - Node-based evidence
✓ Structured argumentation            - Claims/Grounds/Warrants
✓ Challenge voting/consensus          - Community participation
✓ Veracity calculation                - From challenge outcomes
✓ AIAssistantResolver                 - Facilitates process
```

---

## 📊 REVISED COMPLEXITY ANALYSIS

### Backend Resolvers (27 → 12, not 8)

**KEEP (12 resolvers)**:
1. ✓ NodeResolver - CRUD for nodes
2. ✓ EdgeResolver - Create relationships
3. ✓ NodeTypeResolver - Manage types
4. ✓ EdgeTypeResolver - Manage edge types
5. ✓ UserResolver - Auth
6. ✓ CommentResolver - Social comments ⭐ DIFFERENT FROM CHALLENGES
7. ✓ **ChallengeResolver** - Formal inquiries ⭐ KEEP
8. ✓ **EvidenceResolver** - Evidence submission ⭐ KEEP
9. ✓ **VeracityResolver** - Credibility scoring ⭐ KEEP (SIMPLIFIED)
10. ✓ AIAssistantResolver - Process facilitation
11. ✓ SearchResolver - Full-text search
12. ✓ **SourceResolver** - Source credibility ⭐ KEEP

**DELETE (15 resolvers)**:
- ❌ MethodologyResolver (1083 lines) - Template system
- ❌ MethodologyNodeTypeResolver
- ❌ MethodologyEdgeTypeResolver
- ❌ MethodologyWorkflowResolver
- ❌ UserMethodologyResolver
- ❌ CuratorResolver (947 lines) - Complex role system
- ❌ CuratorApplicationResolver
- ❌ CollaborationResolver (909 lines) - Over-engineered
- ❌ GamificationResolver
- ❌ GraphVersionResolver
- ❌ ContentAnalysisResolver (451 lines)
- ❌ GraphTraversalResolver (423 lines)
- ❌ ProcessValidationResolver (934 lines) - Methodology validation
- ❌ VeracityScoreHistoryResolver - Historical tracking (defer)
- ❌ SourceCredibilityResolver - Merge into SourceResolver

**Result**: 27 → 12 resolvers (55% reduction, not 70%)

---

## 🎯 CHALLENGE SYSTEM ARCHITECTURE

### Challenge Lifecycle (Court + Scientific Method)

```
1. INITIATION
   User submits Challenge against a Node or Edge
   ├─ Challenge claim (what's being disputed)
   ├─ Initial grounds (why it's wrong)
   └─ Initial warrant (reasoning)

2. EVIDENCE SUBMISSION
   Both sides submit Evidence nodes
   ├─ Subject to scrutiny (community review)
   ├─ Rules of evidence (relevance, reliability)
   ├─ Source credibility evaluation
   └─ AI fact-checking assistance

3. ARGUMENTATION
   Structured debate format (Toulmin model)
   ├─ Claim: What is being argued
   ├─ Grounds: Evidence supporting claim
   ├─ Warrant: Reasoning connecting grounds to claim
   ├─ Backing: Additional support for warrant
   ├─ Qualifier: Degree of certainty
   └─ Rebuttal: Counter-arguments

4. COMMUNITY PARTICIPATION
   Users can join either side (amicus brief)
   ├─ Submit additional evidence
   ├─ Provide expert analysis
   ├─ Vote on evidence credibility
   └─ Participate in discussion

5. AI FACILITATION
   Objective AI assists process
   ├─ Fact-checking submitted evidence
   ├─ Identifying logical fallacies
   ├─ Suggesting missing evidence
   ├─ Summarizing arguments
   ├─ Detecting bias
   └─ Guiding to resolution

6. RESOLUTION
   Fact-based certainty determination
   ├─ Consensus reached
   ├─ Evidence weight calculated
   ├─ Credibility score updated
   └─ Challenge closed with outcome
```

### Database Schema for Challenges

```sql
CREATE TABLE IF NOT EXISTS public."Challenges" (
    id uuid PRIMARY KEY,
    target_node_id uuid REFERENCES public."Nodes"(id),
    target_edge_id uuid REFERENCES public."Edges"(id),
    challenger_id uuid REFERENCES public."Users"(id),

    -- Challenge content (Toulmin model)
    claim TEXT NOT NULL,
    grounds JSONB,          -- Initial evidence/reasoning
    warrant TEXT,           -- Connection between grounds and claim
    backing TEXT,           -- Additional support
    qualifier TEXT,         -- Degree of certainty

    -- Rebuttal (defender's response)
    rebuttal_claim TEXT,
    rebuttal_grounds JSONB,
    rebuttal_warrant TEXT,

    -- Process state
    status TEXT NOT NULL DEFAULT 'open',  -- open, in_review, resolved, closed
    resolution TEXT,        -- Final determination
    resolution_summary TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,

    CONSTRAINT either_node_or_edge CHECK (
      target_node_id IS NOT NULL OR target_edge_id IS NOT NULL
    )
);

-- Evidence submitted for challenges
CREATE TABLE IF NOT EXISTS public."ChallengeEvidence" (
    id uuid PRIMARY KEY,
    challenge_id uuid REFERENCES public."Challenges"(id),
    evidence_node_id uuid REFERENCES public."Nodes"(id),
    submitted_by uuid REFERENCES public."Users"(id),
    side TEXT NOT NULL,     -- 'challenger' or 'defender'
    role TEXT,              -- 'primary', 'supporting', 'rebuttal'
    credibility_votes JSONB, -- Community votes on evidence quality
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Community participation (amicus brief style)
CREATE TABLE IF NOT EXISTS public."ChallengeParticipants" (
    id uuid PRIMARY KEY,
    challenge_id uuid REFERENCES public."Challenges"(id),
    user_id uuid REFERENCES public."Users"(id),
    side TEXT NOT NULL,     -- 'challenger' or 'defender'
    contribution_type TEXT, -- 'evidence', 'analysis', 'vote'
    contribution JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes on challenge outcome
CREATE TABLE IF NOT EXISTS public."ChallengeVotes" (
    id uuid PRIMARY KEY,
    challenge_id uuid REFERENCES public."Challenges"(id),
    user_id uuid REFERENCES public."Users"(id),
    vote TEXT NOT NULL,     -- 'sustain_challenge' or 'dismiss_challenge'
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(challenge_id, user_id)
);
```

---

## 🚀 REVISED IMPLEMENTATION ROADMAP

### PHASE 1: Database Schema (2 days)

#### Day 1: Simplify Core Schema
```sql
-- REMOVE:
DROP TABLE IF EXISTS public."Graphs";  -- Simplify to single namespace

-- MODIFY Nodes table:
ALTER TABLE public."Nodes" DROP COLUMN IF EXISTS graph_id;
ALTER TABLE public."Nodes" DROP COLUMN IF EXISTS is_level_0;

-- MODIFY Edges table:
ALTER TABLE public."Edges" DROP COLUMN IF EXISTS graph_id;
ALTER TABLE public."Edges" DROP COLUMN IF EXISTS is_level_0;

-- ADD search index:
CREATE INDEX nodes_fulltext_search ON public."Nodes"
  USING GIN (to_tsvector('english', props->>'title' || ' ' || props->>'content'));
```

#### Day 2: Enhance Challenge Schema
```sql
-- KEEP and ENHANCE Challenges table
-- ADD supporting tables:
CREATE TABLE public."ChallengeEvidence" (...);
CREATE TABLE public."ChallengeParticipants" (...);
CREATE TABLE public."ChallengeVotes" (...);

-- ADD indexes:
CREATE INDEX challenges_status ON public."Challenges" (status);
CREATE INDEX challenges_target_node ON public."Challenges" (target_node_id);
CREATE INDEX challenge_evidence_idx ON public."ChallengeEvidence" (challenge_id);
CREATE INDEX challenge_votes_idx ON public."ChallengeVotes" (challenge_id);
```

**Acceptance Criteria**:
- ✓ 7 core tables + 3 challenge tables = 10 tables total
- ✓ Graphs table removed
- ✓ Challenge system fully supported
- ✓ Search indexes operational

---

### PHASE 2: Backend Cleanup (2-3 days)

#### Step 1: Delete Methodology System (4 hours)
```bash
cd backend/src

# Delete methodology resolvers (5 files, ~1,800 lines)
rm resolvers/MethodologyResolver.ts
rm resolvers/MethodologyNodeTypeResolver.ts
rm resolvers/MethodologyEdgeTypeResolver.ts
rm resolvers/MethodologyWorkflowResolver.ts
rm resolvers/UserMethodologyResolver.ts

# Delete methodology entities
rm entities/Methodology*.ts

# Delete methodology services
rm services/MethodologyTemplateService.ts
```

#### Step 2: Delete Over-Engineered Systems (4 hours)
```bash
# Delete curator system (complex permissions)
rm resolvers/CuratorResolver.ts
rm resolvers/CuratorApplicationResolver.ts
rm entities/*Curator*.ts

# Delete gamification
rm resolvers/GamificationResolver.ts
rm entities/UserReputation.ts
rm entities/UserStats.ts
rm entities/UserAchievement*.ts
rm entities/LeaderboardEntry.ts
rm services/AchievementService.ts

# Delete graph versioning
rm resolvers/GraphVersionResolver.ts
rm entities/GraphVersion*.ts
rm services/GraphVersionService.ts

# Delete unnecessary collaboration features
rm resolvers/CollaborationResolver.ts
rm entities/*Collaboration*.ts

# Delete process validation (methodology-specific)
rm resolvers/ProcessValidationResolver.ts

# Delete unnecessary analysis
rm resolvers/ContentAnalysisResolver.ts
rm resolvers/GraphTraversalResolver.ts
```

#### Step 3: Enhance Challenge System (1-2 days)
**File**: `backend/src/resolvers/ChallengeResolver.ts`

Add these queries/mutations:
```typescript
@Resolver(() => Challenge)
export class ChallengeResolver {

  // Create new formal inquiry
  @Mutation(() => Challenge)
  async createChallenge(
    @Arg('input') input: ChallengeInput,
    @Ctx() { pool, userId }: Context
  ): Promise<Challenge> {
    // Create challenge with Toulmin structure
    // Notify target node owner
    // Initialize AI facilitation
  }

  // Submit evidence for a challenge
  @Mutation(() => ChallengeEvidence)
  async submitEvidence(
    @Arg('challengeId') challengeId: string,
    @Arg('evidenceNodeId') evidenceNodeId: string,
    @Arg('side') side: string,
    @Ctx() { pool, userId }: Context
  ): Promise<ChallengeEvidence> {
    // Validate evidence node exists
    // Check rules of evidence (AI-assisted)
    // Add to challenge
    // Calculate source credibility
  }

  // Join challenge as participant (amicus brief)
  @Mutation(() => ChallengeParticipant)
  async joinChallenge(
    @Arg('challengeId') challengeId: string,
    @Arg('side') side: string,
    @Arg('contribution') contribution: string,
    @Ctx() { pool, userId }: Context
  ): Promise<ChallengeParticipant> {
    // Add user as participant
    // Track contributions
  }

  // Vote on challenge outcome
  @Mutation(() => ChallengeVote)
  async voteOnChallenge(
    @Arg('challengeId') challengeId: string,
    @Arg('vote') vote: string,
    @Arg('reasoning') reasoning: string,
    @Ctx() { pool, userId }: Context
  ): Promise<ChallengeVote> {
    // Record vote
    // Update consensus calculation
  }

  // AI-facilitated fact checking
  @Query(() => AIFactCheckResult)
  async factCheckEvidence(
    @Arg('evidenceNodeId') evidenceNodeId: string,
    @Ctx() { pool }: Context
  ): Promise<AIFactCheckResult> {
    // AI analyzes evidence
    // Checks source credibility
    // Identifies logical fallacies
    // Returns structured analysis
  }

  // Get challenge status and progress
  @Query(() => ChallengeStatus)
  async getChallengeStatus(
    @Arg('challengeId') challengeId: string,
    @Ctx() { pool }: Context
  ): Promise<ChallengeStatus> {
    // Return current state
    // Evidence submitted
    // Participants
    // Votes
    // AI analysis
  }

  // Resolve challenge (when consensus reached)
  @Mutation(() => Challenge)
  async resolveChallenge(
    @Arg('challengeId') challengeId: string,
    @Arg('resolution') resolution: string,
    @Ctx() { pool, userId }: Context
  ): Promise<Challenge> {
    // Calculate final credibility impact
    // Update target node veracity score
    // Close challenge
    // Notify participants
  }
}
```

#### Step 4: Update index.ts (1 hour)
```typescript
// backend/src/index.ts
const schema = await buildSchema({
  resolvers: [
    // Core (4)
    NodeResolver,
    EdgeResolver,
    NodeTypeResolver,
    EdgeTypeResolver,

    // User & Social (2)
    UserResolver,
    CommentResolver,

    // Challenge System (4) ⭐ CORE FEATURE
    ChallengeResolver,
    EvidenceResolver,
    VeracityResolver,
    SourceResolver,

    // AI & Search (2)
    AIAssistantResolver,
    SearchResolver,
  ],
  validate: true, // ✓ RE-ENABLE VALIDATION
});
```

**Acceptance Criteria**:
- ✓ 12 resolvers (not 8)
- ✓ Challenge system fully functional
- ✓ AI facilitation working
- ✓ Input validation enabled
- ✓ Methodology/Curator/Gamification removed

---

### PHASE 3: Frontend Cleanup (2 days)

#### Step 1: Delete Unused Components (3 hours)
```bash
cd frontend/src/components

# DELETE methodology (not challenges!)
rm Methodology*.tsx

# DELETE over-engineered visualizations
rm EnhancedGraphCanvas.tsx
rm TimelineView.tsx
rm ClusterView.tsx

# DELETE gamification
rm Reputation*.tsx
rm LeaderboardView.tsx

# KEEP challenge components ⭐
# ✓ ChallengeCard.tsx
# ✓ ChallengePanel.tsx
# ✓ ChallengeVotingWidget.tsx
```

#### Step 2: Enhance Challenge UI (1 day)
Create comprehensive challenge interface:

**`frontend/src/components/FormalInquiry.tsx`**:
```typescript
// Complete formal inquiry interface:
// - Challenge creation form (Toulmin structure)
// - Evidence submission
// - Argument presentation
// - Community participation
// - Voting interface
// - AI fact-check results
// - Progress timeline
```

**`frontend/src/components/EvidenceSubmission.tsx`**:
```typescript
// Evidence submission interface:
// - Select/create evidence node
// - Specify role (primary, supporting, rebuttal)
// - AI credibility check
// - Source verification
```

**`frontend/src/components/ChallengeTimeline.tsx`**:
```typescript
// Visual timeline of challenge progress:
// - Initial claim
// - Evidence submissions
// - Arguments
// - Votes
// - AI interventions
// - Resolution
```

**Acceptance Criteria**:
- ✓ Challenge UI fully functional
- ✓ Formal inquiry process clear to users
- ✓ AI facilitation visible
- ✓ Community participation easy

---

### PHASE 4: Credibility Scoring (2 days)

#### Credibility Algorithm (Evidence-Based)

```typescript
// backend/src/services/CredibilityService.ts

interface CredibilityFactors {
  sourceQuality: number;      // 0-1, based on source credibility
  peerReview: number;         // 0-1, from challenge outcomes
  evidenceStrength: number;   // 0-1, quality of supporting evidence
  consensusLevel: number;     // 0-1, agreement in challenges
  expertValidation: number;   // 0-1, expert participant votes
}

function calculateCredibility(node: Node, challenges: Challenge[]): number {
  // Analyze all resolved challenges for this node
  const challengeOutcomes = challenges
    .filter(c => c.status === 'resolved')
    .map(analyzeChallenge);

  // Weight factors based on challenge outcomes
  const factors: CredibilityFactors = {
    sourceQuality: calculateSourceQuality(node),
    peerReview: calculatePeerReviewScore(challengeOutcomes),
    evidenceStrength: calculateEvidenceStrength(challengeOutcomes),
    consensusLevel: calculateConsensusLevel(challengeOutcomes),
    expertValidation: calculateExpertScore(challengeOutcomes),
  };

  // Weighted average
  const credibility = (
    factors.sourceQuality * 0.20 +
    factors.peerReview * 0.25 +
    factors.evidenceStrength * 0.25 +
    factors.consensusLevel * 0.15 +
    factors.expertValidation * 0.15
  );

  return Math.round(credibility * 100); // 0-100 score
}

// Store in Nodes.weight column
```

#### Transparency UI
Show credibility breakdown to users:
```typescript
// frontend/src/components/CredibilityBreakdown.tsx
<CredibilityBreakdown>
  <Score>85%</Score>
  <Factors>
    <Factor name="Source Quality" score={90} />
    <Factor name="Peer Review" score={85} />
    <Factor name="Evidence Strength" score={88} />
    <Factor name="Consensus" score={82} />
    <Factor name="Expert Validation" score={80} />
  </Factors>
  <ChallengeHistory>
    <Challenge id="..." outcome="sustained" impact="+5" />
    <Challenge id="..." outcome="dismissed" impact="-2" />
  </ChallengeHistory>
</CredibilityBreakdown>
```

**Acceptance Criteria**:
- ✓ Credibility scores based on challenge outcomes
- ✓ Transparent factor breakdown
- ✓ Real-time updates when challenges resolve
- ✓ Historical challenge impact visible

---

### PHASE 5: AI Facilitation (2-3 days)

#### AI Assistant Enhancements

**File**: `backend/src/resolvers/AIAssistantResolver.ts`

```typescript
@Resolver()
export class AIAssistantResolver {

  // Fact-check evidence node
  @Query(() => FactCheckResult)
  async factCheckNode(
    @Arg('nodeId') nodeId: string,
    @Ctx() { pool }: Context
  ): Promise<FactCheckResult> {
    const node = await getNode(nodeId);

    // AI analysis:
    // 1. Extract claims from content
    // 2. Check against known sources
    // 3. Verify citations
    // 4. Detect inconsistencies
    // 5. Rate source credibility

    return {
      credibilityScore: 0.85,
      factualAccuracy: 0.90,
      sourceReliability: 0.88,
      issues: [
        { type: 'citation_missing', severity: 'low' },
        { type: 'claim_unsupported', severity: 'medium' }
      ],
      suggestions: [
        'Add citation for claim about X',
        'Clarify statement about Y'
      ]
    };
  }

  // Suggest evidence for challenge
  @Query(() => [Node])
  async suggestEvidence(
    @Arg('challengeId') challengeId: string,
    @Arg('side') side: string,
    @Ctx() { pool }: Context
  ): Promise<Node[]> {
    const challenge = await getChallenge(challengeId);

    // AI finds relevant evidence nodes:
    // - Vector similarity search
    // - Relevant citations
    // - Counter-evidence
    // - Expert sources

    return relevantEvidenceNodes;
  }

  // Detect logical fallacies in arguments
  @Query(() => [LogicalFallacy])
  async detectFallacies(
    @Arg('argumentText') text: string,
    @Ctx() ctx: Context
  ): Promise<LogicalFallacy[]> {
    // AI identifies:
    // - Ad hominem
    // - Strawman
    // - False dichotomy
    // - Appeal to authority
    // - Circular reasoning
    // - etc.

    return fallacies;
  }

  // Summarize challenge progress
  @Query(() => ChallengeSummary)
  async summarizeChallenge(
    @Arg('challengeId') challengeId: string,
    @Ctx() { pool }: Context
  ): Promise<ChallengeSummary> {
    // AI generates:
    // - Key arguments on each side
    // - Evidence strength
    // - Outstanding questions
    // - Recommended resolution

    return summary;
  }

  // Guide user through challenge process
  @Query(() => ProcessGuidance)
  async getNextStep(
    @Arg('challengeId') challengeId: string,
    @Ctx() { userId }: Context
  ): Promise<ProcessGuidance> {
    // AI suggests:
    // - What to do next
    // - What evidence is missing
    // - How to strengthen argument
    // - When to vote for resolution

    return guidance;
  }
}
```

**Acceptance Criteria**:
- ✓ AI fact-checks evidence
- ✓ AI detects logical fallacies
- ✓ AI suggests relevant evidence
- ✓ AI guides users through process
- ✓ AI summarizes complex challenges

---

### PHASE 6: Polish & Deploy (2 days)

#### Security Hardening
```typescript
// Rate limiting (different limits for different actions)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const challengeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10 // Limit formal challenges
});

app.use('/graphql', generalLimiter);
app.use('/api/challenge', challengeLimiter);
```

#### Documentation
Create user guides:
- How to create an Article
- How to initiate a Formal Inquiry
- How to submit Evidence
- How to participate in Challenges
- Understanding Credibility Scores
- AI Assistance Features

**Acceptance Criteria**:
- ✓ All security issues fixed
- ✓ Comprehensive user documentation
- ✓ Production deployment successful
- ✓ End-to-end testing complete

---

## 📋 REVISED IMPLEMENTATION CHECKLIST

### Week 1: Core Cleanup + Challenge Enhancement
- [ ] Simplify database schema (remove Graphs, keep Challenges)
- [ ] Add Challenge supporting tables (Evidence, Participants, Votes)
- [ ] Delete 15 unnecessary resolvers (keep Challenge system)
- [ ] Delete 30+ unnecessary entity classes
- [ ] Enhance ChallengeResolver with full inquiry API
- [ ] Update frontend to preserve Challenge UI
- [ ] Delete methodology/gamification components

### Week 2: Credibility & AI
- [ ] Implement evidence-based credibility scoring
- [ ] Build transparent credibility breakdown UI
- [ ] Enhance AI facilitation features
- [ ] Create formal inquiry UI flow
- [ ] Implement evidence submission interface
- [ ] Add community participation features

### Week 3: Polish & Deploy
- [ ] Security hardening
- [ ] Performance optimization
- [ ] User documentation
- [ ] End-to-end testing
- [ ] Production deployment

---

## 🎯 MVP FEATURE SET (CORRECTED)

### Must-Have (Week 1-2)
- ✓ Public article browsing
- ✓ Article creation (auth required)
- ✓ **Formal inquiry system (Challenges)** ⭐
- ✓ **Evidence submission with AI fact-check** ⭐
- ✓ **Structured argumentation (Toulmin model)** ⭐
- ✓ **Community participation (amicus brief)** ⭐
- ✓ **Evidence-based credibility scores** ⭐
- ✓ Comments (informal social layer)
- ✓ Graph connections
- ✓ Full-text search

### Nice-to-Have (Week 3)
- Related articles (vector search)
- Article history
- Rich text editor
- Advanced AI guidance
- Challenge analytics

### Future Enhancements
- Video evidence support
- Expert verification system
- Real-time collaboration
- Mobile app
- Advanced visualizations

---

## 🔥 KEY ARCHITECTURAL INSIGHTS

### The Two-Layer System

```
┌─────────────────────────────────────────────┐
│         SOCIAL LAYER (Comments)             │
│  Informal, quick, opinion-based             │
│  Like Twitter/Reddit                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      TRUTH-SEEKING LAYER (Challenges)       │
│  Formal, structured, evidence-based         │
│  Like Court + Scientific Method             │
│  AI-facilitated                             │
│  → Drives Credibility Scores                │
└─────────────────────────────────────────────┘
```

### What Makes This Unique
1. **Dual interaction model** (social + formal)
2. **Court-like inquiry process** (structured truth-seeking)
3. **AI as objective facilitator** (not just assistant)
4. **Evidence-based credibility** (transparent scoring)
5. **Community participation** (amicus brief model)
6. **Graph-first knowledge** (everything connected)

---

## 📊 REVISED METRICS

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Database Tables | 50+ | 10 | 80% |
| Backend Resolvers | 27 | 12 | 56% |
| Entity Classes | 50 | 15 | 70% |
| Services | 20+ | 5 | 75% |
| Frontend Components | 95 | 40 | 58% |
| Backend Code | 8,900 lines | 4,500 lines | 50% |

**Still significant simplification, but preserving core innovation!**

---

## 🚨 CRITICAL NEXT STEPS

I'm ready to start the cleanup with this corrected understanding. Should I:

1. **Start Phase 1**: Simplify database (remove Graphs, enhance Challenges)?
2. **Start Phase 2**: Delete methodology/curator/gamification code?
3. **Enhance Challenges**: Build out the formal inquiry system first?

**Estimated Timeline**: 8-12 days to MVP (not 6-10, due to enhanced Challenge system)

The platform is now correctly positioned as:
- **Wikipedia** (articles, knowledge graph)
- **+** **Formal Inquiry System** (court + science)
- **+** **AI Facilitation** (objective process management)
- **=** **Truth-Seeking Knowledge Platform**

Ready to proceed when you are! 🚀
