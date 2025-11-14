# Credibility vs Voting System

## Core Principle: Truth is Not Democratic

**Critical Distinction**: The credibility/confidence scoring system is **completely separate** from the voting/agreement system. Popular opinion does not determine truth.

---

## 1. Credibility System (Evidence-Based Truth)

### What It Is
- **Objective measure** of evidence quality and logical soundness
- Scored 0.00 to 1.00 by AI evaluation
- Based solely on evidence strength, logical validity, and methodological rigor
- **Cannot be influenced by voting or popular opinion**

### How It Works

#### AI as Unbiased Judge
```typescript
interface AIJudgmentCriteria {
  // AI evaluates ONLY based on:
  evidenceQuality: number;        // Quality of supporting evidence
  logicalValidity: number;        // Soundness of reasoning
  methodologicalRigor: number;    // Proper methodology followed
  sourcesCredibility: number;     // Reliability of cited sources

  // AI NEVER considers:
  popularOpinion: never;          // ❌ Not allowed
  voteCount: never;               // ❌ Not allowed
  userReputation: never;          // ❌ Not allowed
  socialPressure: never;          // ❌ Not allowed
}
```

#### Confidence Score Calculation
```typescript
function calculateConfidenceScore(inquiry: FormalInquiry): number {
  // 1. Evaluate inquiry evidence
  const inquiryScore = aiEvaluateInquiry(inquiry);

  // 2. Get confidence scores of all related nodes
  const relatedScores = inquiry.relatedNodes.map(n => n.credibility);

  // 3. Confidence can NEVER exceed weakest link
  const maxAllowedScore = Math.min(...relatedScores);

  // 4. Final score is lesser of inquiry score or weakest evidence
  return Math.min(inquiryScore, maxAllowedScore);
}
```

**Example**:
- Inquiry presents brilliant argument: AI scores 0.95
- But based on node with credibility 0.60
- **Final confidence score: 0.60** (capped by weakest evidence)
- **Rationale**: "Chain is only as strong as weakest link"

#### AI Evaluation Context
```typescript
interface InquiryEvaluationContext {
  // AI CAN see:
  inquiryContent: string;           // The inquiry itself
  relatedNodes: Node[];             // Direct evidence nodes
  relatedEdges: Edge[];             // Relationships
  citedSources: Source[];           // Cited sources
  methodologySteps: Step[];         // Process followed

  // AI CANNOT see:
  voteCount: never;                 // ❌ Hidden
  agreePercentage: never;           // ❌ Hidden
  userComments: never;              // ❌ Hidden
  socialMetrics: never;             // ❌ Hidden
}
```

### Promotion to Level 0 (Truth Layer)

**Requirements**:
1. Confidence score ≥ 0.90
2. All related nodes ≥ 0.90
3. Peer review by 3+ curators
4. No unresolved critical challenges
5. Methodology properly followed

**Voting has NO impact on Level 0 promotion**

---

## 2. Voting System (Community Opinion)

### What It Is
- **Subjective measure** of community agreement
- Shows how many users agree/disagree with conclusion
- **Explicitly labeled** as opinion, NOT truth
- Useful for identifying controversial claims
- Useful for prioritizing curator review

### How It Works

#### Vote Types
```typescript
enum VoteType {
  AGREE = 'agree',      // User agrees with conclusion
  DISAGREE = 'disagree' // User disagrees with conclusion
}

interface Vote {
  userId: string;
  inquiryId: string;
  voteType: VoteType;
  createdAt: Date;

  // NO reputation weighting
  // Each registered user = 1 vote
}
```

#### Vote Display
```typescript
interface VoteMetrics {
  agreeCount: number;       // Total agree votes
  disagreeCount: number;    // Total disagree votes
  totalVotes: number;       // Total votes cast
  agreeLean: number;        // Percentage: agreeCount / totalVotes
  disagreeLean: number;     // Percentage: disagreeCount / totalVotes
}

// Example Display:
// Community Opinion (Not Evidence-Based Truth):
// 👍 Agree: 127 (73%)
// 👎 Disagree: 47 (27%)
// Total: 174 votes
```

#### UI Labels
```tsx
<VotingSection>
  <Warning>
    ⚠️ This is COMMUNITY OPINION, not evidence-based credibility.
    Vote totals do NOT affect confidence scores.
  </Warning>

  <VoteButtons>
    <AgreeButton count={127} />
    <DisagreeButton count={47} />
  </VoteButtons>

  <VoteChart>
    {/* Visual bar chart showing lean */}
    <AgreeBar width={73%} />
    <DisagreeBar width={27%} />
  </VoteChart>
</VotingSection>
```

### Use Cases for Voting

1. **Identify Controversy**
   - High vote count + close split = controversial claim
   - May warrant curator attention
   - May indicate need for additional inquiry

2. **Prioritize Review**
   - Claims with high disagree % = worth curator review
   - Not because votes determine truth
   - But because community flags potential issues

