"use client";

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ExternalLink,
  Eye,
  MessageSquare,
  Link2,
  Quote,
  User,
  MapPin,
  Calendar,
  FileText,
  Building,
  Briefcase
} from 'lucide-react';

interface Citation {
  id: string;
  text: string;
  url: string;
  title: string;
  startOffset: number;
  endOffset: number;
}

interface NodeLink {
  id: string;
  nodeId: string;
  nodeTitle: string;
  nodeType?: string; // e.g., "Person", "Place", "Event", "Document", "Organization"
  text: string;
  startOffset: number;
  endOffset: number;
}

interface EnrichedContentProps {
  content: string;
  citations?: Citation[];
  nodeLinks?: NodeLink[];
  onNavigateToNode?: (nodeId: string) => void;
  onViewCitation?: (citation: Citation) => void;
  onCommentOnCitation?: (citation: Citation) => void;
}

// Helper function to get icon based on node type
function getNodeIcon(nodeType?: string) {
  if (!nodeType) return Link2;

  const type = nodeType.toLowerCase();
  if (type.includes('person') || type.includes('individual')) return User;
  if (type.includes('place') || type.includes('location')) return MapPin;
  if (type.includes('event') || type.includes('incident')) return Calendar;
  if (type.includes('document') || type.includes('report') || type.includes('evidence')) return FileText;
  if (type.includes('organization') || type.includes('agency') || type.includes('institution')) return Building;
  if (type.includes('investigation') || type.includes('inquiry')) return Briefcase;

  return Link2; // Default icon
}

export function EnrichedContent({
  content,
  citations = [],
  nodeLinks = [],
  onNavigateToNode,
  onViewCitation,
  onCommentOnCitation,
}: EnrichedContentProps) {
  // Combine citations and node links into a single array with positions
  const enrichments = [
    ...citations.map((c) => ({
      type: 'citation' as const,
      data: c,
      start: c.startOffset,
      end: c.endOffset,
    })),
    ...nodeLinks.map((n) => ({
      type: 'nodeLink' as const,
      data: n,
      start: n.startOffset,
      end: n.endOffset,
    })),
  ].sort((a, b) => a.start - b.start);

  // Build enriched content with badges
  const renderEnrichedContent = () => {
    if (enrichments.length === 0) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    enrichments.forEach((enrichment, index) => {
      // Add text before this enrichment
      if (enrichment.start > lastIndex) {
        const beforeText = content.slice(lastIndex, enrichment.start);
        elements.push(
          <span key={`text-${index}`} dangerouslySetInnerHTML={{ __html: beforeText }} />
        );
      }

      // Add the enriched text with badge
      const enrichedText = content.slice(enrichment.start, enrichment.end);

      if (enrichment.type === 'citation') {
        const citation = enrichment.data as Citation;
        elements.push(
          <span key={`citation-${citation.id}`} className="inline-flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: enrichedText }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-1.5 py-0"
                >
                  <Quote className="w-2.5 h-2.5" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <div className="px-2 py-1.5">
                  <div className="text-xs font-medium mb-1">{citation.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{citation.url}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open(citation.url, '_blank')}
                  className="cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Open Source
                </DropdownMenuItem>
                {onViewCitation && (
                  <DropdownMenuItem
                    onClick={() => onViewCitation(citation)}
                    className="cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onCommentOnCitation && (
                  <DropdownMenuItem
                    onClick={() => onCommentOnCitation(citation)}
                    className="cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-2" />
                    Comment
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      } else if (enrichment.type === 'nodeLink') {
        const nodeLink = enrichment.data as NodeLink;
        const NodeIcon = getNodeIcon(nodeLink.nodeType);
        elements.push(
          <span key={`node-${nodeLink.id}`} className="inline-flex items-center gap-1">
            <span dangerouslySetInnerHTML={{ __html: enrichedText }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-xs px-1.5 py-0"
                >
                  <NodeIcon className="w-2.5 h-2.5" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="text-xs font-medium">{nodeLink.nodeTitle}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onNavigateToNode?.(nodeLink.nodeId)}
                  className="cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-2" />
                  View Node
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      }

      lastIndex = enrichment.end;
    });

    // Add remaining text after last enrichment
    if (lastIndex < content.length) {
      const afterText = content.slice(lastIndex);
      elements.push(
        <span key="text-end" dangerouslySetInnerHTML={{ __html: afterText }} />
      );
    }

    return <>{elements}</>;
  };

  return <div className="prose dark:prose-invert max-w-none">{renderEnrichedContent()}</div>;
}
