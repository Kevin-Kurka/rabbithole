# File Upload System Documentation

## Overview

The file upload system provides a comprehensive UI for uploading, managing, and viewing evidence files in the RabbitHole knowledge graph platform. It integrates with the backend `EvidenceFileResolver` to handle file storage, metadata, and access control.

## Components

### 1. UploadFileDialog (`/frontend/src/components/upload-file-dialog.tsx`)

A modal dialog component for uploading files with drag-and-drop support.

**Features:**
- Drag-and-drop file upload
- Multiple file support (up to 10 files)
- File type validation (PDF, images, videos, documents)
- File size validation (100MB max per file)
- Image preview generation
- Upload progress tracking
- Error handling with user-friendly messages
- Primary file designation (first file)

**Props:**
```typescript
interface UploadFileDialogProps {
  open: boolean;                    // Dialog visibility
  onOpenChange: (open: boolean) => void;  // Close handler
  evidenceId: string;               // Evidence ID to attach files to
  onUploadComplete?: () => void;    // Success callback
}
```

**Usage:**
```tsx
import { UploadFileDialog } from '@/components/upload-file-dialog';

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>Upload Files</Button>
      <UploadFileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        evidenceId="evidence-123"
        onUploadComplete={() => {
          console.log('Upload complete');
          setDialogOpen(false);
        }}
      />
    </>
  );
}
```

**Supported File Types:**
- **Images:** JPG, JPEG, PNG, GIF, WebP
- **Documents:** PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- **Videos:** MP4, WebM
- **Archives:** ZIP

### 2. FileAttachmentList (`/frontend/src/components/file-attachment-list.tsx`)

Displays a list of files attached to an evidence record.

**Features:**
- File metadata display (name, size, type, date)
- Thumbnail previews for images
- Download functionality with signed URLs
- Delete with confirmation dialog
- Processing status indicators
- Virus scan status warnings
- Download count tracking

**Props:**
```typescript
interface FileAttachmentListProps {
  evidenceId: string;           // Evidence ID to fetch files for
  onFileDeleted?: () => void;   // Delete callback
}
```

**Usage:**
```tsx
import { FileAttachmentList } from '@/components/file-attachment-list';

function NodeDetailsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence Files</CardTitle>
      </CardHeader>
      <CardContent>
        <FileAttachmentList
          evidenceId="evidence-123"
          onFileDeleted={() => {
            // Refresh evidence data
          }}
        />
      </CardContent>
    </Card>
  );
}
```

### 3. Evidence Files Manager Page (`/frontend/src/app/evidence/page.tsx`)

A dedicated page for browsing and managing all evidence files across the platform.

**Features:**
- Grid and list view modes
- Search by filename
- Filter by file type
- File statistics dashboard
- Bulk operations support
- File details modal
- Direct download/delete actions

**Access:**
Navigate to `/evidence` in the application.

**Statistics Displayed:**
- Total file count
- Total storage used
- Total downloads
- Images count (can be extended to other types)

## GraphQL Integration

### Queries

**GET_EVIDENCE_FILES** - Fetch all files for an evidence record
```graphql
query GetEvidenceFiles($evidenceId: ID!) {
  getEvidenceFiles(evidenceId: $evidenceId) {
    id
    original_filename
    file_size
    mime_type
    file_type
    # ... other fields
  }
}
```

**GET_FILE_DOWNLOAD_URL** - Get signed download URL
```graphql
query GetFileDownloadUrl($fileId: ID!, $expiresIn: Int) {
  getFileDownloadUrl(fileId: $fileId, expiresIn: $expiresIn)
}
```

### Mutations

**UPLOAD_EVIDENCE_FILE** - Upload a file
```graphql
mutation UploadEvidenceFile(
  $evidenceId: ID!
  $file: Upload!
  $isPrimary: Boolean
) {
  uploadEvidenceFile(
    evidenceId: $evidenceId
    file: $file
    isPrimary: $isPrimary
  ) {
    id
    original_filename
    file_size
    # ... other fields
  }
}
```

**DELETE_EVIDENCE_FILE** - Delete a file
```graphql
mutation DeleteEvidenceFile($fileId: ID!, $reason: String) {
  deleteEvidenceFile(fileId: $fileId, reason: $reason)
}
```

**ATTACH_LINK_EVIDENCE** - Attach URL as evidence
```graphql
mutation AttachLinkEvidence($input: AttachLinkInput!) {
  attachLinkEvidence(input: $input) {
    id
    target_node_id
    target_edge_id
    # ... other fields
  }
}
```

## File Upload Flow

1. **User Interaction**
   - User clicks "Upload Files" button
   - Dialog opens with drag-and-drop zone

2. **File Selection**
   - User drags files or clicks to browse
   - Files are validated (type, size)
   - Invalid files show error messages
   - Valid files show previews (images)

3. **Upload Process**
   - User clicks "Upload" button
   - Files uploaded sequentially to backend
   - Progress tracked per file
   - Success/failure shown per file

4. **Completion**
   - All successful uploads close dialog
   - File list refreshes to show new files
   - Optional callback triggered

## File Download Flow

1. **User Clicks Download**
   - Loading state shown on button

2. **Fetch Signed URL**
   - GraphQL query to `getFileDownloadUrl`
   - Backend generates temporary S3/local URL
   - URL expires in 1 hour (configurable)

3. **Download Initiation**
   - Temporary anchor element created
   - Browser triggers download
   - Download count incremented in database

## Security Considerations

### File Type Validation
- Client-side validation by MIME type
- Server-side validation in `EvidenceFileResolver`
- Rejected types throw errors

### File Size Limits
- Client enforces 100MB limit
- Server enforces same limit
- Prevents abuse and storage issues

