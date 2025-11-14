"use client";

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadButton, UploadedFile } from '@/components/file-upload-button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string, files: UploadedFile[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Ask anything or search nodes...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!message.trim() && files.length === 0) return;
    if (isLoading || disabled) return;

    onSendMessage(message.trim(), files);
    setMessage('');
    setFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const canSubmit = (message.trim() || files.length > 0) && !isLoading && !disabled;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "flex items-end gap-2 p-4 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-lg",
        "focus-within:border-blue-500/50 transition-colors"
      )}>
        {/* File Upload */}
        <div className="self-start pt-2">
          <FileUploadButton
            files={files}
            onFilesChange={setFiles}
            disabled={disabled || isLoading}
          />
        </div>

        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              "min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-zinc-500"
            )}
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          className={cn(
            "h-10 w-10 flex-shrink-0 self-end",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between px-2 pt-2">
        <p className="text-xs text-zinc-500">
          Press <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs">Enter</kbd> to send,
          <kbd className="ml-1 px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs">Shift + Enter</kbd> for new line
        </p>
        <p className="text-xs text-zinc-500">
          {message.length > 0 && `${message.length} characters`}
        </p>
      </div>
    </form>
  );
}
