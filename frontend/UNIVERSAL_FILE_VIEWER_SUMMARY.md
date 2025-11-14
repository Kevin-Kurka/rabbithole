# Universal File Viewer - Implementation Summary

## Overview

A comprehensive, production-ready file viewing system has been implemented for the Rabbit Hole application. The system provides a universal sidebar that can display any type of file with dedicated viewers for each format.

## Files Created

### Core Components

1. **`/src/components/universal-file-viewer.tsx`** (Main component)
   - Sidebar layout with Sheet component
   - Automatic file type detection
   - Routes to appropriate viewer based on MIME type
   - Download functionality
   - File metadata display

2. **`/src/components/ui/sheet.tsx`** (Sidebar container)
   - Radix UI Dialog-based sheet component
   - Slide-in animation from right
   - Overlay with backdrop
   - Customizable width

3. **`/src/components/ui/slider.tsx`** (Controls)
   - Used for video/audio seek and volume
   - Radix UI Slider component

### File Viewer Components

Located in `/src/components/file-viewers/`:

1. **`image-viewer.tsx`**
   - Zoom, pan, rotate controls
   - Uses react-zoom-pan-pinch library
   - Supports: JPEG, PNG, GIF, WEBP, SVG

2. **`video-player.tsx`**
   - Custom video controls
   - Play/pause, volume, seek, fullscreen
   - Supports: MP4, WebM, OGG, MOV

3. **`audio-player.tsx`**
   - Audio player with waveform placeholder
   - Volume and playback controls
   - Supports: MP3, WAV, OGG, AAC

4. **`pdf-viewer.tsx`**
   - Page navigation
   - Zoom controls
   - Uses react-pdf library
   - Supports: PDF

5. **`document-viewer.tsx`**
   - Displays extracted text from documents
   - Markdown rendering support
   - Supports: DOCX, XLSX, PPTX (via Docling extraction)

6. **`text-viewer.tsx`**
   - Syntax highlighting by file extension
   - Code formatting
   - Supports: TXT, MD, HTML, CSS, JS, JSON, XML, etc.

7. **`index.ts`**
   - Export aggregator for all viewers

### State Management

1. **`/src/stores/file-viewer-store.ts`**
   - Zustand store for viewer state
   - Methods: `openFile()`, `closeFile()`
   - State: `isOpen`, `currentFile`

### Hooks

1. **`/src/hooks/use-file-viewer.ts`**
   - Convenience hook for opening files
   - Wrapper around the Zustand store
   - Provides `openFile`, `closeFile` methods

### Utilities

1. **`/src/lib/file-utils.ts`**
   - File type detection utilities
   - File size formatting
   - Extension-based language detection
   - Type checking helpers (isImage, isVideo, etc.)
   - MIME type categorization

### GraphQL Integration

1. **`/src/graphql/file-queries.ts`** (Enhanced)
   - Added `FILE_FRAGMENT` for consistent queries
   - New queries: `GET_FILES_BY_IDS`, `GET_EVIDENCE_FILES`
   - All queries return data compatible with file viewer

### Examples and Documentation

1. **`/src/components/examples/file-viewer-example.tsx`**
   - Demo page showing all file types
   - Usage examples
   - Integration instructions

2. **`/src/components/examples/node-files-integration.tsx`**
   - Real-world integration example
   - Shows how to use with GraphQL data
   - Includes full and compact versions

3. **`/src/components/FILE_VIEWER_README.md`**
   - Comprehensive documentation
   - API reference
   - Integration guides
   - Troubleshooting

### Tests

1. **`/src/components/__tests__/universal-file-viewer.test.tsx`**
   - Store tests
   - Hook tests
   - Utility function tests
   - Type detection tests

## Integration

The UniversalFileViewer has been added to the root layout:

**`/src/app/layout.tsx`**
```tsx
import { UniversalFileViewer } from "@/components/universal-file-viewer";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
          <UniversalFileViewer />
        </Providers>
      </body>
    </html>
  );
}
```

## Usage Examples

### Basic Usage

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';

