-- ============================================================================
-- JFK ASSASSINATION CONSPIRACY INVESTIGATION - DEMO DATA
-- ============================================================================
-- Demonstrates complex conspiracy investigation with interconnected nodes
-- ============================================================================

DO $$
DECLARE
    -- Node type IDs
    person_type_id UUID;
    article_type_id UUID;
    inquiry_type_id UUID;
    position_type_id UUID;
    evidence_type_id UUID;
    event_type_id UUID;
    place_type_id UUID;
    
    -- Edge type IDs
    location_edge UUID;
    has_position_edge UUID;
    cites_evidence_edge UUID;
    related_to_edge UUID;
    
    -- Node IDs
    jfk_id UUID;
    oswald_id UUID;
    ruby_id UUID;
    zapruder_id UUID;
    dealey_plaza_id UUID;
    assassination_id UUID;
    warren_report_id UUID;
    main_inquiry_id UUID;
    lone_gunman_id UUID;
    conspiracy_id UUID;
    cia_involvement_id UUID;
    mafia_involvement_id UUID;
    zapruder_film_id UUID;
    autopsy_id UUID;
    single_bullet_id UUID;
    acoustic_evidence_id UUID;
    grassy_knoll_inquiry_id UUID;
    grassy_yes_id UUID;
    grassy_no_id UUID;
    
