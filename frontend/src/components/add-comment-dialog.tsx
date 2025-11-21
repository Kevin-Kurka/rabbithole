"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';

interface AddCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  nodeId: string;
  onCommentAdded?: () => void;
}

export function AddCommentDialog({
  open,
  onOpenChange,
  selectedText,
  nodeId,
  onCommentAdded,
}: AddCommentDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement GraphQL mutation to add comment with citation
      console.log('Adding comment with citation:', {
        nodeId,
        comment,
        citation: selectedText,
      });

      // Reset and close
      setComment('');
      onOpenChange(false);
      onCommentAdded?.();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Add Comment with Citation
          </DialogTitle>
          <DialogDescription>
            Add a comment referencing the selected text. The citation will link back to the
            original location in the article.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Text Citation */}
          <div className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded">
            <div className="text-xs text-muted-foreground mb-1">Selected Text:</div>
            <p className="text-sm italic">&ldquo;{selectedText}&rdquo;</p>
          </div>

          {/* Comment Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Comment</label>
            <Textarea
              placeholder="Enter your comment about this selection..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!comment.trim() || isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
