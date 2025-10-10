# Process Validation System Specification

## Executive Summary

This document specifies the implementation details for the Egalitarian Process Validation System that governs Level 0 promotion in the Rabbit Hole platform. The system replaces hierarchical curator roles with objective, transparent, and mathematically-defined promotion criteria.

## System Components

### 1. Methodology Compliance Engine

The methodology compliance engine ensures that investigations follow established formal methodologies before promotion consideration.

#### Supported Methodologies

##### Scientific Method
```json
{
  "methodology": "scientific_method",
  "required_steps": [
    "question_formulation",
    "hypothesis_statement",
    "experimental_design",
    "data_collection",
    "analysis",
    "conclusion"
  ],
  "required_nodes": [
    { "type": "question", "min": 1 },
    { "type": "hypothesis", "min": 1 },
    { "type": "experiment", "min": 1 },
    { "type": "data", "min": 3 },
    { "type": "analysis", "min": 1 },
    { "type": "conclusion", "min": 1 }
  ],
  "required_edges": [
    { "type": "supports", "min": 3 },
    { "type": "contradicts", "min": 0 },
    { "type": "derives_from", "min": 2 }
  ]
}
```

##### Legal Discovery
```json
{
  "methodology": "legal_discovery",
  "required_steps": [
    "identification",
    "preservation",
    "collection",
    "review",
    "analysis",
    "production"
  ],
  "required_nodes": [
    { "type": "source", "min": 3 },
    { "type": "evidence", "min": 5 },
    { "type": "claim", "min": 1 },
    { "type": "timeline", "min": 1 }
  ],
  "required_edges": [
    { "type": "evidences", "min": 5 },
    { "type": "contradicts", "min": 0 },
    { "type": "corroborates", "min": 2 },
    { "type": "precedes", "min": 1 }
  ]
}
```

##### Toulmin Argumentation
```json
{
  "methodology": "toulmin_argumentation",
  "required_steps": [
    "claim_statement",
    "grounds_provision",
    "warrant_establishment",
    "backing_support",
    "qualifier_addition",
    "rebuttal_consideration"
  ],
  "required_nodes": [
    { "type": "claim", "min": 1 },
    { "type": "grounds", "min": 3 },
    { "type": "warrant", "min": 1 },
    { "type": "backing", "min": 2 },
    { "type": "qualifier", "min": 1 }
  ],
  "required_edges": [
    { "type": "supports", "min": 3 },
    { "type": "warrants", "min": 1 },
    { "type": "qualifies", "min": 1 }
  ]
}
```

### 2. Evidence Quality Scoring System

#### Credibility Score Calculation

```python
def calculate_evidence_credibility(evidence):
    base_score = 0.5

    # Source credibility (0.0 - 0.3)
    source_score = evaluate_source_credibility(evidence.source)

    # Temporal relevance (0.0 - 0.2)
    age_days = (current_date - evidence.date).days
    temporal_score = max(0, 0.2 * (1 - age_days / 730))  # 2-year decay

    # Cross-reference bonus (0.0 - 0.2)
    cross_ref_score = min(0.2, 0.05 * evidence.corroborating_sources)

    # Evidence type multiplier (0.5 - 1.5)
    type_multipliers = {
        'primary_source': 1.5,
        'peer_reviewed': 1.4,
        'official_record': 1.3,
        'expert_testimony': 1.2,
        'news_report': 1.0,
        'social_media': 0.7,
        'anonymous': 0.5
    }
    type_mult = type_multipliers.get(evidence.type, 1.0)

    # Contradiction penalty (-0.3 - 0.0)
    contradiction_penalty = -0.1 * min(3, evidence.contradicting_sources)

    final_score = (base_score + source_score + temporal_score +
                   cross_ref_score + contradiction_penalty) * type_mult

    return max(0.0, min(1.0, final_score))
```

#### Source Credibility Database

```json
{
  "trusted_sources": {
    "academic_journals": {
      "nature.com": 0.95,
      "science.org": 0.95,
      "pubmed.ncbi.nlm.nih.gov": 0.90
    },
    "government": {
      "*.gov": 0.85,
      "data.gov": 0.90,
      "europa.eu": 0.85
    },
    "established_media": {
      "reuters.com": 0.80,
      "apnews.com": 0.80,
      "bbc.com": 0.75
    }
  },
  "untrusted_sources": {
    "known_misinformation": {
      "pattern": "*/fake-news-site.com",
      "score": 0.1
    }
  }
}
```

