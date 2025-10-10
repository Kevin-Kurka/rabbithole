# Egalitarian Process Validation & Promotion System

## Overview

This system implements a **fully automated, objective, and transparent** method for promoting Level 1 graphs to Level 0 (read-only, trusted status). Unlike traditional systems with curator gatekeepers, this design is **egalitarian** - promotion is based purely on mathematical criteria and community consensus.

## Core Principles

### 1. No Role Hierarchies
- **Every user is equal** - no "curator" or "admin" roles for promotion
- All users can vote, submit evidence, and participate
- Vote weight varies by contribution quality, not by social status

### 2. No Curator Gatekeeping
- Promotion is **100% automatic** when criteria are met
- No human can block a promotion that meets objective criteria
- Manual overrides are rare, logged, and require public justification

### 3. Transparent Scoring
- All scores are calculated using published algorithms
- Anyone can query the database to see exact scores
- Full audit trail of all calculations and events

### 4. Objective Criteria Only
- No subjective judgments - only math
- Binary checks (completed/not completed)
- Weighted averages of measurable quantities

### 5. Community Consensus
- Multiple users must agree graph is ready
- Votes weighted by contribution quality
- Minimum participation threshold

### 6. Full Audit Trail
- Every event is logged immutably
- Public transparency view available
- Complete history of all promotions

---

## Promotion Criteria

A graph is eligible for Level 0 promotion when **ALL** of the following are met:

### 1. Methodology Completion (Weight: 30%)
- **100% of required workflow steps must be completed**
- Binary check - cannot be "mostly complete"
- Tracked objectively in `MethodologyCompletionTracking` table

**Calculation:**
```sql
methodology_score = completed_steps / total_required_steps
-- Must equal 1.0 for eligibility
```

### 2. Community Consensus (Weight: 30%)
- Minimum 5 votes required
- Weighted average of vote values (0.0 to 1.0)
- Vote weights based on voter's contribution quality

**Calculation:**
```sql
consensus_score = SUM(vote_value * vote_weight) / SUM(vote_weight)
-- Should be >= 0.7 for strong consensus
```

### 3. Evidence Quality (Weight: 25%)
- Average credibility score of all evidence
- Based on source quality and community reviews
- Reflects reliability of supporting data

**Calculation:**
```sql
evidence_score = AVG(evidence.credibility_score)
-- Higher is better
```

### 4. Challenge Resolution (Weight: 15%)
- **All open challenges must be resolved**
- Binary check - 0 if any open, 1 if none
- Hard blocker - cannot promote with open challenges

**Calculation:**
```sql
challenge_score = IF(open_challenges_count > 0, 0.0, 1.0)
-- Must equal 1.0 for eligibility
```

### Overall Score

```sql
overall_score = (
  (methodology_score * 0.30) +
  (consensus_score * 0.30) +
  (evidence_score * 0.25) +
  (challenge_score * 0.15)
)
```

**Promotion Threshold:** 0.80 (80%)

**Hard Requirements:**
- `methodology_score = 1.0` (100% complete)
- `challenge_score = 1.0` (no open challenges)
- `overall_score >= 0.80`

---

## Database Schema

### Tables

#### MethodologyWorkflowSteps
Defines the steps in a methodology that must be completed.

```sql
CREATE TABLE "MethodologyWorkflowSteps" (
  id UUID PRIMARY KEY,
  methodology_id UUID REFERENCES "Methodologies"(id),
  step_number INTEGER,
  step_name TEXT,
  step_type TEXT,
  is_required BOOLEAN DEFAULT true
);
```

#### MethodologyCompletionTracking
Tracks which steps have been completed for each graph.

```sql
CREATE TABLE "MethodologyCompletionTracking" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  methodology_id UUID REFERENCES "Methodologies"(id),
  workflow_step_id UUID REFERENCES "MethodologyWorkflowSteps"(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES "Users"(id)
);
```

#### ConsensusVotes
Community votes on graph readiness for promotion.

