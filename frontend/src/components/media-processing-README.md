# Media Processing Interface

A comprehensive media processing system for uploading and analyzing documents, audio, video, and images.

## Components

### 1. MediaUploadDialog (`media-upload-dialog.tsx`)

Enhanced file upload component with drag-and-drop support and processing options.

**Features:**
- Drag-and-drop file upload
- File type auto-detection (document/audio/video/image)
- File size validation (max 500MB)
- Real-time preview for images
- Processing options per file type:
  - **Documents**: Extract tables, figures, sections
  - **Audio**: Transcribe, detect language
  - **Video**: Extract frames, OCR, scene detection, FPS control
- Upload progress tracking
- Error handling and validation

**Usage:**
```tsx
import { MediaUploadDialog } from '@/components/media-upload-dialog';

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleUploadComplete = (fileId: string) => {
    console.log('File uploaded:', fileId);
  };

  return (
    <MediaUploadDialog
      open={open}
      onOpenChange={setOpen}
      onUploadComplete={handleUploadComplete}
    />
  );
}
```

### 2. MediaProcessingStatus (`media-processing-status.tsx`)

Real-time processing status component with detailed results display.

**Features:**
- Real-time status updates (queued, processing, completed, failed)
- Progress bar with percentage
- Processing time display
- Cancel and retry buttons
- Detailed results preview:
  - **Documents**: Extracted text, tables, figures, sections
  - **Audio**: Transcript with language detection
  - **Video**: Frames grid, scenes, OCR text
- Download results button
- Auto-refresh capability

**Usage:**
```tsx
import { MediaProcessingStatus } from '@/components/media-processing-status';

function MyComponent() {
  const fileId = "file-id-here";

  return (
    <MediaProcessingStatus
      fileId={fileId}
      autoRefresh={true}
      onClose={() => console.log('Closed')}
    />
  );
}
```

### 3. Media Gallery Page (`app/media/page.tsx`)

Full-featured media library with search, filtering, and management.

**Features:**
- Grid view of uploaded files with thumbnails
- Real-time status updates for all files
- Search functionality across filenames and content
- Filter by file type (document/audio/video/image)
- Click to view detailed processing status
- Responsive design (1-4 columns based on screen size)
- Auto-refresh every 5 seconds
- Upload count and pagination info

**Access:**
Navigate to `/media` in your application.

### 4. Integration Components (`media-library-integration.tsx`)

Helper components for integrating media processing into other parts of the app.

**Components:**
- `MediaLibraryIntegration`: Full integration example
- `QuickUploadButton`: Inline upload button

**Usage:**
```tsx
import { QuickUploadButton } from '@/components/media-library-integration';

function Toolbar() {
  return (
    <div>
      <QuickUploadButton />
    </div>
  );
}
```

## GraphQL Integration

### Mutations

Located in `/graphql/mutations/media-processing.ts`:

- `UPLOAD_MEDIA_FILE`: Upload a file
- `PROCESS_DOCUMENT`: Process document with options
- `PROCESS_AUDIO`: Transcribe and analyze audio
- `PROCESS_VIDEO`: Extract frames and analyze video
- `CANCEL_PROCESSING_JOB`: Cancel an in-progress job
- `RETRY_PROCESSING_JOB`: Retry a failed job

### Queries

Located in `/graphql/queries/media-processing.ts`:

- `GET_MEDIA_PROCESSING_STATUS`: Get real-time processing status
- `GET_MEDIA_FILES`: Fetch paginated list of files with filters
- `GET_MEDIA_FILE_DETAILS`: Get detailed information about a file
- `SEARCH_MEDIA_CONTENT`: Search across file content

## Type Definitions

Type definitions are available in `/types/media-processing.ts`:

```typescript
import type {
  MediaFile,
  MediaType,
  ProcessingStatus,
  ProcessingOptions,
  ProcessingResult,
} from '@/types/media-processing';
```

## Supported File Types

### Documents
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Text (`.txt`, `.md`)

### Audio
- MP3 (`.mp3`)
- WAV (`.wav`)
- M4A (`.m4a`)
- OGG (`.ogg`)
- FLAC (`.flac`)

### Video
- MP4 (`.mp4`)
- AVI (`.avi`)
- MOV (`.mov`)
- MKV (`.mkv`)
- WebM (`.webm`)

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- SVG (`.svg`)

## File Size Limits

- Maximum file size: 500MB
- Configurable in `media-upload-dialog.tsx` (`MAX_FILE_SIZE` constant)

## Processing Options

### Documents
- **Extract Tables**: Parse and extract table data from PDFs
- **Extract Figures**: Extract images and diagrams
- **Extract Sections**: Parse document structure and headings

### Audio
- **Transcribe**: Convert speech to text
- **Detect Language**: Automatically identify spoken language

### Video
- **Extract Frames**: Extract still frames at specified FPS (1-30)
- **Perform OCR**: Extract text from video frames
- **Detect Scenes**: Automatically identify scene changes

## Responsive Design

All components are mobile-responsive using Tailwind CSS:

- **Mobile**: Single column layout
- **Tablet**: 2 columns
- **Desktop**: 3 columns
- **Large Desktop**: 4 columns

## Auto-Refresh & Polling

- Media page polls every 5 seconds for file updates
- Processing status component polls every 2 seconds when auto-refresh is enabled
- Polling stops when processing is complete or failed

## Error Handling

All components include comprehensive error handling:
- File size validation
- Upload errors
- Processing errors
- Network errors
- User-friendly error messages

## Accessibility

Components follow WCAG 2.1 AA standards:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

## Styling

Uses shadcn/ui components with Tailwind CSS:
- Consistent design system
- Dark mode support (via theme provider)
- Smooth animations and transitions
- Responsive breakpoints

## Backend Requirements

The frontend expects these GraphQL endpoints to be implemented in the backend:

1. File upload endpoint supporting multipart/form-data
2. Processing job queue system (RabbitMQ recommended)
3. Status tracking system (Redis recommended)
4. Result storage (PostgreSQL JSONB or MongoDB)
5. File storage (S3, local filesystem, etc.)

See backend documentation for implementation details.

## Integration Checklist

- [ ] Ensure Apollo Client is configured
- [ ] Verify backend GraphQL endpoints are available
- [ ] Configure file upload proxy if needed
- [ ] Set up authentication/authorization
- [ ] Configure file storage backend
- [ ] Test file size limits
- [ ] Verify processing options work correctly
- [ ] Test on mobile devices
- [ ] Check accessibility with screen reader
- [ ] Configure CORS for file uploads

## Performance Considerations

- Large files (>100MB) may take longer to upload
- Video frame extraction is CPU-intensive
- OCR processing requires significant memory
- Consider rate limiting on backend
- Implement upload queuing for multiple files
- Use CDN for thumbnails and results

## Future Enhancements

- [ ] Batch upload support
- [ ] Folder organization
- [ ] Tags and categories
- [ ] Advanced search filters
- [ ] Export results in multiple formats
- [ ] Collaboration and sharing
- [ ] Version history
- [ ] AI-powered content analysis
- [ ] Webhook notifications
- [ ] API access for programmatic uploads
