/**
 * Sticky Note Component
 *
 * Renders ActivityPosts as sticky notes on the canvas
 */

'use client';

import React, { useState } from 'react';
import { NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  Heart,
  Smile,
  ThumbsUp,
  X,
  MoreVertical,
  Reply,
} from 'lucide-react';

export interface StickyNoteData {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
  replyCount: number;
  reactionCounts: Record<string, number>;
  style: {
    color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
    size: 'small' | 'medium' | 'large';
  };
  nodeId: string;
}

const STICKY_NOTE_COLORS = {
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  blue: 'bg-blue-100 border-blue-300 text-blue-900',
  green: 'bg-green-100 border-green-300 text-green-900',
  pink: 'bg-pink-100 border-pink-300 text-pink-900',
  orange: 'bg-orange-100 border-orange-300 text-orange-900',
};

const STICKY_NOTE_SIZES = {
  small: 'w-40 min-h-32',
  medium: 'w-56 min-h-40',
  large: 'w-72 min-h-48',
};

const REACTION_ICONS: Record<string, React.ReactNode> = {
  like: <ThumbsUp className="w-3 h-3" />,
  love: <Heart className="w-3 h-3" />,
  laugh: <Smile className="w-3 h-3" />,
};

const StickyNote: React.FC<NodeProps<StickyNoteData>> = ({ data, selected }) => {
  const [showActions, setShowActions] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const colorClass = STICKY_NOTE_COLORS[data.style.color] || STICKY_NOTE_COLORS.yellow;
  const sizeClass = STICKY_NOTE_SIZES[data.style.size] || STICKY_NOTE_SIZES.medium;

  // Calculate total reactions
  const totalReactions = Object.values(data.reactionCounts || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div
      className={`
        ${colorClass} ${sizeClass}
        border-2 rounded-lg shadow-lg p-3
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transition-all duration-200
        hover:shadow-xl
        relative
        cursor-move
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        // Sticky note tape effect at top
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.05) 10px, transparent 10px)`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-xs font-semibold opacity-70">{data.authorName}</div>
          <div className="text-xs opacity-50">
            {new Date(data.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="flex items-center gap-1">
            <button
              className="p-1 hover:bg-black/10 rounded transition-colors"
              onClick={() => {/* TODO: Handle reply */}}
            >
              <Reply className="w-3 h-3" />
            </button>
            <button
              className="p-1 hover:bg-black/10 rounded transition-colors"
              onClick={() => {/* TODO: Handle options */}}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="text-sm leading-relaxed mb-3 break-words whitespace-pre-wrap">
        {data.content}
      </div>

      {/* Footer - Reactions and Replies */}
      <div className="flex items-center gap-3 text-xs opacity-70">
        {/* Reactions */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center -space-x-1">
              {Object.entries(data.reactionCounts || {}).map(([type, count]) => {
                if (count > 0 && REACTION_ICONS[type]) {
                  return (
                    <div
                      key={type}
                      className="bg-white rounded-full p-0.5 border border-current"
                      title={`${count} ${type}`}
                    >
                      {REACTION_ICONS[type]}
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <span className="font-medium">{totalReactions}</span>
          </div>
        )}

        {/* Replies Count */}
        {data.replyCount > 0 && (
          <button
            className="flex items-center gap-1 hover:underline"
            onClick={() => setShowReplies(!showReplies)}
          >
            <MessageSquare className="w-3 h-3" />
            <span>{data.replyCount}</span>
          </button>
        )}
      </div>

      {/* Tape effect shadow */}
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/40 rounded-sm"
        style={{ filter: 'blur(1px)' }}
      />
    </div>
  );
};

export default StickyNote;
