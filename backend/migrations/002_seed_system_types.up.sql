-- ============================================================================
-- SYSTEM TYPES: Node and Edge types used by the application for functionality
-- ============================================================================

-- ============================================================================
-- 1. AUTHENTICATION & USER MANAGEMENT HIERARCHY
-- ============================================================================

-- Base User type
INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES (
    'User',
    NULL,
    '{
        "description": "Base user type for authentication and authorization",
        "schema_org_url": "https://schema.org/Person",
        "fields": {
            "username": {"type": "string", "required": true, "minLength": 3, "maxLength": 50},
            "email": {"type": "string", "required": true, "format": "email"},
            "passwordHash": {"type": "string", "required": true},
            "role": {"type": "enum", "values": ["user", "curator", "admin"], "default": "user"},
            "isActive": {"type": "boolean", "default": true}
        }
    }'::jsonb,
    '{"system": true, "immutable_schema": true}'::jsonb
),
('UserProfile', 
    (SELECT id FROM node_types WHERE name = 'User'),
    '{
        "description": "Extended profile data for users",
        "fields": {
            "displayName": {"type": "string", "maxLength": 100},
            "bio": {"type": "string", "maxLength": 1000},
            "avatar": {"type": "string", "format": "uri"},
            "reputation": {"type": "number", "default": 0, "min": 0},
            "expertise": {"type": "array", "items": {"type": "string"}}
        }
    }'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. INQUIRY SYSTEM HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Inquiry',
    NULL,
    '{
        "description": "A formal inquiry or investigation into a topic",
        "fields": {
            "title": {"type": "string", "required": true, "minLength": 3, "maxLength": 500},
            "description": {"type": "string", "maxLength": 5000},
            "status": {"type": "enum", "required": true, "default": "open", 
                      "values": ["open", "under_review", "resolved", "closed"]},
            "credibilityScore": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
            "authorId": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('Position',
    NULL,
    '{
        "description": "A stance or argument related to an inquiry",
        "fields": {
            "title": {"type": "string", "required": true, "maxLength": 500},
            "argument": {"type": "string", "required": true, "maxLength": 10000},
            "credibilityScore": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
            "authorId": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('ConsensusVote',
    NULL,
    '{
        "description": "A vote on a position or inquiry",
        "fields": {
            "voterId": {"type": "uuid", "required": true},
            "voteType": {"type": "enum", "required": true, "values": ["support", "oppose", "abstain"]},
            "confidence": {"type": "number", "min": 0.0, "max": 1.0, "default": 1.0},
            "reasoning": {"type": "string", "maxLength": 2000}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. EVIDENCE & METHODOLOGY HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Evidence',
    NULL,
    '{
        "description": "Supporting material or data for claims",
        "fields": {
            "title": {"type": "string", "required": true, "maxLength": 500},
            "content": {"type": "string", "required": true, "maxLength": 50000},
            "sourceUrl": {"type": "string", "format": "uri"},
            "sourceType": {"type": "enum", "required": true,
                          "values": ["academic_paper", "news_article", "government_report", "book", "website", "other"]},
            "qualityTier": {"type": "enum", "default": "medium", "values": ["high", "medium", "low"]},
            "credibilityScore": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.5},
            "submittedBy": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('Methodology',
    NULL,
    '{
        "description": "A defined process or framework for investigation",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 200},
            "description": {"type": "string", "required": true, "maxLength": 5000},
            "steps": {"type": "array", "required": true, "items": {
                "type": "object",
                "fields": {
                    "order": {"type": "number", "required": true},
                    "title": {"type": "string", "required": true},
                    "description": {"type": "string"},
                    "isRequired": {"type": "boolean", "default": true}
                }
            }},
            "createdBy": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. ACTIVITY & COLLABORATION HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('ActivityPost',
    NULL,
    '{
        "description": "A user activity or update",
        "fields": {
            "authorId": {"type": "uuid", "required": true},
            "content": {"type": "string", "required": true, "maxLength": 5000},
            "activityType": {"type": "enum", "required": true,
                            "values": ["update", "comment", "announcement", "question"]},
            "visibility": {"type": "enum", "default": "public", "values": ["public", "followers", "private"]}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('Tag',
    NULL,
    '{
        "description": "A label for categorization",
        "fields": {
            "name": {"type": "string", "required": true, "unique": true, "maxLength": 50},
            "description": {"type": "string", "maxLength": 500},
            "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('CuratorRole',
    NULL,
    '{
        "description": "A role assigned to a curator",
        "fields": {
            "roleName": {"type": "string", "required": true, "maxLength": 100},
            "permissions": {"type": "array", "required": true, "items": {"type": "string"}},
            "assignedBy": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SYSTEM EDGE TYPES
-- ============================================================================

INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES
('HAS_POSITION',
    (SELECT id FROM node_types WHERE name = 'Inquiry'),
    (SELECT id FROM node_types WHERE name = 'Position'),
    '{
        "description": "Connects an inquiry to a position",
        "cardinality": "one-to-many",
        "fields": {
            "order": {"type": "number", "description": "Display order of positions"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('CITES_EVIDENCE',
    (SELECT id FROM node_types WHERE name = 'Position'),
    (SELECT id FROM node_types WHERE name = 'Evidence'),
    '{
        "description": "Connects a position to supporting evidence",
        "cardinality": "many-to-many",
        "fields": {
            "relevance": {"type": "enum", "required": true, "values": ["supports", "refutes", "neutral"]},
            "strength": {"type": "number", "min": 0.0, "max": 1.0},
            "addedBy": {"type": "uuid", "required": true}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('USES_METHODOLOGY',
    (SELECT id FROM node_types WHERE name = 'Inquiry'),
    (SELECT id FROM node_types WHERE name = 'Methodology'),
    '{
        "description": "Connects an inquiry to its methodology",
        "cardinality": "many-to-one",
        "fields": {
            "progress": {"type": "number", "min": 0.0, "max": 1.0, "default": 0.0},
            "currentStep": {"type": "number"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('VOTES_ON',
    (SELECT id FROM node_types WHERE name = 'ConsensusVote'),
    NULL,
    '{
        "description": "Connects a vote to what is being voted on",
        "cardinality": "many-to-one",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
),
('TAGGED_WITH',
    NULL,
    (SELECT id FROM node_types WHERE name = 'Tag'),
    '{
        "description": "Connects a node to a tag",
        "cardinality": "many-to-many",
        "fields": {
            "addedBy": {"type": "uuid"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('AUTHORED_BY',
    NULL,
    (SELECT id FROM node_types WHERE name = 'UserProfile'),
    '{
        "description": "Connects content to its author",
        "cardinality": "many-to-one",
        "fields": {
            "role": {"type": "enum", "values": ["primary", "contributor", "reviewer"], "default": "primary"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
),
('HAS_ROLE',
    (SELECT id FROM node_types WHERE name = 'UserProfile'),
    (SELECT id FROM node_types WHERE name = 'CuratorRole'),
    '{
        "description": "Connects a user to their curator role",
        "cardinality": "many-to-many",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
),
('RELATED_TO',
    NULL,
    NULL,
    '{
        "description": "Generic relationship between nodes",
        "cardinality": "many-to-many",
        "fields": {
            "relationshipType": {"type": "string", "maxLength": 100},
            "weight": {"type": "number", "min": 0.0, "max": 1.0}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;