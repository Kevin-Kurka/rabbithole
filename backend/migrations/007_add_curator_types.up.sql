-- Add Curator-related Node Types
INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES 
('RolePermission', NULL, '{"description": "Permission associated with a Curator Role", "fields": {"roleId": {"type": "uuid", "required": true}, "permissionType": {"type": "string", "required": true}, "resourceType": {"type": "string", "required": true}}}'::jsonb, '{"system": true}'::jsonb),
('CuratorApplication', NULL, '{"description": "Application for a Curator Role", "fields": {"userId": {"type": "uuid", "required": true}, "roleId": {"type": "uuid", "required": true}, "status": {"type": "string", "default": "pending"}}}'::jsonb, '{"system": true}'::jsonb),
('CuratorApplicationVote', NULL, '{"description": "Vote on a Curator Application", "fields": {"applicationId": {"type": "uuid", "required": true}, "voterId": {"type": "uuid", "required": true}, "vote": {"type": "string", "required": true}}}'::jsonb, '{"system": true}'::jsonb),
('CuratorAuditLog', NULL, '{"description": "Audit log for Curator actions", "fields": {"curatorId": {"type": "uuid", "required": true}, "actionType": {"type": "string", "required": true}}}'::jsonb, '{"system": true}'::jsonb),
('CuratorReview', NULL, '{"description": "Review of a Curator Action or Application", "fields": {"auditLogId": {"type": "uuid"}, "reviewerId": {"type": "uuid"}}}'::jsonb, '{"system": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add Curator-related Edge Types
INSERT INTO edge_types (name, description, props) VALUES 
('UserCurator', 'Connects a User to a CuratorRole', '{"status": {"type": "string", "default": "active"}}'::jsonb)
ON CONFLICT (name) DO NOTHING;