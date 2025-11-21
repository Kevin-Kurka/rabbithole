'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Info } from 'lucide-react';

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
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return '<p class="text-muted-foreground italic">Nothing to preview</p>';

    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="text-sm font-mono">$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gim, '<li class="ml-6 list-disc">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li class="ml-6 list-disc">$1</li>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-6 list-decimal">$1</li>');

    // Paragraphs (split by double newline)
    const paragraphs = html.split('\n\n');
    html = paragraphs
      .map((p) => {
        // Don't wrap if already a block element
        if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<li')) {
          return p;
        }
        return `<p class="mb-4 leading-relaxed">${p.replace(/\n/g, '<br />')}</p>`;
      })
      .join('');

    return html;
  };

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
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
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