function MyComponent() {
  const { openFile } = useFileViewer();

  return (
    <Button onClick={() => openFile({
      id: '1',
      name: 'document.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      url: 'https://example.com/file.pdf'
    })}>
      View File
    </Button>
  );
}
```

### With GraphQL Data

```tsx
import { useFileViewer } from '@/hooks/use-file-viewer';
import { useQuery } from '@apollo/client';
import { GET_NODE_FILES } from '@/graphql/file-queries';

function FileList({ nodeId }) {
  const { openFile } = useFileViewer();
  const { data } = useQuery(GET_NODE_FILES, {
    variables: { nodeId }
  });

  return (
    <div>
      {data?.nodeFiles?.map(file => (
        <Button key={file.id} onClick={() => openFile(file)}>
          {file.name}
        </Button>
      ))}
    </div>
  );
}
```

## Features

### Supported File Types

- **Images**: JPG, PNG, GIF, WEBP, SVG
- **Videos**: MP4, WebM, OGG, MOV
- **Audio**: MP3, WAV, OGG, AAC
- **Documents**: PDF, DOCX, XLSX, PPTX
- **Text**: TXT, MD, HTML, CSS, JS, JSON, XML
- **Unknown**: Download prompt with metadata

### Capabilities

- Zoom and pan for images
- Full video/audio playback controls
- PDF page navigation
- Syntax highlighting for code
- Markdown rendering
- One-click download for any file
- Responsive design
- Dark mode support
- Loading states
- Error handling

## Technical Details

### Dependencies Installed

```bash
npm install @radix-ui/react-slider --legacy-peer-deps
```

### Existing Dependencies Used

- `zustand` - State management
- `react-zoom-pan-pinch` - Image viewer
- `react-pdf` - PDF rendering
- `react-markdown` - Markdown rendering
- `lucide-react` - Icons
- `@radix-ui/react-dialog` - Sheet base

### File Structure

```
frontend/src/
├── components/
│   ├── universal-file-viewer.tsx
│   ├── file-viewers/
│   │   ├── image-viewer.tsx
│   │   ├── video-player.tsx
│   │   ├── audio-player.tsx
│   │   ├── pdf-viewer.tsx
│   │   ├── document-viewer.tsx
│   │   ├── text-viewer.tsx
│   │   └── index.ts
│   ├── examples/
│   │   ├── file-viewer-example.tsx
│   │   └── node-files-integration.tsx
│   ├── ui/
│   │   ├── sheet.tsx (NEW)
│   │   └── slider.tsx (NEW)
│   ├── __tests__/
│   │   └── universal-file-viewer.test.tsx
│   └── FILE_VIEWER_README.md
├── stores/
│   └── file-viewer-store.ts
├── hooks/
│   └── use-file-viewer.ts
├── lib/
│   └── file-utils.ts
└── graphql/
    └── file-queries.ts (ENHANCED)
```

## Next Steps

To use the file viewer in your application:

1. **Import the hook** in any component:
   ```tsx
   import { useFileViewer } from '@/hooks/use-file-viewer';
   ```

2. **Call openFile** with file metadata:
   ```tsx
   const { openFile } = useFileViewer();
   openFile(fileData);
   ```

3. **Integrate with existing features**:
   - Activity post attachments
   - Evidence file lists
   - Node detail pages
   - Search results

## Testing

Run tests:
```bash
cd frontend
npm test universal-file-viewer
```

## Performance Considerations

- Images are loaded on-demand
- Videos stream via HTML5 video element
- PDFs load pages incrementally
- Large text files fetch asynchronously
- Proper cleanup on component unmount

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with minor PDF.js quirks)
- Mobile: Responsive design works on all devices

## Future Enhancements

Potential additions (not implemented):
- 3D model viewer
- Archive file browser
- Spreadsheet grid view
- Image annotations
- Video trimming
- Multi-file comparison

## Files Modified

1. `/src/app/layout.tsx` - Added UniversalFileViewer
2. `/src/graphql/file-queries.ts` - Enhanced with fragments

## Files Created

Total: 15 new files
- 1 main component
- 6 viewer components
- 2 UI components
- 1 store
- 1 hook
- 1 utility library
- 2 example components
- 1 test file
- 2 documentation files

## Conclusion

The Universal File Viewer is fully functional and ready for integration. It provides a consistent, user-friendly interface for viewing any type of file in the Rabbit Hole application.
