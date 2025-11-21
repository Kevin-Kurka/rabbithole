'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  Heart,
  ThumbsUp,
  X,
  MoreVertical,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface StickyNoteData {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  nodeId: string;
  color?: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  reactions?: Record<string, number>;
  replyCount?: number;
  onReply?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
}

const STICKY_NOTE_COLORS = {
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  blue: 'bg-blue-100 border-blue-300 text-blue-900',
  green: 'bg-green-100 border-green-300 text-green-900',
  pink: 'bg-pink-100 border-pink-300 text-pink-900',
  orange: 'bg-orange-100 border-orange-300 text-orange-900',
};

const StickyNoteNode = memo(({ data, selected }: NodeProps<StickyNoteData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const color = data.color || 'yellow';
  const colorClasses = STICKY_NOTE_COLORS[color];

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onReply) {
      data.onReply(data.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(data.id);
    }
  };

  const handleReaction = (e: React.MouseEvent, reaction: string) => {
    e.stopPropagation();
    // Handle reaction logic
    console.log('Reaction:', reaction);
  };

  return (
    <div
      className={`${colorClasses} border-2 rounded-lg shadow-md transition-all min-w-[200px] max-w-[250px] transform ${
        selected ? 'shadow-xl scale-105' : ''
      } ${isHovered ? 'shadow-lg' : ''} rotate-1`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `rotate(${Math.random() * 6 - 3}deg)`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-gray-500"
        style={{ top: -4 }}
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs font-semibold opacity-80">{data.authorName}</div>
            <div className="text-xs opacity-60">
              {format(new Date(data.createdAt), 'MMM d, h:mm a')}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleReply}>
                  <Reply className="h-3 w-3 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <X className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="text-sm mb-3 whitespace-pre-wrap">{data.content}</div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Reactions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => handleReaction(e, 'like')}
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            {data.reactions?.like && (
              <span className="text-xs opacity-70">{data.reactions.like}</span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => handleReaction(e, 'heart')}
            >
              <Heart className="h-3 w-3" />
            </Button>
            {data.reactions?.heart && (
              <span className="text-xs opacity-70">{data.reactions.heart}</span>
            )}
          </div>

          {/* Reply Count */}
          {data.replyCount !== undefined && data.replyCount > 0 && (
            <div className="flex items-center gap-1 text-xs opacity-70">
              <MessageSquare className="h-3 w-3" />
              <span>{data.replyCount}</span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-gray-500"
        style={{ bottom: -4 }}
      />
    </div>
  );
});

StickyNoteNode.displayName = 'StickyNoteNode';

export default StickyNoteNode;