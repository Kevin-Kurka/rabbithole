# Objective Criteria Matrix for Level 0 Promotion

## Overview

This document defines the exact mathematical thresholds and formulas used to determine when Level 1 content is eligible for automatic promotion to Level 0. All criteria are objective, measurable, and transparent.

## Primary Criteria Matrix

| Category | Criterion | Formula | Threshold | Weight | Critical |
|----------|-----------|---------|-----------|---------|----------|
| **Methodology** | Completion Rate | `completed_steps / total_required_steps` | = 1.00 | 25% | Yes |
| **Evidence** | Quality Score | `Σ(evidence_credibility) / count(evidence)` | ≥ 0.70 | 20% | Yes |
| **Evidence** | Source Diversity | `count(unique(evidence.source.domain))` | ≥ 3 | 15% | Yes |
| **Consensus** | Agreement Rate | `weighted_support / (weighted_support + weighted_oppose)` | ≥ 0.80 | 20% | Yes |
| **Participation** | Unique Voters | `count(unique(voters))` | ≥ 5 | 10% | Yes |
| **Validation** | Open Challenges | `count(challenges.status = 'open')` | = 0 | 10% | Yes |

**Note**: ALL criteria marked as "Critical" must be met for promotion. The weight column indicates relative importance in the dashboard display.

## Detailed Criterion Specifications

### 1. Methodology Completion (100% Required)

```python
def calculate_methodology_completion(graph, methodology_type):
    """
    Returns a value between 0.0 and 1.0 indicating completion percentage
    """
    methodology = load_methodology_requirements(methodology_type)

    # Check required steps
    steps_completed = 0
    for step in methodology.required_steps:
        if graph.has_step_completed(step):
            steps_completed += 1
    step_completion = steps_completed / len(methodology.required_steps)

    # Check required nodes
    nodes_satisfied = 0
    for node_req in methodology.required_nodes:
        actual_count = graph.count_nodes_of_type(node_req.type)
        if actual_count >= node_req.min_count:
            nodes_satisfied += 1
    node_completion = nodes_satisfied / len(methodology.required_nodes)

    # Check required edges
    edges_satisfied = 0
    for edge_req in methodology.required_edges:
        actual_count = graph.count_edges_of_type(edge_req.type)
        if actual_count >= edge_req.min_count:
            edges_satisfied += 1
    edge_completion = edges_satisfied / len(methodology.required_edges)

    # Weighted average (steps most important)
    completion = (step_completion * 0.5 +
                 node_completion * 0.3 +
                 edge_completion * 0.2)

    return completion
```

**Requirement**: Must equal exactly 1.00 (100% completion)

### 2. Evidence Quality Score (≥0.70 Required)

```python
def calculate_average_evidence_quality(graph):
    """
    Returns average credibility score of all evidence nodes
    """
    evidence_nodes = graph.get_nodes_of_type('evidence')

    if not evidence_nodes:
        return 0.0

    total_credibility = 0.0
    for evidence in evidence_nodes:
        credibility = calculate_evidence_credibility(evidence)
        total_credibility += credibility

    average_quality = total_credibility / len(evidence_nodes)
    return average_quality
```

#### Evidence Credibility Components

| Component | Formula | Range | Weight |
|-----------|---------|-------|--------|
| Source Authority | `source_reputation_score` | 0.0-1.0 | 30% |
| Temporal Relevance | `max(0, 1 - (age_days / 730))` | 0.0-1.0 | 20% |
| Cross-References | `min(1, corroborations / 5)` | 0.0-1.0 | 20% |
| Document Type | `type_credibility_multiplier` | 0.5-1.5 | 15% |
| Contradiction Penalty | `-0.1 * min(3, contradictions)` | -0.3-0.0 | 15% |

#### Document Type Credibility Multipliers

