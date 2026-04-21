import { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import type { Claim } from '../lib/types';

interface ClaimHighlighterProps {
  body: string;
  claims: Claim[];
  onMarkClaim: (text: string, start: number, end: number) => void;
  onChallenge: (claimId?: string) => void;
  className?: string;
}

interface FloatingToolbar {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export function ClaimHighlighter({
  body,
  claims,
  onMarkClaim,
  onChallenge,
  className = '',
}: ClaimHighlighterProps) {
  const [toolbar, setToolbar] = useState<FloatingToolbar>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        setToolbar(prev => ({ ...prev, visible: false }));
        return;
      }

      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find the actual character positions in the body text
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(containerRef.current!);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      const start = preCaretRange.toString().length - selectedText.length;
      const end = start + selectedText.length;

      setToolbar({
        visible: true,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 40,
        selectedText,
      });
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  const handleMarkClaim = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerRef.current!);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const start = preCaretRange.toString().length - selectedText.length;
    const end = start + selectedText.length;

    onMarkClaim(selectedText, start, end);
    setToolbar(prev => ({ ...prev, visible: false }));
  };

  const handleChallenge = () => {
    // Check if selected text matches an existing claim
    const selectedText = toolbar.selectedText.toLowerCase();
    const matchingClaim = claims.find(
      c => c.properties.text.toLowerCase() === selectedText
    );

    onChallenge(matchingClaim?.id);
    setToolbar(prev => ({ ...prev, visible: false }));
  };

  return (
    <div ref={containerRef} className={className}>
      <MarkdownRenderer content={body} claims={claims} />

      {toolbar.visible && (
        <div
          className="fixed bg-black border border-crt-border  shadow-lg z-50 flex gap-2 p-2"
          style={{ left: `${toolbar.x}px`, top: `${toolbar.y}px` }}
        >
          <button
            onClick={handleMarkClaim}
            className="px-3 py-1 bg-yellow-500 text-white text-sm  hover:bg-yellow-600 transition-colors"
          >
            Mark as Claim
          </button>
          <button
            onClick={handleChallenge}
            className="px-3 py-1 bg-red-500 text-white text-sm  hover:bg-red-600 transition-colors"
          >
            Challenge
          </button>
        </div>
      )}
    </div>
  );
}
