# File Storage Quick Reference

## Configuration Status: ✅ READY

---

## Quick Commands

### Test Storage
```bash
node test-file-upload.js
```

### Verify Setup
```bash
./verify-setup.sh
```

### Start Server
```bash
npm start
# Server at: http://localhost:4000/graphql
```

### Check Storage
```bash
# View uploaded files
ls -lh uploads/evidence/

# Check disk usage
du -sh uploads/

# Find specific files
find uploads -name "*.jpg"
```

---

## File Locations

| File | Path |
|------|------|
| Environment Config | `/Users/kmk/rabbithole/backend/.env` |
| Upload Directory | `/Users/kmk/rabbithole/backend/uploads/` |
| Test Script | `/Users/kmk/rabbithole/backend/test-file-upload.js` |
| Setup Report | `/Users/kmk/rabbithole/backend/LOCAL_STORAGE_SETUP.md` |
| Quick Start | `/Users/kmk/rabbithole/backend/EVIDENCE_QUICK_START.md` |
| Storage Service | `/Users/kmk/rabbithole/backend/src/services/FileStorageService.ts` |

---

## Environment Variables

```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
MAX_FILE_SIZE=104857600  # 100MB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rabbithole_db
```

---

## GraphQL Test Upload

```graphql
mutation($file: Upload!) {
  uploadEvidenceFile(
    evidenceId: "test-evidence-uuid"
    file: $file
    isPrimary: true
  ) {
    id
    original_filename
    file_size
    storage_key
    mime_type
  }
}
```

---

## cURL Test Upload

```bash
curl -X POST http://localhost:4000/graphql \
  -F operations='{"query":"mutation($file: Upload!) { uploadEvidenceFile(evidenceId: \"test-uuid\", file: $file) { id original_filename file_size } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@./test-file.jpg
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "ENOENT: no such file or directory" | `mkdir -p uploads/thumbnails` |
| "Permission denied" | `chmod 755 uploads` |
| "Storage provider not configured" | Check `STORAGE_PROVIDER=local` in `.env` |
| Test script fails | Run `npm install` then `node test-file-upload.js` |

---

## Production Migration

### Switch to AWS S3
```bash
STORAGE_PROVIDER=s3
S3_BUCKET=rabbithole-evidence
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Switch to Cloudflare R2
```bash
STORAGE_PROVIDER=cloudflare_r2
R2_ACCOUNT_ID=...
R2_BUCKET=rabbithole-evidence
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

**Remember:** Restart server after changing providers!

---

## Supported File Types

✅ Images: JPG, PNG, GIF, WEBP
✅ Documents: PDF, DOCX, TXT
✅ Videos: MP4, WEBM, MOV
✅ Audio: MP3, WAV, OGG
✅ Data: JSON, CSV, XLSX

❌ Executables: .exe, .sh, .bat
❌ Scripts: .js, .py, .php

---

## Directory Structure

```
uploads/
├── .gitkeep
├── thumbnails/           # Auto-generated image thumbnails
└── evidence/             # Created on first upload
    └── {evidenceId}/
        └── {hash}/
            └── {timestamp}_{filename}
```

---

## Verification Checklist

- [x] `.env` file created with `STORAGE_PROVIDER=local`
- [x] `.gitignore` configured to ignore uploads and .env
- [x] `uploads/` directory created
- [x] `uploads/thumbnails/` directory created
- [x] `uploads/.gitkeep` added
- [x] `test-file-upload.js` created and tested
- [x] Documentation updated
- [x] LocalStorageProvider verified in FileStorageService.ts

---

## Support Files

- `LOCAL_STORAGE_SETUP.md` - Complete setup report
- `EVIDENCE_QUICK_START.md` - Full quick start guide
- `EVIDENCE_MANAGEMENT.md` - Complete documentation
- `test-file-upload.js` - Storage test script
- `verify-setup.sh` - Setup verification script

---

**Status:** ✅ Local storage configured and tested
**Test Command:** `node test-file-upload.js`
**GraphQL Endpoint:** `http://localhost:4000/graphql`
**Uploads Location:** `./uploads/`

---

*Last Updated: 2025-10-09*
