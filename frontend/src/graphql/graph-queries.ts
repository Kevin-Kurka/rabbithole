import { gql } from '@apollo/client';

/**
 * GraphQL queries and mutations for Graph operations
 */

export const GET_GRAPHS = gql`
  query GetGraphs {
    graphs {
      id
      name
      description
      level
      methodology
      privacy
      created_at
      updated_at
    }
  }
`;

export const GET_GRAPH = gql`
  query GetGraph($id: String!) {
    graph(id: $id) {
      id
      name
      description
      level
      methodology
      privacy
      created_at
      updated_at
      nodes {
        id
        props
        weight
        is_level_0
        created_at
        updated_at
      }
      edges {
        id
        from {
          id
        }
        to {
          id
        }
        props
        weight
        is_level_0
        created_at
        updated_at
      }
    }
  }
`;

export const CREATE_GRAPH = gql`
  mutation CreateGraph($input: GraphInput!) {
    createGraph(input: $input) {
      id
      name
      description
      level
      methodology
      privacy
    }
  }
`;
