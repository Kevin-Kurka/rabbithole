-- JFK Assassination Test Data
-- This creates a Level 1 (editable) graph with nodes and edges for testing the inquiry system

-- First, ensure we have required lookup data
-- Insert default user if not exists
INSERT INTO "Users" (id, email, username, password_hash, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@rabbithole.com',
  'testuser',
  '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890', -- dummy hash
  'Test User',
  'user'
) ON CONFLICT (id) DO NOTHING;

-- Create a Level 1 graph (editable)
INSERT INTO "Graphs" (id, title, description, is_level_0, veracity, created_by, created_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'JFK Assassination Investigation',
  'Collaborative investigation into the assassination of President John F. Kennedy on November 22, 1963',
  false, -- Level 1 (editable)
  0.75,
  '00000000-0000-0000-0000-000000000001',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create node types
INSERT INTO "NodeTypes" (id, name, description, color, icon)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Person', 'An individual person', '#3b82f6', 'user'),
  ('20000000-0000-0000-0000-000000000002', 'Event', 'A specific event or incident', '#ef4444', 'calendar'),
  ('20000000-0000-0000-0000-000000000003', 'Location', 'A physical location', '#10b981', 'map-pin'),
  ('20000000-0000-0000-0000-000000000004', 'Evidence', 'Physical or documentary evidence', '#f59e0b', 'file-text'),
  ('20000000-0000-0000-0000-000000000005', 'Theory', 'A hypothesis or theory', '#8b5cf6', 'lightbulb')
ON CONFLICT (id) DO NOTHING;

-- Create nodes (ALL data in props JSONB including graphId, weight, createdBy)
INSERT INTO "Nodes" (id, node_type_id, props, created_at, updated_at)
VALUES
  -- Main event
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "JFK Assassination", "description": "President John F. Kennedy was assassinated in Dallas, Texas on November 22, 1963", "date": "1963-11-22", "weight": 0.95, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Key people
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Lee Harvey Oswald", "description": "Alleged assassin, former U.S. Marine who defected to Soviet Union", "role": "Suspect", "weight": 0.90, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Jack Ruby", "description": "Dallas nightclub owner who shot Oswald", "role": "Involved", "weight": 0.85, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Abraham Zapruder", "description": "Dallas dress manufacturer who filmed the assassination", "role": "Witness", "weight": 0.88, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Locations
  (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Dealey Plaza", "description": "Location in Dallas where JFK was shot", "address": "Dallas, TX", "weight": 0.92, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Texas School Book Depository", "description": "Building from which shots were allegedly fired", "address": "411 Elm St, Dallas, TX", "weight": 0.89, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000007',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Grassy Knoll", "description": "Small hill in Dealey Plaza, alternate shooting location theory", "address": "Dealey Plaza, Dallas, TX", "weight": 0.65, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Evidence
  (
    '30000000-0000-0000-0000-000000000008',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Zapruder Film", "description": "8mm home movie footage showing assassination", "type": "Film Evidence", "weight": 0.93, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000009',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "CE-399 (Magic Bullet)", "description": "Nearly pristine bullet allegedly causing multiple wounds", "type": "Physical Evidence", "weight": 0.70, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Warren Commission Report", "description": "Official government investigation report", "type": "Documentary Evidence", "weight": 0.78, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Theories
  (
    '30000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Single Bullet Theory", "description": "Theory that one bullet caused multiple wounds to JFK and Connally", "proponent": "Warren Commission", "weight": 0.68, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Second Shooter Theory", "description": "Theory proposing additional shooter from grassy knoll", "proponent": "Various researchers", "weight": 0.55, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "CIA Involvement Theory", "description": "Theory of CIA involvement in assassination", "proponent": "Conspiracy theorists", "weight": 0.35, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create edges (ALL data in props JSONB including graphId, weight, createdBy)
-- Note: This file doesn't specify edge_type_id, using a default generic relationship type
INSERT INTO "Edges" (id, source_node_id, target_node_id, props, created_at, updated_at)
VALUES
  -- Event relationships
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "accused_of", "description": "Lee Harvey Oswald was accused of assassinating JFK", "weight": 0.92, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '30000000-0000-0000-0000-000000000005', -- Dealey Plaza
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "occurred_at", "description": "Assassination occurred at Dealey Plaza", "weight": 0.95, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000006', -- Book Depository
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "located_at", "description": "Oswald allegedly shot from Book Depository", "weight": 0.88, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000003', -- Jack Ruby
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "killed", "description": "Jack Ruby shot and killed Lee Harvey Oswald", "weight": 0.95, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Evidence relationships
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000004', -- Zapruder
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "created", "description": "Abraham Zapruder filmed the assassination", "weight": 0.93, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "documents", "description": "Film provides visual documentation of assassination", "weight": 0.94, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000009', -- Magic Bullet
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "supports", "description": "CE-399 is central to single bullet theory", "weight": 0.75, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Theory relationships
  (
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000010', -- Warren Commission
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "proposed_by", "description": "Warren Commission proposed single bullet theory", "weight": 0.82, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '30000000-0000-0000-0000-000000000007', -- Grassy Knoll
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "proposes_location", "description": "Theory proposes second shooter from grassy knoll", "weight": 0.58, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '{"graphId": "10000000-0000-0000-0000-000000000001", "relationship": "contradicts", "description": "Theories contradict each other", "weight": 0.85, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'JFK Assassination test data created successfully!' as message,
       COUNT(*) as node_count
FROM "Nodes"
WHERE (props->>'graphId')::uuid = '10000000-0000-0000-0000-000000000001';
