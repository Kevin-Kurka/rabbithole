"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_NODE_ACTIVITY, ActivityPost as ActivityPostType } from '@/graphql/queries/activity';
import { ActivityPost } from '@/components/activity-post';
import { PostComposer } from '@/components/post-composer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, MessageSquare } from 'lucide-react';

interface ActivityFeedProps {
  nodeId: string;
  user?: {
    name?: string;
    email: string;
    image?: string;
  };
}

export function ActivityFeed({ nodeId, user }: ActivityFeedProps) {
  const [replyToPostId, setReplyToPostId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const POSTS_PER_PAGE = 20;

  const { data, loading, fetchMore, refetch } = useQuery<{
    getNodeActivity: ActivityPostType[];
  }>(GET_NODE_ACTIVITY, {
    variables: {
      nodeId,
      limit: POSTS_PER_PAGE,
      offset: 0,
    },
    skip: !nodeId,
  });

  // Infinite scroll - simplified since we're just loading more posts
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const posts = data?.getNodeActivity || [];
        // Simple check: if we got a full page, there might be more
        const hasMore = posts.length >= POSTS_PER_PAGE && posts.length % POSTS_PER_PAGE === 0;

        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore({
            variables: {
              offset: posts.length,
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) return prev;
              return {
                getNodeActivity: [
                  ...(prev.getNodeActivity || []),
                  ...(fetchMoreResult.getNodeActivity || []),
                ],
              };
            },
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [data, loading, fetchMore]);

  const handlePostCreated = () => {
    refetch();
    setReplyToPostId(null);
  };

  const handleReply = (postId: string) => {
    setReplyToPostId(postId);
  };

  const posts = data?.getNodeActivity || [];

  return (
    <div className="flex flex-col h-full">
      {/* Post Composer - Fixed at Top */}
      <div className="flex-shrink-0 mb-4">
        <PostComposer
          targetNodeId={nodeId}
          user={user}
          onPostCreated={handlePostCreated}
          placeholder="Share your thoughts..."
        />
      </div>

      <Separator className="mb-4" />

      {/* Activity Feed - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No activity yet. Be the first to post!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div key={post.id}>
                  <ActivityPost
                    post={post}
                    onReply={handleReply}
                    onClick={() => {
                      // Could navigate to full thread view
                    }}
                  />

                  {/* Reply Composer */}
                  {replyToPostId === post.id && (
                    <div className="ml-12 mt-3 mb-4">
                      <PostComposer
                        targetNodeId={nodeId}
                        parentPostId={post.id}
                        user={user}
                        onPostCreated={handlePostCreated}
                        placeholder={`Reply to ${post.author?.username || post.author?.email}...`}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Render Replies */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="ml-12 mt-3 space-y-3 border-l-2 border-muted pl-4">
                      {post.replies.map((reply) => (
                        <ActivityPost
                          key={reply.id}
                          post={reply}
                          onReply={handleReply}
                        />
                      ))}
                    </div>
                  )}

                  <Separator className="mt-4" />
                </div>
              ))}

              {/* Infinite Scroll Target */}
              {posts.length >= POSTS_PER_PAGE && (
                <div ref={observerTarget} className="py-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
