-- ============================================================================
-- MISSING SYSTEM TYPES: NodeTypes and EdgeTypes needed by services
-- ============================================================================
-- This migration adds NodeTypes that were incorrectly referenced as standalone
-- tables in services. All data must be stored in JSONB props.
-- ============================================================================

-- ============================================================================
-- 1. SYSTEM CONFIGURATION TYPES
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('SystemConfiguration',
    NULL,
    '{
        "description": "System-wide configuration settings",
        "fields": {
            "key": {"type": "string", "required": true},
            "value": {"type": "any", "required": true},
            "description": {"type": "string"},
            "category": {"type": "string"},
            "isSecret": {"type": "boolean", "default": false},
            "updatedBy": {"type": "uuid"}
        }
    }'::jsonb,
    '{"system": true, "singleton_key": "key"}'::jsonb
),
('ConfigurationAuditLog',
    NULL,
    '{
        "description": "Audit log for configuration changes",
        "fields": {
            "configKey": {"type": "string", "required": true},
            "previousValue": {"type": "any"},
            "newValue": {"type": "any"},
            "changedBy": {"type": "uuid", "required": true},
            "changeReason": {"type": "string"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. EVIDENCE CLASSIFICATION TYPES
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('EvidenceType',
    NULL,
    '{
        "description": "Classification of evidence with associated credibility weight",
        "fields": {
            "code": {"type": "string", "required": true},
            "name": {"type": "string", "required": true},
            "weight": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
            "description": {"type": "string"},
            "category": {"type": "enum", "values": ["primary", "secondary", "tertiary", "anecdotal"]}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('CredibilityThreshold',
    NULL,
    '{
        "description": "Threshold settings for credibility calculations by inquiry type",
        "fields": {
            "inquiryType": {"type": "string", "required": true},
            "inclusionThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
            "verifiedThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.85},
            "excludedThreshold": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.3}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. CONVERSATION & AI TYPES
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Conversation',
    NULL,
    '{
        "description": "AI conversation session",
        "fields": {
            "userId": {"type": "uuid", "required": true},
            "title": {"type": "string"},
            "contextType": {"type": "enum", "values": ["graph", "node", "inquiry", "general"]},
            "contextId": {"type": "uuid"},
            "status": {"type": "enum", "values": ["active", "archived"], "default": "active"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('ConversationMessage',
    NULL,
    '{
        "description": "Message in an AI conversation",
        "fields": {
            "conversationId": {"type": "uuid", "required": true},
            "role": {"type": "enum", "values": ["user", "assistant", "system"], "required": true},
            "content": {"type": "string", "required": true},
            "contextNodeIds": {"type": "array", "items": {"type": "uuid"}},
            "tokenCount": {"type": "number"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. COLLABORATION TYPES
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('GraphLock',
    NULL,
    '{
        "description": "Lock on a graph for exclusive editing",
        "fields": {
            "graphId": {"type": "uuid", "required": true},
            "userId": {"type": "uuid", "required": true},
            "lockType": {"type": "enum", "values": ["exclusive", "shared"], "default": "exclusive"},
            "expiresAt": {"type": "datetime", "required": true},
            "reason": {"type": "string"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('PresenceSession',
    NULL,
    '{
        "description": "User presence in a collaborative session",
        "fields": {
            "userId": {"type": "uuid", "required": true},
            "graphId": {"type": "uuid", "required": true},
            "cursorPosition": {"type": "object", "fields": {"x": {"type": "number"}, "y": {"type": "number"}}},
            "selectedNodeIds": {"type": "array", "items": {"type": "uuid"}},
            "lastActiveAt": {"type": "datetime"},
            "color": {"type": "string"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. FILE & MEDIA TYPES (if not already defined)
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('File',
    NULL,
    '{
        "description": "Uploaded file metadata",
        "fields": {
            "filename": {"type": "string", "required": true},
            "originalName": {"type": "string", "required": true},
            "mimeType": {"type": "string", "required": true},
            "size": {"type": "number", "required": true},
            "storagePath": {"type": "string", "required": true},
            "storageType": {"type": "enum", "values": ["local", "s3", "r2"], "default": "local"},
            "uploadedBy": {"type": "uuid", "required": true},
            "processingStatus": {"type": "enum", "values": ["pending", "processing", "completed", "failed"], "default": "pending"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. EDGE TYPES FOR NEW NODE TYPES
-- ============================================================================

INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES
('HAS_MESSAGE',
    (SELECT id FROM node_types WHERE name = 'Conversation'),
    (SELECT id FROM node_types WHERE name = 'ConversationMessage'),
    '{
        "description": "Links conversation to its messages",
        "cardinality": "one-to-many",
        "fields": {
            "order": {"type": "number"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('LOCKS_GRAPH',
    (SELECT id FROM node_types WHERE name = 'GraphLock'),
    NULL,
    '{
        "description": "Lock targets a graph node",
        "cardinality": "one-to-one",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
),
('HAS_PRESENCE',
    NULL,
    (SELECT id FROM node_types WHERE name = 'PresenceSession'),
    '{
        "description": "Graph has active presence sessions",
        "cardinality": "one-to-many",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
),
('ATTACHES_FILE',
    NULL,
    (SELECT id FROM node_types WHERE name = 'File'),
    '{
        "description": "Node has attached file",
        "cardinality": "many-to-many",
        "fields": {
            "attachedBy": {"type": "uuid"},
            "attachmentType": {"type": "enum", "values": ["evidence", "reference", "media"]}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('AUDITS_CONFIG',
    (SELECT id FROM node_types WHERE name = 'ConfigurationAuditLog'),
    (SELECT id FROM node_types WHERE name = 'SystemConfiguration'),
    '{
        "description": "Audit log entry for configuration",
        "cardinality": "many-to-one",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
),
('HAS_EVIDENCE_TYPE',
    (SELECT id FROM node_types WHERE name = 'Evidence'),
    (SELECT id FROM node_types WHERE name = 'EvidenceType'),
    '{
        "description": "Evidence is classified by type",
        "cardinality": "many-to-one",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. SEED DEFAULT EVIDENCE TYPES
-- ============================================================================

-- Get EvidenceType node type ID for inserting default types
DO $$
DECLARE
    evidence_type_id UUID;
BEGIN
    SELECT id INTO evidence_type_id FROM node_types WHERE name = 'EvidenceType';

    IF evidence_type_id IS NOT NULL THEN
        -- Insert default evidence types as nodes
        INSERT INTO nodes (node_type_id, props) VALUES
        (evidence_type_id, '{
            "code": "PRIMARY",
            "name": "Primary Source",
            "weight": 1.0,
            "description": "Original documents, firsthand accounts, direct evidence",
            "category": "primary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "PEER_REVIEWED",
            "name": "Peer-Reviewed Research",
            "weight": 0.95,
            "description": "Academic papers and studies with peer review",
            "category": "primary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "OFFICIAL",
            "name": "Official Report",
            "weight": 0.9,
            "description": "Government or institutional official reports",
            "category": "primary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "EXPERT",
            "name": "Expert Analysis",
            "weight": 0.8,
            "description": "Analysis from recognized domain experts",
            "category": "secondary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "NEWS",
            "name": "News Report",
            "weight": 0.6,
            "description": "Journalism from reputable news sources",
            "category": "secondary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "SECONDARY",
            "name": "Secondary Source",
            "weight": 0.5,
            "description": "Commentary, analysis, or interpretation of primary sources",
            "category": "secondary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "USER_TESTIMONY",
            "name": "User Testimony",
            "weight": 0.4,
            "description": "Personal accounts from platform users",
            "category": "tertiary"
        }'::jsonb),
        (evidence_type_id, '{
            "code": "ANECDOTE",
            "name": "Anecdotal Evidence",
            "weight": 0.2,
            "description": "Personal stories without verification",
            "category": "anecdotal"
        }'::jsonb)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- 8. SEED DEFAULT CREDIBILITY THRESHOLDS
-- ============================================================================

DO $$
DECLARE
    threshold_type_id UUID;
BEGIN
    SELECT id INTO threshold_type_id FROM node_types WHERE name = 'CredibilityThreshold';

    IF threshold_type_id IS NOT NULL THEN
        INSERT INTO nodes (node_type_id, props) VALUES
        (threshold_type_id, '{
            "inquiryType": "default",
            "inclusionThreshold": 0.5,
            "verifiedThreshold": 0.85,
            "excludedThreshold": 0.3
        }'::jsonb),
        (threshold_type_id, '{
            "inquiryType": "factCheck",
            "inclusionThreshold": 0.6,
            "verifiedThreshold": 0.9,
            "excludedThreshold": 0.4
        }'::jsonb),
        (threshold_type_id, '{
            "inquiryType": "logicLens",
            "inclusionThreshold": 0.5,
            "verifiedThreshold": 0.85,
            "excludedThreshold": 0.3
        }'::jsonb)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
