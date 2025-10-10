# Migration 007: Egalitarian Process Validation System - Deliverables Summary

## Overview

This migration implements a **fully automated, objective, and transparent** Level 0 promotion system based on egalitarian principles. No curator approval required - promotion is based purely on mathematical criteria and community consensus.

## Deliverables

### 1. Core Migration SQL
**File:** `007_process_validation.sql` (1,200+ lines)

Creates:
- **7 tables** for tracking validation and promotion
- **8 functions** for objective scoring and automation
- **4 triggers** for automatic eligibility checks and promotion
- **1 view** for public transparency
- **Extensive indexes** for performance
- **Complete comments** documenting egalitarian principles

### 2. Comprehensive Test Suite
**File:** `007_process_validation_test.sql` (600+ lines)

Tests:
- Methodology completion tracking
- User reputation and vote weighting
- Consensus voting system
- Evidence quality scoring
- Challenge resolution scoring
- Overall eligibility calculation
- Automatic promotion triggers
- Public transparency views
- Audit trail verification

### 3. Complete Documentation
**File:** `007_EGALITARIAN_SYSTEM_GUIDE.md` (1,000+ lines)

Includes:
- Detailed explanation of egalitarian principles
- Promotion criteria and scoring formulas
- Database schema reference
- Function and trigger documentation
- Usage examples and API integration guides
- Reputation system explanation
- Comparison with traditional curator systems
- Security and abuse prevention measures
- Monitoring queries
- Future enhancement ideas

### 4. Architecture Diagram
**File:** `007_ARCHITECTURE_DIAGRAM.txt` (500+ lines ASCII art)

Visualizes:
- System overview and data flow
- Scoring component breakdown
- Vote weighting system
- Trigger cascade
- Database table relationships
- Audit and transparency mechanisms
- Eligibility calculation flow
- Anti-gatekeeping safeguards
- Example promotion timeline

## Key Features

### Egalitarian Principles Enforced

✓ **No Role Hierarchies**
- All users are equal
- No "curator" or "admin" roles for promotion
- Everyone can vote and contribute

✓ **No Curator Gatekeeping**
- 100% automatic promotion when criteria met
- No human can block eligible promotions
- Manual overrides are rare, logged, and justified

✓ **Transparent Scoring**
- All calculations use published algorithms
- Anyone can query scores
- Full audit trail of all events

✓ **Objective Criteria Only**
- No subjective judgments - pure math
- Binary checks (completed/not completed)
- Weighted averages of measurable quantities

✓ **Community Consensus**
- Multiple independent voters required
- Votes weighted by contribution quality
- Minimum participation threshold

✓ **Full Audit Trail**
- Every event logged immutably
- Public transparency view available
- Complete promotion history

## Database Schema

### Tables Created

1. **MethodologyWorkflowSteps**
   - Defines steps in methodologies
   - Enables objective completion tracking

2. **MethodologyCompletionTracking**
   - Tracks which steps are completed per graph
   - Auto-updates eligibility on completion

3. **ConsensusVotes**
   - Community votes on graph readiness
   - Vote weight based on contribution quality
   - One vote per user per graph

4. **PromotionEligibility**
   - Objective scoring for each graph
   - Auto-calculated, cannot be manually set
   - Triggers automatic promotion

5. **PromotionHistory**
   - Immutable audit log of all promotions
   - Records all criteria met
   - Justification for any manual overrides

6. **UserReputationMetrics**
   - User contribution quality scores
   - Used for vote weighting
   - Tiers are informational only - NO privileges

7. **PromotionReviewAudits**
   - Public audit trail
   - Logs all promotion-related events
   - Complete transparency

### Functions Created

1. **calculate_methodology_completion_score(graph_id)**
   - Returns: 0.0 to 1.0 (percentage complete)
   - Must be 1.0 for promotion

2. **calculate_consensus_score(graph_id)**
   - Returns: weighted average of votes
   - Requires minimum 5 votes

3. **calculate_evidence_quality_score(graph_id)**
   - Returns: average credibility score
   - Based on source quality

4. **calculate_challenge_resolution_score(graph_id)**
   - Returns: 0.0 if open challenges, 1.0 if none
   - Must be 1.0 for promotion

5. **calculate_promotion_eligibility(graph_id)**
   - Calculates all scores
   - Updates PromotionEligibility table
   - Returns: TRUE if eligible, FALSE otherwise

6. **auto_promote_graph(graph_id)**
   - Promotes eligible graph to Level 0
   - Locks all nodes and edges (read-only)
   - Records in history
   - Returns: TRUE if promoted, FALSE if not eligible

7. **calculate_vote_weight(voter_id)**
   - Returns: 0.5 to 2.0x vote weight
   - Based on user reputation

8. **update_user_reputation(user_id)**
   - Recalculates user reputation
   - Based on contribution quality

### Triggers Created

