# Process Validation System - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EGALITARIAN PROMOTION SYSTEM                      │
│                     No Curators · Math Only                          │
└─────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  User Creates│
                              │  Level 1     │
                              │  Graph       │
                              └──────┬───────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      PROMOTION CRITERIA                             │
│                    (All must be >= 80%)                             │
└────────────────────────────────────────────────────────────────────┘

        ┌──────────────┬──────────────┬──────────────┬──────────────┐
        │              │              │              │              │
        ▼              ▼              ▼              ▼              │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Methodology  │ │  Consensus   │ │  Evidence    │ │  Challenge   │
│ Completion   │ │   Voting     │ │   Quality    │ │  Resolution  │
│              │ │              │ │              │ │              │
│  8/10 steps  │ │  5 votes     │ │  15 sources  │ │  0 open      │
│  = 80%       │ │  avg = 0.85  │ │  avg = 0.9   │ │  = 100%      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Overall Score   │
                    │  = MIN(all 4)    │
                    │  = 80%           │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  >= 80% ?        │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼ YES                   ▼ NO
        ┌──────────────────┐    ┌──────────────────┐
        │ AUTO-PROMOTE      │    │ Return Missing   │
        │ Level 1 → Level 2 │    │ Requirements     │
        │ No Approval!      │    │ Keep Working     │
        └──────┬───────────┘    └──────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Log Event         │
        │ Notify Community  │
        │ Update UI         │
        └──────────────────┘
```

## Detailed Criterion Flows

### 1. Methodology Completion Flow

```
User Works on Graph
        │
        ▼
┌──────────────────────────────────┐
│ Complete Workflow Steps          │
│                                  │
│ 1. Define Research Question  ✓   │
│ 2. Literature Review         ✓   │
│ 3. Methodology Design        ✓   │
│ 4. Data Collection           ✓   │
│ 5. Analysis                  ✓   │
│ 6. Peer Review              ✓   │
│ 7. Revision                 ✓   │
│ 8. Final Documentation      ✓   │
└────────────┬─────────────────────┘
             │
             ▼
   markWorkflowStepComplete()
             │
             ▼
   ┌────────────────────┐
   │ Score = 8/10 = 80% │ ✓ Meets Threshold
   └────────────────────┘
```

### 2. Consensus Voting Flow

```
Community Reviews Graph
        │
        ├──────┬──────┬──────┬──────┐
        ▼      ▼      ▼      ▼      ▼
    User A  User B  User C  User D  User E
    Vote    Vote    Vote    Vote    Vote
    0.95    0.85    0.9     0.8     0.9
    │       │       │       │       │
    ▼       ▼       ▼       ▼       ▼
  Weight  Weight  Weight  Weight  Weight
   0.8     0.6     0.9     0.5     0.7
    │       │       │       │       │
    └───────┴───────┴───────┴───────┘
                │
                ▼
    submitConsensusVote()
                │
                ▼
    ┌──────────────────────────────┐
    │ Weighted Average:            │
    │ (0.95×0.8 + 0.85×0.6 +      │
    │  0.9×0.9 + 0.8×0.5 +        │
    │  0.9×0.7) / (0.8+0.6+       │
    │  0.9+0.5+0.7)               │
    │ = 2.68 / 3.5 = 0.88 = 88%   │
    └──────────────────────────────┘
                │
                ▼
    ✓ Meets Threshold (>= 80%)
    ✓ Has Min Votes (5 >= 3)
```

### 3. Evidence Quality Flow

```
Graph Has Claims
        │
        ▼