BEGIN
    -- Get type IDs
    SELECT id INTO person_type_id FROM node_types WHERE name = 'Person';
    SELECT id INTO article_type_id FROM node_types WHERE name = 'Article';
    SELECT id INTO inquiry_type_id FROM node_types WHERE name = 'Inquiry';
    SELECT id INTO position_type_id FROM node_types WHERE name = 'Position';
    SELECT id INTO evidence_type_id FROM node_types WHERE name = 'Evidence';
    SELECT id INTO event_type_id FROM node_types WHERE name = 'Event';
    SELECT id INTO place_type_id FROM node_types WHERE name = 'Place';
    
    SELECT id INTO location_edge FROM edge_types WHERE name = 'location';
    SELECT id INTO has_position_edge FROM edge_types WHERE name = 'HAS_POSITION';
    SELECT id INTO cites_evidence_edge FROM edge_types WHERE name = 'CITES_EVIDENCE';
    SELECT id INTO related_to_edge FROM edge_types WHERE name = 'RELATED_TO';

    -- ========================================================================
    -- 1. KEY PEOPLE
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'John',
        'familyName', 'Kennedy',
        'additionalName', 'Fitzgerald',
        'honorificPrefix', 'President',
        'birthDate', '1917-05-29',
        'deathDate', '1963-11-22',
        'nationality', 'American',
        'jobTitle', '35th President of the United States'
    ))
    RETURNING id INTO jfk_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'Lee',
        'familyName', 'Oswald',
        'additionalName', 'Harvey',
        'birthDate', '1939-10-18',
        'deathDate', '1963-11-24',
        'nationality', 'American'
    ))
    RETURNING id INTO oswald_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'Jack',
        'familyName', 'Ruby',
        'birthDate', '1911-03-25',
        'deathDate', '1967-01-03',
        'nationality', 'American',
        'jobTitle', 'Nightclub owner'
    ))
    RETURNING id INTO ruby_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'Abraham',
        'familyName', 'Zapruder',
        'birthDate', '1905-05-15',
        'deathDate', '1970-08-30',
        'nationality', 'American',
        'jobTitle', 'Clothing manufacturer'
    ))
    RETURNING id INTO zapruder_id;

    -- ========================================================================
    -- 2. PLACE & EVENT
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (place_type_id, jsonb_build_object(
        'name', 'Dealey Plaza',
        'address', 'Dallas, Texas',
        'latitude', 32.7788,
        'longitude', -96.8082
    ))
    RETURNING id INTO dealey_plaza_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (event_type_id, jsonb_build_object(
        'name', 'Assassination of John F. Kennedy',
        'startDate', '1963-11-22',
        'description', 'President Kennedy assassinated in Dallas motorcade'
    ))
    RETURNING id INTO assassination_id;
    
    -- Event → Place (valid edge type)
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (assassination_id, dealey_plaza_id, location_edge, '{}'::jsonb);
    
    -- People → Event relationships
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (jfk_id, assassination_id, related_to_edge, '{"relationshipType": "victim", "weight": 1.0}'::jsonb),
    (oswald_id, assassination_id, related_to_edge, '{"relationshipType": "accused", "weight": 0.9}'::jsonb),
    (zapruder_id, assassination_id, related_to_edge, '{"relationshipType": "witness", "weight": 0.8}'::jsonb),
    (ruby_id, oswald_id, related_to_edge, '{"relationshipType": "killed", "weight": 1.0}'::jsonb);

    -- ========================================================================
    -- 3. ARTICLE
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (article_type_id, jsonb_build_object(
        'name', 'Warren Commission Report',
        'headline', 'Report of the Presidents Commission on the Assassination',
        'articleBody', 'Concluded that Lee Harvey Oswald acted alone',
        'datePublished', '1964-09-27',
        'wordCount', 888
    ))
    RETURNING id INTO warren_report_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (warren_report_id, assassination_id, related_to_edge, '{"relationshipType": "about", "weight": 1.0}'::jsonb);

    -- ========================================================================
    -- 4. MAIN INQUIRY
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (inquiry_type_id, jsonb_build_object(
        'title', 'Who was responsible for the assassination of President John F. Kennedy?',
        'description', 'Investigation examining lone gunman vs. conspiracy theories',
        'status', 'under_review',
        'credibilityScore', 0.75,
        'authorId', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO main_inquiry_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (main_inquiry_id, assassination_id, related_to_edge, '{"relationshipType": "investigates", "weight": 1.0}'::jsonb);

    -- ========================================================================
    -- 5. POSITIONS (Competing Theories)
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'Lee Harvey Oswald acted alone',
        'argument', 'Oswald fired three shots from the Texas School Book Depository. Supported by ballistic evidence.',
        'credibilityScore', 0.65,
        'authorId', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO lone_gunman_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (main_inquiry_id, lone_gunman_id, has_position_edge, '{"order": 1}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'Multiple shooters / Conspiracy',
        'argument', 'Evidence suggests multiple shooters. Acoustic evidence and witness testimony support this.',
        'credibilityScore', 0.55,
        'authorId', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO conspiracy_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (main_inquiry_id, conspiracy_id, has_position_edge, '{"order": 2}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'CIA orchestrated the assassination',
        'argument', 'CIA had motive and means. Oswald''s intelligence connections are suspicious.',
        'credibilityScore', 0.35,
        'authorId', '00000000-0000-0000-0000-000000000003'
    ))
    RETURNING id INTO cia_involvement_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (main_inquiry_id, cia_involvement_id, has_position_edge, '{"order": 3}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'Organized crime orchestrated the assassination',
        'argument', 'Mafia had motive. Jack Ruby''s mob connections suggest conspiracy to silence Oswald.',
        'credibilityScore', 0.40,
        'authorId', '00000000-0000-0000-0000-000000000004'
    ))
    RETURNING id INTO mafia_involvement_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (main_inquiry_id, mafia_involvement_id, has_position_edge, '{"order": 4}'::jsonb);
    
    -- Link positions to key people
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, oswald_id, related_to_edge, '{"relationshipType": "accuses", "weight": 1.0}'::jsonb),
    (mafia_involvement_id, ruby_id, related_to_edge, '{"relationshipType": "implicates", "weight": 0.7}'::jsonb);

    -- ========================================================================
    -- 6. EVIDENCE
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Zapruder Film',
        'content', '8mm film showing fatal head shot. Some interpret reaction as evidence of frontal shot.',
        'sourceType', 'other',
        'qualityTier', 'high',
        'credibilityScore', 0.95,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO zapruder_film_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, zapruder_film_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'neutral',
        'strength', 0.7,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (conspiracy_id, zapruder_film_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.8,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    )),
    (zapruder_film_id, zapruder_id, related_to_edge, '{"relationshipType": "created_by", "weight": 1.0}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'JFK Autopsy Report',
        'content', 'Concluded two bullets from behind. Controversies include missing brain tissue.',
        'sourceType', 'government_report',
        'qualityTier', 'high',
        'credibilityScore', 0.70,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO autopsy_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, autopsy_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.85,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (conspiracy_id, autopsy_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'refutes',
        'strength', 0.6,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    ));
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Single Bullet (CE 399)',
        'content', 'Nearly pristine bullet. Critics argue too pristine for damage caused.',
        'sourceType', 'other',
        'qualityTier', 'high',
        'credibilityScore', 0.75,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO single_bullet_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, single_bullet_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.9,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (conspiracy_id, single_bullet_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'refutes',
        'strength', 0.85,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    ));
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Dictabelt Acoustic Evidence',
        'content', 'Police recording analyzed by HSCA. Suggested four shots but later disputed.',
        'sourceType', 'other',
        'qualityTier', 'medium',
        'credibilityScore', 0.50,
        'submittedBy', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO acoustic_evidence_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (conspiracy_id, acoustic_evidence_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.65,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    )),
    (lone_gunman_id, acoustic_evidence_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'refutes',
        'strength', 0.7,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    ));

    -- ========================================================================
    -- 7. SUB-INQUIRY: Grassy Knoll
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (inquiry_type_id, jsonb_build_object(
        'title', 'Was there a shooter on the grassy knoll?',
        'description', 'Investigation into eyewitness reports of potential second shooter',
        'status', 'under_review',
        'credibilityScore', 0.55,
        'authorId', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO grassy_knoll_inquiry_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (grassy_knoll_inquiry_id, main_inquiry_id, related_to_edge, '{"relationshipType": "sub_inquiry", "weight": 0.8}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'Yes, evidence supports grassy knoll shooter',
        'argument', 'Witnesses reported shots from grassy knoll. Head snap suggests frontal shot.',
        'credibilityScore', 0.50,
        'authorId', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO grassy_yes_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (grassy_knoll_inquiry_id, grassy_yes_id, has_position_edge, '{"order": 1}'::jsonb);
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (position_type_id, jsonb_build_object(
        'title', 'No, all shots came from behind',
        'argument', 'No physical evidence found. Witness accounts unreliable.',
        'credibilityScore', 0.65,
        'authorId', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO grassy_no_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (grassy_knoll_inquiry_id, grassy_no_id, has_position_edge, '{"order": 2}'::jsonb);

    RAISE NOTICE '========================================';
    RAISE NOTICE 'JFK ASSASSINATION INVESTIGATION SEEDED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Nodes Created:';
    RAISE NOTICE '  - 4 People (JFK, Oswald, Ruby, Zapruder)';
    RAISE NOTICE '  - 1 Place (Dealey Plaza)';
    RAISE NOTICE '  - 1 Event (Assassination)';
    RAISE NOTICE '  - 1 Article (Warren Report)';
    RAISE NOTICE '  - 2 Inquiries (Main + Grassy Knoll)';
    RAISE NOTICE '  - 6 Positions (4 main + 2 sub-inquiry)';
    RAISE NOTICE '  - 4 Evidence items';
    RAISE NOTICE '';
    RAISE NOTICE 'Edges Created: ~30 relationships';
    RAISE NOTICE '  - Event → Place';
    RAISE NOTICE '  - Inquiry → Positions';
    RAISE NOTICE '  - Positions → Evidence';
    RAISE NOTICE '  - Various RELATED_TO connections';
    RAISE NOTICE '========================================';
END $$;