1. **trigger_check_eligibility_on_vote**
   - Fires: AFTER INSERT OR UPDATE ON ConsensusVotes
   - Calls: calculate_promotion_eligibility()

2. **trigger_check_eligibility_on_completion**
   - Fires: AFTER INSERT OR UPDATE ON MethodologyCompletionTracking
   - Calls: calculate_promotion_eligibility()

3. **trigger_check_eligibility_on_challenge_update**
   - Fires: AFTER UPDATE ON Challenges (when status changes)
   - Calls: calculate_promotion_eligibility()

4. **trigger_promote_on_eligible**
   - Fires: AFTER UPDATE ON PromotionEligibility (when is_eligible becomes TRUE)
   - Calls: auto_promote_graph()
   - **This is the auto-promotion trigger - instant, no human delay**

### Views Created

1. **PublicPromotionTransparency**
   - Shows all scores for public/unlisted graphs
   - Anyone can query
   - Complete transparency

## Promotion Criteria

### Component Scores

| Component | Weight | Calculation | Hard Requirement |
|-----------|--------|-------------|------------------|
| Methodology Completion | 30% | `completed_steps / total_steps` | Must be 1.0 |
| Community Consensus | 30% | `SUM(vote * weight) / SUM(weight)` | Target: 0.7+ |
| Evidence Quality | 25% | `AVG(evidence.credibility)` | Target: High |
| Challenge Resolution | 15% | `0 if open, 1 if none` | Must be 1.0 |

### Overall Score

```
overall_score = (methodology * 0.30) + (consensus * 0.30) +
                (evidence * 0.25) + (challenges * 0.15)
```

**Promotion Threshold:** 0.80 (80%)

**Hard Requirements:**
- Methodology completion = 1.0 (100% of steps done)
- Challenge resolution = 1.0 (no open challenges)
- Overall score >= 0.80

## Usage Examples

### Complete a Methodology Step

```sql
INSERT INTO "MethodologyCompletionTracking" (
  graph_id, methodology_id, workflow_step_id,
  completed, completed_at, completed_by
) VALUES (
  'graph-uuid', 'methodology-uuid', 'step-uuid',
  true, NOW(), 'user-uuid'
);
-- Trigger automatically recalculates eligibility
-- If all criteria met → auto-promotes
```

### Cast a Consensus Vote

```sql
INSERT INTO "ConsensusVotes" (
  graph_id, voter_id, vote_value, vote_weight,
  evidence_quality_score, vote_reasoning
) VALUES (
  'graph-uuid', 'voter-uuid', 0.85,
  calculate_vote_weight('voter-uuid'),
  0.75, 'Strong evidence, methodology complete'
);
-- Trigger automatically recalculates consensus score
-- If threshold met → auto-promotes
```

### Check Eligibility Status

```sql
SELECT
  methodology_completion_score,
  consensus_score,
  evidence_quality_score,
  challenge_resolution_score,
  overall_score,
  is_eligible,
  blocking_issues,
  eligibility_reasons
FROM "PromotionEligibility"
WHERE graph_id = 'graph-uuid';
```

### View Public Transparency

```sql
SELECT
  graph_name,
  current_level,
  overall_score,
  total_votes,
  is_eligible,
  blocking_issues
FROM "PublicPromotionTransparency"
WHERE graph_name = 'Climate Change Research';
```

## Installation

### Prerequisites
- PostgreSQL 12+ with uuid-ossp extension
- Prior migrations installed (001-006)

### Installation Steps

```bash
# 1. Navigate to migrations directory
cd /Users/kmk/rabbithole/backend/migrations/

# 2. Apply migration
psql $DATABASE_URL -f 007_process_validation.sql

# 3. Run tests (optional)
psql $DATABASE_URL -f 007_process_validation_test.sql

# 4. Verify installation
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND (table_name LIKE '%Promotion%'
    OR table_name LIKE '%Consensus%'
    OR table_name LIKE '%MethodologyWorkflow%')
  ORDER BY table_name;
"
```

### Verification Queries

```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%promotion%'
  OR routine_name LIKE '%consensus%')
ORDER BY routine_name;

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%eligibility%'
  OR trigger_name LIKE '%promotion%')
ORDER BY trigger_name;
```

## Integration Points

### GraphQL Schema Extensions

**Query Types:**
```graphql
type PromotionEligibility {
  methodologyScore: Float!
  consensusScore: Float!
  evidenceScore: Float!
  challengeScore: Float!
  overallScore: Float!
  threshold: Float!
  isEligible: Boolean!
  blockingIssues: [String!]!
  eligibilityReasons: [String!]!
  lastCalculated: DateTime!
}

type ConsensusVote {
  id: UUID!
  voter: User!
  value: Float!
  weight: Float!
  reasoning: String
  votedAt: DateTime!
}
```

