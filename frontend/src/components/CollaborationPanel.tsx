/**
 * CollaborationPanel Component
 *
 * Fixed right-side panel for real-time collaboration features:
 * - Active users list with avatars (colored circles with initials)
 * - Cursor positions displayed on canvas
 * - Embedded chat interface
 * - Collapsible design
 */

'use client';

import React, { useState } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import Chat from './Chat';
import { Users, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';

export interface CollaborationPanelProps {
  graphId: string;
  currentUserId?: string;
  className?: string;
}

/**
 * Get initials from username
 */
function getInitials(username: string): string {
  const parts = username.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * CollaborationPanel Component
 */
export function CollaborationPanel({
  graphId,
  currentUserId,
  className = '',
}: CollaborationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');

  const {
    activeUsers,
    sendChatMessage,
    chatMessages,
    isConnected,
  } = useCollaboration(graphId);

  // Filter out current user from active users list
  const otherUsers = activeUsers.filter((u) => u.userId !== currentUserId);

  if (!isExpanded) {
    return (
      <div
        className={`fixed right-0 top-16 bottom-0 bg-gray-900 border-l border-gray-800 shadow-xl z-40 ${className}`}
        style={{ width: '60px' }}
      >
        <div className="flex flex-col items-center py-4 space-y-4">
          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Expand collaboration panel"
          >
            <ChevronLeft className="w-6 h-6 text-gray-400" />
          </button>

          {/* Users indicator */}
          <div className="flex flex-col items-center">
            <Users className="w-6 h-6 text-gray-400" />
            {otherUsers.length > 0 && (
              <span className="mt-1 text-xs font-semibold text-blue-400">
                {otherUsers.length}
              </span>
            )}
          </div>

          {/* Chat indicator */}
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-gray-400" />
            {chatMessages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
            )}
          </div>

          {/* Connection status */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed right-0 top-16 bottom-0 bg-gray-900 border-l border-gray-800 shadow-xl z-40 flex flex-col ${className}`}
      style={{ width: '360px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Collaboration</h3>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
          title="Collapse panel"
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-950'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-850'
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({otherUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'chat'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-950'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-850'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
          {chatMessages.length > 0 && activeTab !== 'chat' && (
            <div className="absolute top-2 right-8 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'users' ? (
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {otherUsers.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                <p className="text-sm">No other users online</p>
              </div>
            ) : (
              otherUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 bg-gray-850 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.username)}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.cursor ? 'Active' : 'Idle'}
                    </p>
                  </div>

                  {/* Status indicator */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      user.cursor ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                </div>
              ))
            )}

            {/* Current user (you) */}
            {currentUserId && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2 px-1">You</p>
                <div className="flex items-center gap-3 p-3 bg-gray-850 rounded-lg">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white font-semibold text-sm">
                    {getInitials('You')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">You</p>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <Chat
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}

export default CollaborationPanel;
