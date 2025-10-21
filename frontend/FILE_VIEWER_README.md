# File Viewer Sidebar - Implementation Documentation

## Overview

The File Viewer Sidebar provides embedded viewing capabilities for various file types including PDFs, images, videos, audio files, and text documents. Users can preview files without downloading them, with full controls for navigation, zoom, playback, and more.

## Components Created

### Main Component

**`FileViewerSidebar.tsx`** - `/Users/kmk/rabbithole/frontend/src/components/FileViewerSidebar.tsx`

Main sidebar component that:
- Automatically detects file type from MIME type or extension
- Routes to appropriate viewer component
- Provides consistent header with file info and close button
- Handles unknown file types with download fallback
- Responsive overlay with backdrop blur

### Viewer Components

All located in `/Users/kmk/rabbithole/frontend/src/components/viewers/`

#### 1. **PDFViewer.tsx**
- Page-by-page navigation
- Zoom controls (50% - 200%)
- Download functionality
- Loading states and error handling
- Uses `react-pdf` library

#### 2. **ImageViewer.tsx**
- Pan and zoom with mouse/touch
- Rotation controls
- Fullscreen support
- Download functionality
- Uses `react-zoom-pan-pinch` library

#### 3. **VideoPlayer.tsx**
- Native HTML5 video player
- Standard playback controls
- Download functionality
- Format detection (MP4, WebM, Ogg)

#### 4. **AudioPlayer.tsx**
- Custom audio player UI
- Play/pause, seek, volume controls
- Time display and progress bar
- Visual album art placeholder
- Format support (MP3, WAV, OGG, AAC)

#### 5. **TextViewer.tsx**
- Syntax-highlighted text display
- Copy to clipboard functionality
- Download functionality
- Supports plain text, JSON, code files

## Dependencies Installed

```bash
npm install --save react-pdf pdfjs-dist react-zoom-pan-pinch
```

## GraphQL Queries

**`file-queries.ts`** - `/Users/kmk/rabbithole/frontend/src/graphql/file-queries.ts`

Queries and mutations for file operations:
- `GET_FILE` - Fetch single file by ID
- `GET_NODE_FILES` - Fetch all files attached to a node
- `UPLOAD_FILE` - Upload new file
- `DELETE_FILE` - Delete file

## Usage Examples

### Basic Usage

```typescript
import FileViewerSidebar from '@/components/FileViewerSidebar';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        View File
      </button>

      <FileViewerSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fileUrl="https://example.com/file.pdf"
        fileName="document.pdf"
        mimeType="application/pdf"
        fileSize={1024000}
      />
    </>
  );
}
```

### With GraphQL Data

```typescript
import { useQuery } from '@apollo/client';
import { GET_NODE_FILES } from '@/graphql/file-queries';
import FileViewerSidebar from '@/components/FileViewerSidebar';

function NodeFilesViewer({ nodeId }: { nodeId: string }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const { data } = useQuery(GET_NODE_FILES, {
    variables: { nodeId }
  });

  return (
    <>
      {data?.nodeFiles.map(file => (
        <button
          key={file.id}
          onClick={() => setSelectedFile(file)}
        >
          {file.name}
        </button>
      ))}

      {selectedFile && (
        <FileViewerSidebar
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          fileUrl={selectedFile.url}
          fileName={selectedFile.name}
          mimeType={selectedFile.mimeType}
          fileSize={selectedFile.size}
        />
      )}
    </>
  );
}
```

### Integration with GraphSidebar

Add a "Files" tab to the existing GraphSidebar:

```typescript
// In GraphSidebar.tsx

import FileViewerExample from './FileViewerExample';

// Add to tab types
type TabType = 'all' | 'trending' | 'recents' | 'files';

// Add to tabs array
{
  id: 'files' as TabType,
  label: 'Files',
  icon: <File size={12} />
}

// In render section
{activeTab === 'files' && selectedNodeId && (
  <FileViewerExample nodeId={selectedNodeId} />
)}
```

## File Type Support

### Fully Supported
- **PDF**: All PDF documents via react-pdf
- **Images**: JPG, PNG, GIF, WebP, SVG, BMP
- **Video**: MP4, WebM, Ogg, MOV (browser-dependent)
- **Audio**: MP3, WAV, OGG, AAC, M4A, FLAC
- **Text**: TXT, MD, JSON, XML, HTML, CSS, JS, TS

### Fallback Handling
For unsupported file types:
- Displays file type information
- Shows MIME type
- Provides direct download link

## Features

### PDF Viewer
- ✓ Page navigation (previous/next)
- ✓ Page counter (current/total)
- ✓ Zoom controls (50-200%)
- ✓ Download original
- ✓ Loading states
- ✓ Error handling