| Document Type | Multiplier | Rationale |
|--------------|------------|-----------|
| Primary Source | 1.50 | Original, unfiltered information |
| Peer-Reviewed Study | 1.40 | Rigorous academic validation |
| Official Government Record | 1.30 | Legal authority and verification |
| Court Document | 1.25 | Legal standards of evidence |
| Expert Analysis | 1.20 | Professional expertise |
| Investigative Journalism | 1.10 | Professional standards |
| News Report | 1.00 | Basic journalistic standards |
| Corporate Statement | 0.90 | Potential bias |
| Blog/Opinion | 0.80 | Limited verification |
| Social Media Post | 0.70 | Minimal verification |
| Anonymous Source | 0.50 | Unverifiable |

### 3. Source Diversity (≥3 Required)

```python
def calculate_source_diversity(graph):
    """
    Returns count of unique, independent sources
    """
    evidence_nodes = graph.get_nodes_of_type('evidence')
    unique_domains = set()
    unique_organizations = set()

    for evidence in evidence_nodes:
        domain = extract_domain(evidence.source_url)
        org = extract_organization(evidence.source_url)

        # Check for true independence
        if not is_subsidiary_or_affiliate(org, unique_organizations):
            unique_domains.add(domain)
            unique_organizations.add(org)

    return len(unique_domains)
```

#### Independence Verification

Sources are considered independent only if they meet ALL criteria:

1. Different domain names
2. Different parent organizations
3. No shared ownership structure
4. No content syndication agreements
5. Different geographic regions (for local news)

### 4. Community Agreement (≥80% Required)

```python
def calculate_weighted_consensus(votes):
    """
    Returns consensus percentage using weighted votes
    """
    total_support_weight = 0.0
    total_oppose_weight = 0.0

    for vote in votes:
        weight = calculate_vote_weight(vote)

        if vote.supports:
            total_support_weight += weight
        else:
            total_oppose_weight += weight

    total_weight = total_support_weight + total_oppose_weight

    if total_weight == 0:
        return 0.0

    consensus_percentage = total_support_weight / total_weight
    return consensus_percentage
```

#### Vote Weight Calculation

```python
def calculate_vote_weight(vote):
    """
    Returns weight between 0.1 and 3.0
    """
    # Base weight (everyone starts equal)
    base = 1.0

    # Evidence quality multiplier (0.1 - 2.0)
    if vote.provided_evidence:
        avg_quality = mean([e.credibility_score for e in vote.provided_evidence])
        evidence_mult = 0.1 + (1.9 * avg_quality)
    else:
        evidence_mult = 0.1

    # Diversity bonus (1.0 - 1.5)
    unique_sources = count_unique_sources(vote.provided_evidence)
    diversity_bonus = min(1.5, 1.0 + (0.1 * unique_sources))

    # Cap at 3.0 to prevent domination
    weight = min(3.0, base * evidence_mult * diversity_bonus)

    return weight
```

### 5. Minimum Participation (≥5 Required)

```python
def calculate_unique_participants(graph):
    """
    Returns count of unique users who have voted
    """
    votes = graph.get_all_votes()
    unique_users = set()

    for vote in votes:
        # Verify user is real (not bot/sockpuppet)
        if verify_user_authenticity(vote.user):
            unique_users.add(vote.user.id)

    return len(unique_users)
```

#### User Authenticity Verification

Users count toward participation only if:

1. Account age ≥ 7 days
2. Email verified (if required)
3. Not flagged as bot
4. Not sharing IP with >2 other voters
5. Has completed CAPTCHA (if triggered)

### 6. Challenge Resolution (0 Open Required)

```python
def count_open_challenges(graph):
    """
    Returns count of unresolved challenges
    """
    challenges = graph.get_challenges()
    open_count = 0

    for challenge in challenges:
        if challenge.status == 'open':
            # Check if challenge period expired
            if not challenge.is_expired():
                open_count += 1

    return open_count
```

## Secondary Criteria (Non-Blocking)

These criteria affect the promotion priority but don't block promotion:

| Criterion | Formula | Optimal Value | Impact |
|-----------|---------|---------------|--------|
| Evidence Recency | `median(evidence.age_days)` | < 180 days | Priority boost |
| Geographic Diversity | `count(unique(evidence.country))` | ≥ 3 | Trust increase |
| Language Diversity | `count(unique(evidence.language))` | ≥ 2 | Bias reduction |
| Peer Review | `count(peer_reviewed_sources) / total_sources` | ≥ 0.3 | Quality indicator |

