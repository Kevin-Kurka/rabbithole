"use client"

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentViewerProps {
  content: string;
  fileName: string;
  className?: string;
}

export function DocumentViewer({ content, fileName, className }: DocumentViewerProps) {
  // Determine if content is markdown or plain text
  const isMarkdown = content.includes('#') || content.includes('**') || content.includes('```');

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Header */}
      <div className="p-4 bg-muted/50 border-b">
        <p className="text-sm text-muted-foreground">
          Extracted text from {fileName}
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {content}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
