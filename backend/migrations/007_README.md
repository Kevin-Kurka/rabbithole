# Migration 007: Egalitarian Process Validation System

## Quick Start

### Installation

```bash
# Set your database connection
export DATABASE_URL='postgresql://user:password@localhost:5432/rabbithole'

# Run installation script
./install_007_process_validation.sh
```

The script will:
- Check prerequisites
- Install all tables, functions, triggers, and views
- Verify installation
- Optionally run tests

### Manual Installation

```bash
# Apply migration
psql $DATABASE_URL -f 007_process_validation.sql

# Run tests (optional)
psql $DATABASE_URL -f 007_process_validation_test.sql
```

## What This Migration Does

This migration implements a **fully automated, objective, and transparent** system for promoting Level 1 graphs to Level 0 (read-only, trusted status).

### Key Features

**Egalitarian by Design:**
- ✓ No curator gatekeeping - fully automated promotion
- ✓ No role hierarchies - all users equal
- ✓ Transparent scoring - all calculations visible
- ✓ Objective criteria only - pure math
- ✓ Community consensus drives decisions
- ✓ Full public audit trail

## System Overview

```
Level 1 Graph
    ↓
Complete Methodology Steps
    ↓
Gather Community Consensus Votes (5+ votes)
    ↓
Submit High-Quality Evidence
    ↓
Resolve All Challenges
    ↓
Auto-Calculate Eligibility
    ↓
Is Eligible? → YES → AUTO-PROMOTE TO LEVEL 0 ✓
             → NO  → Display Blocking Issues
```

## Promotion Criteria

A graph is automatically promoted when:

1. **Methodology Completion = 100%** (HARD REQUIREMENT)
   - All required workflow steps completed

2. **Community Consensus >= 70%** (TARGET)
   - Minimum 5 votes
   - Weighted by voter reputation

3. **Evidence Quality = High** (TARGET)
   - Average credibility score of evidence

4. **All Challenges Resolved** (HARD REQUIREMENT)
   - No open challenges allowed

5. **Overall Score >= 80%** (THRESHOLD)
   - Weighted combination of above

### Scoring Formula

```
overall_score = (methodology * 30%) + (consensus * 30%) +
                (evidence * 25%) + (challenges * 15%)

Must be >= 0.80 for promotion
```

## Files Overview

| File | Size | Description |
|------|------|-------------|
| `007_process_validation.sql` | 44KB | Main migration (tables, functions, triggers) |
| `007_process_validation_test.sql` | 25KB | Comprehensive test suite |
| `007_EGALITARIAN_SYSTEM_GUIDE.md` | 19KB | Complete documentation |
| `007_ARCHITECTURE_DIAGRAM.txt` | 38KB | Visual architecture (ASCII art) |
| `007_DELIVERABLES_SUMMARY.md` | 14KB | Quick reference |
| `install_007_process_validation.sh` | 7KB | Automated installation script |
| `007_README.md` | - | This file |

## Database Schema

### Tables Created (7)

1. **MethodologyWorkflowSteps** - Defines methodology steps
2. **MethodologyCompletionTracking** - Tracks step completion
3. **ConsensusVotes** - Community votes on readiness
4. **PromotionEligibility** - Objective scoring per graph
5. **PromotionHistory** - Immutable promotion audit log
6. **UserReputationMetrics** - User contribution quality scores
7. **PromotionReviewAudits** - Public event audit trail

### Functions Created (8)

1. `calculate_methodology_completion_score(graph_id)` - % of steps done
2. `calculate_consensus_score(graph_id)` - Weighted vote average
3. `calculate_evidence_quality_score(graph_id)` - Avg credibility
4. `calculate_challenge_resolution_score(graph_id)` - All resolved?
5. `calculate_promotion_eligibility(graph_id)` - Main scoring function
6. `auto_promote_graph(graph_id)` - Automatic promotion
7. `calculate_vote_weight(voter_id)` - User vote weight
8. `update_user_reputation(user_id)` - Reputation calculation

### Triggers Created (4)

1. `trigger_check_eligibility_on_vote` - On vote cast
2. `trigger_check_eligibility_on_completion` - On step complete
3. `trigger_check_eligibility_on_challenge_update` - On challenge status change
4. `trigger_promote_on_eligible` - **AUTO-PROMOTION TRIGGER**

### Views Created (1)

