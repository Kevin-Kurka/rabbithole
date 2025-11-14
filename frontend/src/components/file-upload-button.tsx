"use client";

import React, { useRef } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  preview?: string;
}

interface FileUploadButtonProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
}

export function FileUploadButton({
  files,
  onFilesChange,
  maxFiles = 5,
  accept = "image/*,.pdf,.txt,.md,.doc,.docx",
  disabled = false,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  const processFiles = async (selectedFiles: File[]) => {
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = await Promise.all(
      selectedFiles.map(async (file) => {
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const preview = await readFileAsDataURL(file);
          return { file, preview };
        }
        return { file };
      })
    );

    onFilesChange([...files, ...newFiles]);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Upload Button */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= maxFiles}
        className="h-9 w-9"
      >
        <Paperclip className="w-4 h-4" />
      </Button>

      {/* File List */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg",
                "hover:bg-zinc-700/50 transition-colors"
              )}
            >
              {/* Preview or Icon */}
              {uploadedFile.preview ? (
                <img
                  src={uploadedFile.preview}
                  alt={uploadedFile.file.name}
                  className="w-8 h-8 object-cover rounded"
                />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center bg-zinc-700/50 rounded">
                  {getFileIcon(uploadedFile.file.name)}
                </div>
              )}

              {/* File Info */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-zinc-200 truncate max-w-[200px]">
                  {uploadedFile.file.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatFileSize(uploadedFile.file.size)}
                </span>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-2 p-1 rounded-full hover:bg-zinc-600/50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
