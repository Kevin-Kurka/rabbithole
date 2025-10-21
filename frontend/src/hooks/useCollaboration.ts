/**
 * useCollaboration Hook
 *
 * Custom React hook for managing real-time collaboration features:
 * - User presence tracking
 * - Cursor position updates (throttled)
 * - Chat messaging
 * - Auto-join on mount, auto-leave on unmount
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import {
  USER_JOINED_SUBSCRIPTION,
  USER_LEFT_SUBSCRIPTION,
  CURSOR_MOVED_SUBSCRIPTION,
  CHAT_MESSAGE_SUBSCRIPTION,
  SEND_CHAT_MESSAGE_MUTATION,
  UPDATE_PRESENCE_MUTATION,
} from '@/graphql/queries/collaboration';
import {
  ActiveUser,
  ChatMessage,
  PresenceUpdate,
  CursorPosition,
} from '@/types/collaboration';

/**
 * Hook return type
 */
export interface UseCollaborationResult {
  activeUsers: ActiveUser[];
  sendChatMessage: (message: string) => Promise<void>;
  chatMessages: ChatMessage[];
  updateCursor: (x: number, y: number) => void;
  isConnected: boolean;
}

/**
 * Maximum chat messages to keep in memory
 */
const MAX_CHAT_MESSAGES = 100;

/**
 * Cursor update throttle (max 10 updates per second)
 */
const CURSOR_THROTTLE_MS = 100;

/**
 * Generate a consistent color from a user ID
 */
function getUserColor(userId: string): string {
  // Hash the userId to a number
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to hue (0-360)
  const hue = Math.abs(hash % 360);

  // Return HSL color with good saturation and lightness
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * useCollaboration Hook
 */
export function useCollaboration(graphId: string | undefined): UseCollaborationResult {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for throttling cursor updates
  const lastCursorUpdate = useRef<number>(0);
  const pendingCursorUpdate = useRef<CursorPosition | null>(null);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  // Validate graphId - skip operations if empty or invalid
  const isValidGraphId = Boolean(graphId && graphId.trim() !== '');

  // GraphQL Mutations - MUST be called unconditionally (Rules of Hooks)
  const [updatePresenceMutation] = useMutation(UPDATE_PRESENCE_MUTATION);
  const [sendChatMessageMutation] = useMutation(SEND_CHAT_MESSAGE_MUTATION);

  // Subscribe to user joined events
  useSubscription(USER_JOINED_SUBSCRIPTION, {
    variables: { graphId },
    skip: !isValidGraphId,
    onData: ({ data }) => {
      if (data?.data?.userJoined) {
        const presence: PresenceUpdate = data.data.userJoined;

        setActiveUsers((users) => {
          // Check if user already exists
          const existingUser = users.find((u) => u.userId === presence.userId);

          if (existingUser) {
            // Update existing user
            return users.map((u) =>
              u.userId === presence.userId
                ? { ...u, lastSeen: Date.now() }
                : u
            );
          }

          // Add new user
          return [
            ...users,
            {
              userId: presence.userId,
              username: presence.username,
              cursor: null,
              color: getUserColor(presence.userId),
              lastSeen: Date.now(),
            },
          ];
        });
      }
    },
  });

  // Subscribe to user left events
  useSubscription(USER_LEFT_SUBSCRIPTION, {
    variables: { graphId },
    skip: !isValidGraphId,
    onData: ({ data }) => {
      if (data?.data?.userLeft) {
        const presence: PresenceUpdate = data.data.userLeft;

        setActiveUsers((users) =>
          users.filter((u) => u.userId !== presence.userId)
        );
      }
    },
  });

  // Subscribe to cursor moved events
  useSubscription(CURSOR_MOVED_SUBSCRIPTION, {
    variables: { graphId },
    skip: !isValidGraphId,
    onData: ({ data }) => {
      if (data?.data?.cursorMoved) {
        const presence: PresenceUpdate = data.data.cursorMoved;

        setActiveUsers((users) =>
          users.map((u) =>
            u.userId === presence.userId
              ? {
                  ...u,
                  cursor: presence.cursor || null,
                  lastSeen: Date.now(),
                }
              : u
          )
        );
      }
    },
  });

  // Subscribe to chat messages
  useSubscription(CHAT_MESSAGE_SUBSCRIPTION, {
    variables: { graphId },
    skip: !isValidGraphId,
    onData: ({ data }) => {
      if (data?.data?.chatMessage) {
        const message: ChatMessage = data.data.chatMessage;

        setChatMessages((messages) => {
          const newMessages = [...messages, message];

          // Limit to MAX_CHAT_MESSAGES
          if (newMessages.length > MAX_CHAT_MESSAGES) {
            return newMessages.slice(-MAX_CHAT_MESSAGES);
          }

          return newMessages;
        });
      }
    },
  });

  // Send chat message
  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!isValidGraphId || !message.trim()) return;

      try {
        await sendChatMessageMutation({
          variables: {
            graphId: graphId!,
            message: message.trim(),
          },
        });
      } catch (error) {
        console.error('Failed to send chat message:', error);
        throw error;
      }
    },
    [graphId, isValidGraphId, sendChatMessageMutation]
  );

  // Update cursor position (throttled)
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (!isValidGraphId) return;

      const now = Date.now();
      pendingCursorUpdate.current = { x, y };

      // If enough time has passed, send immediately
      if (now - lastCursorUpdate.current >= CURSOR_THROTTLE_MS) {
        lastCursorUpdate.current = now;

        updatePresenceMutation({
          variables: {
            graphId: graphId!,
            cursor: { x, y },
          },
        }).catch((error) => {
          console.error('Failed to update cursor:', error);
        });

        pendingCursorUpdate.current = null;
      } else if (!throttleTimer.current) {
        // Schedule a throttled update
        throttleTimer.current = setTimeout(() => {
          if (pendingCursorUpdate.current) {
            lastCursorUpdate.current = Date.now();

            updatePresenceMutation({
              variables: {
                graphId: graphId!,
                cursor: pendingCursorUpdate.current,
              },
            }).catch((error) => {
              console.error('Failed to update cursor:', error);
            });

            pendingCursorUpdate.current = null;
          }

          throttleTimer.current = null;
        }, CURSOR_THROTTLE_MS);
      }
    },
    [graphId, isValidGraphId, updatePresenceMutation]
  );

  // Join graph on mount
  useEffect(() => {
    if (!isValidGraphId) return;

    const joinGraph = async () => {
      try {
        await updatePresenceMutation({
          variables: {
            graphId: graphId!,
            cursor: null,
          },
        });

        setIsConnected(true);
      } catch (error) {
        console.error('Failed to join graph:', error);
        setIsConnected(false);
      }
    };

    joinGraph();

    // Leave graph on unmount
    return () => {
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
      }

      // Send leave signal (cursor: null signals leaving)
      updatePresenceMutation({
        variables: {
          graphId: graphId!,
          cursor: null,
        },
      }).catch((error) => {
        console.error('Failed to leave graph:', error);
      });
    };
  }, [graphId, isValidGraphId, updatePresenceMutation]);

  return {
    activeUsers,
    sendChatMessage,
    chatMessages,
    updateCursor,
    isConnected,
  };
}
