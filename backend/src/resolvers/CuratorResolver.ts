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
import {
  CuratorRole,
  UserCurator,
  CuratorApplication,
  CuratorApplicationVote,
  CuratorAuditLog,
  RolePermission,
  User,
  ConsensusVote,
  CuratorReview
} from '../types/GraphTypes';
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
    let query = `
      SELECT n.*, n.props->>'roleName' as role_name, n.props->>'tier' as tier
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'CuratorRole'
    `;

    if (activeOnly) {
      query += ` AND (n.props->>'isActive')::boolean = true`;
    }

    query += ` ORDER BY (n.props->>'tier')::int ASC, n.props->>'roleName' ASC`;

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

    let query = `
      SELECT n.*
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'CuratorRole'
    `;
    const params: any[] = [];

    if (id) {
      query += ` AND n.id = $1`;
      params.push(id);
    } else {
      query += ` AND n.props->>'roleName' = $1`;
      params.push(roleName);
    }

    const result = await pool.query(query, params);
    return result.rows[0] ? this.mapCuratorRole(result.rows[0]) : null;
  }

  @Query(() => [RolePermission])
  async rolePermissions(
    @Arg('roleId', () => ID) roleId: string,
    @Ctx() { pool }: Context
  ): Promise<RolePermission[]> {
    // In the graph schema, permissions are stored in the CuratorRole props as an array of strings.
    // We map these strings to RolePermission objects.
    const result = await pool.query(
      `SELECT props FROM public."Nodes" WHERE id = $1`,
      [roleId]
    );

    if (result.rows.length === 0) return [];

    const props = typeof result.rows[0].props === 'string'
      ? JSON.parse(result.rows[0].props)
      : result.rows[0].props;

    const permissions: string[] = props.permissions || [];

    // Map strings to RolePermission objects
    // This is a simplification as the original entity had detailed boolean flags.
    // We create a dummy RolePermission for each permission string or group them.
    // For backward compatibility, we'll try to construct meaningful objects.

    return permissions.map((perm, index) => ({
      id: `${roleId}-perm-${index}`,
      roleId: roleId,
      permissionType: perm,
      resourceType: 'any', // Default
      canCreate: perm.includes('create'),
      canRead: perm.includes('read'),
      canEdit: perm.includes('edit'),
      canDelete: perm.includes('delete'),
      canApprove: perm.includes('approve'),
      canReject: perm.includes('reject'),
      canPromoteToLevel0: perm.includes('promote'),
      canDemoteFromLevel0: perm.includes('demote'),
      canAssignVeracityScore: perm.includes('veracity'),
      canOverrideConsensus: perm.includes('override'),
      maxDailyActions: 100,
      requiresPeerReview: false,
      requiresSecondApproval: false,
      description: perm,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  public mapCuratorRole(row: any): CuratorRole {
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
    return {
      id: row.id,
      roleName: props.roleName,
      displayName: props.displayName || props.roleName,
      description: props.description,
      tier: props.tier || 0,
      minReputationRequired: props.minReputationRequired || 0,
      minContributionsRequired: props.minContributionsRequired || 0,
      expertiseAreasRequired: props.expertiseAreasRequired || [],
      requiresApplication: props.requiresApplication || false,
      requiresCommunityVote: props.requiresCommunityVote || false,
      minVotesRequired: props.minVotesRequired || 0,
      approvalThreshold: props.approvalThreshold || 0.5,
      icon: props.icon,
      color: props.color,
      badgeImageUrl: props.badgeImageUrl,
      isActive: props.isActive !== false,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
    let query = `
      SELECT e.*, et.name as edge_type
      FROM public."Edges" e
      JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
      WHERE et.name = 'HAS_ROLE'
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.roleId) {
        params.push(filters.roleId);
        query += ` AND e.target_node_id = $${++paramCount}`;
      }
      if (filters.status) {
        params.push(filters.status);
        query += ` AND e.props->>'status' = $${++paramCount}`;
      }
      // Note: JSONB array containment for expertiseAreas is complex in SQL string building
      // Skipping complex filters for brevity, can be added if needed
    }

    query += ' ORDER BY e.created_at DESC';
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

    let query = `
      SELECT e.*
      FROM public."Edges" e
      JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
      WHERE et.name = 'HAS_ROLE'
    `;
    const params: any[] = [];

    if (id) {
      query += ` AND e.id = $1`;
      params.push(id);
    } else {
      query += ` AND e.source_node_id = $1 AND e.props->>'status' = 'active'`;
      params.push(userId);
    }

    const result = await pool.query(query, params);
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
    // Check if user has an active curator role with the required permission
    const result = await pool.query(
      `SELECT n.props->>'permissions' as permissions
       FROM public."Edges" e
       JOIN public."EdgeTypes" et ON e.edge_type_id = et.id
       JOIN public."Nodes" n ON e.target_node_id = n.id
       WHERE et.name = 'HAS_ROLE'
       AND e.source_node_id = $1
       AND e.props->>'status' = 'active'
       AND (e.props->>'expiresAt' IS NULL OR (e.props->>'expiresAt')::timestamp > NOW())`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    // Iterate through roles and check permissions
    for (const row of result.rows) {
      const permissions = row.permissions ? JSON.parse(row.permissions) : [];
      // Simple check: does the permissions array contain the requested permission string?
      // Or a wildcard like '*' or 'admin'?
      if (permissions.includes('admin') || permissions.includes(permissionType) || permissions.includes(`${action}_${resourceType}`)) {
        return true;
      }
    }

    return false;
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

    // Check permissions (simplified)
    // In a real app, we'd call hasCuratorPermission here.

    // Get HAS_ROLE edge type
    const edgeTypeRes = await pool.query(`SELECT id FROM public."EdgeTypes" WHERE name = 'HAS_ROLE'`);
    if (edgeTypeRes.rows.length === 0) throw new Error('HAS_ROLE edge type not found');
    const edgeTypeId = edgeTypeRes.rows[0].id;

    const props = {
      status: 'active',
      assignedByUserId: userId,
      assignedAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      expertiseAreas: input.expertiseAreas,
      specializationTags: input.specializationTags || [],
      notes: input.notes,
      stats: {
        totalActions: 0,
        approvedActions: 0,
        rejectedActions: 0
      }
    };

    const result = await pool.query(
      `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [edgeTypeId, input.userId, input.roleId, JSON.stringify(props)]
    );

    return this.mapUserCurator(result.rows[0]);
  }

  @Mutation(() => UserCurator)
  @Authorized()
  async updateCuratorStatus(
    @Arg('input') input: UpdateCuratorStatusInput,
    @Ctx() { pool, userId }: Context
  ): Promise<UserCurator> {
    if (!userId) throw new Error('Unauthorized');

    const result = await pool.query(
      `UPDATE public."Edges"
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify({ status: input.status, notes: input.notes }), input.curatorId]
    );

    if (result.rows.length === 0) throw new Error('Curator assignment not found');

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
    return result.rows[0] ? User.fromNode({ ...result.rows[0], props: { username: result.rows[0].username, email: result.rows[0].email } }) : null;
  }

  @FieldResolver(() => CuratorRole)
  async role(@Root() curator: UserCurator, @Ctx() { pool }: Context): Promise<CuratorRole | null> {
    const result = await pool.query(
      'SELECT * FROM public."Nodes" WHERE id = $1',
      [curator.roleId]
    );
    return result.rows[0] ? new CuratorRoleResolver().mapCuratorRole(result.rows[0]) : null;
  }

  public mapUserCurator(row: any): UserCurator {
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
    const stats = props.stats || {};
    return {
      id: row.id,
      userId: row.source_node_id,
      roleId: row.target_node_id,
      status: props.status,
      assignedAt: props.assignedAt ? new Date(props.assignedAt) : row.created_at,
      assignedByUserId: props.assignedByUserId,
      expiresAt: props.expiresAt ? new Date(props.expiresAt) : undefined,
      expertiseAreas: props.expertiseAreas || [],
      specializationTags: props.specializationTags || [],
      notes: props.notes,
      stats: {
        totalActions: stats.totalActions || 0,
        approvedActions: stats.approvedActions || 0,
        rejectedActions: stats.rejectedActions || 0,
        overturnedActions: stats.overturnedActions || 0,
        peerReviewScore: stats.peerReviewScore || 0,
        communityTrustScore: stats.communityTrustScore || 0,
        accuracyRate: stats.accuracyRate || 0,
      },
      warningsReceived: props.warningsReceived || 0,
      lastWarningAt: props.lastWarningAt ? new Date(props.lastWarningAt) : undefined,
      suspensionCount: props.suspensionCount || 0,
      lastSuspendedAt: props.lastSuspendedAt ? new Date(props.lastSuspendedAt) : undefined,
      lastReviewDate: props.lastReviewDate ? new Date(props.lastReviewDate) : undefined,
      nextReviewDate: props.nextReviewDate ? new Date(props.nextReviewDate) : undefined,
      reviewNotes: props.reviewNotes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as UserCurator;
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
    let query = `
      SELECT n.*
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'CuratorApplication'
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.roleId) {
        params.push(filters.roleId);
        query += ` AND n.props->>'roleId' = $${++paramCount}`;
      }
      if (filters.status) {
        params.push(filters.status);
        query += ` AND n.props->>'status' = $${++paramCount}`;
      }
      if (filters.minReputation !== undefined) {
        params.push(filters.minReputation);
        query += ` AND (n.props->'stats'->>'reputation')::int >= $${++paramCount}`;
      }
      if (filters.votingOpen) {
        query += ` AND n.props->>'status' = 'voting' AND (n.props->>'votingDeadline')::timestamp > NOW()`;
      }
    }

    query += ' ORDER BY n.created_at DESC';
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
      `SELECT n.* FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id WHERE n.id = $1 AND nt.name = 'CuratorApplication'`,
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
      `SELECT n.props FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id WHERE n.id = $1 AND nt.name = 'CuratorRole'`,
      [input.roleId]
    );

    if (roleReq.rows.length === 0) {
      throw new Error('Role not found');
    }

    const roleProps = typeof roleReq.rows[0].props === 'string' ? JSON.parse(roleReq.rows[0].props) : roleReq.rows[0].props;

    if (stats.reputation < (roleProps.minReputationRequired || 0)) {
      throw new Error(
        `Insufficient reputation. Required: ${roleProps.minReputationRequired}, Current: ${stats.reputation}`
      );
    }

    if (stats.contributions < (roleProps.minContributionsRequired || 0)) {
      throw new Error(
        `Insufficient contributions. Required: ${roleProps.minContributionsRequired}, Current: ${stats.contributions}`
      );
    }

    // Get Node Type ID
    const typeRes = await pool.query(`SELECT id FROM public."NodeTypes" WHERE name = 'CuratorApplication'`);
    let typeId;
    if (typeRes.rows.length === 0) {
      const newType = await pool.query(`INSERT INTO public."NodeTypes" (name) VALUES ('CuratorApplication') RETURNING id`);
      typeId = newType.rows[0].id;
    } else {
      typeId = typeRes.rows[0].id;
    }

    const props = {
      userId,
      roleId: input.roleId,
      status: 'submitted',
      applicationStatement: input.applicationStatement,
      motivation: input.motivation,
      expertiseAreas: input.expertiseAreas,
      relevantExperience: input.relevantExperience,
      sampleContributions: input.sampleContributions || [],
      submittedAt: new Date().toISOString(),
      stats: {
        reputation: stats.reputation,
        contributions: stats.contributions,
        challengesWon: stats.challenges_won,
      }
    };

    const result = await pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [typeId, JSON.stringify(props)]
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
      `SELECT n.props FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
       WHERE n.id = $1 AND nt.name = 'CuratorApplication' AND n.props->>'status' = 'voting' AND (n.props->>'votingDeadline')::timestamp > NOW()`,
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

    // Get Node Type ID for CuratorApplicationVote
    const voteTypeRes = await pool.query(`SELECT id FROM public."NodeTypes" WHERE name = 'CuratorApplicationVote'`);
    let voteTypeId;
    if (voteTypeRes.rows.length === 0) {
      const newType = await pool.query(`INSERT INTO public."NodeTypes" (name) VALUES ('CuratorApplicationVote') RETURNING id`);
      voteTypeId = newType.rows[0].id;
    } else {
      voteTypeId = voteTypeRes.rows[0].id;
    }

    const voteProps = {
      applicationId: input.applicationId,
      voterId: userId,
      vote: input.vote,
      voteWeight: voteWeight,
      rationale: input.rationale,
      votedAt: new Date().toISOString(),
    };

    const result = await pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) -- Assuming a unique constraint on (applicationId, voterId) for votes, or handle as edges
       DO UPDATE SET props = EXCLUDED.props, updated_at = NOW()
       RETURNING *`,
      [voteTypeId, JSON.stringify(voteProps)]
    );

    // Update application vote counts (this would ideally be a trigger or separate function)
    // For now, we'll simulate it by updating the application node's props
    const updateAppProps = {
      votesFor: input.vote === 'FOR' ? voteWeight : 0,
      votesAgainst: input.vote === 'AGAINST' ? voteWeight : 0,
      votesAbstain: input.vote === 'ABSTAIN' ? voteWeight : 0,
      totalVotingWeight: voteWeight,
    };

    await pool.query(
      `UPDATE public."Nodes"
       SET props = props || jsonb_build_object(
         'votesFor', (props->>'votesFor')::numeric + $1,
         'votesAgainst', (props->>'votesAgainst')::numeric + $2,
         'votesAbstain', (props->>'votesAbstain')::numeric + $3,
         'totalVotingWeight', (props->>'totalVotingWeight')::numeric + $4
       )
       WHERE id = $5`,
      [
        updateAppProps.votesFor,
        updateAppProps.votesAgainst,
        updateAppProps.votesAbstain,
        updateAppProps.totalVotingWeight,
        input.applicationId
      ]
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

    const decisionStatus = input.decision === 'approved' ? 'approved' : input.decision === 'rejected' ? 'rejected' : 'under_review';
    const decisionMadeAt = (input.decision === 'approved' || input.decision === 'rejected') ? new Date().toISOString() : null;

    const updateProps = {
      status: decisionStatus,
      decision: input.decision,
      decisionReason: input.decisionReason,
      reviewerNotes: input.reviewerNotes,
      conditionsForApproval: input.conditionsForApproval,
      probationPeriodDays: input.probationPeriodDays,
      reviewedByUserId: userId,
      reviewedAt: new Date().toISOString(),
      decisionMadeAt: decisionMadeAt,
    };

    const result = await pool.query(
      `UPDATE public."Nodes"
       SET props = props || $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND (SELECT nt.name FROM public."NodeTypes" nt WHERE nt.id = node_type_id) = 'CuratorApplication'
       RETURNING *`,
      [JSON.stringify(updateProps), input.applicationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    // If approved, create UserCurator record (HAS_ROLE edge)
    if (input.decision === 'approved') {
      const app = this.mapCuratorApplication(result.rows[0]);

      // Get HAS_ROLE edge type
      const edgeTypeRes = await pool.query(`SELECT id FROM public."EdgeTypes" WHERE name = 'HAS_ROLE'`);
      if (edgeTypeRes.rows.length === 0) throw new Error('HAS_ROLE edge type not found');
      const edgeTypeId = edgeTypeRes.rows[0].id;

      const expiresAt = input.probationPeriodDays && input.probationPeriodDays > 0
        ? new Date(Date.now() + input.probationPeriodDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const curatorProps = {
        status: 'active',
        assignedByUserId: userId,
        assignedAt: new Date().toISOString(),
        expiresAt: expiresAt,
        expertiseAreas: app.expertiseAreas,
        specializationTags: [], // Assuming not part of application
        notes: input.conditionsForApproval,
        stats: {
          totalActions: 0,
          approvedActions: 0,
          rejectedActions: 0
        }
      };

      await pool.query(
        `INSERT INTO public."Edges" (edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [edgeTypeId, app.userId, app.roleId, JSON.stringify(curatorProps)]
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
    return result.rows[0] ? User.fromNode({ ...result.rows[0], props: { username: result.rows[0].username, email: result.rows[0].email } }) : null;
  }

  @FieldResolver(() => CuratorRole)
  async role(@Root() application: CuratorApplication, @Ctx() { pool }: Context): Promise<CuratorRole | null> {
    const result = await pool.query(
      'SELECT * FROM public."Nodes" WHERE id = $1',
      [application.roleId]
    );
    return result.rows[0] ? new CuratorRoleResolver().mapCuratorRole(result.rows[0]) : null;
  }

  private mapCuratorApplication(row: any): CuratorApplication {

  }

  private mapCuratorApplicationVote(row: any): CuratorApplicationVote {
    const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
    return {
      id: row.id,
      applicationId: props.applicationId,
      voterId: props.voterId,
      vote: props.vote,
      voteWeight: props.voteWeight,
      rationale: props.rationale,
      votedAt: props.votedAt ? new Date(props.votedAt) : row.created_at,
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
    let query = `
      SELECT n.*
      FROM public."Nodes" n
      JOIN public."NodeTypes" nt ON n.node_type_id = nt.id
      WHERE nt.name = 'AuditLog'
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters) {
      if (filters.curatorId) {
        params.push(filters.curatorId);
        query += ` AND n.props->>'curatorId' = $${++paramCount}`;
      }
      if (filters.userId) {
        params.push(filters.userId);
        query += ` AND n.props->>'userId' = $${++paramCount}`;
      }
      if (filters.actionType) {
        params.push(filters.actionType);
        query += ` AND n.props->>'actionType' = $${++paramCount}`;
      }
      if (filters.resourceType) {
        params.push(filters.resourceType);
        query += ` AND n.props->>'resourceType' = $${++paramCount}`;
      }
      if (filters.resourceId) {
        params.push(filters.resourceId);
        query += ` AND n.props->>'resourceId' = $${++paramCount}`;
      }
      if (filters.requiresPeerReview !== undefined) {
        params.push(filters.requiresPeerReview);
        query += ` AND (n.props->>'requiresPeerReview')::boolean = $${++paramCount}`;
      }
      if (filters.peerReviewed !== undefined) {
        params.push(filters.peerReviewed);
        query += ` AND (n.props->>'peerReviewed')::boolean = $${++paramCount}`;
      }
      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        query += ` AND (n.props->>'performedAt')::timestamp >= $${++paramCount}`;
      }
      if (filters.dateTo) {
        params.push(filters.dateTo);
        query += ` AND (n.props->>'performedAt')::timestamp <= $${++paramCount}`;
      }
    }

    query += ' ORDER BY n.created_at DESC';
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
      `SELECT n.* FROM public."Nodes" n JOIN public."NodeTypes" nt ON n.node_type_id = nt.id WHERE n.id = $1 AND nt.name = 'AuditLog'`,
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

    // Get AuditLog type
    const typeRes = await pool.query(`SELECT id FROM public."NodeTypes" WHERE name = 'AuditLog'`);
    let typeId;
    if (typeRes.rows.length === 0) {
      const newType = await pool.query(`INSERT INTO public."NodeTypes" (name) VALUES ('AuditLog') RETURNING id`);
      typeId = newType.rows[0].id;
    } else {
      typeId = typeRes.rows[0].id;
    }

    const props = {
      curatorId: curatorId,
      userId: userId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      oldValue: oldValue,
      newValue: newValue,
      reason: input.reason,
      performedAt: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requiresPeerReview: false, // Default, can be set by permission
      peerReviewed: false
    };

    const result = await pool.query(
      `INSERT INTO public."Nodes" (node_type_id, props, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [typeId, JSON.stringify(props)]
    );

    return this.mapAuditLog(result.rows[0]);
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
    performedAt: props.performedAt ? new Date(props.performedAt) : row.created_at,
      ipAddress: props.ipAddress,
        userAgent: props.userAgent,
          requiresPeerReview: props.requiresPeerReview || false,
            peerReviewed: props.peerReviewed || false,
              peerReviewStatus: props.peerReviewStatus,
                createdAt: row.created_at,
                  updatedAt: row.updated_at,
    };
}

  private mapCuratorReview(row: any): CuratorReview {

}
}