3. **Research Interest**
   - Shows what topics engage community
   - Helps prioritize future evidence gathering
   - Indicates areas needing clarification

4. **Educational Tool**
   - Students can see difference between evidence and opinion
   - Learn that truth ≠ popularity
   - Understand burden of proof

### What Voting CANNOT Do

❌ Cannot change confidence score
❌ Cannot promote to Level 0
❌ Cannot block well-evidenced claims
❌ Cannot override AI evaluation
❌ Cannot weight by user reputation

### Voting Restrictions

```typescript
interface VotingRules {
  // Who can vote
  requiresRegistration: true;      // Must be logged in
  oneVotePerUser: true;            // Cannot vote multiple times
  canChangeVote: true;             // Can switch agree/disagree

  // What cannot influence votes
  reputationWeighting: false;      // ❌ All votes equal
  curatorBonusVotes: false;        // ❌ Curators = 1 vote like everyone
  evidenceBonus: false;            // ❌ No bonus for providing evidence
}
```

---

## 3. Database Schema

### Separate Tables

```sql
-- Credibility is a property of Nodes and FormalInquiries
CREATE TABLE "Nodes" (
  id UUID PRIMARY KEY,
  -- ... other fields ...
  credibility DECIMAL(3,2) NOT NULL,  -- 0.00 to 1.00
  credibility_history JSONB,          -- Audit trail
  last_evaluated_at TIMESTAMP,
  evaluated_by VARCHAR(50) DEFAULT 'ai'
);

CREATE TABLE "FormalInquiries" (
  id UUID PRIMARY KEY,
  -- ... other fields ...
  confidence_score DECIMAL(3,2),      -- 0.00 to 1.00
  max_allowed_score DECIMAL(3,2),     -- Based on weakest evidence
  ai_determination TEXT,
  ai_rationale TEXT,
  evaluated_at TIMESTAMP
);

-- Voting is completely separate
CREATE TABLE "InquiryVotes" (
  id UUID PRIMARY KEY,
  inquiry_id UUID REFERENCES "FormalInquiries"(id),
  user_id UUID REFERENCES "Users"(id),
  vote_type VARCHAR(20) NOT NULL, -- 'agree' or 'disagree'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(inquiry_id, user_id) -- One vote per user per inquiry
);

-- Materialized view for fast vote counts
CREATE MATERIALIZED VIEW "InquiryVoteStats" AS
SELECT
  inquiry_id,
  COUNT(*) FILTER (WHERE vote_type = 'agree') AS agree_count,
  COUNT(*) FILTER (WHERE vote_type = 'disagree') AS disagree_count,
  COUNT(*) AS total_votes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE vote_type = 'agree') / NULLIF(COUNT(*), 0),
    1
  ) AS agree_percentage
FROM "InquiryVotes"
GROUP BY inquiry_id;

-- Refresh on vote changes
CREATE TRIGGER refresh_vote_stats
AFTER INSERT OR UPDATE OR DELETE ON "InquiryVotes"
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_inquiry_vote_stats();
```

---

## 4. AI Evaluation Instructions

### System Prompt for Inquiry Evaluation

```markdown
You are an unbiased AI evaluator assessing the quality of evidence-based inquiries.

CRITICAL RULES:
1. You evaluate ONLY based on evidence quality and logical soundness
2. You NEVER consider popular opinion, vote counts, or social metrics
3. You NEVER see vote data - it is hidden from you
4. You evaluate truth claims, not popularity

EVALUATION CRITERIA:
- Evidence Quality: Are sources reliable? Primary vs secondary?
- Logical Validity: Does conclusion follow from premises?
- Methodology: Was proper process followed?
- Transparency: Are assumptions stated? Limitations acknowledged?

SCORING:
- 0.90-1.00: Exceptional evidence, rigorous methodology
- 0.75-0.89: Strong evidence, minor gaps
- 0.60-0.74: Adequate evidence, notable limitations
- 0.40-0.59: Weak evidence, significant gaps
- 0.00-0.39: Insufficient evidence

CONFIDENCE SCORE CEILING:
The inquiry's confidence score can NEVER exceed the lowest credibility
score of any node it references. This ensures claims are only as strong
as their weakest supporting evidence.

OUTPUT FORMAT:
{
  "confidence_score": 0.XX,
  "max_allowed_score": 0.XX, // Based on weakest evidence
  "final_score": 0.XX,       // min(confidence_score, max_allowed_score)
  "determination": "...",
  "rationale": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."]
}
```

---

## 5. UI/UX Design

### Clear Visual Separation

