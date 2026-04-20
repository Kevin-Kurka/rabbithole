import { useRef, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export function MarkdownEditor({ value, onChange, placeholder = 'Enter markdown...', height = 400 }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="w-full border rounded-lg overflow-hidden">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview="live"
        hideToolbar={false}
        visibleDragbar={true}
        height={height}
        textareaProps={{ placeholder }}
        className="w-full"
      />
    </div>
  );
}
