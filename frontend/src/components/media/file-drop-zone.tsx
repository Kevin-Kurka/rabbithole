"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMutation, gql } from '@apollo/client';

const UPLOAD_FILES_MUTATION = gql`
  mutation UploadFiles($files: [Upload!]!, $nodeId: ID, $description: String) {
    uploadFiles(files: $files, nodeId: $nodeId, description: $description) {
      id
      filename
      mimetype
      size
      url
    }
  }
`;

export interface UploadedFileInfo {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
}

interface FileDropZoneProps {
  nodeId?: string;
  onUploadComplete?: (files: UploadedFileInfo[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  className?: string;
}

export function FileDropZone({
  nodeId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxSize = 104857600, // 100MB
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'audio/*': ['.mp3', '.wav', '.ogg'],
    'video/*': ['.mp4', '.webm', '.mov'],
  },
  className,
}: FileDropZoneProps) {
  const [uploadFiles, { loading }] = useMutation(UPLOAD_FILES_MUTATION);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setErrors([]);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const newErrors = rejectedFiles.map(({ file, errors }) => {
        const errorMessages = errors.map((e: any) => {
          if (e.code === 'file-too-large') {
            return `${file.name}: File is too large (max ${maxSize / 1024 / 1024}MB)`;
          }
          if (e.code === 'file-invalid-type') {
            return `${file.name}: Invalid file type`;
          }
          return `${file.name}: ${e.message}`;
        });
        return errorMessages.join(', ');
      });
      setErrors(newErrors);
    }

    // Add accepted files
    if (acceptedFiles.length > 0) {
      setSelectedFiles((prev) => {
        const combined = [...prev, ...acceptedFiles];
        if (combined.length > maxFiles) {
          setErrors((prevErrors) => [
            ...prevErrors,
            `Maximum ${maxFiles} files allowed. Some files were not added.`,
          ]);
          return combined.slice(0, maxFiles);
        }
        return combined;
      });
    }
  }, [maxFiles, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setErrors([]);
      setUploadProgress(0);

      const { data } = await uploadFiles({
        variables: {
          files: selectedFiles,
          nodeId,
          description: `Uploaded ${selectedFiles.length} file(s)`,
        },
      });

      setUploadProgress(100);

      if (onUploadComplete && data?.uploadFiles) {
        onUploadComplete(data.uploadFiles);
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors([errorMessage]);
      if (onUploadError) {
        onUploadError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
          isDragActive
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} disabled={loading} />
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <Upload
            className={cn(
              "w-12 h-12 transition-colors",
              isDragActive ? "text-blue-500" : "text-zinc-500"
            )}
          />
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {isDragActive ? "Drop files here..." : "Drag & drop files here"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              or click to browse (max {maxFiles} files, {maxSize / 1024 / 1024}MB each)
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            Supported: Images, PDFs, Documents, Audio, Video
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-300">
              Selected Files ({selectedFiles.length})
            </h4>
            <Button
              onClick={handleUpload}
              disabled={loading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
            </Button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <File className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={loading}
                  className="p-1 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {loading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Uploading...</span>
            <span className="text-zinc-300">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
