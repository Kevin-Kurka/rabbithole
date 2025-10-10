/**
 * CollaborationPanel Stories
 *
 * Storybook stories for the CollaborationPanel component
 * demonstrating different states and configurations.
 */

import React from 'react';
import CollaborationPanel from './CollaborationPanel';

export default {
  title: 'Collaboration/CollaborationPanel',
  component: CollaborationPanel,
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Default state with mock data
 */
export const Default = () => (
  <div style={{ height: '100vh', position: 'relative', backgroundColor: '#1a1a1a' }}>
    <CollaborationPanel
      graphId="example-graph-123"
      currentUserId="user-1"
    />
  </div>
);

/**
 * No users online
 */
export const NoUsers = () => (
  <div style={{ height: '100vh', position: 'relative', backgroundColor: '#1a1a1a' }}>
    <CollaborationPanel
      graphId="empty-graph"
      currentUserId="user-1"
    />
  </div>
);

/**
 * Multiple users
 * Note: This requires the useCollaboration hook to return mock users
 */
export const MultipleUsers = () => (
  <div style={{ height: '100vh', position: 'relative', backgroundColor: '#1a1a1a' }}>
    <CollaborationPanel
      graphId="busy-graph"
      currentUserId="user-1"
    />
  </div>
);

/**
 * Chat tab active
 */
export const ChatActive = () => (
  <div style={{ height: '100vh', position: 'relative', backgroundColor: '#1a1a1a' }}>
    <CollaborationPanel
      graphId="example-graph-123"
      currentUserId="user-1"
    />
  </div>
);
