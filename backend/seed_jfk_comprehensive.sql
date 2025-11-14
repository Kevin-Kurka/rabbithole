-- ============================================================================
-- JFK Assassination Comprehensive Graph Seed Data
-- ============================================================================
-- Creates a complete graph with articles and nodes representing various
-- perspectives on the JFK assassination
-- ============================================================================

-- Create the main JFK Graph
INSERT INTO public."Graphs" (id, name, description, level, methodology, privacy, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'JFK Assassination Investigation',
  'A comprehensive investigation into the assassination of President John F. Kennedy on November 22, 1963, including official narratives, conspiracy theories, and evidence analysis.',
  1,
  'Legal Discovery',
  'public',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Get NodeType IDs
DO $$
DECLARE
  article_type_id UUID;
  person_type_id UUID;
  event_type_id UUID;
  place_type_id UUID;
  thing_type_id UUID;
  fact_type_id UUID;
  claim_type_id UUID;

  jfk_graph_id UUID := '00000000-0000-0000-0000-000000000001';
  admin_user_id UUID;

  references_edge_type_id UUID;
BEGIN
  -- Get admin user (use first user or create one)
  SELECT id INTO admin_user_id FROM public."Users" LIMIT 1;

  IF admin_user_id IS NULL THEN
    INSERT INTO public."Users" (username, email, password_hash)
    VALUES ('admin', 'admin@rabbithole.com', '$2b$10$dummy')
    RETURNING id INTO admin_user_id;
  END IF;

  -- Get node type IDs
  SELECT id INTO article_type_id FROM public."NodeTypes" WHERE name = 'Article';
  SELECT id INTO person_type_id FROM public."NodeTypes" WHERE name = 'Person';
  SELECT id INTO event_type_id FROM public."NodeTypes" WHERE name = 'Event';
  SELECT id INTO place_type_id FROM public."NodeTypes" WHERE name = 'Place';
  SELECT id INTO thing_type_id FROM public."NodeTypes" WHERE name = 'Thing';
  SELECT id INTO fact_type_id FROM public."NodeTypes" WHERE name = 'Fact';
  SELECT id INTO claim_type_id FROM public."NodeTypes" WHERE name = 'Claim';

  -- Create or get references edge type
  INSERT INTO public."EdgeTypes" (name, props)
  VALUES ('references', '{}')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO references_edge_type_id FROM public."EdgeTypes" WHERE name = 'references';

  -- ========================================================================
  -- NODES: Key People
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('10000000-0000-0000-0000-000000000001', jfk_graph_id, person_type_id, 'John F. Kennedy',
     '{"fullName": "John Fitzgerald Kennedy", "birthDate": "1917-05-29", "deathDate": "1963-11-22", "role": "35th President of the United States"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('10000000-0000-0000-0000-000000000002', jfk_graph_id, person_type_id, 'Lee Harvey Oswald',
     '{"fullName": "Lee Harvey Oswald", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "role": "Alleged assassin"}', 0.95, admin_user_id, admin_user_id, NOW()),

    ('10000000-0000-0000-0000-000000000003', jfk_graph_id, person_type_id, 'Jack Ruby',
     '{"fullName": "Jacob Leon Rubenstein", "birthDate": "1911-03-25", "deathDate": "1967-01-03", "role": "Nightclub owner who killed Oswald"}', 0.98, admin_user_id, admin_user_id, NOW()),

    ('10000000-0000-0000-0000-000000000004', jfk_graph_id, person_type_id, 'Abraham Zapruder',
     '{"fullName": "Abraham Zapruder", "birthDate": "1905-05-15", "deathDate": "1970-08-30", "role": "Filmed the assassination"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('10000000-0000-0000-0000-000000000005', jfk_graph_id, person_type_id, 'Jacqueline Kennedy',
     '{"fullName": "Jacqueline Lee Bouvier Kennedy", "birthDate": "1929-07-28", "deathDate": "1994-05-19", "role": "First Lady, present during assassination"}', 1.0, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- NODES: Key Locations
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('20000000-0000-0000-0000-000000000001', jfk_graph_id, place_type_id, 'Dealey Plaza',
     '{"address": "Dallas, Texas", "latitude": 32.7787, "longitude": -96.8085, "significance": "Location of assassination"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('20000000-0000-0000-0000-000000000002', jfk_graph_id, place_type_id, 'Texas School Book Depository',
     '{"address": "411 Elm St, Dallas, TX", "latitude": 32.7798, "longitude": -96.8089, "significance": "Building where Oswald allegedly fired from"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('20000000-0000-0000-0000-000000000003', jfk_graph_id, place_type_id, 'Grassy Knoll',
     '{"address": "Dealey Plaza, Dallas, TX", "significance": "Alleged location of second shooter"}', 0.6, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- NODES: Key Events
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('30000000-0000-0000-0000-000000000001', jfk_graph_id, event_type_id, 'Assassination of JFK',
     '{"startDate": "1963-11-22T12:30:00", "location": "Dealey Plaza, Dallas, Texas", "description": "President Kennedy was fatally shot"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('30000000-0000-0000-0000-000000000002', jfk_graph_id, event_type_id, 'Arrest of Lee Harvey Oswald',
     '{"startDate": "1963-11-22T13:50:00", "location": "Texas Theatre, Dallas", "description": "Oswald arrested for murder of Officer Tippit"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('30000000-0000-0000-0000-000000000003', jfk_graph_id, event_type_id, 'Murder of Lee Harvey Oswald',
     '{"startDate": "1963-11-24T11:21:00", "location": "Dallas Police Headquarters", "description": "Jack Ruby shot Oswald during transfer"}', 1.0, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- NODES: Key Evidence
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('40000000-0000-0000-0000-000000000001', jfk_graph_id, thing_type_id, 'Warren Commission Report',
     '{"itemType": "Document", "date": "1964-09-27", "description": "Official investigation concluding Oswald acted alone"}', 0.85, admin_user_id, admin_user_id, NOW()),

    ('40000000-0000-0000-0000-000000000002', jfk_graph_id, thing_type_id, 'Zapruder Film',
     '{"itemType": "Film", "date": "1963-11-22", "description": "Only known complete recording of assassination"}', 1.0, admin_user_id, admin_user_id, NOW()),

    ('40000000-0000-0000-0000-000000000003', jfk_graph_id, thing_type_id, 'Mannlicher-Carcano Rifle',
     '{"itemType": "Weapon", "serialNumber": "C2766", "description": "Rifle allegedly used by Oswald"}', 0.95, admin_user_id, admin_user_id, NOW()),

    ('40000000-0000-0000-0000-000000000004', jfk_graph_id, thing_type_id, 'Magic Bullet (CE 399)',
     '{"itemType": "Evidence", "description": "Nearly pristine bullet found on stretcher at Parkland Hospital"}', 0.65, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- NODES: Facts
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('50000000-0000-0000-0000-000000000001', jfk_graph_id, fact_type_id, 'Three shots were fired',
     '{"verified": true, "source": "Acoustic evidence, witness testimony", "date": "1963-11-22"}', 0.90, admin_user_id, admin_user_id, NOW()),

    ('50000000-0000-0000-0000-000000000002', jfk_graph_id, fact_type_id, 'JFK was shot from behind',
     '{"verified": true, "source": "Autopsy report, trajectory analysis", "date": "1963-11-22"}', 0.85, admin_user_id, admin_user_id, NOW()),

    ('50000000-0000-0000-0000-000000000003', jfk_graph_id, fact_type_id, 'Oswald purchased rifle by mail order',
     '{"verified": true, "source": "Klein\'s Sporting Goods records", "date": "1963-03-13"}', 0.95, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- NODES: Claims (Disputed)
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at)
  VALUES
    ('60000000-0000-0000-0000-000000000001', jfk_graph_id, claim_type_id, 'Second shooter on grassy knoll',
     '{"confidence": 0.40, "source": "Witness testimony", "disputed": true}', 0.40, admin_user_id, admin_user_id, NOW()),

    ('60000000-0000-0000-0000-000000000002', jfk_graph_id, claim_type_id, 'Single bullet theory',
     '{"confidence": 0.70, "source": "Warren Commission", "disputed": true, "description": "One bullet caused 7 wounds in Kennedy and Connally"}', 0.70, admin_user_id, admin_user_id, NOW()),

    ('60000000-0000-0000-0000-000000000003', jfk_graph_id, claim_type_id, 'CIA involvement',
     '{"confidence": 0.30, "source": "Speculation, HSCA findings", "disputed": true}', 0.30, admin_user_id, admin_user_id, NOW()),

    ('60000000-0000-0000-0000-000000000004', jfk_graph_id, claim_type_id, 'Mafia involvement',
     '{"confidence": 0.35, "source": "HSCA investigation", "disputed": true}', 0.35, admin_user_id, admin_user_id, NOW());

  -- ========================================================================
  -- ARTICLE 1: Official Narrative
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, weight, author_id, published_at, created_by, created_at)
  VALUES (
    '80000000-0000-0000-0000-000000000001',
    jfk_graph_id,
    article_type_id,
    'The Warren Commission: Official Account of JFK Assassination',
    E'# The Warren Commission Report\n\n## Overview\n\nOn September 27, 1964, the Warren Commission released its 888-page report concluding that President John F. Kennedy was assassinated by Lee Harvey Oswald acting alone. The Commission, led by Chief Justice Earl Warren, investigated the assassination for ten months.\n\n## Key Findings\n\n### Single Assassin Theory\n\nThe Commission determined that:\n- Lee Harvey Oswald fired three shots from the sixth floor of the Texas School Book Depository\n- No evidence of conspiracy was found\n- Jack Ruby acted alone in killing Oswald\n\n### The Single Bullet Theory\n\nArlen Specter\'s controversial "single bullet theory" posited that one bullet (CE 399) caused all non-fatal wounds to both Kennedy and Governor Connally. This theory was necessary to explain the timing of shots given the bolt-action rifle\'s firing rate.\n\n### Evidence\n\n- Mannlicher-Carcano rifle linked to Oswald through palm print\n- Oswald\'s presence at the Book Depository\n- Ballistics evidence matching rifle to bullets\n- Zapruder film showing shot trajectory consistent with Depository\n\n## Criticisms\n\nMany critics have questioned:\n- The single bullet theory\'s plausibility\n- Inconsistent witness testimony about shot direction\n- The pristine condition of CE 399\n- Potential conflicts of interest in the investigation\n\n## Legacy\n\nDespite the Warren Commission\'s conclusions, polls consistently show a majority of Americans believe there was a conspiracy. The investigation remains one of the most scrutinized in American history.',
    0.85,
    admin_user_id,
    NOW(),
    admin_user_id,
    NOW()
  );

  -- Create edges from Official Narrative article to relevant nodes
  INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, weight, created_by, created_at)
  VALUES
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW()), -- JFK
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0.95, admin_user_id, NOW()), -- Oswald
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 0.98, admin_user_id, NOW()), -- Ruby
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW()), -- Warren Report
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 0.95, admin_user_id, NOW()), -- Rifle
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 0.70, admin_user_id, NOW()), -- Magic Bullet
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 0.70, admin_user_id, NOW()); -- Single Bullet Theory

  -- ========================================================================
  -- ARTICLE 2: Grassy Knoll Theory
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, weight, author_id, published_at, created_by, created_at)
  VALUES (
    '80000000-0000-0000-0000-000000000002',
    jfk_graph_id,
    article_type_id,
    'The Grassy Knoll: Evidence for a Second Shooter',
    E'# The Grassy Knoll Theory\n\n## Introduction\n\nOne of the most persistent alternative theories suggests a second shooter fired from the grassy knoll in Dealey Plaza. This theory contradicts the Warren Commission\'s lone gunman conclusion.\n\n## Witness Testimony\n\nOver 50 witnesses reported:\n- Hearing shots from the direction of the grassy knoll\n- Seeing smoke or movement near the picket fence\n- Running toward the knoll immediately after shots\n\n### Key Witnesses\n\n**Lee Bowers**: Railroad worker who observed suspicious activity behind the fence minutes before the assassination.\n\n**Jean Hill**: Claimed to see a gunman fire from the knoll, though her testimony varied over time.\n\n## Physical Evidence\n\n### The Head Snap\n\nThe Zapruder film shows Kennedy\'s head moving backward and to the left after the fatal shot, which some interpret as evidence of a frontal shot rather than from behind.\n\n### Acoustic Evidence\n\nIn 1979, the House Select Committee on Assassinations (HSCA) concluded based on acoustic analysis that there was a "high probability" of a shot from the grassy knoll. This finding was later disputed by the National Academy of Sciences.\n\n## Counterarguments\n\n- No physical evidence of bullet impact from the front\n- All recovered bullet fragments matched Oswald\'s rifle\n- Neuromuscular reaction can explain backward head movement\n- Acoustic evidence deemed unreliable\n\n## Conclusion\n\nWhile witness testimony suggests possible grassy knoll involvement, physical evidence remains inconclusive. The credibility of this theory is estimated at 40-50%.',
    0.55,
    admin_user_id,
    NOW(),
    admin_user_id,
    NOW()
  );

  -- Create edges from Grassy Knoll article to relevant nodes
  INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, weight, created_by, created_at)
  VALUES
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW()), -- JFK
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW()), -- Dealey Plaza
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 0.8, admin_user_id, NOW()), -- Grassy Knoll
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 1.0, admin_user_id, NOW()), -- Zapruder Film
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 0.7, admin_user_id, NOW()); -- Second Shooter Claim

  -- ========================================================================
  -- ARTICLE 3: CIA/Mafia Conspiracy Theory
  -- ========================================================================

  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, weight, author_id, published_at, created_by, created_at)
  VALUES (
    '80000000-0000-0000-0000-000000000003',
    jfk_graph_id,
    article_type_id,
    'CIA and Mafia Conspiracy: Institutional Involvement Theories',
    E'# CIA and Mafia Conspiracy Theories\n\n## Overview\n\nSeveral theories suggest the assassination involved institutional actors including the CIA, organized crime, or both working in concert. These theories are based on Kennedy\'s policies and conflicts with these entities.\n\n## CIA Motivation\n\n### Bay of Pigs\n\nAfter the failed 1961 Bay of Pigs invasion, Kennedy:\n- Fired CIA Director Allen Dulles\n- Threatened to splinter the CIA into a thousand pieces\n- Reduced CIA operational authority\n\nSome theorists suggest rogue CIA elements sought revenge.\n\n### Cuban Operations\n\nKennedy\'s reluctance to escalate operations against Cuba allegedly frustrated anti-Castro elements within the CIA and among Cuban exiles.\n\n## Mafia Motivation\n\n### Attorney General Robert Kennedy\n\nRobert Kennedy\'s aggressive prosecution of organized crime:\n- Targeted Sam Giancana (Chicago Outfit)\n- Investigated Carlos Marcello (New Orleans)\n- Pursued Jimmy Hoffa and Teamsters\n\nThe mob allegedly had both motive and capability.\n\n### Jack Ruby\'s Connections\n\nJack Ruby had documented connections to:\n- Dallas organized crime figures\n- Nightclub operations with possible mob ties\n- History of illegal activities\n\nHis killing of Oswald is seen by some as silencing a patsy.\n\n## House Select Committee Findings\n\nThe 1979 HSCA concluded:\n- President Kennedy was probably assassinated as a result of a conspiracy\n- The conspiracy did not involve federal agencies\n- Individual mob figures may have been involved\n- Insufficient evidence to determine full scope\n\n## Credibility Assessment\n\nMotivation: High (documented conflicts)\nCapability: High (both organizations had resources)\nEvidence: Low (mostly circumstantial)\n\nOverall credibility: 30-35%\n\n## Critical Analysis\n\nWhile compelling narratives exist, concrete evidence linking either organization to the assassination remains elusive. Most historians view these theories as speculative.',
    0.40,
    admin_user_id,
    NOW(),
    admin_user_id,
    NOW()
  );

  -- Create edges from CIA/Mafia article to relevant nodes
  INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, weight, created_by, created_at)
  VALUES
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW()), -- JFK
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 0.70, admin_user_id, NOW()), -- Oswald
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 0.90, admin_user_id, NOW()), -- Ruby
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 0.5, admin_user_id, NOW()), -- CIA Claim
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 0.5, admin_user_id, NOW()); -- Mafia Claim

END $$;

-- ============================================================================
-- STATISTICS
-- ============================================================================

SELECT 'JFK Graph Seed Data Complete!' as status;
SELECT 'Nodes created: ' || COUNT(*) FROM public."Nodes" WHERE graph_id = '00000000-0000-0000-0000-000000000001';
SELECT 'Edges created: ' || COUNT(*) FROM public."Edges" WHERE graph_id = '00000000-0000-0000-0000-000000000001';
