-- ============================================================================
-- JFK ASSASSINATION - EXPANDED DEMO DATA
-- ============================================================================
-- Adds more evidence, people, organizations, and sub-inquiries
-- ============================================================================

DO $$
DECLARE
    -- Node type IDs
    person_type_id UUID;
    organization_type_id UUID;
    article_type_id UUID;
    inquiry_type_id UUID;
    position_type_id UUID;
    evidence_type_id UUID;
    place_type_id UUID;
    
    -- Edge type IDs
    has_position_edge UUID;
    cites_evidence_edge UUID;
    related_to_edge UUID;
    
    -- New node IDs
    connally_id UUID;
    jackie_id UUID;
    secret_service_id UUID;
    warren_commission_id UUID;
    hsca_id UUID;
    fbi_id UUID;
    
    -- New evidence IDs
    ballistic_report_id UUID;
    witness_testimony_id UUID;
    parkland_doctors_id UUID;
    rifle_evidence_id UUID;
    
    -- New inquiry IDs
    ruby_inquiry_id UUID;
    second_shooter_inquiry_id UUID;
    oswald_motive_inquiry_id UUID;
    
    -- Existing IDs (for linking)
    main_inquiry_id UUID;
    lone_gunman_id UUID;
    conspiracy_id UUID;
    cia_involvement_id UUID;
    mafia_involvement_id UUID;
    oswald_id UUID;
    ruby_id UUID;
    
