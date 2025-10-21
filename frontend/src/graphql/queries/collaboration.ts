/**
 * GraphQL Operations for Real-Time Collaboration
 *
 * Subscriptions and mutations for user presence, cursor tracking,
 * and chat messaging in collaborative graph editing.
 */

import { gql } from '@apollo/client';

/**
 * Subscription: User joined the graph
 */
export const USER_JOINED_SUBSCRIPTION = gql`
  subscription OnUserJoined($graphId: String!) {
    userJoined(graphId: $graphId) {
      userId
      username
      action
    }
  }
`;

/**
 * Subscription: User left the graph
 */
export const USER_LEFT_SUBSCRIPTION = gql`
  subscription OnUserLeft($graphId: String!) {
    userLeft(graphId: $graphId) {
      userId
      username
      action
    }
  }
`;

/**
 * Subscription: Cursor position moved
 */
export const CURSOR_MOVED_SUBSCRIPTION = gql`
  subscription OnCursorMoved($graphId: String!) {
    cursorMoved(graphId: $graphId) {
      userId
      username
      cursor {
        x
        y
      }
    }
  }
`;

/**
 * Subscription: Chat message received
 */
export const CHAT_MESSAGE_SUBSCRIPTION = gql`
  subscription OnChatMessage($graphId: String!) {
    chatMessage(graphId: $graphId) {
      id
      userId
      username
      message
      timestamp
    }
  }
`;

/**
 * Mutation: Send chat message
 */
export const SEND_CHAT_MESSAGE_MUTATION = gql`
  mutation SendChatMessage($graphId: String!, $message: String!) {
    sendChatMessage(graphId: $graphId, message: $message) {
      id
      message
      timestamp
    }
  }
`;

/**
 * Mutation: Update presence (join/leave/cursor)
 */
export const UPDATE_PRESENCE_MUTATION = gql`
  mutation UpdatePresence($graphId: String!, $cursor: CursorInput) {
    updatePresence(graphId: $graphId, cursor: $cursor) {
      success
    }
  }
`;

/**
 * Query: Get active users for a graph
 */
export const ACTIVE_USERS_QUERY = gql`
  query GetActiveUsers($graphId: String!) {
    activeUsers(graphId: $graphId) {
      userId
      username
      cursor {
        x
        y
      }
      lastSeen
    }
  }
`;
