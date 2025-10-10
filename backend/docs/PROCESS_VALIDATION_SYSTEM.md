# Process Validation System

## Overview

The Process Validation System implements **objective, egalitarian criteria** for Level 0 promotion in the Rabbithole knowledge graph system. This system eliminates curator authority and replaces human discretion with transparent, mathematical decision-making.

## Core Principles

### 1. No Authority Checks
- **Anyone can participate** - No special roles or permissions required
- **Anyone can vote** on graph promotion eligibility
- **Anyone can view** all scores and criteria
- No gatekeepers, no curators, no discretion

### 2. Objective Math
- **Clear formulas** for all calculations
- **Reproducible results** - same inputs always yield same outputs
- **No interpretation** - criteria either met or not met
- **Binary thresholds** - 80% minimum across all criteria

### 3. Transparent
- **All scores visible** to everyone
- **Vote reasoning public** for accountability
- **Exact criteria documented** in code and queries
- **Audit log** of all promotion events

### 4. Automatic
- **Promotion happens** when criteria are met
- **No human approval** required
- **Immediate feedback** via subscriptions
- **Math-based decisions** only

### 5. Auditable
- **Complete history** of all votes
- **Timestamps** for all actions
- **Reasoning captured** for all decisions
- **Immutable log** of promotions

## Promotion Criteria

A graph is eligible for promotion when **ALL** of the following scores are >= 0.8 (80%):

### 1. Methodology Completion Score
```
completed_required_steps / total_required_steps >= 0.8
```

**What it measures:** Objective completion of methodology workflow steps

