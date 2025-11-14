"use client";

import React from 'react';
import { Layers, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NodeLinkCard, NodeLinkCardProps } from '@/components/node-link-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContextPanelProps {
  nodes: NodeLinkCardProps[];
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export function ContextPanel({ nodes, isOpen, onClose, className }: ContextPanelProps) {
  if (!isOpen) return null;

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <CardTitle className="text-lg">Context Nodes</CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 pb-4">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Layers className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">
              No context nodes yet
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Relevant nodes will appear here as you chat
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {nodes.map((node) => (
                <NodeLinkCard
                  key={node.id}
                  {...node}
                  className="hover:shadow-lg"
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {nodes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500">
              {nodes.length} node{nodes.length !== 1 ? 's' : ''} in context
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
