-- Remove 'verdict' field from Inquiry Node Type
-- We are using 'aiDetermination' (provided by LogicLens) instead of a manual verdict.
UPDATE node_types 
SET props = props #- '{fields,verdict}'
WHERE name = 'Inquiry';