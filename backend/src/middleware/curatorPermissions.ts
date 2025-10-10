import { MiddlewareFn } from 'type-graphql';
import { Pool } from 'pg';

interface Context {
  pool: Pool;
  userId?: string;
}

/**
 * Permission types available in the curator system
 */
export enum CuratorPermissionType {
  LEVEL_0_CONTENT = 'level_0_content',
  LEVEL_0_NODES = 'level_0_nodes',
  LEVEL_0_EDGES = 'level_0_edges',
  VERACITY_APPROVAL = 'veracity_approval',
  METHODOLOGY_VALIDATION = 'methodology_validation',
  SOURCE_VALIDATION = 'source_validation',
  CURATOR_REVIEW = 'curator_review',
  USER_MODERATION = 'user_moderation',
  APPLICATION_REVIEW = 'application_review',
}

/**
 * Resource types that permissions apply to
 */
export enum ResourceType {
  NODE = 'node',
  EDGE = 'edge',
  SOURCE = 'source',
  METHODOLOGY = 'methodology',
  USER = 'user',
  APPLICATION = 'application',
  CHALLENGE = 'challenge',
  ALL = 'all',
}

/**
 * Actions that can be performed on resources
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  EDIT = 'edit',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Middleware to check if user has curator permissions
 *
 * Usage:
 * @Mutation(() => Node)
 * @UseMiddleware(RequireCuratorPermission(
 *   CuratorPermissionType.LEVEL_0_NODES,
 *   ResourceType.NODE,
 *   PermissionAction.CREATE
 * ))
 * async createLevel0Node(...) { ... }
 */
export function RequireCuratorPermission(
  permissionType: CuratorPermissionType,
  resourceType: ResourceType,
  action: PermissionAction
): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    const { pool, userId } = context;

    if (!userId) {
      throw new Error('Authentication required');
    }

    // Check if user has the required curator permission
    const hasPermission = await checkCuratorPermission(
      pool,
      userId,
      permissionType,
      resourceType,
      action
    );

    if (!hasPermission) {
      throw new Error(
        `Insufficient curator permissions. Required: ${permissionType}.${action} on ${resourceType}`
      );
    }

    return next();
  };
}

/**
 * Middleware to check if user is an active curator (any role)
 */
export const RequireActiveCurator: MiddlewareFn<Context> = async ({ context }, next) => {
  const { pool, userId } = context;

  if (!userId) {
    throw new Error('Authentication required');
  }

  const result = await pool.query(
    `SELECT id FROM public."UserCurators"
     WHERE user_id = $1 AND status = 'active'
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Active curator status required');
  }

  return next();
};

/**
 * Middleware to check if user has a specific curator role
 */
export function RequireCuratorRole(roleName: string): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    const { pool, userId } = context;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      `SELECT uc.id
       FROM public."UserCurators" uc
       JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
       WHERE uc.user_id = $1
         AND uc.status = 'active'
         AND cr.role_name = $2
       LIMIT 1`,
      [userId, roleName]
    );

    if (result.rows.length === 0) {
      throw new Error(`Curator role required: ${roleName}`);
    }

    return next();
  };
}

/**
 * Middleware to check if user meets minimum curator tier requirement
 */
export function RequireCuratorTier(minTier: number): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    const { pool, userId } = context;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const result = await pool.query(
      `SELECT cr.tier
       FROM public."UserCurators" uc
       JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
       WHERE uc.user_id = $1
         AND uc.status = 'active'
       ORDER BY cr.tier DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Active curator status required');
    }

    if (result.rows[0].tier < minTier) {
      throw new Error(`Minimum curator tier ${minTier} required`);
    }

    return next();
  };
}

/**
 * Helper function to check curator permissions
 * Uses the PostgreSQL check_curator_permission function
 */
export async function checkCuratorPermission(
  pool: Pool,
  userId: string,
  permissionType: CuratorPermissionType | string,
  resourceType: ResourceType | string,
  action: PermissionAction | string
): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT public.check_curator_permission($1, $2, $3, $4) as has_permission',
      [userId, permissionType, resourceType, action]
    );

    return result.rows[0]?.has_permission || false;
  } catch (error) {
    console.error('Error checking curator permission:', error);
    return false;
  }
}

/**
 * Helper function to get user's curator roles
 */
export async function getUserCuratorRoles(
  pool: Pool,
  userId: string
): Promise<Array<{ roleId: string; roleName: string; tier: number }>> {
  const result = await pool.query(
    `SELECT uc.role_id as "roleId", cr.role_name as "roleName", cr.tier
     FROM public."UserCurators" uc
     JOIN public."CuratorRoles" cr ON cr.id = uc.role_id
     WHERE uc.user_id = $1 AND uc.status = 'active'
     ORDER BY cr.tier DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Helper function to check if user is an active curator
 */
export async function isActiveCurator(pool: Pool, userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM public."UserCurators"
     WHERE user_id = $1 AND status = 'active'
     LIMIT 1`,
    [userId]
  );

  return result.rows.length > 0;
}

/**
 * Helper function to get curator's performance metrics
 */
