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

-- Create nodes
INSERT INTO "Nodes" (id, graph_id, node_type_id, props, weight, is_level_0, created_by, created_at)
VALUES
  -- Main event
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '{"title": "JFK Assassination", "description": "President John F. Kennedy was assassinated in Dallas, Texas on November 22, 1963", "date": "1963-11-22"}',
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Key people
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Lee Harvey Oswald", "description": "Alleged assassin, former U.S. Marine who defected to Soviet Union", "role": "Suspect"}',
    0.90,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Jack Ruby", "description": "Dallas nightclub owner who shot Oswald", "role": "Involved"}',
    0.85,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Abraham Zapruder", "description": "Dallas dress manufacturer who filmed the assassination", "role": "Witness"}',
    0.88,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Locations
  (
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Dealey Plaza", "description": "Location in Dallas where JFK was shot", "address": "Dallas, TX"}',
    0.92,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Texas School Book Depository", "description": "Building from which shots were allegedly fired", "address": "411 Elm St, Dallas, TX"}',
    0.89,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Grassy Knoll", "description": "Small hill in Dealey Plaza, alternate shooting location theory", "address": "Dealey Plaza, Dallas, TX"}',
    0.65,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Evidence
  (
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "Zapruder Film", "description": "8mm home movie footage showing assassination", "type": "Film Evidence"}',
    0.93,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "CE-399 (Magic Bullet)", "description": "Nearly pristine bullet allegedly causing multiple wounds", "type": "Physical Evidence"}',
    0.70,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "Warren Commission Report", "description": "Official government investigation report", "type": "Documentary Evidence"}',
    0.78,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Theories
  (
    '30000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "Single Bullet Theory", "description": "Theory that one bullet caused multiple wounds to JFK and Connally", "proponent": "Warren Commission"}',
    0.68,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "Second Shooter Theory", "description": "Theory proposing additional shooter from grassy knoll", "proponent": "Various researchers"}',
    0.55,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "CIA Involvement Theory", "description": "Theory of CIA involvement in assassination", "proponent": "Conspiracy theorists"}',
    0.35,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create edges (relationships)
INSERT INTO "Edges" (id, graph_id, source_node_id, target_node_id, props, weight, is_level_0, created_by, created_at)
VALUES
  -- Event relationships
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"relationship": "accused_of", "description": "Lee Harvey Oswald was accused of assassinating JFK"}',
    0.92,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '30000000-0000-0000-0000-000000000005', -- Dealey Plaza
    '{"relationship": "occurred_at", "description": "Assassination occurred at Dealey Plaza"}',
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000006', -- Book Depository
    '{"relationship": "located_at", "description": "Oswald allegedly shot from Book Depository"}',
    0.88,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003', -- Jack Ruby
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '{"relationship": "killed", "description": "Jack Ruby shot and killed Lee Harvey Oswald"}',
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Evidence relationships
  (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004', -- Zapruder
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '{"relationship": "created", "description": "Abraham Zapruder filmed the assassination"}',
    0.93,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"relationship": "documents", "description": "Film provides visual documentation of assassination"}',
    0.94,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000009', -- Magic Bullet
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '{"relationship": "supports", "description": "CE-399 is central to single bullet theory"}',
    0.75,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  -- Theory relationships
  (
    '40000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000010', -- Warren Commission
    '{"relationship": "proposed_by", "description": "Warren Commission proposed single bullet theory"}',
    0.82,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '30000000-0000-0000-0000-000000000007', -- Grassy Knoll
    '{"relationship": "proposes_location", "description": "Theory proposes second shooter from grassy knoll"}',
    0.58,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '{"relationship": "contradicts", "description": "Theories contradict each other"}',
    0.85,
    false,
    '00000000-0000-0000-0000-000000000001',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'JFK Assassination test data created successfully!' as message,
       COUNT(*) as node_count
FROM "Nodes"
WHERE graph_id = '10000000-0000-0000-0000-000000000001';
