import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  ID,
  Int,
  Authorized,
  FieldResolver,
  Root,
} from 'type-graphql';
import { Pool } from 'pg';
import { CuratorRole } from '../entities/CuratorRole';
import { UserCurator } from '../entities/UserCurator';
import { CuratorApplication, CuratorApplicationVote } from '../entities/CuratorApplication';
import { CuratorAuditLog, CuratorReview } from '../entities/CuratorAuditLog';
import { RolePermission, CuratorPermission } from '../entities/CuratorPermission';
import { User } from '../entities/User';
import {
  CuratorApplicationInput,
  CuratorApplicationVoteInput,
  CuratorApplicationReviewInput,
  AssignCuratorRoleInput,
  CuratorActionLogInput,
  CuratorReviewInput,
  GrantPermissionInput,
  UpdateCuratorStatusInput,
  CuratorFilters,
  ApplicationFilters,
  AuditLogFilters,
} from './CuratorInput';

interface Context {
  pool: Pool;
  req: any;
  userId?: string;
}

@Resolver(CuratorRole)
export class CuratorRoleResolver {
  @Query(() => [CuratorRole])
  async curatorRoles(
    @Arg('activeOnly', { defaultValue: true }) activeOnly: boolean,
    @Ctx() { pool }: Context
  ): Promise<CuratorRole[]> {
    const query = activeOnly
      ? 'SELECT * FROM public."CuratorRoles" WHERE is_active = true ORDER BY tier ASC, display_name ASC'
      : 'SELECT * FROM public."CuratorRoles" ORDER BY tier ASC, display_name ASC';

    const result = await pool.query(query);
    return result.rows.map(this.mapCuratorRole);
  }

  @Query(() => CuratorRole, { nullable: true })
  async curatorRole(
    @Ctx() { pool }: Context,
    @Arg('id', () => ID, { nullable: true }) id?: string,
    @Arg('roleName', { nullable: true }) roleName?: string
  ): Promise<CuratorRole | null> {
    if (!id && !roleName) {
      throw new Error('Either id or roleName must be provided');
    }

    const query = id
      ? 'SELECT * FROM public."CuratorRoles" WHERE id = $1'
      : 'SELECT * FROM public."CuratorRoles" WHERE role_name = $1';

    const result = await pool.query(query, [id || roleName]);
    return result.rows[0] ? this.mapCuratorRole(result.rows[0]) : null;
  }

  @Query(() => [RolePermission])
  async rolePermissions(
    @Arg('roleId', () => ID) roleId: string,
    @Ctx() { pool }: Context
  ): Promise<RolePermission[]> {
    const result = await pool.query(
      'SELECT * FROM public."RolePermissions" WHERE role_id = $1 ORDER BY permission_type',
      [roleId]
    );
    return result.rows.map(this.mapRolePermission);
  }

