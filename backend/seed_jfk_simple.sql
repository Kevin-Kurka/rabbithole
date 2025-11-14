-- JFK Assassination Graph Seed Data (Simplified)
-- Creates comprehensive graph with Articles, Persons, Places, Events, Things, Facts, and Claims

DO $$
DECLARE
  jfk_graph_id uuid;
  admin_user_id uuid;
  article_type_id uuid;
  person_type_id uuid;
  place_type_id uuid;
  event_type_id uuid;
  thing_type_id uuid;
  fact_type_id uuid;
  claim_type_id uuid;
  references_edge_type_id uuid;
BEGIN
  -- Get system user
  SELECT id INTO admin_user_id FROM public."Users" WHERE email = 'system@rabbithole.app' LIMIT 1;
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'System user not found';
  END IF;

  -- Get NodeType IDs
  SELECT id INTO article_type_id FROM public."NodeTypes" WHERE name = 'Article';
  SELECT id INTO person_type_id FROM public."NodeTypes" WHERE name = 'Person';
  SELECT id INTO place_type_id FROM public."NodeTypes" WHERE name = 'Place';
  SELECT id INTO event_type_id FROM public."NodeTypes" WHERE name = 'Event';
  SELECT id INTO thing_type_id FROM public."NodeTypes" WHERE name = 'Thing';
  SELECT id INTO fact_type_id FROM public."NodeTypes" WHERE name = 'Fact';
  SELECT id INTO claim_type_id FROM public."NodeTypes" WHERE name = 'Claim';

  -- Create or get "references" EdgeType
  SELECT id INTO references_edge_type_id FROM public."EdgeTypes" WHERE name = 'references';
  IF references_edge_type_id IS NULL THEN
    INSERT INTO public."EdgeTypes" (name, props, meta)
    VALUES ('references', '{"description": "Article references a node"}', '{}')
    RETURNING id INTO references_edge_type_id;
  END IF;

  -- Create JFK graph (Level 1 = working graph, editable)
  INSERT INTO public."Graphs" (name, description, level, privacy, created_by, created_at, updated_at)
  VALUES (
    'JFK Assassination Investigation',
    'Comprehensive investigation into the assassination of President John F. Kennedy on November 22, 1963',
    1,
    'public',
    admin_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO jfk_graph_id;

  -- PERSONS
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('10000000-0000-0000-0000-000000000001', jfk_graph_id, person_type_id, 'John F. Kennedy',
     '{"role": "35th President of the United States", "born": "1917-05-29", "died": "1963-11-22"}', 1.0, admin_user_id, admin_user_id, NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', jfk_graph_id, person_type_id, 'Lee Harvey Oswald',
     '{"role": "Alleged assassin", "born": "1939-10-18", "died": "1963-11-24"}', 0.95, admin_user_id, admin_user_id, NOW(), NOW());

  -- PLACES
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('20000000-0000-0000-0000-000000000001', jfk_graph_id, place_type_id, 'Dealey Plaza',
     '{"location": "Dallas, Texas", "coordinates": "32.7787,-96.8089"}', 1.0, admin_user_id, admin_user_id, NOW(), NOW());

  -- EVENTS
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('30000000-0000-0000-0000-000000000001', jfk_graph_id, event_type_id, 'Assassination of JFK',
     '{"date": "1963-11-22", "time": "12:30 PM CST", "location": "Dealey Plaza, Dallas, Texas"}', 1.0, admin_user_id, admin_user_id, NOW(), NOW());

  -- THINGS
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('40000000-0000-0000-0000-000000000001', jfk_graph_id, thing_type_id, 'Warren Commission Report',
     '{"type": "Official Investigation Report", "published": "1964-09-27", "pages": 888}', 1.0, admin_user_id, admin_user_id, NOW(), NOW());

  -- FACTS
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('50000000-0000-0000-0000-000000000001', jfk_graph_id, fact_type_id, 'Three shots fired',
     '{"evidence": "Witness testimony, acoustic analysis", "verified": true}', 0.95, admin_user_id, admin_user_id, NOW(), NOW());

  -- CLAIMS
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, props, weight, author_id, created_by, created_at, updated_at)
  VALUES
    ('60000000-0000-0000-0000-000000000001', jfk_graph_id, claim_type_id, 'Second shooter theory',
     '{"disputed": true, "basis": "Witness reports of grassy knoll shots"}', 0.40, admin_user_id, admin_user_id, NOW(), NOW());

  -- ARTICLE 1: Warren Commission
  INSERT INTO public."Nodes" (id, graph_id, node_type_id, title, narrative, weight, author_id, published_at, created_by, created_at, updated_at)
  VALUES (
    '80000000-0000-0000-0000-000000000001',
    jfk_graph_id,
    article_type_id,
    'The Warren Commission: Official Account',
    '# The Warren Commission Report

## Overview

On September 27, 1964, the Warren Commission released its 888-page report concluding that President John F. Kennedy was assassinated by Lee Harvey Oswald acting alone.

## Key Findings

- Lee Harvey Oswald fired three shots from the Texas School Book Depository
- No evidence of conspiracy was found
- Jack Ruby acted alone in killing Oswald

## Legacy

Despite the conclusions, many Americans continue to question the findings and believe in conspiracy theories.',
    0.85,
    admin_user_id,
    NOW(),
    admin_user_id,
    NOW(),
    NOW()
  );

  -- Create edges from article to nodes
  INSERT INTO public."Edges" (graph_id, edge_type_id, source_node_id, target_node_id, weight, created_by, created_at, updated_at)
  VALUES
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW(), NOW()),
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0.95, admin_user_id, NOW(), NOW()),
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1.0, admin_user_id, NOW(), NOW()),
    (jfk_graph_id, references_edge_type_id, '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 0.95, admin_user_id, NOW(), NOW());

  RAISE NOTICE 'JFK Graph Seed Data Complete! Graph ID: %', jfk_graph_id;
END $$;

SELECT 'Nodes created: ' || COUNT(*) FROM public."Nodes" WHERE graph_id IN (SELECT id FROM public."Graphs" WHERE name = 'JFK Assassination Investigation');
SELECT 'Edges created: ' || COUNT(*) FROM public."Edges" WHERE graph_id IN (SELECT id FROM public."Graphs" WHERE name = 'JFK Assassination Investigation');
