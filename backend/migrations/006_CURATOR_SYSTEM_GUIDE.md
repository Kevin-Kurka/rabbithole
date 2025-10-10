# Curator Roles & Permissions System - Implementation Guide

## Overview

The Curator System (Phase 3) implements a comprehensive role-based access control (RBAC) system for managing Level 0 content and maintaining the integrity of the Project Rabbit Hole knowledge graph. This system provides:

- **5 specialized curator roles** with distinct responsibilities
- **Granular permission system** for fine-grained access control
- **Community-driven application workflow** with voting
- **Comprehensive audit logging** for transparency
- **Peer review system** for accountability
- **Performance metrics** and quality tracking

## Core Principles

### Trust Through Transparency
Every curator action is logged, reviewable, and traceable. The audit log provides a complete history of Level 0 modifications.

### Community-Driven Validation
Curators are vetted through a community voting process. Their continued service depends on maintaining high quality standards.

### Accountability First
Peer reviews, performance metrics, and the ability to suspend or revoke curator status ensure accountability.

### Expertise-Based Authority
Different roles have different permissions based on their areas of expertise and the platform's needs.

---

## Curator Roles

### 1. Community Curator (Tier 1)
**Primary Responsibility**: General content moderation and community support

**Requirements**:
- Reputation: 500+
- Contributions: 25+
- Expertise: Community moderation, content review

**Permissions**:
- View Level 0 content (read-only)
- Approve/reject veracity score increases (with peer review)
- Review and comment on curator applications
- Cannot directly create or edit Level 0 content

**Use Case**: Sarah has been an active community member for 6 months, consistently providing helpful feedback and identifying low-quality submissions. She applies to become a Community Curator to help review pending veracity approvals.

### 2. Fact Checker (Tier 2)
**Primary Responsibility**: Verify factual accuracy using primary sources

**Requirements**:
- Reputation: 1000+
- Contributions: 50+
- Expertise: Fact checking, source verification

**Permissions**:
- Verify factual claims using primary sources
- Edit Level 0 nodes after verification
- Assign veracity scores
- Validate sources used for fact checking
- Cross-reference information

**Use Case**: James is a professional journalist with 10 years of experience. He uses his research skills to verify claims by tracking down primary sources and cross-referencing multiple independent sources.

### 3. Source Validator (Tier 2)
**Primary Responsibility**: Assess source credibility and identify primary sources

**Requirements**:
- Reputation: 1000+
- Contributions: 50+
- Expertise: Source analysis, media verification

**Permissions**:
- Full control over source validation
- Assess credibility and reliability
- Identify primary sources vs derivatives
- Detect manipulated media
- Read-only Level 0 access for source validation

**Use Case**: Maria specializes in media forensics. She uses tools like perceptual hashing and metadata analysis to identify original sources, detect manipulated images, and assess the credibility of various media outlets.

### 4. Methodology Specialist (Tier 3)
**Primary Responsibility**: Ensure investigations follow rigorous methodologies

**Requirements**:
- Reputation: 1500+
- Contributions: 75+
- Expertise: Methodology, research methods, logic

**Permissions**:
- Create, edit, and validate methodologies
- Approve/reject based on methodology rigor
- Guide users in applying formal inquiry methods
- Review methodology templates
- Read-only Level 0 access

**Use Case**: Dr. Chen is a research methodology professor who ensures that investigations on the platform follow proper scientific method, legal discovery, or structured argumentation frameworks.

### 5. Domain Expert (Tier 3)
**Primary Responsibility**: Validate claims within specific domains

**Requirements**:
- Reputation: 1500+
- Contributions: 75+
- Expertise: Domain-specific (e.g., medicine, law, history, science)

**Permissions**:
- Create and edit Level 0 content (with peer review)
- Approve/reject veracity scores in their domain
- Validate sources related to their expertise
- Assess quality of domain-specific evidence
- Provide expert judgment on complex topics

