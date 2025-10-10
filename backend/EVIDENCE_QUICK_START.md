# Evidence Management System - Quick Start Guide

## 1. Environment Setup (5 minutes)

### Local Development
```bash
# Copy environment template
cp .env.example .env

# Edit .env - Minimal configuration
DATABASE_URL=postgresql://user:password@localhost:5432/rabbithole_db
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
MAX_FILE_SIZE=104857600  # 100MB
```

### Create uploads directory
```bash
mkdir -p uploads/thumbnails
```

### Test local storage
```bash
node test-file-upload.js
```

You should see:
```
=== All Tests Passed! ===
Local storage is configured correctly.
```

## 2. Start the Server

```bash
npm install
npm start
```

Server will be available at: `http://localhost:4000/graphql`

## 3. Test File Upload (GraphQL Playground)

### Mutation Query
```graphql
mutation($file: Upload!) {
  uploadEvidenceFile(
    evidenceId: "your-evidence-uuid"
    file: $file
    isPrimary: true
  ) {
    id
    original_filename
    file_size
    file_hash
    storage_key
    mime_type
    dimensions { width height }
    thumbnail_storage_key
    virus_scan_status
    processing_status
  }
}
```

### Using cURL
```bash
curl -X POST http://localhost:4000/graphql \
  -F operations='{"query":"mutation($file: Upload!) { uploadEvidenceFile(evidenceId: \"uuid\", file: $file) { id original_filename file_size } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@/path/to/your/image.jpg
```

## 4. Common Operations

### List Files for Evidence
```graphql
query {
  getEvidenceFiles(evidenceId: "uuid") {
    id
    original_filename
    file_size
    mime_type
    created_at
  }
}
```

### Get Download URL
```graphql
query {
  getFileDownloadUrl(fileId: "file-uuid", expiresIn: 3600)
}
```

### Submit Review
```graphql
mutation {
  reviewEvidence(input: {
    evidenceId: "uuid"
    overallRating: 4
    qualityScore: 0.8
    reviewText: "Great evidence!"
    expertiseLevel: "professional"
  }) {
    id
    overall_rating
  }
}
```

## 5. Production Setup (AWS S3)

### Update .env
```bash
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
```

### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

## 6. Production Setup (Cloudflare R2)

### Update .env
```bash
STORAGE_PROVIDER=cloudflare_r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=your-bucket-name
R2_ACCESS_KEY_ID=key-id
R2_SECRET_ACCESS_KEY=secret-key
```

## 7. File Type Support

### Allowed Types
- **Documents**: PDF, DOCX, TXT, MD
- **Images**: JPG, PNG, GIF, WEBP, SVG
- **Videos**: MP4, WEBM, MOV
- **Audio**: MP3, WAV, OGG
- **Data**: JSON, CSV, XLSX

### Blocked Types
- Executables (.exe, .sh, .bat)
- Scripts (.js, .py, .php)
- Archives with executables

## 8. Local Development Storage

### Directory Structure
```
backend/
├── uploads/              # Local file storage (gitignored)
│   ├── .gitkeep         # Keeps directory in git
│   ├── thumbnails/      # Auto-generated thumbnails
│   └── evidence/        # Evidence files (created automatically)
└── test-file-upload.js  # Storage verification script
```

### How It Works
- Files are stored in `./uploads/evidence/{evidenceId}/{hash}/{timestamp}_{filename}`
- Thumbnails are stored with `_thumb.jpg` suffix
- LocalStorageProvider automatically creates directories as needed
- File paths are sanitized to prevent directory traversal attacks

### Testing File Upload
```bash
# Run the test script
node test-file-upload.js

# Check uploaded files
ls -lh uploads/

# Clean up test files (if any)
rm -rf uploads/evidence/test-*
```

### Switching to Production Storage

When ready for production, update `.env`:

**For AWS S3:**
```bash
STORAGE_PROVIDER=s3
S3_BUCKET=rabbithole-evidence
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**For Cloudflare R2:**
```bash
STORAGE_PROVIDER=cloudflare_r2
R2_ACCOUNT_ID=...
R2_BUCKET=rabbithole-evidence
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

Restart the server after changing storage providers.

## 9. Troubleshooting

### "File too large"
```bash
# Increase limit in .env
MAX_FILE_SIZE=209715200  # 200MB
```

### "Module not found: sharp"
```bash
# macOS
brew install vips
npm install sharp --verbose

# Linux
apt-get install libvips-dev
npm install sharp
```

### "S3 access denied"
- Check IAM permissions
- Verify bucket name and region
- Test with AWS CLI: `aws s3 ls s3://your-bucket`

### "Storage provider not configured"
- Verify STORAGE_PROVIDER in .env
- Check all required credentials are set
- Restart server after changing .env

### "ENOENT: no such file or directory"
```bash
# Create uploads directory
mkdir -p backend/uploads/thumbnails

# Verify permissions
ls -ld backend/uploads
# Should show: drwxr-xr-x

# Run test script
node backend/test-file-upload.js
```

### "Permission denied" on uploads
```bash
# Fix permissions (macOS/Linux)
chmod 755 backend/uploads

# Or grant full access
chmod 777 backend/uploads
```

## 10. API Quick Reference

| Operation | Type | Description |
|-----------|------|-------------|
| `uploadEvidenceFile` | Mutation | Upload file with processing |
| `getEvidenceFiles` | Query | List files for evidence |
| `getFileDownloadUrl` | Query | Get signed download URL |
| `getEvidenceReviews` | Query | Get community reviews |
| `reviewEvidence` | Mutation | Submit review |
| `updateEvidenceMetadata` | Mutation | Update metadata |
| `deleteEvidenceFile` | Mutation | Delete file |
| `attachLinkEvidence` | Mutation | Attach URL as evidence |

## 11. Security Checklist

- [x] File type validation
- [x] File size limits
- [x] SHA256 hash deduplication
- [x] Signed URLs with expiration
- [x] Audit logging
- [x] Soft deletion
- [ ] Virus scanning (ClamAV - TODO)
- [ ] Rate limiting (TODO)

## Next Steps

1. **Test Locally**: Upload a few test files
2. **Configure Production Storage**: Set up S3 or R2
3. **Implement Virus Scanning**: Integrate ClamAV
4. **Add Rate Limiting**: Protect against abuse
5. **Monitor Performance**: Track upload success rates

## Support

- **Documentation**: `EVIDENCE_MANAGEMENT.md`
- **Summary**: `EVIDENCE_SYSTEM_SUMMARY.md`
- **Code**: `src/services/FileStorageService.ts`
- **GraphQL**: GraphQL Playground at `/graphql`

## License

Part of the Rabbithole project.