### Virus Scanning
- Files marked with `virus_scan_status`
- Infected files cannot be downloaded
- Warning shown in UI

### Access Control
- Authentication required for upload/delete
- Download URLs are signed and temporary
- `access_policy` field controls public/private access

### Upload Safety
- Files streamed to prevent memory issues
- SHA-256 hash computed for integrity
- Duplicate detection possible via hash

## Integration Points

### Node Detail Page
The file upload system is integrated into the node detail page at `/nodes/[id]`:

**Location:** Right sidebar "Evidence Files" section

**Features Added:**
- Upload button in section header
- File attachment list display
- Upload dialog integration

**Code Example:**
```tsx
// In node detail page
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

// In sidebar
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <CardTitle>Evidence Files</CardTitle>
      <Button onClick={() => setUploadDialogOpen(true)}>
        <Upload className="h-3 w-3" />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <FileAttachmentList evidenceId={evidenceId} />
  </CardContent>
</Card>

<UploadFileDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  evidenceId={evidenceId}
/>
```

### Edge Detail Pages
Can be similarly integrated by passing edge-related evidence IDs.

## Backend Requirements

### Evidence Record
Files must be attached to an `Evidence` record. Create evidence first:

```graphql
mutation CreateEvidence($input: CreateEvidenceInput!) {
  createEvidence(input: $input) {
    id
  }
}
```

Then upload files to that evidence ID.

### File Storage
The backend `FileStorageService` handles:
- Local filesystem storage (development)
- S3/cloud storage (production)
- File hashing and integrity
- Thumbnail generation for images
- MIME type detection

### Database Tables
- `EvidenceFiles` - File metadata and storage info
- `Evidence` - Parent evidence records
- `EvidenceMetadata` - Additional evidence metadata
- `EvidenceReviews` - Peer review system

## Performance Optimizations

### Image Previews
- Object URLs created for in-memory previews
- URLs revoked on component unmount
- Prevents memory leaks

### Sequential Upload
- Files uploaded one at a time
- Prevents server overload
- Can be parallelized if needed

### Lazy Loading
- File lists paginated if count is high
- Thumbnails loaded on-demand
- Reduces initial load time

### Caching
- Apollo Client caches file lists
- Refetch on mutations
- Manual refetch available

## Future Enhancements

### Planned Features
1. **Bulk Upload**
   - Folder upload support
   - Multiple evidence assignments

2. **Image Compression**
   - Client-side compression for large images
   - Reduces upload time and storage

3. **Video Processing**
   - Thumbnail extraction from videos
   - Format conversion for compatibility

4. **OCR Integration**
   - Extract text from PDF/images
   - Full-text search in files

5. **Version Control**
   - Track file versions
   - Compare changes over time

6. **Sharing**
   - Generate public share links
   - Expiring share URLs
   - Permission-based sharing

7. **Metadata Editing**
   - Edit file titles/descriptions
   - Add tags and categories
   - Custom metadata fields

## Troubleshooting

### Upload Fails
**Issue:** File upload returns error

**Solutions:**
- Check file size (max 100MB)
- Verify file type is supported
- Ensure evidence record exists
- Check authentication token
- Verify backend storage is available

### Download Fails
**Issue:** Download button doesn't work

**Solutions:**
- Check if file exists in database
- Verify storage file is present
- Check signed URL expiration
- Ensure proper CORS headers

### Preview Not Showing
**Issue:** Image preview doesn't appear

**Solutions:**
- Verify image is valid format
- Check browser console for errors
- Ensure Object URL is created
- Verify thumbnail generation succeeded

### Drag-and-Drop Not Working
**Issue:** Files can't be dragged to upload area

**Solutions:**
- Check browser compatibility
- Verify event handlers are attached
- Ensure no conflicting CSS
- Try clicking to browse instead

## Testing

### Manual Testing Checklist
- [ ] Upload single file
- [ ] Upload multiple files (max 10)
- [ ] Upload file exceeding size limit
- [ ] Upload unsupported file type
- [ ] Drag and drop file
- [ ] Download file
- [ ] Delete file with confirmation
- [ ] View file details
- [ ] Search files by name
- [ ] Filter files by type
- [ ] Switch grid/list view
- [ ] Upload image and verify preview
- [ ] Check upload progress indication
- [ ] Verify error messages display

### Automated Testing
Unit tests should cover:
- File validation logic
- Upload mutation handling
- Download URL generation
- Error state rendering
- Progress tracking

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Requiring Modern Browsers:**
- Drag and drop (HTML5)
- File API for previews
- Fetch API for uploads
- Object URLs for previews

## Accessibility

**Keyboard Navigation:**
- Tab through buttons
- Enter to open dialogs
- Escape to close dialogs
- Arrow keys in file list

**Screen Readers:**
- Descriptive ARIA labels
- Upload progress announcements
- Error message announcements
- File status indicators

**Visual:**
- High contrast mode support
- Focus indicators on all interactive elements
- Clear loading states
- Readable error messages

## API Reference

See `/frontend/src/graphql/queries/evidence-files.ts` for complete GraphQL schema definitions and TypeScript types.

## Related Documentation

- Backend EvidenceFileResolver: `/backend/src/resolvers/EvidenceFileResolver.ts`
- Database Schema: `/backend/migrations/`
- File Storage Service: `/backend/src/services/FileStorageService.ts`
- Apollo Client Setup: `/frontend/src/lib/apollo-client.ts`

## Support

For issues or questions:
1. Check this documentation
2. Review backend resolver code
3. Check browser console for errors
4. Verify GraphQL schema matches
5. Test with different file types/sizes