**Use Case**: Dr. Patel is an epidemiologist with 15 years of experience. She reviews medical claims related to infectious diseases, ensuring that evidence meets scientific standards before promotion to Level 0.

---

## Application Workflow

### Step 1: Check Eligibility

Before applying, users must meet the role requirements:

```graphql
query CheckEligibility {
  me {
    reputation
    contributionCount
    challengesWon
  }
  curatorRoles {
    id
    roleName
    displayName
    minReputationRequired
    minContributionsRequired
    expertiseAreasRequired
  }
}
```

### Step 2: Submit Application

```graphql
mutation SubmitApplication {
  submitCuratorApplication(input: {
    roleId: "uuid-of-role"
    applicationStatement: "I want to contribute to maintaining Level 0 integrity by..."
    motivation: "My background in journalism and 5 years of experience in fact-checking..."
    expertiseAreas: ["fact_checking", "source_verification", "journalism"]
    relevantExperience: "Professional fact-checker at FactCheck.org, specialized in media literacy..."
    sampleContributions: ["node-id-1", "edge-id-2", "challenge-id-3"]
  }) {
    id
    status
    votingDeadline
    reputationAtApplication
  }
}
```

### Step 3: Community Voting Period

Applications enter a voting period (typically 7-14 days):

```graphql
query PendingApplications {
  curatorApplications(filters: { status: "voting", votingOpen: true }) {
    id
    user {
      username
    }
    role {
      displayName
    }
    applicationStatement
    expertiseAreas
    reputationAtApplication
    votesFor
    votesAgainst
    approvalRatio
    votingDeadline
  }
}
```

Community members can vote:

```graphql
mutation VoteOnApplication {
  voteOnCuratorApplication(input: {
    applicationId: "uuid-of-application"
    vote: "for"  # or "against" or "abstain"
    rationale: "Excellent track record of high-quality contributions..."
  }) {
    id
    vote
    voteWeight
  }
}
```

**Vote Weighting**: Votes are weighted by reputation to prevent gaming:
- Base weight: 1.0
- Maximum weight: 5.0
- Formula: `min(5.0, max(1.0, reputation / 200))`

### Step 4: Review and Decision

Senior curators review applications that meet voting thresholds:

```graphql
mutation ReviewApplication {
  reviewCuratorApplication(input: {
    applicationId: "uuid-of-application"
    decision: "approved"  # or "rejected" or "needs_revision"
    decisionReason: "Strong background and community support"
    conditionsForApproval: "Complete orientation training within 30 days"
    probationPeriodDays: 90
  }) {
    id
    status
    decision
    decisionMadeAt
  }
}
```

### Step 5: Onboarding

Upon approval, the system automatically:
1. Creates a `UserCurator` record
2. Assigns role permissions
3. Sets probation period (if specified)
4. Sends onboarding notifications

---

## Permission System

### Permission Types

The system defines 9 permission types:

1. **level_0_content** - General Level 0 access
2. **level_0_nodes** - Specific node operations
3. **level_0_edges** - Specific edge operations
4. **veracity_approval** - Approve veracity scores
5. **methodology_validation** - Validate methodologies
6. **source_validation** - Validate sources
7. **curator_review** - Review other curators
8. **user_moderation** - Moderate users/curators
9. **application_review** - Review curator applications

### Permission Actions

Each permission type can grant these actions:
- `can_create` - Create new resources
- `can_read` - View resources
- `can_edit` - Modify existing resources
- `can_delete` - Remove resources
- `can_approve` - Approve changes/submissions
- `can_reject` - Reject changes/submissions

### Advanced Permissions

- `can_promote_to_level_0` - Promote Level 1 to Level 0
- `can_demote_from_level_0` - Demote from Level 0
- `can_assign_veracity_score` - Directly assign scores
- `can_override_consensus` - Override community consensus

### Checking Permissions

In TypeGraphQL resolvers, use middleware:

