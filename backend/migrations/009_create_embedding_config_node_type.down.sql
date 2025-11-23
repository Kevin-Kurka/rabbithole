-- Remove default embedding config node
DELETE FROM nodes WHERE id = '00000000-0000-0000-0000-000000000002'::UUID;

-- Remove embedding config node type
DELETE FROM node_types WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
