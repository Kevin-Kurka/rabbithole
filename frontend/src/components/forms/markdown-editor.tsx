'use client';

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Info } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  disabled = false,
  minHeight = '400px',
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Simple markdown to HTML converter (basic support)
  // Using shared utility


  return (
    <div className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="w-full">
        <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span>Markdown supported</span>
          </div>
        </div>

        <TabsContent value="edit" className="m-0 p-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[400px] border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 p-0">
          <div
            className="p-6 prose prose-sm dark:prose-invert max-w-none overflow-auto"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMarkdown(value), {
                ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'],
                ALLOWED_ATTR: ['href', 'target', 'rel']
              })
            }}
          />
        </TabsContent>
      </Tabs>

      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <p>
          <strong>Quick reference:</strong> **bold**, *italic*, `code`, [link](url), # Heading, - List item
        </p>
      </div>
    </div>
  );
}