```typescript
import {
  RequireCuratorPermission,
  CuratorPermissionType,
  ResourceType,
  PermissionAction
} from '../middleware/curatorPermissions';

@Mutation(() => Node)
@UseMiddleware(RequireCuratorPermission(
  CuratorPermissionType.LEVEL_0_NODES,
  ResourceType.NODE,
  PermissionAction.CREATE
))
async createLevel0Node(...) {
  // Only curators with level_0_nodes.create permission can execute
}
```

Or check programmatically:

```typescript
const hasPermission = await checkCuratorPermission(
  pool,
  userId,
  'level_0_content',
  'node',
  'edit'
);
```

### Permission Overrides

Individual curators can receive custom permission overrides:

```graphql
mutation GrantPermission {
  grantCuratorPermission(input: {
    userCuratorId: "uuid-of-curator"
    permissionType: "level_0_nodes"
    resourceType: "node"
    overrideType: "grant"  # or "revoke" or "modify"
    canCreate: true
    canEdit: true
    reason: "Temporary elevated access for migration project"
    expiresAt: "2025-12-31T23:59:59Z"
  }) {
    id
    permissionType
    overrideType
  }
}
```

---

## Audit Logging

### Automatic Logging

Every curator action is automatically logged with:
- **Who**: Curator ID and user ID
- **What**: Action type and resource affected
- **When**: Timestamp with timezone
- **Why**: Reason and notes (if provided)
- **How**: IP address, user agent, session ID
- **Changes**: Before/after values (JSON diff)

### Logging Actions Manually

```graphql
mutation LogAction {
  logCuratorAction(input: {
    actionType: "edit_node"
    resourceType: "node"
    resourceId: "uuid-of-node"
    oldValue: "{\"title\":\"Old Title\",\"weight\":0.95}"
    newValue: "{\"title\":\"Updated Title\",\"weight\":1.0}"
    reason: "Correcting typo and promoting to Level 0"
    relatedEvidenceIds: ["evidence-id-1", "evidence-id-2"]
  }) {
    id
    performedAt
    requiresPeerReview
  }
}
```

### Querying Audit Logs

View all curator actions:

```graphql
query AuditLogs {
  curatorAuditLogs(
    filters: {
      actionType: "promote_to_level_0"
      dateFrom: "2025-10-01T00:00:00Z"
      dateTo: "2025-10-31T23:59:59Z"
    }
    limit: 100
    offset: 0
  ) {
    id
    curator {
      user {
        username
      }
      role {
        displayName
      }
    }
    actionType
    resourceType
    resourceId
    changes
    reason
    performedAt
    requiresPeerReview
    peerReviewed
    reviews {
      verdict
      comments
    }
  }
}
```

View actions by a specific curator:

```graphql
query CuratorActions($curatorId: ID!) {
  curatorAuditLogs(filters: { curatorId: $curatorId }) {
    id
    actionType
    resourceType
    performedAt
    peerReviewStatus
  }
}
```

---

## Peer Review System

### Purpose

Peer reviews provide accountability and quality control. High-tier actions (especially Level 0 promotions) require peer review before finalization.

### Submitting a Review

```graphql
mutation SubmitReview {
  submitCuratorReview(input: {
    auditLogId: "uuid-of-audit-log"
    reviewType: "routine_review"
    rating: 5  # 1-5 scale
    verdict: "approved"  # or "approved_with_notes", "flagged_minor", "flagged_major", "recommend_overturn"
    comments: "Excellent work. All evidence properly cited and methodology rigorously followed."
    specificConcerns: []
    recommendations: ["Consider adding citation to supporting WHO report"]
    actionRequired: false
    escalate: false
  }) {
    id
    verdict
    reviewedAt
  }
}
```

### Review Types

1. **routine_review** - Regular quality check
2. **flag_investigation** - Investigating a flagged action
3. **quality_check** - Systematic quality audit
4. **appeal_review** - Reviewing an appeal
5. **audit_review** - Compliance audit

### Review Verdicts