### Image Viewer
- ✓ Pan and zoom (pinch/scroll)
- ✓ Rotation (90° increments)
- ✓ Fullscreen mode
- ✓ Download original
- ✓ Touch support
- ✓ Overlay zoom controls

### Video Player
- ✓ Native controls
- ✓ Playback (play/pause/seek)
- ✓ Volume control
- ✓ Fullscreen
- ✓ Download original
- ✓ Format detection

### Audio Player
- ✓ Custom UI
- ✓ Play/pause control
- ✓ Seek bar with time display
- ✓ Volume slider
- ✓ Mute toggle
- ✓ Download original

### Text Viewer
- ✓ Monospace font rendering
- ✓ Copy to clipboard
- ✓ Download original
- ✓ Loading states
- ✓ Word wrapping

## Styling

All components use the centralized theme system:
- `/Users/kmk/rabbithole/frontend/src/styles/theme.ts`
- Consistent with existing GraphSidebar design
- Zinc color palette
- Responsive spacing and typography

## Performance Considerations

### PDF Rendering
- Lazy loads pages (renders only visible page)
- Configurable worker for background processing
- CDN-hosted worker from unpkg

### Image Handling
- Transform calculations optimized
- Hardware acceleration for transforms
- Debounced zoom/pan calculations

### Video/Audio
- Native browser support (no additional processing)
- Browser-managed buffering
- Format detection fallbacks

### Text Files
- Async fetch with loading states
- Single fetch (no streaming for simplicity)
- Suitable for files up to ~1MB

## Browser Compatibility

### PDF Support
- Modern browsers with PDF.js worker
- Requires ES6+ support
- Worker loaded from CDN

### Image Support
- All modern browsers
- Touch events for mobile
- Fullscreen API (where available)

### Video/Audio
- HTML5 video/audio support required
- Format support varies by browser
- Fallback messages for unsupported formats

## Security Considerations

1. **CORS**: Ensure file URLs support CORS for fetch operations
2. **Content Security Policy**: Allow worker-src for PDF.js
3. **URL Validation**: Validate file URLs server-side
4. **File Size Limits**: Consider implementing client-side warnings for large files
5. **MIME Type Validation**: Verify MIME types match file content

## Future Enhancements

### Potential Additions
- [ ] Code syntax highlighting for text files
- [ ] PDF text search
- [ ] Image editing tools (crop, filters)
- [ ] Playlist support for audio/video
- [ ] Thumbnail previews
- [ ] File comparison mode
- [ ] Annotation tools
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements (ARIA labels)
- [ ] Mobile-optimized controls

### Performance Optimizations
- [ ] Virtual scrolling for multi-page PDFs
- [ ] Progressive image loading
- [ ] Video thumbnail generation
- [ ] Client-side caching
- [ ] Lazy component loading

## Testing Recommendations

### Unit Tests
- Component rendering
- File type detection
- Control interactions
- Error states

### Integration Tests
- GraphQL query integration
- File upload flow
- Download functionality
- Viewer switching

### E2E Tests
- Complete user flow
- Multiple file types
- Performance with large files
- Mobile responsiveness

## Troubleshooting

### PDF Not Loading
- Check PDF.js worker URL is accessible
- Verify CORS headers on file URL
- Check browser console for worker errors

### Images Not Displaying
- Verify image URL is accessible
- Check CORS configuration
- Validate image format

### Video/Audio Not Playing
- Check browser format support
- Verify MIME type accuracy
- Test with different codecs

### Performance Issues
- Reduce max zoom levels
- Implement pagination for long PDFs
- Add file size warnings
- Use compression for large files

## File Locations

```
frontend/src/
├── components/
│   ├── FileViewerSidebar.tsx          # Main component
│   ├── FileViewerExample.tsx          # Usage example
│   └── viewers/
│       ├── PDFViewer.tsx              # PDF viewer
│       ├── ImageViewer.tsx            # Image viewer
│       ├── VideoPlayer.tsx            # Video player
│       ├── AudioPlayer.tsx            # Audio player
│       └── TextViewer.tsx             # Text viewer
├── graphql/
│   └── file-queries.ts                # GraphQL queries
├── app/
│   └── globals.css                    # PDF styles added
└── styles/
    └── theme.ts                       # Theme system (existing)
```

## Dependencies

```json
{
  "react-pdf": "^10.2.0",
  "pdfjs-dist": "^5.4.296",
  "react-zoom-pan-pinch": "^3.7.0"
}
```

## License Compliance

- **react-pdf**: Apache-2.0
- **pdfjs-dist**: Apache-2.0
- **react-zoom-pan-pinch**: MIT

All dependencies are compatible with commercial use.
