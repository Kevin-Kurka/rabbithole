import { gql } from '@apollo/client';

// ============================================================================
// Authentication Mutations
// ============================================================================

export const REGISTER_MUTATION = gql`
  mutation Register($input: UserInput!) {
    register(input: $input) {
      user {
        id
        username
        email
      }
      accessToken
      refreshToken
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: UserInput!) {
    login(input: $input) {
      user {
        id
        username
        email
      }
      accessToken
      refreshToken
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      reputation
      reputationTier
    }
  }
`;

// ============================================================================
// Evidence & AI Validation
// ============================================================================

export const VALIDATE_EVIDENCE_MUTATION = gql`
  mutation ValidateEvidence($input: EvidenceValidationInput!) {
    validateEvidence(input: $input) {
      isValid
      freCompliance {
        fre401_relevance {
          passed
          score
          explanation
        }
        fre403_prejudice {
          passed
          score
          explanation
        }
        fre602_personal_knowledge {
          passed
          score
          explanation
        }
        fre702_expert_testimony {
          passed
          needsExpert
          explanation
        }
        fre801_hearsay {
          passed
          score
          explanation
        }
        fre901_authentication {
          passed
          score
          explanation
        }
        fre1002_best_evidence {
          passed
          score
          explanation
        }
      }
      overallScore
      suggestions
      requiredImprovements
    }
  }
`;

export const CREATE_NODE_WITH_EVIDENCE = gql`
  mutation CreateNodeWithEvidence($nodeInput: NodeInput!, $evidenceInput: EvidenceInput!) {
    createNode(input: $nodeInput) {
      id
      props
      weight
    }
  }
`;

// ============================================================================
// GraphRAG Queries
// ============================================================================

export const ASK_GRAPH_RAG = gql`
  mutation AskGraphRAG($input: GraphRAGInput!) {
    askGraphRAG(input: $input) {
      response
      citations {
        id
        type
        text
      }
      subgraph {
        nodes {
          id
          props
          weight
          typeName
        }
        edges {
          id
          sourceNodeId
          targetNodeId
          typeName
        }
        anchorNodeIds
      }
      metrics {
        vectorSearchTimeMs
        graphTraversalTimeMs
        promptGenerationTimeMs
        llmResponseTimeMs
        totalTimeMs
      }
      suggestions
    }
  }
`;

export const FIND_SIMILAR_NODES = gql`
  query FindSimilarNodes($input: SimilarNodesInput!) {
    findSimilarNodes(input: $input) {
      id
      props
      weight
      typeName
      similarity
    }
  }
`;

// ============================================================================
// Deduplication
// ============================================================================

export const CHECK_DUPLICATE = gql`
  query CheckDuplicate($content: String!, $contentType: String!, $graphId: ID) {
    checkDuplicate(content: $content, contentType: $contentType, graphId: $graphId) {
      isDuplicate
      duplicateType
      canonicalNodeId
      similarityScore
      duplicateCandidates {
        nodeId
        similarity
        matchType
        props
        weight
      }
      recommendation
      reasoning
    }
  }
`;

export const MERGE_DUPLICATES = gql`
  mutation MergeDuplicates(
    $duplicateNodeIds: [ID!]!
    $canonicalNodeId: ID!
    $strategy: MergeStrategyInput!
  ) {
    mergeDuplicates(
      duplicateNodeIds: $duplicateNodeIds
      canonicalNodeId: $canonicalNodeId
      strategy: $strategy
    ) {
      success
      mergedNodeId
    }
  }
`;

// ============================================================================
// Promotion Eligibility
// ============================================================================

export const GET_PROMOTION_ELIGIBILITY = gql`
  query GetPromotionEligibility($nodeId: ID!) {
    promotionEligibility(nodeId: $nodeId) {
      nodeId
      criteria {
        methodologyCompletion
        communityConsensus
        evidenceQuality
        openChallenges
      }
      overallScore
      eligible
      blockers
      recommendations
      lastEvaluated
    }
  }
`;

export const PROMOTE_TO_LEVEL_0 = gql`
  mutation PromoteToLevel0(
    $nodeId: ID!
    $promotionType: PromotionType!
    $curatorNotes: String
  ) {
    promoteToLevel0(
      nodeId: $nodeId
      promotionType: $promotionType
      curatorNotes: $curatorNotes
    ) {
      success
      message
    }
  }
`;

export const GET_ELIGIBLE_NODES = gql`
  query GetEligibleNodes($limit: Int) {
    eligibleNodes(limit: $limit) {
      nodeId
      criteria {
        methodologyCompletion
        communityConsensus
        evidenceQuality
        openChallenges
      }
      overallScore
      eligible
    }
  }
`;

// ============================================================================
// Challenge Voting
// ============================================================================

export const VOTE_ON_CHALLENGE = gql`
  mutation VoteOnChallenge(
    $challengeId: ID!
    $voteType: VoteType!
    $confidence: Float
  ) {
    voteOnChallenge(
      challengeId: $challengeId
      voteType: $voteType
      confidence: $confidence
    ) {
      id
      status
      consensus
      voteCount
    }
  }
`;

export const GET_CHALLENGE_VOTES = gql`
  query GetChallengeVotes($challengeId: ID!) {
    challenge(id: $challengeId) {
      id
      votes {
        voterId
        voteType
        confidence
        voteWeight
        voter {
          username
          reputation
        }
      }
      consensus
      status
    }
  }
`;

// ============================================================================
// Theory Overlay
// ============================================================================

export const GET_GRAPH_WITH_LAYERS = gql`
  query GetGraphWithLayers($graphIds: [ID!]!, $includeLevel0: Boolean!) {
    graphsWithLayers(graphIds: $graphIds, includeLevel0: $includeLevel0) {
      graphId
      isLevel0
      nodes {
        id
        nodeTypeId
        props
        meta
        weight
        isLevel0
        graphId
      }
      edges {
        id
        edgeTypeId
        sourceNodeId
        targetNodeId
        props
        weight
        isLevel0
        graphId
      }
    }
  }
`;

export const GET_USER_THEORIES = gql`
  query GetUserTheories($userId: ID!) {
    userGraphs(userId: $userId) {
      id
      name
      description
      privacy
      isPublic
      createdAt
      updatedAt
    }
  }
`;

// ============================================================================
// Promotion Ledger
// ============================================================================

export const GET_PROMOTION_EVENTS = gql`
  query GetPromotionEvents($limit: Int, $offset: Int, $promotionType: PromotionType) {
    promotionEvents(limit: $limit, offset: $offset, promotionType: $promotionType) {
      id
      nodeId
      promotionType
      finalWeight
      methodologyCompletion
      communityConsensus
      evidenceQuality
      curatorId
      curatorNotes
      promotedAt
      node {
        id
        props
      }
      curator {
        username
      }
    }
  }
`;