┌─────────────────────────────────┐
│ Evidence Items:                 │
│                                 │
│ Node 1 Evidence:                │
│   • Source A (confidence: 0.9)  │
│   • Source B (confidence: 0.85) │
│   • Source C (confidence: 0.95) │
│                                 │
│ Node 2 Evidence:                │
│   • Source D (confidence: 0.8)  │
│   • Source E (confidence: 0.9)  │
│                                 │
│ Edge 1 Evidence:                │
│   • Source F (confidence: 0.88) │
│   • Source G (confidence: 0.92) │
└────────────┬────────────────────┘
             │
             ▼
   calculateEvidenceQualityScore()
             │
             ▼
   ┌────────────────────────────┐
   │ Average = (0.9 + 0.85 +    │
   │ 0.95 + 0.8 + 0.9 + 0.88 +  │
   │ 0.92) / 7 = 0.886 = 88.6%  │
   └────────────────────────────┘
             │
             ▼
   ✓ Meets Threshold (>= 80%)
```

### 4. Challenge Resolution Flow

```
Graph Under Review
        │
        ▼
┌─────────────────────────┐
│ Check Open Challenges   │
│                         │
│ Challenge 1: RESOLVED   │
│ Challenge 2: RESOLVED   │
│ Challenge 3: RESOLVED   │
│ Challenge 4: RESOLVED   │
│                         │
│ Open Challenges: 0      │
└────────┬────────────────┘
         │
         ▼
calculateChallengeResolutionScore()
         │
         ▼
┌────────────────────┐
│ Score = 0 open?    │
│ YES → 1.0 (100%)   │
│ NO  → 0.0 (0%)     │
└────────┬───────────┘
         │
         ▼
✓ Meets Threshold (100% >= 80%)

Note: Binary - Even 1 open challenge = 0%
```

## User Reputation Calculation

```
User Activity Over Time
        │
        ├──────────┬──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
   Evidence   Voting    Methodology  Challenge
   Submitted  Pattern   Completion   Resolution
        │          │          │          │
        ▼          ▼          ▼          ▼
   15 items   25 votes   3 complete  8/10 resolved
   12 verified align 80%
        │          │          │          │
        ▼          ▼          ▼          ▼
   Quality    Alignment  Completion  Resolution
   0.85×0.8   0.8×1.0    0.2         0.8×1.0
   = 0.68     = 0.8      = 0.2       = 0.8
        │          │          │          │
        └──────────┴──────────┴──────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ Reputation Formula:    │
        │ 0.68×0.4 (evidence)    │
        │ + 0.8×0.3 (voting)     │
        │ + 0.2 (methodology)    │
        │ + 0.8×0.1 (challenges) │
        │ = 0.272 + 0.24 +       │
        │   0.2 + 0.08           │
        │ = 0.792 (79.2%)        │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ Vote Weight = 0.792    │
        │ (Higher influence)     │
        └────────────────────────┘
```

## Promotion Request Flow

```
User Action:
requestPromotionEvaluation(graphId)
        │
        ▼
┌─────────────────────────────┐
│ 1. Get Current Level        │
│    → Level 1                │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. Recalculate Criteria     │
│    → Methodology: 80%       │
│    → Consensus: 88%         │
│    → Evidence: 88.6%        │
│    → Challenges: 100%       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. Calculate Overall        │
│    → MIN(80, 88, 88.6, 100) │
│    → 80%                    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. Check Eligibility        │
│    → 80% >= 80% ? YES ✓     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. AUTO-PROMOTE             │
│    → Update: Level 1 → 2    │
│    → No approval needed!    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 6. Log Promotion Event      │
│    → Timestamp              │
│    → All scores recorded    │
│    → Immutable audit trail  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 7. Notify Community         │
│    → Publish subscription   │
│    → Update UI              │
│    → Show celebration 🎉    │
└─────────────────────────────┘
```

## Real-time Subscription Flow

```
Frontend Subscribes
        │
        ▼
┌──────────────────────────────┐
│ subscription {               │
│   promotionEligibilityUpdated│
│ }                            │
└────────┬─────────────────────┘
         │
         ▼
WebSocket Connection Established
         │
         │ (Events trigger updates)
         │
         ├─────────────────┬─────────────────┬─────────────────┐
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
    Vote Cast      Step Completed   Evidence Added  Challenge Resolved
         │                 │                 │                 │
         └─────────────────┴─────────────────┴─────────────────┘
                           │
                           ▼
              Recalculate Eligibility
                           │
                           ▼
              Publish to Subscription
                           │
                           ▼
