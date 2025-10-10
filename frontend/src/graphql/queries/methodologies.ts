/**
 * GraphQL Queries for Methodologies
 *
 * Centralized GraphQL queries for methodology-related operations
 */

import { gql } from '@apollo/client';

/**
 * Fetch all available methodologies
 */
export const METHODOLOGIES_QUERY = gql`
  query Methodologies {
    methodologies {
      id
      name
      description
      category
      steps
      benefits
      examples
      isDefault
    }
  }
`;

/**
 * Fetch a single methodology by ID
 */
export const METHODOLOGY_QUERY = gql`
  query Methodology($id: ID!) {
    methodology(id: $id) {
      id
      name
      description
      category
      steps
      benefits
      examples
      isDefault
      createdAt
      updatedAt
      createdBy {
        id
        name
      }
    }
  }
`;

/**
 * Create a custom methodology
 */
export const CREATE_METHODOLOGY_MUTATION = gql`
  mutation CreateMethodology($input: MethodologyInput!) {
    createMethodology(input: $input) {
      id
      name
      description
      category
      steps
      benefits
      examples
      isDefault
    }
  }
`;

/**
 * Update an existing methodology
 */
export const UPDATE_METHODOLOGY_MUTATION = gql`
  mutation UpdateMethodology($id: ID!, $input: MethodologyInput!) {
    updateMethodology(id: $id, input: $input) {
      id
      name
      description
      category
      steps
      benefits
      examples
      isDefault
    }
  }
`;

/**
 * Delete a methodology
 */
export const DELETE_METHODOLOGY_MUTATION = gql`
  mutation DeleteMethodology($id: ID!) {
    deleteMethodology(id: $id) {
      success
      message
    }
  }
`;

/**
 * Fetch methodologies by category
 */
export const METHODOLOGIES_BY_CATEGORY_QUERY = gql`
  query MethodologiesByCategory($category: String!) {
    methodologiesByCategory(category: $category) {
      id
      name
      description
      category
      steps
      benefits
      examples
      isDefault
    }
  }
`;

/**
 * Search methodologies
 */
export const SEARCH_METHODOLOGIES_QUERY = gql`
  query SearchMethodologies($query: String!) {
    searchMethodologies(query: $query) {
      id
      name
      description
      category
      isDefault
    }
  }
`;

/**
 * Fetch user's favorite methodologies
 */
export const FAVORITE_METHODOLOGIES_QUERY = gql`
  query FavoriteMethodologies {
    favoriteMethodologies {
      id
      name
      description
      category
      isDefault
    }
  }
`;

/**
 * Toggle methodology favorite status
 */
export const TOGGLE_METHODOLOGY_FAVORITE_MUTATION = gql`
  mutation ToggleMethodologyFavorite($methodologyId: ID!) {
    toggleMethodologyFavorite(methodologyId: $methodologyId) {
      success
      isFavorite
    }
  }
`;
