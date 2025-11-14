# Audio Processing System - Phase 2 Implementation

## Overview

This migration adds comprehensive audio transcription capabilities using OpenAI's Whisper API. The system supports multiple audio formats, provides timestamped segments, and includes full-text search functionality.

## Features

### 1. OpenAI Whisper Integration
- **Model**: whisper-1 (configurable via `WHISPER_MODEL`)
- **Supported Formats**: mp3, wav, m4a, webm, mp4, mpga, mpeg, flac, ogg
- **Maximum File Size**: 25MB (Whisper API limit)
- **Language Support**: Auto-detection + manual specification (100+ languages)
- **Timestamps**: Segment-level timestamps with millisecond precision

### 2. Database Schema

#### AudioTranscriptions Table
Stores complete transcription results:
- `transcript_text`: Full text transcript
- `transcript_json`: Complete API response (JSONB)
- `language`: Detected/specified language code
- `duration_seconds`: Audio duration
- `word_count`: Total words (auto-calculated via trigger)
- `speaker_count`: For future diarization support
- `processing_service`: 'whisper' or 'assemblyai'
- `content_vector`: Full-text search vector (tsvector)

#### TranscriptSegments Table
Stores time-aligned segments:
- `segment_order`: Sequential order in transcript
- `start_time`/`end_time`: Precise timestamps (decimal seconds)
- `text`: Segment text
- `speaker_id`: For future speaker diarization
- `confidence`: Quality metric (when available)

### 3. GraphQL API

#### Mutations

**processAudio**
```graphql
mutation ProcessAudio($fileId: ID!, $language: String, $prompt: String) {
  processAudio(fileId: $fileId, language: $language, prompt: $prompt) {
    success
    transcriptionId
    transcriptText
    language
    durationSeconds
    wordCount
    segmentCount
    speakerCount
    processingService
    processingTimeMs
    segments {
      id
      segmentOrder
      startTime
      endTime
      text
      confidence
    }
    error
  }
}
```

Parameters:
- `fileId`: UUID of uploaded audio file
- `language`: Optional ISO-639-1 code (e.g., 'en', 'es')
- `prompt`: Optional context to guide transcription

#### Queries

**getAudioTranscription**
```graphql
query GetTranscription($fileId: ID!) {
  getAudioTranscription(fileId: $fileId) {
    id
    transcriptText
    language
    durationSeconds
    wordCount
    processingTimeMs
  }
}
```

**getTranscriptSegments**
```graphql
query GetSegments($transcriptionId: ID!, $limit: Int, $offset: Int) {
  getTranscriptSegments(
    transcriptionId: $transcriptionId
    limit: $limit
    offset: $offset
  ) {
    id
    segmentOrder
    startTime
    endTime
    text
    speakerId
    confidence
  }
}
```

**searchAudioTranscripts**
```graphql
query SearchAudio($query: String!, $language: String, $limit: Int) {
  searchAudioTranscripts(query: $query, language: $language, limit: $limit) {
    transcriptionId
    fileId
    filename
    language
    durationSeconds
    matchSnippet
    relevance
    processedAt
  }
}
```

**getAudioProcessingStats**
```graphql
query GetAudioStats($evidenceId: ID, $limit: Int) {
  getAudioProcessingStats(evidenceId: $evidenceId, limit: $limit) {
    fileId
    filename
    language
    durationSeconds
    wordCount
    segmentCount
    processingStatus
    processingTimeMs
    avgConfidence
  }
}
```

### 4. Full-Text Search

The system includes PostgreSQL full-text search with:
- `content_vector` (tsvector) for fast full-text queries
- Automatic vector updates via triggers
- Relevance ranking using `ts_rank`
- Highlighted snippets using `ts_headline`

**Search Function**:
```sql
SELECT * FROM search_audio_transcripts('kennedy assassination', 'en', 10);
```

### 5. Error Handling

The service includes comprehensive error handling:
- **Rate Limiting**: Exponential backoff retry (up to 3 attempts)
- **File Size Validation**: 25MB limit enforcement
- **Format Validation**: Checks supported audio formats
- **API Error Mapping**: User-friendly error messages
- **Database Logging**: All errors stored in `processing_error` field

### 6. Performance Features

- **Retry Logic**: Exponential backoff for transient failures
- **Processing Metrics**: Tracks time for each operation
- **Batch Segment Storage**: Efficient multi-insert pattern
- **Indexed Queries**: Optimized for time-range and text searches

## Installation & Setup

### 1. Run Migration

```bash
# From backend directory
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < migrations/018_audio_processing.sql
```

### 2. Configure Environment

Add to `backend/.env`:
```env
# OpenAI Configuration (required)
OPENAI_API_KEY=sk-your-actual-api-key-here

# Whisper Configuration (optional, defaults shown)
WHISPER_MODEL=whisper-1
WHISPER_MAX_RETRIES=3
WHISPER_RETRY_DELAY=1000
```

### 3. Integrate Resolver Methods

The audio processing methods have been created in:
`backend/src/resolvers/AudioProcessingMethods.ts`

**To integrate**:
1. Copy the methods from `AudioProcessingMethods.ts`
2. Paste into `EvidenceFileResolver.ts` before the closing class brace
3. Ensure imports are added (already done):
   ```typescript
   import { audioService } from '../services/AudioProcessingService';
   import {
     AudioTranscription,
     TranscriptSegment,
     AudioTranscriptionResult,
     AudioProcessingStats,
     TranscriptSearchResult,
   } from '../entities/AudioTranscription';
   ```