**Mutation Types:**
```graphql
type Mutation {
  castConsensusVote(input: CastVoteInput!): CastVoteResult!
  completeMethodologyStep(input: CompleteStepInput!): CompleteStepResult!
}

input CastVoteInput {
  graphId: UUID!
  voteValue: Float!  # 0.0 - 1.0
  reasoning: String
}

type CastVoteResult {
  vote: ConsensusVote!
  promotionEligibility: PromotionEligibility!
  autoPromoted: Boolean!
}
```

### API Endpoints

**REST API:**
```
GET  /api/v1/graphs/:id/promotion-eligibility
POST /api/v1/graphs/:id/consensus-votes
GET  /api/v1/graphs/:id/consensus-votes
POST /api/v1/graphs/:id/methodology/:stepId/complete
GET  /api/v1/graphs/:id/promotion-history
GET  /api/v1/users/:id/reputation
```

## Performance Considerations

### Indexes Created

- All foreign keys indexed
- Composite indexes for common queries
- GIN index on blocking_issues for text search
- Covering indexes for vote counting

### Query Optimization

- Functions use STABLE where appropriate
- Efficient aggregations in scoring functions
- Minimal table scans
- Prepared statements recommended

### Caching Recommendations

- Cache PromotionEligibility scores (TTL: 5 minutes)
- Cache user reputation metrics (TTL: 15 minutes)
- Invalidate on relevant updates
- Use Redis for distributed caching

## Security & Abuse Prevention

### Vote Manipulation
- Vote weight based on sustained contributions
- Cannot create high-reputation accounts quickly
- Requires quality work over time

### Sybil Attacks
- Multiple accounts don't help without reputation
- Building reputation requires effort
- Vote weights prevent mass voting

### Manual Override Safeguards
- Rare exceptions only
- Require public justification
- Permanently logged
- Used only for system bugs

## Monitoring

### Key Metrics

```sql
-- Graphs approaching promotion
SELECT COUNT(*) FROM "PromotionEligibility"
WHERE is_eligible = false AND overall_score > 0.70;

-- Recent promotions
SELECT COUNT(*) FROM "PromotionHistory"
WHERE promotion_timestamp > NOW() - INTERVAL '7 days';

-- Voting activity
SELECT COUNT(*) FROM "ConsensusVotes"
WHERE voted_at > NOW() - INTERVAL '24 hours';

-- High-reputation users
SELECT COUNT(*) FROM "UserReputationMetrics"
WHERE overall_reputation > 0.8;
```

### Alerts

- Monitor for suspicious voting patterns
- Track promotion rate anomalies
- Alert on manual overrides
- Monitor reputation score changes

## Future Enhancements

### Potential Additions

1. **Reputation Decay**
   - Gradually reduce for inactive users
   - Prevents stale high-reputation accounts

2. **Vote Accuracy Tracking**
   - Track if votes aligned with outcomes
   - Adjust reputation based on accuracy

3. **Challenge Quality Scoring**
   - Weight challenges by quality
   - Good challenges increase reputation

4. **Multi-Domain Consensus**
   - Different thresholds by subject area
   - Expert consensus in specialized fields

5. **AI-Assisted Scoring**
   - ML models for evidence evaluation
   - Still transparent and auditable

## Support & Documentation

### Files Reference

- **Migration:** `007_process_validation.sql`
- **Tests:** `007_process_validation_test.sql`
- **Guide:** `007_EGALITARIAN_SYSTEM_GUIDE.md`
- **Diagram:** `007_ARCHITECTURE_DIAGRAM.txt`
- **Summary:** `007_DELIVERABLES_SUMMARY.md` (this file)

### Additional Resources

- See guide for detailed API examples
- See diagram for visual architecture
- See tests for usage examples
- See SQL comments for implementation details

## Conclusion

This egalitarian system ensures that **quality knowledge rises to Level 0 based on merit, not gatekeeping**. The system is:

- **Democratic:** Everyone can participate equally
- **Transparent:** All scores and decisions visible
- **Objective:** Math-based criteria only
- **Automatic:** Instant promotion when ready
- **Accountable:** Full audit trail
- **Fair:** Reputation based on contribution quality

**No curators. No gatekeepers. Just math and community consensus.**

---

## Installation Complete

All deliverables are ready for deployment at:

```
/Users/kmk/rabbithole/backend/migrations/
├── 007_process_validation.sql              # Main migration
├── 007_process_validation_test.sql         # Test suite
├── 007_EGALITARIAN_SYSTEM_GUIDE.md        # Complete guide
├── 007_ARCHITECTURE_DIAGRAM.txt           # Architecture diagram
└── 007_DELIVERABLES_SUMMARY.md            # This summary
```

To install:
```bash
psql $DATABASE_URL -f 007_process_validation.sql
```

To test:
```bash
psql $DATABASE_URL -f 007_process_validation_test.sql
```
