# Universal File Viewer

A comprehensive, universal file viewer sidebar component for the Rabbit Hole application. Supports multiple file types with dedicated viewers and a clean, consistent interface.

## Features

- **Sidebar Layout**: Slides in from the right side of the screen
- **Multi-format Support**: Images, videos, audio, PDFs, documents, text files
- **Download Capability**: One-click download for any file
- **Responsive Design**: Works on mobile, tablet, and desktop
- **State Management**: Centralized Zustand store for viewer state
- **Type Safety**: Full TypeScript support

## Supported File Types

### Images
- JPEG, JPG, PNG, GIF, WEBP, SVG
- Features: Zoom, pan, rotate controls
- Uses: `react-zoom-pan-pinch` for smooth interactions

### Videos
- MP4, WebM, OGG, QuickTime (MOV)
- Features: Play/pause, volume control, seek, fullscreen
- Custom video player with native controls

### Audio
- MP3, WAV, OGG, AAC
- Features: Play/pause, volume control, seek
- Visual audio player interface

### PDFs
- PDF documents
- Features: Page navigation, zoom controls
- Uses: `react-pdf` with pdf.js

### Documents
- DOCX, XLSX, PPTX, DOC, XLS, PPT
- Displays extracted text/markdown from Docling
- Markdown rendering with syntax highlighting

### Text Files
- TXT, MD, HTML, CSS, JS, JSON, XML
- Syntax highlighting based on file extension
- Preserves formatting with monospace font

### Unknown Types
- Download prompt with file metadata
- Size and type information displayed

## Installation

The component is already integrated into the app. No additional setup required.

### Dependencies

All required packages are installed:
- `zustand` - State management
- `react-zoom-pan-pinch` - Image zoom/pan
- `react-pdf` - PDF rendering
- `@radix-ui/react-slider` - Slider controls
- `@radix-ui/react-dialog` - Sheet component base
- `react-markdown` - Markdown rendering
- `lucide-react` - Icons

## Usage

### 1. Add UniversalFileViewer to Your Layout

Already added to `/frontend/src/app/layout.tsx`:

```tsx
import { UniversalFileViewer } from "@/components/universal-file-viewer";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UniversalFileViewer />
      </body>
    </html>
  );
}
```

### 2. Use the Hook to Open Files

From any component:

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';

function MyComponent() {
  const { openFile } = useFileViewer();

  const handleViewFile = (file) => {
    openFile({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
      nodeId: file.nodeId, // optional
      uploadedBy: file.uploadedBy, // optional
      createdAt: file.createdAt, // optional
      metadata: file.metadata, // optional
    });
  };

  return (
    <Button onClick={() => handleViewFile(myFile)}>
      View File
    </Button>
  );
}
```

### 3. Direct Store Access (Advanced)

For more control, use the store directly:

```tsx
import { useFileViewerStore } from '@/stores/file-viewer-store';

function AdvancedComponent() {
  const { isOpen, currentFile, openFile, closeFile } = useFileViewerStore();

  // Custom logic
  useEffect(() => {
    if (isOpen) {
      console.log('File viewer opened:', currentFile);
    }
  }, [isOpen, currentFile]);
}
```

## Integration Examples

### Example 1: Activity Post Attachments

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';

function ActivityPost({ post }) {
  const { openFile } = useFileViewer();

  return (
    <div>
      <p>{post.content}</p>
      {post.attachments?.map((file) => (
        <Button
          key={file.id}
          onClick={() => openFile(file)}
          variant="outline"
        >
          <FileIcon className="mr-2" />
          {file.name}
        </Button>
      ))}
    </div>
  );
}
```

### Example 2: Evidence File List

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';
import { useQuery } from '@apollo/client';
import { GET_NODE_FILES } from '@/graphql/file-queries';

