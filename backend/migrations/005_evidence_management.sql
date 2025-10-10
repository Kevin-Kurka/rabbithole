-- ============================================================================
-- Migration 005: Evidence Management System (Phase 2)
-- ============================================================================
-- Description: Extends Evidence system with file storage, rich metadata,
--              community reviews, and full-text search capabilities.
--              Supports multiple evidence types with scalable storage.
--
-- Author: Database Architecture Team
-- Date: 2025-10-09
-- Dependencies: 003_veracity_system.sql (Evidence, Sources tables)
-- ============================================================================

-- ============================================================================
-- ER DIAGRAM (ASCII)
-- ============================================================================
--
--  ┌─────────────────┐
--  │    Evidence     │  (from 003_veracity_system.sql)
--  │  ─────────────  │
--  │  + id           │
--  │  + source_id    │◄──────┐
--  │  + content      │       │
--  └─────────────────┘       │
--         │                  │
--         │ has              │
--         │                  │
--         ▼                  │
--  ┌────────────────────────┐│
--  │   EvidenceFiles        ││
--  │  ────────────────────  ││
--  │  + evidence_id (FK)    ││
--  │  + file_type           ││
--  │  + storage_provider    ││
--  │  + storage_key (S3)    ││
--  │  + file_hash (SHA256)  ││
--  │  + file_size           ││
--  │  + mime_type           ││
--  │  + original_filename   ││
--  │  + thumbnail_key       ││
--  └────────────────────────┘│
--         │                  │
--         │ attached to      │
--         │                  │
--         ▼                  │
--  ┌────────────────────────┐│
--  │ EvidenceAttachments    ││
--  │  ────────────────────  ││
--  │  + evidence_id         ││
--  │  + target_node_id      ││
--  │  + target_edge_id      ││
--  │  + attached_by         ││
--  │  + relevance_note      ││
--  └────────────────────────┘│
--         │                  │
--         │ has metadata     │
--         │                  │
--         ▼                  │
--  ┌────────────────────────┐│
--  │  EvidenceMetadata      ││
--  │  ────────────────────  ││
--  │  + evidence_id (FK)    ││
--  │  + authors             ││
--  │  + publication_date    ││
--  │  + context             ││
--  │  + methodology         ││
--  │  + sample_size         ││
--  │  + keywords            ││
--  │  + language            ││
--  │  + geolocation         ││
--  └────────────────────────┘│
--         │                  │
--         │ reviewed by      │
--         │                  │
--         ▼                  │
--  ┌────────────────────────┐│
--  │   EvidenceReviews      ││
--  │  ────────────────────  ││
--  │  + evidence_id (FK)    ││
--  │  + reviewer_id (FK)    ││
--  │  + quality_score       ││
--  │  + credibility_score   ││
--  │  + relevance_score     ││
--  │  + review_text         ││
--  │  + flags               ││
--  └────────────────────────┘│
--         │                  │
--         │ tracked by       │
--         │                  │
--         ▼                  │
--  ┌────────────────────────┐│
--  │ EvidenceAuditLog       ││
--  │  ────────────────────  ││
--  │  + evidence_id (FK)    ││
--  │  + action              ││
--  │  + actor_id            ││
--  │  + changes             ││
--  │  + ip_address          ││
--  │  + user_agent          ││
--  └────────────────────────┘│
--                            │
--                            │
--  ┌─────────────────┐       │
--  │     Sources     │───────┘
--  │  ─────────────  │
--  │  + id           │
--  │  + title        │
--  │  + authors      │
--  └─────────────────┘
--
-- ============================================================================

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

-- Evidence type categories (extends beyond basic document types)
CREATE TYPE evidence_file_type AS ENUM (
    'document',        -- PDF, Word, text files
    'image',          -- PNG, JPEG, GIF, etc.
    'video',          -- MP4, WebM, etc.
    'audio',          -- MP3, WAV, etc.
    'link',           -- URL reference (no file)
    'citation',       -- Academic citation (no file)
    'dataset',        -- CSV, JSON, structured data
    'archive',        -- ZIP, TAR, etc.
    'presentation',   -- PowerPoint, slides
    'spreadsheet',    -- Excel, Google Sheets
    'code',           -- Source code files
    'other'
);

-- Storage providers for multi-cloud support
CREATE TYPE storage_provider AS ENUM (
    'local',          -- Local filesystem (dev/testing)
    's3',             -- AWS S3
    'gcs',            -- Google Cloud Storage
    'azure',          -- Azure Blob Storage
    'cloudflare_r2',  -- Cloudflare R2
    'cdn'             -- CDN for public assets
);

-- Review quality flags
CREATE TYPE evidence_quality_flag AS ENUM (
    'high_quality',
    'needs_verification',
    'outdated',
    'biased',
    'incomplete',
    'duplicate',
    'misleading',
    'fraudulent',
    'copyright_concern'
);

-- Audit action types
CREATE TYPE evidence_audit_action AS ENUM (
    'created',
    'updated',
    'deleted',
    'file_uploaded',
    'file_deleted',
    'metadata_updated',
    'attached',
    'detached',
    'reviewed',
    'flagged',
    'verified',
    'quarantined'
);

-- ============================================================================
-- TABLE: EvidenceFiles
-- ============================================================================
-- Manages file storage for evidence with support for multiple providers,
-- deduplication, thumbnails, and versioning.

