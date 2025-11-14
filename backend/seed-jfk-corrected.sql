-- JFK Assassination Test Data (Corrected for actual schema)
-- This creates a Level 1 (editable) graph with nodes and edges for testing

-- First, insert a test user
INSERT INTO "Users" (id, email, username, password_hash, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@rabbithole.com',
  'testuser',
  '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890',
  'Test User'
) ON CONFLICT (id) DO NOTHING;

-- Create a Level 1 graph (name instead of title, level instead of is_level_0)
INSERT INTO "Graphs" (id, name, description, level, privacy, created_by, created_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'JFK Assassination Investigation',
  'Collaborative investigation into the assassination of President John F. Kennedy',
  1, -- Level 1 (editable)
  'public',
  '00000000-0000-0000-0000-000000000001',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Check if default node/edge types exist, if not create minimal ones
INSERT INTO "NodeTypes" (id, name, description)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Person', 'An individual person'),
  ('20000000-0000-0000-0000-000000000002', 'Event', 'A specific event'),
  ('20000000-0000-0000-0000-000000000003', 'Location', 'A place'),
  ('20000000-0000-0000-0000-000000000004', 'Evidence', 'Evidence item'),
  ('20000000-0000-0000-0000-000000000005', 'Theory', 'A hypothesis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "EdgeTypes" (id, name, description)
VALUES
  ('25000000-0000-0000-0000-000000000001', 'accused_of', 'Accused of action'),
  ('25000000-0000-0000-0000-000000000002', 'occurred_at', 'Event occurred at location'),
  ('25000000-0000-0000-0000-000000000003', 'located_at', 'Was located at'),
  ('25000000-0000-0000-0000-000000000004', 'killed', 'Killed another person'),
  ('25000000-0000-0000-0000-000000000005', 'created', 'Created or produced'),
  ('25000000-0000-0000-0000-000000000006', 'documents', 'Documents or records'),
  ('25000000-0000-0000-0000-000000000007', 'supports', 'Provides support for'),
  ('25000000-0000-0000-0000-000000000008', 'proposed_by', 'Was proposed by'),
  ('25000000-0000-0000-0000-000000000009', 'contradicts', 'Contradicts or conflicts'),
  ('25000000-0000-0000-0000-000000000010', 'related_to', 'General relationship')
ON CONFLICT (id) DO NOTHING;

-- Create nodes (title goes in props JSONB)
INSERT INTO "Nodes" (id, graph_id, node_type_id, props, weight, is_level_0, created_by)
VALUES
  -- Main event
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '{"title": "JFK Assassination", "description": "President John F. Kennedy was assassinated in Dallas, Texas on November 22, 1963", "date": "1963-11-22"}'::jsonb,
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Key people
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Lee Harvey Oswald", "description": "Alleged assassin, former U.S. Marine", "role": "Suspect"}'::jsonb,
    0.90,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Jack Ruby", "description": "Dallas nightclub owner who shot Oswald", "role": "Involved"}'::jsonb,
    0.85,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"title": "Abraham Zapruder", "description": "Filmed the assassination", "role": "Witness"}'::jsonb,
    0.88,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Locations
  (
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Dealey Plaza", "description": "Location where JFK was shot", "address": "Dallas, TX"}'::jsonb,
    0.92,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Texas School Book Depository", "description": "Building from which shots allegedly fired", "floor": "6th"}'::jsonb,
    0.89,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '{"title": "Grassy Knoll", "description": "Hill in Dealey Plaza, second shooter theory location"}'::jsonb,
    0.65,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Evidence
  (
    '30000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "Zapruder Film", "description": "8mm home movie showing assassination", "type": "Film"}'::jsonb,
    0.93,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "CE-399 (Magic Bullet)", "description": "Nearly pristine bullet causing multiple wounds", "type": "Physical"}'::jsonb,
    0.70,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '{"title": "Warren Commission Report", "description": "Official government investigation", "year": "1964"}'::jsonb,
    0.78,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Theories
  (
    '30000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "Single Bullet Theory", "description": "One bullet caused multiple wounds", "proponent": "Warren Commission"}'::jsonb,
    0.68,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "Second Shooter Theory", "description": "Additional shooter from grassy knoll", "credibility": "controversial"}'::jsonb,
    0.55,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '30000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '{"title": "CIA Involvement Theory", "description": "Theory of CIA involvement", "credibility": "speculative"}'::jsonb,
    0.35,
    false,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Create edges (with edge_type_id)
INSERT INTO "Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, weight, is_level_0, created_by)
VALUES
  -- Event relationships
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"description": "Lee Harvey Oswald accused of assassinating JFK"}'::jsonb,
    0.92,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '30000000-0000-0000-0000-000000000005', -- Dealey Plaza
    '{"description": "Assassination occurred at Dealey Plaza"}'::jsonb,
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000006', -- Book Depository
    '{"description": "Oswald allegedly shot from Book Depository 6th floor"}'::jsonb,
    0.88,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000003', -- Jack Ruby
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '{"description": "Jack Ruby shot and killed Oswald on Nov 24, 1963"}'::jsonb,
    0.95,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Evidence relationships
  (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000004', -- Zapruder
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '{"description": "Abraham Zapruder filmed the assassination"}'::jsonb,
    0.93,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"description": "Film documents assassination visually"}'::jsonb,
    0.94,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000009', -- Magic Bullet
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '{"description": "CE-399 is central evidence for single bullet theory"}'::jsonb,
    0.75,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  -- Theory relationships
  (
    '40000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000010', -- Warren Commission
    '{"description": "Warren Commission proposed single bullet theory"}'::jsonb,
    0.82,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '30000000-0000-0000-0000-000000000007', -- Grassy Knoll
    '{"description": "Theory proposes second shooter from grassy knoll"}'::jsonb,
    0.58,
    false,
    '00000000-0000-0000-0000-000000000001'
  ),

  (
    '40000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '{"description": "Theories contradict each other"}'::jsonb,
    0.85,
    false,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT
  'JFK Assassination test data created!' as message,
  (SELECT COUNT(*) FROM "Nodes" WHERE graph_id = '10000000-0000-0000-0000-000000000001') as nodes_created,
  (SELECT COUNT(*) FROM "Edges" WHERE graph_id = '10000000-0000-0000-0000-000000000001') as edges_created;
