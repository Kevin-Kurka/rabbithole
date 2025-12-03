INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES (
    'Notification',
    NULL,
    '{
        "description": "System notification for a user",
        "fields": {
            "userId": {"type": "uuid", "required": true},
            "type": {"type": "enum", "required": true, "values": ["mention", "reply", "system", "achievement"]},
            "title": {"type": "string", "required": true},
            "message": {"type": "string", "required": true},
            "entityType": {"type": "string"},
            "entityId": {"type": "uuid"},
            "relatedUserId": {"type": "uuid"},
            "read": {"type": "boolean", "default": false},
            "metadata": {"type": "object"}
        }
    }'::jsonb,
    '{"system": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;