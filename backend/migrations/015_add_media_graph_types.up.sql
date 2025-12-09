-- ============================================================================
-- MEDIA PIPELINE TYPES: MediaJob and MediaFile
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES 
('MediaFile',
    NULL,
    '{
        "description": "A media file (audio, video, document) uploaded to the system",
        "fields": {
            "filename": {"type": "string", "required": true},
            "mimetype": {"type": "string", "required": true},
            "size": {"type": "number", "required": true},
            "path": {"type": "string", "required": true},
            "url": {"type": "string", "format": "uri"},
            "storageProvider": {"type": "enum", "values": ["local", "s3"], "default": "local"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('MediaJob',
    NULL,
    '{
        "description": "A background processing job for media files",
        "fields": {
            "jobId": {"type": "uuid", "required": true},
            "fileId": {"type": "uuid", "required": true},
            "type": {"type": "enum", "values": ["audio_transcription", "video_analysis", "document_ocr"], "required": true},
            "status": {"type": "enum", "values": ["queued", "processing", "completed", "failed"], "default": "queued"},
            "progress": {"type": "number", "min": 0, "max": 100, "default": 0},
            "result": {"type": "object"},
            "error": {"type": "string"},
            "options": {"type": "object"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MEDIA EDGES
-- ============================================================================

INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES
('PROCESSED_BY',
    (SELECT id FROM node_types WHERE name = 'MediaFile'),
    (SELECT id FROM node_types WHERE name = 'MediaJob'),
    '{
        "description": "Connects a media file to its processing job",
        "cardinality": "one-to-many"
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;