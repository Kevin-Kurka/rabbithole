-- Remove demo user role assignment
DELETE FROM user_roles WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove demo user
DELETE FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove demo company
DELETE FROM companies WHERE id = '550e8400-e29b-41d4-a716-446655440001';
