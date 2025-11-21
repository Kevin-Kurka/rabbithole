"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeLink {
  id: string;
  title: string;
}

export interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nodeLinks?: NodeLink[];
}

export function ChatMessage({ role, content, timestamp, nodeLinks }: ChatMessageProps) {
  const router = useRouter();
  const isUser = role === 'user';

  // Parse node links in markdown format: [Node Title](node:node-id)
  const parseNodeLinks = (text: string) => {
    const nodeLinkRegex = /\[([^\]]+)\]\(node:([^\)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = nodeLinkRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the clickable node link
      const nodeTitle = match[1];
      const nodeId = match[2];
      parts.push(
        <button
          key={`${nodeId}-${match.index}`}
          onClick={() => router.push(`/nodes/${nodeId}`)}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors border border-blue-500/30"
        >
          {nodeTitle}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={cn("flex gap-4 mb-6", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 max-w-3xl", isUser && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-lg p-4",
          isUser
            ? "bg-blue-500/10 border border-blue-500/20"
            : "bg-zinc-800/50 border border-zinc-700/50"
        )}>
          {/* Markdown Rendering */}
          <div className={cn(
            "prose prose-invert prose-sm max-w-none",
            "prose-p:my-2 prose-p:leading-relaxed",
            "prose-headings:font-semibold prose-headings:mb-2",
            "prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
            "prose-code:bg-zinc-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
            "prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-zinc-700",
            "prose-ul:my-2 prose-ol:my-2",
            "prose-li:my-1"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom component to handle node links
                p: ({ children }) => {
                  // If content has node links, parse them
                  if (typeof children === 'string') {
                    const parsed = parseNodeLinks(children);
                    return <p>{parsed}</p>;
                  }
                  return <p>{children}</p>;
                },
                a: ({ href, children }) => {
                  // Handle node: protocol links
                  if (href?.startsWith('node:')) {
                    const nodeId = href.replace('node:', '');
                    return (
                      <button
                        onClick={() => router.push(`/nodes/${nodeId}`)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                      >
                        {children}
                      </button>
                    );
                  }
                  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp */}
        <div className={cn(
          "text-xs text-zinc-500 mt-1 px-1",
          isUser && "text-right"
        )}>
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Node Links */}
        {nodeLinks && nodeLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {nodeLinks.map((node) => (
              <button
                key={node.id}
                onClick={() => router.push(`/nodes/${node.id}`)}
                className="text-xs px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded hover:bg-zinc-700/50 transition-colors"
              >
                {node.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
