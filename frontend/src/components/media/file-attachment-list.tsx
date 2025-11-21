"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  FileArchive,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GET_EVIDENCE_FILES,
  GET_FILE_DOWNLOAD_URL,
  DELETE_EVIDENCE_FILE,
  type EvidenceFile
} from '@/graphql/queries/evidence-files';

interface FileAttachmentListProps {
  evidenceId: string;
  onFileDeleted?: () => void;
}

const getFileIcon = (fileType: string, mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  if (mimeType.startsWith('video/')) return <Film className="w-5 h-5" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function FileAttachmentList({ evidenceId, onFileDeleted }: FileAttachmentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<EvidenceFile | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Fetch evidence files
  const { data, loading, error, refetch } = useQuery(GET_EVIDENCE_FILES, {
    variables: { evidenceId },
    skip: !evidenceId,
  });

  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_EVIDENCE_FILE, {
    onCompleted: () => {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      refetch();
      onFileDeleted?.();
    },
  });

  // Handle file download
  const handleDownload = async (file: EvidenceFile) => {
    try {
      setDownloadingFileId(file.id);

      // Get signed download URL
      const response = await fetch(
        process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || 'http://localhost:4000/graphql',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GetFileDownloadUrl($fileId: ID!) {
                getFileDownloadUrl(fileId: $fileId)
              }
            `,
            variables: { fileId: file.id },
          }),
        }
      );

      const result = await response.json();
      const downloadUrl = result.data?.getFileDownloadUrl;

      if (downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.original_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Handle file deletion
  const handleDelete = async () => {
    if (!fileToDelete) return;

    await deleteMutation({
      variables: {
        fileId: fileToDelete.id,
        reason: 'User requested deletion',
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertCircle className="w-4 h-4" />
        <span>Failed to load files: {error.message}</span>
      </div>
    );
  }

  const files: EvidenceFile[] = data?.getEvidenceFiles || [];

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No files attached
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.id} className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0">
                  {file.has_preview && file.thumbnail_storage_key ? (
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                      {/* Thumbnail would be loaded here */}
                      <div className="w-full h-full flex items-center justify-center">
                        {getFileIcon(file.file_type, file.mime_type)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(file.file_type, file.mime_type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {file.original_filename}
                        {file.is_primary && (
                          <span className="ml-2 text-xs text-primary">(Primary)</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{file.file_extension.toUpperCase()}</span>
                        <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
                      </div>

                      {/* Metadata */}
                      {file.dimensions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {file.dimensions.width} x {file.dimensions.height}
                        </p>
                      )}

                      {/* Download count */}
                      {file.download_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {file.download_count} download{file.download_count !== 1 ? 's' : ''}
                        </p>
                      )}

                      {/* Virus scan status */}
                      {file.virus_scan_status === 'infected' && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                          <AlertCircle className="w-3 h-3" />
                          <span>Security warning</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        disabled={
                          downloadingFileId === file.id ||
                          file.virus_scan_status === 'infected'
                        }
                        title="Download file"
                      >
                        {downloadingFileId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFileToDelete(file);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Processing status */}
                  {file.processing_status === 'processing' && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {fileToDelete?.original_filename}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFileToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