```sql
CREATE TABLE "ConsensusVotes" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  voter_id UUID REFERENCES "Users"(id),
  vote_value DECIMAL(5,4) CHECK (vote_value >= 0 AND vote_value <= 1),
  vote_weight DECIMAL(5,4) DEFAULT 1.0,
  evidence_quality_score DECIMAL(5,4),
  vote_reasoning TEXT,
  voted_at TIMESTAMPTZ
);
```

**EGALITARIAN:** One vote per user per graph. Vote weight based on contribution quality, not role.

#### PromotionEligibility
Objective scoring for each graph.

```sql
CREATE TABLE "PromotionEligibility" (
  id UUID PRIMARY KEY,
  graph_id UUID UNIQUE REFERENCES "Graphs"(id),
  methodology_completion_score DECIMAL(5,4),
  consensus_score DECIMAL(5,4),
  evidence_quality_score DECIMAL(5,4),
  challenge_resolution_score DECIMAL(5,4),
  overall_score DECIMAL(5,4),
  is_eligible BOOLEAN,
  promotion_threshold DECIMAL(5,4) DEFAULT 0.80,
  blocking_issues TEXT[],
  eligibility_reasons TEXT[],
  last_calculated TIMESTAMPTZ
);
```

**EGALITARIAN:** All scores calculated algorithmically. No human can manually set `is_eligible`.

#### PromotionHistory
Immutable audit log of all promotions.

```sql
CREATE TABLE "PromotionHistory" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  promoted_from_level INTEGER,
  promoted_to_level INTEGER,
  promotion_type TEXT CHECK (promotion_type IN (
    'automatic', 'manual_override', 'community_petition'
  )),
  objective_criteria_met JSONB,
  methodology_score DECIMAL(5,4),
  consensus_score DECIMAL(5,4),
  evidence_score DECIMAL(5,4),
  challenge_score DECIMAL(5,4),
  overall_score DECIMAL(5,4),
  promotion_timestamp TIMESTAMPTZ
);
```

**EGALITARIAN:** All promotions logged with full transparency. Manual overrides are rare and require justification.

#### UserReputationMetrics
User contribution quality scores (used for vote weighting).

```sql
CREATE TABLE "UserReputationMetrics" (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES "Users"(id),
  evidence_quality_score DECIMAL(5,4),
  consensus_participation_score DECIMAL(5,4),
  methodology_completion_score DECIMAL(5,4),
  challenge_resolution_score DECIMAL(5,4),
  overall_reputation DECIMAL(5,4),
  current_vote_weight DECIMAL(5,4),
  reputation_tier TEXT
);
```

**EGALITARIAN:** Reputation tiers are informational only. They grant **NO special privileges** or gatekeeping power. Only used for vote weight calculation.

#### PromotionReviewAudits
Public audit trail for all promotion-related events.

```sql
CREATE TABLE "PromotionReviewAudits" (
  id UUID PRIMARY KEY,
  graph_id UUID REFERENCES "Graphs"(id),
  review_type TEXT,
  event_data JSONB,
  actor_id UUID REFERENCES "Users"(id),
  snapshot_scores JSONB,
  event_timestamp TIMESTAMPTZ
);
```

---

## Key Functions

### calculate_promotion_eligibility(graph_id)
Main function that calculates all scores and determines eligibility.

```sql
SELECT calculate_promotion_eligibility('graph-uuid');
-- Returns: TRUE if eligible, FALSE otherwise
```

**What it does:**
1. Calculates methodology completion score
2. Calculates consensus score
3. Calculates evidence quality score
4. Calculates challenge resolution score
5. Calculates weighted overall score
6. Determines if eligible based on criteria
7. Updates `PromotionEligibility` table
8. Logs audit event
9. Returns eligibility status

### auto_promote_graph(graph_id)
Automatically promotes an eligible graph to Level 0.

```sql
SELECT auto_promote_graph('graph-uuid');
-- Returns: TRUE if promoted, FALSE if not eligible
```

