import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const ACTIVITY_POST_FRAGMENT = gql`
  fragment ActivityPostFields on ActivityPost {
    id
    node_id
    author_id
    content
    mentioned_node_ids
    attachment_ids
    is_reply
    parent_post_id
    is_share
    shared_post_id
    replyCount
    shareCount
    reactionCounts
    totalReactionCount
    created_at
    updated_at
    userReactions
    author {
      id
      username
      email
    }
    node {
      id
      title
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_NODE_ACTIVITY = gql`
  ${ACTIVITY_POST_FRAGMENT}
  query GetNodeActivity($nodeId: ID!, $limit: Int, $offset: Int) {
    getNodeActivity(nodeId: $nodeId, limit: $limit, offset: $offset) {
      ...ActivityPostFields
    }
  }
`;

export const SEARCH_NODES = gql`
  query SearchNodes($query: String!, $limit: Int) {
    searchNodes(query: $query, limit: $limit) {
      id
      title
      type
      weight
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_POST = gql`
  ${ACTIVITY_POST_FRAGMENT}
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ...ActivityPostFields
    }
  }
`;

export const REPLY_TO_POST = gql`
  ${ACTIVITY_POST_FRAGMENT}
  mutation ReplyToPost($input: ReplyToPostInput!) {
    replyToPost(input: $input) {
      ...ActivityPostFields
    }
  }
`;

export const SHARE_POST = gql`
  ${ACTIVITY_POST_FRAGMENT}
  mutation SharePost($input: SharePostInput!) {
    sharePost(input: $input) {
      ...ActivityPostFields
    }
  }
`;

export const REACT_TO_POST = gql`
  mutation ReactToPost($postId: ID!, $reactionType: String!) {
    reactToPost(postId: $postId, reactionType: $reactionType)
  }
`;

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ActivityAuthor {
  id: string;
  username: string;
  email: string;
}

export interface ActivityNode {
  id: string;
  title: string;
}

export interface ActivityPost {
  id: string;
  node_id: string;
  author_id: string;
  content: string;
  mentioned_node_ids?: string[];
  attachment_ids?: string[];
  is_reply: boolean;
  parent_post_id?: string;
  is_share: boolean;
  shared_post_id?: string;
  replyCount: number;
  shareCount: number;
  reactionCounts: string; // JSON string like {"like": 5, "love": 2}
  totalReactionCount: number;
  created_at: string;
  updated_at: string;
  userReactions?: string[];
  author?: ActivityAuthor;
  node?: ActivityNode;
  replies?: ActivityPost[];
}

export interface CreatePostInput {
  nodeId: string;
  content: string;
  mentionedNodeIds?: string[];
  attachmentIds?: string[];
}

export interface ReplyToPostInput {
  parentPostId: string;
  content: string;
  mentionedNodeIds?: string[];
  attachmentIds?: string[];
}

export interface SharePostInput {
  postId: string;
  comment?: string;
}

export interface NodeSearchResult {
  id: string;
  title: string;
  type: string;
  weight: number;
}
