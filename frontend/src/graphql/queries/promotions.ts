/**
 * GraphQL Queries for Promotion Events
 *
 * Queries for the public promotion ledger showing Level 0 promotions
 * with full audit trail transparency.
 */

import { gql } from '@apollo/client';

/**
 * Fetch all promotion events with pagination
 * Used for public ledger display
 */
export const GET_PROMOTION_EVENTS = gql`
  query GetPromotionEvents(
    $limit: Int
    $offset: Int
    $startDate: String
    $endDate: String
    $methodology: String
  ) {
    promotionEvents(
      limit: $limit
      offset: $offset
      startDate: $startDate
      endDate: $endDate
      methodology: $methodology
    ) {
      id
      graph_id
      graph_name
      previous_level
      new_level
      promoted_at
      promotion_reason
    }
  }
`;

/**
 * Get total count of promotion events (for pagination)
 */
export const GET_PROMOTION_EVENTS_COUNT = gql`
  query GetPromotionEventsCount(
    $startDate: String
    $endDate: String
    $methodology: String
  ) {
    promotionEventsCount(
      startDate: $startDate
      endDate: $endDate
      methodology: $methodology
    )
  }
`;

/**
 * Get promotion eligibility details for a specific graph
 * Shows veracity scores, evidence, and voting breakdown
 */
export const GET_PROMOTION_ELIGIBILITY = gql`
  query GetPromotionEligibility($graphId: String!) {
    getPromotionEligibility(graphId: $graphId) {
      graph_id
      methodology_completion_score
      consensus_score
      evidence_quality_score
      challenge_resolution_score
      overall_score
      is_eligible
      blocking_reason
      missing_requirements
      calculated_at
    }
  }
`;

/**
 * Get consensus votes for a graph to show vote breakdown
 */
export const GET_CONSENSUS_VOTES = gql`
  query GetConsensusVotes($graphId: String!) {
    getConsensusVotes(graphId: $graphId) {
      id
      graph_id
      user_id
      vote_value
      reasoning
      vote_weight
      voter_reputation_score
      created_at
      updated_at
    }
  }
`;

/**
 * Subscription for real-time promotion events
 * Allows ledger to update live when new promotions happen
 */
export const PROMOTION_EVENT_SUBSCRIPTION = gql`
  subscription OnPromotionEvent {
    promotionEventCreated {
      id
      graph_id
      graph_name
      previous_level
      new_level
      promoted_at
      promotion_reason
    }
  }
`;
