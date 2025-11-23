-- ============================================================================
-- Migration Rollback: 021_system_edge_types
-- Description: Remove all system edge types created in 021_system_edge_types.up.sql
-- Date: 2025-11-23
-- ============================================================================

-- Delete all edge types (reverse order of creation)
DELETE FROM public."EdgeTypes" WHERE name = 'NEUTRAL_EVIDENCE';
DELETE FROM public."EdgeTypes" WHERE name = 'REFUTES';
DELETE FROM public."EdgeTypes" WHERE name = 'SUPPORTS';
DELETE FROM public."EdgeTypes" WHERE name = 'CAST_BY';
DELETE FROM public."EdgeTypes" WHERE name = 'VOTES_ON';
DELETE FROM public."EdgeTypes" WHERE name = 'NOTIFIES_USER';
DELETE FROM public."EdgeTypes" WHERE name = 'NOTIFIES_ABOUT';
DELETE FROM public."EdgeTypes" WHERE name = 'SUGGESTS';
DELETE FROM public."EdgeTypes" WHERE name = 'REFERENCES_IN_CONVERSATION';
DELETE FROM public."EdgeTypes" WHERE name = 'HAS_MESSAGE';
DELETE FROM public."EdgeTypes" WHERE name = 'EARNS_POINTS';
DELETE FROM public."EdgeTypes" WHERE name = 'UNLOCKS';
DELETE FROM public."EdgeTypes" WHERE name = 'BELONGS_TO_SCENE';
DELETE FROM public."EdgeTypes" WHERE name = 'EXTRACTS_FRAME';
DELETE FROM public."EdgeTypes" WHERE name = 'EXTRACTS_SECTION';
DELETE FROM public."EdgeTypes" WHERE name = 'PROCESSES_FILE';
DELETE FROM public."EdgeTypes" WHERE name = 'AUDITS';
DELETE FROM public."EdgeTypes" WHERE name = 'CURATES';
DELETE FROM public."EdgeTypes" WHERE name = 'APPLIES_FOR';
DELETE FROM public."EdgeTypes" WHERE name = 'HAS_CURATOR_ROLE';
DELETE FROM public."EdgeTypes" WHERE name = 'VIEWING';
DELETE FROM public."EdgeTypes" WHERE name = 'INVITES_TO';
DELETE FROM public."EdgeTypes" WHERE name = 'LIKES';
DELETE FROM public."EdgeTypes" WHERE name = 'MENTIONS_NODE';
DELETE FROM public."EdgeTypes" WHERE name = 'SHARES';
DELETE FROM public."EdgeTypes" WHERE name = 'REPLIES_TO';
DELETE FROM public."EdgeTypes" WHERE name = 'POSTED_ON';
DELETE FROM public."EdgeTypes" WHERE name = 'EXTRACTS_CLAIM';
DELETE FROM public."EdgeTypes" WHERE name = 'INVESTIGATES';
DELETE FROM public."EdgeTypes" WHERE name = 'ATTACHES_FILE';
DELETE FROM public."EdgeTypes" WHERE name = 'CHALLENGES';