CREATE TABLE IF NOT EXISTS public."EvidenceFiles" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Evidence reference (one evidence can have multiple files/versions)
    evidence_id uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- File classification
    file_type evidence_file_type NOT NULL,
    is_primary BOOLEAN DEFAULT true,  -- Primary file for this evidence
    version INTEGER DEFAULT 1 CHECK (version > 0),

    -- Storage information
    storage_provider storage_provider NOT NULL DEFAULT 'local',
    storage_key TEXT NOT NULL,  -- S3 key, filesystem path, etc.
    storage_bucket TEXT,        -- S3 bucket, GCS bucket, etc.
    storage_region TEXT,        -- AWS region, etc.
    cdn_url TEXT,               -- Public CDN URL if available

    -- File integrity and deduplication
    file_hash TEXT NOT NULL,    -- SHA256 hash for deduplication
    hash_algorithm TEXT DEFAULT 'sha256',
    file_size BIGINT NOT NULL CHECK (file_size >= 0),  -- bytes

    -- File metadata
    mime_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_extension TEXT,
    encoding TEXT,              -- UTF-8, ASCII, etc.

    -- Media-specific metadata
    duration_seconds INTEGER,   -- For video/audio
    dimensions JSONB,           -- {"width": 1920, "height": 1080} for images/video

    -- Thumbnail/preview
    thumbnail_storage_key TEXT,
    thumbnail_cdn_url TEXT,
    has_preview BOOLEAN DEFAULT false,

    -- Processing status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'quarantined'
    )),
    processing_error TEXT,

    -- Virus scan results
    virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN (
        'pending',
        'clean',
        'infected',
        'suspicious',
        'error'
    )),
    virus_scan_date TIMESTAMPTZ,
    virus_scan_result JSONB,

    -- Access control
    is_public BOOLEAN DEFAULT false,
    access_policy JSONB DEFAULT '{"require_auth": true}'::jsonb,

    -- Cost tracking (for cloud storage)
    estimated_monthly_cost DECIMAL(10, 4),  -- USD
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,

    -- Audit fields
    uploaded_by uuid REFERENCES public."Users"(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by uuid REFERENCES public."Users"(id),
    deletion_reason TEXT,

    -- Constraints
    CONSTRAINT unique_evidence_file_hash UNIQUE (evidence_id, file_hash),
    CONSTRAINT valid_cdn_url CHECK (cdn_url IS NULL OR cdn_url ~ '^https?://'),
    CONSTRAINT one_primary_file_per_evidence UNIQUE (evidence_id) WHERE is_primary = true
);

-- ============================================================================
-- TABLE: EvidenceAttachments
-- ============================================================================
-- Many-to-many relationship allowing evidence to be attached to multiple
-- nodes and edges with contextual relevance notes.

CREATE TABLE IF NOT EXISTS public."EvidenceAttachments" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Evidence reference
    evidence_id uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- Target: either a Node or Edge (mutually exclusive)
    target_node_id uuid REFERENCES public."Nodes"(id) ON DELETE CASCADE,
    target_edge_id uuid REFERENCES public."Edges"(id) ON DELETE CASCADE,

    -- Attachment context
    relevance_score REAL DEFAULT 1.0 CHECK (
        relevance_score >= 0.0 AND relevance_score <= 1.0
    ),
    relevance_note TEXT,  -- Why this evidence is relevant to this target

    -- Position in evidence list
    display_order INTEGER DEFAULT 0,

    -- Visibility
    is_visible BOOLEAN DEFAULT true,

    -- Audit fields
    attached_by uuid NOT NULL REFERENCES public."Users"(id),
    attached_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Soft delete
    detached_at TIMESTAMPTZ,
    detached_by uuid REFERENCES public."Users"(id),
    detachment_reason TEXT,

    -- Constraints
    CONSTRAINT evidence_attachment_target_check CHECK (
        (target_node_id IS NOT NULL AND target_edge_id IS NULL) OR
        (target_node_id IS NULL AND target_edge_id IS NOT NULL)
    ),
    -- Prevent duplicate attachments
    CONSTRAINT unique_evidence_attachment_node UNIQUE (evidence_id, target_node_id)
        WHERE target_node_id IS NOT NULL AND detached_at IS NULL,
    CONSTRAINT unique_evidence_attachment_edge UNIQUE (evidence_id, target_edge_id)
        WHERE target_edge_id IS NOT NULL AND detached_at IS NULL
);

-- ============================================================================
-- TABLE: EvidenceMetadata
-- ============================================================================
-- Rich metadata for evidence including authorship, dates, methodology,
-- and domain-specific information.

