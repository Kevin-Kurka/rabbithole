# Phase 3: Video Processing Service - Implementation Summary

## Overview
Successfully implemented comprehensive video processing capabilities with ffmpeg and Tesseract.js integration.

## Files Created

### 1. Service Layer
**`/Users/kmk/rabbithole/backend/src/services/VideoProcessingService.ts`**
- Frame extraction using fluent-ffmpeg
- Thumbnail generation (first, middle, and key frames)
- Scene detection using ffmpeg scene filter
- OCR on extracted frames using Tesseract.js
- Metadata extraction (duration, resolution, codec, fps, bitrate)
- Support for video formats: mp4, mov, avi, webm, mkv, flv, wmv

**Key Features:**
- Configurable frame extraction rate (default 1 FPS)
- Scene threshold adjustment (default 0.4)
- Automatic cleanup of Tesseract worker
- Comprehensive error handling
- Processing time tracking

### 2. Database Schema
**`/Users/kmk/rabbithole/backend/migrations/019_video_processing.sql`**

**Tables Created:**
- `VideoMetadata` - Stores video properties (duration, resolution, codec, fps, bitrate)
- `VideoFrames` - Stores extracted frames with OCR text and full-text search
- `VideoScenes` - Stores detected scenes with time ranges and thumbnails

**Features:**
- Full-text search on OCR text via tsvector
- Automatic content_vector updates via triggers
- Metadata count aggregation via triggers
- Foreign key constraints with cascade delete
- Indexes for performance (timestamp, type, content search)

**Functions Created:**
- `search_video_content(query, file_id, limit)` - Full-text search across OCR and scenes
- `get_video_timeline(file_id, include_all_frames)` - Chronological timeline of events
- `update_video_metadata_counts()` - Automatic count updates

**Views Created:**
- `VideoProcessingStats` - Comprehensive processing statistics and status

### 3. Entity Types
**`/Users/kmk/rabbithole/backend/src/entities/VideoMetadata.ts`**
- TypeGraphQL entity for video metadata

**`/Users/kmk/rabbithole/backend/src/entities/VideoFrame.ts`**
- TypeGraphQL entity for video frames with OCR data

**`/Users/kmk/rabbithole/backend/src/entities/VideoScene.ts`**
- TypeGraphQL entity for video scenes

### 4. GraphQL Resolver Extensions
**`/Users/kmk/rabbithole/backend/src/resolvers/EvidenceFileResolver.ts`**

**Mutations Added:**
```graphql
processVideo(
  fileId: ID!
  extractFrames: Boolean = true
  performOCR: Boolean = true
  detectScenes: Boolean = true
  framesPerSecond: Float = 1
): VideoProcessingResultType
```

**Queries Added:**
```graphql
getVideoMetadata(fileId: ID!): VideoMetadata
getVideoFrames(fileId: ID!, withOCROnly: Boolean = false, limit: Int = 100): [VideoFrame!]!
getVideoScenes(fileId: ID!): [VideoScene!]!
searchVideoContent(query: String!, fileId: ID, limit: Int = 20): [VideoSearchResult!]!
```

**Supporting Types:**
- `VideoProcessingResultType` - Processing result with metadata, counts, and thumbnails
- `VideoThumbnailsType` - Thumbnail paths and counts
- `VideoSearchResult` - Search result with relevance ranking

## Dependencies Installed

```bash
npm install tesseract.js@5.1.1
# @types/fluent-ffmpeg already installed
```

## Database Schema Details

### VideoMetadata Table
```sql
- id (uuid, PK)
- file_id (uuid, FK -> EvidenceFiles, UNIQUE)
- duration_seconds (decimal)
- width, height (integer)
- fps (decimal)
- codec, file_format (varchar)
- bitrate (bigint)
- total_frames, extracted_frames, scene_count (integer)
- ocr_text_length (integer)
- created_at, updated_at (timestamptz)
```

### VideoFrames Table
```sql
- id (uuid, PK)
- file_id (uuid, FK -> EvidenceFiles)
- frame_number (integer)
- timestamp_seconds (decimal)
- frame_type (varchar: thumbnail/scene_change/ocr_extracted/key_frame)
- storage_key, storage_provider, storage_bucket (varchar)
- ocr_text (text)
- ocr_confidence (decimal 0-100)
- ocr_language (varchar, default 'eng')
- content_vector (tsvector) - Auto-updated for full-text search
- width, height, file_size (integer)
- created_at, updated_at (timestamptz)
- UNIQUE(file_id, frame_number)
```

### VideoScenes Table
```sql
- id (uuid, PK)
- file_id (uuid, FK -> EvidenceFiles)
- scene_number (integer)
- start_time, end_time (decimal)
- thumbnail_frame_id (uuid, FK -> VideoFrames)
- description (text)
- tags (text[])
- frame_count (integer)
- duration_seconds (decimal, computed)
- content_vector (tsvector) - Auto-updated for full-text search
- created_at, updated_at (timestamptz)
- UNIQUE(file_id, scene_number)
- CHECK(end_time > start_time)
```

### EvidenceFiles Extensions
```sql
- video_processed (boolean, default false)
- video_processing_started_at (timestamptz)
- video_processing_completed_at (timestamptz)
- video_processing_error (text)
```

## Usage Example

### GraphQL Mutation
```graphql
mutation ProcessVideo {
  processVideo(
    fileId: "uuid-of-video-file"
    extractFrames: true
    performOCR: true
    detectScenes: true
    framesPerSecond: 1
  ) {
    success
    fileId
    metadata {
      duration_seconds
      width
      height
      fps
      codec
    }
    frameCount
    sceneCount
    thumbnails {
      first
      middle
      keyFrameCount
    }
    processingTimeMs
    error
  }
}
```

