-- Seed demo company
INSERT INTO companies (id, name, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Demo Company',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Seed demo user
-- Email: demo@mycfo.app
-- Password: demo1234 (bcrypt hash generated with cost 10)
INSERT INTO users (id, email, password_hash, first_name, last_name, company_id, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'demo@mycfo.app',
    '$2a$10$rN7VccskonhmH/d/j6ePBOeEFxfXzIIu3qO3Y9q5JhZJrXEqKSHMK',
    'Demo',
    'User',
    '550e8400-e29b-41d4-a716-446655440001',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Seed user role (assign 'user' role to demo user)
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT
    '550e8400-e29b-41d4-a716-446655440000',
    id,
    NOW()
FROM roles
WHERE name = 'user'
ON CONFLICT (user_id, role_id) DO NOTHING;