**What it does:**
1. Checks eligibility
2. Updates graph level to 0
3. Sets all nodes to `is_level_0 = true` (read-only)
4. Sets all edges to `is_level_0 = true` (read-only)
5. Records in `PromotionHistory`
6. Updates `PromotionEligibility`
7. Logs audit event

### calculate_vote_weight(voter_id)
Calculates a user's vote weight based on their reputation.

```sql
SELECT calculate_vote_weight('user-uuid');
-- Returns: Weight between 0.5 and 2.0
```

**Formula:**
```
vote_weight = 0.5 + (overall_reputation * 1.5)

Examples:
- reputation = 0.0 → weight = 0.5
- reputation = 0.5 → weight = 1.25
- reputation = 1.0 → weight = 2.0
```

**EGALITARIAN:** New users start at 1.0x weight. Weight increases with quality contributions, not with time or status.

### update_user_reputation(user_id)
Recalculates a user's reputation based on their contributions.

```sql
SELECT update_user_reputation('user-uuid');
```

**Reputation Components:**
- **40%** Evidence quality (average credibility of submitted evidence)
- **30%** Consensus participation (accuracy of past votes)
- **20%** Methodology completion rate
- **10%** Challenge resolution quality

---

## Triggers

### trigger_check_eligibility_on_vote
Automatically recalculates eligibility when a vote is cast or updated.

```sql
-- Triggered AFTER INSERT OR UPDATE ON ConsensusVotes
-- Calls: calculate_promotion_eligibility(graph_id)
```

### trigger_check_eligibility_on_completion
Automatically recalculates eligibility when methodology steps are completed.

```sql
-- Triggered AFTER INSERT OR UPDATE ON MethodologyCompletionTracking
-- Calls: calculate_promotion_eligibility(graph_id)
```

### trigger_check_eligibility_on_challenge_update
Automatically recalculates eligibility when challenge status changes.

```sql
-- Triggered AFTER UPDATE ON Challenges
-- Calls: calculate_promotion_eligibility(graph_id)
```

### trigger_promote_on_eligible
**AUTOMATIC PROMOTION TRIGGER** - promotes graph immediately when eligible.

```sql
-- Triggered AFTER UPDATE ON PromotionEligibility
-- WHEN is_eligible changes from FALSE to TRUE
-- Calls: auto_promote_graph(graph_id)
```

**EGALITARIAN:** This is the key to automation. As soon as a graph becomes eligible, it is **immediately promoted** without any human intervention.

---

## Usage Examples

### 1. Mark Methodology Step as Complete

```sql
INSERT INTO "MethodologyCompletionTracking" (
  graph_id,
  methodology_id,
  workflow_step_id,
  completed,
  completed_at,
  completed_by
) VALUES (
  'graph-uuid',
  'methodology-uuid',
  'step-uuid',
  true,
  NOW(),
  'user-uuid'
);

-- Trigger automatically recalculates eligibility
-- If all steps complete and other criteria met → auto-promotes
```

### 2. Cast a Vote

```sql
-- Calculate voter's weight
SELECT calculate_vote_weight('voter-uuid');
-- Returns: 1.35 (example)

-- Cast vote
INSERT INTO "ConsensusVotes" (
  graph_id,
  voter_id,
  vote_value,
  vote_weight,
  evidence_quality_score,
  vote_reasoning
) VALUES (
  'graph-uuid',
  'voter-uuid',
  0.85,  -- 85% ready
  1.35,  -- Calculated weight
  0.75,  -- Voter's evidence quality
  'Strong evidence, methodology complete, minor concerns on X'
);

-- Trigger automatically recalculates consensus score
-- If threshold met and other criteria satisfied → auto-promotes
```

### 3. Check Promotion Status

```sql
-- Get detailed eligibility status
SELECT
  methodology_completion_score,
  consensus_score,
  evidence_quality_score,
  challenge_resolution_score,
  overall_score,
  promotion_threshold,
  is_eligible,
  blocking_issues,
  eligibility_reasons
FROM "PromotionEligibility"
WHERE graph_id = 'graph-uuid';
```

