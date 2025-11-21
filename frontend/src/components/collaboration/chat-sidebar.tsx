"use client";

import React, { useState } from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: string;
  messageCount: number;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  className,
}: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  return (
    <div className={cn(
      "h-full flex flex-col bg-zinc-900/50 border-r border-zinc-700/50 transition-all duration-300",
      isCollapsed ? "w-16" : "w-80",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-700/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-white">Conversations</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <Button
            onClick={onNewConversation}
            className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      {/* Collapsed New Chat Button */}
      {isCollapsed && (
        <div className="flex-shrink-0 p-2 border-b border-zinc-700/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewConversation}
            className="w-full h-12"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className={cn("p-2 space-y-1", isCollapsed && "flex flex-col items-center")}>
          {conversations.length === 0 ? (
            !isCollapsed && (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No conversations yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Start a new chat to get started
                </p>
              </div>
            )
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-zinc-800/50",
                  activeConversationId === conversation.id
                    ? "bg-zinc-800 border border-blue-500/30"
                    : "border border-transparent",
                  isCollapsed && "justify-center p-2"
                )}
                onClick={() => onSelectConversation(conversation.id)}
                title={isCollapsed ? conversation.title : undefined}
              >
                {/* Icon */}
                <MessageSquare
                  className={cn(
                    "flex-shrink-0 text-zinc-400",
                    isCollapsed ? "w-5 h-5" : "w-4 h-4 mt-0.5"
                  )}
                />

                {!isCollapsed && (
                  <>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {truncateTitle(conversation.title)}
                      </h3>
                      {conversation.lastMessage && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {truncateTitle(conversation.lastMessage, 40)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-600">
                          {formatTimestamp(conversation.timestamp)}
                        </span>
                        <span className="text-xs text-zinc-600">
                          • {conversation.messageCount} messages
                        </span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    {onDeleteConversation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
