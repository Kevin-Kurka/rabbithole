# File Upload System - Quick Start Guide

## 5-Minute Integration Guide

### Step 1: Import Components
```tsx
import { UploadFileDialog } from '@/components/upload-file-dialog';
import { FileAttachmentList } from '@/components/file-attachment-list';
```

### Step 2: Add State
```tsx
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const evidenceId = 'your-evidence-id'; // Replace with actual ID
```

### Step 3: Add Upload Button
```tsx
<Button onClick={() => setUploadDialogOpen(true)}>
  <Upload className="w-4 h-4 mr-2" />
  Upload Files
</Button>
```

### Step 4: Add File List
```tsx
<FileAttachmentList
  evidenceId={evidenceId}
  onFileDeleted={() => {
    // Optional: Refresh data
  }}
/>
```

### Step 5: Add Upload Dialog
```tsx
<UploadFileDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  evidenceId={evidenceId}
  onUploadComplete={() => {
    // Refresh file list
    setUploadDialogOpen(false);
  }}
/>
```

## Complete Example

```tsx
"use client";

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadFileDialog } from '@/components/upload-file-dialog';
import { FileAttachmentList } from '@/components/file-attachment-list';

export default function MyPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const evidenceId = 'evidence-123'; // Get from GraphQL or props

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Evidence Files</CardTitle>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FileAttachmentList
            evidenceId={evidenceId}
            onFileDeleted={() => {
              console.log('File deleted, refresh if needed');
            }}
          />
        </CardContent>
      </Card>

      <UploadFileDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        evidenceId={evidenceId}
        onUploadComplete={() => {
          console.log('Upload complete');
          setUploadDialogOpen(false);
        }}
      />
    </div>
  );
}
```

## GraphQL Queries

### Upload File
```tsx
import { useMutation } from '@apollo/client';
import { UPLOAD_EVIDENCE_FILE } from '@/graphql/queries/evidence-files';

const [uploadFile] = useMutation(UPLOAD_EVIDENCE_FILE);

await uploadFile({
  variables: {
    evidenceId: 'evidence-123',
    file: fileObject,
    isPrimary: true,
  },
});
```

### Get Files
```tsx
import { useQuery } from '@apollo/client';
import { GET_EVIDENCE_FILES } from '@/graphql/queries/evidence-files';

const { data, loading, error, refetch } = useQuery(GET_EVIDENCE_FILES, {
  variables: { evidenceId: 'evidence-123' },
});

const files = data?.getEvidenceFiles || [];
```

### Delete File
```tsx
import { useMutation } from '@apollo/client';
import { DELETE_EVIDENCE_FILE } from '@/graphql/queries/evidence-files';

const [deleteFile] = useMutation(DELETE_EVIDENCE_FILE);

await deleteFile({
  variables: {
    fileId: 'file-456',
    reason: 'User requested deletion',
  },
});
```

## File Upload Constraints

| Constraint | Value |
|------------|-------|
| Max File Size | 100 MB |
| Max Files per Upload | 10 |
| Supported Formats | PDF, JPG, PNG, GIF, WebP, MP4, WebM, DOC, DOCX, XLS, XLSX, TXT, CSV, ZIP |
| Image Preview | Automatic for images |
| Progress Tracking | Yes |
| Error Handling | Built-in |

## Common Use Cases

### 1. Simple Upload Button
```tsx
<Button onClick={() => setUploadDialogOpen(true)}>
  Upload Evidence
</Button>
```

### 2. Upload with Callback
```tsx
<UploadFileDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  evidenceId={evidenceId}
  onUploadComplete={() => {
    refetchEvidence(); // Refresh parent component
    showSuccessToast();
  }}
/>
```

### 3. File List with Custom Empty State
```tsx
{files.length === 0 ? (
  <div className="text-center py-8">
    <p className="text-muted-foreground mb-4">No files attached</p>
    <Button onClick={() => setUploadDialogOpen(true)}>
      Upload First File
    </Button>
  </div>
) : (
  <FileAttachmentList evidenceId={evidenceId} />
)}
```

### 4. Conditional Upload Based on Permissions
```tsx
{canUpload && (
  <Button onClick={() => setUploadDialogOpen(true)}>
    <Upload className="w-4 h-4 mr-2" />
    Upload Files
  </Button>
)}
```

## Styling Customization

### Custom Upload Button
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setUploadDialogOpen(true)}
  className="gap-2"
>
  <Upload className="w-3 h-3" />
  Add Files
</Button>
```

### Custom Dialog Width
```tsx
// Modify DialogContent in upload-file-dialog.tsx
<DialogContent className="sm:max-w-3xl"> {/* Changed from 2xl */}
  {/* ... */}
</DialogContent>
```

### Custom File Card Style
```tsx
// In file-attachment-list.tsx, modify Card component
<Card className="hover:shadow-lg transition-shadow">
  {/* ... */}
</Card>
```

## Error Handling

### Client-Side Validation Errors
Automatically handled by `UploadFileDialog`:
- File too large: "File size exceeds 100 MB"
- Unsupported type: "File type not supported"
- Too many files: "Maximum 10 files allowed"

### Upload Errors
```tsx
// Errors shown inline in upload dialog
// No additional handling needed
```

### Download Errors
```tsx
// Handled in FileAttachmentList
// Alert shown to user if download fails
```

## Performance Tips

1. **Lazy Load File List** - Only render when section is visible
2. **Debounce Search** - Use debounced search in evidence manager
3. **Virtual Scrolling** - For lists with 100+ files
4. **Image Compression** - Compress large images before upload

## Accessibility

- **Keyboard Navigation**: Tab, Enter, Escape all work
- **Screen Readers**: All elements properly labeled
- **Focus Management**: Dialog traps focus
- **Error Announcements**: Errors announced to screen readers

## Browser Support

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

## Troubleshooting

### Upload not working?
1. Check `evidenceId` is valid
2. Verify backend is running
3. Check browser console for errors
4. Ensure file meets size/type requirements

### Files not appearing?
1. Refetch query after upload
2. Check GraphQL cache
3. Verify backend saved file
4. Check network tab for errors

### Download not working?
1. Check file exists in database
2. Verify storage file is present
3. Check signed URL expiration
4. Ensure CORS headers set

## Support

See full documentation:
- `/docs/file-upload-system.md` - Complete documentation
- `/docs/file-upload-implementation-summary.md` - Implementation details

GraphQL schema:
- `/frontend/src/graphql/queries/evidence-files.ts`

Backend resolver:
- `/backend/src/resolvers/EvidenceFileResolver.ts`
