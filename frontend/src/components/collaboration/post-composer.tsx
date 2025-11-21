"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { CREATE_POST, REPLY_TO_POST, NodeSearchResult } from '@/graphql/queries/activity';
import { NodeLinkCombobox, NodeMentionCombobox } from '@/components/shared';
import { UploadFileDialog } from '@/components/forms';

interface PostComposerProps {
  targetNodeId: string;
  parentPostId?: string;
  user?: {
    name?: string;
    email: string;
    image?: string;
  };
  onPostCreated?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function PostComposer({
  targetNodeId,
  parentPostId,
  user,
  onPostCreated,
  placeholder = "Share your thoughts...",
  autoFocus = false,
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [linkedNodes, setLinkedNodes] = useState<NodeSearchResult[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [createPost, { loading: createLoading }] = useMutation(CREATE_POST);
  const [replyToPost, { loading: replyLoading }] = useMutation(REPLY_TO_POST);

  const loading = createLoading || replyLoading;

  // Detect @ mentions
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const checkForMention = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
        // Check if there's a space after @ (which would close the mention)
        if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
          setMentionPosition(lastAtSymbol);
          setMentionOpen(true);
          return;
        }
      }
      setMentionOpen(false);
    };

    checkForMention();
  }, [content]);

  const handleMentionSelect = useCallback(
    (node: NodeSearchResult) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const beforeMention = content.substring(0, mentionPosition);
      const afterCursor = content.substring(textarea.selectionStart);
      const newContent = `${beforeMention}@${node.title} ${afterCursor}`;

      setContent(newContent);
      setMentionOpen(false);

      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPos = beforeMention.length + node.title.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    },
    [content, mentionPosition]
  );

  const handleSubmit = async () => {
    if (!content.trim() && linkedNodes.length === 0 && uploadedFileIds.length === 0) {
      return;
    }

    try {
      // Extract mentioned node IDs from linked nodes
      const mentionedNodeIds = linkedNodes.map((n) => n.id);

      const input = {
        content: content.trim(),
        mentionedNodeIds,
        attachmentIds: uploadedFileIds,
        ...(parentPostId ? { parentPostId } : { nodeId: targetNodeId }),
      };

      if (parentPostId) {
        await replyToPost({
          variables: {
            input: {
              parentPostId,
              content: content.trim(),
              mentionedNodeIds,
              attachmentIds: uploadedFileIds,
            },
          },
        });
      } else {
        await createPost({
          variables: {
            input: {
              nodeId: targetNodeId,
              content: content.trim(),
              mentionedNodeIds,
              attachmentIds: uploadedFileIds,
            },
          },
        });
      }

      // Reset form
      setContent('');
      setLinkedNodes([]);
      setUploadedFileIds([]);
      onPostCreated?.();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleUploadComplete = (fileId: string) => {
    setUploadedFileIds((prev) => [...prev, fileId]);
    setUploadDialogOpen(false);
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={user?.image || undefined} />
        <AvatarFallback>
          {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] pr-12 resize-none"
            autoFocus={autoFocus}
          />

          {/* Send Button - Icon Only */}
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && linkedNodes.length === 0 && uploadedFileIds.length === 0)}
            className="absolute bottom-2 right-2 h-8 w-8"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mt-2">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUploadDialogOpen(true)}
            className="h-8 w-8"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Node Link Combobox */}
          <NodeLinkCombobox selectedNodes={linkedNodes} onNodesChange={setLinkedNodes} />

          {/* Character Count */}
          <div className="ml-auto text-xs text-muted-foreground">
            {text.length > 0 && `${text.length} characters`}
          </div>
        </div>

        {/* File Upload Count */}
        {uploadedFileIds.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {uploadedFileIds.length} file{uploadedFileIds.length > 1 ? 's' : ''} attached
          </div>
        )}
      </div>

      {/* Mention Combobox */}
      <NodeMentionCombobox
        open={mentionOpen}
        onOpenChange={setMentionOpen}
        onSelect={handleMentionSelect}
        anchorEl={textareaRef.current}
      />

      {/* Upload Dialog */}
      <UploadFileDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        evidenceId={targetNodeId}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
