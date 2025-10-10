# Architecture Decision Record: Challenge System

## ADR-004: Community-Driven Challenge System for Rabbit Hole

**Status**: Accepted  
**Date**: 2025-10-09  
**Author**: Challenge System Architecture Team

## Context

Rabbit Hole requires a robust mechanism for community members to challenge and verify claims made in Level 1 nodes and edges. The system must balance the need for quality control with preventing abuse, while encouraging legitimate challenges that improve the knowledge graph's accuracy.

## Decision

We will implement a reputation-based challenge system with the following key components:

### 1. Challenge Types and Categories

**Supported Challenge Types:**
- **Factual Error**: Demonstrably false information (min reputation: 10)
- **Missing Context**: Important context omitted (min reputation: 5)
- **Bias**: Clear bias or one-sided presentation (min reputation: 15)
- **Source Credibility**: Unreliable or misrepresented sources (min reputation: 20)
- **Logical Fallacy**: Formal or informal logical fallacies (min reputation: 25)
- **Outdated Information**: No longer current or accurate (min reputation: 5)
- **Misleading Representation**: Data presented misleadingly (min reputation: 20)
- **Conflict of Interest**: Undisclosed conflicts (min reputation: 30)
- **Methodological Flaw**: Flawed methodology (min reputation: 35)
- **Other**: Edge cases (min reputation: 50)

### 2. Reputation System

**Tiers:**
- **Novice** (0-99 points): Basic participation rights
- **Contributor** (100-499): Can submit most challenge types
- **Trusted** (500-1999): Vote weight 2x, increased daily limits
- **Expert** (2000-9999): Vote weight 3x, can moderate
- **Authority** (10000+): Vote weight 5x, full moderation rights

**Point Awards:**
- Successful challenge: +10 points
- Participation in voting: +1 point
- Accurate voting (agreed with outcome): +2 points
- Quality evidence submission: +5 points

**Penalties:**
- Spam challenge: -20 points
- False information: -50 points
- Harassment: -100 points and potential ban

### 3. Challenge Workflow

```
User Submits Challenge → Reputation Check → Challenge Created → Evidence Period
→ Voting Period → Community Resolution → Veracity Update
```

### 4. Voting Mechanism

**Vote Weighting Formula:**
```
weight = base_weight * tier_multiplier
where tier_multipliers = {novice: 1.0, contributor: 1.5, trusted: 2.0, expert: 3.0, authority: 5.0}
```

### 5. Resolution Algorithm

```
if weighted_support_percentage >= acceptance_threshold:
    resolution = 'accepted'
    veracity_impact = -max_impact * support_percentage
elif weighted_support_percentage >= (acceptance_threshold * 0.5):
    resolution = 'partially_accepted'
    veracity_impact = -max_impact * support_percentage * 0.5
else:
    resolution = 'rejected'
    veracity_impact = 0
```

### 6. Anti-Abuse Measures

**Rate Limiting:**
- Novice: 5 challenges/day
- Contributor: 10 challenges/day
- Trusted: 20 challenges/day
- Expert: 50 challenges/day
- Authority: Unlimited

**Spam Detection:**
- Auto-flag at 3 reports
- Hide at 5 reports
- Moderator review within 24h

## Consequences

### Positive
- Community-driven quality control
- Transparent challenge process
- Reputation incentivizes quality participation
- Evidence-based resolution
- Prevents manipulation

### Negative
- Complexity for new users
- Potential for coordinated attacks
- Reputation barriers may discourage newcomers
- Processing overhead

### Mitigations
- Tutorial system for new users
- Monitoring for voting patterns
- Low-barrier challenge types for newcomers
- Performance optimization through caching

## Implementation Priorities

### Phase 1 (Weeks 1-2)
- Database schema implementation
- Basic CRUD operations
- Simple voting mechanism
- Veracity score integration

### Phase 2 (Weeks 3-4)
- Reputation system
- Vote weighting
- Notification system
- GraphQL subscriptions

### Phase 3 (Weeks 5-6)
- Moderation tools
- Appeal process
- Analytics dashboard
- Performance optimization

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-09
