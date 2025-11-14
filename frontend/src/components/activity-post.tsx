"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2, Link2, FileIcon } from 'lucide-react';
import { ActivityPost as ActivityPostType } from '@/graphql/queries/activity';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { REACT_TO_POST, SHARE_POST } from '@/graphql/queries/activity';
import { formatDistanceToNow } from 'date-fns';

interface ActivityPostProps {
  post: ActivityPostType;
  onReply?: (postId: string) => void;
  onClick?: () => void;
}

export function ActivityPost({ post, onReply, onClick }: ActivityPostProps) {
  const router = useRouter();
  const [reactToPost] = useMutation(REACT_TO_POST);
  const [shareMutation] = useMutation(SHARE_POST);

  // Parse reactionCounts JSON string
  const reactionCounts = post.reactionCounts ? JSON.parse(post.reactionCounts) : {};

  const [isLiked, setIsLiked] = useState(
    post.userReactions?.includes('like') || false
  );
  const [likeCount, setLikeCount] = useState(reactionCounts.like || 0);
  const [shareCount, setShareCount] = useState(post.shareCount || 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reactToPost({
        variables: {
          postId: post.id,
          reactionType: 'like',
        },
      });
      setIsLiked(!isLiked);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error('Failed to react to post:', error);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await shareMutation({
        variables: {
          input: {
            postId: post.id,
          },
        },
      });
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReply?.(post.id);
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  });

  return (
    <div
      onClick={onClick}
      className="flex gap-3 pb-4 cursor-pointer hover:bg-muted/30 transition-colors px-4 -mx-4 rounded-lg"
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback>
          {post.author?.username?.charAt(0) || post.author?.email.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {post.author?.username || post.author?.email}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm mb-2 whitespace-pre-wrap">{post.content}</p>

        {/* Linked Nodes - Currently mentioned_node_ids are just IDs, no full node data */}
        {post.mentioned_node_ids && post.mentioned_node_ids.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.mentioned_node_ids.map((nodeId) => (
              <Badge
                key={nodeId}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(nodeId);
                }}
              >
                <Link2 className="w-3 h-3 mr-1" />
                Node
              </Badge>
            ))}
          </div>
        )}

        {/* File Attachments - Currently attachment_ids are just IDs, no full file data */}
        {post.attachment_ids && post.attachment_ids.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.attachment_ids.map((fileId) => (
              <Badge
                key={fileId}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
              >
                <FileIcon className="w-3 h-3 mr-1" />
                Attachment
              </Badge>
            ))}
          </div>
        )}

        {/* Footer - Actions and Timestamp */}
        <div className="flex items-center justify-between pt-2 border-t w-full">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Heart
                className={`w-4 h-4 group-hover:scale-110 transition-transform ${
                  isLiked ? 'fill-red-500 text-red-500' : ''
                }`}
              />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Reply Button */}
            <button
              onClick={handleReply}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {post.replyCount > 0 && <span>{post.replyCount}</span>}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {shareCount > 0 && <span>{shareCount}</span>}
            </button>

            {/* File Attachments */}
            {fileAttachments && fileAttachments.length > 0 && (
              <div className="flex gap-1">
                {fileAttachments.map((file) => (
                  <Badge key={file.id} variant="outline" className="cursor-pointer">
                    <FileIcon className="w-3 h-3 mr-1" />
                    <span className="text-xs truncate max-w-[100px]">{file.fileName}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