  public mapCuratorRole(row: any): CuratorRole {
    return {
      id: row.id,
      roleName: row.role_name,
      displayName: row.display_name,
      description: row.description,
      responsibilities: row.responsibilities,
      tier: row.tier,
      minReputationRequired: row.min_reputation_required,
      minContributionsRequired: row.min_contributions_required,
      expertiseAreasRequired: row.expertise_areas_required,
      requiresApplication: row.requires_application,
      requiresCommunityVote: row.requires_community_vote,
      minVotesRequired: row.min_votes_required,
      approvalThreshold: row.approval_threshold,
      icon: row.icon,
      color: row.color,
      badgeImageUrl: row.badge_image_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRolePermission(row: any): RolePermission {
    return {
      id: row.id,
      roleId: row.role_id,
      permissionType: row.permission_type,
      resourceType: row.resource_type,
      canCreate: row.can_create,
      canRead: row.can_read,
      canEdit: row.can_edit,
      canDelete: row.can_delete,
      canApprove: row.can_approve,
      canReject: row.can_reject,
      canPromoteToLevel0: row.can_promote_to_level_0,
      canDemoteFromLevel0: row.can_demote_from_level_0,
      canAssignVeracityScore: row.can_assign_veracity_score,
      canOverrideConsensus: row.can_override_consensus,
      maxDailyActions: row.max_daily_actions,
      requiresPeerReview: row.requires_peer_review,
      requiresSecondApproval: row.requires_second_approval,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

@Resolver(UserCurator)
export class UserCuratorResolver {
  @Query(() => [UserCurator])
  async curators(
    @Arg('filters', () => CuratorFilters, { nullable: true }) filters: CuratorFilters | null,
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<UserCurator[]> {
    let query = 'SELECT * FROM public."UserCurators" WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.roleId) {
        params.push(filters.roleId);
        query += ` AND role_id = $${++paramCount}`;
      }
      if (filters.status) {
        params.push(filters.status);
        query += ` AND status = $${++paramCount}`;
      }
      if (filters.expertiseAreas && filters.expertiseAreas.length > 0) {
        params.push(filters.expertiseAreas);
        query += ` AND expertise_areas && $${++paramCount}`;
      }
      if (filters.minAccuracyRate !== undefined) {
        params.push(filters.minAccuracyRate);
        query += ` AND accuracy_rate >= $${++paramCount}`;
      }
      if (filters.minPeerReviewScore !== undefined) {
        params.push(filters.minPeerReviewScore);
        query += ` AND peer_review_score >= $${++paramCount}`;
      }
    }

    query += ' ORDER BY created_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const result = await pool.query(query, params);
    return result.rows.map(this.mapUserCurator);
  }

  @Query(() => UserCurator, { nullable: true })
  async curator(
    @Ctx() { pool }: Context,
    @Arg('id', () => ID, { nullable: true }) id?: string,
    @Arg('userId', () => ID, { nullable: true }) userId?: string
  ): Promise<UserCurator | null> {
    if (!id && !userId) {
      throw new Error('Either id or userId must be provided');
    }

    const query = id
      ? 'SELECT * FROM public."UserCurators" WHERE id = $1'
      : 'SELECT * FROM public."UserCurators" WHERE user_id = $1 AND status = $2';

    const result = await pool.query(
      query,
      id ? [id] : [userId, 'active']
    );
    return result.rows[0] ? this.mapUserCurator(result.rows[0]) : null;
  }

  @Query(() => Boolean)
  async hasCuratorPermission(
    @Arg('userId', () => ID) userId: string,
    @Arg('permissionType') permissionType: string,
    @Arg('resourceType') resourceType: string,
    @Arg('action') action: string,
    @Ctx() { pool }: Context
  ): Promise<boolean> {
    const result = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, permissionType, resourceType, action]
    );
    return result.rows[0]?.has_permission || false;
  }

  @Mutation(() => UserCurator)
  @Authorized()
  async assignCuratorRole(
    @Arg('input') input: AssignCuratorRoleInput,
    @Ctx() { pool, userId }: Context
  ): Promise<UserCurator> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check if requester has permission to assign roles
    const hasPermission = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, 'application_review', 'user', 'create']
    );

    if (!hasPermission.rows[0]?.has_permission) {
      throw new Error('Insufficient permissions to assign curator roles');
    }

    const result = await pool.query(
      `INSERT INTO public."UserCurators" (
        user_id, role_id, expertise_areas, specialization_tags,
        assigned_by_user_id, expires_at, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *`,
      [
        input.userId,
        input.roleId,
        input.expertiseAreas,
        input.specializationTags || [],
        userId,
        input.expiresAt,
        input.notes,
      ]
    );

