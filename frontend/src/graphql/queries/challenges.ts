/**
 * GraphQL Queries and Mutations for Challenge System
 *
 * Handles all GraphQL operations related to challenges,
 * votes, and reputation.
 */

import { gql } from '@apollo/client';

/**
 * Get all available challenge types
 */
export const GET_CHALLENGE_TYPES = gql`
  query GetChallengeTypes {
    challengeTypes {
      id
      name
      description
      severity
    }
  }
`;

/**
 * Get challenges for a specific node
 */
export const GET_CHALLENGES_FOR_NODE = gql`
  query GetChallengesForNode($nodeId: ID!) {
    challengesByNode(nodeId: $nodeId) {
      id
      type
      status
      createdBy
      createdByName
      createdAt
      evidence
      reasoning
      claimReference
      votes {
        id
        voteType
        userId
        userName
        weight
        reasoning
        createdAt
      }
      resolution {
        outcome
        reasoning
        resolvedAt
        resolvedBy
        veracityImpact
      }
    }
  }
`;

/**
 * Get challenges for a specific edge
 */
export const GET_CHALLENGES_FOR_EDGE = gql`
  query GetChallengesForEdge($edgeId: ID!) {
    challengesByEdge(edgeId: $edgeId) {
      id
      type
      status
      createdBy
      createdByName
      createdAt
      evidence
      reasoning
      claimReference
      votes {
        id
        voteType
        userId
        userName
        weight
        reasoning
        createdAt
      }
      resolution {
        outcome
        reasoning
        resolvedAt
        resolvedBy
        veracityImpact
      }
    }
  }
`;

/**
 * Get a single challenge by ID
 */
export const GET_CHALLENGE_BY_ID = gql`
  query GetChallengeById($id: ID!) {
    challenge(id: $id) {
      id
      type
      status
      targetNodeId
      targetEdgeId
      createdBy
      createdByName
      createdAt
      evidence
      reasoning
      claimReference
      votes {
        id
        voteType
        userId
        userName
        weight
        reasoning
        createdAt
      }
      resolution {
        outcome
        reasoning
        resolvedAt
        resolvedBy
        veracityImpact
      }
    }
  }
`;

/**
 * Get challenges for a graph
 */
export const GET_CHALLENGES_FOR_GRAPH = gql`
  query GetChallengesForGraph($graphId: ID!, $status: ChallengeStatus) {
    challengesByGraph(graphId: $graphId, status: $status) {
      id
      type
      status
      targetNodeId
      targetEdgeId
      createdBy
      createdByName
      createdAt
      evidence
      reasoning
      votes {
        id
        voteType
        weight
      }
    }
  }
`;

/**
 * Get user reputation
 */
export const GET_USER_REPUTATION = gql`
  query GetUserReputation($userId: ID!) {
    userReputation(userId: $userId) {
      userId
      score
      breakdown {
        evidenceQuality
        voteAccuracy
        participationLevel
        communityTrust
      }
      rank
      achievementsCount
    }
  }
`;

/**
 * Create a new challenge
 */
export const CREATE_CHALLENGE = gql`
  mutation CreateChallenge($input: CreateChallengeInput!) {
    createChallenge(input: $input) {
      id
      type
      status
      targetNodeId
      targetEdgeId
      createdBy
      createdAt
      evidence
      reasoning
      claimReference
    }
  }
`;

/**
 * Vote on a challenge
 */
export const VOTE_ON_CHALLENGE = gql`
  mutation VoteOnChallenge(
    $challengeId: ID!
    $voteType: ChallengeVoteType!
    $reasoning: String
  ) {
    voteOnChallenge(
      challengeId: $challengeId
      voteType: $voteType
      reasoning: $reasoning
    ) {
      id
      challengeId
      voteType
      userId
      userName
      weight
      reasoning
      createdAt
    }
  }
`;

/**
 * Update vote on a challenge
 */
export const UPDATE_CHALLENGE_VOTE = gql`
  mutation UpdateChallengeVote(
    $voteId: ID!
    $voteType: ChallengeVoteType!
    $reasoning: String
  ) {
    updateChallengeVote(voteId: $voteId, voteType: $voteType, reasoning: $reasoning) {
      id
      voteType
      reasoning
      createdAt
    }
  }
`;

/**
 * Resolve a challenge (admin/moderator only)
 */
export const RESOLVE_CHALLENGE = gql`
  mutation ResolveChallenge(
    $challengeId: ID!
    $outcome: ChallengeOutcome!
    $reasoning: String!
    $veracityImpact: Float
  ) {
    resolveChallenge(
      challengeId: $challengeId
      outcome: $outcome
      reasoning: $reasoning
      veracityImpact: $veracityImpact
    ) {
      id
      status
      resolution {
        outcome
        reasoning
        resolvedAt
        resolvedBy
        veracityImpact
      }
    }
  }
`;

/**
 * Get challenge statistics
 */
export const GET_CHALLENGE_STATS = gql`
  query GetChallengeStats($graphId: ID) {
    challengeStats(graphId: $graphId) {
      total
      open
      underReview
      resolved
      dismissed
      byType {
        type
        count
      }
    }
  }
`;

/**
 * Subscribe to new challenges in a graph
 */
export const CHALLENGE_CREATED_SUBSCRIPTION = gql`
  subscription ChallengeCreated($graphId: ID!) {
    challengeCreated(graphId: $graphId) {
      id
      type
      status
      targetNodeId
      targetEdgeId
      createdBy
      createdByName
      createdAt
      evidence
      reasoning
    }
  }
`;

/**
 * Subscribe to challenge vote updates
 */
export const CHALLENGE_VOTE_SUBSCRIPTION = gql`
  subscription ChallengeVoteUpdated($challengeId: ID!) {
    challengeVoteUpdated(challengeId: $challengeId) {
      id
      voteType
      userId
      userName
      weight
      createdAt
    }
  }
`;

/**
 * Subscribe to challenge status changes
 */
export const CHALLENGE_STATUS_SUBSCRIPTION = gql`
  subscription ChallengeStatusChanged($graphId: ID!) {
    challengeStatusChanged(graphId: $graphId) {
      id
      status
      resolution {
        outcome
        reasoning
        resolvedAt
        resolvedBy
        veracityImpact
      }
    }
  }
`;

/**
 * Type definitions for TypeScript
 */

export interface ChallengeTypeResult {
  id: string;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CreateChallengeInput {
  type: string;
  targetNodeId?: string;
  targetEdgeId?: string;
  evidence: string;
  reasoning: string;
  claimReference?: string;
}

export interface VoteOnChallengeInput {
  challengeId: string;
  voteType: 'uphold' | 'dismiss';
  reasoning?: string;
}

export interface ResolveChallengeInput {
  challengeId: string;
  outcome: 'upheld' | 'dismissed';
  reasoning: string;
  veracityImpact?: number;
}
