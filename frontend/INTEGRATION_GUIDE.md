# File Viewer Sidebar - Integration Guide

## Quick Start Integration with GraphSidebar

This guide shows how to add the File Viewer functionality to the existing GraphSidebar component.

## Option 1: Add Files Tab to GraphSidebar

### Step 1: Update GraphSidebar Imports

```typescript
// At the top of GraphSidebar.tsx
import { Search, BrainCircuit, TrendingUp, Clock, ChevronLeft, ChevronRight, File } from 'lucide-react';
import FileViewerExample from './FileViewerExample';
```

### Step 2: Update Tab Type

```typescript
// Update the TabType definition
type TabType = 'all' | 'trending' | 'recents' | 'files';
```

### Step 3: Add Files Tab Button

```typescript
// In the tabs array (around line 181)
{[
  { id: 'all' as TabType, label: 'All', icon: null },
  { id: 'trending' as TabType, label: 'Trending', icon: <TrendingUp size={12} /> },
  { id: 'recents' as TabType, label: 'Recent', icon: <Clock size={12} /> },
  { id: 'files' as TabType, label: 'Files', icon: <File size={12} /> },  // NEW
].map(tab => (
  // ... existing tab rendering code
))}
```

### Step 4: Add Files Content Section

```typescript
// In the Graph List section (around line 212), add conditional rendering:

<div style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.sm }}>
  {activeTab === 'files' ? (
    // Files tab content
    selectedNodeId ? (
      <FileViewerExample nodeId={selectedNodeId} />
    ) : (
      <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.secondary, fontSize: '14px' }}>
        Select a node to view its files
      </div>
    )
  ) : (
    // Existing graph list code
    <>
      {loading && (
        <div style={{ padding: theme.spacing.md, textAlign: 'center', color: theme.colors.text.secondary, fontSize: '14px' }}>
          Loading...
        </div>
      )}
      {/* ... rest of existing graph list code ... */}
    </>
  )}
</div>
```

### Step 5: Add State for Selected Node

```typescript
// Add this state near the top of the component
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
```

---

## Option 2: Standalone File Viewer in Node Context Menu

### Add to Node Context Menu or Properties Panel

```typescript
import { useState } from 'react';
import FileViewerSidebar from '@/components/FileViewerSidebar';

function NodeContextMenu({ node }: { node: any }) {
  const [viewingFile, setViewingFile] = useState<any>(null);

  return (
    <>
      <div className="context-menu">
        <button onClick={() => {
          // Fetch file data and open viewer
          const file = {
            url: node.data.fileUrl,
            name: node.data.fileName,
            mimeType: node.data.fileMimeType,
            size: node.data.fileSize,
          };
          setViewingFile(file);
        }}>
          View Attached File
        </button>
      </div>

      {viewingFile && (
        <FileViewerSidebar
          isOpen={!!viewingFile}
          onClose={() => setViewingFile(null)}
          fileUrl={viewingFile.url}
          fileName={viewingFile.name}
          mimeType={viewingFile.mimeType}
          fileSize={viewingFile.size}
        />
      )}
    </>
  );
}
```

---

## Option 3: Inline File List in Graph Page

### Add to Your Graph Page Component

```typescript
import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_NODE_FILES } from '@/graphql/file-queries';
import FileViewerSidebar from '@/components/FileViewerSidebar';

function GraphPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const { data } = useQuery(GET_NODE_FILES, {
    variables: { nodeId: 'your-node-id' }
  });

  return (
    <div>
      {/* Your existing graph UI */}

      {/* File list panel */}
      <div style={{ padding: '16px' }}>
        <h3>Attached Files</h3>
        {data?.nodeFiles.map(file => (
          <button
            key={file.id}
            onClick={() => setSelectedFile(file)}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* File viewer */}
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
    </div>
  );
}
```

---

## Complete Example: Minimal Implementation

Here's a minimal working example you can drop into any component:

```typescript
"use client";

import { useState } from 'react';
import FileViewerSidebar from '@/components/FileViewerSidebar';

export default function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  // Example file data (in production, fetch from GraphQL)
  const exampleFile = {
    url: 'https://example.com/sample.pdf',
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        View File
      </button>

      <FileViewerSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fileUrl={exampleFile.url}
        fileName={exampleFile.name}
        mimeType={exampleFile.mimeType}
        fileSize={exampleFile.size}
      />
    </>
  );
}
```

---

## GraphQL Integration

### Fetching Files for a Node

