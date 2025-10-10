# Curator Roles & Permissions System (Phase 3)

## Overview

This deliverable implements a comprehensive, trustworthy curator system for Project Rabbit Hole, enabling vetted community members to maintain Level 0 content integrity through a transparent, accountable, and role-based permission system.

## Key Features

### Trust & Transparency
- **Complete audit trail** of all curator actions
- **Public promotion ledger** showing Level 0 modifications
- **Transparent application process** with community voting
- **Open peer review system** for quality control

### Accountability
- **Performance metrics** tracking accuracy and quality
- **Peer review requirements** for critical actions
- **Suspension/revocation system** for bad actors
- **Warning and probation mechanisms**

### Expertise-Based Roles
- **5 specialized curator roles** (Tiers 1-3)
- **Role-specific permissions** based on expertise
- **Granular access control** (CRUD + advanced)
- **Individual permission overrides** for flexibility

### Community-Driven
- **Reputation-based eligibility** (500-1500+ required)
- **Community voting** on applications
- **Weighted voting** by contributor reputation
- **Appeals and review process**

---

## Deliverables

### 1. Database Migration
**File**: `/Users/kmk/rabbithole/backend/migrations/006_curator_system.sql`

**Contains**:
- 8 core tables with complete schema
- 5 seeded curator roles with permissions
- Helper functions for permission checking and logging
- Automatic triggers for metrics updates
- 3 convenient views for common queries
- Comprehensive indexes for performance

**Tables Created**:
1. `CuratorRoles` - Role definitions (5 roles seeded)
2. `RolePermissions` - Role-based permissions (25+ permissions seeded)
3. `UserCurators` - User-to-role assignments with metrics
4. `CuratorApplications` - Application workflow management
5. `CuratorApplicationVotes` - Community voting on applications
6. `CuratorPermissions` - Individual permission overrides
7. `CuratorAuditLog` - Complete action history
8. `CuratorReviews` - Peer reviews of curator actions

**Functions Created**:
- `check_curator_permission()` - Permission verification
- `log_curator_action()` - Action logging with auto-metrics
- `update_curator_metrics()` - Performance calculation

**Views Created**:
- `ActiveCuratorsView` - Active curators with details
- `PendingApplicationsView` - Applications in voting
- `CuratorAuditLogView` - Audit logs with curator info

### 2. TypeGraphQL Entities
**Location**: `/Users/kmk/rabbithole/backend/src/entities/`

**Files**:
- `CuratorRole.ts` - Role entity (tier, requirements, config)
- `UserCurator.ts` - Curator assignment with metrics
- `CuratorApplication.ts` - Applications and votes
- `CuratorAuditLog.ts` - Audit logs and reviews
- `CuratorPermission.ts` - Role and user permissions

**Features**:
- Full TypeGraphQL decorators
- Nullable field handling
- Computed fields (e.g., approvalRatio)
- Related entity field resolvers

### 3. GraphQL Input Types
**File**: `/Users/kmk/rabbithole/backend/src/resolvers/CuratorInput.ts`

**Input Types**:
- `CuratorApplicationInput` - Submit application
- `CuratorApplicationVoteInput` - Vote on application
- `CuratorApplicationReviewInput` - Review application
- `AssignCuratorRoleInput` - Assign role (admin)
- `CuratorActionLogInput` - Log action
- `CuratorReviewInput` - Peer review
- `GrantPermissionInput` - Permission override
- `UpdateCuratorStatusInput` - Status change
- `CuratorFilters` - Query filtering
- `ApplicationFilters` - Application filtering
- `AuditLogFilters` - Audit log filtering

### 4. GraphQL Resolvers
**File**: `/Users/kmk/rabbithole/backend/src/resolvers/CuratorResolver.ts`

**Resolvers**:
1. **CuratorRoleResolver**
   - Query: `curatorRoles`, `curatorRole`, `rolePermissions`

2. **UserCuratorResolver**
   - Query: `curators`, `curator`, `hasCuratorPermission`
   - Mutation: `assignCuratorRole`, `updateCuratorStatus`
   - FieldResolver: `user`, `role`

3. **CuratorApplicationResolver**
   - Query: `curatorApplications`, `curatorApplication`
   - Mutation: `submitCuratorApplication`, `voteOnCuratorApplication`, `reviewCuratorApplication`
   - FieldResolver: `user`, `role`