- **approved** - Action meets all standards
- **approved_with_notes** - Action acceptable with minor notes
- **flagged_minor** - Minor issues identified
- **flagged_major** - Significant issues requiring attention
- **recommend_overturn** - Action should be reversed
- **recommend_warning** - Curator should receive a warning

### Impact on Curator Metrics

Reviews automatically update curator performance metrics:
- **accuracy_rate**: (total_actions - overturned_actions) / total_actions
- **peer_review_score**: Average rating / 5.0
- **community_trust_score**: Weighted composite score

---

## Curator Performance Metrics

### Tracked Metrics

Each curator has performance metrics automatically calculated:

```graphql
query CuratorMetrics($curatorId: ID!) {
  curator(id: $curatorId) {
    totalActions
    approvedActions
    rejectedActions
    overturnedActions
    accuracyRate       # 0.0 - 1.0
    peerReviewScore    # 0.0 - 1.0 (average rating / 5)
    communityTrustScore # 0.0 - 1.0
    warningsReceived
    suspensionCount
    nextReviewDate
  }
}
```

### Performance Thresholds

**Good Standing** (No action required):
- Accuracy rate: ≥ 0.90
- Peer review score: ≥ 0.70
- Community trust: ≥ 0.60

**Under Review** (Monitoring required):
- Accuracy rate: 0.75 - 0.89
- Peer review score: 0.50 - 0.69
- OR 2+ warnings in 90 days

**At Risk** (Intervention required):
- Accuracy rate: < 0.75
- Peer review score: < 0.50
- OR 3+ warnings in 90 days
- Action: Temporary suspension + retraining

**Revocation** (Termination):
- Accuracy rate: < 0.60 for 30+ days
- Gross misconduct
- 2+ suspensions in 180 days

### Updating Metrics

Metrics are updated automatically after each peer review:

```sql
SELECT public.update_curator_metrics('curator-id-uuid');
```

---

## Curator Management Operations

### Viewing Active Curators

```graphql
query ActiveCurators {
  curators(filters: {
    status: "active"
    minAccuracyRate: 0.85
    minPeerReviewScore: 0.70
  }) {
    id
    user {
      username
      email
    }
    role {
      displayName
      tier
    }
    expertiseAreas
    accuracyRate
    peerReviewScore
    totalActions
    assignedAt
  }
}
```

### Suspending a Curator

```graphql
mutation SuspendCurator {
  updateCuratorStatus(input: {
    curatorId: "uuid-of-curator"
    status: "suspended"
    reason: "Multiple peer reviews flagged major issues with recent Level 0 promotions"
    notes: "Curator must complete retraining before reinstatement"
  }) {
    id
    status
    suspensionCount
    lastSuspendedAt
  }
}
```

### Curator Status Values

- **active** - Currently serving as curator
- **suspended** - Temporarily suspended (can be reinstated)
- **under_review** - Being investigated
- **retired** - Voluntarily stepped down
- **revoked** - Permanently removed

---

## Security Considerations

### Rate Limiting

Curators can have daily action limits:

```sql
-- Example: Limit Community Curators to 50 veracity approvals per day
UPDATE public."RolePermissions"
SET max_daily_actions = 50
WHERE role_id = (SELECT id FROM public."CuratorRoles" WHERE role_name = 'community_curator')
  AND permission_type = 'veracity_approval';
```

The middleware automatically enforces these limits:

```typescript
@Mutation(() => Boolean)
@UseMiddleware(
  RequireCuratorPermission(...),
  EnforceCuratorRateLimit(
    CuratorPermissionType.VERACITY_APPROVAL,
    ResourceType.NODE
  )
)
async approveVeracityScore(...) { ... }
```

### IP and Session Tracking

All curator actions include:
- IP address
- User agent
- Session ID

This helps detect:
- Account sharing
- Suspicious patterns
- Coordinated manipulation

### Multi-Factor Authentication

**Recommendation**: Require MFA for all curator accounts, especially Tier 2+ roles.

