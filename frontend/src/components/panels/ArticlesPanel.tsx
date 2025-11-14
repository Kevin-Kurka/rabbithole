'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { theme } from '@/styles/theme';
import { FileText, Plus, Eye, EyeOff } from 'lucide-react';
import { GET_ARTICLES, type Article } from '@/graphql/queries/articles';
import { CreateArticleDialog } from '@/components/create-article-dialog';
import { format } from 'date-fns';

export default function ArticlesPanel() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterPublished, setFilterPublished] = useState<boolean | undefined>(undefined);

  const { data, loading, error } = useQuery(GET_ARTICLES, {
    variables: {
      published: filterPublished,
    },
  });

  const articles: Article[] = data?.getArticles || [];

  const handleArticleClick = (articleId: string) => {
    router.push(`/articles/${articleId}`);
  };

  const handleViewAll = () => {
    router.push('/articles');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: theme.spacing.md,
          borderBottom: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}
        >
          <h3
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <FileText size={16} />
            Articles
          </h3>
          <button
            onClick={() => setShowCreateDialog(true)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.button.primary.bg,
              color: theme.colors.button.primary.text,
              border: 'none',
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
            }}
            title="New Article"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          <button
            onClick={() => setFilterPublished(undefined)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor:
                filterPublished === undefined
                  ? theme.colors.button.primary.bg
                  : theme.colors.bg.elevated,
              color:
                filterPublished === undefined
                  ? theme.colors.button.primary.text
                  : theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterPublished(true)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor:
                filterPublished === true
                  ? theme.colors.button.primary.bg
                  : theme.colors.bg.elevated,
              color:
                filterPublished === true
                  ? theme.colors.button.primary.text
                  : theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
            }}
          >
            Published
          </button>
          <button
            onClick={() => setFilterPublished(false)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor:
                filterPublished === false
                  ? theme.colors.button.primary.bg
                  : theme.colors.bg.elevated,
              color:
                filterPublished === false
                  ? theme.colors.button.primary.text
                  : theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
            }}
          >
            Drafts
          </button>
        </div>
      </div>

      {/* Articles List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.sm,
        }}
      >
        {loading && (
          <div
            style={{
              padding: theme.spacing.md,
              textAlign: 'center',
              color: theme.colors.text.tertiary,
              fontSize: '12px',
            }}
          >
            Loading articles...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: theme.spacing.md,
              textAlign: 'center',
              color: theme.colors.text.error,
              fontSize: '12px',
            }}
          >
            Error loading articles
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div
            style={{
              padding: theme.spacing.md,
              textAlign: 'center',
              color: theme.colors.text.tertiary,
              fontSize: '12px',
            }}
          >
            No articles found
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article.id)}
                style={{
                  padding: theme.spacing.sm,
                  backgroundColor: theme.colors.bg.elevated,
                  border: `1px solid ${theme.colors.border.primary}`,
                  borderRadius: theme.radius.sm,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
                  e.currentTarget.style.borderColor = theme.colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.elevated;
                  e.currentTarget.style.borderColor = theme.colors.border.primary;
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'space-between',
                    gap: theme.spacing.xs,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  <h4
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: theme.colors.text.primary,
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {article.title}
                  </h4>
                  {article.published_at ? (
                    <Eye size={12} style={{ color: theme.colors.text.tertiary, flexShrink: 0 }} />
                  ) : (
                    <EyeOff size={12} style={{ color: theme.colors.text.tertiary, flexShrink: 0 }} />
                  )}
                </div>
                <p
                  style={{
                    fontSize: '11px',
                    color: theme.colors.text.tertiary,
                    lineHeight: '1.3',
                  }}
                >
                  {format(new Date(article.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && articles.length > 0 && (
        <div
          style={{
            padding: theme.spacing.sm,
            borderTop: `1px solid ${theme.colors.border.primary}`,
          }}
        >
          <button
            onClick={handleViewAll}
            style={{
              width: '100%',
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              fontSize: '12px',
              fontWeight: 500,
              color: theme.colors.button.primary.text,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border.primary}`,
              borderRadius: theme.radius.sm,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            View All Articles
          </button>
        </div>
      )}

      {/* Create Article Dialog */}
      <CreateArticleDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