    return this.mapUserCurator(result.rows[0]);
  }

  @Mutation(() => UserCurator)
  @Authorized()
  async updateCuratorStatus(
    @Arg('input') input: UpdateCuratorStatusInput,
    @Ctx() { pool, userId }: Context
  ): Promise<UserCurator> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check permission
    const hasPermission = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, 'user_moderation', 'curator', 'edit']
    );

    if (!hasPermission.rows[0]?.has_permission) {
      throw new Error('Insufficient permissions to update curator status');
    }

    const result = await pool.query(
      `UPDATE public."UserCurators"
       SET status = $1,
           notes = COALESCE($2, notes),
           warnings_received = CASE WHEN $1 = 'under_review' THEN warnings_received + 1 ELSE warnings_received END,
           last_warning_at = CASE WHEN $1 = 'under_review' THEN NOW() ELSE last_warning_at END,
           suspension_count = CASE WHEN $1 = 'suspended' THEN suspension_count + 1 ELSE suspension_count END,
           last_suspended_at = CASE WHEN $1 = 'suspended' THEN NOW() ELSE last_suspended_at END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [input.status, input.notes, input.curatorId]
    );

    if (result.rows.length === 0) {
      throw new Error('Curator not found');
    }

    // Log the status change
    await pool.query(
      `SELECT public.log_curator_action($1, $2, $3, $4, $5, NULL, $6, $7, NULL, NULL)`,
      [
        input.curatorId,
        userId,
        'moderate_content',
        'curator',
        input.curatorId,
        JSON.stringify({ status: input.status }),
        input.reason,
      ]
    );

    return this.mapUserCurator(result.rows[0]);
  }

  @FieldResolver(() => User)
  async user(@Root() curator: UserCurator, @Ctx() { pool }: Context): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [curator.userId]
    );
    return result.rows[0] || null;
  }

  @FieldResolver(() => CuratorRole)
  async role(@Root() curator: UserCurator, @Ctx() { pool }: Context): Promise<CuratorRole | null> {
    const result = await pool.query(
      'SELECT * FROM public."CuratorRoles" WHERE id = $1',
      [curator.roleId]
    );
    return result.rows[0] ? new CuratorRoleResolver().mapCuratorRole(result.rows[0]) : null;
  }

  public mapUserCurator(row: any): UserCurator {
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      status: row.status,
      assignedAt: row.assigned_at,
      assignedByUserId: row.assigned_by_user_id,
      expiresAt: row.expires_at,
      expertiseAreas: row.expertise_areas,
      specializationTags: row.specialization_tags,
      totalActions: row.total_actions,
      approvedActions: row.approved_actions,
      rejectedActions: row.rejected_actions,
      overturnedActions: row.overturned_actions,
      peerReviewScore: row.peer_review_score,
      communityTrustScore: row.community_trust_score,
      accuracyRate: row.accuracy_rate,
      warningsReceived: row.warnings_received,
      lastWarningAt: row.last_warning_at,
      suspensionCount: row.suspension_count,
      lastSuspendedAt: row.last_suspended_at,
      lastReviewDate: row.last_review_date,
      nextReviewDate: row.next_review_date,
      reviewNotes: row.review_notes,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

@Resolver(CuratorApplication)
export class CuratorApplicationResolver {
  @Query(() => [CuratorApplication])
  async curatorApplications(
    @Arg('filters', () => ApplicationFilters, { nullable: true }) filters: ApplicationFilters | null,
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<CuratorApplication[]> {
    let query = 'SELECT * FROM public."CuratorApplications" WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.roleId) {
        params.push(filters.roleId);
        query += ` AND role_id = $${++paramCount}`;
      }
      if (filters.status) {
        params.push(filters.status);
        query += ` AND status = $${++paramCount}`;
      }
      if (filters.minReputation !== undefined) {
        params.push(filters.minReputation);
        query += ` AND reputation_at_application >= $${++paramCount}`;
      }
      if (filters.votingOpen) {
        query += ` AND status = 'voting' AND voting_deadline > NOW()`;
      }
    }

    query += ' ORDER BY created_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const result = await pool.query(query, params);
    return result.rows.map(this.mapCuratorApplication);
  }

  @Query(() => CuratorApplication, { nullable: true })
  async curatorApplication(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool }: Context
  ): Promise<CuratorApplication | null> {
    const result = await pool.query(
      'SELECT * FROM public."CuratorApplications" WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapCuratorApplication(result.rows[0]) : null;
  }

  @Mutation(() => CuratorApplication)
  @Authorized()
  async submitCuratorApplication(
    @Arg('input') input: CuratorApplicationInput,
    @Ctx() { pool, userId }: Context
  ): Promise<CuratorApplication> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get user's current reputation and contributions
    const userStats = await pool.query(
      `SELECT
        COALESCE(ur.reputation_score, 0) as reputation,
        COALESCE(ur.challenges_submitted, 0) + COALESCE(ur.challenges_accepted, 0) as contributions,
        COALESCE(ur.challenges_accepted, 0) as challenges_won
       FROM public."Users" u
       LEFT JOIN public."UserReputation" ur ON ur.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userStats.rows.length === 0) {
      throw new Error('User not found');
    }

    const stats = userStats.rows[0];

    // Check if user meets role requirements
    const roleReq = await pool.query(
      'SELECT * FROM public."CuratorRoles" WHERE id = $1',
      [input.roleId]
    );

    if (roleReq.rows.length === 0) {
      throw new Error('Role not found');
    }

    const role = roleReq.rows[0];

    if (stats.reputation < role.min_reputation_required) {
      throw new Error(
        `Insufficient reputation. Required: ${role.min_reputation_required}, Current: ${stats.reputation}`
      );
    }

    if (stats.contributions < role.min_contributions_required) {
      throw new Error(
        `Insufficient contributions. Required: ${role.min_contributions_required}, Current: ${stats.contributions}`
      );
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO public."CuratorApplications" (
        user_id, role_id, application_statement, motivation,
        expertise_areas, relevant_experience, sample_contributions,
        reputation_at_application, contributions_at_application,
        challenges_won, status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted', NOW())
      RETURNING *`,
      [
        userId,
        input.roleId,
        input.applicationStatement,
        input.motivation,
        input.expertiseAreas,
        input.relevantExperience,
        input.sampleContributions || [],
        stats.reputation,
        stats.contributions,
        stats.challenges_won,
      ]
    );

    return this.mapCuratorApplication(result.rows[0]);
  }

  @Mutation(() => CuratorApplicationVote)
  @Authorized()
  async voteOnCuratorApplication(
    @Arg('input') input: CuratorApplicationVoteInput,
    @Ctx() { pool, userId }: Context
  ): Promise<CuratorApplicationVote> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check application is in voting status
    const appCheck = await pool.query(
      `SELECT * FROM public."CuratorApplications"
       WHERE id = $1 AND status = 'voting' AND voting_deadline > NOW()`,
      [input.applicationId]
    );

    if (appCheck.rows.length === 0) {
      throw new Error('Application is not open for voting');
    }

    // Get voter's reputation to calculate vote weight
    const voterRep = await pool.query(
      'SELECT COALESCE(reputation_score, 0) as reputation FROM public."UserReputation" WHERE user_id = $1',
      [userId]
    );

    const voteWeight = Math.min(5.0, Math.max(1.0, (voterRep.rows[0]?.reputation || 0) / 200));

    const result = await pool.query(
      `INSERT INTO public."CuratorApplicationVotes" (
        application_id, voter_id, vote, vote_weight, rationale
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (application_id, voter_id)
      DO UPDATE SET vote = $3, vote_weight = $4, rationale = $5, voted_at = NOW()
      RETURNING *`,
      [input.applicationId, userId, input.vote, voteWeight, input.rationale]
    );

    return this.mapCuratorApplicationVote(result.rows[0]);
  }

  @Mutation(() => CuratorApplication)
  @Authorized()
  async reviewCuratorApplication(
    @Arg('input') input: CuratorApplicationReviewInput,
    @Ctx() { pool, userId }: Context
  ): Promise<CuratorApplication> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Check permission
    const hasPermission = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, 'application_review', 'application', 'approve']
    );

    if (!hasPermission.rows[0]?.has_permission) {
      throw new Error('Insufficient permissions to review applications');
    }

    const result = await pool.query(
      `UPDATE public."CuratorApplications"
       SET status = CASE
           WHEN $2 = 'approved' THEN 'approved'
           WHEN $2 = 'rejected' THEN 'rejected'
           ELSE 'under_review'
         END,
         decision = $2,
         decision_reason = $3,
         reviewer_notes = $4,
         conditions_for_approval = $5,
         probation_period_days = $6,
         reviewed_by_user_id = $1,
         reviewed_at = NOW(),
         decision_made_at = CASE WHEN $2 IN ('approved', 'rejected') THEN NOW() ELSE NULL END,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        userId,
        input.decision,
        input.decisionReason,
        input.reviewerNotes,
        input.conditionsForApproval,
        input.probationPeriodDays,
        input.applicationId,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    // If approved, create UserCurator record
    if (input.decision === 'approved') {
      const app = result.rows[0];
      await pool.query(
        `INSERT INTO public."UserCurators" (
          user_id, role_id, expertise_areas, assigned_by_user_id,
          expires_at, notes, status
        ) VALUES ($1, $2, $3, $4,
          CASE WHEN $5 > 0 THEN NOW() + ($5 || ' days')::INTERVAL ELSE NULL END,
          $6, 'active')`,
        [
          app.user_id,
          app.role_id,
          app.expertise_areas,
          userId,
          input.probationPeriodDays || 0,
          input.conditionsForApproval,
        ]
      );
    }

    return this.mapCuratorApplication(result.rows[0]);
  }

  @FieldResolver(() => User)
  async user(@Root() application: CuratorApplication, @Ctx() { pool }: Context): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM public."Users" WHERE id = $1',
      [application.userId]
    );
    return result.rows[0] || null;
  }

  @FieldResolver(() => CuratorRole)
  async role(@Root() application: CuratorApplication, @Ctx() { pool }: Context): Promise<CuratorRole | null> {
    const result = await pool.query(
      'SELECT * FROM public."CuratorRoles" WHERE id = $1',
      [application.roleId]
    );
    return result.rows[0] ? new CuratorRoleResolver().mapCuratorRole(result.rows[0]) : null;
  }

  private mapCuratorApplication(row: any): CuratorApplication {
    const approvalRatio =
      row.total_voting_weight > 0 ? row.votes_for / row.total_voting_weight : 0;

    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      status: row.status,
      applicationStatement: row.application_statement,
      motivation: row.motivation,
      expertiseAreas: row.expertise_areas,
      relevantExperience: row.relevant_experience,
      sampleContributions: row.sample_contributions,
      reputationAtApplication: row.reputation_at_application,
      contributionsAtApplication: row.contributions_at_application,
      challengesWon: row.challenges_won,
      methodologiesCompleted: row.methodologies_completed,
      votingStartedAt: row.voting_started_at,
      votingDeadline: row.voting_deadline,
      votesFor: row.votes_for,
      votesAgainst: row.votes_against,
      votesAbstain: row.votes_abstain,
      totalVotingWeight: row.total_voting_weight,
      reviewedByUserId: row.reviewed_by_user_id,
      reviewedAt: row.reviewed_at,
      decision: row.decision,
      decisionReason: row.decision_reason,
      reviewerNotes: row.reviewer_notes,
      conditionsForApproval: row.conditions_for_approval,
      probationPeriodDays: row.probation_period_days,
      submittedAt: row.submitted_at,
      decisionMadeAt: row.decision_made_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvalRatio,
    };
  }

  private mapCuratorApplicationVote(row: any): CuratorApplicationVote {
    return {
      id: row.id,
      applicationId: row.application_id,
      voterId: row.voter_id,
      vote: row.vote,
      voteWeight: row.vote_weight,
      rationale: row.rationale,
      votedAt: row.voted_at,
    };
  }
}