### 3. Consensus Building Mechanism

#### Weighted Voting Algorithm

```python
def calculate_vote_weight(user, evidence_provided):
    # Base weight - all users equal
    base_weight = 1.0

    # Evidence quality multiplier (0.1 - 2.0)
    if evidence_provided:
        evidence_scores = [calculate_evidence_credibility(e)
                          for e in evidence_provided]
        evidence_mult = 0.1 + (1.9 * mean(evidence_scores))
    else:
        evidence_mult = 0.1  # Minimal weight without evidence

    # Source diversity bonus (1.0 - 1.5)
    unique_sources = len(set([e.source.domain for e in evidence_provided]))
    diversity_bonus = min(1.5, 1.0 + (0.1 * unique_sources))

    # Calculate final weight (max 3.0 to prevent domination)
    final_weight = min(3.0, base_weight * evidence_mult * diversity_bonus)

    return final_weight
```

#### Consensus Calculation

```python
def calculate_consensus(votes):
    total_weighted_support = sum([v.weight for v in votes if v.support])
    total_weighted_oppose = sum([v.weight for v in votes if not v.support])
    total_weight = total_weighted_support + total_weighted_oppose

    if total_weight == 0:
        return 0.0

    consensus_percentage = total_weighted_support / total_weight
    return consensus_percentage
```

### 4. Anti-Gaming Detection System

#### Pattern Detection Rules

```python
class AntiGamingDetector:
    def detect_sybil_attack(self, votes):
        patterns = []

        # IP clustering
        ip_clusters = self.cluster_by_ip(votes)
        for cluster in ip_clusters:
            if len(cluster) > 3:
                patterns.append({
                    'type': 'ip_clustering',
                    'severity': 'high',
                    'accounts': cluster
                })

        # Temporal clustering (rapid voting)
        time_windows = self.analyze_vote_timing(votes)
        for window in time_windows:
            if window.vote_rate > 10:  # >10 votes per minute
                patterns.append({
                    'type': 'rapid_voting',
                    'severity': 'medium',
                    'timeframe': window
                })

        # Account age correlation
        new_accounts = [v for v in votes
                       if v.account_age_days < 7]
        if len(new_accounts) / len(votes) > 0.5:
            patterns.append({
                'type': 'new_account_surge',
                'severity': 'high',
                'percentage': len(new_accounts) / len(votes)
            })

        # Behavioral similarity
        behavior_clusters = self.cluster_by_behavior(votes)
        for cluster in behavior_clusters:
            if cluster.similarity_score > 0.9:
                patterns.append({
                    'type': 'behavioral_similarity',
                    'severity': 'medium',
                    'accounts': cluster.accounts
                })

        return patterns

    def calculate_gaming_risk_score(self, patterns):
        risk_weights = {
            'ip_clustering': 0.4,
            'rapid_voting': 0.2,
            'new_account_surge': 0.3,
            'behavioral_similarity': 0.1
        }

        severity_multipliers = {
            'high': 1.0,
            'medium': 0.5,
            'low': 0.2
        }

        risk_score = 0.0
        for pattern in patterns:
            weight = risk_weights.get(pattern['type'], 0.1)
            severity = severity_multipliers.get(pattern['severity'], 0.5)
            risk_score += weight * severity

        return min(1.0, risk_score)
```

### 5. Promotion Eligibility Dashboard

#### Real-Time Progress Tracking