CREATE TABLE IF NOT EXISTS public."EvidenceMetadata" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Evidence reference (one-to-one)
    evidence_id uuid UNIQUE NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- Authorship
    authors TEXT[],  -- Array of author names
    author_affiliations TEXT[],
    corresponding_author TEXT,

    -- Dates
    publication_date DATE,
    access_date DATE,  -- When evidence was accessed/archived
    relevant_date_range DATERANGE,  -- Date range this evidence applies to

    -- Publication info
    journal TEXT,
    conference TEXT,
    publisher TEXT,
    volume TEXT,
    issue TEXT,
    pages TEXT,
    doi TEXT,
    isbn TEXT,
    issn TEXT,
    pmid TEXT,  -- PubMed ID
    arxiv_id TEXT,

    -- Research methodology
    study_type TEXT,  -- RCT, observational, meta-analysis, etc.
    methodology TEXT,
    sample_size INTEGER,
    study_duration_days INTEGER,
    peer_reviewed BOOLEAN,
    preprint BOOLEAN DEFAULT false,

    -- Content classification
    keywords TEXT[],
    topics TEXT[],
    abstract TEXT,
    summary TEXT,
    language TEXT DEFAULT 'en',
    language_confidence REAL,

    -- Geographic context
    geolocation JSONB,  -- {"lat": 37.7749, "lon": -122.4194, "name": "San Francisco"}
    geographic_scope TEXT,  -- "local", "national", "global"
    countries_covered TEXT[],

    -- Legal/regulatory
    jurisdiction TEXT,
    legal_context TEXT,
    regulation_reference TEXT,

    -- Access and licensing
    license TEXT,  -- CC-BY, proprietary, etc.
    access_restrictions TEXT,
    paywall BOOLEAN DEFAULT false,
    copyright_holder TEXT,

    -- Quality indicators
    impact_factor REAL,
    citation_count INTEGER DEFAULT 0,
    h_index INTEGER,
    altmetric_score INTEGER,

    -- Technical metadata
    data_collection_method TEXT,
    instruments_used TEXT[],
    software_used TEXT[],
    statistical_methods TEXT[],

    -- Additional context
    funding_sources TEXT[],
    conflicts_of_interest TEXT,
    ethical_approval TEXT,
    data_availability TEXT,
    supplementary_materials TEXT[],

    -- Custom fields (domain-specific)
    custom_metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_doi CHECK (doi IS NULL OR doi ~ '^10\.\d{4,9}/[-._;()/:A-Z0-9]+$'),
    CONSTRAINT valid_language_confidence CHECK (
        language_confidence IS NULL OR
        (language_confidence >= 0.0 AND language_confidence <= 1.0)
    )
);

-- ============================================================================
-- TABLE: EvidenceReviews
-- ============================================================================
-- Community reviews of evidence quality, credibility, and relevance.
-- Influences evidence weight and source credibility.

CREATE TABLE IF NOT EXISTS public."EvidenceReviews" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Evidence and reviewer
    evidence_id uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,
    reviewer_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    -- Review scores (0.0 to 1.0)
    quality_score REAL CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    credibility_score REAL CHECK (credibility_score >= 0.0 AND credibility_score <= 1.0),
    relevance_score REAL CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    clarity_score REAL CHECK (clarity_score >= 0.0 AND clarity_score <= 1.0),

    -- Overall recommendation
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    recommendation TEXT CHECK (recommendation IN (
        'accept',
        'accept_with_revisions',
        'needs_verification',
        'reject',
        'flag_for_removal'
    )),

    -- Review content
    review_text TEXT,
    strengths TEXT,
    weaknesses TEXT,
    suggestions TEXT,

    -- Quality flags
    flags evidence_quality_flag[],
    flag_explanation TEXT,

    -- Expertise declaration
    reviewer_expertise_level TEXT CHECK (reviewer_expertise_level IN (
        'expert',
        'professional',
        'knowledgeable',
        'general'
    )),
    reviewer_credentials TEXT,

    -- Verification
    verified_claims JSONB DEFAULT '[]'::jsonb,  -- Array of verified facts
    disputed_claims JSONB DEFAULT '[]'::jsonb,  -- Array of disputed facts

    -- Helpfulness voting
    helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
    not_helpful_count INTEGER DEFAULT 0 CHECK (not_helpful_count >= 0),

    -- Review status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',
        'disputed',
        'retracted',
        'hidden'
    )),
    moderation_notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    retracted_at TIMESTAMPTZ,
    retraction_reason TEXT,

    -- Constraints: one review per user per evidence
    CONSTRAINT unique_evidence_review UNIQUE (evidence_id, reviewer_id)
);

-- ============================================================================
-- TABLE: EvidenceReviewVotes
-- ============================================================================
-- Voting on evidence review helpfulness (meta-reviews)

CREATE TABLE IF NOT EXISTS public."EvidenceReviewVotes" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_id uuid NOT NULL REFERENCES public."EvidenceReviews"(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,

    vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),

    created_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints: one vote per user per review
    CONSTRAINT unique_review_vote UNIQUE (review_id, user_id)
);

-- ============================================================================
-- TABLE: EvidenceAuditLog
-- ============================================================================
-- Complete audit trail of all evidence operations for compliance and debugging

CREATE TABLE IF NOT EXISTS public."EvidenceAuditLog" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Evidence reference
    evidence_id uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- Action details
    action evidence_audit_action NOT NULL,
    action_description TEXT,

    -- Actor information
    actor_id uuid REFERENCES public."Users"(id),
    actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'admin', 'api')),

    -- Change tracking
    changes JSONB,  -- {"old": {...}, "new": {...}}
    affected_fields TEXT[],

    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_id uuid,
    session_id uuid,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Indexes will be created below
    CONSTRAINT valid_ip CHECK (ip_address IS NULL OR family(ip_address) IN (4, 6))
);

-- ============================================================================
-- TABLE: EvidenceDuplicates
-- ============================================================================
-- Tracks potential duplicate evidence based on file hash, content similarity