┌──────────────────────────────────────────┐
│ Frontend Receives Update:                │
│                                          │
│ Progress Bars Update in Real-time:      │
│ Methodology: [████████░░] 80% → 90%     │
│ Consensus:   [██████████] 88% → 92%     │
│ Evidence:    [█████████░] 88.6% → 91%   │
│ Challenges:  [██████████] 100%          │
│ Overall:     [████████░░] 80% → 90%     │
│                                          │
│ Status: ELIGIBLE ✓                       │
└──────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         GraphQL API                          │
│                                                              │
│  Queries           Mutations              Subscriptions     │
│  • Get Status      • Submit Vote          • Eligibility     │
│  • Get Progress    • Mark Complete        • Promotion       │
│  • Get Votes       • Request Promotion                      │
└───────┬────────────────────┬────────────────────┬───────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ProcessValidation│ │  Database       │  │  Redis PubSub   │
│  Resolver        │  │  PostgreSQL     │  │  WebSocket      │
│                 │  │                 │  │                 │
│  • Calculate    │──│→ Read/Write    │  │  • Real-time    │
│    Scores       │  │  • Votes        │  │    Updates      │
│  • Validate     │  │  • Completions  │  │  • Event        │
│    Criteria     │  │  • Events       │  │    Publishing   │
│  • Auto-promote │  │  • Reputation   │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                           │
                           ▼
                ┌──────────────────┐
                │  Audit Trail     │
                │  • All votes     │
                │  • All promotions│
                │  • All events    │
                │  • Immutable log │
                └──────────────────┘
```

## Decision Tree

```
                    Start: Request Promotion
                             │
                             ▼
                    Is Graph Level 0?
                      ╱         ╲
                   YES           NO
                    │             │
                    ▼             ▼
            Reject: Level 0   Calculate All
            cannot promote    Criteria
                              │
                              ▼
                    All scores >= 80%?
                      ╱         ╲
                   YES           NO
                    │             │
                    ▼             ▼
            AUTO-PROMOTE!    Return Missing
            Level N → N+1    Requirements
                    │             │
                    ▼             ▼
            Log Event        User Improves
            Notify All       Graph
            Success!              │
                                 │
                                 └──→ Request Again
```

## Philosophy Visualization

```
Traditional Curator Model          Rabbithole Process Validation
────────────────────────          ──────────────────────────────

     User                               User
      │                                  │
      ▼                                  ▼
   Submit ──────────┐              Objective Criteria
      │             │               ╱    │    │    ╲
      ▼             │             ╱      │    │      ╲
   Wait...          │        Method  Consensus  Evidence  Challenges
      │             │            ╲      │    │      ╱
      ▼             ▼             ╲     │    │    ╱
 Curator Review  Subjective       All >= 80%?
      │          Decision               │
      ▼             │                   ▼
 Yes/No based      │             AUTOMATIC
  on opinion       │             PROMOTION
      │             │                   │
      │             │                   ▼
      └─────────────┘           Instant Feedback
                                No Gatekeepers!

  Problems:                     Benefits:
  • Bias                        • Objective
  • Slow                        • Fast
  • Opaque                      • Transparent
  • Bottleneck                  • Scalable
  • Inconsistent                • Consistent
```

## Summary Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE EGALITARIAN FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Anyone Creates Graph
        ↓
Anyone Adds Evidence
        ↓
Anyone Completes Methodology Steps
        ↓
Anyone Votes on Quality
        ↓
Math Calculates Scores
        ↓
ALL Criteria >= 80%?
        ↓ YES
AUTOMATIC PROMOTION
        ↓
Everyone Notified
        ↓
Complete Transparency

┌─────────────────────────────────────────────────────────────────┐
│  NO CURATORS · NO AUTHORITY · NO DISCRETION · JUST MATH         │
└─────────────────────────────────────────────────────────────────┘
```
