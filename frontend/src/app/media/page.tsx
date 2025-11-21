"use client";

import * as React from "react";
import { useQuery } from "@apollo/client";
import {
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Upload,
  Search,
  Filter,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUploadDialog } from "@/components/media/media-upload-dialog";
import { MediaProcessingStatus } from "@/components/media/media-processing-status";
import {
  GET_MEDIA_FILES,
  SEARCH_MEDIA_CONTENT,
} from "@/graphql/queries/media-processing";
import { cn } from "@/lib/utils";

interface MediaFile {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  type: "document" | "audio" | "video" | "image";
  uploadedAt: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  thumbnailUrl?: string;
}

const FILE_TYPE_ICONS = {
  document: FileText,
  audio: Music,
  video: Video,
  image: ImageIcon,
};

const STATUS_ICONS = {
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLORS = {
  queued: "text-yellow-500",
  processing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MediaPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: filesData,
    loading: filesLoading,
    refetch: refetchFiles,
  } = useQuery(GET_MEDIA_FILES, {
    variables: {
      filter: typeFilter !== "all" ? { type: typeFilter } : undefined,
      limit: 50,
      offset: 0,
    },
    pollInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: searchData, loading: searchLoading } = useQuery(
    SEARCH_MEDIA_CONTENT,
    {
      variables: {
        query: debouncedSearch,
        type: typeFilter !== "all" ? typeFilter : undefined,
        limit: 20,
      },
      skip: !debouncedSearch,
    }
  );

  const files: MediaFile[] = debouncedSearch
    ? searchData?.searchMediaContent || []
    : filesData?.getMediaFiles?.files || [];

  const isLoading = debouncedSearch ? searchLoading : filesLoading;

  const handleUploadComplete = (fileId: string) => {
    refetchFiles();
    setSelectedFileId(fileId);
  };

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(selectedFileId === fileId ? null : fileId);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Upload and process documents, audio, video, and images
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="image">Images</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selected file status */}
      {selectedFileId && (
        <div className="mb-6">
          <MediaProcessingStatus
            fileId={selectedFileId}
            autoRefresh={true}
            onClose={() => setSelectedFileId(null)}
          />
        </div>
      )}

      {/* Files grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No files uploaded yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {debouncedSearch
                ? "No files match your search"
                : "Get started by uploading your first file"}
            </p>
            {!debouncedSearch && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => {
            const FileIcon = FILE_TYPE_ICONS[file.type];
            const StatusIcon = STATUS_ICONS[file.status];
            const isSelected = selectedFileId === file.fileId;

            return (
              <Card
                key={file.fileId}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => handleFileClick(file.fileId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate" title={file.filename}>
                        {file.filename}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {file.type}
                        </Badge>
                        <span className="text-xs">{formatFileSize(file.size)}</span>
                      </CardDescription>
                    </div>
                    <StatusIcon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        STATUS_COLORS[file.status],
                        file.status === "processing" && "animate-spin"
                      )}
                    />
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  {/* Thumbnail */}
                  {file.thumbnailUrl ? (
                    <div className="aspect-video bg-muted rounded overflow-hidden mb-3">
                      <img
                        src={file.thumbnailUrl}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded flex items-center justify-center mb-3">
                      <FileIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Status info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{file.status}</span>
                      {file.status === "processing" && (
                        <span className="font-medium">{file.progress}%</span>
                      )}
                    </div>
                    {file.status === "processing" && (
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 text-xs text-muted-foreground">
                  {formatDate(file.uploadedAt)}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Total count */}
      {files.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {files.length} {files.length === 1 ? "file" : "files"}
          {filesData?.getMediaFiles?.total && files.length < filesData.getMediaFiles.total && (
            <span> of {filesData.getMediaFiles.total}</span>
          )}
        </div>
      )}

      {/* Upload dialog */}
      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
