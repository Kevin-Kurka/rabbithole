/**
 * FormalInquiryResolver - TEMPORARILY DISABLED
 *
 * This resolver has been temporarily disabled during the schema refactor.
 * It queries dropped tables:
 * - public."FormalInquiries"
 * - public."InquiryVotes"
 *
 * REFACTORING STRATEGY:
 * 1. FormalInquiries: Store as nodes with type "FormalInquiry"
 * 2. InquiryVotes: Store as edges from users to inquiry nodes with vote data in props
 * 3. Inquiry questions, status, priority: All in inquiry node props
 * 4. Vote counts: Calculated from edges or cached in inquiry node props
 *
 * This refactor requires:
 * - Creating "FormalInquiry" node type
 * - Using edges for votes (from user to inquiry node)
 * - Aggregating vote counts in resolver queries
 *
 * For now, this resolver is disabled to unblock other refactoring work.
 */

import { Resolver } from 'type-graphql';

@Resolver()
export class FormalInquiryResolver {
  // All mutations and queries temporarily disabled
  // See comment above for refactoring strategy
}

export default FormalInquiryResolver;
