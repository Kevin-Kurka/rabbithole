"use client"

/**
 * Example integration of UniversalFileViewer with node detail pages
 * This shows how to add file viewing capabilities to evidence sections
 */

import { useQuery } from '@apollo/client';
import { useFileViewer } from '@/hooks/use-file-viewer';
import { GET_NODE_FILES } from '@/graphql/file-queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Download,
  Eye,
} from 'lucide-react';
import {
  formatFileSize,
  getFileTypeCategory,
  canPreviewFile,
  FILE_TYPE_CATEGORIES,
} from '@/lib/file-utils';

interface NodeFilesProps {
  nodeId: string;
}

export function NodeFilesIntegration({ nodeId }: NodeFilesProps) {
  const { openFile } = useFileViewer();
  const { data, loading, error } = useQuery(GET_NODE_FILES, {
    variables: { nodeId },
  });

  const getFileIcon = (mimeType: string) => {
    const category = getFileTypeCategory(mimeType);
    switch (category) {
      case FILE_TYPE_CATEGORIES.IMAGE:
        return FileImage;
      case FILE_TYPE_CATEGORIES.VIDEO:
        return FileVideo;
      case FILE_TYPE_CATEGORIES.AUDIO:
        return FileAudio;
      case FILE_TYPE_CATEGORIES.PDF:
      case FILE_TYPE_CATEGORIES.TEXT:
        return FileText;
      default:
        return FileIcon;
    }
  };

  const getFileTypeBadgeColor = (mimeType: string) => {
    const category = getFileTypeCategory(mimeType);
    switch (category) {
      case FILE_TYPE_CATEGORIES.IMAGE:
        return 'bg-blue-500/10 text-blue-500';
      case FILE_TYPE_CATEGORIES.VIDEO:
        return 'bg-purple-500/10 text-purple-500';
      case FILE_TYPE_CATEGORIES.AUDIO:
        return 'bg-green-500/10 text-green-500';
      case FILE_TYPE_CATEGORIES.PDF:
        return 'bg-red-500/10 text-red-500';
      case FILE_TYPE_CATEGORIES.DOCUMENT:
        return 'bg-orange-500/10 text-orange-500';
      case FILE_TYPE_CATEGORIES.TEXT:
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = (file: any) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evidence Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evidence Files</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Error loading files: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const files = data?.nodeFiles || [];

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evidence Files</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No files attached to this node yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Evidence Files ({files.length})</span>
          <Badge variant="secondary">{files.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {files.map((file: any) => {
              const Icon = getFileIcon(file.mimeType);
              const category = getFileTypeCategory(file.mimeType);
              const canPreview = canPreviewFile(file.mimeType);

              return (
                <div
                  key={file.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-1">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={getFileTypeBadgeColor(file.mimeType)}
                          >
                            {category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Upload info */}
                    {file.createdAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Uploaded {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    {canPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openFile(file)}
                        title="View file"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for sidebar or smaller spaces
 */
export function NodeFilesCompact({ nodeId }: NodeFilesProps) {
  const { openFile } = useFileViewer();
  const { data, loading } = useQuery(GET_NODE_FILES, {
    variables: { nodeId },
  });

  if (loading || !data?.nodeFiles?.length) return null;

  const files = data.nodeFiles;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Attached Files ({files.length})</h4>
      <div className="space-y-1">
        {files.map((file: any) => {
          const canPreview = canPreviewFile(file.mimeType);
          return (
            <button
              key={file.id}
              onClick={() => canPreview && openFile(file)}
              disabled={!canPreview}
              className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{file.name}</span>
              {canPreview && <Eye className="h-3 w-3 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