**How to improve:**
- Complete required workflow steps
- Mark steps as complete via `markWorkflowStepComplete` mutation
- Focus on required steps first (optional steps don't block promotion)

**Example:**
- Total required steps: 10
- Completed required steps: 8
- Score: 8/10 = 0.8 (80%) ✓ Eligible

### 2. Consensus Score
```
SUM(vote_value * vote_weight) / SUM(vote_weight) >= 0.8
AND total_votes >= 3
```

**What it measures:** Weighted community consensus on graph quality

**How to improve:**
- Encourage community voting via `submitConsensusVote` mutation
- Build reputation through quality contributions
- Address feedback in vote reasoning
- Minimum 3 votes required for valid consensus

**Example:**
- Vote 1: value=0.9, weight=0.8 → weighted=0.72
- Vote 2: value=0.85, weight=0.6 → weighted=0.51
- Vote 3: value=0.95, weight=0.9 → weighted=0.855
- Weighted sum: 2.085 / Total weight: 2.3 = 0.906 (90.6%) ✓ Eligible

### 3. Evidence Quality Score
```
AVG(evidence.confidence) >= 0.8
```

**What it measures:** Average quality of evidence supporting graph claims

**How to improve:**
- Submit high-quality evidence with strong sources
- Use peer-reviewed sources when possible
- Provide multiple evidence items per claim
- Ensure evidence is verified by community

**Example:**
- Evidence 1: confidence=0.85
- Evidence 2: confidence=0.9
- Evidence 3: confidence=0.8
- Average: (0.85 + 0.9 + 0.8) / 3 = 0.85 (85%) ✓ Eligible

### 4. Challenge Resolution Score
```
open_challenges == 0 ? 1.0 : 0.0
```

**What it measures:** Binary check - all challenges must be resolved

**How to improve:**
- Address all open challenges
- Resolve disputes through evidence
- No open challenges = automatic 1.0 score
- Even one open challenge = 0.0 score (blocks promotion)

**Example:**
- Open challenges: 0 → Score: 1.0 (100%) ✓ Eligible
- Open challenges: 1 → Score: 0.0 (0%) ✗ Not eligible

### Overall Score
```
MIN(methodology, consensus, evidence, challenges) >= 0.8
```

The overall score is the **minimum** of all four criteria. All criteria must individually meet the 0.8 threshold.

## User Reputation System

Vote weight is determined by **objective reputation score** calculated from user activity:

### Reputation Formula
```
overall_reputation_score =
  evidence_quality_score * 0.4 +
  vote_alignment_score * 0.3 +
  (methodology_completions > 0 ? 0.2 : 0) +
  (challenges_resolved / challenges_raised) * 0.1
```

### Components

**Evidence Quality Score (40% weight)**
```
AVG(evidence.confidence) * (verified_count / total_submitted)
```
- Rewards high-quality, verified evidence submissions
- Penalizes low-quality or rejected evidence

**Vote Alignment Score (30% weight)**
```
aligned_votes / total_votes
```
- Measures how often user votes align with final consensus
- Rewards consistent, accurate voting patterns

**Methodology Completions (20% weight)**
- Binary: 0.2 if user has completed methodology workflows, 0 otherwise
- Rewards systematic, thorough work

**Challenge Resolution Ratio (10% weight)**
```
challenges_resolved / MAX(challenges_raised, 1)
```
- Rewards users who successfully resolve challenges
- Penalizes users who raise frivolous challenges

### Vote Weight Calculation
```
vote_weight = MAX(overall_reputation_score, 0.5)
```
- Minimum vote weight: 0.5 (everyone has a voice)
- Maximum vote weight: 1.0 (earned through quality contributions)
- New users start at 0.5, can increase through participation

## GraphQL API

### Queries

#### getPromotionEligibility
Returns current eligibility status with detailed breakdown.

```graphql
query {
  getPromotionEligibility(graphId: "uuid") {
    methodology_completion_score
    consensus_score
    evidence_quality_score
    challenge_resolution_score
    overall_score
    is_eligible
    blocking_reason
    missing_requirements
  }
}
```

#### getMethodologyProgress
Shows objective workflow step completion.

```graphql
query {
  getMethodologyProgress(graphId: "uuid") {
    total_steps
    completed_steps
    required_steps
    completed_required_steps
    completion_percentage
    workflow_steps {
      step_name
      is_completed
      completed_at
    }
  }
}
```

#### getConsensusStatus
Shows voting results without interpretation.

```graphql
query {
  getConsensusStatus(graphId: "uuid") {
    total_votes
    weighted_consensus_score
    approve_votes
    reject_votes
    has_sufficient_votes
    consensus_reached
  }
}
```

#### getConsensusVotes
Transparent view of all votes and reasoning.

```graphql
query {
  getConsensusVotes(graphId: "uuid") {
    voter { username }
    vote_value
    reasoning
    vote_weight
    voter_reputation_score
  }
}
```

#### getUserReputation
Objective reputation calculation.

```graphql
query {
  getUserReputation(userId: "uuid") {
    evidence_quality_score
    vote_alignment_score
    methodology_completions
    overall_reputation_score
  }
}
```

### Mutations

#### submitConsensusVote
Submit or update vote on graph promotion.

```graphql
mutation {
  submitConsensusVote(
    graphId: "uuid"
    voteValue: 0.9
    reasoning: "Detailed reasoning..."
  ) {
    vote_value
    vote_weight
    voter_reputation_score
  }
}
```

**Vote Value Scale:**
- 1.0 = Strongly approve promotion
- 0.8-0.99 = Approve with minor reservations
- 0.5-0.79 = Neutral / needs improvement
- 0.0-0.49 = Reject promotion

**Side Effects:**
- Updates existing vote if user already voted
- Recalculates consensus score
- Triggers `promotionEligibilityUpdated` subscription
- Auto-promotes if criteria now met

#### markWorkflowStepComplete
Mark methodology step as complete.

```graphql
mutation {
  markWorkflowStepComplete(
    graphId: "uuid"
    stepId: "uuid"
  ) {
    step_name
    completed_at
    completed_by
  }
}
```

**Side Effects:**
- Increases methodology completion score
- Triggers `promotionEligibilityUpdated` subscription
- Auto-promotes if criteria now met

#### requestPromotionEvaluation
Recalculate all criteria and auto-promote if eligible.

```graphql
mutation {
  requestPromotionEvaluation(graphId: "uuid") {
    promotion_successful
    previous_level
    new_level
    promotion_message
    failure_reason
    eligibility_breakdown {
      methodology_completion_score
      consensus_score
      evidence_quality_score
      challenge_resolution_score
    }
  }
}
```

**Behavior:**
- Recalculates all eligibility criteria
- **Automatically promotes** if eligible (no approval needed)
- Creates promotion event log entry
- Triggers `graphPromoted` subscription
- Returns detailed breakdown for transparency

**Note:** This is the only way to trigger promotion. System does NOT auto-promote on criteria changes - user must explicitly request evaluation.

### Subscriptions

#### promotionEligibilityUpdated
Real-time updates when eligibility changes.

```graphql
subscription {
  promotionEligibilityUpdated(graphId: "uuid") {
    overall_score
    is_eligible
    missing_requirements
  }
}
```

**Triggered by:**
- New consensus vote submitted
- Workflow step marked complete
- Evidence added or updated
- Challenge resolved

#### graphPromoted
Notification when graph levels up.

```graphql
subscription {
  graphPromoted(graphId: "uuid") {
    graph_name
    previous_level
    new_level
    promoted_at
  }
}
```

**Triggered by:**
- Successful promotion via `requestPromotionEvaluation`

## Database Schema

### ConsensusVotes
Stores all community votes on graph promotion.

```sql
CREATE TABLE "ConsensusVotes" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  user_id UUID REFERENCES "Users"(id),
  vote_value DECIMAL(3,2) CHECK (0 <= vote_value <= 1),
  reasoning TEXT,
  vote_weight DECIMAL(5,4),
  voter_reputation_score DECIMAL(5,4),
  UNIQUE(graph_id, user_id)
);
```

### MethodologyWorkflowSteps
Defines steps within methodology workflows.

```sql
CREATE TABLE "MethodologyWorkflowSteps" (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES "MethodologyWorkflows"(id),
  name VARCHAR(255),
  description TEXT,
  step_order INTEGER,
  is_required BOOLEAN DEFAULT true
);
```

### MethodologyStepCompletions
Tracks objective completion of steps.

```sql
CREATE TABLE "MethodologyStepCompletions" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  step_id UUID REFERENCES "MethodologyWorkflowSteps"(id),
  completed_by UUID REFERENCES "Users"(id),
  completed_at TIMESTAMP,
  UNIQUE(graph_id, step_id)
);
```

### PromotionEvents
Auditable log of all promotions.

```sql
CREATE TABLE "PromotionEvents" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  previous_level INTEGER,
  new_level INTEGER,
  promoted_at TIMESTAMP,
  methodology_completion_score DECIMAL(5,4),
  consensus_score DECIMAL(5,4),
  evidence_quality_score DECIMAL(5,4),
  challenge_resolution_score DECIMAL(5,4)
);
```

### UserReputationCache
Cached reputation scores for performance.

```sql
CREATE TABLE "UserReputationCache" (
  user_id UUID PRIMARY KEY,
  evidence_quality_score DECIMAL(5,4),
  total_evidence_submitted INTEGER,
  vote_alignment_score DECIMAL(5,4),
  overall_reputation_score DECIMAL(5,4),
  calculated_at TIMESTAMP
);
```

## Example Workflows

### Workflow 1: Promote a Graph

```graphql
# Step 1: Check current eligibility
query {
  getPromotionEligibility(graphId: "...") {
    is_eligible
    missing_requirements
  }
}

# Step 2: Complete missing steps
mutation {
  markWorkflowStepComplete(graphId: "...", stepId: "...")
}

# Step 3: Gather consensus votes
mutation {
  submitConsensusVote(
    graphId: "..."
    voteValue: 0.9
    reasoning: "All criteria met"
  )
}

# Step 4: Request evaluation
mutation {
  requestPromotionEvaluation(graphId: "...") {
    promotion_successful
    new_level
  }
}
# → Automatic promotion if eligible! 🎉
```

### Workflow 2: Monitor Progress

```graphql
# Subscribe to real-time updates
subscription {
  promotionEligibilityUpdated(graphId: "...") {
    overall_score
    is_eligible
  }
}

# UI shows live progress bars:
# Methodology: [████████░░] 80%
# Consensus:   [██████░░░░] 60%
# Evidence:    [█████████░] 90%
# Challenges:  [██████████] 100%
# Overall:     [██████░░░░] 60% (min of all)
```

### Workflow 3: Build Reputation

```graphql
# Step 1: Submit quality evidence
mutation {
  submitEvidence(
    targetNodeId: "..."
    sourceId: "..."
    evidenceType: "supporting"
    content: "..."
    confidence: 0.9
  )
}

# Step 2: Participate in consensus
mutation {
  submitConsensusVote(
    graphId: "..."
    voteValue: 0.85
    reasoning: "Detailed analysis..."
  )
}

# Step 3: Complete methodologies
mutation {
  markWorkflowStepComplete(graphId: "...", stepId: "...")
}

# Step 4: Check reputation growth
query {
  getUserReputation(userId: "...") {
    overall_reputation_score
    evidence_quality_score
    vote_alignment_score
  }
}
```

## Implementation Notes

### Caching Strategy
- Eligibility calculations cached per graph
- Cache invalidated on criteria changes
- Reputation scores cached per user
- Recalculated on demand for accuracy

### Performance Optimization
- Composite indexes on frequently queried columns
- Materialized views for top contributors
- Batch vote weight updates on reputation changes
- Async subscription notifications

### Security Considerations
- All queries publicly readable (transparency)
- Mutations require authentication
- No SQL injection via parameterized queries
- Rate limiting on vote submissions

### Audit Trail
- All votes logged with reasoning
- All promotions logged with scores
- All step completions timestamped
- Immutable event log for accountability

## Future Enhancements

### Potential Improvements
1. **Dynamic thresholds** based on graph complexity
2. **Time-based decay** for stale consensus votes
3. **Weighted methodology steps** (some more important)
4. **Reputation decay** for inactive users
5. **Challenge severity weighting** (critical vs minor)

### Maintaining Egalitarian Principles
All enhancements must:
- Remain objective and mathematical
- Avoid introducing human discretion
- Maintain transparency and auditability
- Preserve "anyone can participate" ethos
- Use clear, documented formulas

## Comparison to Traditional Systems

| Aspect | Traditional Curator Model | Rabbithole Process Validation |
|--------|---------------------------|-------------------------------|
| **Authority** | Curators decide | Math decides |
| **Transparency** | Opaque decisions | All scores visible |
| **Speed** | Slow (human review) | Instant (automatic) |
| **Bias** | Potential for bias | Objective formulas |
| **Access** | Limited to curators | Open to everyone |
| **Auditability** | Hard to audit | Complete audit trail |
| **Consistency** | Varies by curator | Always consistent |
| **Scalability** | Limited by curators | Infinitely scalable |

## Philosophy

This system embodies the core philosophy of Rabbithole:

> **Knowledge should be validated by objective criteria, not authority figures.**

By replacing human gatekeepers with transparent mathematics, we create a truly egalitarian system where:
- Quality speaks for itself through evidence
- Community consensus emerges organically
- Process adherence is objectively measurable
- Decisions are reproducible and auditable

The system assumes good faith participation but relies on:
- Multiple independent criteria (can't game just one)
- Reputation-weighted voting (quality matters)
- Transparent reasoning (accountability)
- Complete audit trails (provability)

This is not consensus through authority, but **consensus through evidence and process**.