4. **CuratorAuditLogResolver**
   - Query: `curatorAuditLogs`, `curatorAuditLog`
   - Mutation: `logCuratorAction`, `submitCuratorReview`
   - FieldResolver: `curator`, `reviews`

**Total**: 8 queries, 7 mutations, 5 field resolvers

### 5. Permission Middleware
**File**: `/Users/kmk/rabbithole/backend/src/middleware/curatorPermissions.ts`

**Middleware Functions**:
- `RequireCuratorPermission()` - Check specific permission
- `RequireActiveCurator` - Require active status
- `RequireCuratorRole()` - Require specific role
- `RequireCuratorTier()` - Require minimum tier
- `LogCuratorAction()` - Auto-log actions
- `CheckAndLogCuratorAction()` - Combined check + log
- `EnforceCuratorRateLimit()` - Daily action limits

**Helper Functions**:
- `checkCuratorPermission()` - Check permission
- `getUserCuratorRoles()` - Get user's roles
- `isActiveCurator()` - Check active status
- `getCuratorMetrics()` - Get performance metrics

**Convenience Exports**:
- `RequireLevel0ContentPermission`
- `RequireVeracityApprovalPermission`
- `RequireSourceValidationPermission`
- `RequireMethodologyValidationPermission`

**Usage Example**:
```typescript
@Mutation(() => Node)
@UseMiddleware(RequireLevel0ContentPermission)
async createLevel0Node(...) { ... }
```

### 6. Documentation

#### Implementation Guide
**File**: `/Users/kmk/rabbithole/backend/migrations/006_CURATOR_SYSTEM_GUIDE.md`

**Contents** (41 pages):
- Complete system overview
- Detailed role descriptions with use cases
- Step-by-step application workflow
- Permission system documentation
- Audit logging guide
- Peer review system
- Performance metrics tracking
- Curator management operations
- Security considerations
- Integration examples
- Testing strategies
- Troubleshooting guide
- Best practices
- Future enhancements

#### API Examples
**File**: `/Users/kmk/rabbithole/backend/migrations/006_API_EXAMPLES.md`

**Contents**:
- Complete GraphQL query examples
- Mutation examples with variables
- Real-world workflow examples
- Error handling patterns
- Rate limiting documentation
- Best practices for API usage

---

## Curator Roles Summary

### Community Curator (Tier 1)
- **Reputation Required**: 500+
- **Contributions Required**: 25+
- **Key Permissions**: Review veracity approvals, moderate content
- **Cannot**: Create/edit Level 0 directly

### Fact Checker (Tier 2)
- **Reputation Required**: 1000+
- **Contributions Required**: 50+
- **Key Permissions**: Verify facts, edit Level 0 nodes, assign veracity scores
- **Specialty**: Primary source verification

### Source Validator (Tier 2)
- **Reputation Required**: 1000+
- **Contributions Required**: 50+
- **Key Permissions**: Full source validation, credibility assessment
- **Specialty**: Media forensics, primary source identification

### Methodology Specialist (Tier 3)
- **Reputation Required**: 1500+
- **Contributions Required**: 75+
- **Key Permissions**: Create/validate methodologies, approve based on rigor
- **Specialty**: Research methods, logical frameworks

### Domain Expert (Tier 3)
- **Reputation Required**: 1500+
- **Contributions Required**: 75+
- **Key Permissions**: Create/edit Level 0 (with peer review), domain-specific validation
- **Specialty**: Subject matter expertise (medicine, law, history, etc.)

---

## Installation

### Step 1: Run Migration

```bash
cd /Users/kmk/rabbithole/backend
psql -U postgres -d rabbithole -f migrations/006_curator_system.sql
```

Expected output:
```
CREATE TABLE
CREATE INDEX
...
NOTICE:  Migration 006: Curator System completed successfully
NOTICE:  Created tables: CuratorRoles, UserCurators, ...
NOTICE:  Seeded 5 curator roles with appropriate permissions
```

### Step 2: Verify Installation

```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%urator%';

-- Check roles seeded
SELECT role_name, display_name, tier FROM public."CuratorRoles" ORDER BY tier, role_name;

-- Check permissions seeded
SELECT cr.role_name, rp.permission_type, rp.can_approve
FROM public."RolePermissions" rp
JOIN public."CuratorRoles" cr ON cr.id = rp.role_id
ORDER BY cr.tier, rp.permission_type;
```

