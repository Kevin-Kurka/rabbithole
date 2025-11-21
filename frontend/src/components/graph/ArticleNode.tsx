'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  Share2,
  MoreVertical,
  Calendar,
  User,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface ArticleNodeData {
  article: {
    id: string;
    title: string;
    narrative?: string;
    authorId?: string;
    authorName?: string;
    published?: boolean;
    createdAt?: string;
    viewCount?: number;
    nodeType?: string;
  };
  isExpanded: boolean;
  onExpand: (nodeId: string) => void;
  onCollapse: (nodeId: string) => void;
  onAddComment?: (nodeId: string) => void;
  onStartInquiry?: (nodeId: string) => void;
}

const ArticleNode = memo(({ data, selected }: NodeProps<ArticleNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { article, isExpanded, onExpand, onCollapse, onAddComment, onStartInquiry } = data;

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) {
      onCollapse(article.id);
    } else {
      onExpand(article.id);
    }
  };

  const handleAddComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddComment) {
      onAddComment(article.id);
    }
  };

  const handleStartInquiry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartInquiry) {
      onStartInquiry(article.id);
    }
  };

  return (
    <div
      className={`bg-card border-2 rounded-lg shadow-lg transition-all min-w-[280px] max-w-[320px] ${
        selected ? 'border-primary shadow-xl' : 'border-border'
      } ${isHovered ? 'shadow-xl scale-105' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary"
        style={{ top: -6 }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
              {article.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleExpandToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddComment}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStartInquiry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Inquiry
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Narrative Preview */}
        {article.narrative && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {article.narrative}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {article.authorName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{article.authorName}</span>
            </div>
          )}
          {article.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(article.createdAt), 'MMM d')}</span>
            </div>
          )}
          {article.viewCount !== undefined && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{article.viewCount}</span>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 mt-3">
          <Badge variant={article.published ? 'default' : 'secondary'} className="text-xs">
            {article.published ? 'Published' : 'Draft'}
          </Badge>
          {article.nodeType && (
            <Badge variant="outline" className="text-xs">
              {article.nodeType}
            </Badge>
          )}
        </div>

        {/* Connection Indicators */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Related Nodes</span>
              <Badge variant="outline" className="text-xs">
                Loading...
              </Badge>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary"
        style={{ bottom: -6 }}
      />
    </div>
  );
});

ArticleNode.displayName = 'ArticleNode';

export default ArticleNode;