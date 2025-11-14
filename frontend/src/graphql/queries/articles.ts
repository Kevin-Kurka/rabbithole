import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const ARTICLE_FRAGMENT = gql`
  fragment ArticleFields on Node {
    id
    title
    narrative
    weight
    props
    meta
    is_level_0
    published_at
    permissions
    author_id
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_ARTICLES = gql`
  ${ARTICLE_FRAGMENT}
  query GetArticles($graphId: ID, $published: Boolean) {
    getArticles(graphId: $graphId, published: $published) {
      ...ArticleFields
    }
  }
`;

export const GET_ARTICLE = gql`
  ${ARTICLE_FRAGMENT}
  query GetArticle($articleId: ID!) {
    getArticle(articleId: $articleId) {
      ...ArticleFields
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_ARTICLE = gql`
  ${ARTICLE_FRAGMENT}
  mutation CreateArticle($input: CreateArticleInput!) {
    createArticle(input: $input) {
      ...ArticleFields
    }
  }
`;

export const UPDATE_ARTICLE = gql`
  ${ARTICLE_FRAGMENT}
  mutation UpdateArticle($input: UpdateArticleInput!) {
    updateArticle(input: $input) {
      ...ArticleFields
    }
  }
`;

export const PUBLISH_ARTICLE = gql`
  ${ARTICLE_FRAGMENT}
  mutation PublishArticle($input: PublishArticleInput!) {
    publishArticle(input: $input) {
      ...ArticleFields
    }
  }
`;

export const DELETE_ARTICLE = gql`
  mutation DeleteArticle($articleId: ID!) {
    deleteArticle(articleId: $articleId)
  }
`;

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface Article {
  id: string;
  title: string;
  narrative: string;
  weight: number;
  props: string;
  meta?: string;
  is_level_0: boolean;
  published_at?: string;
  permissions?: string[];
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateArticleInput {
  graphId: string;
  title: string;
  narrative: string;
  referencedNodeIds?: string[];
}

export interface UpdateArticleInput {
  articleId: string;
  title?: string;
  narrative?: string;
  referencedNodeIds?: string[];
}

export interface PublishArticleInput {
  articleId: string;
}
