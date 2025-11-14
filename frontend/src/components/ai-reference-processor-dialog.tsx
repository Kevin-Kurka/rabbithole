"use client";

import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, AlertCircle, Sparkles, FileText } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// Mock mutation - replace with actual GraphQL mutation
const PROCESS_REFERENCE = gql`
  mutation ProcessReference($input: ProcessReferenceInput!) {
    processReference(input: $input) {
      nodeId
      title
      confidence
      content
      metadata {
        sourceUrl
        scrapedAt
        wordCount
      }
    }
  }
`;

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface AIReferenceProcessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceUrl: string;
  nodeId: string;
  onProcessComplete: (newNode: any) => void;
}

export function AIReferenceProcessorDialog({
  open,
  onOpenChange,
  referenceUrl,
  nodeId,
  onProcessComplete,
}: AIReferenceProcessorDialogProps) {
  const [additionalContext, setAdditionalContext] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [scrapedContent, setScrapedContent] = useState('');
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', label: 'Fetching URL content', status: 'pending' },
    { id: '2', label: 'Extracting text and metadata', status: 'pending' },
    { id: '3', label: 'Analyzing credibility', status: 'pending' },
    { id: '4', label: 'Fact-checking claims', status: 'pending' },
    { id: '5', label: 'Calculating confidence score', status: 'pending' },
    { id: '6', label: 'Creating verified node', status: 'pending' },
  ]);

  const [processReference, { loading: mutationLoading }] = useMutation(PROCESS_REFERENCE);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAdditionalContext('');
      setProcessing(false);
      setProgress(0);
      setCurrentStep(0);
      setScrapedContent('');
      setSteps([
        { id: '1', label: 'Fetching URL content', status: 'pending' },
        { id: '2', label: 'Extracting text and metadata', status: 'pending' },
        { id: '3', label: 'Analyzing credibility', status: 'pending' },
        { id: '4', label: 'Fact-checking claims', status: 'pending' },
        { id: '5', label: 'Calculating confidence score', status: 'pending' },
        { id: '6', label: 'Creating verified node', status: 'pending' },
      ]);
    }
  }, [open]);

  const updateStepStatus = (
    stepIndex: number,
    status: ProcessingStep['status'],
    message?: string
  ) => {
    setSteps((prev) =>
      prev.map((step, idx) =>
        idx === stepIndex ? { ...step, status, message } : step
      )
    );
  };

  const simulateProcessing = async () => {
    setProcessing(true);
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      setCurrentStep(i);
      updateStepStatus(i, 'processing');
      setProgress(((i + 1) / totalSteps) * 100);

      // Simulate API calls with delays
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate scraping content on first step
      if (i === 0) {
        setScrapedContent(`# Sample Content from ${referenceUrl}

This is simulated scraped content. In production, this would be the actual content fetched from the URL.

The content would be analyzed for:
- Credibility signals
- Author credentials
- Source reputation
- Fact-checkable claims
- Citations and references
- Publication date and freshness
`);
      }

      updateStepStatus(i, 'completed', 'Success');
    }

    setProcessing(false);
  };

  const handleProcess = async () => {
    try {
      await simulateProcessing();

      // In production, call the actual mutation:
      // const result = await processReference({
      //   variables: {
      //     input: {
      //       url: referenceUrl,
      //       parentNodeId: nodeId,
      //       additionalContext,
      //     },
      //   },
      // });

      // Mock result for now
      const mockResult = {
        nodeId: `node-${Date.now()}`,
        title: 'Processed Reference Node',
        confidence: 0.85,
        content: scrapedContent,
      };

      onProcessComplete(mockResult);
    } catch (error) {
      console.error('Failed to process reference:', error);
      updateStepStatus(currentStep, 'error', 'Processing failed');
    }
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Reference Processor
          </DialogTitle>
          <DialogDescription>
            Process this external reference to extract information, verify credibility,
            and create a node with a confidence score.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* URL Display */}
          <div className="space-y-2">
            <Label>Reference URL</Label>
            <div className="text-sm text-muted-foreground break-all bg-muted p-2 rounded">
              {referenceUrl}
            </div>
          </div>

          {/* Additional Context */}
          {!processing && progress === 0 && (
            <div className="space-y-2">
              <Label htmlFor="context">
                Additional Context (Optional)
              </Label>
              <Textarea
                id="context"
                placeholder="Provide any additional context or specific aspects you want the AI to focus on when analyzing this reference..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Processing Steps */}
          {(processing || progress > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <ScrollArea className="h-[200px] rounded border p-4">
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="mt-0.5">{getStepIcon(step.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{step.label}</div>
                        {step.message && (
                          <div className="text-xs text-muted-foreground">
                            {step.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Scraped Content Preview */}
              {scrapedContent && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Content Preview
                  </Label>
                  <ScrollArea className="h-[150px] rounded border p-3">
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {scrapedContent}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            {progress === 100 ? 'Close' : 'Cancel'}
          </Button>
          {progress === 0 && (
            <Button
              type="button"
              onClick={handleProcess}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" />
              Process with AI
            </Button>
          )}
          {progress === 100 && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                // Optionally navigate to the new node
              }}
            >
              View New Node
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
