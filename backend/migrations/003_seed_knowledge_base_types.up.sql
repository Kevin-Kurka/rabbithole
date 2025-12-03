-- ============================================================================
-- KNOWLEDGE BASE TYPES: Schema.org aligned types for the knowledge graph
-- Based on https://schema.org core vocabulary
-- ============================================================================

-- ============================================================================
-- 1. CREATIVE WORK HIERARCHY (Articles, Documents, Media)
-- ============================================================================

-- Base CreativeWork type (schema.org/CreativeWork)
INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('CreativeWork',
    NULL,
    '{
        "description": "The most generic kind of creative work, including books, movies, photographs, software programs, etc.",
        "schema_org_url": "https://schema.org/CreativeWork",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 500},
            "description": {"type": "string", "maxLength": 5000},
            "author": {"type": "string", "maxLength": 200},
            "datePublished": {"type": "string", "format": "date"},
            "url": {"type": "string", "format": "uri"},
            "inLanguage": {"type": "string", "maxLength": 10, "default": "en"}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('Article',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    '{
        "description": "An article, such as a news article or piece of investigative report",
        "schema_org_url": "https://schema.org/Article",
        "fields": {
            "headline": {"type": "string", "required": true, "maxLength": 500},
            "articleBody": {"type": "string", "required": true},
            "wordCount": {"type": "number", "min": 0},
            "dateModified": {"type": "string", "format": "date"}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('MediaObject',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    '{
        "description": "A media object, such as an image, video, or audio object",
        "schema_org_url": "https://schema.org/MediaObject",
        "fields": {
            "contentUrl": {"type": "string", "required": true, "format": "uri"},
            "encodingFormat": {"type": "string", "maxLength": 100},
            "contentSize": {"type": "string", "maxLength": 50},
            "uploadDate": {"type": "string", "format": "date"}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('ImageObject',
    (SELECT id FROM node_types WHERE name = 'MediaObject'),
    '{
        "description": "An image file",
        "schema_org_url": "https://schema.org/ImageObject",
        "fields": {
            "caption": {"type": "string", "maxLength": 500},
            "exifData": {"type": "object"},
            "width": {"type": "number"},
            "height": {"type": "number"}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('VideoObject',
    (SELECT id FROM node_types WHERE name = 'MediaObject'),
    '{
        "description": "A video file",
        "schema_org_url": "https://schema.org/VideoObject",
        "fields": {
            "duration": {"type": "string", "maxLength": 20},
            "transcript": {"type": "string"},
            "videoQuality": {"type": "string", "maxLength": 20}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. PERSON HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Person',
    NULL,
    '{
        "description": "A person (alive, dead, undead, or fictional)",
        "schema_org_url": "https://schema.org/Person",
        "fields": {
            "givenName": {"type": "string", "required": true, "maxLength": 100},
            "familyName": {"type": "string", "maxLength": 100},
            "additionalName": {"type": "string", "maxLength": 100},
            "honorificPrefix": {"type": "string", "maxLength": 50},
            "honorificSuffix": {"type": "string", "maxLength": 50},
            "birthDate": {"type": "string", "format": "date"},
            "deathDate": {"type": "string", "format": "date"},
            "nationality": {"type": "string", "maxLength": 100},
            "jobTitle": {"type": "string", "maxLength": 200},
            "description": {"type": "string", "maxLength": 2000}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. ORGANIZATION HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Organization',
    NULL,
    '{
        "description": "An organization such as a school, NGO, corporation, club, etc.",
        "schema_org_url": "https://schema.org/Organization",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 200},
            "legalName": {"type": "string", "maxLength": 200},
            "description": {"type": "string", "maxLength": 2000},
            "foundingDate": {"type": "string", "format": "date"},
            "dissolutionDate": {"type": "string", "format": "date"},
            "url": {"type": "string", "format": "uri"},
            "email": {"type": "string", "format": "email"},
            "telephone": {"type": "string", "maxLength": 50}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('Corporation',
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "A business corporation",
        "schema_org_url": "https://schema.org/Corporation",
        "fields": {
            "tickerSymbol": {"type": "string", "maxLength": 10},
            "numberOfEmployees": {"type": "number", "min": 0}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('EducationalOrganization',
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "An educational organization",
        "schema_org_url": "https://schema.org/EducationalOrganization",
        "fields": {
            "alumni": {"type": "array", "items": {"type": "string"}}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('GovernmentOrganization',
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "A governmental organization or agency",
        "schema_org_url": "https://schema.org/GovernmentOrganization",
        "fields": {
            "jurisdiction": {"type": "string", "maxLength": 200}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. PLACE HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Place',
    NULL,
    '{
        "description": "Entities that have a somewhat fixed, physical extension",
        "schema_org_url": "https://schema.org/Place",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 200},
            "description": {"type": "string", "maxLength": 2000},
            "address": {"type": "string", "maxLength": 500},
            "latitude": {"type": "number", "min": -90, "max": 90},
            "longitude": {"type": "number", "min": -180, "max": 180},
            "url": {"type": "string", "format": "uri"}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('Country',
    (SELECT id FROM node_types WHERE name = 'Place'),
    '{
        "description": "A country",
        "schema_org_url": "https://schema.org/Country",
        "fields": {
            "iso3166Code": {"type": "string", "maxLength": 3}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('City',
    (SELECT id FROM node_types WHERE name = 'Place'),
    '{
        "description": "A city or town",
        "schema_org_url": "https://schema.org/City",
        "fields": {
            "population": {"type": "number", "min": 0}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. EVENT HIERARCHY
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Event',
    NULL,
    '{
        "description": "An event happening at a certain time and location",
        "schema_org_url": "https://schema.org/Event",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 200},
            "description": {"type": "string", "maxLength": 2000},
            "startDate": {"type": "string", "required": true, "format": "date"},
            "endDate": {"type": "string", "format": "date"},
            "location": {"type": "string", "maxLength": 200},
            "eventStatus": {"type": "enum", "values": ["scheduled", "cancelled", "postponed", "rescheduled"]}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('PublicationEvent',
    (SELECT id FROM node_types WHERE name = 'Event'),
    '{
        "description": "A PublicationEvent corresponds to the publication of a CreativeWork",
        "schema_org_url": "https://schema.org/PublicationEvent",
        "fields": {
            "publishedBy": {"type": "string", "maxLength": 200}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. THING (Generic Entities)
-- ============================================================================

INSERT INTO node_types (name, parent_node_type_id, props, meta) VALUES
('Thing',
    NULL,
    '{
        "description": "The most generic type of item",
        "schema_org_url": "https://schema.org/Thing",
        "fields": {
            "name": {"type": "string", "required": true, "maxLength": 200},
            "description": {"type": "string", "maxLength": 2000},
            "url": {"type": "string", "format": "uri"},
            "image": {"type": "string", "format": "uri"},
            "identifier": {"type": "string", "maxLength": 200}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('Product',
    (SELECT id FROM node_types WHERE name = 'Thing'),
    '{
        "description": "Any offered product or service",
        "schema_org_url": "https://schema.org/Product",
        "fields": {
            "brand": {"type": "string", "maxLength": 100},
            "model": {"type": "string", "maxLength": 100},
            "manufacturer": {"type": "string", "maxLength": 200}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- KNOWLEDGE BASE EDGE TYPES (Schema.org Properties)
-- ============================================================================

INSERT INTO edge_types (name, source_node_type_id, target_node_type_id, props, meta) VALUES
('author',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    (SELECT id FROM node_types WHERE name = 'Person'),
    '{
        "description": "The author of this content",
        "schema_org_url": "https://schema.org/author",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('publisher',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "The publisher of the creative work",
        "schema_org_url": "https://schema.org/publisher",
        "cardinality": "many-to-one"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('about',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    NULL,
    '{
        "description": "The subject matter of the content",
        "schema_org_url": "https://schema.org/about",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('mentions',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    NULL,
    '{
        "description": "Indicates that the CreativeWork contains a reference to, but is not necessarily about a concept",
        "schema_org_url": "https://schema.org/mentions",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('worksFor',
    (SELECT id FROM node_types WHERE name = 'Person'),
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "Organizations that the person works for",
        "schema_org_url": "https://schema.org/worksFor",
        "cardinality": "many-to-many",
        "fields": {
            "startDate": {"type": "string", "format": "date"},
            "endDate": {"type": "string", "format": "date"},
            "jobTitle": {"type": "string", "maxLength": 200}
        }
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('memberOf',
    (SELECT id FROM node_types WHERE name = 'Person'),
    (SELECT id FROM node_types WHERE name = 'Organization'),
    '{
        "description": "An Organization to which this Person belongs",
        "schema_org_url": "https://schema.org/memberOf",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('location',
    (SELECT id FROM node_types WHERE name = 'Event'),
    (SELECT id FROM node_types WHERE name = 'Place'),
    '{
        "description": "The location of the event",
        "schema_org_url": "https://schema.org/location",
        "cardinality": "many-to-one"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('attendee',
    (SELECT id FROM node_types WHERE name = 'Event'),
    (SELECT id FROM node_types WHERE name = 'Person'),
    '{
        "description": "A person attending the event",
        "schema_org_url": "https://schema.org/attendee",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('organizer',
    (SELECT id FROM node_types WHERE name = 'Event'),
    NULL,
    '{
        "description": "An organizer of an Event",
        "schema_org_url": "https://schema.org/organizer",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('containedInPlace',
    (SELECT id FROM node_types WHERE name = 'Place'),
    (SELECT id FROM node_types WHERE name = 'Place'),
    '{
        "description": "The basic containment relation between a place and another that it contains",
        "schema_org_url": "https://schema.org/containedInPlace",
        "cardinality": "many-to-one"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
),
('citation',
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    (SELECT id FROM node_types WHERE name = 'CreativeWork'),
    '{
        "description": "A citation or reference to another creative work",
        "schema_org_url": "https://schema.org/citation",
        "cardinality": "many-to-many"
    }'::jsonb,
    '{"schema_org": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;