---

## Integration Examples

### Example 1: Approving Node for Level 0

```typescript
// In your resolver
@Mutation(() => Node)
@UseMiddleware(
  RequireCuratorPermission(
    CuratorPermissionType.LEVEL_0_NODES,
    ResourceType.NODE,
    PermissionAction.APPROVE
  ),
  LogCuratorAction('promote_to_level_0', 'node')
)
async promoteNodeToLevel0(
  @Arg('nodeId', () => ID) nodeId: string,
  @Arg('reason') reason: string,
  @Ctx() { pool, userId }: Context
): Promise<Node> {
  // Update node weight to 1.0
  const result = await pool.query(
    `UPDATE public."Nodes"
     SET weight = 1.0,
         meta = jsonb_set(
           COALESCE(meta, '{}'::jsonb),
           '{promoted_by}',
           to_jsonb($2::text)
         ),
         meta = jsonb_set(
           meta,
           '{promoted_at}',
           to_jsonb(NOW()::text)
         )
     WHERE id = $1
     RETURNING *`,
    [nodeId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Node not found');
  }

  return result.rows[0];
}
```

### Example 2: Checking Permission in Frontend

```typescript
// GraphQL query to check permission
const CHECK_PERMISSION = gql`
  query CheckCuratorPermission($permissionType: String!, $resourceType: String!, $action: String!) {
    hasCuratorPermission(
      userId: $userId
      permissionType: $permissionType
      resourceType: $resourceType
      action: $action
    )
  }
`;

// Usage in React component
const { data } = useQuery(CHECK_PERMISSION, {
  variables: {
    permissionType: 'level_0_nodes',
    resourceType: 'node',
    action: 'create'
  }
});

if (data?.hasCuratorPermission) {
  // Show "Promote to Level 0" button
}
```

### Example 3: Dashboard Query

```graphql
query CuratorDashboard {
  me {
    id
    username
  }

  curator(userId: $myUserId) {
    role {
      displayName
      tier
    }
    expertiseAreas
    totalActions
    accuracyRate
    peerReviewScore
    nextReviewDate
  }

  curatorAuditLogs(
    filters: { userId: $myUserId }
    limit: 10
  ) {
    actionType
    resourceType
    performedAt
    peerReviewed
  }

  curatorApplications(
    filters: { status: "voting", votingOpen: true }
    limit: 5
  ) {
    id
    user { username }
    role { displayName }
    votingDeadline
    approvalRatio
  }
}
```

---

## Testing

### Test Data Setup

```sql
-- Create test curator roles (already seeded in migration)
-- Assign test user as curator
INSERT INTO public."UserCurators" (user_id, role_id, expertise_areas, status)
VALUES (
  'test-user-id',
  (SELECT id FROM public."CuratorRoles" WHERE role_name = 'fact_checker'),
  ARRAY['fact_checking', 'source_verification'],
  'active'
);

-- Create test application
INSERT INTO public."CuratorApplications" (
  user_id, role_id, status, application_statement, motivation,
  expertise_areas, reputation_at_application, contributions_at_application
)
VALUES (
  'applicant-user-id',
  (SELECT id FROM public."CuratorRoles" WHERE role_name = 'domain_expert'),
  'voting',
  'I have 10 years experience in epidemiology...',
  'I want to help ensure medical claims meet scientific standards',
  ARRAY['medicine', 'epidemiology', 'public_health'],
  1800,
  120
);
```

### Unit Test Examples

```typescript
describe('Curator Permissions', () => {
  it('should allow fact checker to edit Level 0 nodes', async () => {
    const hasPermission = await checkCuratorPermission(
      pool,
      factCheckerUserId,
      'level_0_nodes',
      'node',
      'edit'
    );
    expect(hasPermission).toBe(true);
  });

  it('should not allow community curator to create Level 0 content', async () => {
    const hasPermission = await checkCuratorPermission(
      pool,
      communityCuratorUserId,
      'level_0_content',
      'all',
      'create'
    );
    expect(hasPermission).toBe(false);
  });

  it('should enforce rate limits', async () => {
    // Simulate 50 actions today
    for (let i = 0; i < 50; i++) {
      await logCuratorAction(/* ... */);
    }

    // 51st action should fail
    await expect(
      logCuratorAction(/* ... */)
    ).rejects.toThrow('Daily action limit reached');
  });
});
```

