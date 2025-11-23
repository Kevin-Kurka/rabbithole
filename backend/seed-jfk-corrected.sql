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
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Lee Harvey Oswald", "description": "Alleged assassin, former U.S. Marine", "role": "Suspect", "weight": 0.90, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
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
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Abraham Zapruder", "description": "Filmed the assassination", "role": "Witness", "weight": 0.88, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Locations
  (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Dealey Plaza", "description": "Location where JFK was shot", "address": "Dallas, TX", "weight": 0.92, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Texas School Book Depository", "description": "Building from which shots allegedly fired", "floor": "6th", "weight": 0.89, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000007',
    '20000000-0000-0000-0000-000000000003',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Grassy Knoll", "description": "Hill in Dealey Plaza, second shooter theory location", "weight": 0.65, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Evidence
  (
    '30000000-0000-0000-0000-000000000008',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Zapruder Film", "description": "8mm home movie showing assassination", "type": "Film", "weight": 0.93, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000009',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "CE-399 (Magic Bullet)", "description": "Nearly pristine bullet causing multiple wounds", "type": "Physical", "weight": 0.70, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000010',
    '20000000-0000-0000-0000-000000000004',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Warren Commission Report", "description": "Official government investigation", "year": "1964", "weight": 0.78, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Theories
  (
    '30000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Single Bullet Theory", "description": "One bullet caused multiple wounds", "proponent": "Warren Commission", "weight": 0.68, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "Second Shooter Theory", "description": "Additional shooter from grassy knoll", "credibility": "controversial", "weight": 0.55, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '30000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000005',
    '{"graphId": "10000000-0000-0000-0000-000000000001", "title": "CIA Involvement Theory", "description": "Theory of CIA involvement", "credibility": "speculative", "weight": 0.35, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Create edges (ALL data in props JSONB including graphId, weight, createdBy)
INSERT INTO "Edges" (id, edge_type_id, source_node_id, target_node_id, props, created_at, updated_at)
VALUES
  -- Event relationships
  (
    '40000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Lee Harvey Oswald accused of assassinating JFK", "weight": 0.92, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000002',
    '25000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '30000000-0000-0000-0000-000000000005', -- Dealey Plaza
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Assassination occurred at Dealey Plaza", "weight": 0.95, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000003',
    '25000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '30000000-0000-0000-0000-000000000006', -- Book Depository
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Oswald allegedly shot from Book Depository 6th floor", "weight": 0.88, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000004',
    '25000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000003', -- Jack Ruby
    '30000000-0000-0000-0000-000000000002', -- Oswald
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Jack Ruby shot and killed Oswald on Nov 24, 1963", "weight": 0.95, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Evidence relationships
  (
    '40000000-0000-0000-0000-000000000005',
    '25000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000004', -- Zapruder
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Abraham Zapruder filmed the assassination", "weight": 0.93, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000006',
    '25000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000008', -- Zapruder Film
    '30000000-0000-0000-0000-000000000001', -- JFK Assassination
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Film documents assassination visually", "weight": 0.94, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000007',
    '25000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000009', -- Magic Bullet
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "CE-399 is central evidence for single bullet theory", "weight": 0.75, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  -- Theory relationships
  (
    '40000000-0000-0000-0000-000000000008',
    '25000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000010', -- Warren Commission
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Warren Commission proposed single bullet theory", "weight": 0.82, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000009',
    '25000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '30000000-0000-0000-0000-000000000007', -- Grassy Knoll
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Theory proposes second shooter from grassy knoll", "weight": 0.58, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  ),

  (
    '40000000-0000-0000-0000-000000000010',
    '25000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000011', -- Single Bullet Theory
    '30000000-0000-0000-0000-000000000012', -- Second Shooter Theory
    '{"graphId": "10000000-0000-0000-0000-000000000001", "description": "Theories contradict each other", "weight": 0.85, "createdBy": "00000000-0000-0000-0000-000000000001"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT
  'JFK Assassination test data created!' as message,
  (SELECT COUNT(*) FROM "Nodes" WHERE (props->>'graphId')::uuid = '10000000-0000-0000-0000-000000000001') as nodes_created,
  (SELECT COUNT(*) FROM "Edges" WHERE (props->>'graphId')::uuid = '10000000-0000-0000-0000-000000000001') as edges_created;