```typescript
import { useQuery } from '@apollo/client';
import { GET_NODE_FILES } from '@/graphql/file-queries';

function MyComponent({ nodeId }: { nodeId: string }) {
  const { data, loading, error } = useQuery(GET_NODE_FILES, {
    variables: { nodeId },
  });

  if (loading) return <div>Loading files...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.nodeFiles.map(file => (
        <div key={file.id}>
          {file.name} - {file.size} bytes
        </div>
      ))}
    </div>
  );
}
```

### Fetching a Single File

```typescript
import { useQuery } from '@apollo/client';
import { GET_FILE } from '@/graphql/file-queries';

function MyComponent({ fileId }: { fileId: string }) {
  const { data, loading, error } = useQuery(GET_FILE, {
    variables: { id: fileId },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const file = data?.file;

  return (
    <FileViewerSidebar
      isOpen={true}
      onClose={() => {}}
      fileUrl={file.url}
      fileName={file.name}
      mimeType={file.mimeType}
      fileSize={file.size}
    />
  );
}
```

---

## Styling Customization

### Override Sidebar Width

```typescript
// In FileViewerSidebar.tsx, change:
const SIDEBAR_WIDTH = 480;  // Default

// To your preferred width:
const SIDEBAR_WIDTH = 600;  // Wider sidebar
```

### Custom Theme Colors

All components use the centralized theme from `/src/styles/theme.ts`. Modify that file to change colors globally.

### Component-Specific Styling

To override styles for a specific viewer, pass inline styles or modify the component directly:

```typescript
// Example: Custom PDF viewer styles
<PDFViewer
  fileUrl={url}
  fileName={name}
  customStyles={{
    container: { backgroundColor: '#000' },
    controls: { backgroundColor: '#222' },
  }}
/>
```

---

## Testing Your Integration

### 1. Test Different File Types

```typescript
const testFiles = [
  { url: '/test.pdf', name: 'test.pdf', mimeType: 'application/pdf' },
  { url: '/test.jpg', name: 'test.jpg', mimeType: 'image/jpeg' },
  { url: '/test.mp4', name: 'test.mp4', mimeType: 'video/mp4' },
  { url: '/test.mp3', name: 'test.mp3', mimeType: 'audio/mpeg' },
  { url: '/test.txt', name: 'test.txt', mimeType: 'text/plain' },
];

// Render a button for each to test
testFiles.map(file => (
  <button key={file.name} onClick={() => openViewer(file)}>
    Test {file.name}
  </button>
));
```

### 2. Test Loading States

```typescript
// Simulate loading
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  setTimeout(() => setIsLoading(false), 2000);
}, []);

if (isLoading) return <div>Loading file viewer...</div>;
```

### 3. Test Error States

```typescript
// Test with invalid URL
<FileViewerSidebar
  isOpen={true}
  onClose={() => {}}
  fileUrl="https://invalid-url.com/nonexistent.pdf"
  fileName="error-test.pdf"
  mimeType="application/pdf"
/>
```

---

## Troubleshooting

### Issue: PDF Not Rendering

**Solution**: Ensure PDF.js worker is loading correctly:

```typescript
// Add this console log to PDFViewer.tsx
console.log('PDF worker URL:', pdfjs.GlobalWorkerOptions.workerSrc);

// Should output:
// "//unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs"
```

### Issue: CORS Errors

**Solution**: Configure CORS headers on your file server:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

### Issue: File Not Found

**Solution**: Verify file URL is absolute and accessible:

```typescript
// Test URL in browser first
console.log('File URL:', fileUrl);
fetch(fileUrl)
  .then(res => console.log('Fetch success:', res.ok))
  .catch(err => console.error('Fetch error:', err));
```

---

## Performance Tips

### 1. Lazy Load Viewers

```typescript
import dynamic from 'next/dynamic';

const FileViewerSidebar = dynamic(
  () => import('@/components/FileViewerSidebar'),
  { ssr: false }
);
```

### 2. Preload Critical Files

```typescript
useEffect(() => {
  if (criticalFileUrl) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = criticalFileUrl;
    link.as = 'fetch';
    document.head.appendChild(link);
  }
}, [criticalFileUrl]);
```

### 3. Cache File Metadata

```typescript
import { useMemo } from 'react';

const fileMetadata = useMemo(() => ({
  type: getFileType(file.mimeType),
  icon: getFileIcon(file.mimeType),
  size: formatFileSize(file.size),
}), [file]);
```

---

## Next Steps

1. **Add to GraphSidebar**: Follow Option 1 above
2. **Test with Real Data**: Connect to your GraphQL backend
3. **Customize Styling**: Adjust colors/spacing to match your design
4. **Add Analytics**: Track which file types are most viewed
5. **Implement Upload**: Add file upload UI using the `UPLOAD_FILE` mutation

For more details, see `/Users/kmk/rabbithole/frontend/FILE_VIEWER_README.md`
