"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileText, User, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface NodeLinkCardProps {
  id: string;
  title: string;
  snippet?: string;
  relevance?: number;
  type?: string;
  className?: string;
}

export function NodeLinkCard({
  id,
  title,
  snippet,
  relevance,
  type = 'Node',
  className,
}: NodeLinkCardProps) {
  const router = useRouter();

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType.toLowerCase()) {
      case 'person':
        return <User className="w-4 h-4" />;
      case 'concept':
      case 'theory':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-blue-500/50 hover:bg-zinc-800/50",
        "group relative overflow-hidden",
        className
      )}
      onClick={() => router.push(`/nodes/${id}`)}
    >
      {/* Relevance Badge */}
      {relevance !== undefined && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400">
          {Math.round(relevance * 100)}% match
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {getNodeIcon(type)}
          <span className="flex-1 truncate">{title}</span>
          <ExternalLink className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
        {snippet && (
          <CardDescription className="line-clamp-2 text-sm">
            {snippet}
          </CardDescription>
        )}
      </CardHeader>

      {type && (
        <CardContent className="pt-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-400">
            {type}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