export async function getCuratorMetrics(pool: Pool, userId: string): Promise<{
  totalActions: number;
  accuracyRate: number;
  peerReviewScore: number;
  communityTrustScore: number;
} | null> {
  const result = await pool.query(
    `SELECT
       total_actions as "totalActions",
       accuracy_rate as "accuracyRate",
       peer_review_score as "peerReviewScore",
       community_trust_score as "communityTrustScore"
     FROM public."UserCurators"
     WHERE user_id = $1 AND status = 'active'
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Decorator to check Level 0 content creation permissions
 * This is the most critical permission for maintaining Level 0 integrity
 */
export const RequireLevel0ContentPermission = RequireCuratorPermission(
  CuratorPermissionType.LEVEL_0_CONTENT,
  ResourceType.ALL,
  PermissionAction.CREATE
);

/**
 * Decorator to check veracity approval permissions
 */
export const RequireVeracityApprovalPermission = RequireCuratorPermission(
  CuratorPermissionType.VERACITY_APPROVAL,
  ResourceType.ALL,
  PermissionAction.APPROVE
);

/**
 * Decorator to check source validation permissions
 */
export const RequireSourceValidationPermission = RequireCuratorPermission(
  CuratorPermissionType.SOURCE_VALIDATION,
  ResourceType.SOURCE,
  PermissionAction.APPROVE
);

/**
 * Decorator to check methodology validation permissions
 */
export const RequireMethodologyValidationPermission = RequireCuratorPermission(
  CuratorPermissionType.METHODOLOGY_VALIDATION,
  ResourceType.METHODOLOGY,
  PermissionAction.APPROVE
);

/**
 * Integration with audit logging
 * Automatically logs curator actions when middleware passes
 */
export function LogCuratorAction(
  actionType: string,
  resourceType: string
): MiddlewareFn<Context> {
  return async ({ context, args }, next) => {
    const { pool, userId } = context;
    const result = await next();

    if (userId) {
      try {
        // Get curator ID
        const curatorResult = await pool.query(
          'SELECT id FROM public."UserCurators" WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );

        if (curatorResult.rows.length > 0) {
          const curatorId = curatorResult.rows[0].id;
          const resourceId = args.id || args.input?.id || 'unknown';

          // Log the action asynchronously (don't block the response)
          pool.query(
            `SELECT public.log_curator_action($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL, NULL)`,
            [curatorId, userId, actionType, resourceType, resourceId]
          ).catch(err => {
            console.error('Error logging curator action:', err);
          });
        }
      } catch (error) {
        console.error('Error in curator action logging:', error);
      }
    }

    return result;
  };
}

/**
 * Combined middleware: Check permission AND log action
 */
export function CheckAndLogCuratorAction(
  permissionType: CuratorPermissionType,
  resourceType: ResourceType,
  action: PermissionAction,
  actionType: string
): MiddlewareFn<Context> {
  return async ({ context, args }, next) => {
    // First check permission
    const { pool, userId } = context;

    if (!userId) {
      throw new Error('Authentication required');
    }

    const hasPermission = await checkCuratorPermission(
      pool,
      userId,
      permissionType,
      resourceType,
      action
    );

    if (!hasPermission) {
      throw new Error(
        `Insufficient curator permissions. Required: ${permissionType}.${action} on ${resourceType}`
      );
    }

    // Execute the resolver
    const result = await next();

    // Log the action
    try {
      const curatorResult = await pool.query(
        'SELECT id FROM public."UserCurators" WHERE user_id = $1 AND status = $2',
        [userId, 'active']
      );

      if (curatorResult.rows.length > 0) {
        const curatorId = curatorResult.rows[0].id;
        const resourceId = args.id || args.input?.id || result?.id || 'unknown';

        pool.query(
          `SELECT public.log_curator_action($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL, NULL)`,
          [curatorId, userId, actionType, resourceType, resourceId]
        ).catch(err => {
          console.error('Error logging curator action:', err);
        });
      }
    } catch (error) {
      console.error('Error in curator action logging:', error);
    }

    return result;
  };
}

/**
 * Rate limiting for curator actions
 * Enforces max_daily_actions from permissions
 */
export function EnforceCuratorRateLimit(
  permissionType: CuratorPermissionType,
  resourceType: ResourceType
): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    const { pool, userId } = context;

    if (!userId) {
      throw new Error('Authentication required');
    }

    // Get rate limit from permissions
    const limitResult = await pool.query(
      `SELECT rp.max_daily_actions
       FROM public."UserCurators" uc
       JOIN public."RolePermissions" rp ON rp.role_id = uc.role_id
       WHERE uc.user_id = $1
         AND uc.status = 'active'
         AND rp.permission_type = $2
         AND (rp.resource_type = $3 OR rp.resource_type = 'all')
         AND rp.max_daily_actions IS NOT NULL
       LIMIT 1`,
      [userId, permissionType, resourceType]
    );

    if (limitResult.rows.length > 0) {
      const maxDailyActions = limitResult.rows[0].max_daily_actions;

      // Count actions today
      const countResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM public."CuratorAuditLog" cal
         JOIN public."UserCurators" uc ON uc.id = cal.curator_id
         WHERE uc.user_id = $1
           AND cal.resource_type = $2
           AND cal.performed_at >= CURRENT_DATE
           AND cal.performed_at < CURRENT_DATE + INTERVAL '1 day'`,
        [userId, resourceType]
      );

      const todayCount = parseInt(countResult.rows[0].count, 10);

      if (todayCount >= maxDailyActions) {
        throw new Error(
          `Daily action limit reached (${maxDailyActions}). Please try again tomorrow.`
        );
      }
    }

    return next();
  };
}

export default {
  RequireCuratorPermission,
  RequireActiveCurator,
  RequireCuratorRole,
  RequireCuratorTier,
  RequireLevel0ContentPermission,
  RequireVeracityApprovalPermission,
  RequireSourceValidationPermission,
  RequireMethodologyValidationPermission,
  LogCuratorAction,
  CheckAndLogCuratorAction,
  EnforceCuratorRateLimit,
  checkCuratorPermission,
  getUserCuratorRoles,
  isActiveCurator,
  getCuratorMetrics,
};