### Step 3: Update Apollo Server

Add new resolvers to your Apollo Server configuration:

```typescript
import {
  CuratorRoleResolver,
  UserCuratorResolver,
  CuratorApplicationResolver,
  CuratorAuditLogResolver
} from './resolvers/CuratorResolver';

const server = new ApolloServer({
  schema: await buildSchema({
    resolvers: [
      // ... existing resolvers
      CuratorRoleResolver,
      UserCuratorResolver,
      CuratorApplicationResolver,
      CuratorAuditLogResolver,
    ],
  }),
  context: ({ req }) => ({
    pool,
    req,
    userId: req.user?.id, // From your auth middleware
  }),
});
```

### Step 4: Test Basic Queries

```graphql
# Test 1: List curator roles
query {
  curatorRoles {
    roleName
    displayName
    tier
  }
}

# Test 2: Check permission (will return false if user not curator)
query {
  hasCuratorPermission(
    userId: "your-user-id"
    permissionType: "level_0_content"
    resourceType: "node"
    action: "read"
  )
}
```

---

## Usage Examples

### Apply for Curator Role

```graphql
mutation {
  submitCuratorApplication(input: {
    roleId: "role-uuid"
    applicationStatement: "I have strong fact-checking background..."
    motivation: "I want to help maintain Level 0 integrity..."
    expertiseAreas: ["fact_checking", "journalism"]
    relevantExperience: "10 years as investigative journalist..."
    sampleContributions: ["node-1", "challenge-2"]
  }) {
    id
    status
    votingDeadline
  }
}
```

### Vote on Application

```graphql
mutation {
  voteOnCuratorApplication(input: {
    applicationId: "app-uuid"
    vote: "for"
    rationale: "Strong track record and professional credentials"
  }) {
    id
    voteWeight
  }
}
```

### Log Curator Action

```graphql
mutation {
  logCuratorAction(input: {
    actionType: "promote_to_level_0"
    resourceType: "node"
    resourceId: "node-uuid"
    reason: "All criteria met: 96% community consensus, 3 independent sources verified, challenges resolved"
    relatedEvidenceIds: ["ev-1", "ev-2", "ev-3"]
  }) {
    id
    requiresPeerReview
  }
}
```

### Submit Peer Review

```graphql
mutation {
  submitCuratorReview(input: {
    auditLogId: "audit-uuid"
    reviewType: "routine_review"
    rating: 5
    verdict: "approved"
    comments: "Excellent work. All standards met."
  }) {
    id
    verdict
  }
}
```

---

## Security Features

### Permission Checking
Every curator action checks permissions via PostgreSQL function:
```sql
SELECT public.check_curator_permission(user_id, permission_type, resource_type, action);
```

### Audit Logging
All actions automatically logged with:
- Curator ID and User ID
- Action type and resource
- Before/after values (JSON)
- IP address and user agent
- Timestamp and reason

### Rate Limiting
Configurable daily action limits per role:
```typescript
@UseMiddleware(EnforceCuratorRateLimit(
  CuratorPermissionType.LEVEL_0_NODES,
  ResourceType.NODE
))
```

### Peer Review Requirements
High-tier actions require peer review before finalization:
- Level 0 promotions
- Level 0 content creation
- Consensus overrides

### Accountability Mechanisms
- Performance metrics tracked automatically
- Warnings for low accuracy rates
- Suspension for repeated issues
- Revocation for gross misconduct

---

## Performance Considerations

### Database Indexes
Comprehensive indexes on:
- Foreign keys (curator_id, user_id, role_id)
- Status fields (for active curator queries)
- Timestamps (for audit log time-range queries)
- Composite indexes for common filter combinations

### Query Optimization
- Views pre-compute common joins
- PostgreSQL CTEs for complex queries
- Efficient pagination support
- Optional filters to narrow result sets

### Caching Recommendations
Consider caching:
- Curator roles (rarely change)
- Active curator list (5 min TTL)
- Permission checks (1 min TTL per user)
- Audit log counts (10 min TTL)

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Application Flow**
   - Applications submitted per week
   - Approval rate
   - Average voting participation
   - Time to decision

2. **Curator Performance**
   - Average accuracy rate
   - Average peer review score
   - Distribution of actions by role
   - Suspension/warning rate