@Resolver(CuratorAuditLog)
export class CuratorAuditLogResolver {
  @Query(() => [CuratorAuditLog])
  async curatorAuditLogs(
    @Arg('filters', () => AuditLogFilters, { nullable: true }) filters: AuditLogFilters | null,
    @Arg('limit', () => Int, { defaultValue: 100 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { pool }: Context
  ): Promise<CuratorAuditLog[]> {
    let query = 'SELECT * FROM public."CuratorAuditLog" WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.curatorId) {
        params.push(filters.curatorId);
        query += ` AND curator_id = $${++paramCount}`;
      }
      if (filters.userId) {
        params.push(filters.userId);
        query += ` AND user_id = $${++paramCount}`;
      }
      if (filters.actionType) {
        params.push(filters.actionType);
        query += ` AND action_type = $${++paramCount}`;
      }
      if (filters.resourceType) {
        params.push(filters.resourceType);
        query += ` AND resource_type = $${++paramCount}`;
      }
      if (filters.resourceId) {
        params.push(filters.resourceId);
        query += ` AND resource_id = $${++paramCount}`;
      }
      if (filters.requiresPeerReview !== undefined) {
        params.push(filters.requiresPeerReview);
        query += ` AND requires_peer_review = $${++paramCount}`;
      }
      if (filters.peerReviewed !== undefined) {
        params.push(filters.peerReviewed);
        query += ` AND peer_reviewed = $${++paramCount}`;
      }
      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        query += ` AND performed_at >= $${++paramCount}`;
      }
      if (filters.dateTo) {
        params.push(filters.dateTo);
        query += ` AND performed_at <= $${++paramCount}`;
      }
    }

