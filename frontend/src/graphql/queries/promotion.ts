/**
 * GraphQL Queries and Subscriptions for Promotion Eligibility
 *
 * Transparent queries showing all promotion criteria and progress.
 */

import { gql } from '@apollo/client';

/**
 * Get complete promotion eligibility data for a graph
 */
export const GET_PROMOTION_ELIGIBILITY = gql`
  query GetPromotionEligibility($graphId: ID!) {
    promotionEligibility(graphId: $graphId) {
      graphId
      overallScore
      isEligible
      promotionThreshold
      lastUpdated

      methodologyCompletion {
        id
        name
        currentScore
        targetScore
        isMet
        description
        recommendations
        steps {
          id
          name
          description
          isCompleted
          completionPercentage
          completedBy {
            id
            username
          }
          completedAt
          evidenceIds
        }
      }

      consensus {
        id
        name
        currentScore
        targetScore
        isMet
        description
        recommendations
        details {
          overallScore
          voteCount
          weightedAverage
          targetConsensus
          isMet
          votes {
            userId
            username
            reputationScore
            confidence
            reasoning
            votedAt
            voteWeight
          }
        }
      }

      evidenceQuality {
        id
        name
        currentScore
        targetScore
        isMet
        description
        recommendations
        details {
          overallScore
          evidenceCount
          qualityBreakdown {
            high
            medium
            low
          }
          averageCredibility
          isMet
          targetScore
        }
      }

      challengeResolution {
        id
        name
        currentScore
        targetScore
        isMet
        description
        recommendations
        details {
          overallScore
          openChallenges
          resolvedChallenges
          isMet
          challenges {
            id
            raisedBy {
              id
              username
            }
            description
            status
            raisedAt
            resolvedAt
            resolution
          }
        }
      }

      nextAction {
        criterion
        action
        priority
      }
    }
  }
`;

/**
 * Get methodology steps for progress panel
 */
export const GET_METHODOLOGY_PROGRESS = gql`
  query GetMethodologyProgress($graphId: ID!) {
    methodologyProgress(graphId: $graphId) {
      graphId
      methodologyId
      methodologyName
      completionPercentage
      steps {
        id
        name
        description
        isCompleted
        completionPercentage
        completedBy {
          id
          username
        }
        completedAt
        evidenceIds
      }
      nextStep {
        id
        name
        description
      }
    }
  }
`;

/**
 * Get consensus voting data
 */
export const GET_CONSENSUS_VOTING = gql`
  query GetConsensusVoting($graphId: ID!) {
    consensusVoting(graphId: $graphId) {
      graphId
      overallScore
      voteCount
      weightedAverage
      targetConsensus
      isMet
      votes {
        userId
        username
        reputationScore
        confidence
        reasoning
        votedAt
        voteWeight
      }
      userVote {
        confidence
        reasoning
        votedAt
      }
      userReputation {
        score
        level
        canVote
      }
    }
  }
`;

/**
 * Get compact eligibility data for badge
 */
export const GET_PROMOTION_ELIGIBILITY_BADGE = gql`
  query GetPromotionEligibilityBadge($graphId: ID!) {
    promotionEligibilityBadge(graphId: $graphId) {
      overallScore
      isEligible
      criteriaMet
      totalCriteria
      nextAction
    }
  }
`;

/**
 * Subscribe to promotion eligibility updates
 */
export const PROMOTION_ELIGIBILITY_UPDATED = gql`
  subscription PromotionEligibilityUpdated($graphId: ID!) {
    promotionEligibilityUpdated(graphId: $graphId) {
      graphId
      overallScore
      isEligible
      methodologyCompletionScore
      consensusScore
      evidenceQualityScore
      challengeResolutionScore
      lastUpdated
    }
  }
`;

/**
 * Subscribe to consensus vote updates
 */
export const CONSENSUS_VOTE_UPDATED = gql`
  subscription ConsensusVoteUpdated($graphId: ID!) {
    consensusVoteUpdated(graphId: $graphId) {
      graphId
      overallScore
      voteCount
      weightedAverage
      latestVote {
        userId
        username
        confidence
        votedAt
      }
    }
  }
`;

/**
 * Submit consensus vote mutation
 */
export const SUBMIT_CONSENSUS_VOTE = gql`
  mutation SubmitConsensusVote($input: VoteSubmissionInput!) {
    submitConsensusVote(input: $input) {
      success
      vote {
        userId
        username
        confidence
        reasoning
        votedAt
        voteWeight
      }
      updatedConsensusScore
      message
    }
  }
`;

/**
 * Update methodology step completion
 */
export const UPDATE_METHODOLOGY_STEP = gql`
  mutation UpdateMethodologyStep($graphId: ID!, $stepId: ID!, $isCompleted: Boolean!, $evidenceIds: [ID!]) {
    updateMethodologyStep(
      graphId: $graphId
      stepId: $stepId
      isCompleted: $isCompleted
      evidenceIds: $evidenceIds
    ) {
      success
      step {
        id
        isCompleted
        completionPercentage
        completedBy {
          id
          username
        }
        completedAt
      }
      overallCompletionPercentage
      message
    }
  }
`;

/**
 * Raise a challenge
 */
export const RAISE_CHALLENGE = gql`
  mutation RaiseChallenge($graphId: ID!, $description: String!) {
    raiseChallenge(graphId: $graphId, description: $description) {
      success
      challenge {
        id
        raisedBy {
          id
          username
        }
        description
        status
        raisedAt
      }
      message
    }
  }
`;

/**
 * Resolve a challenge
 */
export const RESOLVE_CHALLENGE = gql`
  mutation ResolveChallenge($challengeId: ID!, $resolution: String!) {
    resolveChallenge(challengeId: $challengeId, resolution: $resolution) {
      success
      challenge {
        id
        status
        resolvedAt
        resolution
      }
      message
    }
  }
`;
