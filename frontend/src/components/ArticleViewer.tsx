'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { HighlightedText } from './HighlightedText';
import { AnnotationPanel } from './AnnotationPanel';
import { useToast } from '@/hooks/useToast';
import {
  GET_ANNOTATIONS,
  GET_ARTICLE_TRUSTWORTHINESS,
  ANALYZE_ARTICLE_FOR_DECEPTION,
  VOTE_ON_ANNOTATION,
  type Annotation,
  type GetAnnotationsData,
  type GetAnnotationsVariables,
  type GetArticleTrustworthinessData,
  type GetArticleTrustworthinessVariables,
  type AnalyzeArticleData,
  type AnalyzeArticleVariables,
  type VoteOnAnnotationData,
  type VoteOnAnnotationVariables,
} from '@/graphql/annotations';

/**
 * ArticleViewer Component
 *
 * Displays an article with AI-powered deception detection and highlighting.
 *
 * Features:
 * - Shows article content with highlighted annotations
 * - "Analyze for Deception" button to run AI analysis
 * - Sidebar panel with annotation list and filters
 * - Trustworthiness score badge
 * - Vote on annotations
 * - Scroll to annotation on click
 */

interface ArticleViewerProps {
  nodeId: string;
  title: string;
  content: string;
  author?: string;
  createdAt?: string;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({
  nodeId,
  title,
  content,
  author,
  createdAt,
}) => {
  const toast = useToast();
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  // Fetch annotations
  const {
    data: annotationsData,
    loading: annotationsLoading,
    refetch: refetchAnnotations,
  } = useQuery<GetAnnotationsData, GetAnnotationsVariables>(GET_ANNOTATIONS, {
    variables: { nodeId },
  });

  // Fetch trustworthiness score
  const {
    data: trustworthinessData,
    refetch: refetchTrustworthiness,
  } = useQuery<GetArticleTrustworthinessData, GetArticleTrustworthinessVariables>(
    GET_ARTICLE_TRUSTWORTHINESS,
    {
      variables: { nodeId },
    }
  );

  // Analyze for deception mutation
  const [analyzeArticle, { loading: analyzing }] = useMutation<AnalyzeArticleData, AnalyzeArticleVariables>(
    ANALYZE_ARTICLE_FOR_DECEPTION,
    {
      onCompleted: (data) => {
        toast.success(`Analysis complete! Found ${data.analyzeArticleForDeception.deceptionCount} potential issues.`);
        refetchAnnotations();
        refetchTrustworthiness();
      },
      onError: (error) => {
        toast.error(`Analysis failed: ${error.message}`);
      },
    }
  );

  // Vote on annotation mutation
  const [voteOnAnnotation] = useMutation<VoteOnAnnotationData, VoteOnAnnotationVariables>(VOTE_ON_ANNOTATION, {
    onCompleted: () => {
      toast.success('Vote recorded!');
      refetchAnnotations();
    },
    onError: (error) => {
      toast.error(`Vote failed: ${error.message}`);
    },
  });

  const handleAnalyze = () => {
    analyzeArticle({ variables: { nodeId } });
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    // TODO: Scroll to annotation in article
  };

  const handleVote = (annotationId: string, vote: number) => {
    voteOnAnnotation({ variables: { annotationId, vote } });
  };

  const annotations = annotationsData?.getAnnotations || [];
  const trustworthinessScore = trustworthinessData?.getArticleTrustworthinessScore;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff',
      }}
    >
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '48px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 600,
                marginBottom: '16px',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>

            {/* Metadata */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: '#9CA3AF',
                marginBottom: '24px',
              }}
            >
              {author && <span>By {author}</span>}
              {createdAt && <span>" {new Date(createdAt).toLocaleDateString()}</span>}
              {trustworthinessScore !== undefined && (
                <span
                  style={{
                    color:
                      trustworthinessScore >= 0.7
                        ? '#10B981'
                        : trustworthinessScore >= 0.4
                        ? '#F59E0B'
                        : '#EF4444',
                    fontWeight: 600,
                  }}
                >
                  " Trustworthiness: {(trustworthinessScore * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#06B6D4',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: analyzing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 200ms ease-out',
                  opacity: analyzing ? 0.6 : 1,
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (!analyzing) {
                    e.currentTarget.style.backgroundColor = '#0891B2';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#06B6D4';
                }}
              >
                {analyzing ? '> Analyzing...' : '> Analyze for Deception'}
              </button>

              <button
                onClick={() => setShowPanel(!showPanel)}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 200ms ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
              >
                {showPanel ? '=Ë Hide Annotations' : '=Ë Show Annotations'} ({annotations.length})
              </button>
            </div>

            {/* Analysis Status */}
            {annotationsLoading && (
              <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Loading annotations...</div>
              </div>
            )}

            {annotations.length > 0 && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#1F2937',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  borderLeft: `4px solid ${
                    trustworthinessScore && trustworthinessScore >= 0.7
                      ? '#10B981'
                      : trustworthinessScore && trustworthinessScore >= 0.4
                      ? '#F59E0B'
                      : '#EF4444'
                  }`,
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  AI Deception Detection Summary
                </div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                  Found {annotations.filter(a => a.annotationType === 'deception').length} potential logical fallacies
                  or misleading statements.
                  {trustworthinessScore !== undefined && (
                    <>
                      {' '}
                      Overall trustworthiness score: {(trustworthinessScore * 100).toFixed(0)}%
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Article Content with Highlights */}
          <div
            style={{
              fontSize: '18px',
              lineHeight: 1.8,
              color: '#E5E7EB',
            }}
          >
            <HighlightedText
              text={content}
              annotations={annotations}
              onAnnotationClick={handleAnnotationClick}
              onAnnotationVote={handleVote}
            />
          </div>
        </div>
      </div>

      {/* Annotation Panel (Sidebar) */}
      {showPanel && (
        <AnnotationPanel
          annotations={annotations}
          onAnnotationClick={handleAnnotationClick}
          onVote={handleVote}
          trustworthinessScore={trustworthinessScore}
        />
      )}
    </div>
  );
};
