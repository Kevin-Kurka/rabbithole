import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const FORMAL_INQUIRY_FRAGMENT = gql`
  fragment FormalInquiryFields on FormalInquiry {
    id
    target_node_id
    target_edge_id
    user_id
    title
    description
    content

    # Evidence-based credibility (AI-judged, vote-independent)
    confidence_score
    max_allowed_score
    weakest_node_credibility
    ai_determination
    ai_rationale
    evaluated_at
    evaluated_by

    # Community opinion (voting, does NOT affect credibility)
    agree_count
    disagree_count
    total_votes
    agree_percentage
    disagree_percentage

    status
    created_at
    updated_at
    resolved_at
  }
`;

export const INQUIRY_VOTE_FRAGMENT = gql`
  fragment InquiryVoteFields on InquiryVote {
    id
    inquiry_id
    user_id
    vote_type
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_FORMAL_INQUIRIES = gql`
  ${FORMAL_INQUIRY_FRAGMENT}
  query GetFormalInquiries($nodeId: ID, $edgeId: ID, $status: String) {
    getFormalInquiries(nodeId: $nodeId, edgeId: $edgeId, status: $status) {
      ...FormalInquiryFields
    }
  }
`;

export const GET_FORMAL_INQUIRY = gql`
  ${FORMAL_INQUIRY_FRAGMENT}
  query GetFormalInquiry($inquiryId: ID!) {
    getFormalInquiry(inquiryId: $inquiryId) {
      ...FormalInquiryFields
    }
  }
`;

export const GET_USER_VOTE = gql`
  ${INQUIRY_VOTE_FRAGMENT}
  query GetUserVote($inquiryId: ID!) {
    getUserVote(inquiryId: $inquiryId) {
      ...InquiryVoteFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_FORMAL_INQUIRY = gql`
  ${FORMAL_INQUIRY_FRAGMENT}
  mutation CreateFormalInquiry($input: CreateFormalInquiryInput!) {
    createFormalInquiry(input: $input) {
      ...FormalInquiryFields
    }
  }
`;

export const CAST_VOTE = gql`
  ${INQUIRY_VOTE_FRAGMENT}
  mutation CastVote($input: CastVoteInput!) {
    castVote(input: $input) {
      ...InquiryVoteFields
    }
  }
`;

export const REMOVE_VOTE = gql`
  mutation RemoveVote($inquiryId: ID!) {
    removeVote(inquiryId: $inquiryId)
  }
`;

export const UPDATE_CONFIDENCE_SCORE = gql`
  ${FORMAL_INQUIRY_FRAGMENT}
  mutation UpdateConfidenceScore($input: UpdateConfidenceScoreInput!) {
    updateConfidenceScore(input: $input) {
      ...FormalInquiryFields
    }
  }
`;

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface FormalInquiry {
  id: string;
  target_node_id?: string;
  target_edge_id?: string;
  user_id: string;
  title: string;
  description?: string;
  content: string;

  // Evidence-based credibility
  confidence_score?: number;
  max_allowed_score?: number;
  weakest_node_credibility?: number;
  ai_determination?: string;
  ai_rationale?: string;
  evaluated_at?: string;
  evaluated_by?: string;

  // Community opinion
  agree_count?: number;
  disagree_count?: number;
  total_votes?: number;
  agree_percentage?: number;
  disagree_percentage?: number;

  status: 'open' | 'evaluating' | 'evaluated' | 'resolved' | 'withdrawn';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface InquiryVote {
  id: string;
  inquiry_id: string;
  user_id: string;
  vote_type: 'agree' | 'disagree';
  created_at: string;
  updated_at: string;
}

export interface CreateFormalInquiryInput {
  target_node_id?: string;
  target_edge_id?: string;
  title: string;
  description?: string;
  content: string;
  related_node_ids?: string[];
}

export interface CastVoteInput {
  inquiry_id: string;
  vote_type: 'agree' | 'disagree';
}

export interface UpdateConfidenceScoreInput {
  inquiry_id: string;
  confidence_score: number;
  ai_determination: string;
  ai_rationale: string;
}
