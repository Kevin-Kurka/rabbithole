# Universal File Viewer - Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      App Layout (Root)                      │
│                  /src/app/layout.tsx                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │     Your App Components (Pages, etc.)              │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │        UniversalFileViewer (Sidebar)               │     │
│  │   /src/components/universal-file-viewer.tsx       │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  Sheet (Radix UI Dialog)                 │     │     │
│  │  │  - Slides in from right                  │     │     │
│  │  │  - Backdrop overlay                      │     │     │
│  │  │  - Close button                          │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  File Type Router                        │     │     │
│  │  │  - Detects MIME type                     │     │     │
│  │  │  - Routes to appropriate viewer          │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │                                                    │     │
│  │  Conditional Rendering:                            │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  ImageViewer (for images)                │     │     │
│  │  │  VideoPlayer (for videos)                │     │     │
│  │  │  AudioPlayer (for audio)                 │     │     │
│  │  │  PdfViewer (for PDFs)                    │     │     │
│  │  │  DocumentViewer (for docs)               │     │     │
│  │  │  TextViewer (for text/code)              │     │     │
│  │  │  DownloadPrompt (for unknown types)      │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌──────────────────────┐
│   Any Component      │
│                      │
│  useFileViewer()     │
│    .openFile(...)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  FileViewerStore     │
│  (Zustand)           │
│                      │
│  State:              │
│  - isOpen: true      │
│  - currentFile: {...}│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ UniversalFileViewer  │
│                      │
│ Subscribes to store  │
│ Renders when open    │
└──────────────────────┘
```

## File Type Detection Flow

```
File Object
    │
    ├─ mimeType: "image/jpeg"
    │       │
    │       ▼
    │   IMAGE_MIME_TYPES.has()
    │       │
    │       ├─ true  → ImageViewer
    │       └─ false → Next check
    │
    ├─ mimeType: "video/mp4"
    │       │
    │       ▼
    │   VIDEO_MIME_TYPES.has()
    │       │
    │       ├─ true  → VideoPlayer
    │       └─ false → Next check
    │
    ├─ mimeType: "application/pdf"
    │       │
    │       ▼
    │   PDF_MIME_TYPES.has()
    │       │
    │       ├─ true  → PdfViewer
    │       └─ false → Next check
    │
    └─ Unknown type
            │
            ▼
        DownloadPrompt
```

## Integration Pattern

### Pattern 1: Direct Hook Usage

```
┌─────────────────────┐
│  Your Component     │
├─────────────────────┤
│                     │
│  const { openFile } │
│    = useFileViewer()│
│                     │
│  onClick={() => {   │
│    openFile(file)   │
│  }}                 │
└─────────┬───────────┘
          │
          ▼
    ┌─────────────┐
    │   Store     │
    │  Updates    │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │   Viewer    │
    │   Opens     │
    └─────────────┘
```

### Pattern 2: GraphQL Integration

```
┌──────────────────────┐
│  Component           │
├──────────────────────┤
│                      │
│  useQuery(           │
│    GET_NODE_FILES    │
│  )                   │
│         │            │
│         ▼            │
│  data.nodeFiles.map()│
│         │            │
│         ▼            │
│  openFile(file)      │
└──────────┬───────────┘
           │
           ▼
     ┌─────────────┐
     │  Viewer     │
     │  Displays   │
     └─────────────┘
```

## File Viewer Components

### ImageViewer Architecture

```
┌────────────────────────────────┐
│      TransformWrapper          │
│      (react-zoom-pan-pinch)    │
│                                │
│  ┌──────────────────────────┐  │
│  │  Controls Toolbar        │  │
│  │  - Zoom In/Out           │  │
│  │  - Reset View            │  │
│  │  - Rotate                │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │  TransformComponent      │  │
│  │                          │  │
│  │    <img src={url} />     │  │
│  │                          │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### VideoPlayer Architecture

```
┌────────────────────────────────┐
│       Video Container          │
│                                │
│  ┌──────────────────────────┐  │
│  │  <video> Element         │  │
│  │  - Native HTML5 video    │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │  Custom Controls         │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Progress Bar      │  │  │
│  │  │  (Slider)          │  │  │
│  │  └────────────────────┘  │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Play/Pause Button │  │  │
│  │  └────────────────────┘  │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Volume Control    │  │  │
│  │  │  (Slider)          │  │  │
│  │  └────────────────────┘  │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Fullscreen Button │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### PdfViewer Architecture

```
┌────────────────────────────────┐
│       PDF Container            │
│                                │
│  ┌──────────────────────────┐  │
│  │  Toolbar                 │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Prev/Next Page    │  │  │
│  │  └────────────────────┘  │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Page Counter      │  │  │
│  │  └────────────────────┘  │  │
│  │  ┌────────────────────┐  │  │
│  │  │  Zoom Controls     │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │  ScrollArea              │  │
│  │  ┌────────────────────┐  │  │
│  │  │  <Document>        │  │  │
│  │  │    <Page>          │  │  │
│  │  │  (react-pdf)       │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

