'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CREATE_FORMAL_INQUIRY, GET_FORMAL_INQUIRIES, type CreateFormalInquiryInput } from '@/graphql/queries/formal-inquiries';
import { Shield, AlertCircle } from 'lucide-react';

interface CreateInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetNodeId?: string;
  targetEdgeId?: string;
  relatedNodeIds?: string[];
}

export function CreateInquiryDialog({
  open,
  onOpenChange,
  targetNodeId,
  targetEdgeId,
  relatedNodeIds = [],
}: CreateInquiryDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const [createInquiry, { loading }] = useMutation(CREATE_FORMAL_INQUIRY, {
    refetchQueries: [
      {
        query: GET_FORMAL_INQUIRIES,
        variables: {
          nodeId: targetNodeId,
          edgeId: targetEdgeId,
        },
      },
    ],
    onCompleted: (data) => {
      toast({
        title: 'Inquiry Created',
        description: `Your formal inquiry "${data.createFormalInquiry.title}" has been created successfully.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContent('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both a title and content for your inquiry.',
        variant: 'destructive',
      });
      return;
    }

    if (!targetNodeId && !targetEdgeId) {
      toast({
        title: 'No Target Selected',
        description: 'Please select a node or edge to create an inquiry for.',
        variant: 'destructive',
      });
      return;
    }

    const input: CreateFormalInquiryInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      content: content.trim(),
      target_node_id: targetNodeId,
      target_edge_id: targetEdgeId,
      related_node_ids: relatedNodeIds.length > 0 ? relatedNodeIds : undefined,
    };

    await createInquiry({ variables: { input } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Create Formal Inquiry
          </DialogTitle>
          <DialogDescription>
            Submit a formal inquiry for evidence-based evaluation. AI will assess the credibility
            based on evidence quality, not community votes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What is your inquiry about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brief Description (Optional)</Label>
            <Input
              id="description"
              placeholder="One-line summary of your inquiry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Detailed Content *</Label>
            <Textarea
              id="content"
              placeholder="Provide detailed explanation of your inquiry, including evidence, reasoning, and methodology..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              disabled={loading}
              rows={8}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Include all relevant evidence, sources, and logical reasoning that supports your inquiry.
            </p>
          </div>

          {relatedNodeIds.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Weakest Link Rule Active
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Your confidence score will be capped by the lowest credibility of the{' '}
                    {relatedNodeIds.length} related node{relatedNodeIds.length !== 1 ? 's' : ''} you've selected.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Your inquiry will be evaluated by AI based solely on evidence quality.
              Community votes (agree/disagree) show opinion but do not affect the confidence score.
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Inquiry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
