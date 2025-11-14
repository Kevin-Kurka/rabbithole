/**
 * Threaded Replies Component
 *
 * Displays nested threaded replies on sticky notes
 */

'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, X, CornerDownRight } from 'lucide-react';
import ReactionsBar from './ReactionsBar';

export interface Reply {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
  reactionCounts: Record<string, number>;
  userReactions?: string[];
  replyCount?: number;
}

export interface ThreadedRepliesProps {
  replies: Reply[];
  onReply: (content: string, parentId?: string) => void;
  onReact: (replyId: string, reactionType: string) => void;
  onUnreact: (replyId: string, reactionType: string) => void;
  maxDepth?: number;
  currentDepth?: number;
}

const ThreadedReplies: React.FC<ThreadedRepliesProps> = ({
  replies,
  onReply,
  onReact,
  onUnreact,
  maxDepth = 3,
  currentDepth = 0,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = (parentId?: string) => {
    if (!replyContent.trim()) return;

    onReply(replyContent.trim(), parentId);
    setReplyContent('');
    setReplyingTo(null);
  };

  const canNest = currentDepth < maxDepth;

  return (
    <div className="space-y-2">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className={`
            ${currentDepth > 0 ? 'ml-6 pl-3 border-l-2 border-gray-300' : ''}
          `}
        >
          {/* Reply Content */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {currentDepth > 0 && (
                  <CornerDownRight className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-xs font-semibold text-gray-700">
                  {reply.authorName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(reply.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="text-sm text-gray-800 mb-2 break-words whitespace-pre-wrap">
              {reply.content}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Reactions */}
              <ReactionsBar
                reactions={reply.reactionCounts}
                userReactions={reply.userReactions}
                onReact={(type) => onReact(reply.id, type)}
                onUnreact={(type) => onUnreact(reply.id, type)}
                compact
              />

              {/* Reply Button */}
              {canNest && (
                <button
                  onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </div>

          {/* Reply Input */}
          {replyingTo === reply.id && (
            <div className="mt-2 ml-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitReply(reply.id);
                    } else if (e.key === 'Escape') {
                      setReplyingTo(null);
                      setReplyContent('');
                    }
                  }}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => handleSubmitReply(reply.id)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  disabled={!replyContent.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {reply.replyCount && reply.replyCount > 0 && canNest && (
            <div className="mt-2">
              {/* TODO: Load and render nested replies */}
              <button className="text-xs text-gray-500 hover:text-gray-700 ml-6">
                Load {reply.replyCount} {reply.replyCount === 1 ? 'reply' : 'replies'}...
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ThreadedReplies;
