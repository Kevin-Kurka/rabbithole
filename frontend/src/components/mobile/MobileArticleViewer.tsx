/**
 * MobileArticleViewer Component
 *
 * Mobile-optimized article/node content viewer.
 * Responsive layout with bottom sheet for annotations and metadata.
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Share2,
  BookmarkPlus,
  MessageCircle,
  MoreVertical,
  ExternalLink,
  Eye,
  Clock,
  User,
  Star,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mobileTheme } from '@/styles/mobileTheme';
import { BottomSheet } from './BottomSheet';

export interface ArticleMetadata {
  id: string;
  title: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  type?: string;
  credibility?: number;
  views?: number;
  tags?: string[];
  source_url?: string;
}

export interface ArticleAnnotation {
  id: string;
  text: string;
  author: string;
  created_at: string;
  highlightedText?: string;
  position?: number;
}

export interface MobileArticleViewerProps {
  metadata: ArticleMetadata;
  content: string;
  annotations?: ArticleAnnotation[];
  loading?: boolean;
  onShare?: () => void;
  onBookmark?: () => void;
  onAnnotate?: (text: string) => void;
}

export const MobileArticleViewer: React.FC<MobileArticleViewerProps> = ({
  metadata,
  content,
  annotations = [],
  loading = false,
  onShare,
  onBookmark,
  onAnnotate,
}) => {
  const router = useRouter();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare();
    } else {
      // Fallback to native share API
      if (navigator.share) {
        navigator.share({
          title: metadata.title,
          text: content.slice(0, 200) + '...',
          url: window.location.href,
        });
      }
    }
  }, [onShare, metadata.title, content]);

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.();
  }, [isBookmarked, onBookmark]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-20 bg-background border-b border-border"
        style={{
          paddingTop: mobileTheme.safe.top,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            style={{
              minWidth: mobileTheme.touch.comfortable,
              minHeight: mobileTheme.touch.comfortable,
            }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              style={{
                minWidth: mobileTheme.touch.comfortable,
                minHeight: mobileTheme.touch.comfortable,
              }}
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-full transition-colors ${
                isBookmarked ? 'text-yellow-500 bg-yellow-500/10' : 'hover:bg-muted'
              }`}
              style={{
                minWidth: mobileTheme.touch.comfortable,
                minHeight: mobileTheme.touch.comfortable,
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <BookmarkPlus className="w-5 h-5" />
            </button>

            {/* More Actions */}
            <button
              onClick={() => setShowActions(true)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              style={{
                minWidth: mobileTheme.touch.comfortable,
                minHeight: mobileTheme.touch.comfortable,
              }}
              aria-label="More actions"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Bar */}
        <button
          onClick={() => setShowMetadata(true)}
          className="w-full px-4 py-2 border-t border-border hover:bg-muted transition-colors text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground min-w-0 flex-1">
              {metadata.type && (
                <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                  {metadata.type}
                </span>
              )}
              {metadata.credibility !== undefined && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {metadata.credibility}%
                </span>
              )}
              {metadata.views !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {metadata.views}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      </header>

      {/* Article Content */}
      <main className="flex-1 overflow-y-auto">
        <article className="px-4 py-6 max-w-2xl mx-auto">
          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
            {metadata.title}
          </h1>

          {/* Author & Date */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
            {metadata.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{metadata.author}</span>
              </div>
            )}
            {metadata.created_at && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{new Date(metadata.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="prose prose-sm sm:prose max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-muted text-sm rounded-full text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Spacing for bottom actions */}
        <div className="h-20" />
      </main>

      {/* Floating Annotation Button */}
      {annotations.length > 0 && (
        <button
          onClick={() => setShowAnnotations(true)}
          className="fixed bottom-20 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-95 transition-transform"
          style={{
            minHeight: mobileTheme.touch.comfortable,
            zIndex: mobileTheme.zIndex.fab,
          }}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">{annotations.length}</span>
        </button>
      )}

      {/* Annotations Bottom Sheet */}
      <BottomSheet
        isOpen={showAnnotations}
        onClose={() => setShowAnnotations(false)}
        title={`Annotations (${annotations.length})`}
        showHandle={true}
      >
        <div className="px-4 py-4">
          {annotations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No annotations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select text to add an annotation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="p-4 bg-muted rounded-lg"
                >
                  {annotation.highlightedText && (
                    <div className="mb-2 p-2 bg-primary/10 border-l-2 border-primary text-sm italic">
                      "{annotation.highlightedText}"
                    </div>
                  )}
                  <p className="text-foreground mb-2">{annotation.text}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{annotation.author}</span>
                    <span>•</span>
                    <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Metadata Bottom Sheet */}
      <BottomSheet
        isOpen={showMetadata}
        onClose={() => setShowMetadata(false)}
        title="Article Info"
        showHandle={true}
      >
        <div className="px-4 py-4 space-y-4">
          {metadata.source_url && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
              <a
                href={metadata.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm truncate">{metadata.source_url}</span>
              </a>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type:</dt>
                <dd className="font-medium">{metadata.type || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Credibility:</dt>
                <dd className="font-medium">{metadata.credibility || 0}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Views:</dt>
                <dd className="font-medium">{metadata.views || 0}</dd>
              </div>
              {metadata.created_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created:</dt>
                  <dd className="font-medium">
                    {new Date(metadata.created_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {metadata.updated_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Updated:</dt>
                  <dd className="font-medium">
                    {new Date(metadata.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </BottomSheet>

      {/* Actions Bottom Sheet */}
      <BottomSheet
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title="Actions"
        showHandle={true}
      >
        <div className="px-4 py-4 space-y-2">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left"
            onClick={() => {
              setShowActions(false);
              setShowAnnotations(true);
            }}
          >
            <MessageCircle className="w-5 h-5" />
            <span>View Annotations</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left"
            onClick={() => {
              setShowActions(false);
              handleShare();
            }}
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition-colors text-left"
            onClick={() => {
              setShowActions(false);
              handleBookmark();
            }}
          >
            <BookmarkPlus className="w-5 h-5" />
            <span>{isBookmarked ? 'Remove Bookmark' : 'Bookmark'}</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default MobileArticleViewer;