    query += ' ORDER BY performed_at DESC';
    params.push(limit, offset);
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    const result = await pool.query(query, params);
    return result.rows.map(this.mapCuratorAuditLog);
  }

  @Query(() => CuratorAuditLog, { nullable: true })
  async curatorAuditLog(
    @Arg('id', () => ID) id: string,
    @Ctx() { pool }: Context
  ): Promise<CuratorAuditLog | null> {
    const result = await pool.query(
      'SELECT * FROM public."CuratorAuditLog" WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapCuratorAuditLog(result.rows[0]) : null;
  }

  @Mutation(() => CuratorAuditLog)
  @Authorized()
  async logCuratorAction(
    @Arg('input') input: CuratorActionLogInput,
    @Ctx() { pool, userId, req }: Context
  ): Promise<CuratorAuditLog> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get curator ID
    const curatorResult = await pool.query(
      'SELECT id FROM public."UserCurators" WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (curatorResult.rows.length === 0) {
      throw new Error('User is not an active curator');
    }

    const curatorId = curatorResult.rows[0].id;

    // Parse JSON strings if provided
    const oldValue = input.oldValue ? JSON.parse(input.oldValue) : null;
    const newValue = input.newValue ? JSON.parse(input.newValue) : null;

    // Log the action
    const result = await pool.query(
      `SELECT public.log_curator_action($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as audit_id`,
      [
        curatorId,
        userId,
        input.actionType,
        input.resourceType,
        input.resourceId,
        oldValue,
        newValue,
        input.reason,
        req.ip,
        req.headers['user-agent'],
      ]
    );

    const auditId = result.rows[0].audit_id;

    // Fetch the created audit log entry
    const auditResult = await pool.query(
      'SELECT * FROM public."CuratorAuditLog" WHERE id = $1',
      [auditId]
    );

    return this.mapCuratorAuditLog(auditResult.rows[0]);
  }

  @Mutation(() => CuratorReview)
  @Authorized()
  async submitCuratorReview(
    @Arg('input') input: CuratorReviewInput,
    @Ctx() { pool, userId }: Context
  ): Promise<CuratorReview> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get reviewer curator ID
    const reviewerResult = await pool.query(
      'SELECT id FROM public."UserCurators" WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (reviewerResult.rows.length === 0) {
      throw new Error('User is not an active curator');
    }

    const reviewerId = reviewerResult.rows[0].id;

    // Check permission
    const hasPermission = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, 'curator_review', 'all', 'create']
    );

    if (!hasPermission.rows[0]?.has_permission) {
      throw new Error('Insufficient permissions to review curator actions');
    }

    const result = await pool.query(
      `INSERT INTO public."CuratorReviews" (
        audit_log_id, reviewer_id, reviewer_user_id, review_type,
        rating, verdict, comments, specific_concerns, recommendations,
        action_required, escalated, escalated_to_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        input.auditLogId,
        reviewerId,
        userId,
        input.reviewType,
        input.rating,
        input.verdict,
        input.comments,
        input.specificConcerns || [],
        input.recommendations || [],
        input.actionRequired || false,
        input.escalate || false,
        input.escalateToUserId,
      ]
    );

    // Update audit log peer review status
    await pool.query(
      `UPDATE public."CuratorAuditLog"
       SET peer_reviewed = true,
           peer_review_status = $1
       WHERE id = $2`,
      [input.verdict === 'approved' ? 'approved' : 'flagged', input.auditLogId]
    );

    // Update curator metrics
    const auditLog = await pool.query(
      'SELECT curator_id FROM public."CuratorAuditLog" WHERE id = $1',
      [input.auditLogId]
    );

    if (auditLog.rows.length > 0) {
      await pool.query(
        'SELECT public.update_curator_metrics($1)',
        [auditLog.rows[0].curator_id]
      );
    }

    return this.mapCuratorReview(result.rows[0]);
  }

  @FieldResolver(() => UserCurator)
  async curator(@Root() auditLog: CuratorAuditLog, @Ctx() { pool }: Context): Promise<UserCurator | null> {
    const result = await pool.query(
      'SELECT * FROM public."UserCurators" WHERE id = $1',
      [auditLog.curatorId]
    );
    return result.rows[0] ? new UserCuratorResolver().mapUserCurator(result.rows[0]) : null;
  }

  @FieldResolver(() => [CuratorReview])
  async reviews(@Root() auditLog: CuratorAuditLog, @Ctx() { pool }: Context): Promise<CuratorReview[]> {
    const result = await pool.query(
      'SELECT * FROM public."CuratorReviews" WHERE audit_log_id = $1 ORDER BY reviewed_at DESC',
      [auditLog.id]
    );
    return result.rows.map(this.mapCuratorReview);
  }

  private mapCuratorAuditLog(row: any): CuratorAuditLog {
    return {
      id: row.id,
      curatorId: row.curator_id,
      userId: row.user_id,
      actionType: row.action_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValue: row.old_value,
      newValue: row.new_value,
      changes: row.changes,
      reason: row.reason,
      notes: row.notes,
      relatedEvidenceIds: row.related_evidence_ids,
      requiresPeerReview: row.requires_peer_review,
      peerReviewed: row.peer_reviewed,
      peerReviewStatus: row.peer_review_status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      performedAt: row.performed_at,
      metadata: row.metadata,
    };
  }

  private mapCuratorReview(row: any): CuratorReview {
    return {
      id: row.id,
      auditLogId: row.audit_log_id,
      reviewerId: row.reviewer_id,
      reviewerUserId: row.reviewer_user_id,
      reviewType: row.review_type,
      rating: row.rating,
      verdict: row.verdict,
      comments: row.comments,
      specificConcerns: row.specific_concerns,
      recommendations: row.recommendations,
      actionRequired: row.action_required,
      actionTaken: row.action_taken,
      escalated: row.escalated,
      escalatedToUserId: row.escalated_to_user_id,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
    };
  }
}
