/**
 * Media Processing Integration Examples
 *
 * This file contains complete working examples of how to integrate
 * the media processing system into different parts of the application.
 */

"use client";

import * as React from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MediaUploadDialog } from "@/components/media/media-upload-dialog";
import { MediaProcessingStatus } from "@/components/media/media-processing-status";
import {
  UPLOAD_MEDIA_FILE,
  PROCESS_DOCUMENT,
} from "@/graphql/mutations/media-processing";
import { GET_MEDIA_PROCESSING_STATUS } from "@/graphql/queries/media-processing";

/**
 * Example 1: Simple Upload Button
 *
 * The most basic integration - just a button that opens the upload dialog.
 */
export function Example1SimpleUpload() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div>
      <Button onClick={() => setDialogOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload File
      </Button>

      <MediaUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

/**
 * Example 2: Upload with Status Tracking
 *
 * Shows how to track the upload and display processing status.
 */
export function Example2UploadWithStatus() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [currentFileId, setCurrentFileId] = React.useState<string | null>(null);

  const handleUploadComplete = (fileId: string) => {
    setCurrentFileId(fileId);
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setDialogOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload & Process
      </Button>

      {currentFileId && (
        <MediaProcessingStatus
          fileId={currentFileId}
          autoRefresh={true}
          onClose={() => setCurrentFileId(null)}
        />
      )}

      <MediaUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

/**
 * Example 3: Manual GraphQL Operations
 *
 * Shows how to use the GraphQL mutations directly for custom workflows.
 */
export function Example3ManualGraphQL() {
  const [file, setFile] = React.useState<File | null>(null);
  const [fileId, setFileId] = React.useState<string | null>(null);

  const [uploadFile, { loading: uploading }] = useMutation(UPLOAD_MEDIA_FILE);
  const [processDocument, { loading: processing }] = useMutation(PROCESS_DOCUMENT);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Step 1: Upload file
      const { data: uploadData } = await uploadFile({
        variables: {
          file,
          type: "document",
        },
      });

      const uploadedFileId = uploadData.uploadMediaFile.fileId;
      setFileId(uploadedFileId);

      // Step 2: Process document
      await processDocument({
        variables: {
          fileId: uploadedFileId,
          extractTables: true,
          extractFigures: true,
          extractSections: true,
        },
      });

      console.log("Upload and processing initiated!");
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx"
        />
      </div>

      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading || processing}
        >
          {uploading || processing ? "Processing..." : "Upload & Process"}
        </Button>
      )}

      {fileId && (
        <MediaProcessingStatus
          fileId={fileId}
          autoRefresh={true}
        />
      )}
    </div>
  );
}

/**
 * Example 4: Status Polling
 *
 * Shows how to poll for status updates manually.
 */
