-- JFK Assassination Knowledge Graph
-- Fixed version for actual database schema

BEGIN;

-- First, get the NodeType and EdgeType IDs we need
DO $$
DECLARE
  fact_type_id UUID;
  event_type_id UUID;
  document_type_id UUID;
  related_to_type_id UUID;
  graph_id UUID;
BEGIN
  -- Get NodeType IDs
  SELECT id INTO fact_type_id FROM public."NodeTypes" WHERE name = 'Fact';
  SELECT id INTO event_type_id FROM public."NodeTypes" WHERE name = 'Event';
  SELECT id INTO document_type_id FROM public."NodeTypes" WHERE name = 'Document';

  -- Get EdgeType ID
  SELECT id INTO related_to_type_id FROM public."EdgeTypes" WHERE name = 'related_to';

  -- Create the main JFK Assassination graph
  graph_id := gen_random_uuid();

  INSERT INTO public."Graphs" (id, name, description, level, methodology, created_by, created_at, privacy)
  VALUES
    (graph_id, 'JFK Assassination: Evidence & Theories', 'Comprehensive analysis of the JFK assassination including primary sources, witness testimony, and competing theories', 1, 'Scientific Method', NULL, NOW(), 'public');

  -- Level 0 Nodes: Primary Source Documents and Verified Facts
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, props, is_level_0, created_at)
  VALUES
    -- Warren Commission Documents
    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "Warren Commission Report", "description": "Official 888-page report released September 27, 1964, concluding Lee Harvey Oswald acted alone", "type": "official_document", "date": "1964-09-27", "pages": 888, "conclusion": "single gunman", "commission_members": ["Earl Warren", "Gerald Ford", "Allen Dulles", "John McCloy", "Richard Russell", "John Cooper", "Hale Boggs"]}',
     true, NOW()),

    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "Zapruder Film", "description": "26.6-second 8mm film shot by Abraham Zapruder showing the assassination", "type": "primary_evidence", "duration": "26.6 seconds", "frames": 486, "frame_rate": "18.3 fps", "key_frames": {"313": "fatal shot", "225": "first visible reaction"}}',
     true, NOW()),

    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "Bethesda Autopsy Report", "description": "Official autopsy conducted at Bethesda Naval Hospital by Commanders Humes and Boswell", "type": "medical_document", "date": "1963-11-22", "time": "8:00 PM EST", "doctors": ["James Humes", "Thornton Boswell", "Pierre Finck"], "wounds_documented": 3}',
     true, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Dealey Plaza Crime Scene", "description": "Physical location of assassination with documented positions and trajectories", "type": "physical_evidence", "location": "Dallas, TX", "date": "1963-11-22", "time": "12:30 PM CST", "witnesses_present": 600}',
     true, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Mannlicher-Carcano Rifle", "description": "6.5mm Italian rifle found on 6th floor of Texas School Book Depository", "type": "physical_evidence", "serial_number": "C2766", "manufacturer": "Mannlicher-Carcano", "caliber": "6.5mm", "found": "TSBD 6th floor", "owner": "A. Hidell (Oswald alias)"}',
     true, NOW()),

    -- HSCA Investigation
    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "House Select Committee Report", "description": "1979 Congressional investigation concluding probable conspiracy based on acoustic evidence", "type": "official_document", "date": "1979-03-29", "conclusion": "probable conspiracy", "acoustic_shots": 4, "probability": "95%"}',
     true, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Dallas Police Dictabelt Recording", "description": "Audio recording from motorcycle officer microphone suggesting 4 shots", "type": "audio_evidence", "duration": "5.5 minutes", "channel": "Channel 1", "officer": "H.B. McLain", "shots_detected": 4}',
     true, NOW()),

    -- Witness Testimony
    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Grassy Knoll Witnesses", "description": "51 witnesses reported shots from grassy knoll area", "type": "witness_testimony", "total_witnesses": 51, "location": "grassy knoll", "notable_witnesses": ["S.M. Holland", "Lee Bowers", "Jean Hill", "Mary Moorman"]}',
     true, NOW()),

    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "Oswald Interrogation Notes", "description": "Notes from 12 hours of interrogation before Oswald death", "type": "testimony", "duration": "12 hours", "interrogators": ["Will Fritz", "FBI agents", "Secret Service"], "oswald_claim": "patsy", "no_recording": true}',
     true, NOW()),

    -- Medical Evidence
    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "Parkland Hospital Reports", "description": "Initial medical reports from emergency room doctors", "type": "medical_testimony", "doctors": ["Malcolm Perry", "Charles Carrico", "Robert McClelland"], "wound_description": "anterior neck wound", "initial_assessment": "entrance wound"}',
     true, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "CE 399 Magic Bullet", "description": "Nearly pristine bullet found on Connally stretcher", "type": "physical_evidence", "exhibit": "CE 399", "weight": "158.6 grains", "condition": "nearly pristine", "controversy": "single bullet theory"}',
     true, NOW()),

    -- CIA/FBI Documents
    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "CIA JFK Files (Released 2017)", "description": "Previously classified CIA documents released under JFK Records Act", "type": "classified_documents", "release_date": "2017-10-26", "pages": 2800, "still_withheld": 300, "topics": ["Oswald Mexico City", "Operation Mongoose", "Anti-Castro plots"]}',
     true, NOW()),

    (gen_random_uuid(), graph_id, document_type_id,
     '{"title": "FBI Oswald File", "description": "FBI surveillance and investigation files on Lee Harvey Oswald pre-assassination", "type": "intelligence_file", "opened": "1959", "reason": "Soviet defection", "agent": "James Hosty", "visits_to_home": 2}',
     true, NOW()),

    -- Level 1 Nodes: Theories and Interpretations
    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Lone Gunman Theory", "description": "Official Warren Commission conclusion that Oswald acted alone", "type": "theory", "proponents": ["Warren Commission", "Gerald Posner", "Vincent Bugliosi"], "shots": 3, "location": "TSBD 6th floor"}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Grassy Knoll Second Shooter", "description": "Theory of second shooter positioned on grassy knoll", "type": "theory", "evidence": ["witness testimony", "smoke", "acoustic evidence"], "proponents": ["Mark Lane", "Jim Garrison"]}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "CIA Conspiracy Theory", "description": "Theory that CIA orchestrated assassination due to Bay of Pigs and Cuba policy", "type": "theory", "motives": ["Bay of Pigs", "Cuba policy", "Vietnam"], "suspects": ["E. Howard Hunt", "David Morales"], "operation": "Operation 40"}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Organized Crime Theory", "description": "Theory that Mafia killed JFK over RFK prosecution and Cuba casinos", "type": "theory", "suspects": ["Carlos Marcello", "Santo Trafficante", "Sam Giancana"], "motives": ["RFK prosecution", "Cuba casinos", "Teamsters"]}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Military-Industrial Complex", "description": "Theory related to Vietnam War escalation and defense contracts", "type": "theory", "motives": ["Vietnam withdrawal", "defense contracts", "Cold War"], "beneficiaries": ["defense contractors", "Pentagon hawks"]}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "LBJ Involvement Theory", "description": "Theory that Vice President Johnson was involved", "type": "theory", "motives": ["political ambition", "Bobby Baker scandal", "Texas oil interests"], "evidence": ["Mac Wallace fingerprint claim"]}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Umbrella Man Signal Theory", "description": "Theory that man with umbrella was signaling shooters", "type": "theory", "identified_as": "Louie Steven Witt", "testimony": "1978 HSCA", "claimed_reason": "protest symbol"}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Three Tramps Theory", "description": "Theory that three arrested tramps were CIA operatives", "type": "theory", "identified": ["Harold Doyle", "John Gedney", "Gus Abrams"], "arrest_time": "2:00 PM", "released": "without charges"}',
     false, NOW()),

    -- Ballistics Analysis
    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Single Bullet Theory", "description": "Theory that one bullet caused 7 wounds in Kennedy and Connally", "type": "ballistic_theory", "trajectory": "downward 17 degrees", "wounds": 7, "proponent": "Arlen Specter", "exhibit": "CE 399"}',
     false, NOW()),

    (gen_random_uuid(), graph_id, fact_type_id,
     '{"title": "Fatal Head Shot Analysis", "description": "Conflicting analyses of final shot direction", "type": "forensic_analysis", "frame": 313, "direction_debate": ["back and to left", "forward snap"], "exit_wound": "right temporal"}',
     false, NOW()),

    -- Timeline events
    (gen_random_uuid(), graph_id, event_type_id,
     '{"title": "12:30 PM - First Shot", "description": "First shot fired in Dealey Plaza", "type": "timeline_event", "time": "12:30:00 CST", "location": "Dealey Plaza", "frame": "160-224"}',
     true, NOW()),

    (gen_random_uuid(), graph_id, event_type_id,
     '{"title": "12:30:13 PM - Fatal Shot", "description": "Fatal head shot at Zapruder frame 313", "type": "timeline_event", "time": "12:30:13 CST", "zapruder_frame": 313}',
     true, NOW()),

    (gen_random_uuid(), graph_id, event_type_id,
     '{"title": "1:00 PM - JFK Pronounced Dead", "description": "President Kennedy pronounced dead at Parkland Hospital", "type": "timeline_event", "time": "1:00 PM CST", "location": "Parkland Hospital", "doctor": "Dr. Kemp Clark"}',
     true, NOW()),

    (gen_random_uuid(), graph_id, event_type_id,
     '{"title": "1:50 PM - Oswald Arrested", "description": "Lee Harvey Oswald arrested at Texas Theatre", "type": "timeline_event", "time": "1:50 PM CST", "location": "Texas Theatre", "charge": "Tippit murder"}',
     true, NOW());
END $$;

COMMIT;