'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CREATE_ARTICLE, GET_ARTICLES, type CreateArticleInput } from '@/graphql/queries/articles';
import { FileText } from 'lucide-react';
import { gql } from '@apollo/client';

const GET_GRAPHS_QUERY = gql`
  query GetGraphs {
    graphs {
      id
      name
      description
    }
  }
`;

interface CreateArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphId?: string;
}

export function CreateArticleDialog({
  open,
  onOpenChange,
  graphId,
}: CreateArticleDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [selectedGraphId, setSelectedGraphId] = useState(graphId || '');

  // Fetch available graphs
  const { data: graphsData, loading: graphsLoading } = useQuery(GET_GRAPHS_QUERY);

  const [createArticle, { loading }] = useMutation(CREATE_ARTICLE, {
    refetchQueries: [
      {
        query: GET_ARTICLES,
        variables: {
          graphId: selectedGraphId || undefined,
        },
      },
    ],
    onCompleted: (data) => {
      toast({
        title: 'Article Created',
        description: `Your article "${data.createArticle.title}" has been created successfully.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Article',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setNarrative('');
    if (!graphId) {
      setSelectedGraphId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !narrative.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both a title and content for your article.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedGraphId) {
      toast({
        title: 'No Graph Selected',
        description: 'Please select a graph for your article.',
        variant: 'destructive',
      });
      return;
    }

    const input: CreateArticleInput = {
      graphId: selectedGraphId,
      title: title.trim(),
      narrative: narrative.trim(),
    };

    await createArticle({ variables: { input } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Create Article
          </DialogTitle>
          <DialogDescription>
            Write an article to share your research, analysis, or findings. Articles can reference nodes
            in the knowledge graph to support your narrative.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="graph">Graph *</Label>
            <Select
              value={selectedGraphId}
              onValueChange={setSelectedGraphId}
              disabled={loading || graphsLoading || !!graphId}
            >
              <SelectTrigger id="graph">
                <SelectValue placeholder="Select a graph" />
              </SelectTrigger>
              <SelectContent>
                {graphsData?.graphs?.map((graph: any) => (
                  <SelectItem key={graph.id} value={graph.id}>
                    {graph.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Give your article a descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="narrative">Content *</Label>
            <Textarea
              id="narrative"
              placeholder="Write your article content here. You can use markdown formatting..."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              required
              disabled={loading}
              rows={12}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported. You can add headings, lists, links, and more.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> After creating your article, you can edit it to add references to
              specific nodes in the knowledge graph to support your claims.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedGraphId}>
              {loading ? 'Creating...' : 'Create Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
