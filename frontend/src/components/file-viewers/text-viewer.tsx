"use client"

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TextViewerProps {
  content: string;
  fileName: string;
  mimeType: string;
  className?: string;
}

export function TextViewer({ content, fileName, mimeType, className }: TextViewerProps) {
  // Determine language for syntax highlighting based on file extension
  const getLanguage = () => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'jsx':
      case 'tsx':
        return 'tsx';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'sql':
        return 'sql';
      case 'sh':
      case 'bash':
        return 'bash';
      default:
        return 'text';
    }
  };

  const language = getLanguage();

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Header */}
      <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">{mimeType}</p>
        </div>
        {language !== 'text' && (
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
            {language}
          </span>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <pre className="text-sm font-mono">
            <code className={`language-${language}`}>{content}</code>
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
