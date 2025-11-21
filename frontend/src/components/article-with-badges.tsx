"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExternalLink, Eye, MessageSquare, Link2 } from 'lucide-react';

interface ArticleWithBadgesProps {
  onNavigateToNode?: (nodeId: string) => void;
}

export function ArticleWithBadges({ onNavigateToNode }: ArticleWithBadgesProps) {
  return (
    <div id="article-content">
      <div className="prose dark:prose-invert max-w-none mb-6">
        <h2 id="section-overview">Overview</h2>
        <p>
          The JFK assassination investigation has produced extensive documentation including the{' '}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-baseline gap-1">
                <span className="font-medium cursor-pointer hover:text-primary">
                  Zapruder film frame analysis
                </span>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] px-1 py-0 align-middle"
                >
                  cite
                </Badge>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium mb-1">Zapruder Film Technical Analysis</div>
                <div className="text-xs text-muted-foreground truncate">
                  https://example.com/zapruder-analysis
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.open('https://example.com/zapruder-analysis', '_blank')}
                className="cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Open Source
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 mr-2" />
                Comment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>{' '}
          which provides crucial visual evidence. The official findings were published in the{' '}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-baseline gap-0.5">
                <span className="font-medium cursor-pointer hover:text-primary">Warren Commission</span>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-[10px] px-1 py-0 align-middle"
                >
                  <Link2 className="w-2 h-2" />
                </Badge>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium">Warren Commission Investigation</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onNavigateToNode?.('2')}
                className="cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                View Node
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>{' '}
          report.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none mb-6">
        <h2 id="section-evidence">Evidence Analysis</h2>
        <p>
          Multiple investigations have examined the trajectory evidence. The{' '}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-baseline gap-1">
                <span className="font-medium cursor-pointer hover:text-primary">
                  Warren Commission Report
                </span>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] px-1 py-0 align-middle"
                >
                  cite
                </Badge>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium mb-1">Official Warren Commission Report</div>
                <div className="text-xs text-muted-foreground truncate">
                  https://example.com/warren-commission
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.open('https://example.com/warren-commission', '_blank')}
                className="cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Open Source
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 mr-2" />
                Comment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>{' '}
          concluded that all shots came from the Texas School Book Depository where{' '}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span className="inline-flex items-baseline gap-0.5">
                <span className="font-medium cursor-pointer hover:text-primary">Lee Harvey Oswald</span>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-[10px] px-1 py-0 align-middle"
                >
                  <Link2 className="w-2 h-2" />
                </Badge>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <div className="text-xs font-medium">Lee Harvey Oswald Profile</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onNavigateToNode?.('3')}
                className="cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-2" />
                View Node
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>{' '}
          was employed.
        </p>
        <p>
          Ballistic tests show bullet deformation consistent with multiple impacts, supporting
          various theories about the sequence of events.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2 id="section-conclusions">Conclusions</h2>
        <p>
          The investigation remains one of the most scrutinized historical events, with ongoing
          analysis of physical evidence and testimony.
        </p>
      </div>
    </div>
  );
}