### Search Video Content
```graphql
query SearchVideos {
  searchVideoContent(
    query: "kennedy assassination"
    limit: 20
  ) {
    content_type
    filename
    match_text
    timestamp_seconds
    relevance
  }
}
```

### Get Video Timeline
```sql
SELECT * FROM get_video_timeline('file-id', true);
-- Returns chronological list of scenes and frames with OCR
```

## Processing Workflow

1. **Upload Video** → `uploadEvidenceFile` mutation
2. **Process Video** → `processVideo` mutation
   - Extract metadata (duration, resolution, codec, fps)
   - Generate thumbnails (first, middle, key frames)
   - Extract frames at specified rate
   - Perform OCR on frames
   - Detect scene changes
   - Store all data in database
3. **Query Results**
   - Get metadata: `getVideoMetadata`
   - Get frames: `getVideoFrames`
   - Get scenes: `getVideoScenes`
   - Search content: `searchVideoContent`

## Performance Considerations

### Indexes Created
- `idx_video_frames_file` - Fast file-based queries
- `idx_video_frames_timestamp` - Timeline queries
- `idx_video_frames_content_search` - GIN index for full-text search
- `idx_video_scenes_time_range` - Scene time range queries
- `idx_video_scenes_tags` - GIN index for tag search

### Optimization Tips
- Use `framesPerSecond` parameter to control extraction density
- Set `extractFrames: false` for quick metadata-only processing
- Set `performOCR: false` to skip text extraction
- Use `withOCROnly: true` when querying frames to reduce data transfer
- Scene detection threshold (0.4) balances sensitivity vs. over-segmentation

## Error Handling

- File not found → Returns error
- Invalid video format → Returns error with supported formats
- FFmpeg errors → Logged and returned with processing time
- OCR failures → Frame included without OCR text (warning logged)
- Scene detection failures → Falls back to single scene for entire video

## Testing Recommendations

1. **Unit Tests**
   - Test `extractMetadata` with various video formats
   - Test `isSupportedFormat` with edge cases
   - Test frame extraction with different FPS values
   - Test OCR with frames containing text

2. **Integration Tests**
   - Upload video → Process → Query metadata
   - Process with OCR → Search content
   - Scene detection accuracy
   - Full-text search relevance

3. **Performance Tests**
   - Large video files (>1GB)
   - High frame extraction rates (>5 FPS)
   - Many concurrent processing requests

## Known Limitations

1. **FFmpeg Required** - Must be installed on system (`brew install ffmpeg` on macOS)
2. **Tesseract.js** - OCR accuracy depends on video quality and text clarity
3. **Storage** - Extracted frames consume disk space (plan for cleanup strategy)
4. **Processing Time** - Large videos can take several minutes
5. **Scene Detection** - May need threshold tuning per video type

## Future Enhancements

1. **AI-Powered Scene Description** - Use vision models for automatic descriptions
2. **Speaker Diarization** - Combine with audio transcription for speaker-to-scene mapping
3. **Object Detection** - Identify key objects/people in frames
4. **Frame Deduplication** - Skip identical or near-identical frames
5. **Parallel Processing** - Process multiple videos concurrently
6. **Cloud Storage** - Upload frames to S3/R2 instead of local storage
7. **Video Summary** - Generate AI-powered video summaries
8. **Keyframe Selection** - Smarter selection based on visual complexity

## Migration Instructions

To apply the database migration:

```bash
# Using Docker
docker exec -i rabbithole-postgres-1 psql -U postgres -d rabbithole_db < backend/migrations/019_video_processing.sql

# Or using psql directly
psql -U postgres -d rabbithole_db -f backend/migrations/019_video_processing.sql
```

## Verification Queries

```sql
-- Check video processing stats
SELECT * FROM public."VideoProcessingStats" LIMIT 5;

-- Search video content
SELECT * FROM search_video_content('kennedy', NULL, 10);

-- Get video timeline
SELECT * FROM get_video_timeline('<file-id>', true);

-- Count processed videos
SELECT COUNT(*) FROM public."VideoMetadata";

-- Check frames with OCR
SELECT COUNT(*) FROM public."VideoFrames" WHERE ocr_text IS NOT NULL;
```

## Issues Encountered

### 1. TypeScript Import Issue
**Problem:** `ffmpeg` import failed with `esModuleInterop` error
**Solution:** Changed from `import ffmpeg from 'fluent-ffmpeg'` to `import * as ffmpeg from 'fluent-ffmpeg'`

### 2. Bitrate Type Ambiguity
**Problem:** `bit_rate` could be string or number
**Solution:** Added type check before parseInt conversion

### 3. Auto-formatter Conflicts
**Problem:** Auto-formatter modified imports during edit
**Solution:** Manually restored correct imports and removed generated files

## Status

✅ **COMPLETED**

All components successfully implemented:
- [x] VideoProcessingService with ffmpeg and Tesseract.js
- [x] Database migration with tables, functions, views, and triggers
- [x] Entity types for TypeGraphQL
- [x] GraphQL mutations and queries
- [x] Full-text search integration
- [x] Scene detection and timeline generation
- [x] Comprehensive documentation

## Next Steps

1. Apply database migration
2. Restart backend server
3. Test with sample video files
4. Monitor processing performance
5. Implement frontend UI for video processing
6. Add batch processing queue for multiple videos
