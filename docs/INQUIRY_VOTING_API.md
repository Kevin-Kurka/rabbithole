# Formal Inquiry Voting API Reference

## GraphQL Endpoint

```
http://localhost:4000/graphql
```

---

## Queries

### Get Formal Inquiries

Retrieve formal inquiries with both credibility (AI-judged) and voting (community opinion) data.

```graphql
query GetFormalInquiries {
  getFormalInquiries {
    id
    title
    description
    content

    # Evidence-based credibility (AI-judged, vote-independent)
    confidence_score
    max_allowed_score
    weakest_node_credibility
    ai_determination
    ai_rationale
    evaluated_at
    evaluated_by

    # Community opinion (voting, does NOT affect credibility)
    agree_count
    disagree_count
    total_votes
    agree_percentage
    disagree_percentage

    status
    created_at
    updated_at
  }
}
```

**With Filters**:
```graphql
query GetNodeInquiries {
  getFormalInquiries(nodeId: "node-uuid-here") {
    id
    title
    confidence_score
    agree_count
    disagree_count
  }
}

query GetEvaluatedInquiries {
  getFormalInquiries(status: "evaluated") {
    id
    title
    confidence_score
    ai_determination
  }
}
```

---

### Get Single Inquiry

```graphql
query GetInquiry {
  getFormalInquiry(inquiryId: "inquiry-uuid-here") {
    id
    title
    content
    confidence_score
    max_allowed_score
    ai_determination
    ai_rationale
    agree_count
    disagree_count
    total_votes
    status
  }
}
```

---

### Get User's Vote

Check if the authenticated user has voted on a specific inquiry.

```graphql
query GetUserVote {
  getUserVote(inquiryId: "inquiry-uuid-here") {
    id
    vote_type
    created_at
    updated_at
  }
}
```

Returns `null` if user hasn't voted.

---

## Mutations

### Create Formal Inquiry

```graphql
mutation CreateInquiry {
  createFormalInquiry(input: {
    target_node_id: "node-uuid-here"
    title: "Is this source credible?"
    description: "Evaluating the credibility of source X based on multiple factors"
    content: "Detailed inquiry content explaining the investigation..."
    related_node_ids: ["node1-uuid", "node2-uuid", "node3-uuid"]
  }) {
    id
    title
    status
    created_at
  }
}
```

**Rules**:
- Must provide **either** `target_node_id` **or** `target_edge_id` (not both)
- Requires authentication
- `related_node_ids` are used for confidence score ceiling calculation (weakest link rule)

---

### Cast Vote (Agree/Disagree)

```graphql
mutation CastVote {
  castVote(input: {
    inquiry_id: "inquiry-uuid-here"
    vote_type: AGREE
  }) {
    id
    vote_type
    created_at
    updated_at
  }
}
```

**Vote Types**:
- `AGREE`: User agrees with inquiry conclusion
- `DISAGREE`: User disagrees with inquiry conclusion

**Rules**:
- Requires authentication
- One vote per user per inquiry
- Users can change their vote (UPSERT pattern)
- **CRITICAL**: Votes do NOT affect confidence scores

**Change Vote**:
```graphql
mutation ChangeVote {
  castVote(input: {
    inquiry_id: "inquiry-uuid-here"
    vote_type: DISAGREE  # Changed from AGREE
  }) {
    id
    vote_type
    updated_at
  }
}
```

---

### Remove Vote

```graphql
mutation RemoveVote {
  removeVote(inquiryId: "inquiry-uuid-here")
}
```

Returns `true` on success.

---

### Update Confidence Score (AI Evaluation)

**⚠️ WARNING**: This mutation should **ONLY** be called by the AI evaluation service. Vote data must NEVER be included in the context passed to AI.

```graphql
mutation UpdateConfidenceScore {
  updateConfidenceScore(input: {
    inquiry_id: "inquiry-uuid-here"
    confidence_score: 0.85
    ai_determination: "Supported by strong evidence"
    ai_rationale: "The inquiry is well-supported by three high-credibility sources (0.92, 0.88, 0.85). The logical reasoning is sound and follows proper scientific methodology. However, the confidence score is capped at 0.85 due to the weakest link rule (lowest related node credibility: 0.85)."
  }) {
    id
    confidence_score
    max_allowed_score
    weakest_node_credibility
    ai_determination
    ai_rationale
    evaluated_at
    status
  }
}
```

**Automatic Ceiling Application**:
- Database trigger automatically calculates `max_allowed_score`
- If `confidence_score` > `max_allowed_score`, it's capped to `max_allowed_score`
- Logs when capping occurs

**Example Ceiling**:
```
Input: confidence_score = 0.95
Related nodes: [0.60, 0.82, 0.91]
Weakest: 0.60
Result: confidence_score = 0.60 (capped)
```

---

## Example Workflows

### Complete Inquiry Lifecycle