export function Example4StatusPolling({ fileId }: { fileId: string }) {
  const { data, loading, refetch } = useQuery(GET_MEDIA_PROCESSING_STATUS, {
    variables: { fileId },
    pollInterval: 2000, // Poll every 2 seconds
  });

  const status = data?.getMediaProcessingStatus;

  if (loading && !status) {
    return <div>Loading status...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Status</CardTitle>
        <CardDescription>File ID: {fileId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>Status: {status?.status}</p>
          <p>Progress: {status?.progress}%</p>
          {status?.result && (
            <div>
              <p>Extracted Text Length: {status.result.extractedText?.length || 0} chars</p>
              <p>Tables: {status.result.tableCount || 0}</p>
              <p>Figures: {status.result.figureCount || 0}</p>
            </div>
          )}
          <Button onClick={() => refetch()}>Refresh Status</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 5: Upload in a Form
 *
 * Shows how to integrate media upload into a larger form.
 */
export function Example5UploadInForm() {
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    fileId: null as string | null,
  });
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  const handleUploadComplete = (fileId: string) => {
    setFormData((prev) => ({ ...prev, fileId }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form with data:", formData);
    // Submit to your backend
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Attach Media</label>
        <Button
          type="button"
          variant="outline"
          onClick={() => setUploadDialogOpen(true)}
        >
          <FileText className="h-4 w-4" />
          {formData.fileId ? "Change File" : "Upload File"}
        </Button>
        {formData.fileId && (
          <p className="text-sm text-muted-foreground mt-2">
            File uploaded: {formData.fileId}
          </p>
        )}
      </div>

      {formData.fileId && (
        <MediaProcessingStatus
          fileId={formData.fileId}
          autoRefresh={true}
        />
      )}

      <Button type="submit">Submit Form</Button>

      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </form>
  );
}

/**
 * Example 6: Multiple File Tracking
 *
 * Shows how to track multiple uploads simultaneously.
 */
export function Example6MultipleFiles() {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);

  const handleUploadComplete = (fileId: string) => {
    setFileIds((prev) => [...prev, fileId]);
    setSelectedFileId(fileId);
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setUploadDialogOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload Another File
      </Button>

      <div className="grid grid-cols-2 gap-4">
        {fileIds.map((fileId) => (
          <Card
            key={fileId}
            className="cursor-pointer"
            onClick={() => setSelectedFileId(fileId)}
          >
            <CardContent className="pt-4">
              <p className="text-sm font-medium truncate">{fileId}</p>
              <p className="text-xs text-muted-foreground">Click to view details</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedFileId && (
        <MediaProcessingStatus
          fileId={selectedFileId}
          autoRefresh={true}
          onClose={() => setSelectedFileId(null)}
        />
      )}

      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

/**
 * Example 7: Conditional Processing
 *
 * Shows how to process files differently based on conditions.
 */
export function Example7ConditionalProcessing() {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [fileId, setFileId] = React.useState<string | null>(null);
  const [processingMode, setProcessingMode] = React.useState<"fast" | "detailed">("fast");

  const [processDocument] = useMutation(PROCESS_DOCUMENT);

  const handleUploadComplete = async (uploadedFileId: string) => {
    setFileId(uploadedFileId);

    // Automatically start processing based on mode
    const options = {
      fileId: uploadedFileId,
      extractTables: processingMode === "detailed",
      extractFigures: processingMode === "detailed",
      extractSections: true, // Always extract sections
    };

    try {
      await processDocument({ variables: options });
      console.log(`Started ${processingMode} processing`);
    } catch (error) {
      console.error("Processing failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Processing Mode:</label>
        <select
          value={processingMode}
          onChange={(e) => setProcessingMode(e.target.value as "fast" | "detailed")}
          className="p-2 border rounded"
        >
          <option value="fast">Fast (text only)</option>
          <option value="detailed">Detailed (tables & figures)</option>
        </select>
      </div>

      <Button onClick={() => setUploadDialogOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload with {processingMode} processing
      </Button>

      {fileId && (
        <MediaProcessingStatus
          fileId={fileId}
          autoRefresh={true}
        />
      )}

      <MediaUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

/**
 * Example 8: Full Integration
 *
 * Complete example with all features integrated.
 */
export function Example8FullIntegration() {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = React.useState<string | null>(null);
  const [showCompleted, setShowCompleted] = React.useState(true);

  const handleUploadComplete = (fileId: string) => {
    setFileIds((prev) => [...prev, fileId]);
    setSelectedFileId(fileId);
  };

  const handleClearCompleted = () => {
    // In real app, filter out completed files
    setFileIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Processing</h2>
          <p className="text-muted-foreground">
            Upload and process your media files
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span className="text-sm">Show completed files</span>
        </label>
        <Button variant="outline" size="sm" onClick={handleClearCompleted}>
          Clear All
        </Button>
      </div>

      {/* File list */}
      {fileIds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No files uploaded</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first file to get started
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {fileIds.map((fileId) => (
            <Card
              key={fileId}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedFileId(fileId)}
            >
              <CardHeader>
                <CardTitle className="text-base">File: {fileId}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Selected file details */}
      {selectedFileId && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Processing Details</h3>
          <MediaProcessingStatus
            fileId={selectedFileId}
            autoRefresh={true}
            onClose={() => setSelectedFileId(null)}
          />
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

/**
 * Example Usage in a Page
 *
 * How to use these examples in a Next.js page:
 *
 * ```tsx
 * import { Example2UploadWithStatus } from '@/examples/media-processing-examples';
 *
 * export default function MyPage() {
 *   return (
 *     <div className="container mx-auto p-8">
 *       <Example2UploadWithStatus />
 *     </div>
 *   );
 * }
 * ```
 */
