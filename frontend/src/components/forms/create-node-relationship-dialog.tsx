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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { NodeSearchResult } from '@/graphql/queries/activity';

interface CreateNodeRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNode: {
    id: string;
    title: string;
  };
  targetNode: NodeSearchResult;
  onCreateRelationship: (description: string) => Promise<void>;
}

export function CreateNodeRelationshipDialog({
  open,
  onOpenChange,
  sourceNode,
  targetNode,
  onCreateRelationship,
}: CreateNodeRelationshipDialogProps) {
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedType, setSuggestedType] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsProcessing(true);
    try {
      await onCreateRelationship(description);
      setDescription('');
      setSuggestedType(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating relationship:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim()) return;

    setIsProcessing(true);
    try {
      // TODO: Call AI service to determine edge type
      // For now, using simple keyword matching
      const lowerDesc = description.toLowerCase();
      let type = 'related';

      if (lowerDesc.includes('cause') || lowerDesc.includes('led to') || lowerDesc.includes('resulted in')) {
        type = 'causes';
      } else if (lowerDesc.includes('support') || lowerDesc.includes('evidence') || lowerDesc.includes('proves')) {
        type = 'supports';
      } else if (lowerDesc.includes('contradict') || lowerDesc.includes('refute') || lowerDesc.includes('disproves')) {
        type = 'contradicts';
      } else if (lowerDesc.includes('similar') || lowerDesc.includes('like') || lowerDesc.includes('same as')) {
        type = 'similar_to';
      } else if (lowerDesc.includes('part of') || lowerDesc.includes('component') || lowerDesc.includes('belongs to')) {
        type = 'part_of';
      } else if (lowerDesc.includes('temporal') || lowerDesc.includes('before') || lowerDesc.includes('after')) {
        type = 'temporal';
      } else if (lowerDesc.includes('cites') || lowerDesc.includes('references') || lowerDesc.includes('quoted')) {
        type = 'cites';
      }

      setSuggestedType(type);
    } catch (error) {
      console.error('Error analyzing relationship:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      causes: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      supports: 'bg-green-500/10 text-green-500 border-green-500/20',
      contradicts: 'bg-red-500/10 text-red-500 border-red-500/20',
      similar_to: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      part_of: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      temporal: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      cites: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      related: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return colors[type] || colors.related;
  };

  const formatTypeName = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Describe Relationship</DialogTitle>
          <DialogDescription>
            Describe how these nodes are related. AI will determine the relationship type.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Node Connection Visual */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 text-sm">
                <div className="font-medium">{sourceNode.title}</div>
                <div className="text-xs text-muted-foreground">Source</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <div className="font-medium">{targetNode.title}</div>
                <div className="text-xs text-muted-foreground">Target</div>
              </div>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description">Relationship Description</Label>
              <Textarea
                id="description"
                placeholder="Describe how these nodes relate to each other... (e.g., 'This evidence supports the claim because...', 'This event caused the outcome by...')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Use natural language to describe the relationship
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={!description.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-2" />
                  )}
                  Analyze
                </Button>
              </div>
            </div>

            {/* AI-Suggested Type */}
            {suggestedType && (
              <div className="space-y-2">
                <Label>AI-Suggested Relationship Type</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getTypeColor(suggestedType)}>
                    {formatTypeName(suggestedType)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Based on your description
                  </p>
                </div>
              </div>
            )}

            {/* Common Relationship Types */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Common Types</Label>
              <div className="flex flex-wrap gap-2">
                {['supports', 'contradicts', 'causes', 'similar_to', 'part_of', 'cites'].map(
                  (type) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className={`text-xs cursor-help ${getTypeColor(type)}`}
                      title={`Use words like: ${getTypeExamples(type)}`}
                    >
                      {formatTypeName(type)}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!description.trim() || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Relationship'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getTypeExamples(type: string): string {
  const examples: Record<string, string> = {
    supports: 'supports, evidence for, proves, validates',
    contradicts: 'contradicts, refutes, disproves, conflicts with',
    causes: 'causes, leads to, results in, triggers',
    similar_to: 'similar to, like, resembles, comparable to',
    part_of: 'part of, component of, belongs to, contained in',
    cites: 'cites, references, quotes, mentions',
  };
  return examples[type] || 'related to';
}
