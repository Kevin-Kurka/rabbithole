# Media Processing System - Quick Start Guide

## Overview

The media processing interface enables users to upload and process documents, audio, video, and image files with advanced analysis capabilities.

## File Structure

```
frontend/src/
├── app/
│   └── media/
│       └── page.tsx                          # Main media library page
├── components/
│   ├── media-upload-dialog.tsx               # Upload dialog with drag-and-drop
│   ├── media-processing-status.tsx           # Real-time status component
│   ├── media-library-integration.tsx         # Integration helpers
│   ├── media-processing-README.md            # Detailed documentation
│   └── ui/
│       ├── checkbox.tsx                      # NEW: Checkbox component
│       ├── dialog.tsx                        # Dialog components
│       ├── button.tsx                        # Button component
│       ├── card.tsx                          # Card components
│       ├── progress.tsx                      # Progress bar
│       ├── badge.tsx                         # Badge component
│       ├── input.tsx                         # Input component
│       ├── label.tsx                         # Label component
│       └── separator.tsx                     # Separator component
├── graphql/
│   ├── mutations/
│   │   └── media-processing.ts               # GraphQL mutations
│   └── queries/
│       └── media-processing.ts               # GraphQL queries
└── types/
    └── media-processing.ts                   # TypeScript definitions
```

## Quick Usage

### 1. Access the Media Library

Navigate to `/media` in your browser:

```
http://localhost:3000/media
```

### 2. Upload a File

Click the "Upload File" button or drag and drop a file directly into the upload area.

### 3. Configure Processing Options

Based on file type, select processing options:

**Documents:**
- Extract tables from PDFs
- Extract figures and images
- Parse sections and headings

**Audio:**
- Transcribe speech to text
- Detect language automatically

**Video:**
- Extract frames at specified FPS
- Perform OCR on frames
- Detect scene changes

### 4. Monitor Processing

- Real-time progress updates
- Processing time display
- Cancel or retry failed jobs
- Download results when complete

## Integration Examples

### Example 1: Add Upload Button to Any Page

```tsx
import { QuickUploadButton } from '@/components/media-library-integration';

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <QuickUploadButton />
    </div>
  );
}
```

### Example 2: Embed Processing Status

```tsx
import { MediaProcessingStatus } from '@/components/media-processing-status';

export default function MyComponent({ fileId }: { fileId: string }) {
  return (
    <MediaProcessingStatus
      fileId={fileId}
      autoRefresh={true}
    />
  );
}
```

### Example 3: Custom Upload Flow

```tsx
'use client';

import { useState } from 'react';
import { MediaUploadDialog } from '@/components/media-upload-dialog';
import { MediaProcessingStatus } from '@/components/media-processing-status';

export default function CustomUpload() {
  const [open, setOpen] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);

  const handleComplete = (id: string) => {
    setFileId(id);
    setOpen(false);
  };

  return (
    <div>
      <button onClick={() => setOpen(true)}>
        Upload Media
      </button>

      <MediaUploadDialog
        open={open}
        onOpenChange={setOpen}
        onUploadComplete={handleComplete}
      />

      {fileId && (
        <MediaProcessingStatus
          fileId={fileId}
          autoRefresh={true}
          onClose={() => setFileId(null)}
        />
      )}
    </div>
  );
}
```

## GraphQL Usage

### Upload and Process a Document

```tsx
import { useMutation } from '@apollo/client';
import { UPLOAD_MEDIA_FILE, PROCESS_DOCUMENT } from '@/graphql/mutations/media-processing';

function MyComponent() {
  const [uploadFile] = useMutation(UPLOAD_MEDIA_FILE);
  const [processDocument] = useMutation(PROCESS_DOCUMENT);

  const handleUpload = async (file: File) => {
    // Upload
    const { data } = await uploadFile({
      variables: { file, type: 'document' }
    });

    const fileId = data.uploadMediaFile.fileId;

    // Process
    await processDocument({
      variables: {
        fileId,
        extractTables: true,
        extractFigures: true,
        extractSections: true
      }
    });
  };

  return <div>...</div>;
}
```

