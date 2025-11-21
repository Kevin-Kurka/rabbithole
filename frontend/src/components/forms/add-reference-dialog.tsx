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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Reference {
  id: string;
  title: string;
  url: string;
  confidence?: number;
  type: 'reference' | 'citation';
}

interface AddReferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  type: 'reference' | 'citation';
  onAdd: (reference: Reference) => void;
}

export function AddReferenceDialog({
  open,
  onOpenChange,
  nodeId,
  type,
  onAdd,
}: AddReferenceDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  const handleFetchMetadata = async () => {
    if (!url) return;

    setFetchingMetadata(true);
    try {
      // TODO: Implement actual metadata fetching
      // For now, extract domain as title
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname.split('/').filter(Boolean).join(' - ');
      setTitle(path || domain);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !title) return;

    setLoading(true);
    try {
      // TODO: Implement actual GraphQL mutation
      const newReference: Reference = {
        id: `temp-${Date.now()}`,
        title,
        url,
        type,
      };

      onAdd(newReference);

      // Reset form
      setUrl('');
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Failed to add reference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlBlur = () => {
    if (url && !title) {
      handleFetchMetadata();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Add {type === 'reference' ? 'Reference' : 'Citation'}
          </DialogTitle>
          <DialogDescription>
            Enter the URL and details for this {type === 'reference' ? 'reference' : 'citation'}.
            The AI can process it to extract information and create a verified node.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title *
                {fetchingMetadata && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Fetching...)
                  </span>
                )}
              </Label>
              <Input
                id="title"
                placeholder="Article or document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={fetchingMetadata}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description or notes about this reference"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              * After adding, you can click the sparkle icon to process this {type}
              with AI and create a verified node with a confidence score.
            </div>
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
            <Button type="submit" disabled={loading || !url || !title}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {type === 'reference' ? 'Reference' : 'Citation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
