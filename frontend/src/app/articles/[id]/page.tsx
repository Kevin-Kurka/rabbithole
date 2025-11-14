'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useToast } from '@/hooks/use-toast';
import {
  GET_ARTICLE,
  UPDATE_ARTICLE,
  PUBLISH_ARTICLE,
  DELETE_ARTICLE,
  type UpdateArticleInput,
  type PublishArticleInput,
} from '@/graphql/queries/articles';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch article data
  const { data, loading, error } = useQuery(GET_ARTICLE, {
    variables: { articleId: id },
  });

  const article = data?.getArticle;

  // Initialize form when article loads
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setNarrative(article.narrative);
    }
  }, [article]);

  // Track unsaved changes
  useEffect(() => {
    if (!article) return;
    const changed = title !== article.title || narrative !== article.narrative;
    setHasUnsavedChanges(changed);
  }, [title, narrative, article]);

  // Update article mutation
  const [updateArticle, { loading: updating }] = useMutation(UPDATE_ARTICLE, {
    onCompleted: (data) => {
      setHasUnsavedChanges(false);
      toast({
        title: 'Article Saved',
        description: 'Your changes have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Saving Article',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Publish article mutation
  const [publishArticle, { loading: publishing }] = useMutation(PUBLISH_ARTICLE, {
    refetchQueries: [{ query: GET_ARTICLE, variables: { articleId: id } }],
    onCompleted: () => {
      toast({
        title: 'Article Published',
        description: 'Your article is now visible to everyone.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Publishing Article',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete article mutation
  const [deleteArticle, { loading: deleting }] = useMutation(DELETE_ARTICLE, {
    onCompleted: () => {
      toast({
        title: 'Article Deleted',
        description: 'Your article has been deleted.',
      });
      router.push('/articles');
    },
    onError: (error) => {
      toast({
        title: 'Error Deleting Article',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    if (!title.trim() || !narrative.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both a title and content.',
        variant: 'destructive',
      });
      return;
    }

    const input: UpdateArticleInput = {
      articleId: id,
      title: title.trim(),
      narrative: narrative.trim(),
    };

    await updateArticle({ variables: { input } });
  };

  const handlePublish = async () => {
    if (hasUnsavedChanges) {
      toast({
        title: 'Unsaved Changes',
        description: 'Please save your changes before publishing.',
        variant: 'destructive',
      });
      return;
    }

    const input: PublishArticleInput = {
      articleId: id,
    };

    await publishArticle({ variables: { input } });
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this article? This action cannot be undone.'
      )
    ) {
      return;
    }

    await deleteArticle({ variables: { articleId: id } });
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (
        !confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        )
      ) {
        return;
      }
    }
    router.push('/articles');
  };

  // Auto-save functionality (optional - every 30 seconds)
  useEffect(() => {
    if (!hasUnsavedChanges || !article) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, title, narrative]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium text-lg mb-2">
            Error loading article
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {error?.message || 'Article not found'}
          </p>
          <Button onClick={() => router.push('/articles')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const isPublished = !!article.published_at;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {isPublished ? (
                  <Badge variant="default" className="gap-1">
                    <Eye className="w-3 h-3" />
                    Published
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <EyeOff className="w-3 h-3" />
                    Draft
                  </Badge>
                )}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Unsaved changes
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={updating || !hasUnsavedChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updating ? 'Saving...' : 'Save'}
              </Button>

              {!isPublished && (
                <Button
                  onClick={handlePublish}
                  disabled={publishing || hasUnsavedChanges}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Created {format(new Date(article.created_at), 'PPP')}</span>
            </div>
            {isPublished && (
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>
                  Published {format(new Date(article.published_at), 'PPP')}
                </span>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="text-2xl font-bold h-auto py-3"
              disabled={updating}
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label htmlFor="narrative">Content</Label>
            <MarkdownEditor
              value={narrative}
              onChange={setNarrative}
              placeholder="Write your article content here..."
              disabled={updating}
              minHeight="500px"
            />
          </div>

          {/* Auto-save indicator */}
          {hasUnsavedChanges && (
            <p className="text-xs text-muted-foreground text-center">
              Auto-save will trigger in 30 seconds, or click Save to save now
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
