# Implementation Summary: Inquiry Voting System

**Date**: January 12, 2025
**Status**: ✅ Completed - Backend Implementation Phase 1

## Overview

Successfully implemented the database schema, entities, and GraphQL resolvers for the formal inquiry voting system that **completely separates evidence-based credibility from community opinion**.

## Core Principle

**TRUTH IS NOT DEMOCRATIC**: Popular opinion cannot and will never influence confidence scores. The voting system shows community agreement (agree/disagree) but has zero impact on AI-judged evidence-based credibility scores.

---

## What Was Implemented

### 1. Database Migration (`016_inquiry_voting_system.sql`)

Created comprehensive database schema with:

#### Tables Created:
- **`FormalInquiries`**: Enhanced inquiry table with formal evaluation fields
  - `confidence_score`: AI-judged score (0.00-1.00) based on evidence
  - `max_allowed_score`: Ceiling based on weakest related node
  - `ai_determination`: AI's verdict on the inquiry
  - `ai_rationale`: Detailed reasoning for confidence score
  - `related_node_ids`: Array of nodes this inquiry references
  - `weakest_node_credibility`: Audit trail for ceiling calculation

- **`InquiryVotes`**: Community voting (completely separate from credibility)
  - `vote_type`: 'agree' or 'disagree' (no reputation weighting)
  - One vote per user per inquiry
  - Users can change their vote
  - **CRITICAL**: Vote data NEVER affects confidence scores

#### Materialized View Created:
- **`InquiryVoteStats`**: Fast aggregation of vote counts
  - `agree_count`, `disagree_count`, `total_votes`
  - `agree_percentage`, `disagree_percentage`
  - Auto-refreshes on vote changes (trigger-based)

#### Database Functions:
- **`calculate_confidence_score_ceiling(inquiry_id)`**: Implements weakest link rule
- **`apply_confidence_score_ceiling()`**: Trigger function that caps confidence scores
- **`refresh_inquiry_vote_stats()`**: Refreshes materialized view on vote changes

#### Database View:
- **`InquiryWithVotesView`**: Combines credibility and voting while keeping them visually/conceptually separate

### 2. TypeScript Entities

#### `FormalInquiry.ts`
- Complete TypeGraphQL entity with clear separation:
  - Evidence-based credibility fields (AI-judged)
  - Community opinion fields (voting)
- Detailed field descriptions explaining the separation
- Float types for confidence scores (0.00-1.00)

#### `InquiryVote.ts`
- `InquiryVote`: Individual vote entity (agree/disagree)
- `InquiryVoteStats`: Aggregated vote statistics
- `VoteType` enum: agree | disagree
- Critical comments warning against including vote data in AI context

#### `Inquiry.ts` (Updated)
- Removed "CHALLENGED" status (terminology change)
- Now only: open, answered, resolved

### 3. GraphQL Resolver (`FormalInquiryResolver.ts`)

Comprehensive resolver with complete CRUD operations:

#### Queries:
- **`getFormalInquiries`**: Get inquiries with both credibility and voting (separated)
  - Filters by nodeId, edgeId, status
  - Uses `InquiryWithVotesView` for efficient data retrieval

- **`getFormalInquiry`**: Get single inquiry by ID
  - Returns complete inquiry with all fields

- **`getUserVote`**: Get authenticated user's vote on inquiry
  - Returns null if user hasn't voted

#### Mutations:
- **`createFormalInquiry`**: Create new formal inquiry
  - Validates target (node XOR edge)
  - Requires authentication
  - Stores related_node_ids for weakest link calculation

- **`castVote`**: Cast or update vote (agree/disagree)
  - **CRITICAL**: Does NOT affect confidence scores
  - Uses UPSERT pattern (INSERT ON CONFLICT UPDATE)
  - One vote per user per inquiry
  - Users can change their vote

- **`removeVote`**: Remove user's vote from inquiry

- **`updateConfidenceScore`**: Update AI-judged confidence score
  - **CRITICAL**: Should ONLY be called by AI evaluation service
  - Applies ceiling rule automatically via trigger
  - Logs when score is capped by weakest evidence
  - Sets status to 'evaluated'

### 4. GraphQL Schema Integration

Updated `backend/src/index.ts`:
- Imported `FormalInquiryResolver`
- Added to resolvers array in `buildSchema`
- Server successfully compiles and runs

---

## Key Technical Implementations

### Weakest Link Rule (Confidence Score Ceiling)

```typescript
// Database trigger automatically enforces this rule
function apply_confidence_score_ceiling() {
  // 1. Find minimum credibility among related nodes
  v_max_allowed_score := MIN(related_nodes.credibility);

  // 2. Cap confidence score if it exceeds ceiling
  IF confidence_score > v_max_allowed_score THEN
    confidence_score := v_max_allowed_score;
  END IF;
}
```

**Example**:
- Inquiry presents brilliant argument: AI scores 0.95
- But based on node with credibility 0.60
- **Final confidence score: 0.60** (capped by weakest evidence)

### Vote Data Isolation