### 4. View Public Transparency

```sql
-- Anyone can query this view
SELECT
  graph_name,
  current_level,
  overall_score,
  promotion_threshold,
  is_eligible,
  total_votes,
  average_vote,
  blocking_issues
FROM "PublicPromotionTransparency"
WHERE graph_id = 'graph-uuid';
```

### 5. Audit Trail

```sql
-- View all events for a graph
SELECT
  review_type,
  event_data,
  snapshot_scores,
  event_timestamp
FROM "PromotionReviewAudits"
WHERE graph_id = 'graph-uuid'
ORDER BY event_timestamp DESC;
```

### 6. Manual Recalculation (if needed)

```sql
-- Force recalculation of eligibility
SELECT calculate_promotion_eligibility('graph-uuid');

-- If eligible and not yet promoted, manually trigger
SELECT auto_promote_graph('graph-uuid');
```

---

## API Integration Examples

### GraphQL Queries

```graphql
# Get promotion status
query GetPromotionStatus($graphId: UUID!) {
  graph(id: $graphId) {
    id
    name
    level
    promotionEligibility {
      methodologyScore
      consensusScore
      evidenceScore
      challengeScore
      overallScore
      threshold
      isEligible
      blockingIssues
      eligibilityReasons
      lastCalculated
    }
    consensusVotes {
      totalCount
      averageValue
      votes {
        voter {
          username
        }
        value
        weight
        reasoning
        votedAt
      }
    }
  }
}
```

### GraphQL Mutations

```graphql
# Cast a vote
mutation CastConsensusVote($input: CastVoteInput!) {
  castConsensusVote(input: $input) {
    vote {
      id
      value
      weight
    }
    promotionEligibility {
      consensusScore
      overallScore
      isEligible
    }
    autoPromoted
  }
}

# Input:
{
  "input": {
    "graphId": "uuid",
    "voteValue": 0.85,
    "reasoning": "Strong methodology, good evidence"
  }
}
```

```graphql
# Complete methodology step
mutation CompleteMethodologyStep($input: CompleteStepInput!) {
  completeMethodologyStep(input: $input) {
    completion {
      id
      completed
      completedAt
    }
    promotionEligibility {
      methodologyScore
      overallScore
      isEligible
    }
    autoPromoted
  }
}
```

---

## Reputation System

### How Reputation Works

Reputation is **NOT a social status** - it's a measure of **contribution quality**.

#### Components

1. **Evidence Quality (40%)**
   - Average credibility score of evidence you've submitted
   - Based on source quality and community reviews
   - Higher for peer-reviewed, primary sources

2. **Consensus Participation (30%)**
   - Accuracy of your past votes
   - Did you vote YES on graphs that got promoted?
   - Did you vote NO on graphs that had issues?

3. **Methodology Completion (20%)**
   - How thoroughly you complete methodology steps
   - Quality of documentation and validation

4. **Challenge Resolution (10%)**
   - How well you resolve challenges
   - Fair resolution, good evidence

#### Reputation Tiers

**Informational only - NO privileges granted!**

- **New** (0.0 - 0.3): New users, vote weight ~1.0x
- **Contributor** (0.3 - 0.6): Regular contributors, vote weight ~1.25x
- **Active** (0.6 - 0.8): High-quality contributors, vote weight ~1.5x
- **Veteran** (0.8 - 1.0): Consistently excellent, vote weight ~2.0x

#### Vote Weight Calculation

```
weight = 0.5 + (reputation * 1.5)

Range: 0.5x to 2.0x
- New users: 1.0x (reputation 0.5)
- High reputation: up to 2.0x
- Low reputation: down to 0.5x
```

**EGALITARIAN:** Vote weight varies, but **everyone can vote**. No one is excluded or given veto power.

---

## Comparison: Traditional vs Egalitarian

