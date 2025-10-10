/**
 * Collaboration Type Definitions
 *
 * Types for real-time collaboration features including
 * presence, cursor tracking, and chat messaging.
 */

/**
 * Cursor position on the canvas
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Cursor input for mutations
 */
export interface CursorInput {
  x: number;
  y: number;
}

/**
 * User presence update
 */
export interface PresenceUpdate {
  userId: string;
  username: string;
  action?: 'joined' | 'left' | 'update';
  cursor?: CursorPosition | null;
  lastSeen?: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

/**
 * Active user in the graph
 */
export interface ActiveUser {
  userId: string;
  username: string;
  cursor: CursorPosition | null;
  color: string; // Generated color for this user
  lastSeen: number;
}

/**
 * Collaboration state
 */
export interface CollaborationState {
  activeUsers: ActiveUser[];
  chatMessages: ChatMessage[];
  isConnected: boolean;
}