**AI Evaluation Context** (what AI CAN see):
```typescript
{
  inquiryContent: string;
  relatedNodes: Node[];  // With their credibility scores
  citedSources: Source[];
  methodologySteps: Step[];
}
```

**AI Evaluation Context** (what AI CANNOT see):
```typescript
{
  voteCount: never;          // ❌ Hidden
  agreePercentage: never;    // ❌ Hidden
  userComments: never;       // ❌ Hidden
  socialMetrics: never;      // ❌ Hidden
}
```

### Voting System

```typescript
// Simple agree/disagree - no reputation weighting
enum VoteType {
  AGREE = 'agree',
  DISAGREE = 'disagree'
}

// One vote per user per inquiry
CONSTRAINT unique_user_inquiry_vote UNIQUE (inquiry_id, user_id)
```

**Display**:
```
Community Opinion (Not Evidence-Based Truth):
👍 Agree: 127 (73%)
👎 Disagree: 47 (27%)
Total: 174 votes
⚠️ Vote counts do NOT affect confidence scores
```

---

## Testing the Implementation

### 1. Check Database Migration

```bash
# Connect to database
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db

# Verify tables exist
\dt "InquiryVotes"
\dt "FormalInquiries"

# Check materialized view
\d "InquiryVoteStats"

# Test functions
SELECT calculate_confidence_score_ceiling('some-inquiry-id');
```

### 2. GraphQL Queries (http://localhost:4000/graphql)

```graphql
# Create formal inquiry
mutation {
  createFormalInquiry(input: {
    target_node_id: "node-uuid"
    title: "Is this source credible?"
    content: "Evaluating the credibility of source X..."
    related_node_ids: ["node1-uuid", "node2-uuid"]
  }) {
    id
    title
    confidence_score
    max_allowed_score
  }
}

# Get formal inquiries
query {
  getFormalInquiries {
    id
    title
    confidence_score      # AI-judged (evidence-based)
    max_allowed_score     # Ceiling from weakest evidence
    agree_count           # Community opinion
    disagree_count        # Community opinion
    total_votes           # Community opinion
    agree_percentage      # Community opinion
  }
}

# Cast vote
mutation {
  castVote(input: {
    inquiry_id: "inquiry-uuid"
    vote_type: AGREE
  }) {
    id
    vote_type
  }
}

# Get user's vote
query {
  getUserVote(inquiryId: "inquiry-uuid") {
    vote_type
  }
}
```

---

## What's Next (Phase 2)

### Immediate Next Steps:

1. **Apply Database Migration**
   ```bash
   docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/016_inquiry_voting_system.sql
   ```

2. **Create Frontend Components**
   - `FormalInquiryCard.tsx`: Display inquiry with separated credibility and voting
   - `VotingSection.tsx`: Agree/Disagree buttons with clear warnings
   - `CredibilitySection.tsx`: Confidence score display with AI rationale
   - Update inquiry details sidebar to show both sections

3. **Implement AI Evaluation Service**
   - Create `AIInquiryEvaluationService.ts`
   - Implement evidence-based scoring (no vote data)
   - Call `updateConfidenceScore` mutation after evaluation

4. **Begin Challenge → Inquiry Terminology Change**
   - Rename Challenge entities/resolvers
   - Update all frontend references
   - Update documentation

### Future Phases:

**Phase 3**: Formal Inquiry Types (Evidence Admissibility, Argument Analysis, etc.)
**Phase 4**: Fallacy Detection System
**Phase 5**: Step-by-step Guided Workflows

---

## Documentation Created

1. **`CREDIBILITY_VS_VOTING.md`**: Core architecture document
2. **`INQUIRY_TYPES_SPECIFICATION.md`**: Full technical specification
3. **`INQUIRY_SYSTEM_ANALYSIS.md`**: Gap analysis and roadmap
4. **`FALLACY_REFERENCE.md`**: Logical fallacy detection guide
5. **`IMPLEMENTATION_SUMMARY.md`**: This document

---

## Success Criteria

✅ Database schema separates credibility from voting
✅ Confidence score ceiling rule implemented
✅ TypeScript entities created with clear separation
✅ GraphQL resolver with voting mutations
✅ Server compiles and runs successfully
⏳ Database migration applied (next step)
⏳ Frontend components (Phase 2)
⏳ AI evaluation service (Phase 2)

---

## Key Architectural Decisions

1. **Materialized View for Performance**: Vote stats cached for fast retrieval
2. **Trigger-based Ceiling Enforcement**: Confidence scores automatically capped
3. **UPSERT Pattern for Voting**: Users can change votes without duplicates
4. **View for Combined Data**: `InquiryWithVotesView` joins data while maintaining separation
5. **No Reputation Weighting**: All votes equal (1 user = 1 vote)

---

## Contact & Support

For questions about this implementation:
- See documentation in `/docs` directory
- Review database migration: `backend/migrations/016_inquiry_voting_system.sql`
- Check entities: `backend/src/entities/FormalInquiry.ts`, `InquiryVote.ts`
- Review resolver: `backend/src/resolvers/FormalInquiryResolver.ts`