```javascript
const PromotionCriteria = {
  methodology_completion: {
    label: "Methodology Completion",
    current: 85,
    required: 100,
    unit: "%",
    details: {
      completed_steps: ["question", "hypothesis", "experiment"],
      missing_steps: ["analysis", "conclusion"]
    }
  },

  evidence_quality: {
    label: "Evidence Quality Score",
    current: 0.65,
    required: 0.70,
    unit: "score",
    details: {
      total_evidence: 8,
      high_quality: 3,
      medium_quality: 4,
      low_quality: 1
    }
  },

  source_diversity: {
    label: "Independent Sources",
    current: 2,
    required: 3,
    unit: "sources",
    details: {
      domains: ["reuters.com", "nature.com"],
      needed: 1
    }
  },

  community_agreement: {
    label: "Community Consensus",
    current: 75,
    required: 80,
    unit: "%",
    details: {
      support_votes: 15,
      oppose_votes: 5,
      weighted_support: 42.5,
      weighted_total: 56.7
    }
  },

  participation_threshold: {
    label: "Minimum Participants",
    current: 4,
    required: 5,
    unit: "users",
    details: {
      participants: ["user123", "user456", "user789", "user012"]
    }
  },

  challenge_status: {
    label: "Open Challenges",
    current: 1,
    required: 0,
    unit: "challenges",
    details: {
      open: [{
        id: "ch_xyz",
        type: "source_credibility",
        raised_by: "user999"
      }]
    }
  }
};
```

### 6. AI Guidance System

#### Methodology Assistant

```python
class MethodologyAssistant:
    def suggest_next_step(self, graph, methodology):
        completed_steps = self.identify_completed_steps(graph, methodology)
        all_steps = methodology.required_steps

        next_steps = [s for s in all_steps if s not in completed_steps]

        if not next_steps:
            return {
                'status': 'complete',
                'message': 'All methodology steps completed!'
            }

        return {
            'status': 'in_progress',
            'next_step': next_steps[0],
            'suggestion': self.get_step_guidance(next_steps[0]),
            'missing_nodes': self.identify_missing_nodes(graph, methodology),
            'missing_edges': self.identify_missing_edges(graph, methodology)
        }

    def validate_logical_consistency(self, graph):
        inconsistencies = []

        # Check for contradicting evidence supporting same claim
        for claim in graph.get_claims():
            supporting = claim.get_supporting_evidence()
            for e1 in supporting:
                for e2 in supporting:
                    if e1.contradicts(e2):
                        inconsistencies.append({
                            'type': 'contradicting_support',
                            'claim': claim.id,
                            'evidence': [e1.id, e2.id]
                        })

        # Check for circular reasoning
        cycles = self.detect_cycles(graph)
        for cycle in cycles:
            inconsistencies.append({
                'type': 'circular_reasoning',
                'nodes': cycle
            })

        return inconsistencies
```

## Database Schema

### Validation Tables

```sql
-- Promotion criteria tracking
CREATE TABLE promotion_criteria (
    id UUID PRIMARY KEY,
    graph_id UUID REFERENCES graphs(id),
    methodology VARCHAR(50) NOT NULL,
    methodology_completion DECIMAL(5,2) DEFAULT 0,
    evidence_quality_score DECIMAL(3,2) DEFAULT 0,
    source_diversity_count INTEGER DEFAULT 0,
    community_agreement_percentage DECIMAL(5,2) DEFAULT 0,
    participation_count INTEGER DEFAULT 0,
    open_challenges_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    promotion_eligible BOOLEAN DEFAULT FALSE,
    promoted_at TIMESTAMP,
    CONSTRAINT fk_graph FOREIGN KEY (graph_id) REFERENCES graphs(id)
);

-- Evidence quality scores
CREATE TABLE evidence_scores (
    id UUID PRIMARY KEY,
    evidence_id UUID REFERENCES nodes(id),
    source_credibility DECIMAL(3,2),
    temporal_relevance DECIMAL(3,2),
    cross_reference_score DECIMAL(3,2),
    type_multiplier DECIMAL(3,2),
    contradiction_penalty DECIMAL(3,2),
    final_score DECIMAL(3,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weighted votes
CREATE TABLE weighted_votes (
    id UUID PRIMARY KEY,
    vote_id UUID REFERENCES votes(id),
    user_id UUID REFERENCES users(id),
    graph_id UUID REFERENCES graphs(id),
    base_weight DECIMAL(3,2) DEFAULT 1.0,
    evidence_multiplier DECIMAL(3,2),
    diversity_bonus DECIMAL(3,2),
    final_weight DECIMAL(3,2) NOT NULL,
    evidence_provided JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gaming detection logs
CREATE TABLE gaming_detection_logs (
    id UUID PRIMARY KEY,
    graph_id UUID REFERENCES graphs(id),
    detection_type VARCHAR(50),
    severity VARCHAR(20),
    risk_score DECIMAL(3,2),
    affected_accounts JSONB,
    pattern_data JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT
);
```

