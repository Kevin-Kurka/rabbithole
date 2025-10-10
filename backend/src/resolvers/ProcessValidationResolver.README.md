# ProcessValidationResolver

## Overview

The `ProcessValidationResolver` implements the **egalitarian process validation system** for graph promotion in Rabbithole. This resolver eliminates curator authority and implements objective, mathematical criteria for Level 0 → Level 1 promotion.

## Key Design Principles

### 1. No Authority Required
- All queries are publicly accessible (no authentication needed)
- Mutations require authentication but no special roles
- No curator approval or discretionary decisions
- Anyone can vote with reputation-weighted influence

### 2. Objective Calculations
All scores use clear mathematical formulas:

```typescript
// Methodology completion
score = completed_required_steps / total_required_steps

// Consensus (weighted average)
score = SUM(vote_value * vote_weight) / SUM(vote_weight)

// Evidence quality (simple average)
score = AVG(evidence.confidence)

// Challenge resolution (binary)
score = open_challenges == 0 ? 1.0 : 0.0

// Overall (minimum of all)
overall = MIN(methodology, consensus, evidence, challenges)
```

### 3. Transparent Operations
- All calculations documented in code comments
- Scores visible to everyone
- Vote reasoning captured and public
- Audit trail for all promotions

### 4. Automatic Promotion
When `requestPromotionEvaluation` is called:
1. Recalculate all criteria
2. If all scores >= 0.8: **automatically promote**
3. Create promotion event log
4. Trigger subscriptions
5. No human approval needed!

## Resolver Structure

### Queries (Read Operations)

#### `getPromotionEligibility(graphId: string)`
**Purpose:** Calculate and return current eligibility status

**Returns:** `PromotionEligibility` with detailed score breakdown

**Logic:**
1. Calculate methodology completion score
2. Calculate consensus score
3. Calculate evidence quality score
4. Calculate challenge resolution score
5. Determine overall eligibility (MIN of all scores)
6. Identify missing requirements

**Caching:** Results should be cached and invalidated on criteria changes

**Example:**
```typescript
{
  methodology_completion_score: 0.9,
  consensus_score: 0.85,
  evidence_quality_score: 0.82,
  challenge_resolution_score: 1.0,
  overall_score: 0.82,
  is_eligible: true,
  missing_requirements: []
}
```

#### `getMethodologyProgress(graphId: string)`
**Purpose:** Show objective workflow step completion

**Returns:** `MethodologyProgress` with step-by-step tracking

**Logic:**
1. Get graph's assigned methodology
2. Get workflow steps for methodology
3. Check completion status for each step
4. Calculate completion percentages
5. Determine if methodology complete

**Example:**
```typescript
{
  total_steps: 10,
  completed_steps: 8,
  required_steps: 8,
  completed_required_steps: 7,
  completion_percentage: 80,
  required_completion_percentage: 87.5,
  workflow_steps: [...]
}
```

#### `getConsensusStatus(graphId: string)`
**Purpose:** Show voting results without interpretation

**Returns:** `ConsensusStatus` with vote statistics

**Logic:**
1. Get all votes for graph
2. Calculate weighted consensus (reputation-weighted)
3. Calculate unweighted consensus (simple average)
4. Count approve/reject/neutral votes
5. Check if sufficient votes (minimum 3)
6. Determine if consensus reached

**Example:**
```typescript
{
  total_votes: 5,
  weighted_consensus_score: 0.87,
  unweighted_consensus_score: 0.84,
  approve_votes: 4,
  reject_votes: 0,
  neutral_votes: 1,
  has_sufficient_votes: true,
  consensus_reached: true
}
```

#### `getConsensusVotes(graphId: string)`
**Purpose:** Transparent view of all votes

**Returns:** Array of `ConsensusVote` with reasoning

**Logic:**
1. Query all votes for graph
2. Join with user information
3. Return with vote details and reasoning

**Transparency:** All votes and reasoning are public

#### `getUserReputation(userId: string)`
**Purpose:** Calculate objective reputation score

**Returns:** `UserReputation` with detailed breakdown

**Logic:**
1. Calculate evidence quality score
2. Calculate vote alignment score
3. Count methodology completions
4. Calculate challenge resolution ratio
5. Compute overall reputation (weighted sum)