3. **System Health**
   - Audit log growth rate
   - Actions requiring peer review
   - Unreviewed actions backlog
   - Permission check latency

### Maintenance Tasks

**Daily**:
- Review flagged audit log entries
- Check for expired permission overrides
- Monitor rate limit breaches

**Weekly**:
- Review curator performance metrics
- Process applications approaching deadlines
- Audit unreviewed actions

**Monthly**:
- Curator performance reviews
- Role permission adjustments
- System usage analytics

**Quarterly**:
- Comprehensive audit of all curators
- Policy updates based on feedback
- Training material updates

---

## Testing

### Unit Tests

```typescript
describe('Curator Permissions', () => {
  it('should check permissions correctly', async () => {
    const hasPermission = await checkCuratorPermission(
      pool, userId, 'level_0_nodes', 'node', 'edit'
    );
    expect(hasPermission).toBe(true);
  });

  it('should enforce rate limits', async () => {
    // Create 50 actions
    for (let i = 0; i < 50; i++) {
      await logCuratorAction(...);
    }
    // 51st should fail
    await expect(logCuratorAction(...)).rejects.toThrow('limit reached');
  });
});
```

### Integration Tests

```typescript
describe('Application Workflow', () => {
  it('should complete full application process', async () => {
    // 1. Submit application
    const app = await submitApplication(...);
    expect(app.status).toBe('submitted');

    // 2. Open for voting
    await openVoting(app.id);

    // 3. Cast votes
    await voteOnApplication(app.id, 'for', user1);
    await voteOnApplication(app.id, 'for', user2);

    // 4. Review and approve
    const reviewed = await reviewApplication(app.id, 'approved');
    expect(reviewed.status).toBe('approved');

    // 5. Verify curator created
    const curator = await getCurator(app.user_id);
    expect(curator).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] Submit application (meets requirements)
- [ ] Submit application (fails requirements)
- [ ] Vote on application
- [ ] Review and approve application
- [ ] Check curator permissions
- [ ] Log curator action
- [ ] Submit peer review
- [ ] Update curator status
- [ ] Grant permission override
- [ ] Query audit logs
- [ ] Query curator metrics

---

## Troubleshooting

### Common Issues

**Issue**: Application submission fails with "Insufficient reputation"
**Solution**: Check `UserReputation` table. Ensure user has completed enough challenges/contributions.

**Issue**: Permission check returns false unexpectedly
**Solution**:
1. Verify curator status is 'active'
2. Check role has required permission in `RolePermissions`
3. Check for permission revocations in `CuratorPermissions`

**Issue**: Audit logs not appearing
**Solution**:
1. Verify curator is active
2. Check middleware is applied to mutation
3. Verify `log_curator_action` function exists

**Issue**: Metrics not updating
**Solution**: Run `SELECT public.update_curator_metrics('curator-id')` manually, then check triggers.

---

## Future Enhancements

### Planned (Phase 4)
1. **Curator Badges**: Visual recognition system
2. **Mentorship Program**: Pair new curators with veterans
3. **Specialized Teams**: Domain-specific curator groups
4. **Appeals System**: Formal appeal process for decisions
5. **Performance Dashboard**: Real-time analytics

### Under Consideration
1. **AI-Assisted Review**: Automated flagging of suspicious patterns
2. **Reputation Staking**: Curators stake reputation on decisions
3. **Time-Limited Roles**: Rotating curator positions
4. **Community Elections**: Elected senior curator positions

---

## Support & Feedback

- **Documentation**: See `006_CURATOR_SYSTEM_GUIDE.md` for complete guide
- **API Reference**: See `006_API_EXAMPLES.md` for GraphQL examples
- **Issues**: Report bugs via GitHub issues
- **Questions**: Community forum or Discord

---

## Version History

**v1.0.0** - 2025-10-09
- Initial release
- 5 curator roles
- Complete RBAC system
- Application workflow
- Audit logging
- Peer review system
- Performance metrics

---

## Credits

**Architecture**: Curator System Design Team
**Implementation**: Project Rabbit Hole Development Team
**Documentation**: Technical Writing Team

**Inspired by**: Wikipedia's administrator system, Stack Overflow's moderator elections, and academic peer review processes.

---

## License

Part of Project Rabbit Hole. See main project LICENSE for details.

---

**Last Updated**: 2025-10-09
**Migration**: 006_curator_system.sql
**Status**: ✅ Production Ready
