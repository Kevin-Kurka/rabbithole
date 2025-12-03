--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4 (Debian 15.4-2.pgdg120+1)
-- Dumped by pg_dump version 15.4 (Debian 15.4-2.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'Migration 024: Whiteboard interactive features - Added Thesis, Citation, Reference node types and canvas positioning support';


--
-- Name: sys; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sys;


ALTER SCHEMA sys OWNER TO postgres;

--
-- Name: SCHEMA sys; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA sys IS 'System schema for operational tables (job queues, metrics, logs)';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: evidence_audit_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.evidence_audit_action AS ENUM (
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


ALTER TYPE public.evidence_audit_action OWNER TO postgres;

--
-- Name: evidence_file_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.evidence_file_type AS ENUM (
    'document',
    'image',
    'video',
    'audio',
    'link',
    'citation',
    'dataset',
    'archive',
    'presentation',
    'spreadsheet',
    'code',
    'other'
);


ALTER TYPE public.evidence_file_type OWNER TO postgres;

--
-- Name: evidence_quality_flag; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.evidence_quality_flag AS ENUM (
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


ALTER TYPE public.evidence_quality_flag OWNER TO postgres;

--
-- Name: methodology_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.methodology_category AS ENUM (
    'analytical',
    'creative',
    'strategic',
    'investigative',
    'systems',
    'custom'
);


ALTER TYPE public.methodology_category OWNER TO postgres;

--
-- Name: methodology_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.methodology_status AS ENUM (
    'draft',
    'private',
    'shared',
    'published',
    'deprecated'
);


ALTER TYPE public.methodology_status OWNER TO postgres;

--
-- Name: storage_provider; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.storage_provider AS ENUM (
    'local',
    's3',
    'gcs',
    'azure',
    'cloudflare_r2',
    'cdn'
);


ALTER TYPE public.storage_provider OWNER TO postgres;

--
-- Name: append_node_version_history(uuid, uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.append_node_version_history(node_uuid uuid, user_uuid uuid, operation_type text, changes_data jsonb, position_data jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_meta JSONB;
    current_history JSONB;
    new_version JSONB;
BEGIN
    -- Get current meta
    SELECT meta INTO current_meta
    FROM public."Nodes"
    WHERE id = node_uuid;

    -- Get existing version history or initialize empty array
    current_history := COALESCE(current_meta->'versionHistory', '[]'::jsonb);

    -- Build new version entry
    new_version := jsonb_build_object(
        'timestamp', NOW(),
        'userId', user_uuid,
        'operation', operation_type,
        'changes', changes_data,
        'position', position_data
    );

    -- Append new version to history
    current_meta := jsonb_set(
        COALESCE(current_meta, '{}'::jsonb),
        '{versionHistory}',
        current_history || new_version
    );

    -- Update node
    UPDATE public."Nodes"
    SET meta = current_meta, updated_at = NOW()
    WHERE id = node_uuid;
END;
$$;


ALTER FUNCTION public.append_node_version_history(node_uuid uuid, user_uuid uuid, operation_type text, changes_data jsonb, position_data jsonb) OWNER TO postgres;

--
-- Name: FUNCTION append_node_version_history(node_uuid uuid, user_uuid uuid, operation_type text, changes_data jsonb, position_data jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.append_node_version_history(node_uuid uuid, user_uuid uuid, operation_type text, changes_data jsonb, position_data jsonb) IS 'Appends a version history entry to a node''s meta field';


--
-- Name: apply_confidence_score_ceiling(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_confidence_score_ceiling() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_max_allowed_score DECIMAL(3,2);
BEGIN
    -- Calculate the ceiling based on weakest related node
    v_max_allowed_score := calculate_confidence_score_ceiling(NEW.id);

    -- Update max_allowed_score
    NEW.max_allowed_score := v_max_allowed_score;

    -- If confidence_score exceeds ceiling, cap it
    IF NEW.confidence_score IS NOT NULL AND NEW.confidence_score > v_max_allowed_score THEN
        NEW.confidence_score := v_max_allowed_score;
    END IF;

    -- Store weakest node credibility for audit trail
    NEW.weakest_node_credibility := v_max_allowed_score;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.apply_confidence_score_ceiling() OWNER TO postgres;

--
-- Name: award_reputation_points(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.award_reputation_points(p_user_id uuid, p_action text, p_points integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_new_score INTEGER;
    v_new_tier TEXT;
BEGIN
    -- Initialize user reputation if not exists
    INSERT INTO public."UserReputation" (user_id, reputation_score)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update reputation score
    UPDATE public."UserReputation"
    SET 
        reputation_score = GREATEST(0, reputation_score + p_points),
        last_active_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING reputation_score INTO v_new_score;
    
    -- Update tier
    v_new_tier := calculate_user_reputation_tier(v_new_score);
    UPDATE public."UserReputation"
    SET reputation_tier = v_new_tier
    WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION public.award_reputation_points(p_user_id uuid, p_action text, p_points integer) OWNER TO postgres;

--
-- Name: calculate_challenge_impact(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_challenge_impact(target_type text, target_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    open_challenges INTEGER;
    impact REAL;
BEGIN
    -- Count open challenges
    IF target_type = 'node' THEN
        SELECT COUNT(*) INTO open_challenges
        FROM public."Challenges"
        WHERE target_node_id = target_id AND status = 'open';
    ELSE
        SELECT COUNT(*) INTO open_challenges
        FROM public."Challenges"
        WHERE target_edge_id = target_id AND status = 'open';
    END IF;

    -- Each challenge reduces score by 0.05, max -0.5
    impact := GREATEST(-0.5, -0.05 * open_challenges);

    RETURN impact;
END;
$$;


ALTER FUNCTION public.calculate_challenge_impact(target_type text, target_id uuid) OWNER TO postgres;

--
-- Name: calculate_confidence_score_ceiling(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_confidence_score_ceiling(p_inquiry_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_related_node_ids uuid[];
    v_min_credibility DECIMAL(3,2);
BEGIN
    -- Get related node IDs from the inquiry
    SELECT related_node_ids INTO v_related_node_ids
    FROM public."FormalInquiries"
    WHERE id = p_inquiry_id;

    -- If no related nodes, return 1.00 (no ceiling)
    IF v_related_node_ids IS NULL OR array_length(v_related_node_ids, 1) IS NULL THEN
        RETURN 1.00;
    END IF;

    -- Find minimum credibility among related nodes
    SELECT MIN(credibility) INTO v_min_credibility
    FROM public."Nodes"
    WHERE id = ANY(v_related_node_ids);

    -- Return the ceiling (minimum credibility)
    RETURN COALESCE(v_min_credibility, 1.00);
END;
$$;


ALTER FUNCTION public.calculate_confidence_score_ceiling(p_inquiry_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION calculate_confidence_score_ceiling(p_inquiry_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calculate_confidence_score_ceiling(p_inquiry_id uuid) IS 'Implements weakest link rule: confidence score capped by lowest related node credibility.';


--
-- Name: calculate_consensus_score(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_consensus_score(target_type text, target_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    supporting_weight REAL;
    refuting_weight REAL;
    total_weight REAL;
    consensus REAL;
BEGIN
    -- Sum evidence weights by type
    IF target_type = 'node' THEN
        SELECT
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO supporting_weight, refuting_weight
        FROM public."Evidence"
        WHERE target_node_id = target_id AND is_verified = true;
    ELSE
        SELECT
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                         THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO supporting_weight, refuting_weight
        FROM public."Evidence"
        WHERE target_edge_id = target_id AND is_verified = true;
    END IF;

    total_weight := supporting_weight + refuting_weight;

    -- If no evidence, return neutral 0.5
    IF total_weight = 0 THEN
        RETURN 0.5;
    END IF;

    -- Calculate consensus: ratio of supporting to total
    consensus := supporting_weight / total_weight;

    RETURN consensus;
END;
$$;


ALTER FUNCTION public.calculate_consensus_score(target_type text, target_id uuid) OWNER TO postgres;

--
-- Name: calculate_evidence_quality_score(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_evidence_quality_score(p_evidence_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
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
$$;


ALTER FUNCTION public.calculate_evidence_quality_score(p_evidence_id uuid) OWNER TO postgres;

--
-- Name: calculate_evidence_weight(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_evidence_weight(evidence_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    base_weight REAL;
    confidence REAL;
    temporal_relevance REAL;
    source_credibility REAL;
    peer_review_multiplier REAL;
    effective_weight REAL;
BEGIN
    -- Fetch evidence details with source credibility
    SELECT
        e.weight,
        e.confidence,
        e.temporal_relevance,
        COALESCE(sc.credibility_score, 0.5),
        CASE e.peer_review_status
            WHEN 'accepted' THEN 1.2
            WHEN 'disputed' THEN 0.8
            WHEN 'rejected' THEN 0.5
            ELSE 1.0
        END
    INTO
        base_weight,
        confidence,
        temporal_relevance,
        source_credibility,
        peer_review_multiplier
    FROM public."Evidence" e
    LEFT JOIN public."SourceCredibility" sc ON e.source_id = sc.source_id
    WHERE e.id = evidence_id;

    -- Calculate effective weight
    effective_weight := base_weight * confidence * temporal_relevance *
                       source_credibility * peer_review_multiplier;

    -- Clamp to [0, 1]
    RETURN GREATEST(0.0, LEAST(1.0, effective_weight));
END;
$$;


ALTER FUNCTION public.calculate_evidence_weight(evidence_id uuid) OWNER TO postgres;

--
-- Name: calculate_sticky_note_zindex(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_sticky_note_zindex(parent_node_uuid uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    parent_weight REAL;
BEGIN
    SELECT weight INTO parent_weight
    FROM public."Nodes"
    WHERE id = parent_node_uuid;

    -- Return parent weight + 0.001 for sticky note layering
    RETURN COALESCE(parent_weight, 0.5) + 0.001;
END;
$$;


ALTER FUNCTION public.calculate_sticky_note_zindex(parent_node_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION calculate_sticky_note_zindex(parent_node_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calculate_sticky_note_zindex(parent_node_uuid uuid) IS 'Calculates z-index for sticky notes as parent credibility + 0.001';


--
-- Name: calculate_temporal_decay(date, real, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_temporal_decay(relevant_date date, decay_rate real, reference_date timestamp with time zone DEFAULT now()) RETURNS real
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    days_elapsed INTEGER;
    decay_factor REAL;
BEGIN
    -- If no relevant date or no decay, return 1.0 (no decay)
    IF relevant_date IS NULL OR decay_rate = 0.0 THEN
        RETURN 1.0;
    END IF;

    -- Calculate days elapsed
    days_elapsed := EXTRACT(DAY FROM reference_date - relevant_date::TIMESTAMPTZ);

    -- Apply exponential decay: e^(-decay_rate * days)
    decay_factor := EXP(-decay_rate * days_elapsed);

    -- Clamp to [0, 1]
    RETURN GREATEST(0.0, LEAST(1.0, decay_factor));
END;
$$;


ALTER FUNCTION public.calculate_temporal_decay(relevant_date date, decay_rate real, reference_date timestamp with time zone) OWNER TO postgres;

--
-- Name: calculate_user_reputation_tier(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_user_reputation_tier(reputation_score integer) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF reputation_score < 100 THEN
        RETURN 'novice';
    ELSIF reputation_score < 500 THEN
        RETURN 'contributor';
    ELSIF reputation_score < 2000 THEN
        RETURN 'trusted';
    ELSIF reputation_score < 10000 THEN
        RETURN 'expert';
    ELSE
        RETURN 'authority';
    END IF;
END;
$$;


ALTER FUNCTION public.calculate_user_reputation_tier(reputation_score integer) OWNER TO postgres;

--
-- Name: calculate_veracity_score(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_veracity_score(target_type text, target_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    target_is_level_0 BOOLEAN;
    base_score REAL;
    consensus_score REAL;
    challenge_impact REAL;
    final_score REAL;
BEGIN
    -- Check if target is Level 0 (immutable truth)
    IF target_type = 'node' THEN
        SELECT is_level_0 INTO target_is_level_0
        FROM public."Nodes" WHERE id = target_id;
    ELSE
        SELECT is_level_0 INTO target_is_level_0
        FROM public."Edges" WHERE id = target_id;
    END IF;

    -- Level 0 always has veracity = 1.0
    IF target_is_level_0 THEN
        RETURN 1.0;
    END IF;

    -- Calculate component scores
    consensus_score := calculate_consensus_score(target_type, target_id);
    challenge_impact := calculate_challenge_impact(target_type, target_id);

    -- Base score from consensus
    base_score := consensus_score;

    -- Apply challenge impact
    final_score := base_score + challenge_impact;

    -- Clamp to [0, 1]
    final_score := GREATEST(0.0, LEAST(1.0, final_score));

    RETURN final_score;
END;
$$;


ALTER FUNCTION public.calculate_veracity_score(target_type text, target_id uuid) OWNER TO postgres;

--
-- Name: calculate_vote_weight(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_vote_weight(user_id uuid) RETURNS real
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_reputation INTEGER;
    v_tier TEXT;
    v_weight REAL;
BEGIN
    -- Get user reputation
    SELECT reputation_score, reputation_tier 
    INTO v_reputation, v_tier
    FROM public."UserReputation"
    WHERE UserReputation.user_id = calculate_vote_weight.user_id;
    
    -- Default weight for users without reputation record
    IF v_reputation IS NULL THEN
        RETURN 1.0;
    END IF;
    
    -- Calculate weight based on tier
    CASE v_tier
        WHEN 'novice' THEN v_weight := 1.0;
        WHEN 'contributor' THEN v_weight := 1.5;
        WHEN 'trusted' THEN v_weight := 2.0;
        WHEN 'expert' THEN v_weight := 3.0;
        WHEN 'authority' THEN v_weight := 5.0;
        ELSE v_weight := 1.0;
    END CASE;
    
    RETURN v_weight;
END;
$$;


ALTER FUNCTION public.calculate_vote_weight(user_id uuid) OWNER TO postgres;

--
-- Name: can_user_challenge(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_user_challenge(p_user_id uuid, p_challenge_type_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_reputation INTEGER;
    v_is_banned BOOLEAN;
    v_challenges_today INTEGER;
    v_daily_limit INTEGER;
    v_min_reputation INTEGER;
BEGIN
    -- Get user reputation status
    SELECT 
        reputation_score,
        is_banned,
        challenges_today,
        daily_limit
    INTO 
        v_reputation,
        v_is_banned,
        v_challenges_today,
        v_daily_limit
    FROM public."UserReputation"
    WHERE user_id = p_user_id;
    
    -- Check if user is banned
    IF v_is_banned THEN
        RETURN FALSE;
    END IF;
    
    -- Check daily limit
    IF v_challenges_today >= v_daily_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Get minimum reputation required for challenge type
    SELECT min_reputation_required 
    INTO v_min_reputation
    FROM public."ChallengeTypes"
    WHERE id = p_challenge_type_id;
    
    -- Check reputation requirement
    IF COALESCE(v_reputation, 0) < COALESCE(v_min_reputation, 0) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.can_user_challenge(p_user_id uuid, p_challenge_type_id uuid) OWNER TO postgres;

--
-- Name: check_evidence_level_0(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_evidence_level_0() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Prevent evidence for Level 0 nodes (they have fixed veracity = 1.0)
    IF NEW.target_node_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Nodes" WHERE id = NEW.target_node_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot add evidence to Level 0 nodes (they have fixed veracity = 1.0)';
        END IF;
    END IF;

    -- Prevent evidence for Level 0 edges (they have fixed veracity = 1.0)
    IF NEW.target_edge_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public."Edges" WHERE id = NEW.target_edge_id AND is_level_0 = true) THEN
            RAISE EXCEPTION 'Cannot add evidence to Level 0 edges (they have fixed veracity = 1.0)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_evidence_level_0() OWNER TO postgres;

--
-- Name: detect_duplicate_evidence(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.detect_duplicate_evidence(p_evidence_id uuid, p_file_hash text) RETURNS TABLE(duplicate_evidence_id uuid, similarity_score real)
    LANGUAGE plpgsql STABLE
    AS $$
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
$$;


ALTER FUNCTION public.detect_duplicate_evidence(p_evidence_id uuid, p_file_hash text) OWNER TO postgres;

--
-- Name: find_similar_claims(public.vector, numeric, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.find_similar_claims(p_claim_embedding public.vector, p_threshold numeric DEFAULT 0.8, p_limit integer DEFAULT 20) RETURNS TABLE(claim_id uuid, claim_text text, claim_type text, confidence numeric, similarity_score numeric, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.claim_text,
        ec.claim_type,
        ec.confidence,
        ROUND((1 - (ec.embedding <=> p_claim_embedding))::numeric, 4) AS similarity_score,
        ec.created_at
    FROM public."ExtractedClaims" ec
    WHERE ec.embedding IS NOT NULL
        AND (1 - (ec.embedding <=> p_claim_embedding)) >= p_threshold
    ORDER BY ec.embedding <=> p_claim_embedding
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.find_similar_claims(p_claim_embedding public.vector, p_threshold numeric, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION find_similar_claims(p_claim_embedding public.vector, p_threshold numeric, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.find_similar_claims(p_claim_embedding public.vector, p_threshold numeric, p_limit integer) IS 'Find semantically similar claims using vector similarity search';


--
-- Name: get_claim_matched_nodes(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_claim_matched_nodes(p_claim_id uuid, p_min_similarity numeric DEFAULT 0.0) RETURNS TABLE(node_id uuid, node_name text, node_type text, similarity_score numeric, match_type text, node_veracity numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.name,
        n.type,
        cnm.similarity_score,
        cnm.match_type,
        n.veracity
    FROM public."ClaimNodeMatches" cnm
    INNER JOIN public."Nodes" n ON n.id = cnm.node_id
    WHERE cnm.claim_id = p_claim_id
        AND cnm.similarity_score >= p_min_similarity
    ORDER BY cnm.similarity_score DESC;
END;
$$;


ALTER FUNCTION public.get_claim_matched_nodes(p_claim_id uuid, p_min_similarity numeric) OWNER TO postgres;

--
-- Name: FUNCTION get_claim_matched_nodes(p_claim_id uuid, p_min_similarity numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_claim_matched_nodes(p_claim_id uuid, p_min_similarity numeric) IS 'Get all nodes matched to a claim with similarity scores';


--
-- Name: get_claim_verification_status(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_claim_verification_status(p_claim_id uuid) RETURNS TABLE(claim_id uuid, claim_text text, veracity_score numeric, num_supporting integer, num_conflicting integer, verification_report jsonb, verified_at timestamp with time zone, status text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.claim_text,
        cv.veracity_score,
        COALESCE(array_length(cv.supporting_evidence, 1), 0) AS num_supporting,
        COALESCE(array_length(cv.conflicting_evidence, 1), 0) AS num_conflicting,
        cv.verification_report,
        cv.verified_at,
        CASE
            WHEN cv.veracity_score >= 0.8 THEN 'verified'
            WHEN cv.veracity_score >= 0.5 THEN 'likely_true'
            WHEN cv.veracity_score >= 0.3 THEN 'uncertain'
            WHEN cv.veracity_score < 0.3 THEN 'disputed'
            ELSE 'unverified'
        END AS status
    FROM public."ExtractedClaims" ec
    LEFT JOIN public."ClaimVerifications" cv ON cv.claim_id = ec.id
    WHERE ec.id = p_claim_id;
END;
$$;


ALTER FUNCTION public.get_claim_verification_status(p_claim_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_claim_verification_status(p_claim_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_claim_verification_status(p_claim_id uuid) IS 'Get comprehensive verification status for a claim including evidence counts';


--
-- Name: get_comment_thread(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_comment_thread(root_comment_id uuid) RETURNS TABLE(id uuid, text text, author_id uuid, parent_comment_id uuid, depth integer, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE comment_tree AS (
        -- Base case: root comment
        SELECT
            c.id,
            c.text,
            c.author_id,
            c.parent_comment_id,
            0 AS depth,
            c.created_at
        FROM public."Comments" c
        WHERE c.id = root_comment_id

        UNION ALL

        -- Recursive case: replies
        SELECT
            c.id,
            c.text,
            c.author_id,
            c.parent_comment_id,
            ct.depth + 1,
            c.created_at
        FROM public."Comments" c
        INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
    )
    SELECT * FROM comment_tree ORDER BY depth, created_at;
END;
$$;


ALTER FUNCTION public.get_comment_thread(root_comment_id uuid) OWNER TO postgres;

--
-- Name: get_embedding_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_embedding_config() RETURNS TABLE(enabled boolean, embedding_model text, chunk_size integer, chunk_overlap integer, batch_size integer, worker_pool_size integer, poll_interval_seconds integer, retry_backoff_multiplier numeric, ai_service_address text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((n.props->>'enabled')::BOOLEAN, true) AS enabled,
        COALESCE(n.props->>'embedding_model', 'text-embedding-3-small') AS embedding_model,
        COALESCE((n.props->>'chunk_size')::INT, 500) AS chunk_size,
        COALESCE((n.props->>'chunk_overlap')::INT, 50) AS chunk_overlap,
        COALESCE((n.props->>'batch_size')::INT, 10) AS batch_size,
        COALESCE((n.props->>'worker_pool_size')::INT, 5) AS worker_pool_size,
        COALESCE((n.props->>'poll_interval_seconds')::INT, 1) AS poll_interval_seconds,
        COALESCE((n.props->>'retry_backoff_multiplier')::NUMERIC, 2.0) AS retry_backoff_multiplier,
        COALESCE(n.props->>'ai_service_address', 'ai-service:50053') AS ai_service_address
    FROM nodes n
    JOIN node_types nt ON n.node_type_id = nt.id
    WHERE nt.name = 'system:embedding_config'
    ORDER BY n.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION public.get_embedding_config() OWNER TO postgres;

--
-- Name: FUNCTION get_embedding_config(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_embedding_config() IS 'Retrieves current embedding configuration from config node';


--
-- Name: get_reaction_counts(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_reaction_counts(post_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_object_agg(reaction_type, count), '{}'::jsonb)
        FROM (
            SELECT reaction_type, COUNT(*)::int as count
            FROM public."ActivityReactions"
            WHERE post_id = post_uuid
            GROUP BY reaction_type
        ) counts
    );
END;
$$;


ALTER FUNCTION public.get_reaction_counts(post_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_reaction_counts(post_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_reaction_counts(post_uuid uuid) IS 'Returns JSONB object with reaction type counts for a post';


--
-- Name: get_reply_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_reply_count(post_uuid uuid) RETURNS bigint
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public."ActivityPosts"
        WHERE parent_post_id = post_uuid
        AND deleted_at IS NULL
    );
END;
$$;


ALTER FUNCTION public.get_reply_count(post_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_reply_count(post_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_reply_count(post_uuid uuid) IS 'Returns count of replies for a given post';


--
-- Name: get_share_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_share_count(post_uuid uuid) RETURNS bigint
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public."ActivityPosts"
        WHERE shared_post_id = post_uuid
        AND deleted_at IS NULL
    );
END;
$$;


ALTER FUNCTION public.get_share_count(post_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_share_count(post_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_share_count(post_uuid uuid) IS 'Returns count of shares for a given post';


--
-- Name: get_transcript_statistics(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_transcript_statistics(p_transcription_id uuid) RETURNS TABLE(total_segments integer, total_words integer, avg_segment_duration numeric, avg_words_per_segment numeric, total_duration numeric, speaker_count integer, avg_confidence numeric, language character varying, processing_time_ms integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(ts.id)::integer AS total_segments,
        at.word_count AS total_words,
        AVG(ts.end_time - ts.start_time) AS avg_segment_duration,
        (at.word_count::decimal / NULLIF(COUNT(ts.id), 0)) AS avg_words_per_segment,
        at.duration_seconds AS total_duration,
        COUNT(DISTINCT ts.speaker_id)::integer AS speaker_count,
        AVG(ts.confidence) AS avg_confidence,
        at.language,
        at.processing_time_ms
    FROM public."AudioTranscriptions" at
    LEFT JOIN public."TranscriptSegments" ts ON at.id = ts.transcription_id
    WHERE at.id = p_transcription_id
    GROUP BY at.id;
END;
$$;


ALTER FUNCTION public.get_transcript_statistics(p_transcription_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_transcript_statistics(p_transcription_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_transcript_statistics(p_transcription_id uuid) IS 'Calculate detailed statistics for a transcription';


--
-- Name: get_video_timeline(uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_video_timeline(p_file_id uuid, p_include_all_frames boolean DEFAULT false) RETURNS TABLE(event_type text, event_id uuid, timestamp_seconds numeric, description text, has_ocr_text boolean)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    -- Include scenes
    SELECT
        'scene'::text AS event_type,
        vs.id AS event_id,
        vs.start_time AS timestamp_seconds,
        COALESCE(vs.description, 'Scene ' || vs.scene_number::text) AS description,
        false AS has_ocr_text
    FROM public."VideoScenes" vs
    WHERE vs.file_id = p_file_id

    UNION ALL

    -- Include frames (all or only with OCR)
    SELECT
        'frame'::text AS event_type,
        vf.id AS event_id,
        vf.timestamp_seconds,
        COALESCE(LEFT(vf.ocr_text, 100), 'Frame ' || vf.frame_number::text) AS description,
        (vf.ocr_text IS NOT NULL) AS has_ocr_text
    FROM public."VideoFrames" vf
    WHERE vf.file_id = p_file_id
      AND (p_include_all_frames OR vf.ocr_text IS NOT NULL)

    ORDER BY timestamp_seconds ASC;
END;
$$;


ALTER FUNCTION public.get_video_timeline(p_file_id uuid, p_include_all_frames boolean) OWNER TO postgres;

--
-- Name: FUNCTION get_video_timeline(p_file_id uuid, p_include_all_frames boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_video_timeline(p_file_id uuid, p_include_all_frames boolean) IS 'Chronological timeline of frames and scenes for a video';


--
-- Name: log_evidence_audit(uuid, public.evidence_audit_action, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_evidence_audit(p_evidence_id uuid, p_action public.evidence_audit_action, p_actor_id uuid DEFAULT NULL::uuid, p_changes jsonb DEFAULT NULL::jsonb, p_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.log_evidence_audit(p_evidence_id uuid, p_action public.evidence_audit_action, p_actor_id uuid, p_changes jsonb, p_description text) OWNER TO postgres;

--
-- Name: queue_embedding_job(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.queue_embedding_job() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    config_enabled BOOLEAN;
    node_type_name TEXT;
BEGIN
    -- Get the node type name to check if this is a system node
    SELECT nt.name INTO node_type_name
    FROM node_types nt
    WHERE nt.id = NEW.node_type_id;

    -- Skip embedding for system nodes (avoid infinite loops)
    IF node_type_name LIKE 'system:%' THEN
        RETURN NEW;
    END IF;

    -- Check if embeddings are enabled from config node
    SELECT enabled INTO config_enabled
    FROM get_embedding_config()
    LIMIT 1;

    -- Default to true if config not found
    IF config_enabled IS NULL THEN
        config_enabled := true;
    END IF;

    -- Only queue job if enabled and props exist
    IF config_enabled AND NEW.props IS NOT NULL AND jsonb_typeof(NEW.props) = 'object' THEN
        -- Insert job into queue
        -- Use ON CONFLICT DO NOTHING to prevent duplicate jobs for same node
        -- The unique index ensures only one pending/processing job per node exists
        INSERT INTO sys.embedding_jobs (node_id, props, status, attempts)
        VALUES (NEW.id, NEW.props, 'pending', 0)
        ON CONFLICT (node_id) WHERE status IN ('pending', 'processing') DO NOTHING;

        -- Notify workers that a new job is available (non-blocking)
        PERFORM pg_notify('embedding_job_created', json_build_object(
            'node_id', NEW.id,
            'node_type', node_type_name,
            'queued_at', NOW()
        )::TEXT);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to queue embedding job for node %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION public.queue_embedding_job() OWNER TO postgres;

--
-- Name: FUNCTION queue_embedding_job(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.queue_embedding_job() IS 'Queues node for async embedding generation via sys.embedding_jobs';


--
-- Name: refresh_inquiry_vote_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_inquiry_vote_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public."InquiryVoteStats";
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.refresh_inquiry_vote_stats() OWNER TO postgres;

--
-- Name: refresh_veracity_score(text, uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_veracity_score(target_type text, target_id uuid, change_reason text DEFAULT 'scheduled_recalculation'::text, triggering_entity_type text DEFAULT NULL::text, triggering_entity_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_score REAL;
    old_score REAL;
    v_score_id uuid;
    v_evidence_count INTEGER;
    v_supporting_weight REAL;
    v_refuting_weight REAL;
    v_consensus REAL;
    v_challenge_impact REAL;
    v_challenge_count INTEGER;
BEGIN
    -- Calculate new score
    new_score := calculate_veracity_score(target_type, target_id);

    -- Gather additional metrics
    IF target_type = 'node' THEN
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO v_evidence_count, v_supporting_weight, v_refuting_weight
        FROM public."Evidence"
        WHERE target_node_id = target_id;

        SELECT COUNT(*) INTO v_challenge_count
        FROM public."Challenges"
        WHERE target_node_id = target_id AND status = 'open';
    ELSE
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN evidence_type = 'supporting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN evidence_type = 'refuting'
                        THEN calculate_evidence_weight(id) ELSE 0 END), 0)
        INTO v_evidence_count, v_supporting_weight, v_refuting_weight
        FROM public."Evidence"
        WHERE target_edge_id = target_id;

        SELECT COUNT(*) INTO v_challenge_count
        FROM public."Challenges"
        WHERE target_edge_id = target_id AND status = 'open';
    END IF;

    v_consensus := calculate_consensus_score(target_type, target_id);
    v_challenge_impact := calculate_challenge_impact(target_type, target_id);

    -- Upsert veracity score
    IF target_type = 'node' THEN
        INSERT INTO public."VeracityScores" (
            target_node_id,
            veracity_score,
            evidence_count,
            supporting_evidence_weight,
            refuting_evidence_weight,
            evidence_weight_sum,
            consensus_score,
            challenge_count,
            open_challenge_count,
            challenge_impact,
            calculated_at
        ) VALUES (
            target_id,
            new_score,
            v_evidence_count,
            v_supporting_weight,
            v_refuting_weight,
            v_supporting_weight + v_refuting_weight,
            v_consensus,
            v_challenge_count,
            v_challenge_count,
            v_challenge_impact,
            now()
        )
        ON CONFLICT (target_node_id) DO UPDATE SET
            veracity_score = EXCLUDED.veracity_score,
            evidence_count = EXCLUDED.evidence_count,
            supporting_evidence_weight = EXCLUDED.supporting_evidence_weight,
            refuting_evidence_weight = EXCLUDED.refuting_evidence_weight,
            evidence_weight_sum = EXCLUDED.evidence_weight_sum,
            consensus_score = EXCLUDED.consensus_score,
            challenge_count = EXCLUDED.challenge_count,
            open_challenge_count = EXCLUDED.open_challenge_count,
            challenge_impact = EXCLUDED.challenge_impact,
            calculated_at = EXCLUDED.calculated_at,
            updated_at = now()
        RETURNING id, veracity_score INTO v_score_id, old_score;

        -- Get old score for history
        old_score := COALESCE(
            (SELECT veracity_score FROM public."VeracityScores" WHERE target_node_id = target_id),
            0.5
        );
    ELSE
        INSERT INTO public."VeracityScores" (
            target_edge_id,
            veracity_score,
            evidence_count,
            supporting_evidence_weight,
            refuting_evidence_weight,
            evidence_weight_sum,
            consensus_score,
            challenge_count,
            open_challenge_count,
            challenge_impact,
            calculated_at
        ) VALUES (
            target_id,
            new_score,
            v_evidence_count,
            v_supporting_weight,
            v_refuting_weight,
            v_supporting_weight + v_refuting_weight,
            v_consensus,
            v_challenge_count,
            v_challenge_count,
            v_challenge_impact,
            now()
        )
        ON CONFLICT (target_edge_id) DO UPDATE SET
            veracity_score = EXCLUDED.veracity_score,
            evidence_count = EXCLUDED.evidence_count,
            supporting_evidence_weight = EXCLUDED.supporting_evidence_weight,
            refuting_evidence_weight = EXCLUDED.refuting_evidence_weight,
            evidence_weight_sum = EXCLUDED.evidence_weight_sum,
            consensus_score = EXCLUDED.consensus_score,
            challenge_count = EXCLUDED.challenge_count,
            open_challenge_count = EXCLUDED.open_challenge_count,
            challenge_impact = EXCLUDED.challenge_impact,
            calculated_at = EXCLUDED.calculated_at,
            updated_at = now()
        RETURNING id, veracity_score INTO v_score_id, old_score;

        old_score := COALESCE(
            (SELECT veracity_score FROM public."VeracityScores" WHERE target_edge_id = target_id),
            0.5
        );
    END IF;

    -- Create history entry if score changed significantly
    IF ABS(new_score - old_score) > 0.01 THEN
        INSERT INTO public."VeracityScoreHistory" (
            veracity_score_id,
            old_score,
            new_score,
            score_delta,
            change_reason,
            triggering_entity_type,
            triggering_entity_id,
            changed_by
        ) VALUES (
            v_score_id,
            old_score,
            new_score,
            new_score - old_score,
            change_reason,
            triggering_entity_type,
            triggering_entity_id,
            'system'
        );
    END IF;

    RETURN v_score_id;
END;
$$;


ALTER FUNCTION public.refresh_veracity_score(target_type text, target_id uuid, change_reason text, triggering_entity_type text, triggering_entity_id uuid) OWNER TO postgres;

--
-- Name: reset_daily_challenge_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_daily_challenge_count() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."UserReputation"
    SET challenges_today = 0
    WHERE last_challenge_at < CURRENT_DATE;
END;
$$;


ALTER FUNCTION public.reset_daily_challenge_count() OWNER TO postgres;

--
-- Name: resolve_challenge(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resolve_challenge(p_challenge_id uuid, p_resolver_id uuid, p_resolution_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_challenge RECORD;
    v_resolution TEXT;
    v_veracity_impact REAL;
    v_resolution_id uuid;
    v_acceptance_threshold REAL;
BEGIN
    -- Get challenge details
    SELECT c.*, ct.acceptance_threshold, ct.max_veracity_impact
    INTO v_challenge
    FROM public."Challenges" c
    JOIN public."ChallengeTypes" ct ON c.challenge_type_id = ct.id
    WHERE c.id = p_challenge_id;
    
    -- Determine resolution based on support percentage
    IF v_challenge.support_percentage >= v_challenge.acceptance_threshold THEN
        v_resolution := 'accepted';
        v_veracity_impact := -v_challenge.max_veracity_impact * v_challenge.support_percentage;
    ELSIF v_challenge.support_percentage >= (v_challenge.acceptance_threshold * 0.5) THEN
        v_resolution := 'partially_accepted';
        v_veracity_impact := -v_challenge.max_veracity_impact * v_challenge.support_percentage * 0.5;
    ELSE
        v_resolution := 'rejected';
        v_veracity_impact := 0;
    END IF;
    
    -- Update challenge status
    UPDATE public."Challenges"
    SET 
        status = 'resolved',
        resolution = v_resolution,
        resolution_reason = p_resolution_reason,
        resolved_by = p_resolver_id,
        resolved_at = now(),
        veracity_impact = v_veracity_impact,
        updated_at = now()
    WHERE id = p_challenge_id;
    
    -- Create resolution record
    INSERT INTO public."ChallengeResolutions" (
        challenge_id,
        resolution_type,
        resolution_summary,
        detailed_reasoning,
        veracity_impact,
        total_votes,
        support_votes,
        reject_votes,
        weighted_support_percentage,
        resolved_by,
        resolver_role
    ) VALUES (
        p_challenge_id,
        v_resolution,
        COALESCE(p_resolution_reason, 'Resolved based on community voting'),
        NULL,
        v_veracity_impact,
        v_challenge.vote_count,
        v_challenge.support_votes,
        v_challenge.reject_votes,
        v_challenge.support_percentage,
        p_resolver_id,
        'community'
    ) RETURNING id INTO v_resolution_id;
    
    -- Update veracity score if challenge was accepted
    IF v_veracity_impact < 0 THEN
        IF v_challenge.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', v_challenge.target_node_id, 'challenge_resolved', 'challenge', p_challenge_id);
        ELSIF v_challenge.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', v_challenge.target_edge_id, 'challenge_resolved', 'challenge', p_challenge_id);
        END IF;
    END IF;
    
    -- Update challenger reputation
    IF v_resolution IN ('accepted', 'partially_accepted') THEN
        UPDATE public."UserReputation"
        SET 
            reputation_score = reputation_score + 10,
            challenges_accepted = challenges_accepted + 1,
            accuracy_rate = challenges_accepted::REAL / NULLIF(challenges_submitted, 0),
            updated_at = now()
        WHERE user_id = v_challenge.challenger_id;
    ELSE
        UPDATE public."UserReputation"
        SET 
            challenges_rejected = challenges_rejected + 1,
            accuracy_rate = challenges_accepted::REAL / NULLIF(challenges_submitted, 0),
            updated_at = now()
        WHERE user_id = v_challenge.challenger_id;
    END IF;
    
    RETURN v_resolution_id;
END;
$$;


ALTER FUNCTION public.resolve_challenge(p_challenge_id uuid, p_resolver_id uuid, p_resolution_reason text) OWNER TO postgres;

--
-- Name: search_audio_transcripts(text, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_audio_transcripts(p_search_query text, p_language text DEFAULT NULL::text, p_limit integer DEFAULT 10) RETURNS TABLE(transcription_id uuid, file_id uuid, filename text, language character varying, duration_seconds numeric, match_snippet text, relevance real, processed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.id AS transcription_id,
        at.file_id,
        ef.original_filename AS filename,
        at.language,
        at.duration_seconds,
        ts_headline('english', at.transcript_text, plainto_tsquery('english', p_search_query),
            'MaxWords=50, MinWords=25') AS match_snippet,
        ts_rank(at.content_vector, plainto_tsquery('english', p_search_query)) AS relevance,
        at.processed_at
    FROM public."AudioTranscriptions" at
    JOIN public."EvidenceFiles" ef ON at.file_id = ef.id
    WHERE at.content_vector @@ plainto_tsquery('english', p_search_query)
        AND (p_language IS NULL OR at.language = p_language)
    ORDER BY relevance DESC, at.processed_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.search_audio_transcripts(p_search_query text, p_language text, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION search_audio_transcripts(p_search_query text, p_language text, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_audio_transcripts(p_search_query text, p_language text, p_limit integer) IS 'Full-text search across audio transcriptions with relevance ranking';


--
-- Name: search_conversation_history(uuid, public.vector, integer, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_conversation_history(p_conversation_id uuid, p_query_embedding public.vector, p_limit integer DEFAULT 10, p_threshold numeric DEFAULT 0.7) RETURNS TABLE(message_id uuid, role text, content text, similarity_score numeric, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.role,
        cm.content,
        ROUND((1 - (cm.embedding <=> p_query_embedding))::numeric, 4) AS similarity_score,
        cm.created_at
    FROM public."ConversationMessages" cm
    WHERE cm.conversation_id = p_conversation_id
        AND cm.embedding IS NOT NULL
        AND (1 - (cm.embedding <=> p_query_embedding)) >= p_threshold
    ORDER BY cm.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.search_conversation_history(p_conversation_id uuid, p_query_embedding public.vector, p_limit integer, p_threshold numeric) OWNER TO postgres;

--
-- Name: FUNCTION search_conversation_history(p_conversation_id uuid, p_query_embedding public.vector, p_limit integer, p_threshold numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_conversation_history(p_conversation_id uuid, p_query_embedding public.vector, p_limit integer, p_threshold numeric) IS 'Search conversation messages by semantic similarity to query embedding';


--
-- Name: search_document_content(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_document_content(p_search_query text, p_limit integer DEFAULT 10) RETURNS TABLE(content_type text, content_id uuid, file_id uuid, filename text, match_text text, relevance real)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    -- Search in sections
    SELECT
        'section'::text AS content_type,
        ds.id AS content_id,
        ds.file_id,
        ef.filename,
        ds.heading || ': ' || LEFT(ds.content, 200) AS match_text,
        ts_rank(ds.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentSections" ds
    JOIN public."EvidenceFiles" ef ON ds.file_id = ef.id
    WHERE ds.content_vector @@ plainto_tsquery('english', p_search_query)

    UNION ALL

    -- Search in tables
    SELECT
        'table'::text AS content_type,
        dt.id AS content_id,
        dt.file_id,
        ef.filename,
        COALESCE(dt.caption, 'Table on page ' || dt.page_number::text) AS match_text,
        ts_rank(dt.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentTables" dt
    JOIN public."EvidenceFiles" ef ON dt.file_id = ef.id
    WHERE dt.content_vector @@ plainto_tsquery('english', p_search_query)

    UNION ALL

    -- Search in figures
    SELECT
        'figure'::text AS content_type,
        df.id AS content_id,
        df.file_id,
        ef.filename,
        COALESCE(df.caption, 'Figure on page ' || df.page_number::text) AS match_text,
        ts_rank(df.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."DocumentFigures" df
    JOIN public."EvidenceFiles" ef ON df.file_id = ef.id
    WHERE df.content_vector @@ plainto_tsquery('english', p_search_query)

    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.search_document_content(p_search_query text, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION search_document_content(p_search_query text, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_document_content(p_search_query text, p_limit integer) IS 'Full-text search across all document content types';


--
-- Name: search_transcript_segments_by_time(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_transcript_segments_by_time(p_transcription_id uuid, p_start_time numeric, p_end_time numeric) RETURNS TABLE(segment_id uuid, segment_order integer, start_time numeric, end_time numeric, text text, speaker_id integer, speaker_label character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ts.id AS segment_id,
        ts.segment_order,
        ts.start_time,
        ts.end_time,
        ts.text,
        ts.speaker_id,
        ts.speaker_label
    FROM public."TranscriptSegments" ts
    WHERE ts.transcription_id = p_transcription_id
        AND ts.start_time <= p_end_time
        AND ts.end_time >= p_start_time
    ORDER BY ts.segment_order;
END;
$$;


ALTER FUNCTION public.search_transcript_segments_by_time(p_transcription_id uuid, p_start_time numeric, p_end_time numeric) OWNER TO postgres;

--
-- Name: FUNCTION search_transcript_segments_by_time(p_transcription_id uuid, p_start_time numeric, p_end_time numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_transcript_segments_by_time(p_transcription_id uuid, p_start_time numeric, p_end_time numeric) IS 'Search transcript segments within a time range';


--
-- Name: search_video_content(text, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_video_content(p_search_query text, p_file_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20) RETURNS TABLE(content_type text, content_id uuid, file_id uuid, filename text, match_text text, timestamp_seconds numeric, relevance real)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    -- Search in frame OCR text
    SELECT
        'frame_ocr'::text AS content_type,
        vf.id AS content_id,
        vf.file_id,
        ef.original_filename AS filename,
        LEFT(vf.ocr_text, 200) AS match_text,
        vf.timestamp_seconds,
        ts_rank(vf.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."VideoFrames" vf
    JOIN public."EvidenceFiles" ef ON vf.file_id = ef.id
    WHERE vf.content_vector @@ plainto_tsquery('english', p_search_query)
      AND (p_file_id IS NULL OR vf.file_id = p_file_id)

    UNION ALL

    -- Search in scene descriptions
    SELECT
        'scene_description'::text AS content_type,
        vs.id AS content_id,
        vs.file_id,
        ef.original_filename AS filename,
        COALESCE(vs.description, 'Scene ' || vs.scene_number::text) AS match_text,
        vs.start_time AS timestamp_seconds,
        ts_rank(vs.content_vector, plainto_tsquery('english', p_search_query)) AS relevance
    FROM public."VideoScenes" vs
    JOIN public."EvidenceFiles" ef ON vs.file_id = ef.id
    WHERE vs.content_vector @@ plainto_tsquery('english', p_search_query)
      AND (p_file_id IS NULL OR vs.file_id = p_file_id)

    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.search_video_content(p_search_query text, p_file_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION search_video_content(p_search_query text, p_file_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_video_content(p_search_query text, p_file_id uuid, p_limit integer) IS 'Full-text search across video OCR text and scene descriptions';


--
-- Name: trigger_detect_duplicates_on_upload(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_detect_duplicates_on_upload() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_detect_duplicates_on_upload() OWNER TO postgres;

--
-- Name: trigger_evidence_audit_log(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_evidence_audit_log() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_evidence_audit_log() OWNER TO postgres;

--
-- Name: trigger_node_version_history(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_node_version_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    changes JSONB;
BEGIN
    -- Build changes object comparing OLD and NEW
    changes := jsonb_build_object();

    IF OLD.title IS DISTINCT FROM NEW.title THEN
        changes := changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;

    IF OLD.props IS DISTINCT FROM NEW.props THEN
        changes := changes || jsonb_build_object('props', jsonb_build_object('old', OLD.props, 'new', NEW.props));
    END IF;

    IF OLD.weight IS DISTINCT FROM NEW.weight THEN
        changes := changes || jsonb_build_object('weight', jsonb_build_object('old', OLD.weight, 'new', NEW.weight));
    END IF;

    -- Only record if there are actual changes
    IF changes != '{}'::jsonb THEN
        -- Append version history (user_id will be from created_by, operation is 'update')
        PERFORM append_node_version_history(
            NEW.id,
            COALESCE(NEW.created_by, OLD.created_by),
            'update',
            changes,
            NEW.props->'position'
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_node_version_history() OWNER TO postgres;

--
-- Name: trigger_set_voting_deadline(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_voting_deadline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_voting_hours INTEGER;
BEGIN
    -- Get voting duration from challenge type
    SELECT voting_duration_hours 
    INTO v_voting_hours
    FROM public."ChallengeTypes"
    WHERE id = NEW.challenge_type_id;
    
    -- Set voting deadline
    NEW.voting_ends_at := now() + (v_voting_hours || ' hours')::INTERVAL;
    
    -- Initialize user reputation if needed
    INSERT INTO public."UserReputation" (user_id)
    VALUES (NEW.challenger_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update challenger statistics
    UPDATE public."UserReputation"
    SET 
        challenges_submitted = challenges_submitted + 1,
        challenges_pending = challenges_pending + 1,
        challenges_today = challenges_today + 1,
        last_challenge_at = now(),
        last_active_at = now()
    WHERE user_id = NEW.challenger_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_voting_deadline() OWNER TO postgres;

--
-- Name: trigger_source_credibility_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_source_credibility_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_source_credibility(NEW.source_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_source_credibility(OLD.source_id);
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION public.trigger_source_credibility_update() OWNER TO postgres;

--
-- Name: trigger_update_challenge_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_challenge_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM update_challenge_voting_stats(NEW.challenge_id);
    
    -- Update voter reputation for participation
    PERFORM award_reputation_points(NEW.user_id, 'vote_cast', 1);
    
    UPDATE public."UserReputation"
    SET 
        votes_cast = votes_cast + 1,
        participation_rate = LEAST(1.0, participation_rate + 0.01),
        last_active_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_update_challenge_stats() OWNER TO postgres;

--
-- Name: trigger_update_evidence_search_index(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_evidence_search_index() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_evidence_search_index(NEW.evidence_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_evidence_search_index(OLD.evidence_id);
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION public.trigger_update_evidence_search_index() OWNER TO postgres;

--
-- Name: trigger_update_review_helpfulness(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_review_helpfulness() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_update_review_helpfulness() OWNER TO postgres;

--
-- Name: trigger_veracity_refresh_on_challenge(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_veracity_refresh_on_challenge() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'challenge_created', 'challenge', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'challenge_created', 'challenge', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'challenge_resolved', 'challenge', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'challenge_resolved', 'challenge', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', OLD.target_node_id, 'challenge_resolved', 'challenge', OLD.id);
        ELSIF OLD.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', OLD.target_edge_id, 'challenge_resolved', 'challenge', OLD.id);
        END IF;
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION public.trigger_veracity_refresh_on_challenge() OWNER TO postgres;

--
-- Name: trigger_veracity_refresh_on_evidence(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_veracity_refresh_on_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refresh score for affected node or edge
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', NEW.target_node_id, 'new_evidence', 'evidence', NEW.id);
        ELSIF NEW.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', NEW.target_edge_id, 'new_evidence', 'evidence', NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_node_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('node', OLD.target_node_id, 'evidence_removed', 'evidence', OLD.id);
        ELSIF OLD.target_edge_id IS NOT NULL THEN
            PERFORM refresh_veracity_score('edge', OLD.target_edge_id, 'evidence_removed', 'evidence', OLD.id);
        END IF;
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION public.trigger_veracity_refresh_on_evidence() OWNER TO postgres;

--
-- Name: update_activity_post_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_activity_post_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_activity_post_timestamp() OWNER TO postgres;

--
-- Name: update_audio_timestamps(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_audio_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_audio_timestamps() OWNER TO postgres;

--
-- Name: update_audio_transcription_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_audio_transcription_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.content_vector := to_tsvector('english', COALESCE(NEW.transcript_text, ''));
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_audio_transcription_search_vector() OWNER TO postgres;

--
-- Name: update_audio_transcription_word_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_audio_transcription_word_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.transcript_text IS NOT NULL THEN
        NEW.word_count := array_length(
            regexp_split_to_array(trim(NEW.transcript_text), '\s+'),
            1
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_audio_transcription_word_count() OWNER TO postgres;

--
-- Name: update_challenge_voting_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_challenge_voting_stats(p_challenge_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_votes INTEGER;
    v_support_votes INTEGER;
    v_reject_votes INTEGER;
    v_support_percentage REAL;
    v_weighted_support REAL;
    v_weighted_total REAL;
BEGIN
    -- Count votes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE vote = 'support'),
        COUNT(*) FILTER (WHERE vote = 'reject'),
        COALESCE(SUM(weight) FILTER (WHERE vote = 'support'), 0),
        COALESCE(SUM(weight), 0)
    INTO 
        v_total_votes,
        v_support_votes,
        v_reject_votes,
        v_weighted_support,
        v_weighted_total
    FROM public."ChallengeVotes"
    WHERE challenge_id = p_challenge_id AND vote != 'abstain';
    
    -- Calculate support percentage
    IF v_weighted_total > 0 THEN
        v_support_percentage := v_weighted_support / v_weighted_total;
    ELSE
        v_support_percentage := 0;
    END IF;
    
    -- Update challenge stats
    UPDATE public."Challenges"
    SET 
        vote_count = v_total_votes,
        support_votes = v_support_votes,
        reject_votes = v_reject_votes,
        support_percentage = v_support_percentage,
        updated_at = now()
    WHERE id = p_challenge_id;
END;
$$;


ALTER FUNCTION public.update_challenge_voting_stats(p_challenge_id uuid) OWNER TO postgres;

--
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."Conversations"
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_conversation_timestamp() OWNER TO postgres;

--
-- Name: update_document_figure_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_document_figure_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.content_vector := to_tsvector('english', COALESCE(NEW.caption, ''));
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_document_figure_search_vector() OWNER TO postgres;

--
-- Name: update_document_section_metadata(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_document_section_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.content_vector := to_tsvector('english',
        COALESCE(NEW.heading, '') || ' ' ||
        COALESCE(NEW.content, '')
    );
    NEW.word_count := array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_document_section_metadata() OWNER TO postgres;

--
-- Name: update_document_table_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_document_table_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.content_vector := to_tsvector('english',
        COALESCE(NEW.caption, '') || ' ' ||
        COALESCE(NEW.rows::text, '')
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_document_table_search_vector() OWNER TO postgres;

--
-- Name: update_methodology_usage(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_methodology_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.methodology_id IS NOT NULL THEN
        UPDATE public."Methodologies"
        SET usage_count = usage_count + 1
        WHERE id = NEW.methodology_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_methodology_usage() OWNER TO postgres;

--
-- Name: update_node_meta_diff_log(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_node_meta_diff_log() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    diff_entry JSONB;
    old_props JSONB;
    new_props JSONB;
    changed_keys TEXT[];
    key TEXT;
BEGIN
    -- Only process updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.props IS DISTINCT FROM NEW.props THEN

        -- Build diff object with timestamp
        diff_entry := jsonb_build_object('updated_at', NOW());
        old_props := COALESCE(OLD.props, '{}'::JSONB);
        new_props := COALESCE(NEW.props, '{}'::JSONB);

        -- Find all keys that changed (added, removed, or modified)
        SELECT ARRAY_AGG(DISTINCT key)
        INTO changed_keys
        FROM (
            SELECT key FROM jsonb_each(old_props)
            UNION
            SELECT key FROM jsonb_each(new_props)
        ) AS all_keys
        WHERE old_props->key IS DISTINCT FROM new_props->key;

        -- Add old values for changed keys to diff_entry
        IF changed_keys IS NOT NULL AND array_length(changed_keys, 1) > 0 THEN
            FOREACH key IN ARRAY changed_keys
            LOOP
                IF old_props ? key THEN
                    diff_entry := diff_entry || jsonb_build_object(key, old_props->key);
                ELSE
                    diff_entry := diff_entry || jsonb_build_object(key, NULL);
                END IF;
            END LOOP;

            -- Initialize meta if needed
            IF NEW.meta IS NULL THEN
                NEW.meta := '{}'::JSONB;
            END IF;

            -- Append to diff_log array in meta
            IF NEW.meta ? 'diff_log' THEN
                NEW.meta := jsonb_set(
                    NEW.meta,
                    '{diff_log}',
                    (NEW.meta->'diff_log') || jsonb_build_array(diff_entry)
                );
            ELSE
                NEW.meta := NEW.meta || jsonb_build_object(
                    'diff_log', jsonb_build_array(diff_entry)
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_node_meta_diff_log() OWNER TO postgres;

--
-- Name: FUNCTION update_node_meta_diff_log(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_node_meta_diff_log() IS 'Maintains audit log of prop changes in meta.diff_log';


--
-- Name: update_source_credibility(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_source_credibility(p_source_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_evidence INTEGER;
    v_verified_evidence INTEGER;
    v_challenged_evidence INTEGER;
    v_challenge_ratio REAL;
    v_consensus_alignment REAL;
    v_credibility_score REAL;
BEGIN
    -- Count evidence statistics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_verified = true),
        COUNT(*) FILTER (WHERE id IN (
            SELECT DISTINCT evidence_id
            FROM public."EvidenceVotes"
            WHERE vote_type = 'misleading'
        ))
    INTO v_total_evidence, v_verified_evidence, v_challenged_evidence
    FROM public."Evidence"
    WHERE source_id = p_source_id;

    -- Calculate challenge ratio
    IF v_total_evidence > 0 THEN
        v_challenge_ratio := v_challenged_evidence::REAL / v_total_evidence;
    ELSE
        v_challenge_ratio := 0.0;
    END IF;

    -- Calculate consensus alignment (simplified)
    -- In production, this would compare source's evidence against consensus
    v_consensus_alignment := 0.5;  -- Placeholder

    -- Calculate credibility score
    -- Formula: (verified_ratio * 0.4) + ((1 - challenge_ratio) * 0.3) + (consensus_alignment * 0.3)
    v_credibility_score :=
        (CASE WHEN v_total_evidence > 0
         THEN (v_verified_evidence::REAL / v_total_evidence) * 0.4
         ELSE 0.2 END) +
        ((1.0 - v_challenge_ratio) * 0.3) +
        (v_consensus_alignment * 0.3);

    -- Clamp to [0, 1]
    v_credibility_score := GREATEST(0.0, LEAST(1.0, v_credibility_score));

    -- Upsert credibility score
    INSERT INTO public."SourceCredibility" (
        source_id,
        credibility_score,
        total_evidence_count,
        verified_evidence_count,
        challenged_evidence_count,
        challenge_ratio,
        consensus_alignment_score,
        last_calculated_at
    ) VALUES (
        p_source_id,
        v_credibility_score,
        v_total_evidence,
        v_verified_evidence,
        v_challenged_evidence,
        v_challenge_ratio,
        v_consensus_alignment,
        now()
    )
    ON CONFLICT (source_id) DO UPDATE SET
        credibility_score = EXCLUDED.credibility_score,
        total_evidence_count = EXCLUDED.total_evidence_count,
        verified_evidence_count = EXCLUDED.verified_evidence_count,
        challenged_evidence_count = EXCLUDED.challenged_evidence_count,
        challenge_ratio = EXCLUDED.challenge_ratio,
        consensus_alignment_score = EXCLUDED.consensus_alignment_score,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = now();
END;
$$;


ALTER FUNCTION public.update_source_credibility(p_source_id uuid) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_video_frame_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_video_frame_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.ocr_text IS NOT NULL THEN
        NEW.content_vector := to_tsvector('english', COALESCE(NEW.ocr_text, ''));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_video_frame_search_vector() OWNER TO postgres;

--
-- Name: update_video_metadata_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_video_metadata_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update VideoMetadata counts when frames or scenes change
    UPDATE public."VideoMetadata" vm
    SET
        extracted_frames = (
            SELECT COUNT(*) FROM public."VideoFrames" vf WHERE vf.file_id = vm.file_id
        ),
        scene_count = (
            SELECT COUNT(*) FROM public."VideoScenes" vs WHERE vs.file_id = vm.file_id
        ),
        ocr_text_length = (
            SELECT COALESCE(SUM(LENGTH(ocr_text)), 0)
            FROM public."VideoFrames" vf
            WHERE vf.file_id = vm.file_id
        ),
        updated_at = now()
    WHERE vm.file_id = COALESCE(NEW.file_id, OLD.file_id);

    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_video_metadata_counts() OWNER TO postgres;

--
-- Name: update_video_scene_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_video_scene_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.description IS NOT NULL THEN
        NEW.content_vector := to_tsvector('english', COALESCE(NEW.description, ''));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_video_scene_search_vector() OWNER TO postgres;

--
-- Name: user_has_reacted(uuid, uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_has_reacted(post_uuid uuid, user_uuid uuid, reaction character varying) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public."ActivityReactions"
        WHERE post_id = post_uuid
        AND user_id = user_uuid
        AND reaction_type = reaction
    );
END;
$$;


ALTER FUNCTION public.user_has_reacted(post_uuid uuid, user_uuid uuid, reaction character varying) OWNER TO postgres;

--
-- Name: FUNCTION user_has_reacted(post_uuid uuid, user_uuid uuid, reaction character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.user_has_reacted(post_uuid uuid, user_uuid uuid, reaction character varying) IS 'Check if a user has reacted with a specific reaction type to a post';


--
-- Name: validate_edge_methodology_type(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_edge_methodology_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    graph_methodology_id uuid;
    edge_methodology_id uuid;
BEGIN
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.methodology_edge_type_id IS NOT NULL THEN
        SELECT methodology_id INTO edge_methodology_id
        FROM public."MethodologyEdgeTypes"
        WHERE id = NEW.methodology_edge_type_id;

        IF edge_methodology_id != graph_methodology_id THEN
            RAISE EXCEPTION 'Edge type does not match graph methodology';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_edge_methodology_type() OWNER TO postgres;

--
-- Name: validate_node_methodology_type(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_node_methodology_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    graph_methodology_id uuid;
    node_methodology_id uuid;
BEGIN
    SELECT methodology_id INTO graph_methodology_id
    FROM public."Graphs"
    WHERE id = NEW.graph_id;

    IF graph_methodology_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.methodology_node_type_id IS NOT NULL THEN
        SELECT methodology_id INTO node_methodology_id
        FROM public."MethodologyNodeTypes"
        WHERE id = NEW.methodology_node_type_id;

        IF node_methodology_id != graph_methodology_id THEN
            RAISE EXCEPTION 'Node type does not match graph methodology';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_node_methodology_type() OWNER TO postgres;

--
-- Name: cleanup_old_embedding_jobs(integer); Type: FUNCTION; Schema: sys; Owner: postgres
--

CREATE FUNCTION sys.cleanup_old_embedding_jobs(retention_days integer DEFAULT 30) RETURNS TABLE(deleted_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    rows_deleted BIGINT;
BEGIN
    DELETE FROM sys.embedding_jobs
    WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RETURN QUERY SELECT rows_deleted;
END;
$$;


ALTER FUNCTION sys.cleanup_old_embedding_jobs(retention_days integer) OWNER TO postgres;

--
-- Name: FUNCTION cleanup_old_embedding_jobs(retention_days integer); Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON FUNCTION sys.cleanup_old_embedding_jobs(retention_days integer) IS 'Cleanup old completed/failed jobs to prevent unbounded growth';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Challenges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Challenges" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    rebuttal_claim text,
    rebuttal_grounds jsonb,
    rebuttal_warrant text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT either_node_or_edge CHECK (((target_node_id IS NOT NULL) OR (target_edge_id IS NOT NULL)))
);


ALTER TABLE public."Challenges" OWNER TO postgres;

--
-- Name: Comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Comments" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    text text NOT NULL,
    author_id uuid NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment CHECK (((target_node_id IS NOT NULL) OR (target_edge_id IS NOT NULL)))
);


ALTER TABLE public."Comments" OWNER TO postgres;

--
-- Name: EdgeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EdgeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    props jsonb,
    meta jsonb,
    ai public.vector(1536),
    source_node_type_id uuid,
    target_node_type_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."EdgeTypes" OWNER TO postgres;

--
-- Name: Edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Edges" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    edge_type_id uuid NOT NULL,
    source_node_id uuid NOT NULL,
    target_node_id uuid NOT NULL,
    props jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    methodology_edge_type_id uuid
);


ALTER TABLE public."Edges" OWNER TO postgres;

--
-- Name: COLUMN "Edges".props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Edges".props IS 'All application data stored as JSONB. Example: {weight, graphId, createdBy, relationship, hierarchyLevel}';


--
-- Name: Graphs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Graphs" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    level integer DEFAULT 1 NOT NULL,
    methodology text,
    privacy text DEFAULT 'private'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    methodology_id uuid,
    methodology_compliance_score numeric(3,2) DEFAULT 0.00,
    CONSTRAINT "Graphs_level_check" CHECK ((level = ANY (ARRAY[0, 1]))),
    CONSTRAINT "Graphs_methodology_compliance_score_check" CHECK (((methodology_compliance_score >= (0)::numeric) AND (methodology_compliance_score <= (1)::numeric))),
    CONSTRAINT "Graphs_privacy_check" CHECK ((privacy = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])))
);


ALTER TABLE public."Graphs" OWNER TO postgres;

--
-- Name: Methodologies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Methodologies" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    category public.methodology_category NOT NULL,
    status public.methodology_status DEFAULT 'draft'::public.methodology_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    icon text,
    color text,
    tags text[],
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    usage_count integer DEFAULT 0,
    rating numeric(2,1),
    created_by uuid,
    parent_methodology_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    CONSTRAINT "Methodologies_rating_check" CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT valid_version CHECK ((version > 0))
);


ALTER TABLE public."Methodologies" OWNER TO postgres;

--
-- Name: MethodologyEdgeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyEdgeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_directed boolean DEFAULT true NOT NULL,
    is_bidirectional boolean DEFAULT false,
    valid_source_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    valid_target_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_cardinality jsonb DEFAULT '{"max": null, "min": 0}'::jsonb,
    target_cardinality jsonb DEFAULT '{"max": null, "min": 0}'::jsonb,
    line_style text DEFAULT 'solid'::text,
    line_color text,
    arrow_style text DEFAULT 'arrow'::text,
    properties_schema jsonb DEFAULT '{}'::jsonb,
    default_properties jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."MethodologyEdgeTypes" OWNER TO postgres;

--
-- Name: MethodologyNodeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyNodeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    icon text,
    color text,
    properties_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    default_properties jsonb DEFAULT '{}'::jsonb,
    required_properties text[],
    constraints jsonb DEFAULT '{}'::jsonb,
    suggestions jsonb DEFAULT '{}'::jsonb,
    visual_config jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."MethodologyNodeTypes" OWNER TO postgres;

--
-- Name: MethodologyPermissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyPermissions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    user_id uuid,
    can_view boolean DEFAULT true,
    can_fork boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    shared_by uuid,
    shared_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


ALTER TABLE public."MethodologyPermissions" OWNER TO postgres;

--
-- Name: MethodologyTemplates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyTemplates" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    thumbnail_url text,
    preview_data jsonb,
    price numeric(10,2) DEFAULT 0.00,
    currency text DEFAULT 'USD'::text,
    download_count integer DEFAULT 0,
    fork_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."MethodologyTemplates" OWNER TO postgres;

--
-- Name: MethodologyWorkflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyWorkflows" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    initial_canvas_state jsonb DEFAULT '{}'::jsonb,
    is_linear boolean DEFAULT false,
    allow_skip boolean DEFAULT true,
    require_completion boolean DEFAULT false,
    instructions text,
    example_graph_id uuid,
    tutorial_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."MethodologyWorkflows" OWNER TO postgres;

--
-- Name: NodeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NodeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    props jsonb,
    meta jsonb,
    ai public.vector(1536),
    parent_node_type_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."NodeTypes" OWNER TO postgres;

--
-- Name: Nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Nodes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    node_type_id uuid NOT NULL,
    props jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    methodology_node_type_id uuid
);


ALTER TABLE public."Nodes" OWNER TO postgres;

--
-- Name: COLUMN "Nodes".props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".props IS 'All application data stored as JSONB. Example: {title, narrative, authorId, weight, graphId, createdBy, publishedAt}';


--
-- Name: UserMethodologyProgress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserMethodologyProgress" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    graph_id uuid NOT NULL,
    methodology_id uuid NOT NULL,
    current_step integer DEFAULT 0,
    completed_steps jsonb DEFAULT '[]'::jsonb,
    step_data jsonb DEFAULT '{}'::jsonb,
    status text,
    completion_percentage integer DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    last_active_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT "UserMethodologyProgress_completion_percentage_check" CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT "UserMethodologyProgress_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'abandoned'::text])))
);


ALTER TABLE public."UserMethodologyProgress" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Name: edge_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    source_node_type_id uuid,
    target_node_type_id uuid,
    props jsonb DEFAULT '{}'::jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.edge_types OWNER TO postgres;

--
-- Name: TABLE edge_types; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.edge_types IS 'Metaschema table defining edge/relationship types in the knowledge graph';


--
-- Name: COLUMN edge_types.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.id IS 'Unique identifier for the edge type';


--
-- Name: COLUMN edge_types.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.name IS 'Human-readable name of the edge type (unique)';


--
-- Name: COLUMN edge_types.source_node_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.source_node_type_id IS 'Optional constraint on source node type';


--
-- Name: COLUMN edge_types.target_node_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.target_node_type_id IS 'Optional constraint on target node type';


--
-- Name: COLUMN edge_types.props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.props IS 'JSONB properties for schema definition and metadata';


--
-- Name: COLUMN edge_types.ai; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edge_types.ai IS 'Vector embedding for semantic search of edge types';


--
-- Name: edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edges (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source_node_id uuid NOT NULL,
    target_node_id uuid NOT NULL,
    edge_type_id uuid NOT NULL,
    props jsonb DEFAULT '{}'::jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT edges_no_self_loops CHECK ((source_node_id <> target_node_id))
);


ALTER TABLE public.edges OWNER TO postgres;

--
-- Name: TABLE edges; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.edges IS 'Data graph table storing edges/relationships between nodes';


--
-- Name: COLUMN edges.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.id IS 'Unique identifier for the edge';


--
-- Name: COLUMN edges.source_node_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.source_node_id IS 'Source node of the relationship';


--
-- Name: COLUMN edges.target_node_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.target_node_id IS 'Target node of the relationship';


--
-- Name: COLUMN edges.edge_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.edge_type_id IS 'Type of this edge (foreign key to edge_types)';


--
-- Name: COLUMN edges.props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.props IS 'JSONB properties containing edge data';


--
-- Name: COLUMN edges.ai; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edges.ai IS 'Vector embedding for semantic search of relationships';


--
-- Name: node_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_node_type_id uuid,
    props jsonb DEFAULT '{}'::jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.node_types OWNER TO postgres;

--
-- Name: TABLE node_types; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.node_types IS 'Metaschema table defining node types/classes in the knowledge graph';


--
-- Name: COLUMN node_types.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_types.id IS 'Unique identifier for the node type';


--
-- Name: COLUMN node_types.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_types.name IS 'Human-readable name of the node type (unique)';


--
-- Name: COLUMN node_types.parent_node_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_types.parent_node_type_id IS 'Optional parent node type for type hierarchy';


--
-- Name: COLUMN node_types.props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_types.props IS 'JSONB properties for schema definition and metadata';


--
-- Name: COLUMN node_types.ai; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_types.ai IS 'Vector embedding for semantic search of node types';


--
-- Name: nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nodes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    node_type_id uuid NOT NULL,
    props jsonb DEFAULT '{}'::jsonb,
    ai public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.nodes OWNER TO postgres;

--
-- Name: TABLE nodes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.nodes IS 'Data graph table storing node instances';


--
-- Name: COLUMN nodes.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nodes.id IS 'Unique identifier for the node';


--
-- Name: COLUMN nodes.node_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nodes.node_type_id IS 'Type of this node (foreign key to node_types)';


--
-- Name: COLUMN nodes.props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nodes.props IS 'JSONB properties containing node data';


--
-- Name: COLUMN nodes.ai; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nodes.ai IS 'AI-generated data: embeddings, summaries, extracted entities, etc.';


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refresh_tokens IS 'Refresh tokens for JWT authentication';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.roles IS 'System roles for authorization';


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version text NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    description text,
    checksum text,
    execution_time_ms integer
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_roles IS 'Junction table mapping users to roles';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text,
    last_name text,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'User accounts for authentication';


--
-- Name: embedding_jobs; Type: TABLE; Schema: sys; Owner: postgres
--

CREATE TABLE sys.embedding_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id uuid NOT NULL,
    props jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    worker_id text,
    processing_duration_ms integer,
    CONSTRAINT chk_embedding_jobs_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE sys.embedding_jobs OWNER TO postgres;

--
-- Name: TABLE embedding_jobs; Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON TABLE sys.embedding_jobs IS 'Queue for asynchronous embedding generation jobs';


--
-- Name: COLUMN embedding_jobs.props; Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON COLUMN sys.embedding_jobs.props IS 'Snapshot of node props at time of queueing';


--
-- Name: COLUMN embedding_jobs.status; Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON COLUMN sys.embedding_jobs.status IS 'Job status: pending, processing, completed, failed';


--
-- Name: COLUMN embedding_jobs.worker_id; Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON COLUMN sys.embedding_jobs.worker_id IS 'Identifier of worker that processed this job';


--
-- Name: COLUMN embedding_jobs.processing_duration_ms; Type: COMMENT; Schema: sys; Owner: postgres
--

COMMENT ON COLUMN sys.embedding_jobs.processing_duration_ms IS 'Processing time in milliseconds for monitoring';


--
-- Data for Name: Challenges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Challenges" (id, target_node_id, target_edge_id, status, rebuttal_claim, rebuttal_grounds, rebuttal_warrant, created_at) FROM stdin;
\.


--
-- Data for Name: Comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Comments" (id, text, author_id, target_node_id, target_edge_id, created_at) FROM stdin;
\.


--
-- Data for Name: EdgeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EdgeTypes" (id, name, props, meta, ai, source_node_type_id, target_node_type_id, created_at, updated_at) FROM stdin;
4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	discovered_by	{"description": "Links a concept/fact to its discoverer"}	\N	\N	\N	\N	2025-11-22 06:35:53.847423+00	2025-11-22 06:35:53.847423+00
45da6227-834f-4fae-9da8-5059317e598f	occurred_at	{"description": "Links an event to a location"}	\N	\N	\N	\N	2025-11-22 06:35:53.847423+00	2025-11-22 06:35:53.847423+00
60856374-4cd6-4e97-b630-d9c25fafe5b6	related_to	{"description": "General relationship between entities"}	\N	\N	\N	\N	2025-11-22 06:35:53.847423+00	2025-11-22 06:35:53.847423+00
ef81dc5d-f4b8-46c9-a43c-dae4915168d4	proposed_by	{"description": "Links a theory/concept to its originator"}	\N	\N	\N	\N	2025-11-22 06:35:53.847423+00	2025-11-22 06:35:53.847423+00
b9f707b0-304e-4dfe-b0c0-3acd167682ae	references	{"description": "Article references a node"}	{}	\N	\N	\N	2025-11-22 06:35:53.847423+00	2025-11-22 06:35:53.847423+00
89069e6e-37a4-47c8-8672-208d5c12d04e	CHALLENGES	{"description": "Challenge node challenges a target node or edge for accuracy/completeness"}	\N	\N	\N	\N	2025-11-23 21:40:17.76509+00	2025-11-23 21:40:17.76509+00
12dd4cad-7914-4e64-960e-4a30fc66bec3	ATTACHES_FILE	{"description": "Node references an uploaded evidence file"}	\N	\N	\N	\N	2025-11-23 21:40:17.767831+00	2025-11-23 21:40:17.767831+00
76328b34-8e3e-47e0-beec-a87b8df31368	INVESTIGATES	{"description": "Formal inquiry investigates a node or topic"}	\N	\N	\N	\N	2025-11-23 21:40:17.768267+00	2025-11-23 21:40:17.768267+00
208edac5-9b5d-461c-b195-3264402bf2bc	EXTRACTS_CLAIM	{"description": "Evidence file contains extracted claim node"}	\N	\N	\N	\N	2025-11-23 21:40:17.768645+00	2025-11-23 21:40:17.768645+00
f21dfc5b-11c9-4a46-bc24-525382e2fda4	POSTED_ON	{"description": "Activity post is associated with a graph"}	\N	\N	\N	\N	2025-11-23 21:40:17.769089+00	2025-11-23 21:40:17.769089+00
edca0393-dae0-4ef7-8c45-907255cf7150	REPLIES_TO	{"description": "Activity post replies to another post"}	\N	\N	\N	\N	2025-11-23 21:40:17.769469+00	2025-11-23 21:40:17.769469+00
8cb9b4dd-9314-4837-bc9f-5c8a154648c0	SHARES	{"description": "Activity post shares another post"}	\N	\N	\N	\N	2025-11-23 21:40:17.769897+00	2025-11-23 21:40:17.769897+00
480d89f8-bd16-4a71-b778-2d1e3c08b591	MENTIONS_NODE	{"description": "Post mentions a specific node"}	\N	\N	\N	\N	2025-11-23 21:40:17.770338+00	2025-11-23 21:40:17.770338+00
abcc95c3-0453-4528-8c99-aa97ce3a7eda	LIKES	{"description": "User likes a post or node"}	\N	\N	\N	\N	2025-11-23 21:40:17.770774+00	2025-11-23 21:40:17.770774+00
ffd18eea-8c70-4f89-a0d2-c516ff1692c7	INVITES_TO	{"description": "Graph invitation invites user to graph"}	\N	\N	\N	\N	2025-11-23 21:40:17.771084+00	2025-11-23 21:40:17.771084+00
71964bcc-6b0f-4f2c-a66c-37033b8c8ca8	VIEWING	{"description": "User presence indicates viewing of specific node"}	\N	\N	\N	\N	2025-11-23 21:40:17.771399+00	2025-11-23 21:40:17.771399+00
84f8c6c3-68aa-4221-adb3-4eba95e59542	HAS_CURATOR_ROLE	{"description": "User has been assigned a curator role"}	\N	\N	\N	\N	2025-11-23 21:40:17.771666+00	2025-11-23 21:40:17.771666+00
130c49de-b268-4462-82a2-906861a5f749	APPLIES_FOR	{"description": "User applies for curator role"}	\N	\N	\N	\N	2025-11-23 21:40:17.772001+00	2025-11-23 21:40:17.772001+00
f8e9c577-1a8b-42ac-9f15-4ad2a92863e7	CURATES	{"description": "Curator reviews/approves a node or edge"}	\N	\N	\N	\N	2025-11-23 21:40:17.772352+00	2025-11-23 21:40:17.772352+00
fd6d9cb2-6ca6-4311-9995-db78f79d741c	AUDITS	{"description": "Audit log records curator action"}	\N	\N	\N	\N	2025-11-23 21:40:17.77258+00	2025-11-23 21:40:17.77258+00
2a688184-e76a-4c03-b98c-966cd1f1585f	PROCESSES_FILE	{"description": "Media job processes a specific file"}	\N	\N	\N	\N	2025-11-23 21:40:17.772876+00	2025-11-23 21:40:17.772876+00
c14c85cb-9f94-43c7-aa55-5d1e595b6980	EXTRACTS_SECTION	{"description": "Document section extracted from document"}	\N	\N	\N	\N	2025-11-23 21:40:17.773131+00	2025-11-23 21:40:17.773131+00
2de11180-160d-4b10-bf23-cbb35ee610b5	EXTRACTS_FRAME	{"description": "Video frame extracted from video"}	\N	\N	\N	\N	2025-11-23 21:40:17.773396+00	2025-11-23 21:40:17.773396+00
47187c82-4c73-48b1-a6ab-4851fecd5ed1	BELONGS_TO_SCENE	{"description": "Frame belongs to video scene"}	\N	\N	\N	\N	2025-11-23 21:40:17.773655+00	2025-11-23 21:40:17.773655+00
8d8b6c0d-33d0-46fa-9efb-5f5db5b86f47	UNLOCKS	{"description": "User unlocks achievement"}	\N	\N	\N	\N	2025-11-23 21:40:17.773946+00	2025-11-23 21:40:17.773946+00
a93374c3-fac8-4f5f-8914-726c432753b1	EARNS_POINTS	{"description": "User earns points from action on node"}	\N	\N	\N	\N	2025-11-23 21:40:17.774224+00	2025-11-23 21:40:17.774224+00
2223726e-5b64-4d9c-8103-12bf2d83a936	HAS_MESSAGE	{"description": "Conversation contains message"}	\N	\N	\N	\N	2025-11-23 21:40:17.774506+00	2025-11-23 21:40:17.774506+00
54479bc9-d418-4822-98af-437840fe84cc	REFERENCES_IN_CONVERSATION	{"description": "Conversation message references node or edge"}	\N	\N	\N	\N	2025-11-23 21:40:17.774773+00	2025-11-23 21:40:17.774773+00
6bcc722d-034a-4992-846f-6ab0a3c23e76	SUGGESTS	{"description": "AI assistant suggests related node or evidence"}	\N	\N	\N	\N	2025-11-23 21:40:17.775064+00	2025-11-23 21:40:17.775064+00
a67cac33-df3b-446c-92aa-a40d82c513eb	NOTIFIES_ABOUT	{"description": "Notification relates to specific node/edge/post"}	\N	\N	\N	\N	2025-11-23 21:40:17.775309+00	2025-11-23 21:40:17.775309+00
3c22abe7-80d5-410d-90a8-27e18516e7b1	NOTIFIES_USER	{"description": "Notification targets specific user"}	\N	\N	\N	\N	2025-11-23 21:40:17.775558+00	2025-11-23 21:40:17.775558+00
38c8ad83-9b19-4c03-90cd-b0f4fd6194ba	VOTES_ON	{"description": "Consensus vote cast on challenge, promotion, or application"}	\N	\N	\N	\N	2025-11-23 21:40:17.775861+00	2025-11-23 21:40:17.775861+00
c1372ba8-0b29-4633-91d4-7735d3b94782	CAST_BY	{"description": "Vote was cast by specific user"}	\N	\N	\N	\N	2025-11-23 21:40:17.776201+00	2025-11-23 21:40:17.776201+00
327eb9fe-633e-49fb-9d25-840765ed5907	SUPPORTS	{"description": "Evidence supports a claim or node"}	\N	\N	\N	\N	2025-11-23 21:40:17.776566+00	2025-11-23 21:40:17.776566+00
445d442c-663e-4580-b705-2e2e19256681	REFUTES	{"description": "Evidence refutes a claim or node"}	\N	\N	\N	\N	2025-11-23 21:40:17.776834+00	2025-11-23 21:40:17.776834+00
8f2e1cea-753e-4937-8528-81151683180f	NEUTRAL_EVIDENCE	{"description": "Evidence provides context without supporting/refuting"}	\N	\N	\N	\N	2025-11-23 21:40:17.777154+00	2025-11-23 21:40:17.777154+00
\.


--
-- Data for Name: Edges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Edges" (id, edge_type_id, source_node_id, target_node_id, props, ai, created_at, updated_at, methodology_edge_type_id) FROM stdin;
912984b4-52d5-460e-b63c-73c9aab44216	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	47c88546-6dc5-45c2-8425-507366913140	f9c7ab8b-aee8-4305-9091-02d1c48e2372	{"year": "1915", "weight": 1, "graphId": "00000000-0000-0000-0000-000000000001", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000"}	\N	2025-10-10 19:55:50.759082+00	2025-10-10 19:55:50.759082+00	\N
d4a66e84-973d-4504-92a8-8f7080dd9e85	60856374-4cd6-4e97-b630-d9c25fafe5b6	76f02a95-9e52-48eb-b059-f6b30ac35b21	0455fdfd-affe-4c2d-ab06-6a6da62b6748	{"weight": 1, "graphId": "00000000-0000-0000-0000-000000000001", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000", "relationship": "Both landmark human achievements in different domains"}	\N	2025-10-10 19:55:50.760923+00	2025-10-10 19:55:50.760923+00	\N
3b2f7744-67d3-4681-ab87-209f64132cd9	60856374-4cd6-4e97-b630-d9c25fafe5b6	47c88546-6dc5-45c2-8425-507366913140	59ce9efa-e932-47f4-982f-baf801a8792e	{"weight": 1, "graphId": "00000000-0000-0000-0000-000000000001", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000", "relationship": "Contemporary scientists, both Nobel laureates"}	\N	2025-10-10 19:55:50.761546+00	2025-10-10 19:55:50.761546+00	\N
e88358dd-af5f-48f8-85aa-ae10fb45786d	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	13eddbb0-a30c-4304-81a2-c383745fa24b	{"label": "", "weight": 0, "graphId": "11111111-1111-1111-1111-111111111111", "isLevel0": false, "createdBy": null}	\N	2025-10-10 23:24:39.725696+00	2025-10-10 23:24:39.725696+00	\N
d96d7b52-75e3-4da2-8129-ffee9cf467a8	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	33090bc4-2bb4-4065-829f-b6c3b2fdfa14	{"label": "", "weight": 0, "graphId": "11111111-1111-1111-1111-111111111111", "isLevel0": false, "createdBy": null}	\N	2025-10-10 23:34:18.208619+00	2025-10-10 23:34:18.208619+00	\N
bd58ddd3-dcf8-46fe-8843-4695e08b5017	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	33090bc4-2bb4-4065-829f-b6c3b2fdfa14	{"label": "", "weight": 0, "graphId": "11111111-1111-1111-1111-111111111111", "isLevel0": false, "createdBy": null}	\N	2025-10-10 23:34:26.591972+00	2025-10-10 23:34:26.591972+00	\N
048440ac-d731-4d9e-97b9-ccaa40379b87	60856374-4cd6-4e97-b630-d9c25fafe5b6	73b8ac00-a028-4e65-b9ae-b6d727cdb735	28fc56fe-e65a-4215-941e-da364b7d66a1	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "duration": "13 seconds", "isLevel0": true, "createdBy": null, "relationship": "followed_by"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
059d56fc-2261-4733-95c4-5206bcc46070	60856374-4cd6-4e97-b630-d9c25fafe5b6	28fc56fe-e65a-4215-941e-da364b7d66a1	5c9c1f78-5d2c-436b-b4aa-cad87032b68e	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "duration": "30 minutes", "isLevel0": true, "createdBy": null, "relationship": "followed_by"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
a7c89f45-ccc8-4f24-8431-55f6ea37d913	60856374-4cd6-4e97-b630-d9c25fafe5b6	5c9c1f78-5d2c-436b-b4aa-cad87032b68e	fcc88fd8-9fe0-475b-90ae-4a6178c79f57	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "duration": "50 minutes", "isLevel0": true, "createdBy": null, "relationship": "followed_by"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
4a502b14-9d9f-4926-a045-5a246452bc90	60856374-4cd6-4e97-b630-d9c25fafe5b6	0035ed14-67d6-4d82-825e-cd5664178bc5	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"type": "official_conclusion", "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "strength": "primary", "createdBy": null, "relationship": "supports"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
151910a0-f677-48af-bad9-0ddb8fab5add	60856374-4cd6-4e97-b630-d9c25fafe5b6	9e671fe6-fba3-4aa7-98ce-bfa70709004d	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"type": "physical_evidence", "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "evidence_for"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
366970bf-3e6d-44c7-94b7-f121c9123809	60856374-4cd6-4e97-b630-d9c25fafe5b6	c33a6961-9a04-43fd-8664-da7a204831a1	0187ed56-23f2-41c8-a1bd-7197d9f3f213	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "key_evidence", "controversial": true}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
9a9768f5-150b-46a4-8d61-5ff04b374179	60856374-4cd6-4e97-b630-d9c25fafe5b6	0afeb2a9-4be9-4ef2-97a6-5a1c08664ca7	5c8e39f0-b8f8-499a-b306-43550984165f	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "supports", "witness_count": 51}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
6515cfc0-269f-4d26-b935-15face8e716c	60856374-4cd6-4e97-b630-d9c25fafe5b6	9de40b8d-a299-410e-96fb-c7c7cf2f3b7e	5c8e39f0-b8f8-499a-b306-43550984165f	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "suggests", "shots_detected": 4}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
39a246ca-6ab6-4d15-b31c-b97bb3b79f0a	60856374-4cd6-4e97-b630-d9c25fafe5b6	b0da62c1-6de0-4a2e-8b7e-73ca520d6948	5c8e39f0-b8f8-499a-b306-43550984165f	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "probability": "95%", "relationship": "validates"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
9d492392-20c8-433e-ab36-ccae24bd5283	60856374-4cd6-4e97-b630-d9c25fafe5b6	b1329687-de12-45da-9d8d-eeb5ae8a87d8	c52a647b-1a82-4096-91c0-0a272233023c	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "examined_by", "conflicting_reports": true}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
00dc32c1-7106-41af-af1c-583cc4c50775	60856374-4cd6-4e97-b630-d9c25fafe5b6	111cd7ae-e3cd-489d-8ee6-02b55f844fc1	5c8e39f0-b8f8-499a-b306-43550984165f	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "contradicts_official", "wound_interpretation": "entrance wound"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
0b32fa16-49d1-44ac-af57-bfe4aec9e4f6	60856374-4cd6-4e97-b630-d9c25fafe5b6	5a80b204-fbe4-4d91-98fd-bed22d36a1db	c52a647b-1a82-4096-91c0-0a272233023c	{"frame": 313, "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "captured"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
57761ec6-d522-465f-8787-5c37e33dc59e	60856374-4cd6-4e97-b630-d9c25fafe5b6	5a80b204-fbe4-4d91-98fd-bed22d36a1db	5c8e39f0-b8f8-499a-b306-43550984165f	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "movement": "back and to left", "createdBy": null, "relationship": "analyzed_for"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
03c5ccbd-f6f0-424b-bd62-5506e86d6078	60856374-4cd6-4e97-b630-d9c25fafe5b6	f4e4faaf-839a-40ee-b36c-a715d7a4a9ba	43982202-5efe-4661-a258-98d8c0252a13	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "reveals", "classification": "formerly classified"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
cb1d7277-76d0-486f-a530-f465c401bdde	60856374-4cd6-4e97-b630-d9c25fafe5b6	3557a30f-7982-4edc-b74c-c1d5355c69c3	43982202-5efe-4661-a258-98d8c0252a13	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "links_to", "surveillance": "pre-assassination"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
f17f7ccc-3c96-4564-b40f-099000e46fce	60856374-4cd6-4e97-b630-d9c25fafe5b6	9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"claim": "I am a patsy", "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "denies"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
021b6aad-172a-459a-bfe0-b37881b23a7e	60856374-4cd6-4e97-b630-d9c25fafe5b6	9e671fe6-fba3-4aa7-98ce-bfa70709004d	9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	{"alias": "A. Hidell", "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "owned_by"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
62ef7834-2ebb-407d-8645-ad3368df90d0	60856374-4cd6-4e97-b630-d9c25fafe5b6	0035ed14-67d6-4d82-825e-cd5664178bc5	b0da62c1-6de0-4a2e-8b7e-73ca520d6948	{"issue": "number of shots", "weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "relationship": "contradicted_by"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
f1190c9a-1993-4c2e-aa8b-dbc4ba9a5f04	60856374-4cd6-4e97-b630-d9c25fafe5b6	0187ed56-23f2-41c8-a1bd-7197d9f3f213	c52a647b-1a82-4096-91c0-0a272233023c	{"weight": 0, "graphId": "5e24155d-15fc-4cd6-96a1-89e999996393", "isLevel0": false, "createdBy": null, "controversy": "trajectory analysis", "relationship": "related_ballistics"}	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00	\N
85d8281e-2263-4794-b59a-7e4f3f6a1448	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	{"weight": 1, "graphId": "fa806c40-550f-46d5-931c-03e010d868eb", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
2acdef28-64e1-4547-a656-44bcb4750e57	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000002	{"weight": 0.95, "graphId": "fa806c40-550f-46d5-931c-03e010d868eb", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
e181f501-963b-43cd-8b98-ec3acc393644	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000001	{"weight": 1, "graphId": "fa806c40-550f-46d5-931c-03e010d868eb", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
6f27c326-74e7-41fe-9763-460acf9dbd74	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	50000000-0000-0000-0000-000000000001	{"weight": 0.95, "graphId": "fa806c40-550f-46d5-931c-03e010d868eb", "isLevel0": false, "createdBy": "00000000-0000-0000-0000-000000000000"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
5d170da3-0fb4-4e26-9c62-25a02faa8453	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	cd318d60-a817-46a7-a647-991ffa6dccef	{"weight": 0.95, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 2}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
269edfa5-bda7-4893-bd84-da311bb5f093	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	a4089f0b-84bc-4135-a103-08c4d9e2cdad	{"weight": 0.95, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 2}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
a849dc0b-e3d1-4271-9bba-080ec5ae969e	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	a309d337-99d2-495d-a00b-400507492aba	{"weight": 0.95, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 2}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
870165a5-f70c-4610-81d9-96544e0480a5	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	277add5f-6120-47ef-8c47-79ccd203ce17	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
adb8888d-5d4d-4e6d-8e10-7029f0ae2d5a	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	8c2a137e-32d9-42c3-b90c-b6abdffdafee	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
ae24661e-ee8d-404d-966e-7d3d0e8208f0	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	26dcc10a-fe1e-4e6a-9aec-59049d0116c0	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
8a381d71-89a4-4ed6-8767-348b3733e5f0	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	cb9a4571-7758-4ac6-a708-829507fd2062	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
964363fe-2785-40fe-a3c7-4791765a0748	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	a7b848a7-4d3f-4cfe-b881-5c3ade796b91	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
dd81fefe-030e-477b-a0d6-06559ae1d35e	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	54ce63f9-3b22-4b4a-8a46-fe96bafa8e99	{"weight": 0.9, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "relationship": "parent-child", "hierarchyLevel": 3}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
ecf3a279-c51e-4f46-be96-80b6e0b9cc25	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	28934a5c-2a2c-4f1b-9858-2adfc9549f11	{"weight": 0.88, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "citationType": "evidence"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
ab30c4fa-7e87-4e1f-a820-30a26a72f6cd	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	3acf52cf-5dc5-4588-926d-c0a67780a63a	{"weight": 0.88, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "citationType": "evidence"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
275c3c4c-c562-455a-bd41-04f45552918a	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	c8e4a9cd-689e-45b2-80e0-7923dd2a7f6f	{"weight": 0.88, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be", "citationType": "evidence"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
79f6fd4b-e9a4-4231-8b3b-28ff289b5c4c	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	680d72e8-0df9-4a72-a195-958646f7f0c3	8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	{"role": "researcher", "weight": 0.85, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
0b479975-2135-44b4-9d4b-3cf714f1cb3a	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	680d72e8-0df9-4a72-a195-958646f7f0c3	8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	{"role": "researcher", "weight": 0.85, "graphId": "46e701af-05a1-42dc-9646-daed44e73bd4", "isLevel0": false, "createdBy": "ff84e195-1ecd-4b49-9a05-416425e235be"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
\.


--
-- Data for Name: Graphs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Graphs" (id, name, description, level, methodology, privacy, created_by, created_at, updated_at, methodology_id, methodology_compliance_score) FROM stdin;
\.


--
-- Data for Name: Methodologies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Methodologies" (id, name, description, category, status, version, is_system, icon, color, tags, config, usage_count, rating, created_by, parent_methodology_id, created_at, updated_at, published_at) FROM stdin;
fbf0e448-f9be-4917-8f94-c5bf1ac693bb	5 Whys Root Cause Analysis	Iteratively ask "why" to drill down to the root cause of a problem. Best for simple to moderately complex issues.	analytical	published	1	t	search	#3B82F6	{root-cause,problem-solving,simple,iterative}	{}	0	\N	\N	\N	2025-11-24 06:04:36.9417+00	2025-11-24 06:04:36.9417+00	\N
e3bcd3a8-db71-478d-8d06-76e2df3eb056	Fishbone (Ishikawa) Diagram	Systematic cause-and-effect analysis using categories (People, Process, Equipment, Materials, Environment, Management).	analytical	published	1	t	git-branch	#06B6D4	{root-cause,structured,brainstorming,manufacturing}	{}	0	\N	\N	\N	2025-11-24 06:04:36.953308+00	2025-11-24 06:04:36.953308+00	\N
0fddcb04-5f21-46d9-ab73-41c1d01955e2	Mind Mapping	Visual brainstorming technique for exploring ideas, connections, and hierarchies. Great for creative thinking and knowledge organization.	creative	published	1	t	share-2	#EC4899	{brainstorming,creative,visual,free-form}	{}	0	\N	\N	\N	2025-11-24 06:04:36.958946+00	2025-11-24 06:04:36.958946+00	\N
0d986c61-472b-4c1e-baee-a4d15df26518	SWOT Analysis	Strategic planning framework analyzing Strengths, Weaknesses, Opportunities, and Threats.	strategic	published	1	t	grid	#14B8A6	{strategy,planning,business,decision-making}	{}	0	\N	\N	\N	2025-11-24 06:04:36.963822+00	2025-11-24 06:04:36.963822+00	\N
2128d341-bd5d-4e68-975d-ab3eefbbabcc	Systems Thinking Causal Loop	Visualize feedback loops, delays, and systemic relationships. Understand how parts of a system influence each other.	systems	published	1	t	repeat	#06B6D4	{systems,feedback,complexity,dynamics}	{}	0	\N	\N	\N	2025-11-24 06:04:36.969801+00	2025-11-24 06:04:36.969801+00	\N
f2872a36-a5a1-48b5-ba87-6a117a56b5ab	Decision Tree	Map out decisions, possible paths, and outcomes. Calculate expected values and risk-adjusted returns.	strategic	published	1	t	git-merge	#F59E0B	{decision,probability,risk,analysis}	{}	0	\N	\N	\N	2025-11-24 06:04:36.972978+00	2025-11-24 06:04:36.972978+00	\N
ae88bcf7-5ca7-49ad-9c81-1382d6200176	Concept Mapping	Visualize relationships between concepts with labeled connections. Useful for knowledge representation and learning.	investigative	published	1	t	share-2	#A855F7	{learning,knowledge,relationships,education}	{}	0	\N	\N	\N	2025-11-24 06:04:36.977115+00	2025-11-24 06:04:36.977115+00	\N
5093c2f0-e225-4613-ad44-d406e3ce8633	Timeline Analysis	Chronological visualization of events, milestones, and their relationships over time.	investigative	published	1	t	clock	#EC4899	{timeline,chronology,history,sequence}	{}	0	\N	\N	\N	2025-11-24 06:04:36.980604+00	2025-11-24 06:04:36.980604+00	\N
\.


--
-- Data for Name: MethodologyEdgeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyEdgeTypes" (id, methodology_id, name, display_name, description, is_directed, is_bidirectional, valid_source_types, valid_target_types, source_cardinality, target_cardinality, line_style, line_color, arrow_style, properties_schema, default_properties, display_order, created_at, updated_at) FROM stdin;
8b063ad0-149e-4111-b3be-2067fc84eba5	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	asks	Asks Why	Connects problem/answer to next why question	t	f	["problem", "why"]	["why"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.948027+00	2025-11-24 06:04:36.948027+00
a5f1ba81-c209-4e49-b1bc-a307c4a3517c	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	reveals	Reveals Root Cause	Final why leads to root cause	t	f	["why"]	["root_cause"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.949082+00	2025-11-24 06:04:36.949082+00
adf4689f-135a-4f3d-bb05-6c2f17c76841	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	addresses	Addresses	Solution addresses root cause	t	f	["solution"]	["root_cause"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	arrow	{}	{}	2	2025-11-24 06:04:36.950441+00	2025-11-24 06:04:36.950441+00
693a81e4-4a3b-4012-b27e-d60a6905aa94	e3bcd3a8-db71-478d-8d06-76e2df3eb056	category_of	Category Of	Category relates to the main effect	t	f	["category"]	["effect"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.957001+00	2025-11-24 06:04:36.957001+00
40463996-9335-403d-a4c0-5c74c68b3f20	e3bcd3a8-db71-478d-8d06-76e2df3eb056	causes	Causes	Cause contributes to effect or parent cause	t	f	["cause", "sub_cause"]	["effect", "category", "cause"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.957684+00	2025-11-24 06:04:36.957684+00
e5f721a5-c2c6-4173-9b7a-63763e2ddaca	0fddcb04-5f21-46d9-ab73-41c1d01955e2	branches_to	Branches To	Hierarchical connection	t	f	["central_idea", "main_branch", "sub_branch"]	["main_branch", "sub_branch", "leaf"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	none	{}	{}	0	2025-11-24 06:04:36.962225+00	2025-11-24 06:04:36.962225+00
58a41a23-fe18-4ae0-85bc-da2678609173	0fddcb04-5f21-46d9-ab73-41c1d01955e2	relates_to	Relates To	Non-hierarchical association	f	f	["main_branch", "sub_branch", "leaf"]	["main_branch", "sub_branch", "leaf"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	none	{}	{}	1	2025-11-24 06:04:36.962876+00	2025-11-24 06:04:36.962876+00
4688cfe5-0eac-4439-ac44-90967287773f	0d986c61-472b-4c1e-baee-a4d15df26518	analyzes	Analyzes	SWOT element relates to objective	t	f	["strength", "weakness", "opportunity", "threat"]	["objective"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.967838+00	2025-11-24 06:04:36.967838+00
baef072d-f80e-4e95-907b-44099e7ac697	0d986c61-472b-4c1e-baee-a4d15df26518	leverages	Leverages	Strategy uses strength or opportunity	t	f	["strategy"]	["strength", "opportunity"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.968357+00	2025-11-24 06:04:36.968357+00
0aa98468-1db8-4888-9463-d5ba822e885a	0d986c61-472b-4c1e-baee-a4d15df26518	mitigates	Mitigates	Strategy addresses weakness or threat	t	f	["strategy"]	["weakness", "threat"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	arrow	{}	{}	2	2025-11-24 06:04:36.968788+00	2025-11-24 06:04:36.968788+00
5bcf614a-f067-4def-951e-11b599d62f51	2128d341-bd5d-4e68-975d-ab3eefbbabcc	same_direction	Same Direction (+)	Increase in source causes increase in target (or decrease causes decrease)	t	f	["variable"]	["variable"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.97124+00	2025-11-24 06:04:36.97124+00
80afe8da-be27-469f-851f-b0133602642e	2128d341-bd5d-4e68-975d-ab3eefbbabcc	opposite_direction	Opposite Direction (-)	Increase in source causes decrease in target (or vice versa)	t	f	["variable"]	["variable"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.971737+00	2025-11-24 06:04:36.971737+00
396dd5cf-ddbc-426d-bd44-dcc5b31c52a4	2128d341-bd5d-4e68-975d-ab3eefbbabcc	delayed	Delayed Effect	Influence occurs with a time delay	t	f	["variable"]	["variable"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	arrow	{}	{}	2	2025-11-24 06:04:36.972169+00	2025-11-24 06:04:36.972169+00
d24a1838-87c2-4e68-a934-cd5b6e152794	f2872a36-a5a1-48b5-ba87-6a117a56b5ab	choice	Choice	A possible choice from a decision	t	f	["decision"]	["chance", "outcome", "decision"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.975766+00	2025-11-24 06:04:36.975766+00
24f91cc2-7eda-417e-9e7e-13f5e5084a67	f2872a36-a5a1-48b5-ba87-6a117a56b5ab	probability	Probability	A probabilistic outcome from a chance node	t	f	["chance"]	["outcome", "decision", "chance"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.97623+00	2025-11-24 06:04:36.97623+00
957c63b3-9728-416b-8028-f3350f7c6ccf	ae88bcf7-5ca7-49ad-9c81-1382d6200176	is_a	Is A	Taxonomic relationship (specialization)	t	f	["sub_concept"]	["concept"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.978751+00	2025-11-24 06:04:36.978751+00
e8cc108d-ea1e-48a7-a8fc-6908558a2415	ae88bcf7-5ca7-49ad-9c81-1382d6200176	has_a	Has A	Compositional relationship (part-of)	t	f	["concept", "sub_concept"]	["concept", "sub_concept"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.979225+00	2025-11-24 06:04:36.979225+00
8e77cafc-a483-49a6-991c-ddb64ce49656	ae88bcf7-5ca7-49ad-9c81-1382d6200176	leads_to	Leads To	Causal or temporal relationship	t	f	["concept", "sub_concept"]	["concept", "sub_concept"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	2	2025-11-24 06:04:36.979581+00	2025-11-24 06:04:36.979581+00
a0ea32d0-eeff-4f8f-bfa7-785973300ec1	ae88bcf7-5ca7-49ad-9c81-1382d6200176	related_to	Related To	General association	f	f	["concept", "sub_concept"]	["concept", "sub_concept"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	none	{}	{}	3	2025-11-24 06:04:36.979902+00	2025-11-24 06:04:36.979902+00
774c92ca-af53-4bcb-a32b-0b24bcbc7585	5093c2f0-e225-4613-ad44-d406e3ce8633	precedes	Precedes	Occurs before in time	t	f	["event", "milestone", "period"]	["event", "milestone", "period"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	0	2025-11-24 06:04:36.983584+00	2025-11-24 06:04:36.983584+00
7e520238-0906-4b3c-9d3c-4702d5b1d3be	5093c2f0-e225-4613-ad44-d406e3ce8633	causes	Causes	Causal relationship between events	t	f	["event", "milestone"]	["event", "milestone"]	{"max": null, "min": 0}	{"max": null, "min": 0}	solid	\N	arrow	{}	{}	1	2025-11-24 06:04:36.984064+00	2025-11-24 06:04:36.984064+00
5bce4f36-b1d6-478d-93d2-f404bf9b9da2	5093c2f0-e225-4613-ad44-d406e3ce8633	during	During	Event occurs during a time period	t	f	["event", "milestone"]	["period"]	{"max": null, "min": 0}	{"max": null, "min": 0}	dashed	\N	none	{}	{}	2	2025-11-24 06:04:36.984405+00	2025-11-24 06:04:36.984405+00
\.


--
-- Data for Name: MethodologyNodeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyNodeTypes" (id, methodology_id, name, display_name, description, icon, color, properties_schema, default_properties, required_properties, constraints, suggestions, visual_config, display_order, created_at, updated_at) FROM stdin;
22ece396-8bc2-4427-af4e-17d80ed544e2	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	problem	Problem Statement	The initial problem or symptom	alert-circle	#EF4444	{"type": "object", "properties": {"title": {"type": "string"}, "impact": {"enum": ["low", "medium", "high", "critical"], "type": "string"}, "description": {"type": "string"}}}	{"impact": "medium"}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.944479+00	2025-11-24 06:04:36.944479+00
f839f050-0d16-4d75-ad4e-9ffa415a7ae6	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	why	Why Question	A why question exploring the cause	help-circle	#F59E0B	{"type": "object", "properties": {"depth": {"type": "number"}, "answer": {"type": "string"}, "question": {"type": "string"}}}	{"depth": 1}	{question,answer}	{}	{}	{}	1	2025-11-24 06:04:36.9458+00	2025-11-24 06:04:36.9458+00
7b8cf47a-4ed0-4027-9812-856f621c2f83	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	root_cause	Root Cause	The fundamental cause identified	target	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "confidence": {"type": "number", "maximum": 100, "minimum": 0}, "description": {"type": "string"}}}	{"confidence": 80}	{title}	{}	{}	{}	2	2025-11-24 06:04:36.946501+00	2025-11-24 06:04:36.946501+00
197813a2-d42c-419f-817e-14afd8e52069	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	solution	Solution	Proposed solution to address the root cause	lightbulb	#8B5CF6	{"type": "object", "properties": {"cost": {"enum": ["low", "medium", "high"], "type": "string"}, "title": {"type": "string"}, "timeframe": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	3	2025-11-24 06:04:36.947117+00	2025-11-24 06:04:36.947117+00
24af6f65-b233-4b3e-87cd-7a90f9728e5c	e3bcd3a8-db71-478d-8d06-76e2df3eb056	effect	Effect/Problem	The problem or effect being analyzed	alert-triangle	#DC2626	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.954115+00	2025-11-24 06:04:36.954115+00
374bb145-0511-4d44-89f2-06ce4190912c	e3bcd3a8-db71-478d-8d06-76e2df3eb056	category	Cause Category	Major category of causes (6Ms: Man, Machine, Method, Material, Measurement, Mother Nature)	folder	#7C3AED	{"type": "object", "properties": {"title": {"type": "string"}, "category": {"enum": ["Man", "Machine", "Method", "Material", "Measurement", "Mother Nature"], "type": "string"}}}	{}	{title,category}	{}	{}	{}	1	2025-11-24 06:04:36.954917+00	2025-11-24 06:04:36.954917+00
e2ae53f5-711b-4eb3-82b7-e857a6d1069f	e3bcd3a8-db71-478d-8d06-76e2df3eb056	cause	Potential Cause	Specific potential cause within a category	circle	#F59E0B	{"type": "object", "properties": {"title": {"type": "string"}, "likelihood": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"likelihood": "medium"}	{title}	{}	{}	{}	2	2025-11-24 06:04:36.955559+00	2025-11-24 06:04:36.955559+00
8b287fce-7605-4cb8-b923-711af71bcb0f	e3bcd3a8-db71-478d-8d06-76e2df3eb056	sub_cause	Sub-Cause	Deeper level cause contributing to parent cause	corner-down-right	#FBBF24	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	3	2025-11-24 06:04:36.956058+00	2025-11-24 06:04:36.956058+00
89d9a3ab-a042-4055-ac22-b8393e52eeb0	0fddcb04-5f21-46d9-ab73-41c1d01955e2	central_idea	Central Idea	The main topic or concept at the center	sun	#F59E0B	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.959625+00	2025-11-24 06:04:36.959625+00
d0bf0b31-41ac-4101-b4be-2638f1c845b6	0fddcb04-5f21-46d9-ab73-41c1d01955e2	main_branch	Main Branch	Primary theme or category	git-branch	#3B82F6	{"type": "object", "properties": {"color": {"type": "string"}, "title": {"type": "string"}}}	{}	{title}	{}	{}	{}	1	2025-11-24 06:04:36.960569+00	2025-11-24 06:04:36.960569+00
5a189704-b099-428c-94d9-59d49ff52016	0fddcb04-5f21-46d9-ab73-41c1d01955e2	sub_branch	Sub-Branch	Secondary idea or detail	corner-down-right	#10B981	{"type": "object", "properties": {"notes": {"type": "string"}, "title": {"type": "string"}}}	{}	{title}	{}	{}	{}	2	2025-11-24 06:04:36.961083+00	2025-11-24 06:04:36.961083+00
ddc40845-75d6-4c7b-a629-afaaade84afe	0fddcb04-5f21-46d9-ab73-41c1d01955e2	leaf	Leaf Node	Specific detail or example	file-text	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}	{}	{title}	{}	{}	{}	3	2025-11-24 06:04:36.961675+00	2025-11-24 06:04:36.961675+00
84e30ef6-029a-4b6f-a5c9-a8629fe10b3c	0d986c61-472b-4c1e-baee-a4d15df26518	objective	Objective	The goal or decision being analyzed	target	#6366F1	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.964464+00	2025-11-24 06:04:36.964464+00
15ffc784-e597-4fcc-9994-5d94b1cb8c8c	0d986c61-472b-4c1e-baee-a4d15df26518	strength	Strength	Internal positive attributes	trending-up	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "impact": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"impact": "medium"}	{title}	{}	{}	{}	1	2025-11-24 06:04:36.964969+00	2025-11-24 06:04:36.964969+00
80cef9d7-7235-4f2b-9461-97be243d0623	0d986c61-472b-4c1e-baee-a4d15df26518	weakness	Weakness	Internal negative attributes	trending-down	#EF4444	{"type": "object", "properties": {"title": {"type": "string"}, "severity": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"severity": "medium"}	{title}	{}	{}	{}	2	2025-11-24 06:04:36.965471+00	2025-11-24 06:04:36.965471+00
55d3c4cf-bfa5-49c1-a046-1c0b6f18ff82	0d986c61-472b-4c1e-baee-a4d15df26518	opportunity	Opportunity	External positive factors	sunrise	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "probability": {"enum": ["low", "medium", "high"], "type": "string"}}}	{"probability": "medium"}	{title}	{}	{}	{}	3	2025-11-24 06:04:36.966328+00	2025-11-24 06:04:36.966328+00
cb756886-b82a-4eca-a70e-31625b1547af	0d986c61-472b-4c1e-baee-a4d15df26518	threat	Threat	External negative factors	alert-triangle	#F59E0B	{"type": "object", "properties": {"risk": {"enum": ["low", "medium", "high"], "type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{"risk": "medium"}	{title}	{}	{}	{}	4	2025-11-24 06:04:36.966916+00	2025-11-24 06:04:36.966916+00
0129e64f-fcaa-4169-8bda-e63fdbe3be9f	0d986c61-472b-4c1e-baee-a4d15df26518	strategy	Strategy	Strategic action or recommendation	flag	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "priority": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"priority": "medium"}	{title}	{}	{}	{}	5	2025-11-24 06:04:36.967405+00	2025-11-24 06:04:36.967405+00
4f9c55a8-6313-4c97-bb71-4cc0f2be70b6	2128d341-bd5d-4e68-975d-ab3eefbbabcc	variable	Variable	A factor or element in the system	circle	#3B82F6	{"type": "object", "properties": {"type": {"enum": ["stock", "flow", "converter"], "type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{"type": "stock"}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.970319+00	2025-11-24 06:04:36.970319+00
a1c6fb65-0b8b-4311-a4cc-02a86ce76d03	2128d341-bd5d-4e68-975d-ab3eefbbabcc	loop_indicator	Loop Indicator	Indicates a reinforcing (R) or balancing (B) loop	refresh-cw	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "loop_type": {"enum": ["reinforcing", "balancing"], "type": "string"}, "description": {"type": "string"}}}	{}	{title,loop_type}	{}	{}	{}	1	2025-11-24 06:04:36.970807+00	2025-11-24 06:04:36.970807+00
5d6c5a8d-52b1-4f04-ba70-bf2e04ff4e88	f2872a36-a5a1-48b5-ba87-6a117a56b5ab	decision	Decision Point	A decision that needs to be made	square	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.973671+00	2025-11-24 06:04:36.973671+00
e0f9bca0-55dc-4a2c-b863-f7da30026189	f2872a36-a5a1-48b5-ba87-6a117a56b5ab	chance	Chance Node	Uncertain event with multiple possible outcomes	circle	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	1	2025-11-24 06:04:36.974503+00	2025-11-24 06:04:36.974503+00
6733e48e-b2a1-4dab-80d1-eea9ede5bf79	f2872a36-a5a1-48b5-ba87-6a117a56b5ab	outcome	Outcome	Final result or endpoint	flag	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "value": {"type": "number"}, "description": {"type": "string"}}}	{}	{title}	{}	{}	{}	2	2025-11-24 06:04:36.974984+00	2025-11-24 06:04:36.974984+00
90d3f8dc-afae-4418-98d0-984e04d0bb5e	ae88bcf7-5ca7-49ad-9c81-1382d6200176	concept	Concept	A key concept or idea	box	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "examples": {"type": "array", "items": {"type": "string"}}, "definition": {"type": "string"}}}	{"examples": []}	{title}	{}	{}	{}	0	2025-11-24 06:04:36.977573+00	2025-11-24 06:04:36.977573+00
99b38262-19de-4233-b30c-c7d832aec77a	ae88bcf7-5ca7-49ad-9c81-1382d6200176	sub_concept	Sub-Concept	A more specific concept	square	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "definition": {"type": "string"}}}	{}	{title}	{}	{}	{}	1	2025-11-24 06:04:36.978094+00	2025-11-24 06:04:36.978094+00
341f7b55-3b17-4569-9fff-bda841d97310	5093c2f0-e225-4613-ad44-d406e3ce8633	event	Event	A significant event or milestone	circle	#3B82F6	{"type": "object", "properties": {"date": {"type": "string", "format": "date"}, "title": {"type": "string"}, "importance": {"enum": ["low", "medium", "high", "critical"], "type": "string"}, "description": {"type": "string"}}}	{"importance": "medium"}	{title,date}	{}	{}	{}	0	2025-11-24 06:04:36.981395+00	2025-11-24 06:04:36.981395+00
47ec44da-18ff-4057-92f7-023ae5f0474d	5093c2f0-e225-4613-ad44-d406e3ce8633	period	Time Period	A span of time or era	calendar	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "end_date": {"type": "string", "format": "date"}, "start_date": {"type": "string", "format": "date"}, "description": {"type": "string"}}}	{}	{title,start_date}	{}	{}	{}	1	2025-11-24 06:04:36.982052+00	2025-11-24 06:04:36.982052+00
944a0125-1742-466d-8b38-afb66019b7a9	5093c2f0-e225-4613-ad44-d406e3ce8633	milestone	Milestone	A major achievement or turning point	flag	#F59E0B	{"type": "object", "properties": {"date": {"type": "string", "format": "date"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title,date}	{}	{}	{}	2	2025-11-24 06:04:36.982715+00	2025-11-24 06:04:36.982715+00
\.


--
-- Data for Name: MethodologyPermissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyPermissions" (id, methodology_id, user_id, can_view, can_fork, can_edit, can_delete, shared_by, shared_at, expires_at) FROM stdin;
\.


--
-- Data for Name: MethodologyTemplates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyTemplates" (id, methodology_id, title, summary, thumbnail_url, preview_data, price, currency, download_count, fork_count, is_featured, is_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MethodologyWorkflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyWorkflows" (id, methodology_id, steps, initial_canvas_state, is_linear, allow_skip, require_completion, instructions, example_graph_id, tutorial_url, created_at, updated_at) FROM stdin;
216cd6bd-7f98-49b5-b580-eaa9df6ab817	fbf0e448-f9be-4917-8f94-c5bf1ac693bb	[{"id": "step1", "type": "INSTRUCTION", "title": "Define the Problem", "config": {"nodeType": "problem"}, "description": "Start by clearly stating the problem you want to solve. Be specific about what is happening."}, {"id": "step2", "type": "NODE_CREATION", "title": "Ask the First Why", "config": {"nodeType": "why", "properties": {"depth": 1}}, "description": "Create the first \\"Why\\" question: Why is this problem occurring?"}, {"id": "step3", "type": "NODE_CREATION", "title": "Continue Asking Why", "config": {"repeat": true, "nodeType": "why"}, "description": "Keep asking why for each answer, typically 5 times or until you reach the root cause."}, {"id": "step4", "type": "NODE_CREATION", "title": "Identify Root Cause", "config": {"nodeType": "root_cause"}, "description": "Once you can't meaningfully ask \\"why\\" anymore, you've found your root cause."}, {"id": "step5", "type": "NODE_CREATION", "title": "Propose Solutions", "config": {"nodeType": "solution"}, "description": "Develop solutions that address the root cause, not just the symptoms."}]	{}	t	f	f	The 5 Whys technique helps you drill down to the root cause by repeatedly asking "why". Start with a clear problem statement and ask why it occurs. Each answer becomes the input for the next why question. Continue until you reach the fundamental cause.	\N	\N	2025-11-24 06:04:36.951483+00	2025-11-24 06:04:36.951483+00
\.


--
-- Data for Name: NodeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NodeTypes" (id, name, description, props, meta, ai, parent_node_type_id, created_at, updated_at) FROM stdin;
39bb2851-a7c9-4678-9185-b574433570ea	Fact	Verified factual statement	{"fields": ["statement", "source", "date"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
0ed7e79e-14dc-417f-8f8e-e1071eceb940	Person	Historical or contemporary person	{"fields": ["fullName", "birth", "death", "nationality"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	Event	Historical or current event	{"fields": ["title", "date", "location", "description"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
452fde61-103e-4dfa-a90b-ed263038def3	Location	Geographic location	{"fields": ["name", "coordinates", "country", "type"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
34c368b5-af0f-446f-839a-56a10ffd7692	Document	Primary source document	{"fields": ["title", "author", "publicationDate", "url"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
054fec53-1717-456e-b0dd-9f0ebc42f3dc	Concept	Scientific or philosophical concept	{"fields": ["name", "definition", "domain"]}	{}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	Article	A narrative document that references and connects multiple nodes with additional context and author commentary	{"schema": {"author_id": {"type": "string", "format": "uuid", "description": "Primary author user ID"}, "narrative": {"type": "string", "required": true, "description": "Markdown content of the article"}, "published": {"type": "boolean", "default": false, "required": true}, "permissions": {"type": "array", "items": {"type": "string"}, "description": "User IDs with edit permissions"}}}	{"category": "document", "isSpecialType": true}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	Claim	An assertion that may be true or false, subject to verification	{"schema": {"confidence": {"max": 1, "min": 0, "type": "number"}}}	{"category": "assertion"}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
c67dadf7-fce7-45ce-b396-34f58f938271	Place	A physical or geographic location	{"schema": {"address": {"type": "string"}, "latitude": {"type": "number"}, "longitude": {"type": "number"}}}	{"category": "entity", "schemaOrg": "Place"}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
2a6b6a28-9287-4668-971e-6f81c8b60b69	Thing	An object, document, or other physical/digital item	{"schema": {"itemType": {"type": "string"}}}	{"category": "entity", "schemaOrg": "Thing"}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
80d49f0d-07f7-469b-8626-a734add0a9b4	Thesis	A thesis statement that provides an overarching argument or position	{"schema": {"content": {"type": "string", "required": true, "description": "The thesis statement text"}, "citations": {"type": "array", "items": {"type": "string", "format": "uuid"}, "description": "Array of node IDs that this thesis cites"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
b6b7804b-76bf-4b51-9dd2-2034e52c792d	Citation	A reference to a source or node with attribution information	{"schema": {"url": {"type": "string", "format": "uri", "description": "URL to external source"}, "source": {"type": "string", "required": true, "description": "The citation source or reference"}, "authors": {"type": "array", "items": {"type": "string"}, "description": "Authors of the cited work"}, "sourceType": {"enum": "[\\"academic\\", \\"web\\", \\"book\\", \\"article\\", \\"node\\"]", "type": "string", "description": "Type of citation source"}, "publicationDate": {"type": "string", "format": "date", "description": "Date of publication"}, "referencedNodeId": {"type": "string", "format": "uuid", "description": "Node ID if citing an internal node"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
e09f640b-980d-4e00-b85d-bced7817306d	Reference	A general reference or note pointing to another node or external resource	{"schema": {"text": {"type": "string", "required": true, "description": "The reference text or note"}, "externalUrl": {"type": "string", "format": "uri", "description": "URL if referencing external resource"}, "targetNodeId": {"type": "string", "format": "uuid", "description": "Node ID if referencing an internal node"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N	2025-11-22 06:35:53.846782+00	2025-11-22 06:35:53.846782+00
b154518d-5702-4a3d-838f-61927e61698a	System	Parent category for core system node types	\N	\N	\N	\N	2025-11-23 20:46:19.302965+00	2025-11-23 20:46:19.302965+00
df7f1ead-44b0-46fa-b883-87f4ec036f89	Content	Parent category for content-related node types	\N	\N	\N	\N	2025-11-23 20:46:19.308666+00	2025-11-23 20:46:19.308666+00
009447a9-1a70-41f9-bd22-7b85adb31fe0	Social	Parent category for social interaction node types	\N	\N	\N	\N	2025-11-23 20:46:19.309343+00	2025-11-23 20:46:19.309343+00
bfbde1fe-a8a2-4aa3-ac02-2eafa5bce594	Curation	Parent category for curator system node types	\N	\N	\N	\N	2025-11-23 20:46:19.309825+00	2025-11-23 20:46:19.309825+00
d16b8c84-de54-4c14-a14e-12bd47870ab8	Media	Parent category for media processing node types	\N	\N	\N	\N	2025-11-23 20:46:19.310224+00	2025-11-23 20:46:19.310224+00
167942cb-1e9c-42c9-b697-787e5ff18707	Gamification	Parent category for gamification node types	\N	\N	\N	\N	2025-11-23 20:46:19.310507+00	2025-11-23 20:46:19.310507+00
5a3a067d-dd89-4d74-b9f6-437ec90d32e3	AI	Parent category for AI-related node types	\N	\N	\N	\N	2025-11-23 20:46:19.310806+00	2025-11-23 20:46:19.310806+00
3ad239a2-82b1-4baf-b1a0-c26d29ffd315	Notifications	Parent category for notification node types	\N	\N	\N	\N	2025-11-23 20:46:19.311064+00	2025-11-23 20:46:19.311064+00
e3e56704-d637-4745-b96c-ce3a100c86cb	Consensus	Parent category for consensus-related node types	\N	\N	\N	\N	2025-11-23 20:46:19.311316+00	2025-11-23 20:46:19.311316+00
51f548b7-f66b-4404-b928-afb13295ce09	Challenge	Challenge to a node or edge claiming inaccuracy or requesting updates	\N	\N	\N	df7f1ead-44b0-46fa-b883-87f4ec036f89	2025-11-23 20:46:19.311649+00	2025-11-23 20:46:19.311649+00
7c2b8294-bef7-4829-a791-64032920da2c	EvidenceFile	Uploaded file serving as evidence (PDF, DOCX, audio, video, image)	\N	\N	\N	df7f1ead-44b0-46fa-b883-87f4ec036f89	2025-11-23 20:46:19.312377+00	2025-11-23 20:46:19.312377+00
242dc8a9-bad3-41e7-93ba-014022f2a9e9	FormalInquiry	Structured inquiry following formal methodology (Scientific Method, Legal Discovery, etc.)	\N	\N	\N	df7f1ead-44b0-46fa-b883-87f4ec036f89	2025-11-23 20:46:19.312752+00	2025-11-23 20:46:19.312752+00
c7a107aa-8de5-417d-bdca-cfb2c9e62d97	ActivityPost	Twitter-like activity feed post with replies, shares, and mentions	\N	\N	\N	009447a9-1a70-41f9-bd22-7b85adb31fe0	2025-11-23 20:46:19.313074+00	2025-11-23 20:46:19.313074+00
13e5838a-258b-4940-ad25-6f1edff016e6	UserPresence	Real-time user presence tracking for collaboration	\N	\N	\N	009447a9-1a70-41f9-bd22-7b85adb31fe0	2025-11-23 20:46:19.313377+00	2025-11-23 20:46:19.313377+00
d7683496-63a7-4269-953c-f10b6322beb9	GraphInvitation	Invitation to collaborate on a graph	\N	\N	\N	009447a9-1a70-41f9-bd22-7b85adb31fe0	2025-11-23 20:46:19.313685+00	2025-11-23 20:46:19.313685+00
7a6a7699-af58-44cb-9a9d-c3b6808347cb	CuratorRole	Four-tier curator role definition (Community, Expert, Senior Expert, Principal)	\N	\N	\N	bfbde1fe-a8a2-4aa3-ac02-2eafa5bce594	2025-11-23 20:46:19.314006+00	2025-11-23 20:46:19.314006+00
ed74d69a-a33e-4aa0-bcec-b6fbf8c28726	UserCurator	User curator assignment linking user to curator role	\N	\N	\N	bfbde1fe-a8a2-4aa3-ac02-2eafa5bce594	2025-11-23 20:46:19.314343+00	2025-11-23 20:46:19.314343+00
72c4a920-9c01-4faf-b0f2-49f2cda3ee51	CuratorApplication	Application to become a curator	\N	\N	\N	bfbde1fe-a8a2-4aa3-ac02-2eafa5bce594	2025-11-23 20:46:19.314635+00	2025-11-23 20:46:19.314635+00
72f7149c-e582-4c17-a1e5-b6332a45ebab	CuratorAuditLog	Audit log entry for curator actions	\N	\N	\N	bfbde1fe-a8a2-4aa3-ac02-2eafa5bce594	2025-11-23 20:46:19.314922+00	2025-11-23 20:46:19.314922+00
08d2f019-b438-4d28-9d8d-8902571d4f39	MediaJob	Background job for processing audio/video/document files	\N	\N	\N	d16b8c84-de54-4c14-a14e-12bd47870ab8	2025-11-23 20:46:19.315375+00	2025-11-23 20:46:19.315375+00
0189f092-688e-47da-9105-ba707aba7201	DocumentSection	Extracted section from processed document	\N	\N	\N	d16b8c84-de54-4c14-a14e-12bd47870ab8	2025-11-23 20:46:19.315753+00	2025-11-23 20:46:19.315753+00
b6bb6c04-f500-4f91-9ad3-e69e06f8e656	VideoFrame	Extracted frame from video analysis	\N	\N	\N	d16b8c84-de54-4c14-a14e-12bd47870ab8	2025-11-23 20:46:19.31606+00	2025-11-23 20:46:19.31606+00
b1c197d3-b9ad-4646-b227-d1f51d4ce834	Achievement	Achievement definition for gamification	\N	\N	\N	167942cb-1e9c-42c9-b697-787e5ff18707	2025-11-23 20:46:19.316344+00	2025-11-23 20:46:19.316344+00
ef2fd8bf-764d-48cc-8a86-5bf2c2cab7e3	UserAchievement	User achievement unlock record	\N	\N	\N	167942cb-1e9c-42c9-b697-787e5ff18707	2025-11-23 20:46:19.316701+00	2025-11-23 20:46:19.316701+00
ec8affba-dd05-415c-a524-1a0bdc9bca90	Conversation	AI assistant conversation session	\N	\N	\N	5a3a067d-dd89-4d74-b9f6-437ec90d32e3	2025-11-23 20:46:19.317026+00	2025-11-23 20:46:19.317026+00
ca85aed6-aa09-466a-916a-3669c779635a	ConversationMessage	Individual message in AI conversation	\N	\N	\N	5a3a067d-dd89-4d74-b9f6-437ec90d32e3	2025-11-23 20:46:19.317369+00	2025-11-23 20:46:19.317369+00
d1079518-5551-4d11-a90d-b8769608eade	Notification	User notification for activity, challenges, mentions, etc.	\N	\N	\N	3ad239a2-82b1-4baf-b1a0-c26d29ffd315	2025-11-23 20:46:19.317736+00	2025-11-23 20:46:19.317736+00
ebfb4f4f-9712-4ba4-8278-c515cc46a78d	ConsensusVote	Community vote on challenges, promotions, and curation decisions	\N	\N	\N	e3e56704-d637-4745-b96c-ce3a100c86cb	2025-11-23 20:46:19.318148+00	2025-11-23 20:46:19.318148+00
\.


--
-- Data for Name: Nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Nodes" (id, node_type_id, props, ai, created_at, updated_at, methodology_node_type_id) FROM stdin;
10000000-0000-0000-0000-000000000001	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"born": "1917-05-29", "died": "1963-11-22", "role": "35th President of the United States"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
10000000-0000-0000-0000-000000000002	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"born": "1939-10-18", "died": "1963-11-24", "role": "Alleged assassin"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
20000000-0000-0000-0000-000000000001	c67dadf7-fce7-45ce-b396-34f58f938271	{"location": "Dallas, Texas", "coordinates": "32.7787,-96.8089"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
30000000-0000-0000-0000-000000000001	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1963-11-22", "time": "12:30 PM CST", "location": "Dealey Plaza, Dallas, Texas"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
40000000-0000-0000-0000-000000000001	2a6b6a28-9287-4668-971e-6f81c8b60b69	{"type": "Official Investigation Report", "pages": 888, "published": "1964-09-27"}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
50000000-0000-0000-0000-000000000001	39bb2851-a7c9-4678-9185-b574433570ea	{"evidence": "Witness testimony, acoustic analysis", "verified": true}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
60000000-0000-0000-0000-000000000001	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Witness reports of grassy knoll shots", "disputed": true}	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
80000000-0000-0000-0000-000000000001	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	\N	\N	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	\N
b8966792-be02-47cb-bc23-564d1470385c	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 1, "status": "published", "articleType": "investigation", "methodology": "Scientific Method"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
3daf3c3d-1351-4641-8c90-2154f89efa53	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "verified", "source": "NASA", "category": "astronomy", "statement": "Earth is the third planet from the Sun"}	\N	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	\N
44e957b4-6073-42e1-b61e-d815b734d58b	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1983", "source": "BIPM", "category": "physics", "statement": "The speed of light in vacuum is approximately 299,792,458 meters per second"}	\N	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	\N
75dce521-38fc-4012-8ecd-0ab6d3a8ac99	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "verified", "source": "IUPAC", "category": "chemistry", "statement": "Water (H2O) consists of two hydrogen atoms and one oxygen atom"}	\N	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	\N
47c88546-6dc5-45c2-8425-507366913140	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"birth": "1879-03-14", "death": "1955-04-18", "fullName": "Albert Einstein", "occupation": "Theoretical Physicist", "nationality": "German/American"}	\N	2025-10-10 19:54:55.97313+00	2025-10-10 19:54:55.97313+00	\N
13eddbb0-a30c-4304-81a2-c383745fa24b	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 90, "y": 210, "label": "New Node"}	\N	2025-10-10 23:24:21.363041+00	2025-10-10 23:24:21.363041+00	\N
0035ed14-67d6-4d82-825e-cd5664178bc5	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1964-09-27", "type": "official_document", "pages": 888, "title": "Warren Commission Report", "endDate": "1964-09-27", "startDate": "1963-11-22", "conclusion": "single gunman", "description": "Official 888-page report released September 27, 1964, concluding Lee Harvey Oswald acted alone", "commission_members": ["Earl Warren", "Gerald Ford", "Allen Dulles", "John McCloy", "Richard Russell", "John Cooper", "Hale Boggs"]}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
5a80b204-fbe4-4d91-98fd-bed22d36a1db	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "type": "primary_evidence", "title": "Zapruder Film", "frames": 486, "duration": "PT26.6S", "frame_rate": "18.3 fps", "key_frames": {"225": "first visible reaction", "313": "fatal shot"}, "description": "26.6-second 8mm film shot by Abraham Zapruder showing the assassination"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
28934a5c-2a2c-4f1b-9858-2adfc9549f11	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "ppm", "year": 2024, "value": 420, "source": "Mauna Loa Observatory"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
3acf52cf-5dc5-4588-926d-c0a67780a63a	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "°C", "value": 1.1, "source": "NASA GISS", "baseline": "1850-1900"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
cd318d60-a817-46a7-a647-991ffa6dccef	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
a4089f0b-84bc-4135-a103-08c4d9e2cdad	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
a309d337-99d2-495d-a00b-400507492aba	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
277add5f-6120-47ef-8c47-79ccd203ce17	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "cd318d60-a817-46a7-a647-991ffa6dccef"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
8c2a137e-32d9-42c3-b90c-b6abdffdafee	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "cd318d60-a817-46a7-a647-991ffa6dccef"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
26dcc10a-fe1e-4e6a-9aec-59049d0116c0	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a4089f0b-84bc-4135-a103-08c4d9e2cdad"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
cb9a4571-7758-4ac6-a708-829507fd2062	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a4089f0b-84bc-4135-a103-08c4d9e2cdad"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
a7b848a7-4d3f-4cfe-b881-5c3ade796b91	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a309d337-99d2-495d-a00b-400507492aba"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
5c8e39f0-b8f8-499a-b306-43550984165f	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Grassy Knoll Second Shooter", "evidence": ["witness testimony", "smoke", "acoustic evidence"], "proponents": ["Mark Lane", "Jim Garrison"], "description": "Theory of second shooter positioned on grassy knoll"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
8124540d-4561-4c4f-a23e-ec96690beb26	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Military-Industrial Complex", "motives": ["Vietnam withdrawal", "defense contracts", "Cold War"], "description": "Theory related to Vietnam War escalation and defense contracts", "beneficiaries": ["defense contractors", "Pentagon hawks"]}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
c52a647b-1a82-4096-91c0-0a272233023c	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "forensic_analysis", "frame": 313, "title": "Fatal Head Shot Analysis", "exit_wound": "right temporal", "description": "Conflicting analyses of final shot direction", "direction_debate": ["back and to left", "forward snap"]}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
2acf6a09-5424-41f6-a6de-8b3ed3f0fbee	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "LBJ Involvement Theory", "motives": ["political ambition", "Bobby Baker scandal", "Texas oil interests"], "evidence": ["Mac Wallace fingerprint claim"], "description": "Theory that Vice President Johnson was involved"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
e82d927e-c3f4-4c0f-9065-5443ddc9d69d	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Umbrella Man Signal Theory", "testimony": "1978 HSCA", "description": "Theory that man with umbrella was signaling shooters", "identified_as": "Louie Steven Witt", "claimed_reason": "protest symbol"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
54ce63f9-3b22-4b4a-8a46-fe96bafa8e99	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a309d337-99d2-495d-a00b-400507492aba"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
c8e4a9cd-689e-45b2-80e0-7923dd2a7f6f	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "mm/year", "value": 3.3, "period": "1993-2023", "source": "Satellite altimetry"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
68069834-5a4d-46ca-b995-f421c406aac8	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "%/decade", "value": 13, "source": "NSIDC"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
680d72e8-0df9-4a72-a195-958646f7f0c3	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Detection and attribution studies", "confidence": 0.99}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
547cf3ec-eb1f-4858-8a14-7e407e308520	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Event attribution analysis", "confidence": 0.85}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
a3ec4981-5c2d-493a-b14d-9ef70c733038	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Empirical policy studies", "confidence": 0.75}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate scientist", "affiliation": "Penn State University"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
e98e166d-e214-48e8-b0f1-731e29411856	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate scientist", "affiliation": "Texas Tech University"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
c6912ea8-62b6-451d-bbd1-7a867f5f2961	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate diplomat", "affiliation": "UNFCCC"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
e8ae70b8-f4d5-4560-a551-cf418c2119c2	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "2021-08-09", "significance": "Major assessment report"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
73b8ac00-a028-4e65-b9ae-b6d727cdb735	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "12:30:00 CST", "type": "timeline_event", "frame": "160-224", "title": "12:30 PM - First Shot", "location": "Dealey Plaza", "description": "First shot fired in Dealey Plaza"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
44902b47-f0f6-4438-94a0-88f2db717c4b	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "2015-12-12", "significance": "International climate treaty"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
e8218bc6-0cdb-4e3d-bb1a-dc26dc1b05dc	452fde61-103e-4dfa-a90b-ed263038def3	{"lat": 19.5362, "lon": -155.5763, "type": "Research station"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
e8c83211-9cc2-494b-8f44-d4fea6451d84	452fde61-103e-4dfa-a90b-ed263038def3	{"type": "Continent"}	\N	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	\N
ae7a5e2d-8dc5-4d98-9b04-2dfaffce91f5	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22T12:00:00", "time": "12:30 PM CST", "type": "physical_evidence", "title": "Dealey Plaza Crime Scene", "location": "Dallas, TX", "description": "Physical location of assassination with documented positions and trajectories", "witnesses_present": 600}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
081a541c-235a-44bb-9b11-73557b415329	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 390, "y": 60, "label": "New Node"}	\N	2025-10-10 23:35:20.232892+00	2025-10-10 23:35:20.232892+00	\N
0afeb2a9-4be9-4ef2-97a6-5a1c08664ca7	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22", "type": "witness_testimony", "title": "Grassy Knoll Witnesses", "location": "grassy knoll", "description": "51 witnesses reported shots from grassy knoll area", "total_witnesses": 51, "notable_witnesses": ["S.M. Holland", "Lee Bowers", "Jean Hill", "Mary Moorman"]}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
3ab32bd7-2751-4c08-8c6c-7798f99a0826	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 60, "y": 135, "label": "New Node"}	\N	2025-10-10 23:35:25.837446+00	2025-10-10 23:35:25.837446+00	\N
8a9ab74c-0a48-4ee8-a0e8-74a8bae23c74	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 75, "y": 255, "label": "New Node"}	\N	2025-10-10 23:35:28.235246+00	2025-10-10 23:35:28.235246+00	\N
f251cd21-c390-430b-a472-72bb8c3aa5f3	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Three Tramps Theory", "released": "without charges", "identified": ["Harold Doyle", "John Gedney", "Gus Abrams"], "arrest_time": "2:00 PM", "description": "Theory that three arrested tramps were CIA operatives"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
28fc56fe-e65a-4215-941e-da364b7d66a1	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "12:30:13 CST", "type": "timeline_event", "title": "12:30:13 PM - Fatal Shot", "description": "Fatal head shot at Zapruder frame 313", "zapruder_frame": 313}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
5c9c1f78-5d2c-436b-b4aa-cad87032b68e	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "1:00 PM CST", "type": "timeline_event", "title": "1:00 PM - JFK Pronounced Dead", "doctor": "Dr. Kemp Clark", "location": "Parkland Hospital", "description": "President Kennedy pronounced dead at Parkland Hospital"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
9de40b8d-a299-410e-96fb-c7c7cf2f3b7e	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-24", "type": "audio_evidence", "title": "Dallas Police Dictabelt Recording", "channel": "Channel 1", "officer": "H.B. McLain", "duration": "5.5 minutes", "description": "Audio recording from motorcycle officer microphone suggesting 4 shots", "shots_detected": 4}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
b1329687-de12-45da-9d8d-eeb5ae8a87d8	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "time": "8:00 PM EST", "type": "medical_document", "title": "Bethesda Autopsy Report", "doctors": ["James Humes", "Thornton Boswell", "Pierre Finck"], "description": "Official autopsy conducted at Bethesda Naval Hospital by Commanders Humes and Boswell", "wounds_documented": 3}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
2f436e7b-08bd-479f-bb53-7f12c88c692e	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 225, "y": 330, "label": "New Node"}	\N	2025-10-10 23:35:36.006889+00	2025-10-10 23:35:36.006889+00	\N
c33a6961-9a04-43fd-8664-da7a204831a1	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "physical_evidence", "title": "CE 399 Magic Bullet", "weight": "158.6 grains", "exhibit": "CE 399", "condition": "nearly pristine", "controversy": "single bullet theory", "description": "Nearly pristine bullet found on Connally stretcher"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
f4e4faaf-839a-40ee-b36c-a715d7a4a9ba	34c368b5-af0f-446f-839a-56a10ffd7692	{"type": "classified_documents", "pages": 2800, "title": "CIA JFK Files (Released 2017)", "topics": ["Oswald Mexico City", "Operation Mongoose", "Anti-Castro plots"], "description": "Previously classified CIA documents released under JFK Records Act", "foundingDate": "1947-09-18", "release_date": "2017-10-26", "still_withheld": 300}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
fcc88fd8-9fe0-475b-90ae-4a6178c79f57	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"name": "Lee Harvey Oswald", "time": "1:50 PM CST", "type": "timeline_event", "title": "1:50 PM - Oswald Arrested", "charge": "Tippit murder", "location": "Texas Theatre", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "Lee Harvey Oswald arrested at Texas Theatre"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-23", "name": "Lee Harvey Oswald", "type": "testimony", "title": "Oswald Interrogation Notes", "duration": "PT12H", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "Notes from 12 hours of interrogation before Oswald death", "no_recording": true, "oswald_claim": "patsy", "interrogators": ["Will Fritz", "FBI agents", "Secret Service"]}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
b0da62c1-6de0-4a2e-8b7e-73ca520d6948	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1979-03-29", "type": "official_document", "title": "House Select Committee Report", "conclusion": "probable conspiracy", "description": "1979 Congressional investigation concluding probable conspiracy based on acoustic evidence", "probability": "95%", "acoustic_shots": 4}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
43982202-5efe-4661-a258-98d8c0252a13	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "CIA Conspiracy Theory", "motives": ["Bay of Pigs", "Cuba policy", "Vietnam"], "suspects": ["E. Howard Hunt", "David Morales"], "operation": "Operation 40", "description": "Theory that CIA orchestrated assassination due to Bay of Pigs and Cuba policy", "foundingDate": "1947-09-18"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
a71a5df2-9d5f-4391-8c09-599ebd0bd34f	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "shots": 3, "title": "Lone Gunman Theory", "location": "TSBD 6th floor", "proponents": ["Warren Commission", "Gerald Posner", "Vincent Bugliosi"], "description": "Official Warren Commission conclusion that Oswald acted alone"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
3557a30f-7982-4edc-b74c-c1d5355c69c3	34c368b5-af0f-446f-839a-56a10ffd7692	{"name": "Lee Harvey Oswald", "type": "intelligence_file", "agent": "James Hosty", "title": "FBI Oswald File", "opened": "1959", "reason": "Soviet defection", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "FBI surveillance and investigation files on Lee Harvey Oswald pre-assassination", "foundingDate": "1908-07-26", "visits_to_home": 2}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
64438350-5142-4037-b48e-9a8e2981ab43	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Organized Crime Theory", "motives": ["RFK prosecution", "Cuba casinos", "Teamsters"], "suspects": ["Carlos Marcello", "Santo Trafficante", "Sam Giancana"], "description": "Theory that Mafia killed JFK over RFK prosecution and Cuba casinos"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
111cd7ae-e3cd-489d-8ee6-02b55f844fc1	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "type": "medical_testimony", "title": "Parkland Hospital Reports", "doctors": ["Malcolm Perry", "Charles Carrico", "Robert McClelland"], "description": "Initial medical reports from emergency room doctors", "wound_description": "anterior neck wound", "initial_assessment": "entrance wound"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
9e671fe6-fba3-4aa7-98ce-bfa70709004d	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22", "type": "physical_evidence", "found": "TSBD 6th floor", "owner": "A. Hidell (Oswald alias)", "title": "Mannlicher-Carcano Rifle", "caliber": "6.5mm", "description": "6.5mm Italian rifle found on 6th floor of Texas School Book Depository", "manufacturer": "Mannlicher-Carcano", "serial_number": "C2766"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
0187ed56-23f2-41c8-a1bd-7197d9f3f213	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "ballistic_theory", "title": "Single Bullet Theory", "wounds": 7, "exhibit": "CE 399", "proponent": "Arlen Specter", "trajectory": "downward 17 degrees", "description": "Theory that one bullet caused 7 wounds in Kennedy and Connally"}	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	\N
59ce9efa-e932-47f4-982f-baf801a8792e	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"birth": "1867-11-07", "death": "1934-07-04", "fullName": "Marie Curie", "occupation": "Physicist and Chemist", "nationality": "Polish/French"}	\N	2025-10-10 19:54:55.97313+00	2025-10-10 19:54:55.97313+00	\N
76f02a95-9e52-48eb-b059-f6b30ac35b21	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1969-07-20", "title": "Moon Landing - Apollo 11", "location": "Moon - Sea of Tranquility", "description": "First human landing on the Moon"}	\N	2025-10-10 19:54:55.973848+00	2025-10-10 19:54:55.973848+00	\N
0455fdfd-affe-4c2d-ab06-6a6da62b6748	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1859-11-24", "title": "Publication of On the Origin of Species", "location": "London, England", "description": "Charles Darwin published his theory of evolution"}	\N	2025-10-10 19:54:55.973848+00	2025-10-10 19:54:55.973848+00	\N
1220bfa2-56e0-4d78-8382-0bed1b826fe0	452fde61-103e-4dfa-a90b-ed263038def3	{"name": "Mount Everest", "type": "Mountain", "country": "Nepal/China", "elevation": "8,848.86 meters", "coordinates": "27.9881°N, 86.9250°E"}	\N	2025-10-10 19:54:55.97452+00	2025-10-10 19:54:55.97452+00	\N
f9c7ab8b-aee8-4305-9091-02d1c48e2372	054fec53-1717-456e-b0dd-9f0ebc42f3dc	{"name": "Theory of Relativity", "domain": "Physics", "definition": "Physical theory describing gravity and spacetime", "proposedBy": "Albert Einstein"}	\N	2025-10-10 19:54:55.974959+00	2025-10-10 19:54:55.974959+00	\N
5a390a8a-ff1b-4f0a-bc23-cd476c39b339	054fec53-1717-456e-b0dd-9f0ebc42f3dc	{"name": "DNA Structure", "domain": "Biology", "definition": "Double helix structure of deoxyribonucleic acid", "discoveredBy": "Watson and Crick"}	\N	2025-10-10 19:54:55.974959+00	2025-10-10 19:54:55.974959+00	\N
33090bc4-2bb4-4065-829f-b6c3b2fdfa14	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 75, "y": 165, "label": "New Node"}	\N	2025-10-10 23:24:34.066392+00	2025-10-10 23:24:34.066392+00	\N
2878bd8e-761a-4d25-92d3-aa1419dbefc8	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 30, "y": 180, "label": "New Node"}	\N	2025-10-10 23:24:42.592614+00	2025-10-10 23:24:42.592614+00	\N
b38a726f-c13e-4529-9b31-0e3acaff28b2	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 165, "y": 120, "label": "New Node"}	\N	2025-10-10 23:24:47.574902+00	2025-10-10 23:24:47.574902+00	\N
5af2dcf1-1265-49a6-9a01-1150efc7f45d	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 195, "y": 285, "label": "New Node"}	\N	2025-10-10 23:25:07.298281+00	2025-10-10 23:25:07.298281+00	\N
\.


--
-- Data for Name: UserMethodologyProgress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserMethodologyProgress" (id, user_id, graph_id, methodology_id, current_step, completed_steps, step_data, status, completion_percentage, started_at, last_active_at, completed_at) FROM stdin;
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, username, email, password_hash, created_at) FROM stdin;
\.


--
-- Data for Name: edge_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_types (id, name, source_node_type_id, target_node_type_id, props, ai, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: edges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edges (id, source_node_id, target_node_id, edge_type_id, props, ai, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: node_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.node_types (id, name, parent_node_type_id, props, ai, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nodes (id, node_type_id, props, ai, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at) FROM stdin;
065885e4-c078-4b01-8faa-27be82f4720c	user	Standard user with basic permissions	2025-11-24 05:57:22.18522+00
01491c57-d562-4ff9-937b-a78d388fd6c9	admin	Administrator with elevated permissions	2025-11-24 05:57:22.18522+00
eabbd019-95f2-4a95-a55c-5048a3b1576c	super_admin	Super administrator with full system access	2025-11-24 05:57:22.18522+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at, description, checksum, execution_time_ms) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, first_name, last_name, is_active, is_verified, created_at, updated_at, last_login_at) FROM stdin;
\.


--
-- Data for Name: embedding_jobs; Type: TABLE DATA; Schema: sys; Owner: postgres
--

COPY sys.embedding_jobs (id, node_id, props, status, attempts, max_attempts, error_message, created_at, started_at, completed_at, worker_id, processing_duration_ms) FROM stdin;
\.


--
-- Name: Challenges Challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_pkey" PRIMARY KEY (id);


--
-- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);


--
-- Name: EdgeTypes EdgeTypes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_name_key" UNIQUE (name);


--
-- Name: EdgeTypes EdgeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_pkey" PRIMARY KEY (id);


--
-- Name: Edges Edges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_pkey" PRIMARY KEY (id);


--
-- Name: Graphs Graphs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_pkey" PRIMARY KEY (id);


--
-- Name: Methodologies Methodologies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyEdgeTypes MethodologyEdgeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT "MethodologyEdgeTypes_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyNodeTypes MethodologyNodeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT "MethodologyNodeTypes_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyPermissions MethodologyPermissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyTemplates MethodologyTemplates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyTemplates"
    ADD CONSTRAINT "MethodologyTemplates_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_pkey" PRIMARY KEY (id);


--
-- Name: NodeTypes NodeTypes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_name_key" UNIQUE (name);


--
-- Name: NodeTypes NodeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_pkey" PRIMARY KEY (id);


--
-- Name: Nodes Nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_pkey" PRIMARY KEY (id);


--
-- Name: UserMethodologyProgress UserMethodologyProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_email_key" UNIQUE (email);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key" UNIQUE (username);


--
-- Name: edge_types edge_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_types
    ADD CONSTRAINT edge_types_name_key UNIQUE (name);


--
-- Name: edge_types edge_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_types
    ADD CONSTRAINT edge_types_pkey PRIMARY KEY (id);


--
-- Name: edges edges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_pkey PRIMARY KEY (id);


--
-- Name: node_types node_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_types
    ADD CONSTRAINT node_types_name_key UNIQUE (name);


--
-- Name: node_types node_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_types
    ADD CONSTRAINT node_types_pkey PRIMARY KEY (id);


--
-- Name: nodes nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_pkey PRIMARY KEY (id);


--
-- Name: MethodologyTemplates one_template_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyTemplates"
    ADD CONSTRAINT one_template_per_methodology UNIQUE (methodology_id);


--
-- Name: MethodologyWorkflows one_workflow_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT one_workflow_per_methodology UNIQUE (methodology_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: MethodologyEdgeTypes unique_edge_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: MethodologyNodeTypes unique_node_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: MethodologyPermissions unique_permission_per_user_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT unique_permission_per_user_methodology UNIQUE (methodology_id, user_id);


--
-- Name: UserMethodologyProgress unique_progress_per_user_graph; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT unique_progress_per_user_graph UNIQUE (user_id, graph_id);


--
-- Name: Methodologies unique_system_methodology_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT unique_system_methodology_name UNIQUE (name, is_system);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: embedding_jobs embedding_jobs_pkey; Type: CONSTRAINT; Schema: sys; Owner: postgres
--

ALTER TABLE ONLY sys.embedding_jobs
    ADD CONSTRAINT embedding_jobs_pkey PRIMARY KEY (id);


--
-- Name: Challenges_target_edge_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_edge_id_idx" ON public."Challenges" USING btree (target_edge_id);


--
-- Name: Challenges_target_edge_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_edge_id_idx1" ON public."Challenges" USING btree (target_edge_id);


--
-- Name: Challenges_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_node_id_idx" ON public."Challenges" USING btree (target_node_id);


--
-- Name: Challenges_target_node_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_node_id_idx1" ON public."Challenges" USING btree (target_node_id);


--
-- Name: Comments_author_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_author_id_idx" ON public."Comments" USING btree (author_id);


--
-- Name: Comments_author_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_author_id_idx1" ON public."Comments" USING btree (author_id);


--
-- Name: Comments_target_edge_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_edge_id_idx" ON public."Comments" USING btree (target_edge_id);


--
-- Name: Comments_target_edge_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_edge_id_idx1" ON public."Comments" USING btree (target_edge_id);


--
-- Name: Comments_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_node_id_idx" ON public."Comments" USING btree (target_node_id);


--
-- Name: Comments_target_node_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_node_id_idx1" ON public."Comments" USING btree (target_node_id);


--
-- Name: Edges_edge_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_edge_type_id_idx" ON public."Edges" USING btree (edge_type_id);


--
-- Name: Edges_edge_type_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_edge_type_id_idx1" ON public."Edges" USING btree (edge_type_id);


--
-- Name: Edges_edge_type_id_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_edge_type_id_idx2" ON public."Edges" USING btree (edge_type_id);


--
-- Name: Edges_source_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_source_node_id_idx" ON public."Edges" USING btree (source_node_id);


--
-- Name: Edges_source_node_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_source_node_id_idx1" ON public."Edges" USING btree (source_node_id);


--
-- Name: Edges_source_node_id_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_source_node_id_idx2" ON public."Edges" USING btree (source_node_id);


--
-- Name: Edges_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_target_node_id_idx" ON public."Edges" USING btree (target_node_id);


--
-- Name: Edges_target_node_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_target_node_id_idx1" ON public."Edges" USING btree (target_node_id);


--
-- Name: Edges_target_node_id_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_target_node_id_idx2" ON public."Edges" USING btree (target_node_id);


--
-- Name: Graphs_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Graphs_created_by_idx" ON public."Graphs" USING btree (created_by);


--
-- Name: Graphs_level_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Graphs_level_idx" ON public."Graphs" USING btree (level);


--
-- Name: Nodes_node_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_node_type_id_idx" ON public."Nodes" USING btree (node_type_id);


--
-- Name: Nodes_node_type_id_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_node_type_id_idx1" ON public."Nodes" USING btree (node_type_id);


--
-- Name: Nodes_node_type_id_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_node_type_id_idx2" ON public."Nodes" USING btree (node_type_id);


--
-- Name: idx_edge_types_ai_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_types_ai_hnsw ON public.edge_types USING hnsw (ai public.vector_cosine_ops) WITH (m='16', ef_construction='200');


--
-- Name: INDEX idx_edge_types_ai_hnsw; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_edge_types_ai_hnsw IS 'HNSW index for fast vector similarity search on edge types';


--
-- Name: idx_edge_types_props; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_types_props ON public.edge_types USING gin (props);


--
-- Name: idx_edge_types_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_types_source ON public.edge_types USING btree (source_node_type_id);


--
-- Name: idx_edge_types_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_types_target ON public.edge_types USING btree (target_node_type_id);


--
-- Name: idx_edges_ai_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_ai_hnsw ON public.edges USING hnsw (ai public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: INDEX idx_edges_ai_hnsw; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_edges_ai_hnsw IS 'HNSW index for fast vector similarity search on edges';


--
-- Name: idx_edges_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_created_at ON public.edges USING btree (created_at);


--
-- Name: idx_edges_edge_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_edge_type ON public.edges USING btree (edge_type_id);


--
-- Name: idx_edges_edge_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_edge_type_id ON public."Edges" USING btree (edge_type_id);


--
-- Name: idx_edges_methodology_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_methodology_type ON public."Edges" USING btree (methodology_edge_type_id);


--
-- Name: idx_edges_props; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_props ON public.edges USING gin (props);


--
-- Name: idx_edges_props_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_props_created_by ON public."Edges" USING btree (((props ->> 'createdBy'::text)));


--
-- Name: idx_edges_props_graph_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_props_graph_id ON public."Edges" USING btree (((props ->> 'graphId'::text)));


--
-- Name: idx_edges_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_source ON public.edges USING btree (source_node_id);


--
-- Name: idx_edges_source_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_source_node_id ON public."Edges" USING btree (source_node_id);


--
-- Name: idx_edges_source_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_source_type ON public.edges USING btree (source_node_id, edge_type_id);


--
-- Name: idx_edges_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_target ON public.edges USING btree (target_node_id);


--
-- Name: idx_edges_target_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_target_node_id ON public."Edges" USING btree (target_node_id);


--
-- Name: idx_edges_target_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_target_type ON public.edges USING btree (target_node_id, edge_type_id);


--
-- Name: idx_graphs_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_graphs_methodology ON public."Graphs" USING btree (methodology_id);


--
-- Name: idx_methodologies_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodologies_category ON public."Methodologies" USING btree (category);


--
-- Name: idx_methodologies_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodologies_created_by ON public."Methodologies" USING btree (created_by);


--
-- Name: idx_methodologies_is_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodologies_is_system ON public."Methodologies" USING btree (is_system);


--
-- Name: idx_methodologies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodologies_status ON public."Methodologies" USING btree (status);


--
-- Name: idx_methodologies_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodologies_tags ON public."Methodologies" USING gin (tags);


--
-- Name: idx_methodology_edge_types_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes" USING btree (methodology_id);


--
-- Name: idx_methodology_node_types_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_node_types_methodology ON public."MethodologyNodeTypes" USING btree (methodology_id);


--
-- Name: idx_methodology_permissions_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_permissions_methodology ON public."MethodologyPermissions" USING btree (methodology_id);


--
-- Name: idx_methodology_permissions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_permissions_user ON public."MethodologyPermissions" USING btree (user_id);


--
-- Name: idx_methodology_workflows_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_workflows_methodology ON public."MethodologyWorkflows" USING btree (methodology_id);


--
-- Name: idx_node_types_ai_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_types_ai_hnsw ON public.node_types USING hnsw (ai public.vector_cosine_ops) WITH (m='16', ef_construction='200');


--
-- Name: INDEX idx_node_types_ai_hnsw; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_node_types_ai_hnsw IS 'HNSW index for fast vector similarity search on node types';


--
-- Name: idx_node_types_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_types_parent ON public.node_types USING btree (parent_node_type_id);


--
-- Name: idx_node_types_props; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_types_props ON public.node_types USING gin (props);


--
-- Name: idx_nodes_ai_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_ai_hnsw ON public.nodes USING hnsw (ai public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: INDEX idx_nodes_ai_hnsw; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_nodes_ai_hnsw IS 'HNSW index for fast vector similarity search on nodes (RAG)';


--
-- Name: idx_nodes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_created_at ON public.nodes USING btree (created_at);


--
-- Name: idx_nodes_methodology_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_methodology_type ON public."Nodes" USING btree (methodology_node_type_id);


--
-- Name: idx_nodes_node_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_node_type ON public.nodes USING btree (node_type_id);


--
-- Name: idx_nodes_node_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_node_type_id ON public."Nodes" USING btree (node_type_id);


--
-- Name: idx_nodes_props; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_props ON public.nodes USING gin (props);


--
-- Name: idx_nodes_props_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_props_created_by ON public."Nodes" USING btree (((props ->> 'createdBy'::text)));


--
-- Name: idx_nodes_props_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_props_gin ON public."Nodes" USING gin (props);


--
-- Name: idx_nodes_props_graph_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_props_graph_id ON public."Nodes" USING btree (((props ->> 'graphId'::text)));


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_user_progress_graph; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_progress_graph ON public."UserMethodologyProgress" USING btree (graph_id);


--
-- Name: idx_user_progress_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_progress_methodology ON public."UserMethodologyProgress" USING btree (methodology_id);


--
-- Name: idx_user_progress_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_progress_status ON public."UserMethodologyProgress" USING btree (status);


--
-- Name: idx_user_progress_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_progress_user ON public."UserMethodologyProgress" USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_embedding_jobs_active; Type: INDEX; Schema: sys; Owner: postgres
--

CREATE INDEX idx_embedding_jobs_active ON sys.embedding_jobs USING btree (created_at, status) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: idx_embedding_jobs_created_at; Type: INDEX; Schema: sys; Owner: postgres
--

CREATE INDEX idx_embedding_jobs_created_at ON sys.embedding_jobs USING btree (created_at);


--
-- Name: idx_embedding_jobs_node_active; Type: INDEX; Schema: sys; Owner: postgres
--

CREATE UNIQUE INDEX idx_embedding_jobs_node_active ON sys.embedding_jobs USING btree (node_id) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: idx_embedding_jobs_node_id; Type: INDEX; Schema: sys; Owner: postgres
--

CREATE INDEX idx_embedding_jobs_node_id ON sys.embedding_jobs USING btree (node_id);


--
-- Name: idx_embedding_jobs_status; Type: INDEX; Schema: sys; Owner: postgres
--

CREATE INDEX idx_embedding_jobs_status ON sys.embedding_jobs USING btree (status) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: Nodes trigger_node_version_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_node_version_history BEFORE UPDATE ON public."Nodes" FOR EACH ROW EXECUTE FUNCTION public.trigger_node_version_history();


--
-- Name: TRIGGER trigger_node_version_history ON "Nodes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_node_version_history ON public."Nodes" IS 'Automatically tracks version history in node meta field';


--
-- Name: nodes trigger_queue_embedding_job; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_queue_embedding_job AFTER INSERT OR UPDATE OF props ON public.nodes FOR EACH ROW EXECUTE FUNCTION public.queue_embedding_job();


--
-- Name: TRIGGER trigger_queue_embedding_job ON nodes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_queue_embedding_job ON public.nodes IS 'Queues nodes for async embedding generation when props change';


--
-- Name: Graphs trigger_update_methodology_usage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_methodology_usage AFTER INSERT ON public."Graphs" FOR EACH ROW EXECUTE FUNCTION public.update_methodology_usage();


--
-- Name: nodes trigger_update_node_meta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_node_meta BEFORE UPDATE ON public.nodes FOR EACH ROW EXECUTE FUNCTION public.update_node_meta_diff_log();


--
-- Name: TRIGGER trigger_update_node_meta ON nodes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_update_node_meta ON public.nodes IS 'Maintains audit log of property changes in meta.diff_log field';


--
-- Name: Edges trigger_validate_edge_methodology; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_edge_methodology BEFORE INSERT OR UPDATE ON public."Edges" FOR EACH ROW EXECUTE FUNCTION public.validate_edge_methodology_type();


--
-- Name: Nodes trigger_validate_node_methodology; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_validate_node_methodology BEFORE INSERT OR UPDATE ON public."Nodes" FOR EACH ROW EXECUTE FUNCTION public.validate_node_methodology_type();


--
-- Name: EdgeTypes update_edge_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edge_types_updated_at BEFORE UPDATE ON public."EdgeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: edge_types update_edge_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edge_types_updated_at BEFORE UPDATE ON public.edge_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Edges update_edges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON public."Edges" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: edges update_edges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edges_updated_at BEFORE UPDATE ON public.edges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: NodeTypes update_node_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_node_types_updated_at BEFORE UPDATE ON public."NodeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: node_types update_node_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_node_types_updated_at BEFORE UPDATE ON public.node_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Nodes update_nodes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON public."Nodes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nodes update_nodes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON public.nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Challenges Challenges_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Challenges Challenges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: EdgeTypes EdgeTypes_source_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_source_node_type_id_fkey" FOREIGN KEY (source_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: EdgeTypes EdgeTypes_target_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_target_node_type_id_fkey" FOREIGN KEY (target_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Edges Edges_edge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_edge_type_id_fkey" FOREIGN KEY (edge_type_id) REFERENCES public."EdgeTypes"(id);


--
-- Name: Edges Edges_methodology_edge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_methodology_edge_type_id_fkey" FOREIGN KEY (methodology_edge_type_id) REFERENCES public."MethodologyEdgeTypes"(id);


--
-- Name: Edges Edges_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_source_node_id_fkey" FOREIGN KEY (source_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Edges Edges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Graphs Graphs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Graphs Graphs_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id);


--
-- Name: Methodologies Methodologies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Methodologies Methodologies_parent_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_parent_methodology_id_fkey" FOREIGN KEY (parent_methodology_id) REFERENCES public."Methodologies"(id);


--
-- Name: MethodologyEdgeTypes MethodologyEdgeTypes_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT "MethodologyEdgeTypes_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyNodeTypes MethodologyNodeTypes_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT "MethodologyNodeTypes_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyPermissions MethodologyPermissions_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyPermissions MethodologyPermissions_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_shared_by_fkey" FOREIGN KEY (shared_by) REFERENCES public."Users"(id);


--
-- Name: MethodologyPermissions MethodologyPermissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: MethodologyTemplates MethodologyTemplates_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyTemplates"
    ADD CONSTRAINT "MethodologyTemplates_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_example_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_example_graph_id_fkey" FOREIGN KEY (example_graph_id) REFERENCES public."Graphs"(id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: NodeTypes NodeTypes_parent_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_parent_node_type_id_fkey" FOREIGN KEY (parent_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Nodes Nodes_methodology_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_methodology_node_type_id_fkey" FOREIGN KEY (methodology_node_type_id) REFERENCES public."MethodologyNodeTypes"(id);


--
-- Name: Nodes Nodes_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_node_type_id_fkey" FOREIGN KEY (node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: UserMethodologyProgress UserMethodologyProgress_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: UserMethodologyProgress UserMethodologyProgress_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id);


--
-- Name: UserMethodologyProgress UserMethodologyProgress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: edge_types edge_types_source_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_types
    ADD CONSTRAINT edge_types_source_node_type_id_fkey FOREIGN KEY (source_node_type_id) REFERENCES public.node_types(id) ON DELETE CASCADE;


--
-- Name: edge_types edge_types_target_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_types
    ADD CONSTRAINT edge_types_target_node_type_id_fkey FOREIGN KEY (target_node_type_id) REFERENCES public.node_types(id) ON DELETE CASCADE;


--
-- Name: edges edges_edge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_edge_type_id_fkey FOREIGN KEY (edge_type_id) REFERENCES public.edge_types(id) ON DELETE RESTRICT;


--
-- Name: edges edges_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.nodes(id) ON DELETE CASCADE;


--
-- Name: edges edges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.nodes(id) ON DELETE CASCADE;


--
-- Name: node_types node_types_parent_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_types
    ADD CONSTRAINT node_types_parent_node_type_id_fkey FOREIGN KEY (parent_node_type_id) REFERENCES public.node_types(id) ON DELETE SET NULL;


--
-- Name: nodes nodes_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_node_type_id_fkey FOREIGN KEY (node_type_id) REFERENCES public.node_types(id) ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA sys; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA sys TO sentient_user;


--
-- Name: TABLE embedding_jobs; Type: ACL; Schema: sys; Owner: postgres
--

GRANT ALL ON TABLE sys.embedding_jobs TO sentient_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: sys; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sys GRANT ALL ON SEQUENCES  TO sentient_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: sys; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sys GRANT ALL ON TABLES  TO sentient_user;


--
-- PostgreSQL database dump complete
--