## Data Flow

### Opening a File

```
1. User clicks "View File"
        ↓
2. Component calls openFile(fileData)
        ↓
3. Hook updates Zustand store
        ↓
4. Store state changes:
   - isOpen: true
   - currentFile: { id, name, mimeType, size, url, ... }
        ↓
5. UniversalFileViewer re-renders
        ↓
6. Sheet component opens (slide animation)
        ↓
7. File type detected from mimeType
        ↓
8. Appropriate viewer component renders
        ↓
9. If needed, fetch file content (text, documents)
        ↓
10. Display file in viewer
```

### Closing a File

```
1. User clicks close button (X)
        ↓
2. closeFile() called
        ↓
3. Store state updates:
   - isOpen: false
   - currentFile: null
        ↓
4. Sheet closes (slide out animation)
        ↓
5. Viewer unmounts
        ↓
6. Cleanup: stop video, clear state
```

## File Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                    (UniversalFileViewer mounted here)
│   └── globals.css                   (PDF styles added here)
│
├── components/
│   ├── universal-file-viewer.tsx     (Main component - 300 lines)
│   │
│   ├── file-viewers/
│   │   ├── index.ts                  (Export aggregator)
│   │   ├── image-viewer.tsx          (Image with zoom/pan)
│   │   ├── video-player.tsx          (Video with controls)
│   │   ├── audio-player.tsx          (Audio player)
│   │   ├── pdf-viewer.tsx            (PDF renderer)
│   │   ├── document-viewer.tsx       (Document text)
│   │   └── text-viewer.tsx           (Text/code)
│   │
│   ├── ui/
│   │   ├── sheet.tsx                 (Sidebar container - NEW)
│   │   └── slider.tsx                (Slider control - NEW)
│   │
│   ├── examples/
│   │   ├── file-viewer-example.tsx   (Demo page)
│   │   └── node-files-integration.tsx (Real example)
│   │
│   └── __tests__/
│       └── universal-file-viewer.test.tsx (Tests)
│
├── stores/
│   └── file-viewer-store.ts          (Zustand state)
│
├── hooks/
│   └── use-file-viewer.ts            (Convenience hook)
│
├── lib/
│   └── file-utils.ts                 (Utilities)
│
└── graphql/
    └── file-queries.ts               (Enhanced queries)
```

## Dependencies

```
Production:
- zustand (State management)
- react-zoom-pan-pinch (Image zoom/pan)
- react-pdf (PDF rendering)
- pdfjs-dist (PDF.js library)
- react-markdown (Markdown rendering)
- remark-gfm (GitHub Flavored Markdown)
- @radix-ui/react-dialog (Sheet base)
- @radix-ui/react-slider (Slider control)
- lucide-react (Icons)

Development:
- TypeScript (Type safety)
- Tailwind CSS (Styling)
```

## Performance Considerations

### Lazy Loading
- PDF pages load on-demand
- Text files fetch asynchronously
- Images use browser-native lazy loading

### Memory Management
- Video/audio elements clean up on unmount
- PDF worker managed by react-pdf
- Image zoom state resets on new file

### Optimization
- Single viewer instance in app
- Conditional rendering by file type
- Minimal re-renders via Zustand

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | Full | Best performance |
| Firefox | Full | All features work |
| Safari | Full | PDF.js may have minor quirks |
| Edge | Full | Chromium-based |
| Mobile Safari | Full | Touch gestures supported |
| Mobile Chrome | Full | Touch gestures supported |

## Security Considerations

- Files loaded from trusted URLs only
- No inline script execution
- PDF.js runs in worker (isolated)
- CORS headers required for external files
- Download uses browser-native mechanisms

## Future Architecture Enhancements

### Planned
- File preview thumbnails
- Multi-file viewer (tabs)
- Annotation layer
- Comparison view
- Version history

### Possible
- Real-time collaboration
- File editing (images, text)
- Cloud storage integration
- OCR for scanned documents
- Audio/video transcription
