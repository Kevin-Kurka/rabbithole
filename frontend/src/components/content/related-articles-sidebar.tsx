/**
 * Related Articles Sidebar Component
 *
 * Displays articles connected to the current article via REFERENCES edges.
 * This component queries related nodes and displays them as a sidebar section.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, FileText } from 'lucide-react';

interface RelatedArticle {
  id: string;
  title: string;
  type: string;
  credibility?: number;
}

interface RelatedArticlesSidebarProps {
  articles: RelatedArticle[];
  onArticleClick?: (articleId: string) => void;
  loading?: boolean;
}

export function RelatedArticlesSidebar({
  articles,
  onArticleClick,
  loading = false,
}: RelatedArticlesSidebarProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading related articles...</div>
        </CardContent>
      </Card>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Related Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No related articles found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Related Articles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {articles.map((article) => (
          <button
            key={article.id}
            onClick={() => onArticleClick?.(article.id)}
            className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all group"
          >
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-primary line-clamp-2">
                  {article.title}
                </p>
                {article.credibility !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Credibility:
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 ${
                        article.credibility >= 70
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : article.credibility >= 50
                            ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {article.credibility}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
