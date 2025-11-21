"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  FileArchive,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { UPLOAD_EVIDENCE_FILE } from '@/graphql/queries/evidence-files';

// File type constraints
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
};

interface FileWithPreview extends File {
  preview?: string;
  uploadProgress?: number;
  uploadError?: string;
  uploadSuccess?: boolean;
}

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceId: string;
  onUploadComplete?: () => void;
}

const getFileIcon = (file: File) => {
  const type = file.type;
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5" />;
  if (type.includes('zip') || type.includes('archive')) return <FileArchive className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function UploadFileDialog({
  open,
  onOpenChange,
  evidenceId,
  onUploadComplete
}: UploadFileDialogProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMutation] = useMutation(UPLOAD_EVIDENCE_FILE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    return null;
  };

  // Handle file selection
  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);

    // Check total file count
    if (files.length + fileArray.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate and prepare files
    const validFiles: FileWithPreview[] = fileArray
      .map((file) => {
        const error = validateFile(file);
        if (error) {
          return { ...file, uploadError: error } as FileWithPreview;
        }

        // Create preview for images
        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;

        return {
          ...file,
          preview,
          uploadProgress: 0
        } as FileWithPreview;
      });

    setFiles((prev) => [...prev, ...validFiles]);
  }, [files.length]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Remove file from list
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      // Revoke object URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  // Upload single file
  const uploadFile = async (file: FileWithPreview, index: number): Promise<void> => {
    try {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          uploadProgress: 0,
          uploadError: undefined
        };
        return newFiles;
      });

      await uploadMutation({
        variables: {
          evidenceId,
          file,
          isPrimary: index === 0, // First file is primary
        },
        context: {
          fetchOptions: {
            useUpload: true,
          },
        },
      });

      // Mark as successful
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          uploadProgress: 100,
          uploadSuccess: true
        };
        return newFiles;
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          uploadError: error instanceof Error ? error.message : 'Upload failed',
          uploadProgress: 0
        };
        return newFiles;
      });
    }
  };

  // Upload all files
  const handleUploadAll = async () => {
    const filesToUpload = files.filter(f => !f.uploadSuccess && !f.uploadError);

    // Upload files sequentially (could be parallelized)
    for (let i = 0; i < files.length; i++) {
      if (!files[i].uploadSuccess && !files[i].uploadError) {
        await uploadFile(files[i], i);
      }
    }

    // Check if all uploads were successful
    const allSuccessful = files.every(f => f.uploadSuccess);
    if (allSuccessful) {
      onUploadComplete?.();
      // Reset after short delay
      setTimeout(() => {
        setFiles([]);
        onOpenChange(false);
      }, 1000);
    }
  };

  // Clean up previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const hasValidFiles = files.some(f => !f.uploadError);
  const allUploaded = files.length > 0 && files.every(f => f.uploadSuccess);
  const isUploading = files.some(f => f.uploadProgress !== undefined && f.uploadProgress > 0 && !f.uploadSuccess);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Evidence Files</DialogTitle>
          <DialogDescription>
            Upload images, documents, or videos as evidence. Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
              }
            `}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, images, videos, documents (max {formatFileSize(MAX_FILE_SIZE)})
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Files ({files.length}/{MAX_FILES})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    {/* File Icon or Preview */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                          {getFileIcon(file)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                        {index === 0 && ' (Primary)'}
                      </p>

                      {/* Progress Bar */}
                      {file.uploadProgress !== undefined && file.uploadProgress > 0 && !file.uploadSuccess && (
                        <Progress value={file.uploadProgress} className="mt-2 h-1" />
                      )}

                      {/* Error Message */}
                      {file.uploadError && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                          <AlertCircle className="w-3 h-3" />
                          <span>{file.uploadError}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {file.uploadSuccess ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : file.uploadProgress !== undefined && file.uploadProgress > 0 ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          disabled={isUploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {files.length > 0 && (
              <>
                {allUploaded ? (
                  <span className="text-green-500">All files uploaded successfully!</span>
                ) : (
                  <span>
                    {files.filter(f => f.uploadSuccess).length} of {files.length} uploaded
                  </span>
                )}
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                onOpenChange(false);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAll}
              disabled={!hasValidFiles || allUploaded || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