## Temporal Considerations

### Time-Sensitive Claims

For claims with temporal components, additional criteria apply:

```python
def adjust_for_temporal_claims(graph, base_criteria):
    """
    Adjusts criteria for time-sensitive information
    """
    if graph.has_temporal_claims():
        max_evidence_age = 365  # 1 year for time-sensitive
        min_recent_sources = 2  # Need recent corroboration

        for evidence in graph.get_evidence():
            if evidence.age_days > max_evidence_age:
                evidence.credibility_score *= 0.5  # Decay old evidence

        # Require at least 2 sources from last 90 days
        recent_sources = count_sources_newer_than(graph, 90)
        if recent_sources < min_recent_sources:
            base_criteria.evidence_quality_threshold = 0.85  # Higher bar

    return base_criteria
```

## Automatic Promotion Triggers

```python
def check_promotion_eligibility(graph):
    """
    Main function that determines promotion eligibility
    """
    criteria_met = {
        'methodology_completion': False,
        'evidence_quality': False,
        'source_diversity': False,
        'community_agreement': False,
        'minimum_participation': False,
        'challenges_resolved': False
    }

    # Check each criterion
    if calculate_methodology_completion(graph) == 1.0:
        criteria_met['methodology_completion'] = True

    if calculate_average_evidence_quality(graph) >= 0.70:
        criteria_met['evidence_quality'] = True

    if calculate_source_diversity(graph) >= 3:
        criteria_met['source_diversity'] = True

    if calculate_weighted_consensus(graph) >= 0.80:
        criteria_met['community_agreement'] = True

    if calculate_unique_participants(graph) >= 5:
        criteria_met['minimum_participation'] = True

    if count_open_challenges(graph) == 0:
        criteria_met['challenges_resolved'] = True

    # All critical criteria must be met
    all_met = all(criteria_met.values())

    if all_met:
        # Additional gaming check before promotion
        gaming_risk = assess_gaming_risk(graph)
        if gaming_risk < 0.3:  # Low risk threshold
            return {
                'eligible': True,
                'criteria': criteria_met,
                'gaming_risk': gaming_risk
            }
        else:
            return {
                'eligible': False,
                'reason': 'Gaming risk too high',
                'gaming_risk': gaming_risk
            }

    return {
        'eligible': False,
        'criteria': criteria_met,
        'missing': [k for k, v in criteria_met.items() if not v]
    }
```

## Gaming Detection Thresholds

| Pattern | Threshold | Action |
|---------|-----------|--------|
| IP Clustering | >3 accounts same IP | Flag for review |
| Vote Velocity | >10 votes/minute | Temporary suspension |
| New Account Surge | >50% votes from <7 day accounts | Invalidate votes |
| Behavioral Similarity | >0.9 correlation | Investigate accounts |
| Evidence Recycling | >70% duplicate sources | Reduce weight |

## Retroactive Validation

Level 0 content undergoes periodic revalidation:

```python
def retroactive_validation_schedule():
    return {
        'high_traffic': 30,   # days - frequently accessed content
        'moderate_traffic': 90,  # days
        'low_traffic': 180,  # days
        'dormant': 365  # days - rarely accessed
    }
```

## Dashboard Visualization Requirements

### Progress Bars

Each criterion should display:
1. Current value (numeric)
2. Required threshold (numeric)
3. Visual progress bar (0-100%)
4. Status indicator (red/yellow/green)
5. Detailed breakdown on hover/click

### Color Coding

- **Green**: Criterion met
- **Yellow**: >75% of threshold
- **Orange**: 50-75% of threshold
- **Red**: <50% of threshold
- **Gray**: Not applicable

### Real-Time Updates

Updates should occur:
- On each new vote: Immediately
- On evidence addition: Within 5 seconds
- On challenge status change: Immediately
- Methodology progress: On each graph save

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-09
**Next Review**: 2025-01-09