### Query Processing Status

```tsx
import { useQuery } from '@apollo/client';
import { GET_MEDIA_PROCESSING_STATUS } from '@/graphql/queries/media-processing';

function StatusDisplay({ fileId }: { fileId: string }) {
  const { data, loading } = useQuery(GET_MEDIA_PROCESSING_STATUS, {
    variables: { fileId },
    pollInterval: 2000 // Poll every 2 seconds
  });

  if (loading) return <div>Loading...</div>;

  const status = data?.getMediaProcessingStatus;

  return (
    <div>
      <p>Status: {status.status}</p>
      <p>Progress: {status.progress}%</p>
      {status.result && (
        <div>
          <p>Extracted Text: {status.result.extractedText}</p>
        </div>
      )}
    </div>
  );
}
```

### Search Media Content

```tsx
import { useQuery } from '@apollo/client';
import { SEARCH_MEDIA_CONTENT } from '@/graphql/queries/media-processing';

function SearchMedia({ query }: { query: string }) {
  const { data } = useQuery(SEARCH_MEDIA_CONTENT, {
    variables: { query, limit: 10 },
    skip: !query
  });

  const results = data?.searchMediaContent || [];

  return (
    <div>
      {results.map((result) => (
        <div key={result.fileId}>
          <h3>{result.filename}</h3>
          <p>{result.snippet}</p>
        </div>
      ))}
    </div>
  );
}
```

## Styling and Theming

All components use shadcn/ui with Tailwind CSS and support dark mode:

```tsx
// Components automatically adapt to theme
<ThemeProvider>
  <MediaUploadDialog ... />
</ThemeProvider>
```

## Mobile Responsive

All components are fully responsive:

- **Mobile (< 640px)**: Single column, touch-optimized
- **Tablet (640px - 1024px)**: 2 columns
- **Desktop (> 1024px)**: 3-4 columns

## Accessibility

- Full keyboard navigation
- ARIA labels and roles
- Screen reader support
- Focus management
- Color contrast compliance

## Testing the Interface

### 1. Test Upload

```bash
# Navigate to media page
open http://localhost:3000/media

# Upload a test file (any supported format)
# Drag and drop or click to browse
```

### 2. Test Processing Options

- Upload a PDF → Check "Extract tables" and "Extract figures"
- Upload an MP3 → Check "Transcribe" and "Detect language"
- Upload an MP4 → Set FPS to 1, check "Extract frames"

### 3. Test Status Updates

- Upload a large file
- Watch real-time progress updates
- Click "Cancel" to test cancellation
- Upload a small invalid file to test error handling

## Troubleshooting

### Upload Fails

- Check file size (must be < 500MB)
- Verify file type is supported
- Check network connection
- Verify backend is running

### Processing Stuck

- Check backend logs
- Verify RabbitMQ is running
- Check worker processes
- Try canceling and retrying

### No Status Updates

- Verify polling is enabled (`autoRefresh={true}`)
- Check GraphQL subscription connection
- Verify fileId is correct
- Check browser console for errors

## Performance Tips

1. **Large Files**: Upload during off-peak hours
2. **Video Processing**: Reduce FPS for faster processing
3. **Batch Uploads**: Upload files one at a time for now
4. **Network**: Use wired connection for large uploads
5. **Browser**: Use Chrome/Firefox for best performance

## Next Steps

1. Implement backend GraphQL resolvers (see backend docs)
2. Set up file storage (S3, local, etc.)
3. Configure RabbitMQ for job queue
4. Set up Redis for status tracking
5. Test with real files
6. Configure rate limiting
7. Add authentication/authorization
8. Deploy to production

## Support

For issues or questions:

1. Check `media-processing-README.md` for detailed docs
2. Review GraphQL schema definitions
3. Check backend logs for errors
4. Test with minimal example first
5. Verify all dependencies are installed

## Version History

- **v1.0.0** (2025-11-13): Initial release
  - Upload dialog with drag-and-drop
  - Processing status component
  - Media library page
  - GraphQL integration
  - Type definitions
  - Full documentation
