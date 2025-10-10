# Curator System - GraphQL API Examples

This document provides comprehensive GraphQL API examples for the Curator Roles & Permissions system.

## Table of Contents

1. [Authentication](#authentication)
2. [Curator Roles](#curator-roles)
3. [Curator Applications](#curator-applications)
4. [Curator Management](#curator-management)
5. [Permissions](#permissions)
6. [Audit Logging](#audit-logging)
7. [Peer Reviews](#peer-reviews)
8. [Complete Workflows](#complete-workflows)

---

## Authentication

All curator operations require authentication. Include the user's authentication token in the request headers:

```
Authorization: Bearer <jwt-token>
```

---

## Curator Roles

### List All Available Curator Roles

```graphql
query ListCuratorRoles {
  curatorRoles(activeOnly: true) {
    id
    roleName
    displayName
    description
    responsibilities
    tier
    minReputationRequired
    minContributionsRequired
    expertiseAreasRequired
    requiresApplication
    requiresCommunityVote
    minVotesRequired
    approvalThreshold
    icon
    color
    badgeImageUrl
  }
}
```

**Response:**
```json
{
  "data": {
    "curatorRoles": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "roleName": "community_curator",
        "displayName": "Community Curator",
        "description": "General-purpose curator responsible for reviewing community contributions...",
        "responsibilities": [
          "Review community-submitted content for promotion to Level 0",
          "Moderate discussions and resolve disputes"
        ],
        "tier": 1,
        "minReputationRequired": 500,
        "minContributionsRequired": 25,
        "expertiseAreasRequired": ["community_moderation", "content_review"],
        "requiresApplication": true,
        "requiresCommunityVote": true,
        "minVotesRequired": 10,
        "approvalThreshold": 0.7,
        "icon": "👥",
        "color": "#4CAF50",
        "badgeImageUrl": null
      }
    ]
  }
}
```

### Get Specific Curator Role

```graphql
query GetCuratorRole {
  curatorRole(roleName: "fact_checker") {
    id
    displayName
    description
    tier
    minReputationRequired
  }
}
```

### Get Role Permissions

```graphql
query GetRolePermissions($roleId: ID!) {
  rolePermissions(roleId: $roleId) {
    id
    permissionType
    resourceType
    canCreate
    canRead
    canEdit
    canDelete
    canApprove
    canReject
    canPromoteToLevel0
    canAssignVeracityScore
    requiresPeerReview
    description
  }
}
```

**Variables:**
```json
{
  "roleId": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

## Curator Applications

### Submit Curator Application

```graphql
mutation SubmitCuratorApplication($input: CuratorApplicationInput!) {
  submitCuratorApplication(input: $input) {
    id
    status
    applicationStatement
    expertiseAreas
    reputationAtApplication
    contributionsAtApplication
    submittedAt
    votingDeadline
  }
}
```

**Variables:**
```json
{
  "input": {
    "roleId": "550e8400-e29b-41d4-a716-446655440002",
    "applicationStatement": "I have been an active member for over a year, consistently providing high-quality fact-checking and source validation. My professional background as a journalist has equipped me with the skills to verify claims rigorously and identify credible sources.",
    "motivation": "I want to contribute to maintaining the integrity of Level 0 content by applying my fact-checking expertise and helping the community distinguish between verified facts and speculation.",
    "expertiseAreas": ["fact_checking", "source_verification", "journalism"],
    "relevantExperience": "10 years as an investigative journalist at The Washington Post, specialized in fact-checking political claims and verifying sources. Certified by the International Fact-Checking Network.",
    "sampleContributions": [
      "node-id-showing-quality-research",
      "challenge-id-where-i-won",
      "evidence-id-with-primary-sources"
    ]
  }
}
```

**Response:**
```json
{
  "data": {
    "submitCuratorApplication": {
      "id": "app-123",
      "status": "submitted",
      "applicationStatement": "I have been an active member...",
      "expertiseAreas": ["fact_checking", "source_verification", "journalism"],
      "reputationAtApplication": 1250,
      "contributionsAtApplication": 67,
      "submittedAt": "2025-10-09T10:00:00Z",
      "votingDeadline": "2025-10-23T10:00:00Z"
    }
  }
}
```

### View Pending Applications

```graphql
query PendingApplications {
  curatorApplications(
    filters: {
      status: "voting"
      votingOpen: true
    }
    limit: 10
  ) {
    id
    user {
      id
      username
      email
    }
    role {
      displayName
      tier
    }
    applicationStatement
    motivation
    expertiseAreas
    relevantExperience
    reputationAtApplication
    contributionsAtApplication
    votesFor
    votesAgainst
    votesAbstain
    totalVotingWeight
    approvalRatio
    votingDeadline
  }
}
```

### Vote on Application

```graphql
mutation VoteOnApplication($input: CuratorApplicationVoteInput!) {
  voteOnCuratorApplication(input: $input) {
    id
    applicationId
    vote
    voteWeight
    rationale
    votedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "applicationId": "app-123",
    "vote": "for",
    "rationale": "Excellent track record of contributions. Strong professional background in journalism. Sample contributions demonstrate rigorous fact-checking methodology."
  }
}
```

### Review Application (Curator Only)

```graphql
mutation ReviewApplication($input: CuratorApplicationReviewInput!) {
  reviewCuratorApplication(input: $input) {
    id
    status
    decision
    decisionReason
    decisionMadeAt
    user {
      username
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "applicationId": "app-123",
    "decision": "approved",
    "decisionReason": "Strong community support (78% approval), excellent professional credentials, and demonstrated commitment to platform values.",
    "reviewerNotes": "Approved with standard 90-day probation period. Recommend assignment to media-related fact-checking initially.",
    "conditionsForApproval": "Complete orientation training within 30 days. Initial focus on media/journalism domain.",
    "probationPeriodDays": 90
  }
}
```

---

## Curator Management

### View All Curators

```graphql
query ListCurators {
  curators(
    filters: {
      status: "active"
      minAccuracyRate: 0.85
    }
    limit: 50
  ) {
    id
    user {
      username
      email
    }
    role {
      displayName
      tier
    }
    status
    expertiseAreas
    specializationTags
    totalActions
    accuracyRate
    peerReviewScore
    communityTrustScore
    assignedAt
    nextReviewDate
  }
}
```

### View Curator Details

```graphql
query CuratorDetails($userId: ID!) {
  curator(userId: $userId) {
    id
    user {
      id
      username
      email
    }
    role {
      id
      displayName
      tier
      responsibilities
    }
    status
    assignedAt
    expiresAt
    expertiseAreas
    specializationTags
    totalActions
    approvedActions
    rejectedActions
    overturnedActions
    accuracyRate
    peerReviewScore
    communityTrustScore
    warningsReceived
    lastWarningAt
    suspensionCount
    lastSuspendedAt
    lastReviewDate
    nextReviewDate
    reviewNotes
    notes
  }
}
```

### Assign Curator Role (Admin Only)

```graphql
mutation AssignCuratorRole($input: AssignCuratorRoleInput!) {
  assignCuratorRole(input: $input) {
    id
    userId
    roleId
    status
    expertiseAreas
    assignedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "user-123",
    "roleId": "role-456",
    "expertiseAreas": ["medicine", "epidemiology", "public_health"],
    "specializationTags": ["infectious_diseases", "vaccine_research"],
    "notes": "Approved based on verified MD credentials and 15 years experience in epidemiology.",
    "expiresAt": null
  }
}
```

### Update Curator Status

```graphql
mutation UpdateCuratorStatus($input: UpdateCuratorStatusInput!) {
  updateCuratorStatus(input: $input) {
    id
    status
    warningsReceived
    suspensionCount
    lastSuspendedAt
    notes
  }
}
```

**Variables - Suspend:**
```json
{
  "input": {
    "curatorId": "curator-123",
    "status": "suspended",
    "reason": "Multiple peer reviews flagged insufficient source verification in recent Level 0 promotions. Accuracy rate dropped below 0.80.",
    "notes": "Temporary suspension. Curator must complete retraining on source validation before reinstatement. Review scheduled for 30 days."
  }
}
```

**Variables - Reinstate:**
```json
{
  "input": {
    "curatorId": "curator-123",
    "status": "active",
    "reason": "Successfully completed retraining. Demonstrated improved source validation methodology in supervised test cases.",
    "notes": "Reinstated after 30-day suspension. Performance will be closely monitored for next 90 days."
  }
}
```

---

## Permissions

### Check User Permission

```graphql
query CheckPermission(
  $userId: ID!
  $permissionType: String!
  $resourceType: String!
  $action: String!
) {
  hasCuratorPermission(
    userId: $userId
    permissionType: $permissionType
    resourceType: $resourceType
    action: $action
  )
}
```

**Variables:**
```json
{
  "userId": "user-123",
  "permissionType": "level_0_nodes",
  "resourceType": "node",
  "action": "edit"
}
```

**Response:**
```json
{
  "data": {
    "hasCuratorPermission": true
  }
}
```

### Grant Permission Override (Admin Only)

```graphql
mutation GrantPermission($input: GrantPermissionInput!) {
  grantCuratorPermission(input: $input) {
    id
    userCuratorId
    permissionType
    resourceType
    overrideType
    canCreate
    canEdit
    reason
    expiresAt
  }
}
```

**Variables - Grant Temporary Elevated Access:**
```json
{
  "input": {
    "userCuratorId": "curator-123",
    "permissionType": "level_0_content",
    "resourceType": "all",
    "overrideType": "grant",
    "canCreate": true,
    "canEdit": true,
    "reason": "Temporary elevated access for historical records migration project. All actions subject to peer review.",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

**Variables - Revoke Permission:**
```json
{
  "input": {
    "userCuratorId": "curator-123",
    "permissionType": "veracity_approval",
    "resourceType": "node",
    "overrideType": "revoke",
    "canApprove": false,
    "reason": "Temporary restriction while under peer review for recent flagged actions.",
    "expiresAt": "2025-11-09T00:00:00Z"
  }
}
```

---

## Audit Logging

### Log Curator Action

```graphql
mutation LogAction($input: CuratorActionLogInput!) {
  logCuratorAction(input: $input) {
    id
    curatorId
    actionType
    resourceType
    resourceId
    reason
    requiresPeerReview
    performedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "actionType": "promote_to_level_0",
    "resourceType": "node",
    "resourceId": "node-123",
    "oldValue": "{\"weight\":0.95,\"veracity_score\":0.95}",
    "newValue": "{\"weight\":1.0,\"veracity_score\":1.0}",
    "reason": "Community consensus achieved (96% agreement across 47 votes). All challenges resolved. Evidence validated by 3 independent sources. Methodology: Scientific Method (peer-reviewed).",
    "relatedEvidenceIds": ["evidence-1", "evidence-2", "evidence-3"]
  }
}
```

### Query Audit Logs

```graphql
query AuditLogs($filters: AuditLogFilters!, $limit: Int, $offset: Int) {
  curatorAuditLogs(filters: $filters, limit: $limit, offset: $offset) {
    id
    curator {
      user {
        username
      }
      role {
        displayName
        tier
      }
    }
    actionType
    resourceType
    resourceId
    oldValue
    newValue
    changes
    reason
    notes
    requiresPeerReview
    peerReviewed
    peerReviewStatus
    performedAt
    reviews {
      verdict
      rating
      comments
    }
  }
}
```

**Variables - All Level 0 Promotions:**
```json
{
  "filters": {
    "actionType": "promote_to_level_0",
    "dateFrom": "2025-10-01T00:00:00Z",
    "dateTo": "2025-10-31T23:59:59Z"
  },
  "limit": 100,
  "offset": 0
}
```

**Variables - Actions by Specific Curator:**
```json
{
  "filters": {
    "curatorId": "curator-123"
  },
  "limit": 50,
  "offset": 0
}
```

**Variables - Actions Requiring Peer Review:**
```json
{
  "filters": {
    "requiresPeerReview": true,
    "peerReviewed": false
  },
  "limit": 20,
  "offset": 0
}
```

### Query Specific Audit Log Entry

```graphql
query AuditLogEntry($id: ID!) {
  curatorAuditLog(id: $id) {
    id
    curator {
      id
      user {
        username
        email
      }
      role {
        displayName
      }
    }
    user {
      username
    }
    actionType
    resourceType
    resourceId
    oldValue
    newValue
    changes
    reason
    notes
    relatedEvidenceIds
    requiresPeerReview
    peerReviewed
    peerReviewStatus
    ipAddress
    userAgent
    sessionId
    performedAt
    reviews {
      id
      reviewerUser {
        username
      }
      reviewType
      rating
      verdict
      comments
      specificConcerns
      recommendations
      reviewedAt
    }
  }
}
```

---

## Peer Reviews

### Submit Peer Review

```graphql
mutation SubmitReview($input: CuratorReviewInput!) {
  submitCuratorReview(input: $input) {
    id
    auditLogId
    reviewType
    rating
    verdict
    comments
    reviewedAt
  }
}
```

**Variables - Approve:**
```json
{
  "input": {
    "auditLogId": "audit-123",
    "reviewType": "routine_review",
    "rating": 5,
    "verdict": "approved",
    "comments": "Excellent work. All evidence thoroughly vetted, primary sources verified, and methodology rigorously followed. The promotion to Level 0 is well-justified.",
    "specificConcerns": [],
    "recommendations": []
  }
}
```

**Variables - Flag Issues:**
```json
{
  "input": {
    "auditLogId": "audit-456",
    "reviewType": "quality_check",
    "rating": 2,
    "verdict": "flagged_major",
    "comments": "Significant issues identified with source validation. One of the cited sources is a secondary source, not primary as claimed. Cross-referencing reveals inconsistencies.",
    "specificConcerns": [
      "Source #2 is secondary, not primary",
      "Missing verification from independent source",
      "Potential bias in source selection"
    ],
    "recommendations": [
      "Revert to Level 1 pending additional source validation",
      "Require curator to complete source validation training",
      "Implement mandatory secondary review for this curator's future actions"
    ],
    "actionRequired": true,
    "escalate": true,
    "escalateToUserId": "senior-curator-id"
  }
}
```

---

## Complete Workflows

### Workflow 1: Apply for Curator Role

```graphql
# Step 1: Check eligibility
query CheckEligibility {
  me {
    id
    username
    reputation
    contributionCount
  }
  curatorRole(roleName: "fact_checker") {
    id
    minReputationRequired
    minContributionsRequired
    expertiseAreasRequired
  }
}

# Step 2: Submit application
mutation ApplyForCurator {
  submitCuratorApplication(input: {
    roleId: "role-id-from-step-1"
    applicationStatement: "..."
    motivation: "..."
    expertiseAreas: ["fact_checking", "journalism"]
    relevantExperience: "..."
    sampleContributions: ["node-1", "node-2"]
  }) {
    id
    status
    votingDeadline
  }
}

# Step 3: Community votes (other users)
mutation VoteOnMyApplication {
  voteOnCuratorApplication(input: {
    applicationId: "application-id"
    vote: "for"
    rationale: "Strong contributions, professional background"
  }) {
    id
    voteWeight
  }
}

# Step 4: Check application status
query CheckApplicationStatus($appId: ID!) {
  curatorApplication(id: $appId) {
    status
    votesFor
    votesAgainst
    approvalRatio
    votingDeadline
    decision
    decisionReason
  }
}

# Step 5: If approved, check curator status
query MyCuratorRole {
  curator(userId: $myUserId) {
    id
    role {
      displayName
      tier
    }
    status
    expertiseAreas
    assignedAt
  }
}
```

### Workflow 2: Promote Content to Level 0

```graphql
# Step 1: Check permission
query CanPromote {
  hasCuratorPermission(
    userId: $myUserId
    permissionType: "level_0_nodes"
    resourceType: "node"
    action: "approve"
  )
}

# Step 2: Verify node readiness
query NodeReadiness($nodeId: ID!) {
  node(id: $nodeId) {
    id
    weight
    veracityScore
    consensusScore
    challengeCount
    evidenceCount
  }
}

# Step 3: Log and promote
mutation PromoteToLevel0 {
  logCuratorAction(input: {
    actionType: "promote_to_level_0"
    resourceType: "node"
    resourceId: $nodeId
    oldValue: "{\"weight\":0.95}"
    newValue: "{\"weight\":1.0}"
    reason: "Meets all criteria for Level 0 promotion..."
    relatedEvidenceIds: ["ev-1", "ev-2", "ev-3"]
  }) {
    id
    requiresPeerReview
  }
}

# Step 4: Peer review (by another curator)
mutation ReviewPromotion {
  submitCuratorReview(input: {
    auditLogId: $auditId
    reviewType: "routine_review"
    rating: 5
    verdict: "approved"
    comments: "Promotion justified. All criteria met."
  }) {
    id
    verdict
  }
}
```

### Workflow 3: Curator Dashboard

```graphql
query CuratorDashboard {
  # My curator info
  curator(userId: $myUserId) {
    role {
      displayName
      tier
    }
    totalActions
    accuracyRate
    peerReviewScore
    communityTrustScore
    nextReviewDate
  }

  # Recent actions
  curatorAuditLogs(
    filters: { userId: $myUserId }
    limit: 10
  ) {
    id
    actionType
    resourceType
    performedAt
    peerReviewed
    peerReviewStatus
  }

  # Actions needing my review
  curatorAuditLogs(
    filters: {
      requiresPeerReview: true
      peerReviewed: false
    }
    limit: 5
  ) {
    id
    curator {
      user { username }
    }
    actionType
    resourceType
    reason
    performedAt
  }

  # Pending applications to vote on
  curatorApplications(
    filters: {
      status: "voting"
      votingOpen: true
    }
    limit: 5
  ) {
    id
    user { username }
    role { displayName }
    applicationStatement
    votingDeadline
    approvalRatio
  }
}
```

---

## Error Handling

All mutations can return errors. Handle them appropriately:

```typescript
const [submitApplication, { loading, error }] = useMutation(SUBMIT_APPLICATION);

try {
  const result = await submitApplication({ variables: { input } });
  // Success
} catch (err) {
  // Errors:
  // - "Insufficient reputation"
  // - "User already has active application"
  // - "Unauthorized"
  console.error(err.message);
}
```

Common error messages:
- `"Authentication required"` - User not logged in
- `"Insufficient permissions"` - User lacks curator permission
- `"Insufficient reputation"` - Reputation too low for role
- `"Daily action limit reached"` - Rate limit exceeded
- `"Active curator status required"` - User not an active curator
- `"Application is not open for voting"` - Voting period ended

---

## Best Practices

1. **Always check permissions** before showing UI elements
2. **Provide context in reasons** - Explain why an action was taken
3. **Include evidence IDs** when promoting to Level 0
4. **Review thoroughly** - Peer reviews should be detailed and constructive
5. **Monitor your metrics** - Regularly check accuracy rate and peer review score

---

## Rate Limits

Default rate limits per curator role:
- **Community Curator**: 50 actions/day
- **Fact Checker**: 100 actions/day
- **Source Validator**: 100 actions/day
- **Methodology Specialist**: 75 actions/day
- **Domain Expert**: 150 actions/day

Rate limits can be customized per role or per individual curator.

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
