/**
 * Reactions Bar Component
 *
 * Interactive reactions (emojis) for sticky notes and comments
 */

'use client';

import React, { useState } from 'react';
import { Heart, ThumbsUp, Smile, Frown, Angry, Zap, Plus } from 'lucide-react';

export interface Reaction {
  type: string;
  count: number;
  userReacted: boolean;
}

export interface ReactionsBarProps {
  reactions: Record<string, number>;
  userReactions?: string[];
  onReact: (reactionType: string) => void;
  onUnreact: (reactionType: string) => void;
  compact?: boolean;
}

const REACTION_TYPES = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'laugh', icon: Smile, label: 'Laugh', color: 'text-yellow-500' },
  { type: 'wow', icon: Zap, label: 'Wow', color: 'text-purple-500' },
  { type: 'sad', icon: Frown, label: 'Sad', color: 'text-gray-500' },
  { type: 'angry', icon: Angry, label: 'Angry', color: 'text-orange-500' },
];

const ReactionsBar: React.FC<ReactionsBarProps> = ({
  reactions,
  userReactions = [],
  onReact,
  onUnreact,
  compact = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = (reactionType: string) => {
    const hasReacted = userReactions.includes(reactionType);
    if (hasReacted) {
      onUnreact(reactionType);
    } else {
      onReact(reactionType);
    }
    setShowPicker(false);
  };

  // Get only reactions that have counts > 0
  const activeReactions = REACTION_TYPES.filter(
    (rt) => (reactions[rt.type] || 0) > 0
  );

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Active Reactions */}
      {activeReactions.map((reactionType) => {
        const count = reactions[reactionType.type] || 0;
        const userReacted = userReactions.includes(reactionType.type);
        const Icon = reactionType.icon;

        return (
          <button
            key={reactionType.type}
            onClick={() => handleReactionClick(reactionType.type)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-all duration-200
              ${
                userReacted
                  ? `bg-${reactionType.color.split('-')[1]}-100 border-2 border-${reactionType.color.split('-')[1]}-400`
                  : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
              }
            `}
            title={`${reactionType.label} (${count})`}
          >
            <Icon
              className={`w-3 h-3 ${userReacted ? reactionType.color : 'text-gray-600'}`}
            />
            {!compact && <span className="font-medium text-gray-700">{count}</span>}
          </button>
        );
      })}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          onBlur={() => setTimeout(() => setShowPicker(false), 200)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-colors"
          title="Add reaction"
        >
          <Plus className="w-3 h-3 text-gray-600" />
        </button>

        {/* Reaction Picker */}
        {showPicker && (
          <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-xl p-2 flex gap-1 z-50">
            {REACTION_TYPES.map((reactionType) => {
              const Icon = reactionType.icon;
              const userReacted = userReactions.includes(reactionType.type);

              return (
                <button
                  key={reactionType.type}
                  onClick={() => handleReactionClick(reactionType.type)}
                  className={`
                    p-2 rounded-lg transition-all
                    ${
                      userReacted
                        ? 'bg-blue-100 scale-110'
                        : 'hover:bg-gray-100 hover:scale-110'
                    }
                  `}
                  title={reactionType.label}
                >
                  <Icon className={`w-4 h-4 ${reactionType.color}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactionsBar;