**Formula:**
```typescript
overall_reputation =
  evidence_quality * 0.4 +
  vote_alignment * 0.3 +
  (methodology_completions > 0 ? 0.2 : 0) +
  (challenges_resolved / challenges_raised) * 0.1
```

### Mutations (Write Operations)

#### `submitConsensusVote(graphId, voteValue, reasoning?)`
**Purpose:** Submit or update consensus vote

**Authentication:** Required

**Logic:**
1. Validate vote value (0.0 to 1.0)
2. Calculate user reputation
3. Determine vote weight (MAX(reputation, 0.5))
4. Check if user already voted
5. Insert or update vote
6. Trigger eligibility recalculation
7. Publish subscription event

**Side Effects:**
- Updates consensus score
- May trigger automatic promotion if criteria met
- Publishes `PROMOTION_ELIGIBILITY_UPDATED` event

**Example:**
```graphql
submitConsensusVote(
  graphId: "uuid"
  voteValue: 0.9
  reasoning: "Thorough methodology, strong evidence"
)
```

#### `markWorkflowStepComplete(graphId, stepId)`
**Purpose:** Mark methodology step as complete

**Authentication:** Required

**Logic:**
1. Check if step already completed
2. Validate step exists
3. Insert completion record
4. Trigger eligibility recalculation
5. Publish subscription event

**Side Effects:**
- Increases methodology completion score
- May trigger automatic promotion if criteria met
- Publishes `PROMOTION_ELIGIBILITY_UPDATED` event

**Idempotency:** Throws error if step already completed

#### `requestPromotionEvaluation(graphId)`
**Purpose:** Recalculate criteria and auto-promote if eligible

**Authentication:** Required

**Logic:**
1. Get current graph level
2. Validate graph can be promoted (not Level 0)
3. Recalculate all eligibility criteria
4. If eligible:
   - Update graph level
   - Create promotion event log
   - Publish `GRAPH_PROMOTED` event
5. Return detailed result

**Critical:** This is the **only** way to trigger promotion. System does not auto-promote on criteria changes - explicit request required.

**Example Success:**
```typescript
{
  promotion_successful: true,
  previous_level: 1,
  new_level: 2,
  promotion_message: "Graph successfully promoted...",
  eligibility_breakdown: {...}
}
```

**Example Failure:**
```typescript
{
  promotion_successful: false,
  failure_reason: "Graph does not meet minimum threshold...",
  missing_requirements: [
    "Methodology completion: 65% (requires 80%)",
    "Consensus score: 72% (requires 80%)"
  ]
}
```

### Subscriptions (Real-time Updates)

#### `promotionEligibilityUpdated(graphId)`
**Purpose:** Real-time eligibility updates

**Triggered by:**
- New consensus vote
- Workflow step completion
- Evidence addition/update
- Challenge resolution

**Use case:** Live progress bars in UI

#### `graphPromoted(graphId)`
**Purpose:** Notification when graph levels up

**Triggered by:**
- Successful `requestPromotionEvaluation` with eligible status

**Use case:** Celebration UI, notifications, feed updates

## Private Helper Methods

### `calculateMethodologyCompletionScore(graphId, pool)`
Calculates methodology completion score by querying step completions.

**Formula:** `completed_required_steps / total_required_steps`

**Returns:** 0.0 to 1.0 (or 0 if no methodology assigned)

### `calculateConsensusScore(graphId, pool)`
Calculates weighted consensus score by querying votes.

**Formula:** `SUM(vote_value * vote_weight) / SUM(vote_weight)`

**Returns:** 0.0 to 1.0 (or 0 if insufficient votes)

### `calculateEvidenceQualityScore(graphId, pool)`
Calculates average evidence quality for graph.

**Formula:** `AVG(evidence.confidence)` for all graph evidence

**Returns:** 0.0 to 1.0 (or 0 if no evidence)

### `calculateChallengeResolutionScore(graphId, pool)`
Checks for any open challenges.

**Formula:** `open_challenges == 0 ? 1.0 : 0.0`

**Returns:** 1.0 or 0.0 (binary)

## Error Handling

