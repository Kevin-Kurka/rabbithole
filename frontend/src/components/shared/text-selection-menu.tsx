"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TextSelectionMenuProps {
  onComment: (selectedText: string, selection: Selection) => void;
  onInquiry: (selectedText: string, selection: Selection) => void;
  containerId?: string;
}

export function TextSelectionMenu({
  onComment,
  onInquiry,
  containerId = 'article-content',
}: TextSelectionMenuProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setShowMenu(false);
      setSelection(null);
      setSelectedText('');
      setMenuPosition(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length === 0) {
      setShowMenu(false);
      return;
    }

    // Check if selection is within our container
    const container = document.getElementById(containerId);
    if (!container) return;

    const range = sel.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const isWithinContainer =
      ancestor === container ||
      (ancestor.nodeType === Node.ELEMENT_NODE
        ? container.contains(ancestor as Element)
        : ancestor.parentNode && container.contains(ancestor.parentNode as Element));

    if (!isWithinContainer) {
      setShowMenu(false);
      return;
    }

    // Get position for menu
    const rect = range.getBoundingClientRect();
    const menuTop = rect.bottom + window.scrollY + 8;
    const menuLeft = rect.left + window.scrollX + rect.width / 2;

    setSelection(sel);
    setSelectedText(text);
    setMenuPosition({ top: menuTop, left: menuLeft });
    setShowMenu(true);
  }, [containerId]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleComment = () => {
    if (selection && selectedText) {
      onComment(selectedText, selection);
      setShowMenu(false);
    }
  };

  const handleInquiry = () => {
    if (selection && selectedText) {
      onInquiry(selectedText, selection);
      setShowMenu(false);
    }
  };

  if (!showMenu || !menuPosition) {
    return null;
  }

  return (
    <div
      className="fixed z-50 flex gap-1 p-1 bg-card border rounded-md shadow-lg"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 h-8 text-xs"
        onClick={handleComment}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Comment
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 h-8 text-xs"
        onClick={handleInquiry}
      >
        <Target className="w-3.5 h-3.5" />
        Inquiry
      </Button>
    </div>
  );
}
