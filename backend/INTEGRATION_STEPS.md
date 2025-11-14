# Audio Processing Integration - Quick Steps

## Prerequisites

✓ All files created (see PHASE2_AUDIO_PROCESSING_SUMMARY.md)
✓ Database migration file ready
✓ OpenAI API key obtained

---

## Step-by-Step Integration

### 1. Run Database Migration (2 minutes)

```bash
cd /Users/kmk/rabbithole
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/018_audio_processing.sql
```

**Expected Output**:
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
...
GRANT
```

**Verify**:
```bash
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "\dt public.\"AudioTranscriptions\""
```

Should show the table exists.

---

### 2. Update OpenAI API Key (1 minute)

Edit `/Users/kmk/rabbithole/backend/.env`:

```env
# Change this line:
OPENAI_API_KEY=sk-your-api-key-here

# To your actual key:
OPENAI_API_KEY=sk-proj-...your-real-key...
```

Get your API key from: https://platform.openai.com/api-keys

---

### 3. Add Audio Processing Methods to Resolver (3 minutes)

**Location**: `/Users/kmk/rabbithole/backend/src/resolvers/EvidenceFileResolver.ts`

**Find this line** (should be near line 1210):
```typescript
    return result.rows;
  }
}  // <-- This closing brace ends the EvidenceFileResolver class

// ============================================================================
// SUPPORTING TYPES
```

**Replace with**:
```typescript
    return result.rows;
  }

  // ==========================================================================
  // AUDIO PROCESSING MUTATIONS & QUERIES
  // ==========================================================================

  // [PASTE ALL METHODS FROM AudioProcessingMethods.ts HERE]

}  // <-- Keep this closing brace

// ============================================================================
// SUPPORTING TYPES
```

**Source**: Copy all methods from:
`/Users/kmk/rabbithole/backend/src/resolvers/AudioProcessingMethods.ts`

Start copying from line 10 (the first `@Mutation` decorator) through the end of the file.

---

### 4. Restart Backend (1 minute)

```bash
cd /Users/kmk/rabbithole/backend
npm start
```

**Expected Logs**:
```
✓ AudioProcessingService initialized with model: whisper-1
✓ Server started on http://localhost:4000
✓ GraphQL endpoint: http://localhost:4000/graphql
```

---

### 5. Verify GraphQL Schema (1 minute)

Open GraphQL Playground: http://localhost:4000/graphql

**Check Schema** - Look for these types in the documentation panel:
- `AudioTranscription`
- `TranscriptSegment`
- `AudioTranscriptionResult`
- `processAudio` mutation
- `getAudioTranscription` query
- `searchAudioTranscripts` query

**Test Query**:
```graphql
query {
  __type(name: "AudioTranscription") {
    name
    fields {
      name
      type {
        name
      }
    }
  }
}
```

Should return the AudioTranscription type definition.

---

## Testing with Real Audio

### Upload Audio File

First, you need an audio file. For testing, you can:
1. Record a short voice memo on your phone
2. Download a sample from: https://freesound.org
3. Use any mp3/wav file you have

**Upload via GraphQL**:
```graphql
mutation {
  uploadEvidenceFile(
    evidenceId: "your-evidence-uuid"
    file: <upload-file>
    isPrimary: false
  ) {
    id
    fileType
    originalFilename
    mimeType
    fileSize
  }
}
```

**Note**: File uploads require multipart form data. Use a GraphQL client like Altair or Insomnia that supports file uploads.

---

### Process the Audio

```graphql
mutation {
  processAudio(
    fileId: "file-uuid-from-upload"
    language: "en"
  ) {
    success
    transcriptText
    language
    durationSeconds
    wordCount
    segmentCount
    processingTimeMs
    error
  }
}
```

**Expected Result**:
```json
{
  "data": {
    "processAudio": {
      "success": true,
      "transcriptText": "This is the transcribed text...",
      "language": "en",
      "durationSeconds": 12.5,
      "wordCount": 45,
      "segmentCount": 3,
      "processingTimeMs": 2340,
      "error": null
    }
  }
}
```

---

### Get Transcription

```graphql
query {
  getAudioTranscription(fileId: "your-file-uuid") {
    id
    transcriptText
    language
    durationSeconds
    wordCount
    processingService
    processedAt
  }
}
```

---

### Get Segments

```graphql
query {
  getTranscriptSegments(
    transcriptionId: "transcription-uuid"
    limit: 100
  ) {
    segmentOrder
    startTime
    endTime
    text
    confidence
  }
}
```

**Expected Result**:
```json
{
  "data": {
    "getTranscriptSegments": [
      {
        "segmentOrder": 1,
        "startTime": 0.0,
        "endTime": 4.2,
        "text": "This is the first segment",
        "confidence": 0.95
      },
      {
        "segmentOrder": 2,
        "startTime": 4.2,
        "endTime": 8.5,
        "text": "This is the second segment",
        "confidence": 0.92
      }
    ]
  }
}
```

---

### Search Transcriptions

```graphql
query {
  searchAudioTranscripts(
    query: "test search term"
    limit: 5
  ) {
    transcriptionId
    filename
    language
    durationSeconds
    matchSnippet
    relevance
  }
}
```

---

## Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Cause**: API key not set or still placeholder
**Solution**:
```bash
cd /Users/kmk/rabbithole/backend
grep OPENAI_API_KEY .env
```

Should show your real API key starting with `sk-proj-` or `sk-`.

---

### Issue: Migration fails with "relation already exists"

**Cause**: Migration already partially applied
**Solution**:
```sql
-- Check what exists
\dt public."Audio*"