1. `PublicPromotionTransparency` - Public view of all scores

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
-- Triggers automatically check eligibility
-- Auto-promotes if all criteria met
```

### Cast a Consensus Vote

```sql
INSERT INTO "ConsensusVotes" (
  graph_id, voter_id, vote_value,
  vote_weight, vote_reasoning
) VALUES (
  'graph-uuid', 'voter-uuid', 0.85,
  calculate_vote_weight('voter-uuid'),
  'Strong evidence, methodology complete'
);
-- Triggers automatically recalculate consensus
```

### Check Promotion Status

```sql
SELECT
  methodology_completion_score,
  consensus_score,
  evidence_quality_score,
  challenge_resolution_score,
  overall_score,
  is_eligible,
  blocking_issues
FROM "PromotionEligibility"
WHERE graph_id = 'graph-uuid';
```

### View Public Transparency

```sql
SELECT * FROM "PublicPromotionTransparency"
WHERE graph_name = 'Your Graph Name';
```

## API Integration

### GraphQL Mutations

```graphql
mutation CastVote($graphId: UUID!, $value: Float!, $reasoning: String) {
  castConsensusVote(
    input: {
      graphId: $graphId
      voteValue: $value
      reasoning: $reasoning
    }
  ) {
    vote {
      id
      value
      weight
    }
    promotionEligibility {
      overallScore
      isEligible
      blockingIssues
    }
    autoPromoted
  }
}
```

### REST API Endpoints

```
GET  /api/v1/graphs/:id/promotion-eligibility
POST /api/v1/graphs/:id/consensus-votes
GET  /api/v1/graphs/:id/promotion-history
GET  /api/v1/users/:id/reputation
```

## How Reputation Works

### Reputation Calculation

User reputation is based on **contribution quality, not status:**

- **40%** Evidence quality (credibility of submitted evidence)
- **30%** Consensus participation (accuracy of past votes)
- **20%** Methodology completion rate
- **10%** Challenge resolution quality

### Vote Weight Formula

```
vote_weight = 0.5 + (reputation * 1.5)

Range: 0.5x to 2.0x

Examples:
- New user (reputation 0.5) → 1.25x weight
- High quality contributor (0.9) → 1.85x weight
- Veteran (1.0) → 2.0x weight
```

### Reputation Tiers (Informational Only)

| Tier | Reputation | Vote Weight | Privileges |
|------|------------|-------------|------------|
| New | 0.0 - 0.3 | ~1.0x | NONE - All users equal |
| Contributor | 0.3 - 0.6 | ~1.25x | NONE - All users equal |
| Active | 0.6 - 0.8 | ~1.5x | NONE - All users equal |
| Veteran | 0.8 - 1.0 | ~2.0x | NONE - All users equal |

**EGALITARIAN:** Tiers grant **NO special privileges**. Only affect vote weight. Everyone can vote and contribute equally.

## Monitoring Queries

### Graphs Approaching Promotion

```sql
SELECT
  graph_name,
  overall_score,
  blocking_issues
FROM "PublicPromotionTransparency"
WHERE is_eligible = false
AND overall_score > 0.70
ORDER BY overall_score DESC;
```

### Recent Promotions

```sql
SELECT
  graph_id,
  promotion_type,
  overall_score,
  promotion_timestamp
FROM "PromotionHistory"
WHERE promotion_timestamp > NOW() - INTERVAL '7 days'
ORDER BY promotion_timestamp DESC;
```

### High Reputation Users

```sql
SELECT
  user_id,
  overall_reputation,
  current_vote_weight,
  reputation_tier
FROM "UserReputationMetrics"
WHERE overall_reputation > 0.8
ORDER BY overall_reputation DESC;
```

### Voting Activity

```sql
SELECT
  DATE(voted_at) as date,
  COUNT(*) as votes,
  AVG(vote_value) as avg_value
FROM "ConsensusVotes"
WHERE voted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(voted_at)
ORDER BY date DESC;
```

## Verification

After installation, verify everything is working:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%Promotion%'
  OR table_name LIKE '%Consensus%'
  OR table_name LIKE '%MethodologyWorkflow%')
ORDER BY table_name;

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%promotion%'
  OR routine_name LIKE '%consensus%')
ORDER BY routine_name;

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%eligibility%'
  OR trigger_name LIKE '%promotion%')
ORDER BY trigger_name;

-- Check view
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'PublicPromotionTransparency';
```

## Testing

Run the comprehensive test suite:

```bash
psql $DATABASE_URL -f 007_process_validation_test.sql
```