| Feature | Traditional (Curator) | Egalitarian (This System) |
|---------|----------------------|---------------------------|
| **Approval** | Curator reviews and approves | Automatic based on criteria |
| **Gatekeeping** | Curators can block promotion | No human can block if criteria met |
| **Transparency** | Curator decisions opaque | All scores public and auditable |
| **Bias** | Curator preferences matter | Pure math, no preferences |
| **Speed** | Depends on curator availability | Instant when criteria met |
| **Participation** | Only curators have power | Everyone can vote and contribute |
| **Accountability** | Curator responsible | Community consensus responsible |
| **Appeals** | Appeal to curator or admin | Objective criteria - no appeals needed |

---

## Security & Abuse Prevention

### Vote Manipulation
- Vote weight based on contribution history
- Cannot create fake high-reputation accounts quickly
- Requires sustained quality contributions

### Sybil Attacks
- Multiple accounts don't help - low reputation = low weight
- Building reputation takes time and quality work
- Better to contribute genuinely than game the system

### Conspiracy Voting
- Requires consensus from multiple independent voters
- High-reputation users spread across community
- Suspicious patterns logged in audit trail

### Manual Override Safeguards
- Manual overrides are rare exceptions
- Require public justification
- Logged permanently in audit trail
- Should be used only for system bugs or emergencies

---

## Monitoring & Alerts

### Key Metrics to Monitor

```sql
-- Graphs approaching promotion
SELECT graph_id, graph_name, overall_score
FROM "PublicPromotionTransparency"
WHERE is_eligible = false
AND overall_score > 0.70
ORDER BY overall_score DESC;

-- Recent promotions
SELECT graph_id, promotion_timestamp, promotion_type, overall_score
FROM "PromotionHistory"
WHERE promotion_timestamp > NOW() - INTERVAL '7 days'
ORDER BY promotion_timestamp DESC;

-- High-reputation users
SELECT user_id, overall_reputation, current_vote_weight, reputation_tier
FROM "UserReputationMetrics"
WHERE overall_reputation > 0.8
ORDER BY overall_reputation DESC;

-- Voting activity
SELECT DATE(voted_at) as vote_date, COUNT(*) as votes
FROM "ConsensusVotes"
WHERE voted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(voted_at)
ORDER BY vote_date DESC;
```

---

## Migration Installation

```bash
# Apply migration
psql $DATABASE_URL -f 007_process_validation.sql

# Run tests
psql $DATABASE_URL -f 007_process_validation_test.sql
```

### Verification

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%Promotion%'
OR table_name LIKE '%Consensus%'
OR table_name LIKE '%Methodology%';

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%promotion%'
OR routine_name LIKE '%consensus%';

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%eligibility%'
OR trigger_name LIKE '%promotion%';
```

---

## Future Enhancements

### Potential Additions

1. **Reputation Decay**
   - Gradually reduce reputation if inactive
   - Prevents stale high-reputation accounts

2. **Vote Accuracy Tracking**
   - Track if votes aligned with eventual outcome
   - Adjust reputation based on vote accuracy

3. **Challenge Quality Scoring**
   - Weight challenges by quality of rebuttal
   - Good challenges increase reputation

4. **Methodology Templates**
   - Pre-defined workflow templates
   - Makes completion tracking easier

5. **Multi-level Consensus**
   - Different thresholds for different domains
   - Expert consensus in specialized areas

6. **AI-Assisted Scoring**
   - ML models to help evaluate evidence quality
   - Still transparent and auditable

---

## Conclusion

This egalitarian system ensures that **quality knowledge rises to Level 0 based on merit, not gatekeeping**. The system is:

- **Democratic**: Everyone can participate
- **Transparent**: All scores visible
- **Objective**: Math-based criteria only
- **Automatic**: Instant promotion when ready
- **Accountable**: Full audit trail
- **Fair**: Reputation based on contribution quality

**No curators. No gatekeepers. Just math and community consensus.**

