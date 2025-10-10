# Process Validation System - Quick Start Guide

## 30-Second Overview

**What:** Objective, math-based promotion system for graphs
**Why:** Eliminates curator authority, enables egalitarian participation
**How:** 4 criteria all >= 80% → automatic promotion

## The 4 Criteria

```
✓ Methodology: 80% of required steps complete
✓ Consensus:   80% weighted community approval (min 3 votes)
✓ Evidence:    80% average evidence quality
✓ Challenges:  0 open challenges (binary: all resolved = 100%)
```

## Quick Usage

### Check if Graph is Ready

```graphql
query {
  getPromotionEligibility(graphId: "your-graph-id") {
    overall_score
    is_eligible
    missing_requirements
  }
}
```

### Vote on Promotion

```graphql
mutation {
  submitConsensusVote(
    graphId: "your-graph-id"
    voteValue: 0.9  # 0.0-1.0
    reasoning: "Strong evidence and complete methodology"
  ) {
    vote_weight
    voter_reputation_score
  }
}
```

### Mark Step Complete

```graphql
mutation {
  markWorkflowStepComplete(
    graphId: "your-graph-id"
    stepId: "step-uuid"
  ) {
    step_name
    completed_at
  }
}
```

### Request Promotion

```graphql
mutation {
  requestPromotionEvaluation(graphId: "your-graph-id") {
    promotion_successful
    new_level
    promotion_message
  }
}
```

**Result:** If eligible → automatic promotion! 🎉

## Vote Value Guide

- **1.0** = Strongly approve
- **0.8-0.99** = Approve with minor reservations
- **0.5-0.79** = Neutral / needs improvement
- **0.0-0.49** = Reject promotion

## Building Reputation

Your vote weight = `MAX(your_reputation, 0.5)`

Increase reputation by:
- Submitting quality evidence (40% weight)
- Voting consistently with community (30% weight)
- Completing methodology workflows (20% weight)
- Resolving challenges constructively (10% weight)

## Real-time Tracking

```graphql
subscription {
  promotionEligibilityUpdated(graphId: "your-graph-id") {
    overall_score
    is_eligible
  }
}
```

Updates automatically when:
- Someone votes
- Step completed
- Evidence added
- Challenge resolved

## Key Principles

1. **No Authority** - Anyone can participate
2. **Objective Math** - Clear formulas, no discretion
3. **Transparent** - All scores visible
4. **Automatic** - Promotion when criteria met
5. **Auditable** - Complete history logged

## Common Workflows

### Promote Your Graph

1. Complete methodology steps → `markWorkflowStepComplete`
2. Add quality evidence → already in system
3. Resolve challenges → already in system
4. Request community votes → share graph link
5. Request evaluation → `requestPromotionEvaluation`
6. **Automatic promotion!** ✨

### Participate in Community

1. Review graph → `getMethodologyProgress`, `getConsensusStatus`
2. Check evidence quality → `graph.nodes.evidence`
3. Verify no open challenges → `graph.challenges`
4. Vote with reasoning → `submitConsensusVote`
5. Your vote contributes to consensus!

## Troubleshooting

**"Why isn't my graph eligible?"**
```graphql
query {
  getPromotionEligibility(graphId: "...") {
    missing_requirements  # Shows exactly what's needed
  }
}
```

**"How do I increase my vote weight?"**
```graphql
query {
  getUserReputation(userId: "...") {
    overall_reputation_score
    evidence_quality_score  # Focus here for biggest impact
  }
}
```

**"When will promotion happen?"**
- Call `requestPromotionEvaluation` when ready
- If all criteria >= 80%, promotion is immediate
- No manual review or approval needed

## Files to Reference

- **Full Docs:** `/backend/docs/PROCESS_VALIDATION_SYSTEM.md`
- **Test Queries:** `/backend/test-queries/process-validation-queries.graphql`
- **Implementation:** `/backend/src/resolvers/ProcessValidationResolver.ts`
- **Database:** `/backend/migrations/007_process_validation_system.sql`

## Support

Questions? Check the comprehensive documentation:
- System overview and philosophy
- Detailed score calculations
- Complete API reference
- Example workflows
- Security considerations

**Remember:** This system has no gatekeepers. Math decides, not humans. Quality and process matter, not authority.
