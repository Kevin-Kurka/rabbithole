-- Create edges between JFK assassination nodes
-- This connects evidence to theories

BEGIN;

DO $$
DECLARE
  jfk_graph_id UUID;
  related_type_id UUID;
  -- Node IDs
  warren_report_id UUID;
  zapruder_film_id UUID;
  autopsy_report_id UUID;
  rifle_evidence_id UUID;
  hsca_report_id UUID;
  acoustic_evidence_id UUID;
  grassy_knoll_witnesses_id UUID;
  oswald_interrogation_id UUID;
  parkland_doctors_id UUID;
  magic_bullet_id UUID;
  cia_files_id UUID;
  fbi_file_id UUID;

  -- Theory IDs
  lone_gunman_id UUID;
  grassy_knoll_theory_id UUID;
  cia_conspiracy_id UUID;
  mafia_theory_id UUID;
  single_bullet_theory_id UUID;
  head_shot_analysis_id UUID;
BEGIN
  -- Get graph and edge type
  SELECT id INTO jfk_graph_id FROM public."Graphs" WHERE name = 'JFK Assassination: Evidence & Theories';
  SELECT id INTO related_type_id FROM public."EdgeTypes" WHERE name = 'related_to';

  -- Get evidence node IDs
  SELECT id INTO warren_report_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Warren Commission Report';
  SELECT id INTO zapruder_film_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Zapruder Film';
  SELECT id INTO autopsy_report_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Bethesda Autopsy Report';
  SELECT id INTO rifle_evidence_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Mannlicher-Carcano Rifle';
  SELECT id INTO hsca_report_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'House Select Committee Report';
  SELECT id INTO acoustic_evidence_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Dallas Police Dictabelt Recording';
  SELECT id INTO grassy_knoll_witnesses_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Grassy Knoll Witnesses';
  SELECT id INTO oswald_interrogation_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Oswald Interrogation Notes';
  SELECT id INTO parkland_doctors_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Parkland Hospital Reports';
  SELECT id INTO magic_bullet_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'CE 399 Magic Bullet';
  SELECT id INTO cia_files_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'CIA JFK Files (Released 2017)';
  SELECT id INTO fbi_file_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'FBI Oswald File';

  -- Get theory node IDs
  SELECT id INTO lone_gunman_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Lone Gunman Theory';
  SELECT id INTO grassy_knoll_theory_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Grassy Knoll Second Shooter';
  SELECT id INTO cia_conspiracy_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'CIA Conspiracy Theory';
  SELECT id INTO mafia_theory_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Organized Crime Theory';
  SELECT id INTO single_bullet_theory_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Single Bullet Theory';
  SELECT id INTO head_shot_analysis_id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = 'Fatal Head Shot Analysis';

  -- Create edges connecting evidence to theories
  INSERT INTO public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, is_level_0, created_at)
  VALUES
    -- Warren Report connections
    (gen_random_uuid(), jfk_graph_id, related_type_id, warren_report_id, lone_gunman_id,
     '{"relationship": "supports", "strength": "primary", "type": "official_conclusion"}', false, NOW()),

    -- Rifle evidence to lone gunman theory
    (gen_random_uuid(), jfk_graph_id, related_type_id, rifle_evidence_id, lone_gunman_id,
     '{"relationship": "evidence_for", "type": "physical_evidence"}', false, NOW()),

    -- Magic bullet to single bullet theory
    (gen_random_uuid(), jfk_graph_id, related_type_id, magic_bullet_id, single_bullet_theory_id,
     '{"relationship": "key_evidence", "controversial": true}', false, NOW()),

    -- Grassy knoll witnesses to grassy knoll theory
    (gen_random_uuid(), jfk_graph_id, related_type_id, grassy_knoll_witnesses_id, grassy_knoll_theory_id,
     '{"relationship": "supports", "witness_count": 51}', false, NOW()),

    -- Acoustic evidence to grassy knoll theory
    (gen_random_uuid(), jfk_graph_id, related_type_id, acoustic_evidence_id, grassy_knoll_theory_id,
     '{"relationship": "suggests", "shots_detected": 4}', false, NOW()),

    -- HSCA report to grassy knoll theory
    (gen_random_uuid(), jfk_graph_id, related_type_id, hsca_report_id, grassy_knoll_theory_id,
     '{"relationship": "validates", "probability": "95%"}', false, NOW()),

    -- Medical evidence connections
    (gen_random_uuid(), jfk_graph_id, related_type_id, autopsy_report_id, head_shot_analysis_id,
     '{"relationship": "examined_by", "conflicting_reports": true}', false, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id, parkland_doctors_id, grassy_knoll_theory_id,
     '{"relationship": "contradicts_official", "wound_interpretation": "entrance wound"}', false, NOW()),

    -- Zapruder film connections
    (gen_random_uuid(), jfk_graph_id, related_type_id, zapruder_film_id, head_shot_analysis_id,
     '{"relationship": "captured", "frame": 313}', false, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id, zapruder_film_id, grassy_knoll_theory_id,
     '{"relationship": "analyzed_for", "movement": "back and to left"}', false, NOW()),

    -- CIA connections
    (gen_random_uuid(), jfk_graph_id, related_type_id, cia_files_id, cia_conspiracy_id,
     '{"relationship": "reveals", "classification": "formerly classified"}', false, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id, fbi_file_id, cia_conspiracy_id,
     '{"relationship": "links_to", "surveillance": "pre-assassination"}', false, NOW()),

    -- Oswald connections
    (gen_random_uuid(), jfk_graph_id, related_type_id, oswald_interrogation_id, lone_gunman_id,
     '{"relationship": "denies", "claim": "I am a patsy"}', false, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id, rifle_evidence_id, oswald_interrogation_id,
     '{"relationship": "owned_by", "alias": "A. Hidell"}', false, NOW()),

    -- Contradictions between reports
    (gen_random_uuid(), jfk_graph_id, related_type_id, warren_report_id, hsca_report_id,
     '{"relationship": "contradicted_by", "issue": "number of shots"}', false, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id, single_bullet_theory_id, head_shot_analysis_id,
     '{"relationship": "related_ballistics", "controversy": "trajectory analysis"}', false, NOW()),

    -- Connect timeline events
    (gen_random_uuid(), jfk_graph_id, related_type_id,
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '12:30 PM - First Shot'),
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '12:30:13 PM - Fatal Shot'),
     '{"relationship": "followed_by", "duration": "13 seconds"}', true, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id,
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '12:30:13 PM - Fatal Shot'),
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '1:00 PM - JFK Pronounced Dead'),
     '{"relationship": "followed_by", "duration": "30 minutes"}', true, NOW()),

    (gen_random_uuid(), jfk_graph_id, related_type_id,
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '1:00 PM - JFK Pronounced Dead'),
     (SELECT id FROM public."Nodes" WHERE graph_id = jfk_graph_id AND props->>'title' = '1:50 PM - Oswald Arrested'),
     '{"relationship": "followed_by", "duration": "50 minutes"}', true, NOW());

END $$;

COMMIT;