BEGIN
    -- Get type IDs
    SELECT id INTO person_type_id FROM node_types WHERE name = 'Person';
    SELECT id INTO organization_type_id FROM node_types WHERE name = 'Organization';
    SELECT id INTO article_type_id FROM node_types WHERE name = 'Article';
    SELECT id INTO inquiry_type_id FROM node_types WHERE name = 'Inquiry';
    SELECT id INTO position_type_id FROM node_types WHERE name = 'Position';
    SELECT id INTO evidence_type_id FROM node_types WHERE name = 'Evidence';
    SELECT id INTO place_type_id FROM node_types WHERE name = 'Place';
    
    SELECT id INTO has_position_edge FROM edge_types WHERE name = 'HAS_POSITION';
    SELECT id INTO cites_evidence_edge FROM edge_types WHERE name = 'CITES_EVIDENCE';
    SELECT id INTO related_to_edge FROM edge_types WHERE name = 'RELATED_TO';
    
    -- Get existing node IDs
    SELECT id INTO main_inquiry_id FROM nodes WHERE props->>'title' LIKE '%responsible%' LIMIT 1;
    SELECT id INTO oswald_id FROM nodes WHERE props->>'familyName' = 'Oswald' LIMIT 1;
    SELECT id INTO ruby_id FROM nodes WHERE props->>'familyName' = 'Ruby' LIMIT 1;
    
    SELECT id INTO lone_gunman_id FROM nodes 
    WHERE node_type_id = position_type_id AND props->>'title' LIKE '%alone%' LIMIT 1;
    
    SELECT id INTO conspiracy_id FROM nodes 
    WHERE node_type_id = position_type_id AND props->>'title' LIKE '%Multiple%' LIMIT 1;
    
    SELECT id INTO cia_involvement_id FROM nodes 
    WHERE node_type_id = position_type_id AND props->>'title' LIKE '%CIA%' LIMIT 1;
    
    SELECT id INTO mafia_involvement_id FROM nodes 
    WHERE node_type_id = position_type_id AND props->>'title' LIKE '%crime%' LIMIT 1;

    -- ========================================================================
    -- 1. ADD MORE PEOPLE
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'John',
        'familyName', 'Connally',
        'birthDate', '1917-02-27',
        'deathDate', '1993-06-15',
        'nationality', 'American',
        'jobTitle', 'Governor of Texas',
        'description', 'Wounded in the assassination, key to single bullet theory'
    ))
    RETURNING id INTO connally_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'Jacqueline',
        'familyName', 'Kennedy',
        'additionalName', 'Lee Bouvier',
        'birthDate', '1929-07-28',
        'deathDate', '1994-05-19',
        'nationality', 'American',
        'jobTitle', 'First Lady of the United States',
        'description', 'Present during assassination, key witness'
    ))
    RETURNING id INTO jackie_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (person_type_id, jsonb_build_object(
        'givenName', 'Clint',
        'familyName', 'Hill',
        'birthDate', '1932-01-04',
        'nationality', 'American',
        'jobTitle', 'Secret Service Agent',
        'description', 'Jackie Kennedy''s Secret Service agent, jumped on car after shooting'
    ))
    RETURNING id INTO secret_service_id;

    -- ========================================================================
    -- 2. ADD ORGANIZATIONS
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (organization_type_id, jsonb_build_object(
        'name', 'Warren Commission',
        'legalName', 'President''s Commission on the Assassination of President Kennedy',
        'foundingDate', '1963-11-29',
        'dissolutionDate', '1964-09-27',
        'description', 'Presidential commission that concluded Oswald acted alone'
    ))
    RETURNING id INTO warren_commission_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (organization_type_id, jsonb_build_object(
        'name', 'House Select Committee on Assassinations',
        'legalName', 'HSCA',
        'foundingDate', '1976-09-17',
        'dissolutionDate', '1979-01-02',
        'description', 'Congressional committee that concluded probable conspiracy'
    ))
    RETURNING id INTO hsca_id;
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (organization_type_id, jsonb_build_object(
        'name', 'Federal Bureau of Investigation',
        'legalName', 'FBI',
        'foundingDate', '1908-07-26',
        'description', 'Investigated assassination and Oswald''s background'
    ))
    RETURNING id INTO fbi_id;

    -- ========================================================================
    -- 3. ADD MORE EVIDENCE
    -- ========================================================================
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'FBI Ballistic Report',
        'content', 'FBI analysis matched bullet fragments to Oswald\'s rifle. Three cartridge cases found at sixth floor window.',
        'sourceType', 'government_report',
        'qualityTier', 'high',
        'credibilityScore', 0.85,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO ballistic_report_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, ballistic_report_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.95,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (conspiracy_id, ballistic_report_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'neutral',
        'strength', 0.5,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    ));
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Witness Testimony - Howard Brennan',
        'content', 'Identified Oswald as shooter from sixth floor window. Later recanted positive identification.',
        'sourceType', 'other',
        'qualityTier', 'medium',
        'credibilityScore', 0.55,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO witness_testimony_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, witness_testimony_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.6,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (conspiracy_id, witness_testimony_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'refutes',
        'strength', 0.7,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    ));
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Parkland Hospital Doctors Observations',
        'content', 'Doctors described large exit wound in back of head, suggesting frontal shot. Conflicts with official autopsy.',
        'sourceType', 'other',
        'qualityTier', 'high',
        'credibilityScore', 0.75,
        'submittedBy', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO parkland_doctors_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (conspiracy_id, parkland_doctors_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.8,
        'addedBy', '00000000-0000-0000-0000-000000000002'
    )),
    (lone_gunman_id, parkland_doctors_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'refutes',
        'strength', 0.75,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    ));
    
    INSERT INTO nodes (node_type_id, props) VALUES
    (evidence_type_id, jsonb_build_object(
        'title', 'Mannlicher-Carcano Rifle',
        'content', 'Italian military rifle found on sixth floor, traced to Oswald through mail order. Questions about firing speed and accuracy.',
        'sourceType', 'other',
        'qualityTier', 'high',
        'credibilityScore', 0.90,
        'submittedBy', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO rifle_evidence_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (lone_gunman_id, rifle_evidence_id, cites_evidence_edge, jsonb_build_object(
        'relevance', 'supports',
        'strength', 0.95,
        'addedBy', '00000000-0000-0000-0000-000000000001'
    )),
    (rifle_evidence_id, oswald_id, related_to_edge, '{"relationshipType": "owned_by", "weight": 0.95}'::jsonb);

    -- ========================================================================
    -- 4. ADD SUB-INQUIRIES
    -- ========================================================================
    
    -- Sub-inquiry: Did Jack Ruby act alone?
    INSERT INTO nodes (node_type_id, props) VALUES
    (inquiry_type_id, jsonb_build_object(
        'title', 'Did Jack Ruby act alone in killing Oswald?',
        'description', 'Investigation into Ruby\'s motive and possible connections to organized crime',
        'status', 'under_review',
        'credibilityScore', 0.60,
        'authorId', '00000000-0000-0000-0000-000000000003'
    ))
    RETURNING id INTO ruby_inquiry_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (ruby_inquiry_id, main_inquiry_id, related_to_edge, '{"relationshipType": "sub_inquiry", "weight": 0.7}'::jsonb);
    
    DECLARE
        ruby_alone_id UUID;
        ruby_silencer_id UUID;
    BEGIN
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Ruby acted out of grief and anger',
            'argument', 'Ruby was distraught over Kennedy\'s death and acted impulsively to spare Jackie the ordeal of a trial.',
            'credibilityScore', 0.55,
            'authorId', '00000000-0000-0000-0000-000000000001'
        ))
        RETURNING id INTO ruby_alone_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (ruby_inquiry_id, ruby_alone_id, has_position_edge, '{"order": 1}'::jsonb);
        
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Ruby was ordered to silence Oswald',
            'argument', 'Ruby\'s mob connections and convenient timing suggest he was sent to prevent Oswald from revealing conspiracy details.',
            'credibilityScore', 0.45,
            'authorId', '00000000-0000-0000-0000-000000000003'
        ))
        RETURNING id INTO ruby_silencer_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (ruby_inquiry_id, ruby_silencer_id, has_position_edge, '{"order": 2}'::jsonb),
        (ruby_silencer_id, ruby_id, related_to_edge, '{"relationshipType": "accuses", "weight": 0.8}'::jsonb);
    END;
    
    -- Sub-inquiry: Was there a second shooter?
    INSERT INTO nodes (node_type_id, props) VALUES
    (inquiry_type_id, jsonb_build_object(
        'title', 'Was there a second shooter?',
        'description', 'Analysis of ballistic, acoustic, and eyewitness evidence for multiple shooters',
        'status', 'under_review',
        'credibilityScore', 0.50,
        'authorId', '00000000-0000-0000-0000-000000000002'
    ))
    RETURNING id INTO second_shooter_inquiry_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (second_shooter_inquiry_id, main_inquiry_id, related_to_edge, '{"relationshipType": "sub_inquiry", "weight": 0.9}'::jsonb);
    
    DECLARE
        second_yes_id UUID;
        second_no_id UUID;
    BEGIN
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Yes, evidence suggests second shooter',
            'argument', 'Acoustic evidence, witness testimony, and head snap in Zapruder film all suggest additional shooter.',
            'credibilityScore', 0.50,
            'authorId', '00000000-0000-0000-0000-000000000002'
        ))
        RETURNING id INTO second_yes_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (second_shooter_inquiry_id, second_yes_id, has_position_edge, '{"order": 1}'::jsonb);
        
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'No, all shots from Oswald',
            'argument', 'Ballistic evidence and trajectory analysis confirm all shots came from Book Depository.',
            'credibilityScore', 0.70,
            'authorId', '00000000-0000-0000-0000-000000000001'
        ))
        RETURNING id INTO second_no_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (second_shooter_inquiry_id, second_no_id, has_position_edge, '{"order": 2}'::jsonb);
    END;
    
    -- Sub-inquiry: What was Oswald's motive?
    INSERT INTO nodes (node_type_id, props) VALUES
    (inquiry_type_id, jsonb_build_object(
        'title', 'What was Lee Harvey Oswald\'s motive?',
        'description', 'Investigation into Oswald\'s political beliefs, mental state, and possible motivations',
        'status', 'under_review',
        'credibilityScore', 0.65,
        'authorId', '00000000-0000-0000-0000-000000000001'
    ))
    RETURNING id INTO oswald_motive_inquiry_id;
    
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (oswald_motive_inquiry_id, main_inquiry_id, related_to_edge, '{"relationshipType": "sub_inquiry", "weight": 0.8}'::jsonb);
    
    DECLARE
        political_motive_id UUID;
        patsy_id UUID;
        mental_illness_id UUID;
    BEGIN
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Political ideology - Marxist beliefs',
            'argument', 'Oswald\'s communist sympathies and defection to USSR suggest political motivation.',
            'credibilityScore', 0.60,
            'authorId', '00000000-0000-0000-0000-000000000001'
        ))
        RETURNING id INTO political_motive_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (oswald_motive_inquiry_id, political_motive_id, has_position_edge, '{"order": 1}'::jsonb);
        
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Oswald was a patsy (no motive)',
            'argument', 'Oswald was framed and had no personal motive. His statement "I\'m just a patsy" suggests he was set up.',
            'credibilityScore', 0.40,
            'authorId', '00000000-0000-0000-0000-000000000003'
        ))
        RETURNING id INTO patsy_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (oswald_motive_inquiry_id, patsy_id, has_position_edge, '{"order": 2}'::jsonb);
        
        INSERT INTO nodes (node_type_id, props) VALUES
        (position_type_id, jsonb_build_object(
            'title', 'Desire for notoriety',
            'argument', 'Oswald sought fame and recognition. Assassination was attempt to achieve historical significance.',
            'credibilityScore', 0.55,
            'authorId', '00000000-0000-0000-0000-000000000001'
        ))
        RETURNING id INTO mental_illness_id;
        
        INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
        (oswald_motive_inquiry_id, mental_illness_id, has_position_edge, '{"order": 3}'::jsonb);
    END;

    -- Link people to organizations
    INSERT INTO edges (source_node_id, target_node_id, edge_type_id, props) VALUES
    (connally_id, warren_commission_id, related_to_edge, '{"relationshipType": "testified_to", "weight": 0.9}'::jsonb),
    (jackie_id, warren_commission_id, related_to_edge, '{"relationshipType": "testified_to", "weight": 0.9}'::jsonb);

    RAISE NOTICE '========================================';
    RAISE NOTICE 'EXPANDED JFK DATA SEEDED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added:';
    RAISE NOTICE '  - 3 More People (Connally, Jackie, Secret Service)';
    RAISE NOTICE '  - 3 Organizations (Warren Commission, HSCA, FBI)';
    RAISE NOTICE '  - 4 More Evidence items (ballistics, witnesses, doctors, rifle)';
    RAISE NOTICE '  - 3 Sub-Inquiries (Ruby, Second Shooter, Oswald Motive)';
    RAISE NOTICE '  - 8 Additional Positions';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Demo Data Now:';
    RAISE NOTICE '  - ~30 Nodes';
    RAISE NOTICE '  - ~60 Edges';
    RAISE NOTICE '  - 5 Inquiries (1 main + 4 sub)';
    RAISE NOTICE '  - 14 Positions';
    RAISE NOTICE '  - 8 Evidence items';
    RAISE NOTICE '========================================';
END $$;