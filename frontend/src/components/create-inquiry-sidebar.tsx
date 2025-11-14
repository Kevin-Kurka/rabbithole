'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CREATE_FORMAL_INQUIRY, GET_FORMAL_INQUIRIES, type CreateFormalInquiryInput } from '@/graphql/queries/formal-inquiries';
import { X, Upload, FileText, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateInquirySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetNodeId?: string;
  targetEdgeId?: string;
  relatedNodeIds?: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export function CreateInquirySidebar({
  open,
  onOpenChange,
  targetNodeId,
  targetEdgeId,
  relatedNodeIds = [],
}: CreateInquirySidebarProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [createInquiry, { loading }] = useMutation(CREATE_FORMAL_INQUIRY, {
    refetchQueries: [
      {
        query: GET_FORMAL_INQUIRIES,
        variables: {
          nodeId: targetNodeId,
          edgeId: targetEdgeId,
        },
      },
    ],
    onCompleted: (data) => {
      toast({
        title: 'Inquiry Created',
        description: `Your formal inquiry "${data.createFormalInquiry.title}" has been created successfully.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setUploadedFiles([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both a title and content for your inquiry.',
        variant: 'destructive',
      });
      return;
    }

    if (!targetNodeId && !targetEdgeId) {
      toast({
        title: 'No Target Selected',
        description: 'Please select a node or edge to create an inquiry for.',
        variant: 'destructive',
      });
      return;
    }

    const input: CreateFormalInquiryInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      content: content.trim(),
      target_node_id: targetNodeId,
      target_edge_id: targetEdgeId,
      related_node_ids: relatedNodeIds.length > 0 ? relatedNodeIds : undefined,
    };

    // TODO: Handle file uploads - send to backend storage
    // For now, files are collected but not yet sent to the backend
    // This will require additional backend API endpoints for file storage

    await createInquiry({ variables: { input } });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] bg-background border-l-2 shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2">
            <div>
              <h2 className="text-xl font-semibold">Create Formal Inquiry</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Submit evidence-based inquiry for evaluation
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form Content - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="What is your inquiry about?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Brief Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="One-line summary of your inquiry"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Detailed Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Provide detailed explanation of your inquiry, including evidence, reasoning, and methodology..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={loading}
                  rows={12}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Include all relevant evidence, sources, and logical reasoning that supports your inquiry.
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="files">Supporting Files (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="files"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <label
                    htmlFor="files"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Click to upload files</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDFs, images, documents, etc.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 border-2 rounded-lg bg-muted"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeFile(file.id)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="border-t-2 p-6 bg-muted">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Inquiry'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
