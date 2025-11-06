-- JFK Assassination Knowledge Graph
-- Level 0: Verified Facts and Primary Source Documents
-- Level 1: Theories and Interpretations

-- Create the main JFK Assassination graph
INSERT INTO public."Graphs" (id, name, description, level, methodology, owner_id, created_at, privacy)
VALUES
  ('jfk-assassination-001', 'JFK Assassination: Evidence & Theories', 'Comprehensive analysis of the JFK assassination including primary sources, witness testimony, and competing theories', 1, 'Scientific Method', NULL, NOW(), 'public')
ON CONFLICT (id) DO NOTHING;

-- Level 0 Nodes: Primary Source Documents and Verified Facts
INSERT INTO public."Nodes" (id, graph_id, title, description, props, level, is_level_0, created_at)
VALUES
  -- Warren Commission Documents
  ('node-warren-report', 'jfk-assassination-001', 'Warren Commission Report', 'Official 888-page report released September 27, 1964, concluding Lee Harvey Oswald acted alone',
   '{"type": "official_document", "date": "1964-09-27", "pages": 888, "conclusion": "single gunman", "commission_members": ["Earl Warren", "Gerald Ford", "Allen Dulles", "John McCloy", "Richard Russell", "John Cooper", "Hale Boggs"]}',
   0, true, NOW()),

  ('node-zapruder-film', 'jfk-assassination-001', 'Zapruder Film', '26.6-second 8mm film shot by Abraham Zapruder showing the assassination',
   '{"type": "primary_evidence", "duration": "26.6 seconds", "frames": 486, "frame_rate": "18.3 fps", "key_frames": {"313": "fatal shot", "225": "first visible reaction"}}',
   0, true, NOW()),

  ('node-autopsy-report', 'jfk-assassination-001', 'Bethesda Autopsy Report', 'Official autopsy conducted at Bethesda Naval Hospital by Commanders Humes and Boswell',
   '{"type": "medical_document", "date": "1963-11-22", "time": "8:00 PM EST", "doctors": ["James Humes", "Thornton Boswell", "Pierre Finck"], "wounds_documented": 3}',
   0, true, NOW()),

  ('node-dealey-plaza', 'jfk-assassination-001', 'Dealey Plaza Crime Scene', 'Physical location of assassination with documented positions and trajectories',
   '{"type": "physical_evidence", "location": "Dallas, TX", "date": "1963-11-22", "time": "12:30 PM CST", "witnesses_present": 600}',
   0, true, NOW()),

  ('node-rifle-evidence', 'jfk-assassination-001', 'Mannlicher-Carcano Rifle', '6.5mm Italian rifle found on 6th floor of Texas School Book Depository',
   '{"type": "physical_evidence", "serial_number": "C2766", "manufacturer": "Mannlicher-Carcano", "caliber": "6.5mm", "found": "TSBD 6th floor", "owner": "A. Hidell (Oswald alias)"}',
   0, true, NOW()),

  -- HSCA Investigation
  ('node-hsca-report', 'jfk-assassination-001', 'House Select Committee Report', '1979 Congressional investigation concluding probable conspiracy based on acoustic evidence',
   '{"type": "official_document", "date": "1979-03-29", "conclusion": "probable conspiracy", "acoustic_shots": 4, "probability": "95%"}',
   0, true, NOW()),

  ('node-acoustic-evidence', 'jfk-assassination-001', 'Dallas Police Dictabelt Recording', 'Audio recording from motorcycle officer microphone suggesting 4 shots',
   '{"type": "audio_evidence", "duration": "5.5 minutes", "channel": "Channel 1", "officer": "H.B. McLain", "shots_detected": 4}',
   0, true, NOW()),

  -- Witness Testimony
  ('node-grassy-knoll-witnesses', 'jfk-assassination-001', 'Grassy Knoll Witnesses', '51 witnesses reported shots from grassy knoll area',
   '{"type": "witness_testimony", "total_witnesses": 51, "location": "grassy knoll", "notable_witnesses": ["S.M. Holland", "Lee Bowers", "Jean Hill", "Mary Moorman"]}',
   0, true, NOW()),

  ('node-oswald-interrogation', 'jfk-assassination-001', 'Oswald Interrogation Notes', 'Notes from 12 hours of interrogation before Oswald death',
   '{"type": "testimony", "duration": "12 hours", "interrogators": ["Will Fritz", "FBI agents", "Secret Service"], "oswald_claim": "patsy", "no_recording": true}',
   0, true, NOW()),

  -- Medical Evidence
  ('node-parkland-doctors', 'jfk-assassination-001', 'Parkland Hospital Reports', 'Initial medical reports from emergency room doctors',
   '{"type": "medical_testimony", "doctors": ["Malcolm Perry", "Charles Carrico", "Robert McClelland"], "wound_description": "anterior neck wound", "initial_assessment": "entrance wound"}',
   0, true, NOW()),

  ('node-bullet-ce399', 'jfk-assassination-001', 'CE 399 Magic Bullet', 'Nearly pristine bullet found on Connally stretcher',
   '{"type": "physical_evidence", "exhibit": "CE 399", "weight": "158.6 grains", "condition": "nearly pristine", "controversy": "single bullet theory"}',
   0, true, NOW()),

  -- CIA/FBI Documents
  ('node-cia-files', 'jfk-assassination-001', 'CIA JFK Files (Released 2017)', 'Previously classified CIA documents released under JFK Records Act',
   '{"type": "classified_documents", "release_date": "2017-10-26", "pages": 2800, "still_withheld": 300, "topics": ["Oswald Mexico City", "Operation Mongoose", "Anti-Castro plots"]}',
   0, true, NOW()),

  ('node-fbi-oswald-file', 'jfk-assassination-001', 'FBI Oswald File', 'FBI surveillance and investigation files on Lee Harvey Oswald pre-assassination',
   '{"type": "intelligence_file", "opened": "1959", "reason": "Soviet defection", "agent": "James Hosty", "visits_to_home": 2}',
   0, true, NOW()),

  -- Level 1 Nodes: Theories and Interpretations
  ('node-lone-gunman-theory', 'jfk-assassination-001', 'Lone Gunman Theory', 'Official Warren Commission conclusion that Oswald acted alone',
   '{"type": "theory", "proponents": ["Warren Commission", "Gerald Posner", "Vincent Bugliosi"], "shots": 3, "location": "TSBD 6th floor"}',
   1, false, NOW()),

  ('node-grassy-knoll-theory', 'jfk-assassination-001', 'Grassy Knoll Second Shooter', 'Theory of second shooter positioned on grassy knoll',
   '{"type": "theory", "evidence": ["witness testimony", "smoke", "acoustic evidence"], "proponents": ["Mark Lane", "Jim Garrison"]}',
   1, false, NOW()),

  ('node-cia-conspiracy', 'jfk-assassination-001', 'CIA Conspiracy Theory', 'Theory that CIA orchestrated assassination due to Bay of Pigs and Cuba policy',
   '{"type": "theory", "motives": ["Bay of Pigs", "Cuba policy", "Vietnam"], "suspects": ["E. Howard Hunt", "David Morales"], "operation": "Operation 40"}',
   1, false, NOW()),

  ('node-mafia-theory', 'jfk-assassination-001', 'Organized Crime Theory', 'Theory that Mafia killed JFK over RFK prosecution and Cuba casinos',
   '{"type": "theory", "suspects": ["Carlos Marcello", "Santo Trafficante", "Sam Giancana"], "motives": ["RFK prosecution", "Cuba casinos", "Teamsters"]}',
   1, false, NOW()),

  ('node-military-industrial', 'jfk-assassination-001', 'Military-Industrial Complex', 'Theory related to Vietnam War escalation and defense contracts',
   '{"type": "theory", "motives": ["Vietnam withdrawal", "defense contracts", "Cold War"], "beneficiaries": ["defense contractors", "Pentagon hawks"]}',
   1, false, NOW()),

  ('node-lbj-theory', 'jfk-assassination-001', 'LBJ Involvement Theory', 'Theory that Vice President Johnson was involved',
   '{"type": "theory", "motives": ["political ambition", "Bobby Baker scandal", "Texas oil interests"], "evidence": ["Mac Wallace fingerprint claim"]}',
   1, false, NOW()),

  ('node-umbrella-man', 'jfk-assassination-001', 'Umbrella Man Signal Theory', 'Theory that man with umbrella was signaling shooters',
   '{"type": "theory", "identified_as": "Louie Steven Witt", "testimony": "1978 HSCA", "claimed_reason": "protest symbol"}',
   1, false, NOW()),

  ('node-three-tramps', 'jfk-assassination-001', 'Three Tramps Theory', 'Theory that three arrested tramps were CIA operatives',
   '{"type": "theory", "identified": ["Harold Doyle", "John Gedney", "Gus Abrams"], "arrest_time": "2:00 PM", "released": "without charges"}',
   1, false, NOW()),

  -- Ballistics Analysis
  ('node-single-bullet-theory', 'jfk-assassination-001', 'Single Bullet Theory', 'Theory that one bullet caused 7 wounds in Kennedy and Connally',
   '{"type": "ballistic_theory", "trajectory": "downward 17 degrees", "wounds": 7, "proponent": "Arlen Specter", "exhibit": "CE 399"}',
   1, false, NOW()),

  ('node-head-shot-analysis', 'jfk-assassination-001', 'Fatal Head Shot Analysis', 'Conflicting analyses of final shot direction',
   '{"type": "forensic_analysis", "frame": 313, "direction_debate": ["back and to left", "forward snap"], "exit_wound": "right temporal"}',
   1, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Create edges connecting evidence to theories
INSERT INTO public."Edges" (id, graph_id, source_node_id, target_node_id, label, props, created_at)
VALUES
  -- Warren Report connections
  ('edge-001', 'jfk-assassination-001', 'node-warren-report', 'node-lone-gunman-theory', 'SUPPORTS', '{"strength": "primary", "type": "official_conclusion"}', NOW()),
  ('edge-002', 'jfk-assassination-001', 'node-rifle-evidence', 'node-lone-gunman-theory', 'EVIDENCE_FOR', '{"type": "physical_evidence"}', NOW()),
  ('edge-003', 'jfk-assassination-001', 'node-bullet-ce399', 'node-single-bullet-theory', 'KEY_EVIDENCE', '{"controversial": true}', NOW()),

  -- Grassy Knoll connections
  ('edge-004', 'jfk-assassination-001', 'node-grassy-knoll-witnesses', 'node-grassy-knoll-theory', 'SUPPORTS', '{"witness_count": 51}', NOW()),
  ('edge-005', 'jfk-assassination-001', 'node-acoustic-evidence', 'node-grassy-knoll-theory', 'SUGGESTS', '{"shots": 4}', NOW()),
  ('edge-006', 'jfk-assassination-001', 'node-hsca-report', 'node-grassy-knoll-theory', 'VALIDATES', '{"probability": "95%"}', NOW()),

  -- Medical evidence connections
  ('edge-007', 'jfk-assassination-001', 'node-autopsy-report', 'node-head-shot-analysis', 'EXAMINED_BY', '{"conflicting_reports": true}', NOW()),
  ('edge-008', 'jfk-assassination-001', 'node-parkland-doctors', 'node-grassy-knoll-theory', 'CONTRADICTS_OFFICIAL', '{"wound_interpretation": "entrance wound"}', NOW()),

  -- Zapruder film connections
  ('edge-009', 'jfk-assassination-001', 'node-zapruder-film', 'node-head-shot-analysis', 'CAPTURED', '{"frame": 313}', NOW()),
  ('edge-010', 'jfk-assassination-001', 'node-zapruder-film', 'node-grassy-knoll-theory', 'ANALYZED_FOR', '{"movement": "back and to left"}', NOW()),

  -- CIA connections
  ('edge-011', 'jfk-assassination-001', 'node-cia-files', 'node-cia-conspiracy', 'REVEALS', '{"classification": "formerly classified"}', NOW()),
  ('edge-012', 'jfk-assassination-001', 'node-fbi-oswald-file', 'node-cia-conspiracy', 'LINKS_TO', '{"surveillance": "pre-assassination"}', NOW()),

  -- Oswald connections
  ('edge-013', 'jfk-assassination-001', 'node-oswald-interrogation', 'node-lone-gunman-theory', 'DENIES', '{"claim": "I am a patsy"}', NOW()),
  ('edge-014', 'jfk-assassination-001', 'node-rifle-evidence', 'node-oswald-interrogation', 'OWNED_BY', '{"alias": "A. Hidell"}', NOW()),

  -- Location connections
  ('edge-015', 'jfk-assassination-001', 'node-dealey-plaza', 'node-zapruder-film', 'LOCATION_OF', '{"position": "concrete pedestal"}', NOW()),
  ('edge-016', 'jfk-assassination-001', 'node-dealey-plaza', 'node-grassy-knoll-witnesses', 'WITNESSED_AT', '{"area": "grassy knoll"}', NOW()),

  -- Theory interconnections
  ('edge-017', 'jfk-assassination-001', 'node-umbrella-man', 'node-cia-conspiracy', 'POSSIBLY_RELATED', '{"speculation": true}', NOW()),
  ('edge-018', 'jfk-assassination-001', 'node-three-tramps', 'node-cia-conspiracy', 'SUSPECTED_LINK', '{"evidence": "circumstantial"}', NOW()),

  -- Contradictions
  ('edge-019', 'jfk-assassination-001', 'node-warren-report', 'node-hsca-report', 'CONTRADICTED_BY', '{"issue": "number of shots"}', NOW()),
  ('edge-020', 'jfk-assassination-001', 'node-single-bullet-theory', 'node-head-shot-analysis', 'RELATED_BALLISTICS', '{"controversy": "trajectory analysis"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add veracity scores for theories (0.0 to 1.0 based on evidence strength)
INSERT INTO public."VeracityScores" (id, node_id, veracity_score, confidence_level, evidence_count, created_at)
VALUES
  (gen_random_uuid(), 'node-lone-gunman-theory', 0.65, 0.8, 5, NOW()),
  (gen_random_uuid(), 'node-grassy-knoll-theory', 0.45, 0.6, 3, NOW()),
  (gen_random_uuid(), 'node-cia-conspiracy', 0.35, 0.4, 2, NOW()),
  (gen_random_uuid(), 'node-mafia-theory', 0.30, 0.5, 2, NOW()),
  (gen_random_uuid(), 'node-military-industrial', 0.25, 0.3, 1, NOW()),
  (gen_random_uuid(), 'node-single-bullet-theory', 0.50, 0.7, 3, NOW())
ON CONFLICT DO NOTHING;

-- Create timeline nodes
INSERT INTO public."Nodes" (id, graph_id, title, description, props, level, is_level_0, created_at)
VALUES
  ('node-timeline-1230', 'jfk-assassination-001', '12:30 PM - First Shot', 'First shot fired in Dealey Plaza',
   '{"type": "timeline_event", "time": "12:30:00 CST", "location": "Dealey Plaza", "frame": "160-224"}', 0, true, NOW()),

  ('node-timeline-1231', 'jfk-assassination-001', '12:30:13 PM - Fatal Shot', 'Fatal head shot at Zapruder frame 313',
   '{"type": "timeline_event", "time": "12:30:13 CST", "zapruder_frame": 313}', 0, true, NOW()),

  ('node-timeline-113pm', 'jfk-assassination-001', '1:00 PM - JFK Pronounced Dead', 'President Kennedy pronounced dead at Parkland Hospital',
   '{"type": "timeline_event", "time": "1:00 PM CST", "location": "Parkland Hospital", "doctor": "Dr. Kemp Clark"}', 0, true, NOW()),

  ('node-timeline-150pm', 'jfk-assassination-001', '1:50 PM - Oswald Arrested', 'Lee Harvey Oswald arrested at Texas Theatre',
   '{"type": "timeline_event", "time": "1:50 PM CST", "location": "Texas Theatre", "charge": "Tippit murder"}', 0, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Connect timeline events
INSERT INTO public."Edges" (id, graph_id, source_node_id, target_node_id, label, props, created_at)
VALUES
  ('edge-time-001', 'jfk-assassination-001', 'node-timeline-1230', 'node-timeline-1231', 'FOLLOWED_BY', '{"duration": "13 seconds"}', NOW()),
  ('edge-time-002', 'jfk-assassination-001', 'node-timeline-1231', 'node-timeline-113pm', 'FOLLOWED_BY', '{"duration": "30 minutes"}', NOW()),
  ('edge-time-003', 'jfk-assassination-001', 'node-timeline-113pm', 'node-timeline-150pm', 'FOLLOWED_BY', '{"duration": "50 minutes"}', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;