```graphql
# 1. Create inquiry
mutation {
  createFormalInquiry(input: {
    target_node_id: "abc-123"
    title: "Warren Commission Report Credibility"
    content: "Investigating the credibility of the Warren Commission Report..."
    related_node_ids: ["node-1", "node-2", "node-3"]
  }) {
    id
  }
}

# 2. Users vote on inquiry (community opinion)
mutation {
  castVote(input: {
    inquiry_id: "inquiry-uuid"
    vote_type: AGREE
  }) {
    vote_type
  }
}

# 3. AI evaluates inquiry (evidence-based)
mutation {
  updateConfidenceScore(input: {
    inquiry_id: "inquiry-uuid"
    confidence_score: 0.87
    ai_determination: "Well-supported by evidence"
    ai_rationale: "Multiple credible sources corroborate the findings..."
  }) {
    confidence_score
    max_allowed_score
    status
  }
}

# 4. Get complete inquiry with both metrics
query {
  getFormalInquiry(inquiryId: "inquiry-uuid") {
    title
    # Evidence-based (AI)
    confidence_score
    ai_determination
    # Community opinion (voting)
    agree_count
    disagree_count
    agree_percentage
  }
}
```

---

## UI Display Guidelines

### Separate Credibility from Voting

```tsx
<InquiryCard inquiry={inquiry}>
  {/* EVIDENCE-BASED SECTION (TOP) */}
  <CredibilitySection>
    <Badge icon={Shield} color="gold">
      Evidence-Based Confidence Score
    </Badge>

    <ConfidenceScore value={inquiry.confidence_score} max={1.00} />

    <WarningBox>
      This score is determined by AI evaluation of evidence quality.
      NOT influenced by votes or popular opinion.
    </WarningBox>

    <AIRationale>
      <h4>AI Determination</h4>
      <p>{inquiry.ai_determination}</p>

      <h4>Rationale</h4>
      <p>{inquiry.ai_rationale}</p>

      <h4>Score Ceiling</h4>
      <p>
        Maximum allowed: {inquiry.max_allowed_score}
        (Weakest related node: {inquiry.weakest_node_credibility})
      </p>
    </AIRationale>
  </CredibilitySection>

  <Divider />

  {/* COMMUNITY OPINION SECTION (BOTTOM) */}
  <VotingSection>
    <Badge icon={Users} color="gray">
      Community Opinion (Not Evidence-Based)
    </Badge>

    <WarningBox>
      ⚠️ Votes show community agreement, NOT evidence quality.
      Vote counts do NOT affect confidence scores.
    </WarningBox>

    <VoteButtons>
      <Button onClick={handleAgree} active={userVote === 'agree'}>
        👍 Agree ({inquiry.agree_count})
      </Button>
      <Button onClick={handleDisagree} active={userVote === 'disagree'}>
        👎 Disagree ({inquiry.disagree_count})
      </Button>
    </VoteButtons>

    <VoteDistribution>
      <ProgressBar>
        <AgreeBar width={inquiry.agree_percentage}>
          {inquiry.agree_percentage}% Agree
        </AgreeBar>
        <DisagreeBar width={inquiry.disagree_percentage}>
          {inquiry.disagree_percentage}% Disagree
        </DisagreeBar>
      </ProgressBar>
      <TotalVotes>{inquiry.total_votes} votes</TotalVotes>
    </VoteDistribution>
  </VotingSection>
</InquiryCard>
```

---

## Database Tables

### FormalInquiries
- Evidence-based evaluation data
- Confidence scores (AI-judged)
- Related node tracking (for ceiling calculation)

### InquiryVotes
- Individual user votes
- Simple agree/disagree
- No reputation weighting

### InquiryVoteStats (Materialized View)
- Aggregated vote counts
- Auto-refreshes on vote changes
- Fast read performance

---

## Key Principles

1. **Truth ≠ Democracy**: Popular opinion cannot influence confidence scores
2. **Weakest Link Rule**: Confidence capped by lowest related node credibility
3. **Vote Isolation**: AI never sees vote data during evaluation
4. **Clear Separation**: UI visually separates evidence from opinion
5. **Equal Voting**: All registered users = 1 vote (no weighting)

---

## Testing Queries

```graphql
# Test confidence ceiling
mutation TestCeiling {
  createFormalInquiry(input: {
    target_node_id: "test-node"
    title: "Test Ceiling"
    content: "Testing weakest link rule"
    related_node_ids: ["low-cred-node"]  # Node with credibility 0.45
  }) {
    id
  }
}

mutation EvaluateWithHighScore {
  updateConfidenceScore(input: {
    inquiry_id: "test-inquiry-id"
    confidence_score: 0.95  # Will be capped to 0.45
    ai_determination: "Test"
    ai_rationale: "Should be capped"
  }) {
    confidence_score  # Should return 0.45 (capped)
    max_allowed_score # Should return 0.45
    weakest_node_credibility # Should return 0.45
  }
}

# Test voting isolation
mutation TestVoting {
  castVote(input: {
    inquiry_id: "test-inquiry-id"
    vote_type: DISAGREE
  }) {
    vote_type
  }
}

query VerifyVoteIsolation {
  getFormalInquiry(inquiryId: "test-inquiry-id") {
    confidence_score  # Should NOT change after voting
    disagree_count    # Should increment
  }
}
```
