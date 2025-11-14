'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateArticleDialog } from '@/components/create-article-dialog';
import { GET_ARTICLES, type Article } from '@/graphql/queries/articles';
import { FileText, Plus, Search, Calendar, User, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function ArticlesPage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublished, setFilterPublished] = useState<boolean | undefined>(undefined);

  const { data, loading, error } = useQuery(GET_ARTICLES, {
    variables: {
      published: filterPublished,
    },
  });

  const articles: Article[] = data?.getArticles || [];

  // Filter articles by search query
  const filteredArticles = articles.filter((article) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.narrative.toLowerCase().includes(query)
    );
  });

  const handleArticleClick = (articleId: string) => {
    router.push(`/articles/${articleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                Articles
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore research articles and analysis from the community
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterPublished === undefined ? 'default' : 'outline'}
                onClick={() => setFilterPublished(undefined)}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterPublished === true ? 'default' : 'outline'}
                onClick={() => setFilterPublished(true)}
                size="sm"
              >
                Published
              </Button>
              <Button
                variant={filterPublished === false ? 'default' : 'outline'}
                onClick={() => setFilterPublished(false)}
                size="sm"
              >
                Drafts
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">Error loading articles</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'Try adjusting your search query or filters'
                : 'Get started by creating your first article'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Article
              </Button>
            )}
          </div>
        )}

        {/* Articles Grid */}
        {!loading && !error && filteredArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleArticleClick(article.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </CardTitle>
                    {article.published_at ? (
                      <Badge variant="default" className="shrink-0">
                        <Eye className="w-3 h-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-3">
                    {article.narrative.substring(0, 150)}
                    {article.narrative.length > 150 ? '...' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(article.created_at), 'MMM d, yyyy')}
                    </div>
                    {article.published_at && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Published
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Info */}
        {!loading && !error && filteredArticles.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Create Article Dialog */}
      <CreateArticleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