### Validation Errors
- Invalid vote value (not 0.0-1.0)
- Invalid graph/step IDs
- Duplicate step completions

**Response:** Throw descriptive error message

### Authentication Errors
- Missing userId in context
- Unauthorized operations

**Response:** Throw "Authentication required" error

### Business Logic Errors
- Level 0 graphs cannot be promoted
- Graph already at maximum level
- Methodology not assigned

**Response:** Return failure result with detailed reason

## Performance Considerations

### Database Queries
- Use composite indexes for common queries
- Batch reputation calculations
- Cache eligibility results

### Subscription Load
- Filter subscriptions at resolver level
- Use Redis pub/sub for scalability
- Debounce rapid eligibility updates

### Calculation Caching
- Cache eligibility for 5 minutes
- Invalidate on criteria changes
- Cache reputation scores per user

## Testing Strategy

### Unit Tests
```typescript
describe('ProcessValidationResolver', () => {
  it('calculates methodology score correctly', async () => {
    // Test: 8/10 required steps = 0.8
  });

  it('calculates weighted consensus correctly', async () => {
    // Test: weighted average with different vote weights
  });

  it('auto-promotes when eligible', async () => {
    // Test: all scores >= 0.8 → promotion successful
  });

  it('rejects promotion when criteria not met', async () => {
    // Test: any score < 0.8 → promotion failed
  });

  it('prevents Level 0 promotion', async () => {
    // Test: Level 0 cannot be promoted
  });
});
```

### Integration Tests
```typescript
describe('Promotion Workflow', () => {
  it('completes full promotion flow', async () => {
    // 1. Create graph
    // 2. Complete methodology steps
    // 3. Submit consensus votes
    // 4. Add evidence
    // 5. Resolve challenges
    // 6. Request promotion
    // 7. Verify auto-promotion
  });
});
```

### Load Tests
- 1000 concurrent consensus votes
- 100 simultaneous promotion evaluations
- Real-time subscription delivery

## Security Considerations

### SQL Injection Prevention
All queries use parameterized statements:
```typescript
pool.query('SELECT * FROM table WHERE id = $1', [id])
```

### Authentication
- Mutations require userId in context
- Queries are public (transparency principle)
- No role-based access control (egalitarian)

### Rate Limiting
Consider implementing:
- Max 10 votes per user per hour
- Max 5 promotion requests per graph per day
- Subscription connection limits

### Data Validation
- Vote values: 0.0 to 1.0
- UUIDs: valid format
- Reasoning: max length limits

## Audit Trail

All significant operations are logged:

### Vote Submissions
```sql
INSERT INTO "ConsensusVotes" (
  graph_id, user_id, vote_value, reasoning,
  vote_weight, voter_reputation_score
)
```

### Promotions
```sql
INSERT INTO "PromotionEvents" (
  graph_id, previous_level, new_level,
  methodology_completion_score,
  consensus_score,
  evidence_quality_score,
  challenge_resolution_score
)
```

### Step Completions
```sql
INSERT INTO "MethodologyStepCompletions" (
  graph_id, step_id, completed_by, completed_at
)
```

## Future Enhancements

### Potential Improvements
1. **Batch promotion evaluations** for performance
2. **Historical score tracking** for trend analysis
3. **Predictive eligibility** (when will graph be eligible?)
4. **Recommendation system** (what to improve first?)
5. **Gamification** (badges for quality contributions)

### Maintaining Principles
Any enhancement must:
- Remain objective and mathematical
- Avoid introducing discretion
- Maintain transparency
- Preserve egalitarian access

## Code Quality

### Type Safety
- All parameters typed with TypeScript
- GraphQL decorators ensure schema correctness
- Database results validated before use

### Documentation
- Inline comments explain formulas
- JSDoc for all public methods
- Examples in comments

### Error Messages
- Descriptive, actionable messages
- Include context (what failed, why)
- Suggest remediation steps

### Code Organization
- Queries grouped together
- Mutations grouped together
- Subscriptions grouped together
- Private helpers at bottom

## Usage Examples

See `/backend/test-queries/process-validation-queries.graphql` for comprehensive examples of all operations.

See `/backend/docs/PROCESS_VALIDATION_SYSTEM.md` for detailed system documentation.
