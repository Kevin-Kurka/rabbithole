"use client";

import * as React from "react";
import { useMutation } from "@apollo/client";
import {
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Upload,
  X,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UPLOAD_MEDIA_FILE,
  PROCESS_DOCUMENT,
  PROCESS_AUDIO,
  PROCESS_VIDEO,
} from "@/graphql/mutations/media-processing";

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (fileId: string) => void;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  type: "document" | "audio" | "video" | "image";
}

interface ProcessingOptions {
  // Document options
  extractTables: boolean;
  extractFigures: boolean;
  extractSections: boolean;
  // Audio options
  transcribe: boolean;
  detectLanguage: boolean;
  // Video options
  extractFrames: boolean;
  performOcr: boolean;
  detectScenes: boolean;
  fps: number;
}

const FILE_TYPE_ICONS = {
  document: FileText,
  audio: Music,
  video: Video,
  image: ImageIcon,
};

const ACCEPTED_TYPES = {
  document: [".pdf", ".doc", ".docx", ".txt", ".md"],
  audio: [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
  video: [".mp4", ".avi", ".mov", ".mkv", ".webm"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function detectFileType(file: File): "document" | "audio" | "video" | "image" {
  const mimeType = file.type;

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  ) {
    return "document";
  }

  // Fallback to extension
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (ACCEPTED_TYPES.document.some((ext) => ext.includes(extension || ""))) {
    return "document";
  }
  if (ACCEPTED_TYPES.audio.some((ext) => ext.includes(extension || ""))) {
    return "audio";
  }
  if (ACCEPTED_TYPES.video.some((ext) => ext.includes(extension || ""))) {
    return "video";
  }

  return "image";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export function MediaUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: MediaUploadDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<FileWithPreview | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [options, setOptions] = React.useState<ProcessingOptions>({
    extractTables: true,
    extractFigures: true,
    extractSections: true,
    transcribe: true,
    detectLanguage: true,
    extractFrames: true,
    performOcr: false,
    detectScenes: true,
    fps: 1,
  });

  const [uploadFile] = useMutation(UPLOAD_MEDIA_FILE);
  const [processDocument] = useMutation(PROCESS_DOCUMENT);
  const [processAudio] = useMutation(PROCESS_AUDIO);
  const [processVideo] = useMutation(PROCESS_VIDEO);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
      return;
    }

    const type = detectFileType(file);
    const fileWithPreview: FileWithPreview = { file, type };

    // Generate preview for images
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileWithPreview.preview = e.target?.result as string;
        setSelectedFile({ ...fileWithPreview });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(fileWithPreview);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Upload file
      const { data: uploadData } = await uploadFile({
        variables: {
          file: selectedFile.file,
          type: selectedFile.type,
        },
      });

      if (!uploadData?.uploadMediaFile?.success) {
        throw new Error("Upload failed");
      }

      const fileId = uploadData.uploadMediaFile.fileId;
      setUploadProgress(50);

      // Process based on type
      let processingResult;

      if (selectedFile.type === "document") {
        processingResult = await processDocument({
          variables: {
            fileId,
            extractTables: options.extractTables,
            extractFigures: options.extractFigures,
            extractSections: options.extractSections,
          },
        });
      } else if (selectedFile.type === "audio") {
        processingResult = await processAudio({
          variables: {
            fileId,
            transcribe: options.transcribe,
            detectLanguage: options.detectLanguage,
          },
        });
      } else if (selectedFile.type === "video") {
        processingResult = await processVideo({
          variables: {
            fileId,
            extractFrames: options.extractFrames,
            performOcr: options.performOcr,
            detectScenes: options.detectScenes,
            fps: options.fps,
          },
        });
      }

      setUploadProgress(100);

      // Success
      setTimeout(() => {
        onUploadComplete?.(fileId);
        handleClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setError(null);
    onOpenChange(false);
  };

  const FileIcon = selectedFile ? FILE_TYPE_ICONS[selectedFile.type] : Upload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Media File</DialogTitle>
          <DialogDescription>
            Upload documents, audio, video, or images for processing and analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag and drop area */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Drop your file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports documents, audio, video, and images up to{" "}
                {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          )}

          {/* File preview */}
          {selectedFile && (
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {selectedFile.preview ? (
                  <img
                    src={selectedFile.preview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {selectedFile.file.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selectedFile.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.file.size)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.file.type || "Unknown type"}
                  </p>
                </div>
              </div>

              {/* Processing options */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-sm font-medium">Processing Options</p>

                {selectedFile.type === "document" && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="extractTables"
                        checked={options.extractTables}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, extractTables: !!checked })
                        }
                      />
                      <Label htmlFor="extractTables" className="text-sm cursor-pointer">
                        Extract tables
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="extractFigures"
                        checked={options.extractFigures}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, extractFigures: !!checked })
                        }
                      />
                      <Label htmlFor="extractFigures" className="text-sm cursor-pointer">
                        Extract figures and images
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="extractSections"
                        checked={options.extractSections}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, extractSections: !!checked })
                        }
                      />
                      <Label htmlFor="extractSections" className="text-sm cursor-pointer">
                        Extract sections and headings
                      </Label>
                    </div>
                  </div>
                )}

                {selectedFile.type === "audio" && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="transcribe"
                        checked={options.transcribe}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, transcribe: !!checked })
                        }
                      />
                      <Label htmlFor="transcribe" className="text-sm cursor-pointer">
                        Transcribe audio
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="detectLanguage"
                        checked={options.detectLanguage}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, detectLanguage: !!checked })
                        }
                      />
                      <Label htmlFor="detectLanguage" className="text-sm cursor-pointer">
                        Detect language
                      </Label>
                    </div>
                  </div>
                )}

                {selectedFile.type === "video" && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="extractFrames"
                        checked={options.extractFrames}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, extractFrames: !!checked })
                        }
                      />
                      <Label htmlFor="extractFrames" className="text-sm cursor-pointer">
                        Extract frames
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="detectScenes"
                        checked={options.detectScenes}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, detectScenes: !!checked })
                        }
                      />
                      <Label htmlFor="detectScenes" className="text-sm cursor-pointer">
                        Detect scenes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="performOcr"
                        checked={options.performOcr}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, performOcr: !!checked })
                        }
                      />
                      <Label htmlFor="performOcr" className="text-sm cursor-pointer">
                        Perform OCR on frames
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 gap-2">
                      <Label htmlFor="fps" className="text-sm">
                        Frames per second:
                      </Label>
                      <Input
                        id="fps"
                        type="number"
                        min="1"
                        max="30"
                        value={options.fps}
                        onChange={(e) =>
                          setOptions({ ...options, fps: parseInt(e.target.value) || 1 })
                        }
                        className="w-20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload progress */}
              {isProcessing && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {uploadProgress < 50 ? "Uploading..." : "Processing..."}
                    </span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded">
                  {error}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept={Object.values(ACCEPTED_TYPES).flat().join(",")}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