```tsx
<InquiryDetailsPage>
  {/* EVIDENCE-BASED SECTION - TOP */}
  <CredibilitySection>
    <Badge color="gold">
      <Shield icon /> Evidence-Based Confidence Score
    </Badge>

    <ConfidenceScore value={0.85} max={1.00} />

    <Explanation>
      This score is determined by AI evaluation of evidence quality,
      logical soundness, and methodological rigor. It is NOT influenced
      by votes or popular opinion.
    </Explanation>

    <AIJudgment>
      <h4>AI Determination</h4>
      <p>{inquiry.ai_determination}</p>

      <h4>Rationale</h4>
      <p>{inquiry.ai_rationale}</p>

      <h4>Evidence Links</h4>
      <ul>
        {inquiry.relatedNodes.map(node => (
          <li>
            {node.title}
            <CredibilityBadge value={node.credibility} />
          </li>
        ))}
      </ul>
    </AIJudgment>
  </CredibilitySection>

  <Divider />

  {/* COMMUNITY OPINION SECTION - BOTTOM */}
  <VotingSection>
    <Badge color="gray">
      <Users icon /> Community Opinion (Not Evidence-Based)
    </Badge>

    <WarningBox>
      ⚠️ Votes show community agreement, NOT evidence quality.
      Vote counts do NOT affect confidence scores.
    </WarningBox>

    <VoteInterface>
      <VoteButton
        type="agree"
        count={127}
        active={userVote === 'agree'}
        onClick={handleVote}
      />

      <VoteButton
        type="disagree"
        count={47}
        active={userVote === 'disagree'}
        onClick={handleVote}
      />
    </VoteInterface>

    <VoteDistribution>
      <ProgressBar>
        <AgreeBar width={73%}>Agree: 73%</AgreeBar>
        <DisagreeBar width={27%}>Disagree: 27%</DisagreeBar>
      </ProgressBar>
      <TotalVotes>174 votes</TotalVotes>
    </VoteDistribution>
  </VotingSection>
</InquiryDetailsPage>
```

---

## 6. Terminology Changes

### Global Find & Replace

| Old Term | New Term | Rationale |
|----------|----------|-----------|
| Challenge | Inquiry | More accurate - seeking truth, not adversarial |
| Challenge System | Inquiry System | Consistent terminology |
| challengeNode | inquiryNode | Code consistency |
| Challenge_ID | Inquiry_ID | Database consistency |

### Files to Update
- [ ] All frontend components
- [ ] All backend resolvers
- [ ] Database tables
- [ ] GraphQL schema
- [ ] Documentation
- [ ] Comments

---

## 7. Example Scenarios

### Scenario 1: High Evidence, Low Agreement

**Inquiry**: "Climate change is primarily caused by human activity"

**Credibility**:
- Confidence Score: 0.95 (AI evaluation)
- Based on nodes with credibility: 0.97, 0.94, 0.96
- Methodology: Scientific Method (properly followed)
- Evidence: IPCC reports, peer-reviewed studies

**Voting**:
- Agree: 342 (51%)
- Disagree: 329 (49%)
- Community is split

**Result**: High confidence score stands regardless of vote split. Truth is not determined by popular opinion.

---

### Scenario 2: High Agreement, Weak Evidence

**Inquiry**: "Ancient aliens built the pyramids"

**Credibility**:
- Confidence Score: 0.15 (AI evaluation)
- Based on nodes with credibility: 0.20, 0.12, 0.18
- Methodology: Poor - cherry-picked evidence
- Evidence: Speculative, no primary sources

**Voting**:
- Agree: 892 (84%)
- Disagree: 170 (16%)
- Community strongly agrees

**Result**: Low confidence score stands despite popularity. Many votes don't make bad evidence good.

---

## 8. Implementation Checklist

### Phase 1: Database
- [ ] Create InquiryVotes table
- [ ] Create InquiryVoteStats materialized view
- [ ] Add vote refresh triggers
- [ ] Ensure credibility fields are separate from votes

### Phase 2: Backend
- [ ] Rename all "Challenge" → "Inquiry"
- [ ] Implement vote mutations (cast, change, remove)
- [ ] Implement vote queries (get stats, check user vote)
- [ ] Ensure AI evaluation NEVER sees vote data
- [ ] Implement confidence score ceiling logic

### Phase 3: Frontend
- [ ] Update all UI text: Challenge → Inquiry
- [ ] Build VotingSection component with warnings
- [ ] Build CredibilitySection component (separate)
- [ ] Add visual separation between sections
- [ ] Display vote stats clearly labeled as opinion

### Phase 4: Testing
- [ ] Verify votes don't affect confidence scores
- [ ] Test confidence score ceiling logic
- [ ] Verify AI evaluation ignores votes
- [ ] User testing: Do users understand difference?

---

## Summary

1. **Credibility = Evidence-Based Truth** (AI-judged, vote-independent)
2. **Voting = Community Opinion** (clearly labeled, cannot affect truth)
3. **Weakest Link Rule**: Confidence capped by lowest evidence credibility
4. **AI as Judge**: Evaluates only evidence, never sees votes
5. **Clear UI Separation**: Visual distinction between truth and opinion
6. **Terminology**: Challenge → Inquiry throughout system
