/**
 * CollaborationResolver - TEMPORARILY DISABLED
 *
 * This resolver has been temporarily disabled during the schema refactor.
 * It queries dropped tables:
 * - public."UserPresence" (for real-time collaboration tracking)
 * - public."GraphInvitations" (for graph sharing/permissions)
 *
 * REFACTORING STRATEGY:
 * 1. UserPresence: Store in Redis (ephemeral data, doesn't need database persistence)
 * 2. GraphInvitations: Store as nodes with type "Invitation", use edges to link to graphs
 * 3. Subscriptions: Already using Redis pub/sub, can continue with that pattern
 *
 * This refactor requires architectural decisions about:
 * - Whether user presence should be stored at all (Redis vs database)
 * - How to represent invitation state (pending/accepted/declined) in node props
 * - Permission management for graph access
 *
 * For now, this resolver is disabled to unblock other refactoring work.
 */

import { Resolver } from 'type-graphql';

@Resolver()
export class CollaborationResolver {
  // All mutations, queries, and subscriptions temporarily disabled
  // See comment above for refactoring strategy
}

export default CollaborationResolver;
