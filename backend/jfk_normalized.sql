-- JFK Assassination Knowledge Graph - NORMALIZED VERSION
-- Properly typed nodes with veracity scores based on credibility

BEGIN;

-- Create or get the JFK Assassination graph
DO $$
DECLARE
  graph_id UUID;
BEGIN
  -- Check if graph exists
  SELECT id INTO graph_id FROM public."Graphs"
  WHERE name = 'JFK Assassination Knowledge Graph';

  IF graph_id IS NULL THEN
    graph_id := gen_random_uuid();
    INSERT INTO public."Graphs" (id, name, description, level, methodology, created_by, created_at, privacy)
    VALUES
      (graph_id, 'JFK Assassination Knowledge Graph',
       'Evidence-based analysis of the JFK assassination with veracity scoring',
       0, 'Scientific Method', NULL, NOW(), 'public');
  END IF;

  -- LEVEL 0 NODES: Verified Facts and Primary Evidence (veracity = 1.0)

  -- PERSON NODES
  INSERT INTO public."Nodes" (id, graph_id, props, meta, is_level_0, created_at)
  VALUES
    -- Key Figures
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'John F. Kennedy',
       'birthDate', '1917-05-29',
       'deathDate', '1963-11-22',
       'description', '35th President of the United States',
       'role', 'Assassination victim'
     ),
     jsonb_build_object(
       'schema_type', 'Person',
       'veracity_score', 1.0,
       'source', 'Historical record'
     ),
     true, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'Lee Harvey Oswald',
       'birthDate', '1939-10-18',
       'deathDate', '1963-11-24',
       'description', 'Accused assassin, former Marine, Soviet defector',
       'aliases', ARRAY['A. Hidell', 'O.H. Lee']
     ),
     jsonb_build_object(
       'schema_type', 'Person',
       'veracity_score', 1.0,
       'source', 'FBI records'
     ),
     true, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'Jack Ruby',
       'birthDate', '1911-03-25',
       'deathDate', '1967-01-03',
       'description', 'Dallas nightclub owner who killed Oswald',
       'realName', 'Jacob Rubenstein'
     ),
     jsonb_build_object(
       'schema_type', 'Person',
       'veracity_score', 1.0,
       'source', 'Court records'
     ),
     true, NOW()),

    -- EVENT NODES
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'JFK Assassination',
       'startDate', '1963-11-22T12:30:00',
       'endDate', '1963-11-22T12:30:30',
       'description', 'Assassination of President Kennedy in Dealey Plaza',
       'location', 'Dealey Plaza, Dallas, Texas',
       'shots_fired', 'Disputed: 3-6',
       'witnesses', 600
     ),
     jsonb_build_object(
       'schema_type', 'Event',
       'veracity_score', 1.0,
       'source', 'Multiple sources'
     ),
     true, NOW()),

    -- EVIDENCE NODES (Physical Evidence)
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'CE 399 - Magic Bullet',
       'description', 'Nearly pristine bullet found on Connally stretcher',
       'exhibit_number', 'CE 399',
       'weight_grains', 158.6,
       'caliber', '6.5mm',
       'condition', 'Nearly pristine'
     ),
     jsonb_build_object(
       'schema_type', 'Evidence',
       'veracity_score', 1.0,
       'source', 'Warren Commission Exhibit'
     ),
     true, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Mannlicher-Carcano Rifle',
       'description', '6.5mm rifle found on TSBD 6th floor',
       'serial_number', 'C2766',
       'owner', 'A. Hidell (Oswald alias)',
       'location_found', 'TSBD 6th floor, northwest corner'
     ),
     jsonb_build_object(
       'schema_type', 'Evidence',
       'veracity_score', 1.0,
       'source', 'Dallas Police evidence'
     ),
     true, NOW()),

    -- VIDEO/MEDIA EVIDENCE
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Zapruder Film',
       'description', '26.6-second film of the assassination',
       'creator', 'Abraham Zapruder',
       'duration', '26.6 seconds',
       'frames', 486,
       'frame_313', 'Fatal shot visible',
       'dateCreated', '1963-11-22'
     ),
     jsonb_build_object(
       'schema_type', 'VideoObject',
       'veracity_score', 1.0,
       'source', 'Primary footage'
     ),
     true, NOW()),

    -- REPORT NODES (Official Documents)
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Warren Commission Report',
       'datePublished', '1964-09-27',
       'pages', 888,
       'conclusion', 'Oswald acted alone',
       'commission_chair', 'Earl Warren'
     ),
     jsonb_build_object(
       'schema_type', 'Report',
       'veracity_score', 0.75,  -- Disputed findings
       'source', 'U.S. Government'
     ),
     false, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'House Select Committee Report',
       'datePublished', '1979-03-29',
       'conclusion', 'Probable conspiracy based on acoustic evidence',
       'acoustic_shots', 4,
       'probability', '95% confidence'
     ),
     jsonb_build_object(
       'schema_type', 'Report',
       'veracity_score', 0.65,  -- Later disputed acoustic analysis
       'source', 'U.S. Congress HSCA'
     ),
     false, NOW()),

    -- TESTIMONY NODES
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'S.M. Holland Testimony',
       'witness', 'S.M. Holland',
       'position', 'Railroad tower overlooking plaza',
       'observation', 'Smoke from grassy knoll area',
       'dateRecorded', '1963-11-22'
     ),
     jsonb_build_object(
       'schema_type', 'Testimony',
       'veracity_score', 0.8,
       'source', 'Warren Commission testimony'
     ),
     false, NOW()),

    -- LOCATION NODES
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'Texas School Book Depository',
       'address', '411 Elm Street, Dallas, TX',
       'floor', '6th floor, southeast window',
       'description', 'Alleged shooting position'
     ),
     jsonb_build_object(
       'schema_type', 'Place',
       'veracity_score', 1.0,
       'source', 'Physical location'
     ),
     true, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'Grassy Knoll',
       'location', 'Dealey Plaza, Dallas',
       'description', 'Elevated area with fence, alleged second shooter position'
     ),
     jsonb_build_object(
       'schema_type', 'Place',
       'veracity_score', 1.0,
       'source', 'Physical location'
     ),
     true, NOW()),

    -- MEDICAL EVIDENCE
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Bethesda Autopsy Report',
       'dateCreated', '1963-11-22T20:00:00',
       'location', 'Bethesda Naval Hospital',
       'pathologists', ARRAY['James Humes', 'Thornton Boswell', 'Pierre Finck'],
       'wounds_documented', 3,
       'entry_wounds', 2,
       'exit_wounds', 1
     ),
     jsonb_build_object(
       'schema_type', 'MedicalReport',
       'veracity_score', 0.85,  -- Some controversy over findings
       'source', 'U.S. Navy Medical'
     ),
     false, NOW()),

    -- THEORY NODES (Container nodes for related evidence)
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Single Bullet Theory',
       'description', 'Warren Commission theory that one bullet caused 7 wounds',
       'proponent', 'Arlen Specter',
       'trajectory', 'TSBD 6th floor through Kennedy and Connally',
       'bullet', 'CE 399'
     ),
     jsonb_build_object(
       'schema_type', 'Theory',
       'veracity_score', 0.45,  -- Highly disputed
       'source', 'Warren Commission',
       'contains_nodes', ARRAY[]::UUID[]  -- Would link to related evidence
     ),
     false, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'Grassy Knoll Second Shooter Theory',
       'description', 'Theory of second shooter based on witness testimony and acoustic evidence',
       'evidence_basis', ARRAY['51 witness testimonies', 'HSCA acoustic analysis', 'Smoke observations'],
       'proponents', ARRAY['Mark Lane', 'Jim Garrison', 'HSCA']
     ),
     jsonb_build_object(
       'schema_type', 'Theory',
       'veracity_score', 0.55,  -- Some supporting evidence
       'source', 'Multiple researchers',
       'contains_nodes', ARRAY[]::UUID[]
     ),
     false, NOW()),

    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'CIA Conspiracy Theory',
       'description', 'Theory that CIA orchestrated assassination',
       'alleged_motives', ARRAY['Bay of Pigs', 'Cuba policy', 'Vietnam War'],
       'alleged_participants', ARRAY['E. Howard Hunt', 'David Morales']
     ),
     jsonb_build_object(
       'schema_type', 'Theory',
       'veracity_score', 0.35,  -- Speculative, limited evidence
       'source', 'Various conspiracy theorists',
       'contains_nodes', ARRAY[]::UUID[]
     ),
     false, NOW()),

    -- ORGANIZATION NODES
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'name', 'Warren Commission',
       'foundingDate', '1963-11-29',
       'dissolutionDate', '1964-09-24',
       'purpose', 'Investigate JFK assassination',
       'members', ARRAY['Earl Warren', 'Gerald Ford', 'Allen Dulles', 'John McCloy', 'Richard Russell', 'John Cooper', 'Hale Boggs']
     ),
     jsonb_build_object(
       'schema_type', 'GovernmentOrganization',
       'veracity_score', 1.0,
       'source', 'Executive Order 11130'
     ),
     true, NOW()),

    -- BALLISTICS ANALYSIS
    (gen_random_uuid(), graph_id,
     jsonb_build_object(
       'title', 'NAA Bullet Fragment Analysis',
       'description', 'Neutron activation analysis of bullet fragments',
       'datePerformed', '1964-05-15',
       'conclusion', 'Fragments consistent with 2 bullets',
       'method', 'Neutron Activation Analysis'
     ),
     jsonb_build_object(
       'schema_type', 'BallisticsAnalysis',
       'veracity_score', 0.7,  -- Later re-analyzed with different conclusions
       'source', 'FBI Laboratory'
     ),
     false, NOW());