CREATE TABLE IF NOT EXISTS public."EvidenceDuplicates" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    evidence_id_1 uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,
    evidence_id_2 uuid NOT NULL REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- Similarity metrics
    file_hash_match BOOLEAN DEFAULT false,
    content_similarity REAL CHECK (content_similarity >= 0.0 AND content_similarity <= 1.0),
    metadata_similarity REAL CHECK (metadata_similarity >= 0.0 AND metadata_similarity <= 1.0),

    -- Detection method
    detection_method TEXT NOT NULL CHECK (detection_method IN (
        'file_hash',
        'content_hash',
        'fuzzy_match',
        'manual_report',
        'ai_detection'
    )),

    -- Resolution
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'confirmed_duplicate',
        'not_duplicate',
        'merged'
    )),
    resolution_notes TEXT,
    resolved_by uuid REFERENCES public."Users"(id),
    resolved_at TIMESTAMPTZ,

    -- Merge target if duplicates were merged
    merged_into_evidence_id uuid REFERENCES public."Evidence"(id),

    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT different_evidence_ids CHECK (evidence_id_1 != evidence_id_2),
    CONSTRAINT ordered_evidence_ids CHECK (evidence_id_1 < evidence_id_2),
    CONSTRAINT unique_duplicate_pair UNIQUE (evidence_id_1, evidence_id_2)
);

-- ============================================================================
-- TABLE: EvidenceSearchIndex
-- ============================================================================
-- Denormalized table for full-text search performance
-- Updated via triggers when evidence/metadata changes

