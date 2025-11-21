"use client";

import * as React from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
  X,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Table,
  FileImage,
  ListOrdered,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  GET_MEDIA_PROCESSING_STATUS,
  GET_MEDIA_FILE_DETAILS,
} from "@/graphql/queries/media-processing";
import {
  CANCEL_PROCESSING_JOB,
  RETRY_PROCESSING_JOB,
} from "@/graphql/mutations/media-processing";

interface MediaProcessingStatusProps {
  fileId: string;
  autoRefresh?: boolean;
  onClose?: () => void;
}

type ProcessingStatus = "queued" | "processing" | "completed" | "failed";

interface ProcessingResult {
  extractedText?: string;
  tableCount?: number;
  figureCount?: number;
  sectionCount?: number;
  transcript?: string;
  language?: string;
  duration?: number;
  frameCount?: number;
  sceneCount?: number;
  ocrText?: string;
  tables?: Array<{ content: string; page: number }>;
  figures?: Array<{ url: string; caption?: string }>;
  sections?: Array<{ title: string; level: number; content: string }>;
  frames?: Array<{ url: string; timestamp: number }>;
  scenes?: Array<{ startTime: number; endTime: number; description?: string }>;
}

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

const STATUS_BG_COLORS = {
  queued: "bg-yellow-500/10",
  processing: "bg-blue-500/10",
  completed: "bg-green-500/10",
  failed: "bg-red-500/10",
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatTimestamp(timestamp: number): string {
  const hours = Math.floor(timestamp / 3600);
  const minutes = Math.floor((timestamp % 3600) / 60);
  const seconds = Math.floor(timestamp % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MediaProcessingStatus({
  fileId,
  autoRefresh = true,
  onClose,
}: MediaProcessingStatusProps) {
  const [showFullContent, setShowFullContent] = React.useState(false);

  const {
    data: statusData,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery(GET_MEDIA_PROCESSING_STATUS, {
    variables: { fileId },
    pollInterval: autoRefresh ? 2000 : 0,
    skip: !fileId,
  });

  const { data: detailsData } = useQuery(GET_MEDIA_FILE_DETAILS, {
    variables: { fileId },
    skip: !fileId,
  });

  const [cancelJob] = useMutation(CANCEL_PROCESSING_JOB);
  const [retryJob] = useMutation(RETRY_PROCESSING_JOB);

  const status: ProcessingStatus =
    statusData?.getMediaProcessingStatus?.status || "queued";
  const progress = statusData?.getMediaProcessingStatus?.progress || 0;
  const result: ProcessingResult | undefined =
    statusData?.getMediaProcessingStatus?.result;
  const error = statusData?.getMediaProcessingStatus?.error;
  const processingTime = statusData?.getMediaProcessingStatus?.processingTime;
  const fileDetails = detailsData?.getMediaFileDetails;

  const StatusIcon = STATUS_ICONS[status];

  const handleCancel = async () => {
    try {
      await cancelJob({ variables: { fileId } });
      refetchStatus();
    } catch (err) {
      console.error("Failed to cancel job:", err);
    }
  };

  const handleRetry = async () => {
    try {
      await retryJob({ variables: { fileId } });
      refetchStatus();
    } catch (err) {
      console.error("Failed to retry job:", err);
    }
  };

  const handleDownload = () => {
    if (fileDetails?.downloadUrl) {
      window.open(fileDetails.downloadUrl, "_blank");
    }
  };

  if (statusLoading && !statusData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center text-destructive">
            <XCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">Failed to load processing status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <StatusIcon
                className={cn(
                  "h-5 w-5",
                  STATUS_COLORS[status],
                  status === "processing" && "animate-spin"
                )}
              />
              {fileDetails?.filename || "Processing Media"}
            </CardTitle>
            <CardDescription className="mt-1">
              {fileDetails?.type && (
                <Badge variant="secondary" className="mr-2">
                  {fileDetails.type}
                </Badge>
              )}
              {status === "queued" && "Waiting in queue..."}
              {status === "processing" && `Processing... ${progress}%`}
              {status === "completed" && "Processing completed"}
              {status === "failed" && "Processing failed"}
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        {(status === "processing" || status === "queued") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Processing time */}
        {processingTime && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            Processing time: {formatDuration(processingTime)}
          </div>
        )}

        {/* Error message */}
        {status === "failed" && error && (
          <div className={cn("p-3 rounded text-sm", STATUS_BG_COLORS.failed)}>
            <p className="font-medium text-destructive">Error:</p>
            <p className="text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {/* Results preview */}
        {status === "completed" && result && (
          <div className="space-y-4">
            <Separator />

            {/* Document results */}
            {result.extractedText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Extracted Text
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullContent(!showFullContent)}
                  >
                    {showFullContent ? "Show less" : "Show more"}
                  </Button>
                </div>
                <div
                  className={cn(
                    "text-sm text-muted-foreground bg-muted/50 p-3 rounded",
                    !showFullContent && "max-h-32 overflow-hidden"
                  )}
                >
                  {result.extractedText}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {result.tableCount !== undefined && result.tableCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Table className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {result.tableCount} {result.tableCount === 1 ? "table" : "tables"}
                  </span>
                </div>
              )}
              {result.figureCount !== undefined && result.figureCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {result.figureCount} {result.figureCount === 1 ? "figure" : "figures"}
                  </span>
                </div>
              )}
              {result.sectionCount !== undefined && result.sectionCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {result.sectionCount}{" "}
                    {result.sectionCount === 1 ? "section" : "sections"}
                  </span>
                </div>
              )}
              {result.frameCount !== undefined && result.frameCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {result.frameCount} {result.frameCount === 1 ? "frame" : "frames"}
                  </span>
                </div>
              )}
              {result.sceneCount !== undefined && result.sceneCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {result.sceneCount} {result.sceneCount === 1 ? "scene" : "scenes"}
                  </span>
                </div>
              )}
              {result.duration !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(result.duration)}</span>
                </div>
              )}
            </div>

            {/* Audio transcript */}
            {result.transcript && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Transcript
                  {result.language && (
                    <Badge variant="outline" className="ml-2">
                      {result.language}
                    </Badge>
                  )}
                </h4>
                <div
                  className={cn(
                    "text-sm text-muted-foreground bg-muted/50 p-3 rounded",
                    !showFullContent && "max-h-32 overflow-hidden"
                  )}
                >
                  {result.transcript}
                </div>
              </div>
            )}

            {/* Video frames */}
            {result.frames && result.frames.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Extracted Frames</h4>
                <div className="grid grid-cols-3 gap-2">
                  {result.frames.slice(0, showFullContent ? undefined : 6).map((frame, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={frame.url}
                        alt={`Frame at ${formatTimestamp(frame.timestamp)}`}
                        className="w-full aspect-video object-cover rounded"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTimestamp(frame.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
                {result.frames.length > 6 && !showFullContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullContent(true)}
                  >
                    Show {result.frames.length - 6} more frames
                  </Button>
                )}
              </div>
            )}

            {/* Figures */}
            {result.figures && result.figures.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Extracted Figures</h4>
                <div className="grid grid-cols-2 gap-3">
                  {result.figures.slice(0, showFullContent ? undefined : 4).map((figure, idx) => (
                    <div key={idx} className="space-y-1">
                      <img
                        src={figure.url}
                        alt={figure.caption || `Figure ${idx + 1}`}
                        className="w-full rounded border"
                      />
                      {figure.caption && (
                        <p className="text-xs text-muted-foreground">{figure.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          {(status === "processing" || status === "queued") && (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          {status === "failed" && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
        {status === "completed" && fileDetails?.downloadUrl && (
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