END $$;

COMMIT;

-- Add edges between nodes (relationships with veracity scores)
BEGIN;

DO $$
DECLARE
  jfk_id UUID;
  oswald_id UUID;
  tsbd_id UUID;
  rifle_id UUID;
  graph_id UUID;
BEGIN
  -- Get the graph
  SELECT id INTO graph_id FROM public."Graphs" WHERE name = 'JFK Assassination Knowledge Graph';

  -- Get key node IDs for relationships
  SELECT id INTO jfk_id FROM public."Nodes"
  WHERE graph_id = graph_id AND props->>'name' = 'John F. Kennedy' LIMIT 1;

  SELECT id INTO oswald_id FROM public."Nodes"
  WHERE graph_id = graph_id AND props->>'name' = 'Lee Harvey Oswald' LIMIT 1;

  SELECT id INTO tsbd_id FROM public."Nodes"
  WHERE graph_id = graph_id AND props->>'name' = 'Texas School Book Depository' LIMIT 1;

  SELECT id INTO rifle_id FROM public."Nodes"
  WHERE graph_id = graph_id AND props->>'title' = 'Mannlicher-Carcano Rifle' LIMIT 1;

  -- Create edges with veracity scores
  INSERT INTO public."Edges" (id, graph_id, from_id, to_id, props, meta, is_level_0, created_at)
  VALUES
    -- Oswald worked at TSBD (verified fact)
    (gen_random_uuid(), graph_id, oswald_id, tsbd_id,
     jsonb_build_object('relationship', 'employed_at', 'start_date', '1963-10-16'),
     jsonb_build_object('veracity_score', 1.0, 'source', 'Employment records'),
     true, NOW()),

    -- Oswald owned rifle (highly probable)
    (gen_random_uuid(), graph_id, oswald_id, rifle_id,
     jsonb_build_object('relationship', 'purchased', 'date', '1963-03-12', 'alias', 'A. Hidell'),
     jsonb_build_object('veracity_score', 0.95, 'source', 'Klein\'s Sporting Goods records'),
     false, NOW()),

    -- Rifle allegedly killed JFK (disputed)
    (gen_random_uuid(), graph_id, rifle_id, jfk_id,
     jsonb_build_object('relationship', 'alleged_murder_weapon'),
     jsonb_build_object('veracity_score', 0.65, 'source', 'Warren Commission conclusion'),
     false, NOW());

END $$;

COMMIT;