CREATE TABLE IF NOT EXISTS public."EvidenceSearchIndex" (
    evidence_id uuid PRIMARY KEY REFERENCES public."Evidence"(id) ON DELETE CASCADE,

    -- Searchable text (concatenated from multiple sources)
    search_content TEXT,  -- Evidence content + metadata + source info

    -- Full-text search vector
    search_vector tsvector,

    -- Faceted search fields
    file_types evidence_file_type[],
    authors TEXT[],
    keywords TEXT[],
    topics TEXT[],
    publication_years INTEGER[],
    languages TEXT[],

    -- Quick filters
    has_files BOOLEAN DEFAULT false,
    file_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    avg_quality_score REAL,

    -- Timestamps for cache invalidation
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- EvidenceFiles indexes
CREATE INDEX idx_evidence_files_evidence ON public."EvidenceFiles" (evidence_id);
CREATE INDEX idx_evidence_files_hash ON public."EvidenceFiles" (file_hash);
CREATE INDEX idx_evidence_files_storage ON public."EvidenceFiles" (storage_provider, storage_key);
CREATE INDEX idx_evidence_files_type ON public."EvidenceFiles" (file_type);
CREATE INDEX idx_evidence_files_status ON public."EvidenceFiles" (processing_status)
    WHERE processing_status != 'completed';
CREATE INDEX idx_evidence_files_virus ON public."EvidenceFiles" (virus_scan_status)
    WHERE virus_scan_status != 'clean';
CREATE INDEX idx_evidence_files_uploaded_by ON public."EvidenceFiles" (uploaded_by);
CREATE INDEX idx_evidence_files_size ON public."EvidenceFiles" (file_size DESC);

-- Composite index for duplicate detection
CREATE INDEX idx_evidence_files_duplicate_check ON public."EvidenceFiles" (file_hash, file_size);

-- EvidenceAttachments indexes
CREATE INDEX idx_evidence_attachments_evidence ON public."EvidenceAttachments" (evidence_id)
    WHERE detached_at IS NULL;
CREATE INDEX idx_evidence_attachments_node ON public."EvidenceAttachments" (target_node_id)
    WHERE target_node_id IS NOT NULL AND detached_at IS NULL;
CREATE INDEX idx_evidence_attachments_edge ON public."EvidenceAttachments" (target_edge_id)
    WHERE target_edge_id IS NOT NULL AND detached_at IS NULL;
CREATE INDEX idx_evidence_attachments_attached_by ON public."EvidenceAttachments" (attached_by);
CREATE INDEX idx_evidence_attachments_relevance ON public."EvidenceAttachments" (relevance_score DESC);

-- Composite index for evidence-target queries
CREATE INDEX idx_evidence_attachments_evidence_node ON public."EvidenceAttachments" (evidence_id, target_node_id)
    WHERE detached_at IS NULL;
CREATE INDEX idx_evidence_attachments_evidence_edge ON public."EvidenceAttachments" (evidence_id, target_edge_id)
    WHERE detached_at IS NULL;

-- EvidenceMetadata indexes
CREATE INDEX idx_evidence_metadata_evidence ON public."EvidenceMetadata" (evidence_id);
CREATE INDEX idx_evidence_metadata_authors ON public."EvidenceMetadata" USING GIN (authors);
CREATE INDEX idx_evidence_metadata_keywords ON public."EvidenceMetadata" USING GIN (keywords);
CREATE INDEX idx_evidence_metadata_topics ON public."EvidenceMetadata" USING GIN (topics);
CREATE INDEX idx_evidence_metadata_publication_date ON public."EvidenceMetadata" (publication_date DESC);
CREATE INDEX idx_evidence_metadata_doi ON public."EvidenceMetadata" (doi) WHERE doi IS NOT NULL;
CREATE INDEX idx_evidence_metadata_language ON public."EvidenceMetadata" (language);
CREATE INDEX idx_evidence_metadata_geolocation ON public."EvidenceMetadata" USING GIN (geolocation);

-- Full-text search on abstract
CREATE INDEX idx_evidence_metadata_abstract_fts ON public."EvidenceMetadata"
    USING GIN (to_tsvector('english', COALESCE(abstract, '')));

-- EvidenceReviews indexes
CREATE INDEX idx_evidence_reviews_evidence ON public."EvidenceReviews" (evidence_id)
    WHERE status = 'active';
CREATE INDEX idx_evidence_reviews_reviewer ON public."EvidenceReviews" (reviewer_id);
CREATE INDEX idx_evidence_reviews_rating ON public."EvidenceReviews" (overall_rating);
CREATE INDEX idx_evidence_reviews_quality ON public."EvidenceReviews" (quality_score DESC);
CREATE INDEX idx_evidence_reviews_helpful ON public."EvidenceReviews" (helpful_count DESC);
CREATE INDEX idx_evidence_reviews_flags ON public."EvidenceReviews" USING GIN (flags);
CREATE INDEX idx_evidence_reviews_created ON public."EvidenceReviews" (created_at DESC);

-- EvidenceReviewVotes indexes
CREATE INDEX idx_evidence_review_votes_review ON public."EvidenceReviewVotes" (review_id);
CREATE INDEX idx_evidence_review_votes_user ON public."EvidenceReviewVotes" (user_id);

-- EvidenceAuditLog indexes
CREATE INDEX idx_evidence_audit_evidence ON public."EvidenceAuditLog" (evidence_id);
CREATE INDEX idx_evidence_audit_action ON public."EvidenceAuditLog" (action);
CREATE INDEX idx_evidence_audit_actor ON public."EvidenceAuditLog" (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_evidence_audit_created ON public."EvidenceAuditLog" (created_at DESC);
CREATE INDEX idx_evidence_audit_ip ON public."EvidenceAuditLog" (ip_address) WHERE ip_address IS NOT NULL;

-- Composite index for user audit trail
CREATE INDEX idx_evidence_audit_actor_created ON public."EvidenceAuditLog" (actor_id, created_at DESC);

-- EvidenceDuplicates indexes
CREATE INDEX idx_evidence_duplicates_evidence1 ON public."EvidenceDuplicates" (evidence_id_1);
CREATE INDEX idx_evidence_duplicates_evidence2 ON public."EvidenceDuplicates" (evidence_id_2);
CREATE INDEX idx_evidence_duplicates_status ON public."EvidenceDuplicates" (status)
    WHERE status = 'pending';

-- EvidenceSearchIndex indexes
CREATE INDEX idx_evidence_search_vector ON public."EvidenceSearchIndex" USING GIN (search_vector);
CREATE INDEX idx_evidence_search_file_types ON public."EvidenceSearchIndex" USING GIN (file_types);
CREATE INDEX idx_evidence_search_authors ON public."EvidenceSearchIndex" USING GIN (authors);
CREATE INDEX idx_evidence_search_keywords ON public."EvidenceSearchIndex" USING GIN (keywords);
CREATE INDEX idx_evidence_search_quality ON public."EvidenceSearchIndex" (avg_quality_score DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: calculate_evidence_quality_score
-- ----------------------------------------------------------------------------
-- Calculates aggregated quality score from community reviews

CREATE OR REPLACE FUNCTION calculate_evidence_quality_score(
    p_evidence_id uuid
) RETURNS REAL AS $$
DECLARE
    v_avg_quality REAL;
    v_review_count INTEGER;
    v_quality_score REAL;
BEGIN
    SELECT
        AVG(quality_score),
        COUNT(*)
    INTO v_avg_quality, v_review_count
    FROM public."EvidenceReviews"
    WHERE evidence_id = p_evidence_id
        AND status = 'active'
        AND quality_score IS NOT NULL;

    -- If no reviews, return null
    IF v_review_count = 0 THEN
        RETURN NULL;
    END IF;

    -- Apply confidence adjustment based on review count
    -- More reviews = higher confidence in the score
    v_quality_score := v_avg_quality * (1.0 - EXP(-v_review_count / 5.0));

    RETURN GREATEST(0.0, LEAST(1.0, v_quality_score));
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: update_evidence_search_index
-- ----------------------------------------------------------------------------
-- Updates search index for an evidence item

CREATE OR REPLACE FUNCTION update_evidence_search_index(
    p_evidence_id uuid
) RETURNS VOID AS $$
DECLARE
    v_search_content TEXT;
    v_file_types evidence_file_type[];
    v_authors TEXT[];
    v_keywords TEXT[];
    v_topics TEXT[];
    v_publication_years INTEGER[];
    v_languages TEXT[];
    v_file_count INTEGER;
    v_review_count INTEGER;
    v_avg_quality REAL;
BEGIN
    -- Build search content from multiple sources
    SELECT
        COALESCE(e.content, '') || ' ' ||
        COALESCE(e.content_excerpt, '') || ' ' ||
        COALESCE(s.title, '') || ' ' ||
        COALESCE(s.abstract, '') || ' ' ||
        COALESCE(array_to_string(s.authors, ' '), '') || ' ' ||
        COALESCE(em.summary, '') || ' ' ||
        COALESCE(em.abstract, '') || ' ' ||
        COALESCE(array_to_string(em.keywords, ' '), ''),
        array_agg(DISTINCT ef.file_type) FILTER (WHERE ef.file_type IS NOT NULL),
        COALESCE(em.authors, ARRAY[]::TEXT[]),
        COALESCE(em.keywords, ARRAY[]::TEXT[]),
        COALESCE(em.topics, ARRAY[]::TEXT[]),
        ARRAY[EXTRACT(YEAR FROM em.publication_date)::INTEGER] FILTER (WHERE em.publication_date IS NOT NULL),
        ARRAY[COALESCE(em.language, 'en')],
        COUNT(DISTINCT ef.id),
        COUNT(DISTINCT er.id),
        AVG(er.quality_score)
    INTO
        v_search_content,
        v_file_types,
        v_authors,
        v_keywords,
        v_topics,
        v_publication_years,
        v_languages,
        v_file_count,
        v_review_count,
        v_avg_quality
    FROM public."Evidence" e
    LEFT JOIN public."Sources" s ON e.source_id = s.id
    LEFT JOIN public."EvidenceMetadata" em ON e.id = em.evidence_id
    LEFT JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id AND ef.deleted_at IS NULL
    LEFT JOIN public."EvidenceReviews" er ON e.id = er.evidence_id AND er.status = 'active'
    WHERE e.id = p_evidence_id
    GROUP BY e.id, e.content, e.content_excerpt, s.title, s.abstract, s.authors,
             em.summary, em.abstract, em.keywords, em.authors, em.topics, em.publication_date, em.language;

    -- Upsert search index
    INSERT INTO public."EvidenceSearchIndex" (
        evidence_id,
        search_content,
        search_vector,
        file_types,
        authors,
        keywords,
        topics,
        publication_years,
        languages,
        has_files,
        file_count,
        review_count,
        avg_quality_score,
        last_updated
    ) VALUES (
        p_evidence_id,
        v_search_content,
        to_tsvector('english', v_search_content),
        v_file_types,
        v_authors,
        v_keywords,
        v_topics,
        v_publication_years,
        v_languages,
        v_file_count > 0,
        v_file_count,
        v_review_count,
        v_avg_quality,
        now()
    )
    ON CONFLICT (evidence_id) DO UPDATE SET
        search_content = EXCLUDED.search_content,
        search_vector = EXCLUDED.search_vector,
        file_types = EXCLUDED.file_types,
        authors = EXCLUDED.authors,
        keywords = EXCLUDED.keywords,
        topics = EXCLUDED.topics,
        publication_years = EXCLUDED.publication_years,
        languages = EXCLUDED.languages,
        has_files = EXCLUDED.has_files,
        file_count = EXCLUDED.file_count,
        review_count = EXCLUDED.review_count,
        avg_quality_score = EXCLUDED.avg_quality_score,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: detect_duplicate_evidence
-- ----------------------------------------------------------------------------
-- Detects potential duplicate evidence based on file hash

CREATE OR REPLACE FUNCTION detect_duplicate_evidence(
    p_evidence_id uuid,
    p_file_hash TEXT
) RETURNS TABLE(duplicate_evidence_id uuid, similarity_score REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        e.id AS duplicate_evidence_id,
        1.0 AS similarity_score
    FROM public."Evidence" e
    JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id
    WHERE ef.file_hash = p_file_hash
        AND e.id != p_evidence_id
        AND ef.deleted_at IS NULL
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- Function: log_evidence_audit
-- ----------------------------------------------------------------------------
-- Helper function to log audit events

CREATE OR REPLACE FUNCTION log_evidence_audit(
    p_evidence_id uuid,
    p_action evidence_audit_action,
    p_actor_id uuid DEFAULT NULL,
    p_changes JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_audit_id uuid;
BEGIN
    INSERT INTO public."EvidenceAuditLog" (
        evidence_id,
        action,
        action_description,
        actor_id,
        changes,
        created_at
    ) VALUES (
        p_evidence_id,
        p_action,
        p_description,
        p_actor_id,
        p_changes,
        now()
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------

CREATE TRIGGER update_evidence_files_updated_at
    BEFORE UPDATE ON public."EvidenceFiles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_attachments_updated_at
    BEFORE UPDATE ON public."EvidenceAttachments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_metadata_updated_at
    BEFORE UPDATE ON public."EvidenceMetadata"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_reviews_updated_at
    BEFORE UPDATE ON public."EvidenceReviews"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Trigger: Update review helpfulness counts
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_update_review_helpfulness()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'helpful' THEN
            UPDATE public."EvidenceReviews"
            SET helpful_count = helpful_count + 1
            WHERE id = NEW.review_id;
        ELSE
            UPDATE public."EvidenceReviews"
            SET not_helpful_count = not_helpful_count + 1
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'helpful' THEN
            UPDATE public."EvidenceReviews"
            SET helpful_count = GREATEST(0, helpful_count - 1)
            WHERE id = OLD.review_id;
        ELSE
            UPDATE public."EvidenceReviews"
            SET not_helpful_count = GREATEST(0, not_helpful_count - 1)
            WHERE id = OLD.review_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_review_votes_update_counts
    AFTER INSERT OR DELETE ON public."EvidenceReviewVotes"
    FOR EACH ROW EXECUTE FUNCTION trigger_update_review_helpfulness();

-- ----------------------------------------------------------------------------
-- Trigger: Update search index when evidence changes
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_update_evidence_search_index()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_evidence_search_index(NEW.evidence_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_evidence_search_index(OLD.evidence_id);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER evidence_metadata_search_index_update
    AFTER INSERT OR UPDATE OR DELETE ON public."EvidenceMetadata"
    FOR EACH ROW EXECUTE FUNCTION trigger_update_evidence_search_index();

CREATE TRIGGER evidence_files_search_index_update
    AFTER INSERT OR UPDATE OR DELETE ON public."EvidenceFiles"
    FOR EACH ROW EXECUTE FUNCTION trigger_update_evidence_search_index();

CREATE TRIGGER evidence_reviews_search_index_update
    AFTER INSERT OR UPDATE OR DELETE ON public."EvidenceReviews"
    FOR EACH ROW EXECUTE FUNCTION trigger_update_evidence_search_index();

-- ----------------------------------------------------------------------------
-- Trigger: Auto-detect duplicates on file upload
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_detect_duplicates_on_upload()
RETURNS TRIGGER AS $$
DECLARE
    v_duplicate RECORD;
BEGIN
    -- Only check on insert or when hash changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.file_hash != OLD.file_hash) THEN
        -- Find duplicates
        FOR v_duplicate IN
            SELECT * FROM detect_duplicate_evidence(NEW.evidence_id, NEW.file_hash)
        LOOP
            -- Insert duplicate record if not exists
            INSERT INTO public."EvidenceDuplicates" (
                evidence_id_1,
                evidence_id_2,
                file_hash_match,
                content_similarity,
                detection_method,
                detected_at
            ) VALUES (
                LEAST(NEW.evidence_id, v_duplicate.duplicate_evidence_id),
                GREATEST(NEW.evidence_id, v_duplicate.duplicate_evidence_id),
                true,
                v_duplicate.similarity_score,
                'file_hash',
                now()
            )
            ON CONFLICT (evidence_id_1, evidence_id_2) DO NOTHING;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_files_detect_duplicates
    AFTER INSERT OR UPDATE ON public."EvidenceFiles"
    FOR EACH ROW EXECUTE FUNCTION trigger_detect_duplicates_on_upload();

-- ----------------------------------------------------------------------------
-- Trigger: Audit log for evidence operations
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_evidence_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_action evidence_audit_action;
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := jsonb_build_object('new', to_jsonb(NEW));
        PERFORM log_evidence_audit(NEW.evidence_id, v_action, NEW.uploaded_by, v_changes);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'updated';
        v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
        PERFORM log_evidence_audit(NEW.evidence_id, v_action, NEW.uploaded_by, v_changes);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := jsonb_build_object('old', to_jsonb(OLD));
        PERFORM log_evidence_audit(OLD.evidence_id, v_action, OLD.deleted_by, v_changes);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_files_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON public."EvidenceFiles"
    FOR EACH ROW EXECUTE FUNCTION trigger_evidence_audit_log();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: EvidenceFullDetails
-- ----------------------------------------------------------------------------
-- Comprehensive view joining evidence with files, metadata, and reviews

CREATE OR REPLACE VIEW public."EvidenceFullDetails" AS
SELECT
    e.id,
    e.target_node_id,
    e.target_edge_id,
    e.source_id,
    s.source_type,
    s.title AS source_title,
    s.url AS source_url,
    e.evidence_type,
    e.weight,
    e.confidence,
    e.content,
    e.is_verified,
    e.peer_review_status,
    e.created_at,

    -- File information
    json_agg(DISTINCT jsonb_build_object(
        'id', ef.id,
        'file_type', ef.file_type,
        'original_filename', ef.original_filename,
        'file_size', ef.file_size,
        'mime_type', ef.mime_type,
        'cdn_url', ef.cdn_url,
        'is_primary', ef.is_primary
    )) FILTER (WHERE ef.id IS NOT NULL) AS files,

    -- Metadata
    json_build_object(
        'authors', em.authors,
        'publication_date', em.publication_date,
        'keywords', em.keywords,
        'topics', em.topics,
        'abstract', em.abstract,
        'doi', em.doi,
        'language', em.language
    ) AS metadata,

    -- Review statistics
    COUNT(DISTINCT er.id) AS review_count,
    AVG(er.quality_score) AS avg_quality_score,
    AVG(er.credibility_score) AS avg_credibility_score,
    AVG(er.relevance_score) AS avg_relevance_score,
    AVG(er.overall_rating) AS avg_rating,

    -- Attachment count
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.detached_at IS NULL) AS attachment_count

FROM public."Evidence" e
LEFT JOIN public."Sources" s ON e.source_id = s.id
LEFT JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id AND ef.deleted_at IS NULL
LEFT JOIN public."EvidenceMetadata" em ON e.id = em.evidence_id
LEFT JOIN public."EvidenceReviews" er ON e.id = er.evidence_id AND er.status = 'active'
LEFT JOIN public."EvidenceAttachments" ea ON e.id = ea.evidence_id

GROUP BY e.id, s.id, em.id;

-- ----------------------------------------------------------------------------
-- View: EvidenceQualityReport
-- ----------------------------------------------------------------------------
-- Aggregated quality metrics for evidence

CREATE OR REPLACE VIEW public."EvidenceQualityReport" AS
SELECT
    e.id AS evidence_id,
    e.source_id,

    -- File metrics
    COUNT(DISTINCT ef.id) FILTER (WHERE ef.deleted_at IS NULL) AS file_count,
    SUM(ef.file_size) FILTER (WHERE ef.deleted_at IS NULL) AS total_file_size,

    -- Review metrics
    COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'active') AS review_count,
    AVG(er.quality_score) AS avg_quality_score,
    AVG(er.credibility_score) AS avg_credibility_score,
    AVG(er.relevance_score) AS avg_relevance_score,
    AVG(er.overall_rating) AS avg_rating,

    -- Flag analysis
    array_agg(DISTINCT flag) FILTER (WHERE flag IS NOT NULL) AS all_flags,
    COUNT(*) FILTER (WHERE 'misleading' = ANY(er.flags)) AS misleading_count,
    COUNT(*) FILTER (WHERE 'outdated' = ANY(er.flags)) AS outdated_count,

    -- Duplicate detection
    COUNT(DISTINCT ed.id) FILTER (WHERE ed.status = 'confirmed_duplicate') AS duplicate_count,

    -- Attachment metrics
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.detached_at IS NULL) AS attachment_count,

    -- Calculated quality score
    calculate_evidence_quality_score(e.id) AS calculated_quality_score

FROM public."Evidence" e
LEFT JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id
LEFT JOIN public."EvidenceReviews" er ON e.id = er.evidence_id
LEFT JOIN LATERAL unnest(er.flags) AS flag ON true
LEFT JOIN public."EvidenceDuplicates" ed ON e.id = ed.evidence_id_1 OR e.id = ed.evidence_id_2
LEFT JOIN public."EvidenceAttachments" ea ON e.id = ea.evidence_id

GROUP BY e.id;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Query 1: Full-text search for evidence
-- SELECT * FROM public."EvidenceSearchIndex"
-- WHERE search_vector @@ plainto_tsquery('english', 'climate change research')
-- ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'climate change research')) DESC
-- LIMIT 20;

-- Query 2: Find evidence with files by type
-- SELECT e.*, array_agg(ef.file_type) AS file_types
-- FROM public."Evidence" e
-- JOIN public."EvidenceFiles" ef ON e.id = ef.evidence_id
-- WHERE ef.file_type = 'document' AND ef.deleted_at IS NULL
-- GROUP BY e.id;

-- Query 3: Get evidence quality report
-- SELECT * FROM public."EvidenceQualityReport"
-- WHERE review_count >= 3 AND avg_quality_score < 0.5
-- ORDER BY avg_quality_score ASC;

-- Query 4: Find duplicates needing review
-- SELECT ed.*, e1.content AS evidence1_content, e2.content AS evidence2_content
-- FROM public."EvidenceDuplicates" ed
-- JOIN public."Evidence" e1 ON ed.evidence_id_1 = e1.id
-- JOIN public."Evidence" e2 ON ed.evidence_id_2 = e2.id
-- WHERE ed.status = 'pending'
-- ORDER BY ed.detected_at DESC;

-- Query 5: Evidence with high-quality reviews
-- SELECT e.*, AVG(er.quality_score) AS avg_quality
-- FROM public."Evidence" e
-- JOIN public."EvidenceReviews" er ON e.id = er.evidence_id
-- WHERE er.status = 'active' AND er.reviewer_expertise_level IN ('expert', 'professional')
-- GROUP BY e.id
-- HAVING COUNT(er.id) >= 3 AND AVG(er.quality_score) >= 0.8;

-- Query 6: Storage cost analysis
-- SELECT
--     storage_provider,
--     COUNT(*) AS file_count,
--     SUM(file_size) AS total_size_bytes,
--     SUM(file_size) / 1073741824.0 AS total_size_gb,
--     SUM(estimated_monthly_cost) AS estimated_monthly_cost
-- FROM public."EvidenceFiles"
-- WHERE deleted_at IS NULL
-- GROUP BY storage_provider;

-- Query 7: Audit trail for specific evidence
-- SELECT * FROM public."EvidenceAuditLog"
-- WHERE evidence_id = '<uuid>'
-- ORDER BY created_at DESC;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================

-- 1. File Storage Strategy:
--    - Use S3 for production with CloudFront CDN
--    - Local storage for development/testing
--    - Implement lifecycle policies to archive old files to Glacier
--    - Consider multi-region replication for critical evidence
--
-- 2. Search Performance:
--    - EvidenceSearchIndex table provides denormalized search
--    - GIN indexes on tsvector for fast full-text search
--    - Update search index asynchronously via triggers
--    - Consider separate read replica for search queries
--
-- 3. Duplicate Detection:
--    - File hash comparison is O(1) with index
--    - Run fuzzy matching as background job
--    - Consider perceptual hashing for images/video
--
-- 4. Storage Cost Optimization:
--    - Track access patterns via access_count
--    - Archive rarely accessed files to cold storage
--    - Compress large files before upload
--    - Deduplicate files with same hash
--
-- 5. Scalability Considerations:
--    - Partition EvidenceFiles by created_at for large datasets
--    - Partition EvidenceAuditLog by month
--    - Use connection pooling for database access
--    - Cache frequently accessed evidence metadata
--
-- 6. Security Considerations:
--    - Virus scan all uploaded files
--    - Quarantine suspicious files
--    - Implement signed URLs for S3 access
--    - Rate limit file uploads
--    - Validate file types and sizes
--    - Encrypt files at rest and in transit
--
-- 7. Monitoring Metrics:
--    - File upload success rate
--    - Average processing time
--    - Storage costs per month
--    - Duplicate detection accuracy
--    - Search query performance
--    - Review submission rate

-- ============================================================================
-- MIGRATION ROLLBACK
-- ============================================================================

-- To rollback this migration, run:
-- DROP VIEW IF EXISTS public."EvidenceQualityReport";
-- DROP VIEW IF EXISTS public."EvidenceFullDetails";
-- DROP TABLE IF EXISTS public."EvidenceSearchIndex" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceDuplicates" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceAuditLog" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceReviewVotes" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceReviews" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceMetadata" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceAttachments" CASCADE;
-- DROP TABLE IF EXISTS public."EvidenceFiles" CASCADE;
-- DROP TYPE IF EXISTS evidence_audit_action;
-- DROP TYPE IF EXISTS evidence_quality_flag;
-- DROP TYPE IF EXISTS storage_provider;
-- DROP TYPE IF EXISTS evidence_file_type;
-- DROP FUNCTION IF EXISTS log_evidence_audit;
-- DROP FUNCTION IF EXISTS detect_duplicate_evidence;
-- DROP FUNCTION IF EXISTS update_evidence_search_index;
-- DROP FUNCTION IF EXISTS calculate_evidence_quality_score;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO backend_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO backend_app;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
