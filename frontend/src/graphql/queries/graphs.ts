/**
 * GraphQL Queries for Graphs
 *
 * Centralized GraphQL queries, mutations, and subscriptions
 * for graph-related operations.
 */

import { gql } from '@apollo/client';

/**
 * Fetch a graph by ID with all nodes and edges
 */
export const GRAPH_QUERY = gql`
  query GetGraph($id: String!) {
    graph(id: $id) {
      id
      name
      description
      methodology
      level
      privacy
      created_at
      updated_at
      nodes {
        id
        weight
        props
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
        weight
        props
        is_level_0
        created_at
        updated_at
      }
    }
  }
`;

/**
 * Fetch multiple graphs by IDs
 */
export const GRAPHS_QUERY = gql`
  query GetGraphs($ids: [String!]!) {
    graphs(ids: $ids) {
      id
      name
      description
      methodology
      nodes {
        id
        weight
        props
        level
      }
      edges {
        id
        from {
          id
        }
        to {
          id
        }
        weight
        props
        level
      }
    }
  }
`;

/**
 * Create a new node
 */
export const CREATE_NODE_MUTATION = gql`
  mutation CreateNode($input: NodeInput!) {
    createNode(input: $input) {
      id
      weight
      props
      level
      createdAt
      updatedAt
    }
  }
`;

/**
 * Update an existing node
 */
export const UPDATE_NODE_MUTATION = gql`
  mutation UpdateNode($id: ID!, $props: String!, $weight: Float) {
    updateNode(id: $id, props: $props, weight: $weight) {
      id
      props
      weight
      level
      updatedAt
    }
  }
`;

/**
 * Delete a node
 */
export const DELETE_NODE_MUTATION = gql`
  mutation DeleteNode($id: ID!) {
    deleteNode(id: $id)
  }
`;

/**
 * Create a new edge
 */
export const CREATE_EDGE_MUTATION = gql`
  mutation CreateEdge($input: EdgeInput!) {
    createEdge(input: $input) {
      id
      from {
        id
      }
      to {
        id
      }
      weight
      props
      level
      createdAt
      updatedAt
    }
  }
`;

/**
 * Update an existing edge
 */
export const UPDATE_EDGE_MUTATION = gql`
  mutation UpdateEdge($id: ID!, $props: String!, $weight: Float) {
    updateEdge(id: $id, props: $props, weight: $weight) {
      id
      props
      weight
      level
      updatedAt
    }
  }
`;

/**
 * Delete an edge
 */
export const DELETE_EDGE_MUTATION = gql`
  mutation DeleteEdge($id: ID!) {
    deleteEdge(id: $id)
  }
`;

/**
 * Bulk operations
 */
export const CREATE_NODES_MUTATION = gql`
  mutation CreateNodes($inputs: [NodeInput!]!) {
    createNodes(inputs: $inputs) {
      id
      weight
      props
      level
    }
  }
`;

export const DELETE_NODES_MUTATION = gql`
  mutation DeleteNodes($ids: [ID!]!) {
    deleteNodes(ids: $ids)
  }
`;

/**
 * Real-time subscriptions
 */
export const NODE_UPDATED_SUBSCRIPTION = gql`
  subscription NodeUpdated($graphId: String!) {
    nodeUpdated(graphId: $graphId) {
      id
      weight
      props
      level
      updatedAt
    }
  }
`;

export const NODE_CREATED_SUBSCRIPTION = gql`
  subscription NodeCreated($graphId: String!) {
    nodeCreated(graphId: $graphId) {
      id
      weight
      props
      level
      createdAt
    }
  }
`;

export const NODE_DELETED_SUBSCRIPTION = gql`
  subscription NodeDeleted($graphId: String!) {
    nodeDeleted(graphId: $graphId) {
      id
    }
  }
`;

export const EDGE_UPDATED_SUBSCRIPTION = gql`
  subscription EdgeUpdated($graphId: String!) {
    edgeUpdated(graphId: $graphId) {
      id
      from {
        id
      }
      to {
        id
      }
      weight
      props
      level
      updatedAt
    }
  }
`;

export const EDGE_CREATED_SUBSCRIPTION = gql`
  subscription EdgeCreated($graphId: String!) {
    edgeCreated(graphId: $graphId) {
      id
      from {
        id
      }
      to {
        id
      }
      weight
      props
      level
      createdAt
    }
  }
`;

export const EDGE_DELETED_SUBSCRIPTION = gql`
  subscription EdgeDeleted($graphId: String!) {
    edgeDeleted(graphId: $graphId) {
      id
    }
  }
`;
