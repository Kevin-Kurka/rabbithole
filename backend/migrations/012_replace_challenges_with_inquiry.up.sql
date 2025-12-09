-- 1. Remove Challenge System types
DELETE FROM edge_types WHERE name = 'CHALLENGES';

DELETE FROM node_types WHERE name = 'Challenge';

-- 2. Add INVESTIGATES Edge Type (Inquiry -> Any Node)
INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES (
    'INVESTIGATES',
    (SELECT id FROM node_types WHERE name = 'Inquiry'),
    NULL, -- Can investigate any node
    '{
        "description": "Connects an inquiry to the subject of investigation",
        "cardinality": "many-to-one",
        "fields": {}
    }'::jsonb,
    '{"system": true}'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- 3. Update Inquiry Node Type to include 'verdict' field
UPDATE node_types 
SET props = jsonb_set(
    props, 
    '{fields,verdict}', 
    '{"type": "enum", "values": ["supported", "refuted", "inconclusive"], "default": "inconclusive"}'::jsonb
)
WHERE name = 'Inquiry';