-- If tables exist, you can skip migration or drop and re-run
DROP TABLE IF EXISTS public."TranscriptSegments" CASCADE;
DROP TABLE IF EXISTS public."AudioTranscriptions" CASCADE;

-- Then re-run migration
```

---

### Issue: "AudioTranscription not defined" in GraphQL

**Cause**: Resolver methods not properly integrated
**Solution**:
1. Check imports in EvidenceFileResolver.ts (should include AudioTranscription entities)
2. Verify methods are inside the class (before the closing `}`)
3. Restart backend: `npm start`

---

### Issue: Processing fails with 401 Unauthorized

**Cause**: Invalid OpenAI API key
**Solution**:
1. Verify API key at: https://platform.openai.com/api-keys
2. Check key has credits: https://platform.openai.com/usage
3. Update .env with correct key
4. Restart backend

---

### Issue: "File is not an audio file"

**Cause**: File type not detected as audio
**Solution**:
```sql
-- Check file type
SELECT id, original_filename, file_type, mime_type
FROM public."EvidenceFiles"
WHERE id = 'your-file-uuid';

-- If file_type is wrong, you may need to re-upload
```

---

## Verification Checklist

After integration, verify:

- [ ] Database migration completed successfully
- [ ] Tables created: `AudioTranscriptions`, `TranscriptSegments`
- [ ] View created: `AudioProcessingStats`
- [ ] Functions work: `search_audio_transcripts`
- [ ] Backend starts without errors
- [ ] Log shows: "AudioProcessingService initialized"
- [ ] GraphQL schema includes `AudioTranscription` type
- [ ] GraphQL schema includes `processAudio` mutation
- [ ] Can upload audio file
- [ ] Can process audio and get transcription
- [ ] Can query transcript segments
- [ ] Can search transcriptions
- [ ] Full-text search works

---

## Quick Verification Commands

```bash
# 1. Check backend is running
curl http://localhost:4000/graphql -d '{"query":"{__typename}"}' -H "Content-Type: application/json"

# 2. Check database tables
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT COUNT(*) FROM public.\"AudioTranscriptions\""

# 3. Check logs
docker logs rabbithole-api-1 --tail 50 | grep -i audio

# 4. Test search function
docker exec -it rabbithole-postgres-1 psql -U postgres -d rabbithole_db -c "SELECT * FROM search_audio_transcripts('test', NULL, 1)"
```

---

## Next Steps After Integration

1. **Upload Test Audio**: Use a short (30-60 second) audio file
2. **Monitor Processing**: Watch logs for transcription progress
3. **Verify Results**: Check transcript accuracy
4. **Test Search**: Search for keywords in transcript
5. **Review Performance**: Note processing times
6. **Update Documentation**: Document any project-specific notes

---

## Support Resources

- **Full Documentation**: `backend/migrations/018_AUDIO_PROCESSING_README.md`
- **Summary**: `backend/PHASE2_AUDIO_PROCESSING_SUMMARY.md`
- **OpenAI Docs**: https://platform.openai.com/docs/guides/speech-to-text
- **Project README**: `backend/README.md`

---

**Total Integration Time**: ~10 minutes
**First Transcription Test**: ~15 minutes
**Status**: Ready for Integration