---

## Troubleshooting

### Issue: User can't apply for curator role

**Check**:
1. Does user meet reputation requirements?
2. Does user meet contribution requirements?
3. Does user already have an active application?

```sql
-- Check user eligibility
SELECT
  u.username,
  COALESCE(ur.reputation_score, 0) as reputation,
  COALESCE(ur.challenges_submitted + ur.challenges_accepted, 0) as contributions,
  cr.min_reputation_required,
  cr.min_contributions_required
FROM public."Users" u
LEFT JOIN public."UserReputation" ur ON ur.user_id = u.id
CROSS JOIN public."CuratorRoles" cr
WHERE u.id = 'user-id' AND cr.role_name = 'desired-role';
```

### Issue: Permission check failing

**Check**:
1. Is curator status 'active'?
2. Does role have the required permission?
3. Are there permission overrides (revocations)?

```sql
-- Debug permission check
SELECT
  uc.status,
  cr.role_name,
  rp.permission_type,
  rp.can_create, rp.can_edit, rp.can_approve,
  cp.override_type
FROM public."UserCurators" uc
JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
LEFT JOIN public."RolePermissions" rp ON rp.role_id = cr.id
LEFT JOIN public."CuratorPermissions" cp ON cp.user_curator_id = uc.id
WHERE uc.user_id = 'user-id';
```

### Issue: Audit log not capturing actions

**Check**:
1. Is middleware properly applied?
2. Is curator ID being resolved correctly?
3. Are database triggers working?

```sql
-- Test manual logging
SELECT public.log_curator_action(
  'curator-id',
  'user-id',
  'test_action',
  'node',
  'test-node-id',
  NULL,
  NULL,
  'Test log entry',
  NULL,
  NULL
);
```

---

## Best Practices

### For Curator Applicants

1. **Build reputation first**: Contribute quality content before applying
2. **Demonstrate expertise**: Include sample contributions in your application
3. **Be specific**: Clearly articulate your expertise areas and motivation
4. **Engage with community**: Participate in discussions and peer review

### For Active Curators

1. **Document everything**: Always provide clear reasons for actions
2. **Cite sources**: Link to evidence when making Level 0 changes
3. **Welcome peer review**: View reviews as opportunities for improvement
4. **Stay within expertise**: Don't approve content outside your domain
5. **Maintain standards**: Quality over quantity

### For Platform Administrators

1. **Monitor metrics**: Regularly review curator performance dashboards
2. **Diversify expertise**: Ensure curator team covers key domains
3. **Review regularly**: Schedule periodic reviews of all curators
4. **Transparent communication**: Keep curators informed of policy changes
5. **Training and support**: Provide ongoing education and resources

---

## Future Enhancements

### Planned Features

1. **Curator Badges**: Visual recognition for high-performing curators
2. **Mentorship Program**: Senior curators mentor new applicants
3. **Specialized Working Groups**: Domain-specific curator teams
4. **Appeals Process**: Formal process for contesting actions
5. **Performance Dashboards**: Real-time analytics for curators
6. **Automated Quality Checks**: AI-assisted review flagging
7. **Reputation Integration**: Tie curator actions to platform reputation

### Feedback Welcome

This is a living system. Feedback from curators and the community will drive continuous improvement.

---

## Support

For questions or issues:
- **Documentation**: See this guide and inline code comments
- **Community**: Curator discussion forum
- **Technical Support**: Create an issue in the project repository
- **Emergency**: Contact platform administrators

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
**Migration**: 006_curator_system.sql
