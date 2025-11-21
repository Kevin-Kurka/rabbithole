"use client";

import * as React from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploadDialog } from "@/components/media-upload-dialog";
import { MediaProcessingStatus } from "@/components/media-processing-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Example component showing how to integrate media processing
 * into other parts of the application
 */
export function MediaLibraryIntegration() {
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [currentFileId, setCurrentFileId] = React.useState<string | null>(null);

  const handleUploadComplete = (fileId: string) => {
    setCurrentFileId(fileId);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Media Processing</CardTitle>
          <CardDescription>
            Upload and process documents, audio, and video files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Media
          </Button>
        </CardContent>
      </Card>

      {currentFileId && (
        <MediaProcessingStatus
          fileId={currentFileId}
          autoRefresh={true}
          onClose={() => setCurrentFileId(null)}
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
 * Inline upload button for quick access
 */
export function QuickUploadButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" />
        Add Media
      </Button>
      <MediaUploadDialog
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