function EvidenceFileList({ nodeId }) {
  const { openFile } = useFileViewer();
  const { data, loading } = useQuery(GET_NODE_FILES, {
    variables: { nodeId },
  });

  if (loading) return <div>Loading files...</div>;

  return (
    <div className="space-y-2">
      {data?.nodeFiles?.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {file.mimeType} • {formatFileSize(file.size)}
            </p>
          </div>
          <Button onClick={() => openFile(file)}>View</Button>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Node Detail Evidence Section

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';

function NodeEvidenceSection({ evidence }) {
  const { openFile } = useFileViewer();

  return (
    <div>
      <h3>Supporting Evidence</h3>
      {evidence.files?.map((file) => (
        <Card key={file.id} onClick={() => openFile(file)}>
          <CardContent>
            <FilePreview file={file} />
            <Button>View Full File</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Component Architecture

```
/components/universal-file-viewer.tsx (Main component)
  ├── /file-viewers/
  │   ├── image-viewer.tsx
  │   ├── video-player.tsx
  │   ├── audio-player.tsx
  │   ├── pdf-viewer.tsx
  │   ├── document-viewer.tsx
  │   └── text-viewer.tsx
  ├── /ui/
  │   ├── sheet.tsx (Sidebar container)
  │   ├── slider.tsx (Volume/seek controls)
  │   ├── button.tsx
  │   └── scroll-area.tsx
  └── /stores/
      └── file-viewer-store.ts (Zustand state)
```

## File Type Detection

The viewer automatically detects file types based on MIME type:

```typescript
const IMAGE_TYPES = ['image/jpeg', 'image/png', ...];
const VIDEO_TYPES = ['video/mp4', 'video/webm', ...];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', ...];
const PDF_TYPES = ['application/pdf'];
const DOCUMENT_TYPES = ['application/vnd.openxmlformats...'];
const TEXT_TYPES = ['text/plain', 'text/markdown', ...];
```

Add new types by extending these arrays in `universal-file-viewer.tsx`.

## Styling and Customization

### Theme Support

All components use Tailwind classes and respect the app's theme (light/dark mode).

### Custom Styling

Pass className prop to individual viewers:

```tsx
<ImageViewer url={url} alt={alt} className="custom-class" />
```

### Modify Sidebar Width

Edit `SheetContent` in `universal-file-viewer.tsx`:

```tsx
<SheetContent
  side="right"
  className="w-full sm:max-w-3xl lg:max-w-5xl" // Adjust here
>
```

## Performance Considerations

### Large Files
- Images: Uses browser-native rendering, generally performant
- Videos: Streams via native HTML5 video element
- PDFs: Loads pages on-demand with `react-pdf`
- Documents: Fetches text content asynchronously

### Optimization Tips
1. Use CDN URLs for faster loading
2. Implement lazy loading for file lists
3. Consider pagination for large file collections
4. Cache file metadata in Apollo Client

## Troubleshooting

### PDF.js Worker Error

If PDFs don't load, check console for worker errors. The worker is configured in `pdf-viewer.tsx`:

```typescript
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

### CORS Issues

If files from external domains don't load:
1. Ensure the server sends proper CORS headers
2. Use a proxy for external files
3. Consider storing files in your own S3/CDN

### File Not Displaying

1. Check file URL is accessible
2. Verify MIME type is correct
3. Open browser dev tools and check console
4. Ensure file size isn't too large (browser limits)

## Future Enhancements

Potential additions:
- [ ] 3D model viewer (STL, OBJ, GLTF)
- [ ] Code editor with syntax highlighting (Monaco)
- [ ] Archive viewer (ZIP contents)
- [ ] Spreadsheet grid view (XLSX)
- [ ] Image annotations/markup
- [ ] Video trimming/clip selection
- [ ] Multi-file comparison view
- [ ] File version history

## API Reference

### useFileViewer Hook

```typescript
function useFileViewer(): {
  openFile: (file: FileViewerFile) => void;
  openFileById: (fileId: string) => Promise<void>;
  closeFile: () => void;
}
```

### FileViewerFile Interface

```typescript
interface FileViewerFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  nodeId?: string;
  uploadedBy?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}
```

### useFileViewerStore

```typescript
interface FileViewerState {
  isOpen: boolean;
  currentFile: FileViewerFile | null;
  openFile: (file: FileViewerFile) => void;
  closeFile: () => void;
}
```

## Testing

Example test for opening files:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useFileViewer } from '@/hooks/use-file-viewer';

test('opens file viewer with file data', () => {
  const { result } = renderHook(() => useFileViewer());

  const testFile = {
    id: '1',
    name: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    url: 'https://example.com/test.pdf',
  };

  act(() => {
    result.current.openFile(testFile);
  });

  const store = useFileViewerStore.getState();
  expect(store.isOpen).toBe(true);
  expect(store.currentFile).toEqual(testFile);
});
```

## License

Part of the Rabbit Hole project. See main project LICENSE.