### 4. Restart Backend

```bash
cd backend
npm start
```

## Usage Examples

### Example 1: Upload and Process Audio

```typescript
// 1. Upload audio file
const uploadResult = await uploadEvidenceFile({
  evidenceId: "evidence-uuid",
  file: audioFileBlob,
  isPrimary: true
});

// 2. Process audio
const result = await processAudio({
  fileId: uploadResult.id,
  language: "en"
});

console.log(`Transcribed ${result.wordCount} words in ${result.durationSeconds}s`);
console.log(`Transcript: ${result.transcriptText}`);
```

### Example 2: Search Transcripts

```typescript
const results = await searchAudioTranscripts({
  query: "conspiracy theory",
  language: "en",
  limit: 10
});

results.forEach(result => {
  console.log(`${result.filename}: ${result.matchSnippet}`);
  console.log(`Relevance: ${result.relevance}`);
});
```

### Example 3: Get Time-Aligned Segments

```typescript
const segments = await getTranscriptSegments({
  transcriptionId: "transcription-uuid",
  limit: 100,
  offset: 0
});

segments.forEach(segment => {
  console.log(`[${segment.startTime}s - ${segment.endTime}s]: ${segment.text}`);
});
```

## Database Functions

### search_audio_transcripts
Full-text search with relevance ranking:
```sql
SELECT * FROM search_audio_transcripts(
  'search query',  -- Text to search
  'en',            -- Language filter (optional)
  10               -- Limit
);
```

### search_transcript_segments_by_time
Find segments in a time range:
```sql
SELECT * FROM search_transcript_segments_by_time(
  'transcription-uuid',  -- Transcription ID
  10.5,                  -- Start time (seconds)
  25.0                   -- End time (seconds)
);
```

### get_transcript_statistics
Get detailed statistics:
```sql
SELECT * FROM get_transcript_statistics('transcription-uuid');
```

## Future Enhancements

### Speaker Diarization with AssemblyAI

The schema is ready for speaker diarization. To add AssemblyAI:

1. **Install Package**:
   ```bash
   npm install assemblyai
   ```

2. **Add Configuration**:
   ```env
   ASSEMBLYAI_API_KEY=your-api-key
   ```

3. **Implement Service**:
   ```typescript
   import { AssemblyAI } from 'assemblyai';

   const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
   const transcript = await client.transcripts.create({
     audio_url: fileUrl,
     speaker_labels: true,
   });

   // Map speakers to segments
   segments = transcript.utterances.map(u => ({
     text: u.text,
     startTime: u.start / 1000,
     endTime: u.end / 1000,
     speakerId: u.speaker,
     speakerLabel: `Speaker ${u.speaker}`,
     confidence: u.confidence,
   }));
   ```

4. **Update Database**:
   - Set `processing_service = 'assemblyai'`
   - Populate `speaker_id` and `speaker_label` fields
   - Update `speaker_count` based on unique speakers

## Performance Benchmarks

Based on OpenAI Whisper API performance:
- **Processing Speed**: ~10x real-time (5 min audio = 30 sec processing)
- **Accuracy**: 95%+ for clear English audio
- **Cost**: $0.006/minute of audio
- **Concurrent Limit**: Based on API tier (see OpenAI docs)

## Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution**: Set `OPENAI_API_KEY` in `.env` file

### Issue: "Audio format not supported"
**Solution**: Convert to supported format (mp3, wav, m4a, etc.)

### Issue: "Audio file too large"
**Solution**: Compress or split audio (25MB limit)

### Issue: Rate limit exceeded
**Solution**: Wait and retry. System has automatic retry logic.

### Issue: Transcription accuracy poor
**Solution**:
- Provide language hint: `language: "en"`
- Add context prompt: `prompt: "Discussion about JFK assassination"`
- Ensure audio quality is good (clear speech, low noise)

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **File Validation**: Service validates file type before processing
3. **Error Sanitization**: Error messages don't expose internal details
4. **Rate Limiting**: Retry logic prevents API abuse
5. **Database Permissions**: Proper GRANT statements for backend_app/readonly_user

## Monitoring & Logging

The system logs:
- ✓ Successful transcriptions with metrics
- ✗ Failed transcriptions with error details
- Processing time for each operation
- API retry attempts

Example logs:
```
✓ AudioProcessingService initialized with model: whisper-1
Processing audio file with Whisper: /uploads/audio.mp3
✓ Audio transcribed in 2456ms (duration: 120.5s, words: 1847, language: en)
✓ Audio processed successfully: interview.mp3 (120.5s, 1847 words, 45 segments)
```

## Migration Verification

After running the migration, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('AudioTranscriptions', 'TranscriptSegments');

-- Check view exists
SELECT * FROM public."AudioProcessingStats" LIMIT 1;

-- Test search function
SELECT * FROM search_audio_transcripts('test', NULL, 5);

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('AudioTranscriptions', 'TranscriptSegments');
```

## Support

For issues or questions:
1. Check logs: `docker logs rabbithole-api-1`
2. Verify OpenAI API key is valid
3. Test with small audio file first
4. Review error messages in database

---

**Status**: ✓ Phase 2 Complete - Ready for Integration
**Next Phase**: Video Processing (OCR, Scene Detection)