Tests include:
- Methodology completion tracking
- User reputation and vote weighting
- Consensus voting mechanics
- Evidence quality scoring
- Challenge resolution checks
- Overall eligibility calculation
- Automatic promotion triggers
- Public transparency views
- Audit trail verification

**Note:** Tests run in a transaction and rollback - no data is committed.

## Documentation

### Complete Guide
**File:** `007_EGALITARIAN_SYSTEM_GUIDE.md`

Comprehensive documentation including:
- Detailed egalitarian principles
- Promotion criteria and formulas
- Complete schema reference
- Usage examples and API integration
- Reputation system explanation
- Security and abuse prevention
- Monitoring and maintenance

### Architecture Diagram
**File:** `007_ARCHITECTURE_DIAGRAM.txt`

Visual architecture (ASCII art) showing:
- System overview and data flow
- Scoring components
- Vote weighting system
- Trigger cascade
- Database relationships
- Audit mechanisms
- Example promotion timeline

### Quick Reference
**File:** `007_DELIVERABLES_SUMMARY.md`

Quick reference including:
- Installation instructions
- Schema overview
- Usage examples
- API integration points
- Performance considerations

## Troubleshooting

### Migration Fails

Check prerequisites:
```sql
-- Required tables from previous migrations
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'Users', 'Graphs', 'Nodes', 'Edges',
  'Methodologies', 'Evidence', 'Challenges'
);
```

All 7 tables must exist. If missing, run migrations 001-006 first.

### Promotion Not Triggering

Check eligibility:
```sql
SELECT
  methodology_completion_score,  -- Must be 1.0
  challenge_resolution_score,    -- Must be 1.0
  overall_score,                 -- Must be >= 0.80
  is_eligible,
  blocking_issues
FROM "PromotionEligibility"
WHERE graph_id = 'graph-uuid';
```

### Vote Weight Seems Wrong

Check user reputation:
```sql
SELECT
  overall_reputation,
  current_vote_weight,
  reputation_breakdown
FROM "UserReputationMetrics"
WHERE user_id = 'user-uuid';

-- If no record exists, reputation defaults to 0.5 (vote weight 1.0)
```

### Scores Not Updating

Check triggers are enabled:
```sql
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%eligibility%';
```

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
- Rare exceptions only (system bugs)
- Require public justification
- Permanently logged in audit trail

## Performance

### Indexes
All foreign keys are indexed. Composite indexes for common queries. Expected query performance is < 50ms for most operations.

### Caching Recommendations
- Cache PromotionEligibility scores (TTL: 5 min)
- Cache user reputation (TTL: 15 min)
- Invalidate on relevant updates

## Support

For questions or issues:

1. **Check documentation:**
   - `007_EGALITARIAN_SYSTEM_GUIDE.md` (complete guide)
   - `007_ARCHITECTURE_DIAGRAM.txt` (visual reference)
   - `007_DELIVERABLES_SUMMARY.md` (quick reference)

2. **Run tests:**
   ```bash
   psql $DATABASE_URL -f 007_process_validation_test.sql
   ```

3. **Check audit trail:**
   ```sql
   SELECT * FROM "PromotionReviewAudits"
   WHERE graph_id = 'graph-uuid'
   ORDER BY event_timestamp DESC;
   ```

## Future Enhancements

Potential additions:
- Reputation decay for inactive users
- Vote accuracy tracking
- Challenge quality scoring
- Multi-domain consensus thresholds
- AI-assisted evidence evaluation

## Conclusion

This egalitarian system ensures **quality knowledge rises to Level 0 based on merit, not gatekeeping**.

The system is:
- **Democratic** - Everyone participates equally
- **Transparent** - All scores visible
- **Objective** - Math-based only
- **Automatic** - Instant promotion
- **Accountable** - Full audit trail
- **Fair** - Reputation by contribution quality

**No curators. No gatekeepers. Just math and community consensus.**

---

## Quick Command Reference

```bash
# Install
./install_007_process_validation.sh

# Manual install
psql $DATABASE_URL -f 007_process_validation.sql

# Run tests
psql $DATABASE_URL -f 007_process_validation_test.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%Promotion%';"

# Check specific graph
psql $DATABASE_URL -c "SELECT * FROM \"PromotionEligibility\" WHERE graph_id = 'your-uuid';"

# View public transparency
psql $DATABASE_URL -c "SELECT * FROM \"PublicPromotionTransparency\" LIMIT 10;"
```

**Installation complete! The egalitarian system is ready to use.**