## API Endpoints

### GraphQL Schema Extensions

```graphql
type PromotionCriteria {
  id: ID!
  graph: Graph!
  methodology: String!
  methodologyCompletion: Float!
  evidenceQualityScore: Float!
  sourceDiversityCount: Int!
  communityAgreementPercentage: Float!
  participationCount: Int!
  openChallengesCount: Int!
  lastUpdated: DateTime!
  promotionEligible: Boolean!
  promotedAt: DateTime

  # Detailed breakdowns
  methodologyDetails: MethodologyProgress!
  evidenceDetails: [EvidenceScore!]!
  consensusDetails: ConsensusBreakdown!
  gamingRiskAssessment: GamingRiskReport
}

type MethodologyProgress {
  completedSteps: [String!]!
  remainingSteps: [String!]!
  presentNodes: [NodeTypeCount!]!
  missingNodes: [NodeTypeRequirement!]!
  presentEdges: [EdgeTypeCount!]!
  missingEdges: [EdgeTypeRequirement!]!
  suggestions: [MethodologySuggestion!]!
}

type EvidenceScore {
  evidence: Node!
  sourceCredibility: Float!
  temporalRelevance: Float!
  crossReferenceScore: Float!
  typeMultiplier: Float!
  contradictionPenalty: Float!
  finalScore: Float!
}

type ConsensusBreakdown {
  totalParticipants: Int!
  weightedSupport: Float!
  weightedOppose: Float!
  consensusPercentage: Float!
  voteDistribution: [VoteWeight!]!
}

type GamingRiskReport {
  riskScore: Float!
  detectedPatterns: [GamingPattern!]!
  flaggedAccounts: [User!]!
  recommendedAction: String
}

# Queries
extend type Query {
  promotionCriteria(graphId: ID!): PromotionCriteria
  promotionEligibility(graphId: ID!): PromotionEligibilityReport!
  methodologyRequirements(methodology: String!): MethodologyRequirements!
}

# Mutations
extend type Mutation {
  castWeightedVote(graphId: ID!, support: Boolean!, evidence: [ID!]): WeightedVote!
  reportGamingSuspicion(graphId: ID!, reason: String!): GamingReport!
}

# Subscriptions
extend type Subscription {
  promotionProgressUpdated(graphId: ID!): PromotionCriteria!
  consensusChanged(graphId: ID!): ConsensusBreakdown!
}
```

## Security Measures

### Rate Limiting

```yaml
rate_limits:
  voting:
    per_user_per_hour: 20
    per_ip_per_hour: 50
    per_graph_per_hour: 100

  evidence_submission:
    per_user_per_day: 100
    per_graph_per_day: 500

  promotion_checks:
    per_graph_per_minute: 1
```

### Audit Trail

```python
class AuditLogger:
    def log_promotion_attempt(self, graph_id, criteria_snapshot):
        return {
            'event': 'promotion_attempt',
            'graph_id': graph_id,
            'timestamp': datetime.now(),
            'criteria': criteria_snapshot,
            'result': 'success' if all_criteria_met(criteria_snapshot) else 'failed',
            'missing_criteria': identify_missing_criteria(criteria_snapshot)
        }

    def log_vote_cast(self, user_id, graph_id, vote_weight, evidence):
        return {
            'event': 'weighted_vote_cast',
            'user_id': user_id,
            'graph_id': graph_id,
            'timestamp': datetime.now(),
            'vote_weight': vote_weight,
            'evidence_count': len(evidence),
            'evidence_quality': mean([e.credibility for e in evidence])
        }

    def log_gaming_detection(self, graph_id, patterns):
        return {
            'event': 'gaming_pattern_detected',
            'graph_id': graph_id,
            'timestamp': datetime.now(),
            'patterns': patterns,
            'risk_score': calculate_risk_score(patterns),
            'action_taken': determine_action(patterns)
        }
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-09