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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ChallengeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChallengeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type_code text NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL,
    icon text,
    color text,
    min_reputation_required integer DEFAULT 0,
    evidence_required boolean DEFAULT true,
    max_veracity_impact real DEFAULT 0.2,
    min_votes_required integer DEFAULT 5,
    acceptance_threshold real DEFAULT 0.6,
    voting_duration_hours integer DEFAULT 72,
    guidelines text,
    example_challenges jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ChallengeTypes_acceptance_threshold_check" CHECK (((acceptance_threshold >= (0.5)::double precision) AND (acceptance_threshold <= (1.0)::double precision))),
    CONSTRAINT "ChallengeTypes_max_veracity_impact_check" CHECK (((max_veracity_impact >= (0)::double precision) AND (max_veracity_impact <= (1)::double precision))),
    CONSTRAINT "ChallengeTypes_type_code_check" CHECK ((type_code = ANY (ARRAY['factual_error'::text, 'missing_context'::text, 'bias'::text, 'source_credibility'::text, 'logical_fallacy'::text, 'outdated_information'::text, 'misleading_representation'::text, 'conflict_of_interest'::text, 'methodological_flaw'::text, 'other'::text])))
);


ALTER TABLE public."ChallengeTypes" OWNER TO postgres;

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
    challenge_type_id uuid,
    challenger_id uuid,
    title text,
    description text,
    evidence_ids uuid[] DEFAULT '{}'::uuid[],
    supporting_sources jsonb DEFAULT '[]'::jsonb,
    severity text DEFAULT 'medium'::text,
    voting_starts_at timestamp with time zone DEFAULT now(),
    voting_ends_at timestamp with time zone,
    vote_count integer DEFAULT 0,
    support_votes integer DEFAULT 0,
    reject_votes integer DEFAULT 0,
    support_percentage real DEFAULT 0.0,
    resolution text,
    resolution_reason text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    veracity_impact real DEFAULT 0.0,
    is_spam boolean DEFAULT false,
    spam_reports integer DEFAULT 0,
    visibility text DEFAULT 'public'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "Challenges_resolution_check" CHECK ((resolution = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'modified'::text, 'withdrawn'::text]))),
    CONSTRAINT "Challenges_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT "Challenges_visibility_check" CHECK ((visibility = ANY (ARRAY['public'::text, 'restricted'::text, 'hidden'::text]))),
    CONSTRAINT challenges_status_check CHECK ((status = ANY (ARRAY['open'::text, 'voting'::text, 'closed'::text, 'resolved'::text, 'withdrawn'::text]))),
    CONSTRAINT either_node_or_edge CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."Challenges" OWNER TO postgres;

--
-- Name: UserReputation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserReputation" (
    user_id uuid NOT NULL,
    reputation_score integer DEFAULT 0,
    reputation_tier text DEFAULT 'novice'::text,
    challenges_submitted integer DEFAULT 0,
    challenges_accepted integer DEFAULT 0,
    challenges_rejected integer DEFAULT 0,
    challenges_pending integer DEFAULT 0,
    votes_cast integer DEFAULT 0,
    votes_agreed_with_outcome integer DEFAULT 0,
    resolutions_performed integer DEFAULT 0,
    resolutions_overturned integer DEFAULT 0,
    accuracy_rate real DEFAULT 0.0,
    participation_rate real DEFAULT 0.0,
    is_banned boolean DEFAULT false,
    ban_reason text,
    banned_until timestamp with time zone,
    warning_count integer DEFAULT 0,
    last_warning_at timestamp with time zone,
    challenges_today integer DEFAULT 0,
    last_challenge_at timestamp with time zone,
    daily_limit integer DEFAULT 5,
    badges jsonb DEFAULT '[]'::jsonb,
    achievements jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_active_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "UserReputation_accuracy_rate_check" CHECK (((accuracy_rate >= (0.0)::double precision) AND (accuracy_rate <= (1.0)::double precision))),
    CONSTRAINT "UserReputation_challenges_accepted_check" CHECK ((challenges_accepted >= 0)),
    CONSTRAINT "UserReputation_challenges_pending_check" CHECK ((challenges_pending >= 0)),
    CONSTRAINT "UserReputation_challenges_rejected_check" CHECK ((challenges_rejected >= 0)),
    CONSTRAINT "UserReputation_challenges_submitted_check" CHECK ((challenges_submitted >= 0)),
    CONSTRAINT "UserReputation_participation_rate_check" CHECK (((participation_rate >= (0.0)::double precision) AND (participation_rate <= (1.0)::double precision))),
    CONSTRAINT "UserReputation_reputation_score_check" CHECK ((reputation_score >= 0)),
    CONSTRAINT "UserReputation_reputation_tier_check" CHECK ((reputation_tier = ANY (ARRAY['novice'::text, 'contributor'::text, 'trusted'::text, 'expert'::text, 'authority'::text]))),
    CONSTRAINT "UserReputation_resolutions_overturned_check" CHECK ((resolutions_overturned >= 0)),
    CONSTRAINT "UserReputation_resolutions_performed_check" CHECK ((resolutions_performed >= 0)),
    CONSTRAINT "UserReputation_votes_agreed_with_outcome_check" CHECK ((votes_agreed_with_outcome >= 0)),
    CONSTRAINT "UserReputation_votes_cast_check" CHECK ((votes_cast >= 0))
);


ALTER TABLE public."UserReputation" OWNER TO postgres;

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
-- Name: ActiveChallengesView; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."ActiveChallengesView" AS
 SELECT c.id,
    c.target_node_id,
    c.target_edge_id,
        CASE
            WHEN (c.target_node_id IS NOT NULL) THEN 'node'::text
            ELSE 'edge'::text
        END AS target_type,
    c.title,
    c.description,
    ct.display_name AS challenge_type,
    ct.type_code,
    c.status,
    c.severity,
    c.challenger_id,
    u.username AS challenger_username,
    ur.reputation_score AS challenger_reputation,
    ur.reputation_tier AS challenger_tier,
    c.vote_count,
    c.support_votes,
    c.reject_votes,
    c.support_percentage,
    c.voting_starts_at,
    c.voting_ends_at,
    (c.voting_ends_at - now()) AS time_remaining,
    c.created_at,
    array_length(c.evidence_ids, 1) AS evidence_count
   FROM (((public."Challenges" c
     JOIN public."ChallengeTypes" ct ON ((c.challenge_type_id = ct.id)))
     JOIN public."Users" u ON ((c.challenger_id = u.id)))
     LEFT JOIN public."UserReputation" ur ON ((c.challenger_id = ur.user_id)))
  WHERE (c.status = ANY (ARRAY['open'::text, 'voting'::text]))
  ORDER BY c.created_at DESC;


ALTER TABLE public."ActiveChallengesView" OWNER TO postgres;

--
-- Name: ActivityPosts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActivityPosts" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    mentioned_node_ids uuid[] DEFAULT '{}'::uuid[],
    attachment_ids uuid[] DEFAULT '{}'::uuid[],
    is_reply boolean DEFAULT false,
    parent_post_id uuid,
    is_share boolean DEFAULT false,
    shared_post_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    canvas_props jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT not_reply_and_share CHECK ((NOT ((is_reply = true) AND (is_share = true)))),
    CONSTRAINT valid_parent_post CHECK ((((is_reply = false) AND (parent_post_id IS NULL)) OR ((is_reply = true) AND (parent_post_id IS NOT NULL)))),
    CONSTRAINT valid_shared_post CHECK ((((is_share = false) AND (shared_post_id IS NULL)) OR ((is_share = true) AND (shared_post_id IS NOT NULL))))
);


ALTER TABLE public."ActivityPosts" OWNER TO postgres;

--
-- Name: TABLE "ActivityPosts"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ActivityPosts" IS 'Twitter-like activity posts for nodes with support for replies and shares';


--
-- Name: COLUMN "ActivityPosts".mentioned_node_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".mentioned_node_ids IS 'Array of node UUIDs mentioned in the post content';


--
-- Name: COLUMN "ActivityPosts".attachment_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".attachment_ids IS 'Array of EvidenceFile UUIDs attached to the post';


--
-- Name: COLUMN "ActivityPosts".is_reply; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".is_reply IS 'True if this post is a reply to another post';


--
-- Name: COLUMN "ActivityPosts".parent_post_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".parent_post_id IS 'Reference to parent post if this is a reply';


--
-- Name: COLUMN "ActivityPosts".is_share; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".is_share IS 'True if this post is a share/repost of another post';


--
-- Name: COLUMN "ActivityPosts".shared_post_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".shared_post_id IS 'Reference to original post if this is a share';


--
-- Name: COLUMN "ActivityPosts".canvas_props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ActivityPosts".canvas_props IS 'JSONB canvas properties for sticky note rendering:
  {
    style: {
      color: "yellow"|"blue"|"green"|"pink"|"orange",
      size: "small"|"medium"|"large"
    },
    autoPosition: {
      anchorNodeId: uuid,
      offset: {x: number, y: number},
      preferredSide: "top"|"right"|"bottom"|"left"
    },
    zIndexOffset: 0.001
  }';


--
-- Name: ActivityReactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActivityReactions" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(50) DEFAULT 'like'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."ActivityReactions" OWNER TO postgres;

--
-- Name: TABLE "ActivityReactions"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ActivityReactions" IS 'Reactions (likes, loves, etc.) to activity posts';


--
-- Name: AudioProcessingStats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."AudioProcessingStats" AS
SELECT
    NULL::uuid AS file_id,
    NULL::character varying(255) AS filename,
    NULL::bigint AS file_size,
    NULL::character varying(100) AS mime_type,
    NULL::uuid AS transcription_id,
    NULL::character varying(10) AS language,
    NULL::numeric(10,2) AS duration_seconds,
    NULL::integer AS word_count,
    NULL::integer AS speaker_count,
    NULL::character varying(50) AS processing_service,
    NULL::integer AS processing_time_ms,
    NULL::text AS processing_error,
    NULL::timestamp with time zone AS processed_at,
    NULL::bigint AS segment_count,
    NULL::numeric AS avg_confidence,
    NULL::bigint AS detected_speakers,
    NULL::text AS processing_status;


ALTER TABLE public."AudioProcessingStats" OWNER TO postgres;

--
-- Name: VIEW "AudioProcessingStats"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public."AudioProcessingStats" IS 'Audio processing statistics and status tracking';


--
-- Name: AudioTranscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AudioTranscriptions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    transcript_text text NOT NULL,
    transcript_json jsonb NOT NULL,
    language character varying(10) DEFAULT 'en'::character varying NOT NULL,
    duration_seconds numeric(10,2) NOT NULL,
    word_count integer DEFAULT 0 NOT NULL,
    speaker_count integer,
    processing_service character varying(50) DEFAULT 'whisper'::character varying NOT NULL,
    processing_time_ms integer NOT NULL,
    processing_error text,
    processed_at timestamp with time zone DEFAULT now(),
    content_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_duration CHECK ((duration_seconds >= (0)::numeric)),
    CONSTRAINT valid_language CHECK (((language)::text ~ '^[a-z]{2,3}$'::text)),
    CONSTRAINT valid_processing_service CHECK (((processing_service)::text = ANY ((ARRAY['whisper'::character varying, 'assemblyai'::character varying])::text[]))),
    CONSTRAINT valid_speaker_count CHECK (((speaker_count IS NULL) OR (speaker_count > 0))),
    CONSTRAINT valid_word_count CHECK ((word_count >= 0))
);


ALTER TABLE public."AudioTranscriptions" OWNER TO postgres;

--
-- Name: TABLE "AudioTranscriptions"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."AudioTranscriptions" IS 'Audio transcription results from Whisper/AssemblyAI with full-text search';


--
-- Name: Nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Nodes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    node_type_id uuid NOT NULL,
    props jsonb,
    meta jsonb,
    ai public.vector(1536),
    weight real DEFAULT 0.0,
    content_hash text,
    primary_source_id uuid,
    is_level_0 boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    narrative text,
    published_at timestamp with time zone,
    permissions jsonb DEFAULT '[]'::jsonb,
    author_id uuid,
    CONSTRAINT "Nodes_weight_check" CHECK (((weight >= (0.0)::double precision) AND (weight <= (1.0)::double precision)))
);


ALTER TABLE public."Nodes" OWNER TO postgres;

--
-- Name: COLUMN "Nodes".props; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".props IS 'JSONB properties including:
  - Canvas positioning: {position: {x: number, y: number}}
  - Canvas dimensions: {dimensions: {width: number, height: number}}
  - Canvas layer: {zIndex: number} (calculated from credibility score)
  - Grouping: {groupId: uuid, isCollapsed: boolean}
  - Visual style: {color: string, backgroundColor: string}';


--
-- Name: COLUMN "Nodes".meta; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".meta IS 'JSONB metadata including:
  - Version history: {
      versionHistory: [
        {
          timestamp: ISO8601,
          userId: uuid,
          operation: "create"|"update"|"move"|"delete",
          changes: {field: {old: any, new: any}},
          position: {x: number, y: number}
        }
      ]
    }
  - Canvas metadata: {
      isTextBox: boolean,
      lastEditedBy: uuid,
      lastEditedAt: ISO8601
    }';


--
-- Name: COLUMN "Nodes".title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".title IS 'Human-readable title for the node (especially important for articles)';


--
-- Name: COLUMN "Nodes".narrative; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".narrative IS 'Rich text narrative content for article nodes';


--
-- Name: COLUMN "Nodes".published_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".published_at IS 'Timestamp when article was published (NULL means draft)';


--
-- Name: COLUMN "Nodes".permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".permissions IS 'JSONB array of permission objects:
  [
    {
      userId: uuid,
      role: "owner"|"editor"|"viewer"|"commenter",
      grantedBy: uuid,
      grantedAt: ISO8601,
      expiresAt: ISO8601|null
    }
  ]

  Roles:
  - owner: Full control (edit, delete, manage permissions)
  - editor: Edit content and properties
  - viewer: Read-only access
  - commenter: View and add comments/sticky notes';


--
-- Name: COLUMN "Nodes".author_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Nodes".author_id IS 'User ID of the primary author';


--
-- Name: CanvasNodes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."CanvasNodes" AS
 SELECT "Nodes".id,
    "Nodes".graph_id,
    "Nodes".node_type_id,
    "Nodes".title,
    "Nodes".props,
    "Nodes".meta,
    "Nodes".weight,
    "Nodes".is_level_0,
    ("Nodes".props ->> 'position'::text) AS position_json,
    ("Nodes".props ->> 'dimensions'::text) AS dimensions_json,
    COALESCE(((("Nodes".props ->> 'zIndex'::text))::numeric)::real, "Nodes".weight) AS z_index,
    "Nodes".created_at,
    "Nodes".updated_at
   FROM public."Nodes"
  WHERE ("Nodes".props ? 'position'::text);


ALTER TABLE public."CanvasNodes" OWNER TO postgres;

--
-- Name: VIEW "CanvasNodes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public."CanvasNodes" IS 'Nodes with canvas positioning data for whiteboard rendering';


--
-- Name: ChallengeComments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChallengeComments" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    is_hidden boolean DEFAULT false,
    hidden_reason text,
    hidden_by uuid,
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."ChallengeComments" OWNER TO postgres;

--
-- Name: VeracityScoreHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VeracityScoreHistory" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    veracity_score_id uuid NOT NULL,
    old_score real NOT NULL,
    new_score real NOT NULL,
    score_delta real NOT NULL,
    change_reason text NOT NULL,
    triggering_entity_type text,
    triggering_entity_id uuid,
    calculation_snapshot jsonb DEFAULT '{}'::jsonb,
    changed_at timestamp with time zone DEFAULT now(),
    changed_by text,
    CONSTRAINT "VeracityScoreHistory_change_reason_check" CHECK ((change_reason = ANY (ARRAY['new_evidence'::text, 'evidence_removed'::text, 'challenge_created'::text, 'challenge_resolved'::text, 'source_credibility_updated'::text, 'temporal_decay'::text, 'consensus_shift'::text, 'manual_recalculation'::text, 'scheduled_recalculation'::text, 'system_update'::text]))),
    CONSTRAINT "VeracityScoreHistory_new_score_check" CHECK (((new_score >= (0.0)::double precision) AND (new_score <= (1.0)::double precision))),
    CONSTRAINT "VeracityScoreHistory_old_score_check" CHECK (((old_score >= (0.0)::double precision) AND (old_score <= (1.0)::double precision))),
    CONSTRAINT "VeracityScoreHistory_triggering_entity_type_check" CHECK ((triggering_entity_type = ANY (ARRAY['evidence'::text, 'challenge'::text, 'source'::text, 'system'::text, 'user'::text])))
);


ALTER TABLE public."VeracityScoreHistory" OWNER TO postgres;

--
-- Name: VeracityScores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VeracityScores" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    veracity_score real DEFAULT 0.5 NOT NULL,
    confidence_interval_lower real,
    confidence_interval_upper real,
    evidence_weight_sum real DEFAULT 0.0,
    evidence_count integer DEFAULT 0,
    supporting_evidence_weight real DEFAULT 0.0,
    refuting_evidence_weight real DEFAULT 0.0,
    consensus_score real DEFAULT 0.5,
    source_count integer DEFAULT 0,
    source_agreement_ratio real DEFAULT 0.0,
    challenge_count integer DEFAULT 0,
    open_challenge_count integer DEFAULT 0,
    challenge_impact real DEFAULT 0.0,
    temporal_decay_factor real DEFAULT 1.0,
    calculation_method text DEFAULT 'weighted_evidence_v1'::text NOT NULL,
    calculation_metadata jsonb DEFAULT '{}'::jsonb,
    calculated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    calculated_by text DEFAULT 'system'::text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "VeracityScores_challenge_impact_check" CHECK (((challenge_impact >= ('-1.0'::numeric)::double precision) AND (challenge_impact <= (0.0)::double precision))),
    CONSTRAINT "VeracityScores_confidence_interval_lower_check" CHECK (((confidence_interval_lower >= (0.0)::double precision) AND (confidence_interval_lower <= (1.0)::double precision))),
    CONSTRAINT "VeracityScores_confidence_interval_upper_check" CHECK (((confidence_interval_upper >= (0.0)::double precision) AND (confidence_interval_upper <= (1.0)::double precision))),
    CONSTRAINT "VeracityScores_consensus_score_check" CHECK (((consensus_score >= (0.0)::double precision) AND (consensus_score <= (1.0)::double precision))),
    CONSTRAINT "VeracityScores_temporal_decay_factor_check" CHECK (((temporal_decay_factor >= (0.0)::double precision) AND (temporal_decay_factor <= (1.0)::double precision))),
    CONSTRAINT "VeracityScores_veracity_score_check" CHECK (((veracity_score >= (0.0)::double precision) AND (veracity_score <= (1.0)::double precision))),
    CONSTRAINT confidence_interval_contains_score CHECK (((confidence_interval_lower IS NULL) OR (confidence_interval_upper IS NULL) OR ((veracity_score >= confidence_interval_lower) AND (veracity_score <= confidence_interval_upper)))),
    CONSTRAINT confidence_interval_valid CHECK (((confidence_interval_lower IS NULL) OR (confidence_interval_upper IS NULL) OR (confidence_interval_lower <= confidence_interval_upper))),
    CONSTRAINT veracity_target_check CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."VeracityScores" OWNER TO postgres;

--
-- Name: ChallengeImpactSummary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."ChallengeImpactSummary" AS
 SELECT c.id AS challenge_id,
    c.target_node_id,
    c.target_edge_id,
    c.resolution,
    c.veracity_impact,
    vs_before.veracity_score AS veracity_before,
    vs_after.veracity_score AS veracity_after,
    (vs_after.veracity_score - vs_before.veracity_score) AS veracity_change,
    c.resolved_at
   FROM ((((public."Challenges" c
     LEFT JOIN public."VeracityScoreHistory" vsh_before ON (((vsh_before.triggering_entity_id = c.id) AND (vsh_before.triggering_entity_type = 'challenge'::text) AND (vsh_before.change_reason = 'challenge_created'::text))))
     LEFT JOIN public."VeracityScores" vs_before ON ((vsh_before.veracity_score_id = vs_before.id)))
     LEFT JOIN public."VeracityScoreHistory" vsh_after ON (((vsh_after.triggering_entity_id = c.id) AND (vsh_after.triggering_entity_type = 'challenge'::text) AND (vsh_after.change_reason = 'challenge_resolved'::text))))
     LEFT JOIN public."VeracityScores" vs_after ON ((vsh_after.veracity_score_id = vs_after.id)))
  WHERE ((c.status = 'resolved'::text) AND (c.resolution = ANY (ARRAY['accepted'::text, 'partially_accepted'::text, 'modified'::text])));


ALTER TABLE public."ChallengeImpactSummary" OWNER TO postgres;

--
-- Name: ChallengeLeaderboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."ChallengeLeaderboard" AS
 SELECT u.id AS user_id,
    u.username,
    ur.reputation_score,
    ur.reputation_tier,
    ur.challenges_submitted,
    ur.challenges_accepted,
    ur.challenges_rejected,
    ur.accuracy_rate,
    ur.votes_cast,
    ur.participation_rate,
    ur.badges,
    ur.achievements,
    rank() OVER (ORDER BY ur.reputation_score DESC) AS rank
   FROM (public."Users" u
     JOIN public."UserReputation" ur ON ((u.id = ur.user_id)))
  WHERE (ur.is_banned = false)
  ORDER BY ur.reputation_score DESC;


ALTER TABLE public."ChallengeLeaderboard" OWNER TO postgres;

--
-- Name: ChallengeNotifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChallengeNotifications" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    challenge_id uuid NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    priority text DEFAULT 'normal'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ChallengeNotifications_notification_type_check" CHECK ((notification_type = ANY (ARRAY['challenge_created'::text, 'challenge_voting_started'::text, 'challenge_voting_ending'::text, 'challenge_resolved'::text, 'challenge_commented'::text, 'vote_requested'::text, 'evidence_added'::text, 'resolution_appealed'::text]))),
    CONSTRAINT "ChallengeNotifications_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])))
);


ALTER TABLE public."ChallengeNotifications" OWNER TO postgres;

--
-- Name: ChallengeResolutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChallengeResolutions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    challenge_id uuid NOT NULL,
    resolution_type text NOT NULL,
    resolution_summary text NOT NULL,
    detailed_reasoning text,
    evidence_assessment jsonb DEFAULT '{}'::jsonb,
    veracity_impact real DEFAULT 0.0,
    modifications_made jsonb DEFAULT '{}'::jsonb,
    total_votes integer DEFAULT 0,
    support_votes integer DEFAULT 0,
    reject_votes integer DEFAULT 0,
    abstain_votes integer DEFAULT 0,
    weighted_support_percentage real,
    resolved_by uuid NOT NULL,
    resolver_role text,
    is_appealable boolean DEFAULT true,
    appeal_deadline timestamp with time zone,
    was_appealed boolean DEFAULT false,
    appeal_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ChallengeResolutions_resolution_type_check" CHECK ((resolution_type = ANY (ARRAY['accepted'::text, 'rejected'::text, 'partially_accepted'::text, 'modified'::text, 'withdrawn'::text, 'expired'::text]))),
    CONSTRAINT "ChallengeResolutions_resolver_role_check" CHECK ((resolver_role = ANY (ARRAY['moderator'::text, 'admin'::text, 'automated'::text, 'community'::text]))),
    CONSTRAINT "ChallengeResolutions_veracity_impact_check" CHECK (((veracity_impact >= ('-1.0'::numeric)::double precision) AND (veracity_impact <= (0.0)::double precision)))
);


ALTER TABLE public."ChallengeResolutions" OWNER TO postgres;

--
-- Name: ChallengeVotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChallengeVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote text NOT NULL,
    confidence real DEFAULT 0.5,
    reason text,
    evidence_evaluation jsonb DEFAULT '{}'::jsonb,
    weight real DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ChallengeVotes_confidence_check" CHECK (((confidence >= (0.0)::double precision) AND (confidence <= (1.0)::double precision))),
    CONSTRAINT "ChallengeVotes_vote_check" CHECK ((vote = ANY (ARRAY['support'::text, 'reject'::text, 'abstain'::text]))),
    CONSTRAINT "ChallengeVotes_weight_check" CHECK ((weight >= (0.0)::double precision))
);


ALTER TABLE public."ChallengeVotes" OWNER TO postgres;

--
-- Name: ClaimNodeMatches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClaimNodeMatches" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    node_id uuid NOT NULL,
    similarity_score numeric(5,4),
    match_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ClaimNodeMatches_match_type_check" CHECK ((match_type = ANY (ARRAY['semantic'::text, 'exact'::text, 'partial'::text, 'contextual'::text]))),
    CONSTRAINT "ClaimNodeMatches_similarity_score_check" CHECK (((similarity_score >= 0.0) AND (similarity_score <= 1.0)))
);


ALTER TABLE public."ClaimNodeMatches" OWNER TO postgres;

--
-- Name: TABLE "ClaimNodeMatches"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ClaimNodeMatches" IS 'Links between extracted claims and knowledge graph nodes';


--
-- Name: COLUMN "ClaimNodeMatches".similarity_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimNodeMatches".similarity_score IS 'Cosine similarity or other metric (0.0-1.0)';


--
-- Name: COLUMN "ClaimNodeMatches".match_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimNodeMatches".match_type IS 'Type of match: semantic (vector), exact (text), partial (keyword), contextual (related)';


--
-- Name: ClaimVerifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClaimVerifications" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    veracity_score numeric(3,2),
    supporting_evidence uuid[],
    conflicting_evidence uuid[],
    verification_report jsonb,
    inquiry_id uuid,
    verified_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ClaimVerifications_veracity_score_check" CHECK (((veracity_score >= 0.0) AND (veracity_score <= 1.0)))
);


ALTER TABLE public."ClaimVerifications" OWNER TO postgres;

--
-- Name: TABLE "ClaimVerifications"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ClaimVerifications" IS 'Verification results for extracted claims against knowledge graph';


--
-- Name: COLUMN "ClaimVerifications".veracity_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimVerifications".veracity_score IS 'Overall truthfulness score (0.0=false, 1.0=verified true)';


--
-- Name: COLUMN "ClaimVerifications".supporting_evidence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimVerifications".supporting_evidence IS 'Array of node UUIDs that support this claim';


--
-- Name: COLUMN "ClaimVerifications".conflicting_evidence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimVerifications".conflicting_evidence IS 'Array of node UUIDs that contradict this claim';


--
-- Name: COLUMN "ClaimVerifications".verification_report; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimVerifications".verification_report IS 'JSON structure: {
  "methodology": "string (e.g., semantic_similarity, expert_review)",
  "sources": [{"node_id": "uuid", "relevance": 0.95, "excerpt": "text"}],
  "reasoning": "string explanation of verification logic",
  "confidence_factors": {
    "source_credibility": 0.9,
    "evidence_strength": 0.85,
    "consistency": 0.95
  },
  "recommendations": ["string", "string"],
  "last_updated": "timestamp"
}';


--
-- Name: COLUMN "ClaimVerifications".inquiry_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ClaimVerifications".inquiry_id IS 'Optional link to formal inquiry investigating this claim';


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
    parent_comment_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."Comments" OWNER TO postgres;

--
-- Name: ConfigurationAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ConfigurationAuditLog" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    config_key text NOT NULL,
    old_value text,
    new_value text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_reason text
);


ALTER TABLE public."ConfigurationAuditLog" OWNER TO postgres;

--
-- Name: TABLE "ConfigurationAuditLog"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ConfigurationAuditLog" IS 'Audit log for all configuration changes';


--
-- Name: ConfigurationDefaults; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ConfigurationDefaults" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key text NOT NULL,
    default_value text NOT NULL,
    category text NOT NULL,
    description text,
    data_type text DEFAULT 'string'::text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."ConfigurationDefaults" OWNER TO postgres;

--
-- Name: TABLE "ConfigurationDefaults"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ConfigurationDefaults" IS 'Default values for system configurations';


--
-- Name: ConsensusSnapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ConsensusSnapshots" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    consensus_score real NOT NULL,
    source_count integer NOT NULL,
    evidence_count integer NOT NULL,
    supporting_ratio real NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ConsensusSnapshots_consensus_score_check" CHECK (((consensus_score >= (0.0)::double precision) AND (consensus_score <= (1.0)::double precision))),
    CONSTRAINT consensus_target_check CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."ConsensusSnapshots" OWNER TO postgres;

--
-- Name: ConversationMessages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ConversationMessages" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    node_links uuid[],
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ConversationMessages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


ALTER TABLE public."ConversationMessages" OWNER TO postgres;

--
-- Name: TABLE "ConversationMessages"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ConversationMessages" IS 'Stores all messages in conversations with embeddings for semantic search';


--
-- Name: COLUMN "ConversationMessages".role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ConversationMessages".role IS 'Message sender: user (human), assistant (AI), or system (automated)';


--
-- Name: COLUMN "ConversationMessages".node_links; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ConversationMessages".node_links IS 'Array of node UUIDs referenced in this message';


--
-- Name: COLUMN "ConversationMessages".embedding; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ConversationMessages".embedding IS '768-dimensional vector from Ollama nomic-embed-text model';


--
-- Name: Conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Conversations" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Conversations" OWNER TO postgres;

--
-- Name: TABLE "Conversations"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."Conversations" IS 'Stores conversation threads between users and AI assistant';


--
-- Name: COLUMN "Conversations".title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Conversations".title IS 'Optional title for the conversation, can be auto-generated from first message';


--
-- Name: DocumentFigures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentFigures" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    page_number integer NOT NULL,
    bbox_left numeric(10,4),
    bbox_top numeric(10,4),
    bbox_right numeric(10,4),
    bbox_bottom numeric(10,4),
    caption text,
    image_data text,
    image_type character varying(20),
    content_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."DocumentFigures" OWNER TO postgres;

--
-- Name: TABLE "DocumentFigures"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."DocumentFigures" IS 'Extracted figures and images from documents with captions';


--
-- Name: DocumentProcessingResults; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentProcessingResults" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    extracted_text text,
    extracted_at timestamp with time zone,
    summary text,
    summary_generated_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    processing_stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."DocumentProcessingResults" OWNER TO postgres;

--
-- Name: TABLE "DocumentProcessingResults"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."DocumentProcessingResults" IS 'Stores extracted text and processing results from uploaded document files';


--
-- Name: COLUMN "DocumentProcessingResults".extracted_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."DocumentProcessingResults".extracted_text IS 'Full text extracted from the document';


--
-- Name: COLUMN "DocumentProcessingResults".summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."DocumentProcessingResults".summary IS 'AI-generated summary of the document';


--
-- Name: COLUMN "DocumentProcessingResults".processing_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."DocumentProcessingResults".processing_stats IS 'Statistics about the processing (entities found, nodes created, etc.)';


--
-- Name: DocumentProcessingStats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."DocumentProcessingStats" AS
SELECT
    NULL::uuid AS file_id,
    NULL::character varying(255) AS filename,
    NULL::character varying(50) AS file_type,
    NULL::bigint AS file_size,
    NULL::character varying(50) AS processing_service,
    NULL::integer AS processing_time_ms,
    NULL::integer AS page_count,
    NULL::text AS processing_error,
    NULL::timestamp with time zone AS updated_at,
    NULL::bigint AS table_count,
    NULL::bigint AS figure_count,
    NULL::bigint AS section_count,
    NULL::bigint AS total_words,
    NULL::text AS status;


ALTER TABLE public."DocumentProcessingStats" OWNER TO postgres;

--
-- Name: DocumentSections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentSections" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    heading text NOT NULL,
    level integer NOT NULL,
    section_order integer NOT NULL,
    content text NOT NULL,
    word_count integer DEFAULT 0,
    ai public.vector(768),
    content_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."DocumentSections" OWNER TO postgres;

--
-- Name: TABLE "DocumentSections"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."DocumentSections" IS 'Document sections with hierarchical structure and embeddings';


--
-- Name: DocumentTables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentTables" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    page_number integer NOT NULL,
    bbox_left numeric(10,4),
    bbox_top numeric(10,4),
    bbox_right numeric(10,4),
    bbox_bottom numeric(10,4),
    caption text,
    rows jsonb NOT NULL,
    row_count integer NOT NULL,
    column_count integer NOT NULL,
    content_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."DocumentTables" OWNER TO postgres;

--
-- Name: TABLE "DocumentTables"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."DocumentTables" IS 'Extracted tables from documents with structure preservation';


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
    target_node_type_id uuid
);


ALTER TABLE public."EdgeTypes" OWNER TO postgres;

--
-- Name: Edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Edges" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    edge_type_id uuid NOT NULL,
    source_node_id uuid NOT NULL,
    target_node_id uuid NOT NULL,
    props jsonb,
    meta jsonb,
    ai public.vector(1536),
    weight real DEFAULT 0.0,
    is_level_0 boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "Edges_weight_check" CHECK (((weight >= (0.0)::double precision) AND (weight <= (1.0)::double precision)))
);


ALTER TABLE public."Edges" OWNER TO postgres;

--
-- Name: Evidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Evidence" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    source_id uuid NOT NULL,
    evidence_type text NOT NULL,
    weight real DEFAULT 1.0 NOT NULL,
    confidence real DEFAULT 0.5 NOT NULL,
    content text NOT NULL,
    content_excerpt text,
    page_reference text,
    temporal_relevance real DEFAULT 1.0,
    decay_rate real DEFAULT 0.0,
    relevant_date date,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    peer_review_status text DEFAULT 'pending'::text,
    peer_review_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    submitted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "Evidence_confidence_check" CHECK (((confidence >= (0.0)::double precision) AND (confidence <= (1.0)::double precision))),
    CONSTRAINT "Evidence_decay_rate_check" CHECK ((decay_rate >= (0.0)::double precision)),
    CONSTRAINT "Evidence_evidence_type_check" CHECK ((evidence_type = ANY (ARRAY['supporting'::text, 'refuting'::text, 'neutral'::text, 'clarifying'::text]))),
    CONSTRAINT "Evidence_peer_review_status_check" CHECK ((peer_review_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'disputed'::text]))),
    CONSTRAINT "Evidence_temporal_relevance_check" CHECK (((temporal_relevance >= (0.0)::double precision) AND (temporal_relevance <= (1.0)::double precision))),
    CONSTRAINT "Evidence_weight_check" CHECK (((weight >= (0.0)::double precision) AND (weight <= (1.0)::double precision))),
    CONSTRAINT evidence_target_check CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."Evidence" OWNER TO postgres;

--
-- Name: EvidenceAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceAuditLog" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evidence_id uuid NOT NULL,
    action public.evidence_audit_action NOT NULL,
    action_description text,
    actor_id uuid,
    actor_type text DEFAULT 'user'::text,
    changes jsonb,
    affected_fields text[],
    ip_address inet,
    user_agent text,
    request_id uuid,
    session_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "EvidenceAuditLog_actor_type_check" CHECK ((actor_type = ANY (ARRAY['user'::text, 'system'::text, 'admin'::text, 'api'::text]))),
    CONSTRAINT valid_ip CHECK (((ip_address IS NULL) OR (family(ip_address) = ANY (ARRAY[4, 6]))))
);


ALTER TABLE public."EvidenceAuditLog" OWNER TO postgres;

--
-- Name: EvidenceDuplicates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceDuplicates" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evidence_id_1 uuid NOT NULL,
    evidence_id_2 uuid NOT NULL,
    file_hash_match boolean DEFAULT false,
    content_similarity real,
    metadata_similarity real,
    detection_method text NOT NULL,
    status text DEFAULT 'pending'::text,
    resolution_notes text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    merged_into_evidence_id uuid,
    detected_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "EvidenceDuplicates_content_similarity_check" CHECK (((content_similarity >= (0.0)::double precision) AND (content_similarity <= (1.0)::double precision))),
    CONSTRAINT "EvidenceDuplicates_detection_method_check" CHECK ((detection_method = ANY (ARRAY['file_hash'::text, 'content_hash'::text, 'fuzzy_match'::text, 'manual_report'::text, 'ai_detection'::text]))),
    CONSTRAINT "EvidenceDuplicates_metadata_similarity_check" CHECK (((metadata_similarity >= (0.0)::double precision) AND (metadata_similarity <= (1.0)::double precision))),
    CONSTRAINT "EvidenceDuplicates_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed_duplicate'::text, 'not_duplicate'::text, 'merged'::text]))),
    CONSTRAINT different_evidence_ids CHECK ((evidence_id_1 <> evidence_id_2)),
    CONSTRAINT ordered_evidence_ids CHECK ((evidence_id_1 < evidence_id_2))
);


ALTER TABLE public."EvidenceDuplicates" OWNER TO postgres;

--
-- Name: EvidenceFiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceFiles" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    file_type character varying(50) NOT NULL,
    is_primary boolean DEFAULT false,
    version integer DEFAULT 1,
    storage_provider character varying(50) NOT NULL,
    storage_key character varying(500) NOT NULL,
    storage_bucket character varying(100),
    storage_region character varying(50),
    cdn_url character varying(500),
    file_hash character varying(128) NOT NULL,
    hash_algorithm character varying(20) DEFAULT 'sha256'::character varying,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_extension character varying(20),
    encoding character varying(50),
    duration_seconds integer,
    dimensions jsonb,
    thumbnail_storage_key character varying(500),
    thumbnail_cdn_url character varying(500),
    has_preview boolean DEFAULT false,
    processing_status character varying(50) DEFAULT 'pending'::character varying,
    processing_error text,
    virus_scan_status character varying(50) DEFAULT 'pending'::character varying,
    virus_scan_date timestamp with time zone,
    virus_scan_result jsonb,
    is_public boolean DEFAULT false,
    access_policy jsonb,
    estimated_monthly_cost numeric(10,2),
    access_count integer DEFAULT 0,
    last_accessed_at timestamp with time zone,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    deleted_by uuid,
    deletion_reason text,
    markdown_content text,
    page_count integer DEFAULT 0,
    processing_service character varying(50) DEFAULT 'docling'::character varying,
    processing_time_ms integer,
    document_title text,
    document_author text,
    document_subject text,
    document_creator text,
    document_producer text,
    document_creation_date timestamp with time zone,
    document_modification_date timestamp with time zone,
    audio_duration_seconds numeric(10,2),
    audio_sample_rate integer,
    audio_channels integer,
    audio_bitrate integer,
    video_processed boolean DEFAULT false,
    video_processing_started_at timestamp with time zone,
    video_processing_completed_at timestamp with time zone,
    video_processing_error text
);


ALTER TABLE public."EvidenceFiles" OWNER TO postgres;

--
-- Name: COLUMN "EvidenceFiles".audio_duration_seconds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."EvidenceFiles".audio_duration_seconds IS 'Duration of audio file in seconds';


--
-- Name: COLUMN "EvidenceFiles".audio_sample_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."EvidenceFiles".audio_sample_rate IS 'Audio sample rate in Hz (e.g., 44100)';


--
-- Name: COLUMN "EvidenceFiles".audio_channels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."EvidenceFiles".audio_channels IS 'Number of audio channels (1=mono, 2=stereo)';


--
-- Name: COLUMN "EvidenceFiles".audio_bitrate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."EvidenceFiles".audio_bitrate IS 'Audio bitrate in kbps';


--
-- Name: EvidenceMetadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceMetadata" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evidence_id uuid NOT NULL,
    authors text[],
    author_affiliations text[],
    corresponding_author text,
    publication_date date,
    access_date date,
    relevant_date_range daterange,
    journal text,
    conference text,
    publisher text,
    volume text,
    issue text,
    pages text,
    doi text,
    isbn text,
    issn text,
    pmid text,
    arxiv_id text,
    study_type text,
    methodology text,
    sample_size integer,
    study_duration_days integer,
    peer_reviewed boolean,
    preprint boolean DEFAULT false,
    keywords text[],
    topics text[],
    abstract text,
    summary text,
    language text DEFAULT 'en'::text,
    language_confidence real,
    geolocation jsonb,
    geographic_scope text,
    countries_covered text[],
    jurisdiction text,
    legal_context text,
    regulation_reference text,
    license text,
    access_restrictions text,
    paywall boolean DEFAULT false,
    copyright_holder text,
    impact_factor real,
    citation_count integer DEFAULT 0,
    h_index integer,
    altmetric_score integer,
    data_collection_method text,
    instruments_used text[],
    software_used text[],
    statistical_methods text[],
    funding_sources text[],
    conflicts_of_interest text,
    ethical_approval text,
    data_availability text,
    supplementary_materials text[],
    custom_metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_doi CHECK (((doi IS NULL) OR (doi ~ '^10\.\d{4,9}/[-._;()/:A-Z0-9]+$'::text))),
    CONSTRAINT valid_language_confidence CHECK (((language_confidence IS NULL) OR ((language_confidence >= (0.0)::double precision) AND (language_confidence <= (1.0)::double precision))))
);


ALTER TABLE public."EvidenceMetadata" OWNER TO postgres;

--
-- Name: EvidenceReviewVotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceReviewVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "EvidenceReviewVotes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['helpful'::text, 'not_helpful'::text])))
);


ALTER TABLE public."EvidenceReviewVotes" OWNER TO postgres;

--
-- Name: EvidenceReviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceReviews" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evidence_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    quality_score real,
    credibility_score real,
    relevance_score real,
    clarity_score real,
    overall_rating integer,
    recommendation text,
    review_text text,
    strengths text,
    weaknesses text,
    suggestions text,
    flags public.evidence_quality_flag[],
    flag_explanation text,
    reviewer_expertise_level text,
    reviewer_credentials text,
    verified_claims jsonb DEFAULT '[]'::jsonb,
    disputed_claims jsonb DEFAULT '[]'::jsonb,
    helpful_count integer DEFAULT 0,
    not_helpful_count integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    moderation_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    retracted_at timestamp with time zone,
    retraction_reason text,
    CONSTRAINT "EvidenceReviews_clarity_score_check" CHECK (((clarity_score >= (0.0)::double precision) AND (clarity_score <= (1.0)::double precision))),
    CONSTRAINT "EvidenceReviews_credibility_score_check" CHECK (((credibility_score >= (0.0)::double precision) AND (credibility_score <= (1.0)::double precision))),
    CONSTRAINT "EvidenceReviews_helpful_count_check" CHECK ((helpful_count >= 0)),
    CONSTRAINT "EvidenceReviews_not_helpful_count_check" CHECK ((not_helpful_count >= 0)),
    CONSTRAINT "EvidenceReviews_overall_rating_check" CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT "EvidenceReviews_quality_score_check" CHECK (((quality_score >= (0.0)::double precision) AND (quality_score <= (1.0)::double precision))),
    CONSTRAINT "EvidenceReviews_recommendation_check" CHECK ((recommendation = ANY (ARRAY['accept'::text, 'accept_with_revisions'::text, 'needs_verification'::text, 'reject'::text, 'flag_for_removal'::text]))),
    CONSTRAINT "EvidenceReviews_relevance_score_check" CHECK (((relevance_score >= (0.0)::double precision) AND (relevance_score <= (1.0)::double precision))),
    CONSTRAINT "EvidenceReviews_reviewer_expertise_level_check" CHECK ((reviewer_expertise_level = ANY (ARRAY['expert'::text, 'professional'::text, 'knowledgeable'::text, 'general'::text]))),
    CONSTRAINT "EvidenceReviews_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'disputed'::text, 'retracted'::text, 'hidden'::text])))
);


ALTER TABLE public."EvidenceReviews" OWNER TO postgres;

--
-- Name: EvidenceSearchIndex; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceSearchIndex" (
    evidence_id uuid NOT NULL,
    search_content text,
    search_vector tsvector,
    file_types public.evidence_file_type[],
    authors text[],
    keywords text[],
    topics text[],
    publication_years integer[],
    languages text[],
    has_files boolean DEFAULT false,
    file_count integer DEFAULT 0,
    review_count integer DEFAULT 0,
    avg_quality_score real,
    last_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."EvidenceSearchIndex" OWNER TO postgres;

--
-- Name: SourceCredibility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SourceCredibility" (
    source_id uuid NOT NULL,
    credibility_score real DEFAULT 0.5 NOT NULL,
    evidence_accuracy_score real DEFAULT 0.5,
    peer_validation_score real DEFAULT 0.5,
    historical_reliability_score real DEFAULT 0.5,
    total_evidence_count integer DEFAULT 0,
    verified_evidence_count integer DEFAULT 0,
    challenged_evidence_count integer DEFAULT 0,
    challenge_ratio real DEFAULT 0.0,
    consensus_alignment_score real DEFAULT 0.5,
    last_calculated_at timestamp with time zone DEFAULT now(),
    calculation_metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "SourceCredibility_challenge_ratio_check" CHECK (((challenge_ratio >= (0.0)::double precision) AND (challenge_ratio <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_challenged_evidence_count_check" CHECK ((challenged_evidence_count >= 0)),
    CONSTRAINT "SourceCredibility_consensus_alignment_score_check" CHECK (((consensus_alignment_score >= (0.0)::double precision) AND (consensus_alignment_score <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_credibility_score_check" CHECK (((credibility_score >= (0.0)::double precision) AND (credibility_score <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_evidence_accuracy_score_check" CHECK (((evidence_accuracy_score >= (0.0)::double precision) AND (evidence_accuracy_score <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_historical_reliability_score_check" CHECK (((historical_reliability_score >= (0.0)::double precision) AND (historical_reliability_score <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_peer_validation_score_check" CHECK (((peer_validation_score >= (0.0)::double precision) AND (peer_validation_score <= (1.0)::double precision))),
    CONSTRAINT "SourceCredibility_total_evidence_count_check" CHECK ((total_evidence_count >= 0)),
    CONSTRAINT "SourceCredibility_verified_evidence_count_check" CHECK ((verified_evidence_count >= 0))
);


ALTER TABLE public."SourceCredibility" OWNER TO postgres;

--
-- Name: Sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sources" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source_type text NOT NULL,
    title text NOT NULL,
    authors text[],
    url text,
    doi text,
    isbn text,
    publication_date date,
    publisher text,
    abstract text,
    content_hash text,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    submitted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "Sources_source_type_check" CHECK ((source_type = ANY (ARRAY['academic_paper'::text, 'news_article'::text, 'government_report'::text, 'dataset'::text, 'expert_testimony'::text, 'book'::text, 'website'::text, 'video'::text, 'image'::text, 'other'::text]))),
    CONSTRAINT valid_doi CHECK (((doi IS NULL) OR (doi ~ '^10\.\d{4,9}/[-._;()/:A-Z0-9]+$'::text))),
    CONSTRAINT valid_url CHECK (((url IS NULL) OR (url ~ '^https?://'::text)))
);


ALTER TABLE public."Sources" OWNER TO postgres;

--
-- Name: EvidenceSummary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."EvidenceSummary" AS
 SELECT e.id,
    e.target_node_id,
    e.target_edge_id,
        CASE
            WHEN (e.target_node_id IS NOT NULL) THEN 'node'::text
            ELSE 'edge'::text
        END AS target_type,
    e.source_id,
    s.source_type,
    s.title AS source_title,
    s.authors AS source_authors,
    s.url AS source_url,
    sc.credibility_score AS source_credibility,
    e.evidence_type,
    e.weight,
    e.confidence,
    e.temporal_relevance,
    public.calculate_evidence_weight(e.id) AS effective_weight,
    e.content,
    e.is_verified,
    e.peer_review_status,
    e.submitted_by,
    e.created_at
   FROM ((public."Evidence" e
     JOIN public."Sources" s ON ((e.source_id = s.id)))
     LEFT JOIN public."SourceCredibility" sc ON ((s.id = sc.source_id)));


ALTER TABLE public."EvidenceSummary" OWNER TO postgres;

--
-- Name: EvidenceVotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EvidenceVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    evidence_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "EvidenceVotes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['helpful'::text, 'not_helpful'::text, 'misleading'::text, 'outdated'::text])))
);


ALTER TABLE public."EvidenceVotes" OWNER TO postgres;

--
-- Name: ExtractedClaims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExtractedClaims" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid,
    claim_text text NOT NULL,
    context text,
    confidence numeric(3,2),
    claim_type text,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ExtractedClaims_claim_type_check" CHECK ((claim_type = ANY (ARRAY['factual'::text, 'opinion'::text, 'hypothesis'::text, 'prediction'::text, 'statistical'::text]))),
    CONSTRAINT "ExtractedClaims_confidence_check" CHECK (((confidence >= 0.0) AND (confidence <= 1.0)))
);


ALTER TABLE public."ExtractedClaims" OWNER TO postgres;

--
-- Name: TABLE "ExtractedClaims"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."ExtractedClaims" IS 'Claims automatically extracted from uploaded documents';


--
-- Name: COLUMN "ExtractedClaims".file_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ExtractedClaims".file_id IS 'Source file; nullable if claim comes from other sources';


--
-- Name: COLUMN "ExtractedClaims".context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ExtractedClaims".context IS 'Surrounding text from document to provide context';


--
-- Name: COLUMN "ExtractedClaims".confidence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ExtractedClaims".confidence IS 'AI confidence in claim extraction (0.0-1.0)';


--
-- Name: COLUMN "ExtractedClaims".claim_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."ExtractedClaims".claim_type IS 'Classification of claim type';


--
-- Name: FormalInquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FormalInquiries" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    user_id uuid NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    parent_inquiry_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL,
    description text,
    confidence_score numeric(3,2),
    max_allowed_score numeric(3,2),
    ai_determination text,
    ai_rationale text,
    evaluated_at timestamp with time zone,
    evaluated_by character varying(50) DEFAULT 'ai'::character varying,
    related_node_ids uuid[] DEFAULT '{}'::uuid[],
    weakest_node_credibility numeric(3,2),
    resolved_at timestamp with time zone,
    CONSTRAINT "FormalInquiries_confidence_score_check" CHECK (((confidence_score >= 0.00) AND (confidence_score <= 1.00))),
    CONSTRAINT "FormalInquiries_max_allowed_score_check" CHECK (((max_allowed_score >= 0.00) AND (max_allowed_score <= 1.00))),
    CONSTRAINT either_node_or_edge_inquiry CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL)))),
    CONSTRAINT formalinquiries_status_check CHECK ((status = ANY (ARRAY['open'::text, 'evaluating'::text, 'evaluated'::text, 'resolved'::text, 'withdrawn'::text, 'answered'::text, 'challenged'::text])))
);


ALTER TABLE public."FormalInquiries" OWNER TO postgres;

--
-- Name: TABLE "FormalInquiries"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."FormalInquiries" IS 'Public inquiries/questions about nodes or edges that cannot be hidden or deleted by authors';


--
-- Name: COLUMN "FormalInquiries".status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."FormalInquiries".status IS 'Status: open (unanswered), answered (has response), resolved (accepted), challenged (disputed)';


--
-- Name: COLUMN "FormalInquiries".parent_inquiry_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."FormalInquiries".parent_inquiry_id IS 'Parent inquiry for threaded responses';


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
    CONSTRAINT "Graphs_level_check" CHECK ((level = ANY (ARRAY[0, 1]))),
    CONSTRAINT "Graphs_privacy_check" CHECK ((privacy = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])))
);


ALTER TABLE public."Graphs" OWNER TO postgres;

--
-- Name: InquiryVotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InquiryVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    inquiry_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "InquiryVotes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['agree'::text, 'disagree'::text])))
);


ALTER TABLE public."InquiryVotes" OWNER TO postgres;

--
-- Name: TABLE "InquiryVotes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."InquiryVotes" IS 'Community voting on inquiries - shows opinion, NOT evidence quality. Votes do NOT affect confidence scores.';


--
-- Name: InquiryVoteStats; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public."InquiryVoteStats" AS
 SELECT "InquiryVotes".inquiry_id,
    count(*) FILTER (WHERE ("InquiryVotes".vote_type = 'agree'::text)) AS agree_count,
    count(*) FILTER (WHERE ("InquiryVotes".vote_type = 'disagree'::text)) AS disagree_count,
    count(*) AS total_votes,
    round(((100.0 * (count(*) FILTER (WHERE ("InquiryVotes".vote_type = 'agree'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS agree_percentage,
    round(((100.0 * (count(*) FILTER (WHERE ("InquiryVotes".vote_type = 'disagree'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS disagree_percentage
   FROM public."InquiryVotes"
  GROUP BY "InquiryVotes".inquiry_id
  WITH NO DATA;


ALTER TABLE public."InquiryVoteStats" OWNER TO postgres;

--
-- Name: MATERIALIZED VIEW "InquiryVoteStats"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON MATERIALIZED VIEW public."InquiryVoteStats" IS 'Aggregated vote statistics for inquiries - community opinion only, not truth determination.';


--
-- Name: InquiryWithVotesView; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."InquiryWithVotesView" AS
 SELECT i.id,
    i.target_node_id,
    i.target_edge_id,
    i.user_id,
    i.title,
    i.description,
    i.content,
    i.confidence_score,
    i.max_allowed_score,
    i.weakest_node_credibility,
    i.ai_determination,
    i.ai_rationale,
    i.evaluated_at,
    i.evaluated_by,
    COALESCE(vs.agree_count, (0)::bigint) AS agree_count,
    COALESCE(vs.disagree_count, (0)::bigint) AS disagree_count,
    COALESCE(vs.total_votes, (0)::bigint) AS total_votes,
    COALESCE(vs.agree_percentage, (0)::numeric) AS agree_percentage,
    COALESCE(vs.disagree_percentage, (0)::numeric) AS disagree_percentage,
    i.status,
    i.created_at,
    i.updated_at,
    i.resolved_at
   FROM (public."FormalInquiries" i
     LEFT JOIN public."InquiryVoteStats" vs ON ((i.id = vs.inquiry_id)))
  ORDER BY i.created_at DESC;


ALTER TABLE public."InquiryWithVotesView" OWNER TO postgres;

--
-- Name: Level0Edges; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Level0Edges" AS
 SELECT "Edges".id,
    "Edges".graph_id,
    "Edges".edge_type_id,
    "Edges".source_node_id,
    "Edges".target_node_id,
    "Edges".props,
    "Edges".meta,
    "Edges".ai,
    "Edges".weight,
    "Edges".is_level_0,
    "Edges".created_by,
    "Edges".created_at,
    "Edges".updated_at
   FROM public."Edges"
  WHERE ("Edges".is_level_0 = true);


ALTER TABLE public."Level0Edges" OWNER TO postgres;

--
-- Name: Level0Nodes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Level0Nodes" AS
 SELECT "Nodes".id,
    "Nodes".graph_id,
    "Nodes".node_type_id,
    "Nodes".props,
    "Nodes".meta,
    "Nodes".ai,
    "Nodes".weight,
    "Nodes".content_hash,
    "Nodes".primary_source_id,
    "Nodes".is_level_0,
    "Nodes".created_by,
    "Nodes".created_at,
    "Nodes".updated_at
   FROM public."Nodes"
  WHERE ("Nodes".is_level_0 = true);


ALTER TABLE public."Level0Nodes" OWNER TO postgres;

--
-- Name: Level1Edges; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Level1Edges" AS
 SELECT "Edges".id,
    "Edges".graph_id,
    "Edges".edge_type_id,
    "Edges".source_node_id,
    "Edges".target_node_id,
    "Edges".props,
    "Edges".meta,
    "Edges".ai,
    "Edges".weight,
    "Edges".is_level_0,
    "Edges".created_by,
    "Edges".created_at,
    "Edges".updated_at
   FROM public."Edges"
  WHERE ("Edges".is_level_0 = false);


ALTER TABLE public."Level1Edges" OWNER TO postgres;

--
-- Name: Level1Nodes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Level1Nodes" AS
 SELECT "Nodes".id,
    "Nodes".graph_id,
    "Nodes".node_type_id,
    "Nodes".props,
    "Nodes".meta,
    "Nodes".ai,
    "Nodes".weight,
    "Nodes".content_hash,
    "Nodes".primary_source_id,
    "Nodes".is_level_0,
    "Nodes".created_by,
    "Nodes".created_at,
    "Nodes".updated_at
   FROM public."Nodes"
  WHERE ("Nodes".is_level_0 = false);


ALTER TABLE public."Level1Nodes" OWNER TO postgres;

--
-- Name: MediaProcessingJobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MediaProcessingJobs" (
    job_id uuid NOT NULL,
    file_id uuid NOT NULL,
    file_type character varying(50) NOT NULL,
    file_path text NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    progress integer DEFAULT 0,
    options jsonb DEFAULT '{}'::jsonb,
    result jsonb,
    error text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public."MediaProcessingJobs" OWNER TO postgres;

--
-- Name: TABLE "MediaProcessingJobs"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."MediaProcessingJobs" IS 'Tracks async media processing jobs (audio transcription, video analysis)';


--
-- Name: COLUMN "MediaProcessingJobs".job_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".job_id IS 'Unique job identifier';


--
-- Name: COLUMN "MediaProcessingJobs".file_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".file_id IS 'Reference to uploaded file';


--
-- Name: COLUMN "MediaProcessingJobs".file_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".file_type IS 'Type of media: audio, video, document';


--
-- Name: COLUMN "MediaProcessingJobs".status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".status IS 'Job status: queued, processing, completed, failed';


--
-- Name: COLUMN "MediaProcessingJobs".progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".progress IS 'Processing progress (0-100)';


--
-- Name: COLUMN "MediaProcessingJobs".options; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".options IS 'Job-specific options (language, frameRate, etc.)';


--
-- Name: COLUMN "MediaProcessingJobs".result; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".result IS 'Processing result (transcription, analysis data)';


--
-- Name: COLUMN "MediaProcessingJobs".error; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."MediaProcessingJobs".error IS 'Error message if job failed';


--
-- Name: Methodologies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Methodologies" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    icon text,
    color text,
    tags text[],
    config jsonb DEFAULT '{}'::jsonb,
    usage_count integer DEFAULT 0 NOT NULL,
    rating numeric(3,2),
    created_by uuid,
    parent_methodology_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    CONSTRAINT "Methodologies_category_check" CHECK ((category = ANY (ARRAY['analytical'::text, 'creative'::text, 'strategic'::text, 'investigative'::text, 'systems'::text, 'custom'::text]))),
    CONSTRAINT "Methodologies_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'private'::text, 'shared'::text, 'published'::text, 'deprecated'::text])))
);


ALTER TABLE public."Methodologies" OWNER TO postgres;

--
-- Name: TABLE "Methodologies"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."Methodologies" IS 'Investigation methodologies that define structured approaches to problem-solving';


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
    valid_source_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    valid_target_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    line_style text DEFAULT 'solid'::text NOT NULL,
    arrow_style text DEFAULT 'arrow'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."MethodologyEdgeTypes" OWNER TO postgres;

--
-- Name: TABLE "MethodologyEdgeTypes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."MethodologyEdgeTypes" IS 'Defines the types of edges/relationships allowed in a methodology';


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
    default_properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    required_properties text[] DEFAULT '{}'::text[] NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."MethodologyNodeTypes" OWNER TO postgres;

--
-- Name: TABLE "MethodologyNodeTypes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."MethodologyNodeTypes" IS 'Defines the types of nodes allowed in a methodology';


--
-- Name: MethodologyPermissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyPermissions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "MethodologyPermissions_permission_check" CHECK ((permission = ANY (ARRAY['view'::text, 'use'::text, 'edit'::text, 'admin'::text])))
);


ALTER TABLE public."MethodologyPermissions" OWNER TO postgres;

--
-- Name: TABLE "MethodologyPermissions"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."MethodologyPermissions" IS 'Permissions for sharing and collaborating on custom methodologies';


--
-- Name: MethodologyWorkflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MethodologyWorkflows" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    methodology_id uuid NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_linear boolean DEFAULT true NOT NULL,
    allow_skip boolean DEFAULT false NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."MethodologyWorkflows" OWNER TO postgres;

--
-- Name: TABLE "MethodologyWorkflows"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."MethodologyWorkflows" IS 'Optional guided workflows for methodologies';


--
-- Name: NodeReferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NodeReferences" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id uuid NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    description text,
    type character varying(50) DEFAULT 'reference'::character varying NOT NULL,
    confidence numeric(3,2),
    processed_node_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT check_confidence_range CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT check_reference_type CHECK (((type)::text = ANY ((ARRAY['reference'::character varying, 'citation'::character varying])::text[]))),
    CONSTRAINT check_valid_url CHECK ((url ~* '^https?://'::text))
);


ALTER TABLE public."NodeReferences" OWNER TO postgres;

--
-- Name: TABLE "NodeReferences"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."NodeReferences" IS 'External references and citations associated with nodes. Can be processed with AI to create verified nodes.';


--
-- Name: COLUMN "NodeReferences".id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".id IS 'Unique identifier for the reference';


--
-- Name: COLUMN "NodeReferences".node_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".node_id IS 'ID of the node this reference is attached to';


--
-- Name: COLUMN "NodeReferences".url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".url IS 'URL of the external reference';


--
-- Name: COLUMN "NodeReferences".title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".title IS 'Title or description of the reference';


--
-- Name: COLUMN "NodeReferences".description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".description IS 'Optional additional description or notes';


--
-- Name: COLUMN "NodeReferences".type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".type IS 'Type of reference: reference or citation';


--
-- Name: COLUMN "NodeReferences".confidence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".confidence IS 'Confidence score (0-1) if processed by AI';


--
-- Name: COLUMN "NodeReferences".processed_node_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".processed_node_id IS 'ID of node created from processing this reference';


--
-- Name: COLUMN "NodeReferences".metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".metadata IS 'Additional metadata (author, publish date, domain, etc.)';


--
-- Name: COLUMN "NodeReferences".created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".created_by IS 'User who added this reference';


--
-- Name: COLUMN "NodeReferences".created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".created_at IS 'Timestamp when reference was added';


--
-- Name: COLUMN "NodeReferences".updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".updated_at IS 'Timestamp of last update';


--
-- Name: COLUMN "NodeReferences".deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."NodeReferences".deleted_at IS 'Soft delete timestamp';


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
    parent_node_type_id uuid
);


ALTER TABLE public."NodeTypes" OWNER TO postgres;

--
-- Name: Notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notifications" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    entity_type text,
    entity_id uuid,
    related_user_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "Notifications_entity_type_check" CHECK ((entity_type = ANY (ARRAY['node'::text, 'edge'::text, 'comment'::text, 'graph'::text, 'challenge'::text]))),
    CONSTRAINT "Notifications_type_check" CHECK ((type = ANY (ARRAY['mention'::text, 'reply'::text, 'challenge'::text, 'promotion'::text, 'vote'::text])))
);


ALTER TABLE public."Notifications" OWNER TO postgres;

--
-- Name: SpamReports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SpamReports" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    challenge_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    report_type text NOT NULL,
    description text,
    is_reviewed boolean DEFAULT false,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    action_taken text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "SpamReports_report_type_check" CHECK ((report_type = ANY (ARRAY['spam'::text, 'harassment'::text, 'false_information'::text, 'duplicate'::text, 'off_topic'::text, 'other'::text])))
);


ALTER TABLE public."SpamReports" OWNER TO postgres;

--
-- Name: SystemConfiguration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemConfiguration" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    category text NOT NULL,
    description text,
    data_type text DEFAULT 'string'::text NOT NULL,
    is_secret boolean DEFAULT false NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "SystemConfiguration_category_check" CHECK ((category = ANY (ARRAY['database'::text, 'redis'::text, 'rabbitmq'::text, 'openai'::text, 'ollama'::text, 'docling'::text, 'whisper'::text, 'storage'::text, 'media'::text, 'system'::text, 'security'::text]))),
    CONSTRAINT "SystemConfiguration_data_type_check" CHECK ((data_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text, 'url'::text, 'secret'::text])))
);


ALTER TABLE public."SystemConfiguration" OWNER TO postgres;

--
-- Name: TABLE "SystemConfiguration"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."SystemConfiguration" IS 'Stores system-wide configuration settings with version control';


--
-- Name: COLUMN "SystemConfiguration".key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."SystemConfiguration".key IS 'Unique configuration key (e.g., database.pool.max)';


--
-- Name: COLUMN "SystemConfiguration".value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."SystemConfiguration".value IS 'Configuration value stored as string';


--
-- Name: COLUMN "SystemConfiguration".data_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."SystemConfiguration".data_type IS 'Data type for validation and parsing';


--
-- Name: COLUMN "SystemConfiguration".is_secret; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."SystemConfiguration".is_secret IS 'If true, value is masked in API responses';


--
-- Name: COLUMN "SystemConfiguration".is_system; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."SystemConfiguration".is_system IS 'System configurations cannot be deleted';


--
-- Name: TextBoxNodes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."TextBoxNodes" AS
 SELECT n.id,
    n.graph_id,
    n.node_type_id,
    n.props,
    n.meta,
    n.ai,
    n.weight,
    n.content_hash,
    n.primary_source_id,
    n.is_level_0,
    n.created_by,
    n.created_at,
    n.updated_at,
    n.title,
    n.narrative,
    n.published_at,
    n.permissions,
    n.author_id,
    nt.name AS node_type_name
   FROM (public."Nodes" n
     JOIN public."NodeTypes" nt ON ((n.node_type_id = nt.id)))
  WHERE (nt.name = ANY (ARRAY['Thesis'::text, 'Citation'::text, 'Reference'::text]));


ALTER TABLE public."TextBoxNodes" OWNER TO postgres;

--
-- Name: VIEW "TextBoxNodes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public."TextBoxNodes" IS 'All text box nodes for whiteboard annotations';


--
-- Name: TranscriptSegments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TranscriptSegments" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transcription_id uuid NOT NULL,
    segment_order integer NOT NULL,
    start_time numeric(10,3) NOT NULL,
    end_time numeric(10,3) NOT NULL,
    text text NOT NULL,
    speaker_id integer,
    speaker_label character varying(100),
    confidence numeric(5,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_confidence CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT valid_segment_order CHECK ((segment_order > 0)),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


ALTER TABLE public."TranscriptSegments" OWNER TO postgres;

--
-- Name: TABLE "TranscriptSegments"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."TranscriptSegments" IS 'Time-aligned transcript segments with optional speaker diarization';


--
-- Name: UserMethodologyProgress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserMethodologyProgress" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    methodology_id uuid NOT NULL,
    graph_id uuid,
    current_step_id text,
    completed_steps text[] DEFAULT '{}'::text[] NOT NULL,
    progress_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public."UserMethodologyProgress" OWNER TO postgres;

--
-- Name: TABLE "UserMethodologyProgress"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."UserMethodologyProgress" IS 'Tracks user progress through methodology workflows';


--
-- Name: VeracityScoresSummary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."VeracityScoresSummary" AS
 SELECT vs.id,
    vs.target_node_id,
    vs.target_edge_id,
        CASE
            WHEN (vs.target_node_id IS NOT NULL) THEN 'node'::text
            ELSE 'edge'::text
        END AS target_type,
    COALESCE(vs.target_node_id, vs.target_edge_id) AS target_id,
    vs.veracity_score,
    vs.confidence_interval_lower,
    vs.confidence_interval_upper,
    vs.evidence_count,
    vs.consensus_score,
    vs.challenge_count,
    vs.open_challenge_count,
    vs.challenge_impact,
    vs.temporal_decay_factor,
    vs.calculated_at,
    vs.expires_at,
        CASE
            WHEN (n.is_level_0 IS NOT NULL) THEN n.is_level_0
            WHEN (e.is_level_0 IS NOT NULL) THEN e.is_level_0
            ELSE false
        END AS is_level_0,
    n.graph_id AS node_graph_id,
    e.graph_id AS edge_graph_id
   FROM ((public."VeracityScores" vs
     LEFT JOIN public."Nodes" n ON ((vs.target_node_id = n.id)))
     LEFT JOIN public."Edges" e ON ((vs.target_edge_id = e.id)));


ALTER TABLE public."VeracityScoresSummary" OWNER TO postgres;

--
-- Name: VideoFrames; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoFrames" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    frame_number integer NOT NULL,
    timestamp_seconds numeric(12,3) NOT NULL,
    frame_type character varying(20) NOT NULL,
    storage_key character varying(500) NOT NULL,
    storage_provider character varying(50) DEFAULT 'local'::character varying,
    storage_bucket character varying(255),
    ocr_text text,
    ocr_confidence numeric(5,2),
    ocr_language character varying(10) DEFAULT 'eng'::character varying,
    content_vector tsvector,
    width integer,
    height integer,
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."VideoFrames" OWNER TO postgres;

--
-- Name: TABLE "VideoFrames"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."VideoFrames" IS 'Extracted video frames with OCR text and full-text search';


--
-- Name: VideoMetadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoMetadata" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    duration_seconds numeric(12,3) NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    fps numeric(8,2) NOT NULL,
    codec character varying(50) NOT NULL,
    bitrate bigint,
    file_format character varying(50) NOT NULL,
    total_frames integer DEFAULT 0,
    extracted_frames integer DEFAULT 0,
    scene_count integer DEFAULT 0,
    ocr_text_length integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."VideoMetadata" OWNER TO postgres;

--
-- Name: TABLE "VideoMetadata"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."VideoMetadata" IS 'Comprehensive video file metadata including codec, resolution, and duration';


--
-- Name: VideoProcessingStats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."VideoProcessingStats" AS
SELECT
    NULL::uuid AS file_id,
    NULL::character varying(255) AS filename,
    NULL::bigint AS file_size,
    NULL::character varying(100) AS mime_type,
    NULL::boolean AS video_processed,
    NULL::timestamp with time zone AS video_processing_completed_at,
    NULL::text AS video_processing_error,
    NULL::numeric(12,3) AS duration_seconds,
    NULL::integer AS width,
    NULL::integer AS height,
    NULL::numeric(8,2) AS fps,
    NULL::character varying(50) AS codec,
    NULL::bigint AS bitrate,
    NULL::character varying(50) AS file_format,
    NULL::integer AS total_frames,
    NULL::integer AS extracted_frames,
    NULL::integer AS scene_count,
    NULL::bigint AS stored_frame_count,
    NULL::bigint AS frames_with_ocr,
    NULL::bigint AS stored_scene_count,
    NULL::bigint AS total_ocr_characters,
    NULL::numeric AS avg_ocr_confidence,
    NULL::numeric AS processing_duration_seconds;


ALTER TABLE public."VideoProcessingStats" OWNER TO postgres;

--
-- Name: VIEW "VideoProcessingStats"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public."VideoProcessingStats" IS 'Video processing statistics and status tracking';


--
-- Name: VideoScenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoScenes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_id uuid NOT NULL,
    scene_number integer NOT NULL,
    start_time numeric(12,3) NOT NULL,
    end_time numeric(12,3) NOT NULL,
    thumbnail_frame_id uuid,
    description text,
    tags text[],
    frame_count integer DEFAULT 0,
    duration_seconds numeric(12,3) GENERATED ALWAYS AS ((end_time - start_time)) STORED,
    content_vector tsvector,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_scene_time CHECK ((end_time > start_time))
);


ALTER TABLE public."VideoScenes" OWNER TO postgres;

--
-- Name: TABLE "VideoScenes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public."VideoScenes" IS 'Detected video scenes with time ranges and descriptions';


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
-- Data for Name: ActivityPosts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivityPosts" (id, node_id, author_id, content, mentioned_node_ids, attachment_ids, is_reply, parent_post_id, is_share, shared_post_id, created_at, updated_at, deleted_at, canvas_props) FROM stdin;
82c39047-ae7f-4fa9-be03-80d0543c844d	10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000000	Test post!	{}	{}	f	\N	f	\N	2025-11-13 22:29:00.015772+00	2025-11-13 22:29:00.015772+00	\N	{}
5a818add-b5cd-417e-9617-6c0491237fa4	10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000000	Great post!	{}	{}	t	82c39047-ae7f-4fa9-be03-80d0543c844d	f	\N	2025-11-13 22:29:00.085107+00	2025-11-13 22:29:00.085107+00	\N	{}
\.


--
-- Data for Name: ActivityReactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivityReactions" (id, post_id, user_id, reaction_type, created_at) FROM stdin;
b78107e6-5212-48fc-b014-a4839b7aae83	82c39047-ae7f-4fa9-be03-80d0543c844d	00000000-0000-0000-0000-000000000000	like	2025-11-13 22:29:00.070579+00
\.


--
-- Data for Name: AudioTranscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AudioTranscriptions" (id, file_id, transcript_text, transcript_json, language, duration_seconds, word_count, speaker_count, processing_service, processing_time_ms, processing_error, processed_at, content_vector, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ChallengeComments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeComments" (id, challenge_id, user_id, parent_comment_id, content, is_edited, edited_at, is_hidden, hidden_reason, hidden_by, upvotes, downvotes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ChallengeNotifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeNotifications" (id, user_id, challenge_id, notification_type, title, message, is_read, read_at, is_sent, sent_at, priority, created_at) FROM stdin;
\.


--
-- Data for Name: ChallengeResolutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeResolutions" (id, challenge_id, resolution_type, resolution_summary, detailed_reasoning, evidence_assessment, veracity_impact, modifications_made, total_votes, support_votes, reject_votes, abstain_votes, weighted_support_percentage, resolved_by, resolver_role, is_appealable, appeal_deadline, was_appealed, appeal_id, created_at) FROM stdin;
\.


--
-- Data for Name: ChallengeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeTypes" (id, type_code, display_name, description, icon, color, min_reputation_required, evidence_required, max_veracity_impact, min_votes_required, acceptance_threshold, voting_duration_hours, guidelines, example_challenges, is_active, created_at, updated_at) FROM stdin;
1957352e-37f5-4666-9a4e-c37e741dcb34	factual_error	Factual Error	The claim contains demonstrably false information	\N	\N	10	t	0.3	5	0.6	72	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
66cf197a-bd74-44ec-a9e9-eba8af795b05	missing_context	Missing Context	Important context is omitted that changes interpretation	\N	\N	5	t	0.2	5	0.6	72	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
9e055ea9-9af0-4235-b2a9-1eec3b82d7e1	bias	Bias	The claim shows clear bias or one-sided presentation	\N	\N	15	t	0.15	5	0.6	96	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
be8a1808-3108-49ca-af4a-d6975344a704	source_credibility	Source Credibility	The sources cited are unreliable or misrepresented	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
bf98c300-88ca-4999-a6e0-c355ed8ae068	logical_fallacy	Logical Fallacy	The reasoning contains formal or informal logical fallacies	\N	\N	25	t	0.2	5	0.6	48	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
2e025834-03bc-4d14-a8ea-bec148285bc9	outdated_information	Outdated Information	The information is no longer current or accurate	\N	\N	5	t	0.15	5	0.6	48	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
d0e86c18-289f-498a-9b0f-2ca095e9462f	misleading_representation	Misleading Representation	Data or facts are presented in a misleading way	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
d3a30c39-28f2-49ed-9c68-5c7584344a47	conflict_of_interest	Conflict of Interest	Undisclosed conflicts affect the credibility	\N	\N	30	t	0.2	5	0.6	96	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
f245dba1-5dfa-4dfa-bbd7-8405d883f7a0	methodological_flaw	Methodological Flaw	The methodology used to support the claim is flawed	\N	\N	35	t	0.3	5	0.6	96	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
97059ea0-f4ca-4f66-8596-ada2fd3eebe7	other	Other	Other type of challenge not covered above	\N	\N	50	t	0.1	5	0.6	120	\N	[]	t	2025-10-09 17:05:13.247358+00	2025-10-09 17:05:13.247358+00
\.


--
-- Data for Name: ChallengeVotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeVotes" (id, challenge_id, user_id, vote, confidence, reason, evidence_evaluation, weight, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Challenges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Challenges" (id, target_node_id, target_edge_id, status, rebuttal_claim, rebuttal_grounds, rebuttal_warrant, created_at, challenge_type_id, challenger_id, title, description, evidence_ids, supporting_sources, severity, voting_starts_at, voting_ends_at, vote_count, support_votes, reject_votes, support_percentage, resolution, resolution_reason, resolved_by, resolved_at, veracity_impact, is_spam, spam_reports, visibility, metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: ClaimNodeMatches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClaimNodeMatches" (id, claim_id, node_id, similarity_score, match_type, created_at) FROM stdin;
\.


--
-- Data for Name: ClaimVerifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClaimVerifications" (id, claim_id, veracity_score, supporting_evidence, conflicting_evidence, verification_report, inquiry_id, verified_at) FROM stdin;
\.


--
-- Data for Name: Comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Comments" (id, text, author_id, target_node_id, target_edge_id, created_at, parent_comment_id, updated_at) FROM stdin;
\.


--
-- Data for Name: ConfigurationAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConfigurationAuditLog" (id, config_key, old_value, new_value, changed_by, changed_at, change_reason) FROM stdin;
\.


--
-- Data for Name: ConfigurationDefaults; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConfigurationDefaults" (id, key, default_value, category, description, data_type, is_required, created_at) FROM stdin;
d3958a40-0e33-40e8-a923-1141f4976c72	database.pool.max	20	database	Maximum number of database connections in pool	number	f	2025-11-13 17:16:21.902273+00
2848d5e3-26c2-41c0-a2be-3851cfb9d1d8	database.pool.min	2	database	Minimum number of database connections in pool	number	f	2025-11-13 17:16:21.902273+00
4f6adb7e-86ca-4701-bcfc-c73f27e35e2c	database.pool.idle_timeout	30000	database	Idle timeout for database connections (ms)	number	f	2025-11-13 17:16:21.902273+00
d4433033-811b-4c95-8830-587c40c5a520	database.pool.connection_timeout	2000	database	Connection timeout for database (ms)	number	f	2025-11-13 17:16:21.902273+00
e704ee1f-23bd-465f-8347-ff38f5e2d0e6	database.query_timeout	30000	database	Query timeout for database operations (ms)	number	f	2025-11-13 17:16:21.902273+00
c9ccb780-d651-4064-9f72-aa793cd597c0	redis.cache.ttl	3600	redis	Default TTL for cached items (seconds)	number	f	2025-11-13 17:16:21.905653+00
102684e6-ca29-421c-af7d-de0efbbb92a4	redis.cache.max_size	1000	redis	Maximum number of items in cache	number	f	2025-11-13 17:16:21.905653+00
a51eb1d7-be0b-4aad-b508-cb79abe858db	redis.connection.retry_delay	1000	redis	Retry delay for Redis connections (ms)	number	f	2025-11-13 17:16:21.905653+00
adabd60b-83d0-4213-8144-2acea1a20816	redis.connection.max_retries	10	redis	Maximum retry attempts for Redis	number	f	2025-11-13 17:16:21.905653+00
dab1bea8-5d44-49ab-aed4-e6dc54f399d8	rabbitmq.queue.vectorization	vectorization_queue	rabbitmq	Queue name for vectorization tasks	string	f	2025-11-13 17:16:21.906033+00
779ac637-02ad-4532-bcb4-d6130c93bfa7	rabbitmq.queue.notifications	notifications_queue	rabbitmq	Queue name for notifications	string	f	2025-11-13 17:16:21.906033+00
24450a7d-3559-4de7-bcee-cb73ce25d904	rabbitmq.prefetch	10	rabbitmq	Prefetch count for RabbitMQ consumers	number	f	2025-11-13 17:16:21.906033+00
d98a2b20-21eb-4cb8-9edd-ed9ad62d37c0	rabbitmq.connection.heartbeat	60	rabbitmq	Heartbeat interval (seconds)	number	f	2025-11-13 17:16:21.906033+00
317deaeb-ce7a-4427-a024-c4d840cf0140	openai.model	gpt-4-turbo-preview	openai	Default GPT model for completions	string	f	2025-11-13 17:16:21.907787+00
0325e697-4df5-4f6d-a2bb-6724c4e914cd	openai.embedding_model	text-embedding-3-small	openai	Model for text embeddings	string	f	2025-11-13 17:16:21.907787+00
fb02676f-f1fe-423d-b3ea-505f0d42055e	openai.temperature	0.7	openai	Default temperature for completions	number	f	2025-11-13 17:16:21.907787+00
b85747fc-e986-4a5b-b9c8-060e5da040e6	openai.max_tokens	2000	openai	Maximum tokens for completions	number	f	2025-11-13 17:16:21.907787+00
16b47f55-9580-4820-8893-40a2068949f6	openai.timeout	30000	openai	API request timeout (ms)	number	f	2025-11-13 17:16:21.907787+00
7c27a886-a7b2-4878-bdd4-cad674745850	ollama.url	http://localhost:11434	ollama	Ollama server URL	url	f	2025-11-13 17:16:21.908228+00
36ab7f1f-8c62-4c7c-a315-035781c89c39	ollama.chat_model	llama2	ollama	Default model for chat completions	string	f	2025-11-13 17:16:21.908228+00
a60d8b93-1905-4283-ac40-a1c91152191c	ollama.embedding_model	llama2	ollama	Model for embeddings	string	f	2025-11-13 17:16:21.908228+00
27168ce0-f68f-44b2-ad5c-2d49493c7fd6	ollama.vision_model	llava	ollama	Model for vision tasks	string	f	2025-11-13 17:16:21.908228+00
e9a3aaed-b49c-4535-a6ca-9e55e208b709	ollama.timeout	60000	ollama	API request timeout (ms)	number	f	2025-11-13 17:16:21.908228+00
3ead9720-9f5b-4821-aaac-6191f4266834	docling.url	http://localhost:8080	docling	Docling server URL	url	f	2025-11-13 17:16:21.908757+00
38751ecf-7628-40bd-bdce-3874b98ee467	docling.timeout	30000	docling	API request timeout (ms)	number	f	2025-11-13 17:16:21.908757+00
5c366bdc-3ee7-4b42-bb8f-90811916c234	docling.max_file_size	52428800	docling	Maximum file size for processing (bytes)	number	f	2025-11-13 17:16:21.908757+00
5b6e93fb-6783-4ba7-aeb8-6df9c3151bc5	whisper.model	base	whisper	Whisper model size (tiny/base/small/medium/large)	string	f	2025-11-13 17:16:21.909244+00
48a64ece-06fd-4082-a1d6-7ed65f47d8cf	whisper.language	en	whisper	Default language for transcription	string	f	2025-11-13 17:16:21.909244+00
e292b6bc-1f9a-48b8-80e2-5b10546a7a69	whisper.max_retries	3	whisper	Maximum retry attempts	number	f	2025-11-13 17:16:21.909244+00
9e37bca2-a31d-4ff3-a6a9-9bf4c030bfe2	whisper.retry_delay	1000	whisper	Delay between retries (ms)	number	f	2025-11-13 17:16:21.909244+00
3f9012e2-72dd-4d6d-a60c-8eb20dad0660	storage.provider	local	storage	Storage provider (local/s3/r2)	string	f	2025-11-13 17:16:21.909633+00
2f34ed43-d05f-4e97-92f1-83c01dab3432	storage.local.path	/app/storage	storage	Local storage path	string	f	2025-11-13 17:16:21.909633+00
c404d97e-08a6-4a05-b9c2-1af565cd8240	storage.max_upload_size	104857600	storage	Maximum upload size (bytes)	number	f	2025-11-13 17:16:21.909633+00
ce8ca8f6-2882-4699-a9de-579e7a92dffb	storage.allowed_types	["image/*","video/*","audio/*","application/pdf"]	storage	Allowed MIME types (JSON array)	json	f	2025-11-13 17:16:21.909633+00
670c67f0-5140-4bb4-b665-747108fd2adb	media.ffmpeg.path	/usr/bin/ffmpeg	media	Path to FFmpeg binary	string	f	2025-11-13 17:16:21.910004+00
ada2e891-2773-4de8-a99a-9132c34f9005	media.ffmpeg.threads	4	media	Number of FFmpeg threads	number	f	2025-11-13 17:16:21.910004+00
f77153d0-1363-4df4-b0d9-e4e4f510319e	media.tesseract.config	--oem 3 --psm 3	media	Tesseract OCR configuration	string	f	2025-11-13 17:16:21.910004+00
d7809fca-e921-43fd-aeac-f0b61af6e9df	media.tesseract.lang	eng	media	Tesseract language packs	string	f	2025-11-13 17:16:21.910004+00
5c4ead7e-9925-4c1a-9038-91c14f2561e8	media.image.max_dimension	4096	media	Maximum image dimension (pixels)	number	f	2025-11-13 17:16:21.910004+00
c2430023-c613-4ce4-bda4-a260d92c7d03	security.jwt.expiry	86400	security	JWT token expiry (seconds)	number	f	2025-11-13 17:16:21.910377+00
98fc88a2-3545-4b94-a28b-71935d13875f	security.password.min_length	8	security	Minimum password length	number	f	2025-11-13 17:16:21.910377+00
24440656-7d67-423a-a802-8fa0d61c2073	security.rate_limit.window	900000	security	Rate limit window (ms)	number	f	2025-11-13 17:16:21.910377+00
6efbd9ae-61ed-4cf7-ad32-2e0353a1726d	security.rate_limit.max_requests	100	security	Max requests per window	number	f	2025-11-13 17:16:21.910377+00
85c532d4-8388-4c13-9d8b-7bcbbe5052b1	system.environment	development	system	Environment (development/staging/production)	string	t	2025-11-13 17:16:21.910779+00
3080eea0-d52c-4d1b-bce5-8ef36bf2842f	system.log_level	info	system	Logging level (debug/info/warn/error)	string	f	2025-11-13 17:16:21.910779+00
417929dd-9043-4223-87c1-445935051adf	system.enable_metrics	true	system	Enable metrics collection	boolean	f	2025-11-13 17:16:21.910779+00
a6247b04-d06d-4976-b535-cfe09e7030d0	system.enable_tracing	false	system	Enable distributed tracing	boolean	f	2025-11-13 17:16:21.910779+00
\.


--
-- Data for Name: ConsensusSnapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConsensusSnapshots" (id, target_node_id, target_edge_id, consensus_score, source_count, evidence_count, supporting_ratio, snapshot_at) FROM stdin;
\.


--
-- Data for Name: ConversationMessages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConversationMessages" (id, conversation_id, role, content, node_links, embedding, created_at) FROM stdin;
\.


--
-- Data for Name: Conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Conversations" (id, user_id, title, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: DocumentFigures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentFigures" (id, file_id, page_number, bbox_left, bbox_top, bbox_right, bbox_bottom, caption, image_data, image_type, content_vector, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: DocumentProcessingResults; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentProcessingResults" (id, file_id, extracted_text, extracted_at, summary, summary_generated_at, metadata, processing_stats, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: DocumentSections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentSections" (id, file_id, heading, level, section_order, content, word_count, ai, content_vector, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: DocumentTables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentTables" (id, file_id, page_number, bbox_left, bbox_top, bbox_right, bbox_bottom, caption, rows, row_count, column_count, content_vector, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EdgeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EdgeTypes" (id, name, props, meta, ai, source_node_type_id, target_node_type_id) FROM stdin;
4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	discovered_by	{"description": "Links a concept/fact to its discoverer"}	\N	\N	\N	\N
45da6227-834f-4fae-9da8-5059317e598f	occurred_at	{"description": "Links an event to a location"}	\N	\N	\N	\N
60856374-4cd6-4e97-b630-d9c25fafe5b6	related_to	{"description": "General relationship between entities"}	\N	\N	\N	\N
ef81dc5d-f4b8-46c9-a43c-dae4915168d4	proposed_by	{"description": "Links a theory/concept to its originator"}	\N	\N	\N	\N
b9f707b0-304e-4dfe-b0c0-3acd167682ae	references	{"description": "Article references a node"}	{}	\N	\N	\N
\.


--
-- Data for Name: Edges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, ai, weight, is_level_0, created_by, created_at, updated_at) FROM stdin;
912984b4-52d5-460e-b63c-73c9aab44216	00000000-0000-0000-0000-000000000001	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	47c88546-6dc5-45c2-8425-507366913140	f9c7ab8b-aee8-4305-9091-02d1c48e2372	{"year": "1915"}	\N	\N	1	f	00000000-0000-0000-0000-000000000000	2025-10-10 19:55:50.759082+00	2025-10-10 19:55:50.759082+00
d4a66e84-973d-4504-92a8-8f7080dd9e85	00000000-0000-0000-0000-000000000001	60856374-4cd6-4e97-b630-d9c25fafe5b6	76f02a95-9e52-48eb-b059-f6b30ac35b21	0455fdfd-affe-4c2d-ab06-6a6da62b6748	{"relationship": "Both landmark human achievements in different domains"}	\N	\N	1	f	00000000-0000-0000-0000-000000000000	2025-10-10 19:55:50.760923+00	2025-10-10 19:55:50.760923+00
3b2f7744-67d3-4681-ab87-209f64132cd9	00000000-0000-0000-0000-000000000001	60856374-4cd6-4e97-b630-d9c25fafe5b6	47c88546-6dc5-45c2-8425-507366913140	59ce9efa-e932-47f4-982f-baf801a8792e	{"relationship": "Contemporary scientists, both Nobel laureates"}	\N	\N	1	f	00000000-0000-0000-0000-000000000000	2025-10-10 19:55:50.761546+00	2025-10-10 19:55:50.761546+00
e88358dd-af5f-48f8-85aa-ae10fb45786d	11111111-1111-1111-1111-111111111111	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	13eddbb0-a30c-4304-81a2-c383745fa24b	{"label": ""}	\N	\N	0	f	\N	2025-10-10 23:24:39.725696+00	2025-10-10 23:24:39.725696+00
d96d7b52-75e3-4da2-8129-ffee9cf467a8	11111111-1111-1111-1111-111111111111	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	33090bc4-2bb4-4065-829f-b6c3b2fdfa14	{"label": ""}	\N	\N	0	f	\N	2025-10-10 23:34:18.208619+00	2025-10-10 23:34:18.208619+00
bd58ddd3-dcf8-46fe-8843-4695e08b5017	11111111-1111-1111-1111-111111111111	4d26f7c6-3eb3-47cd-a770-2422c6b13bb9	13eddbb0-a30c-4304-81a2-c383745fa24b	33090bc4-2bb4-4065-829f-b6c3b2fdfa14	{"label": ""}	\N	\N	0	f	\N	2025-10-10 23:34:26.591972+00	2025-10-10 23:34:26.591972+00
048440ac-d731-4d9e-97b9-ccaa40379b87	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	73b8ac00-a028-4e65-b9ae-b6d727cdb735	28fc56fe-e65a-4215-941e-da364b7d66a1	{"duration": "13 seconds", "relationship": "followed_by"}	{"veracity_score": 1.0}	\N	0	t	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
059d56fc-2261-4733-95c4-5206bcc46070	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	28fc56fe-e65a-4215-941e-da364b7d66a1	5c9c1f78-5d2c-436b-b4aa-cad87032b68e	{"duration": "30 minutes", "relationship": "followed_by"}	{"veracity_score": 1.0}	\N	0	t	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
a7c89f45-ccc8-4f24-8431-55f6ea37d913	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	5c9c1f78-5d2c-436b-b4aa-cad87032b68e	fcc88fd8-9fe0-475b-90ae-4a6178c79f57	{"duration": "50 minutes", "relationship": "followed_by"}	{"veracity_score": 1.0}	\N	0	t	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
4a502b14-9d9f-4926-a045-5a246452bc90	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	0035ed14-67d6-4d82-825e-cd5664178bc5	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"type": "official_conclusion", "strength": "primary", "relationship": "supports"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
151910a0-f677-48af-bad9-0ddb8fab5add	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	9e671fe6-fba3-4aa7-98ce-bfa70709004d	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"type": "physical_evidence", "relationship": "evidence_for"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
366970bf-3e6d-44c7-94b7-f121c9123809	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	c33a6961-9a04-43fd-8664-da7a204831a1	0187ed56-23f2-41c8-a1bd-7197d9f3f213	{"relationship": "key_evidence", "controversial": true}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
9a9768f5-150b-46a4-8d61-5ff04b374179	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	0afeb2a9-4be9-4ef2-97a6-5a1c08664ca7	5c8e39f0-b8f8-499a-b306-43550984165f	{"relationship": "supports", "witness_count": 51}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
6515cfc0-269f-4d26-b935-15face8e716c	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	9de40b8d-a299-410e-96fb-c7c7cf2f3b7e	5c8e39f0-b8f8-499a-b306-43550984165f	{"relationship": "suggests", "shots_detected": 4}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
39a246ca-6ab6-4d15-b31c-b97bb3b79f0a	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	b0da62c1-6de0-4a2e-8b7e-73ca520d6948	5c8e39f0-b8f8-499a-b306-43550984165f	{"probability": "95%", "relationship": "validates"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
9d492392-20c8-433e-ab36-ccae24bd5283	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	b1329687-de12-45da-9d8d-eeb5ae8a87d8	c52a647b-1a82-4096-91c0-0a272233023c	{"relationship": "examined_by", "conflicting_reports": true}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
00dc32c1-7106-41af-af1c-583cc4c50775	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	111cd7ae-e3cd-489d-8ee6-02b55f844fc1	5c8e39f0-b8f8-499a-b306-43550984165f	{"relationship": "contradicts_official", "wound_interpretation": "entrance wound"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
0b32fa16-49d1-44ac-af57-bfe4aec9e4f6	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	5a80b204-fbe4-4d91-98fd-bed22d36a1db	c52a647b-1a82-4096-91c0-0a272233023c	{"frame": 313, "relationship": "captured"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
57761ec6-d522-465f-8787-5c37e33dc59e	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	5a80b204-fbe4-4d91-98fd-bed22d36a1db	5c8e39f0-b8f8-499a-b306-43550984165f	{"movement": "back and to left", "relationship": "analyzed_for"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
03c5ccbd-f6f0-424b-bd62-5506e86d6078	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	f4e4faaf-839a-40ee-b36c-a715d7a4a9ba	43982202-5efe-4661-a258-98d8c0252a13	{"relationship": "reveals", "classification": "formerly classified"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
cb1d7277-76d0-486f-a530-f465c401bdde	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	3557a30f-7982-4edc-b74c-c1d5355c69c3	43982202-5efe-4661-a258-98d8c0252a13	{"relationship": "links_to", "surveillance": "pre-assassination"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
f17f7ccc-3c96-4564-b40f-099000e46fce	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	a71a5df2-9d5f-4391-8c09-599ebd0bd34f	{"claim": "I am a patsy", "relationship": "denies"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
021b6aad-172a-459a-bfe0-b37881b23a7e	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	9e671fe6-fba3-4aa7-98ce-bfa70709004d	9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	{"alias": "A. Hidell", "relationship": "owned_by"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
62ef7834-2ebb-407d-8645-ad3368df90d0	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	0035ed14-67d6-4d82-825e-cd5664178bc5	b0da62c1-6de0-4a2e-8b7e-73ca520d6948	{"issue": "number of shots", "relationship": "contradicted_by"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
f1190c9a-1993-4c2e-aa8b-dbc4ba9a5f04	5e24155d-15fc-4cd6-96a1-89e999996393	60856374-4cd6-4e97-b630-d9c25fafe5b6	0187ed56-23f2-41c8-a1bd-7197d9f3f213	c52a647b-1a82-4096-91c0-0a272233023c	{"controversy": "trajectory analysis", "relationship": "related_ballistics"}	{"veracity_score": 0.3}	\N	0	f	\N	2025-11-05 22:48:38.45804+00	2025-11-05 22:48:38.45804+00
85d8281e-2263-4794-b59a-7e4f3f6a1448	fa806c40-550f-46d5-931c-03e010d868eb	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	\N	\N	\N	1	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00
2acdef28-64e1-4547-a656-44bcb4750e57	fa806c40-550f-46d5-931c-03e010d868eb	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000002	\N	\N	\N	0.95	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00
e181f501-963b-43cd-8b98-ec3acc393644	fa806c40-550f-46d5-931c-03e010d868eb	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000001	\N	\N	\N	1	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00
6f27c326-74e7-41fe-9763-460acf9dbd74	fa806c40-550f-46d5-931c-03e010d868eb	b9f707b0-304e-4dfe-b0c0-3acd167682ae	80000000-0000-0000-0000-000000000001	50000000-0000-0000-0000-000000000001	\N	\N	\N	0.95	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00
5d170da3-0fb4-4e26-9c62-25a02faa8453	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	cd318d60-a817-46a7-a647-991ffa6dccef	{"relationship": "parent-child", "hierarchyLevel": 2}	{}	\N	0.95	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
269edfa5-bda7-4893-bd84-da311bb5f093	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	a4089f0b-84bc-4135-a103-08c4d9e2cdad	{"relationship": "parent-child", "hierarchyLevel": 2}	{}	\N	0.95	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
a849dc0b-e3d1-4271-9bba-080ec5ae969e	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	b8966792-be02-47cb-bc23-564d1470385c	a309d337-99d2-495d-a00b-400507492aba	{"relationship": "parent-child", "hierarchyLevel": 2}	{}	\N	0.95	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
870165a5-f70c-4610-81d9-96544e0480a5	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	277add5f-6120-47ef-8c47-79ccd203ce17	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
adb8888d-5d4d-4e6d-8e10-7029f0ae2d5a	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	8c2a137e-32d9-42c3-b90c-b6abdffdafee	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
ae24661e-ee8d-404d-966e-7d3d0e8208f0	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	26dcc10a-fe1e-4e6a-9aec-59049d0116c0	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
8a381d71-89a4-4ed6-8767-348b3733e5f0	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	cb9a4571-7758-4ac6-a708-829507fd2062	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
964363fe-2785-40fe-a3c7-4791765a0748	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	a7b848a7-4d3f-4cfe-b881-5c3ade796b91	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
dd81fefe-030e-477b-a0d6-06559ae1d35e	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	54ce63f9-3b22-4b4a-8a46-fe96bafa8e99	{"relationship": "parent-child", "hierarchyLevel": 3}	{}	\N	0.9	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
ecf3a279-c51e-4f46-be96-80b6e0b9cc25	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	cd318d60-a817-46a7-a647-991ffa6dccef	28934a5c-2a2c-4f1b-9858-2adfc9549f11	{"citationType": "evidence"}	{}	\N	0.88	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
ab30c4fa-7e87-4e1f-a820-30a26a72f6cd	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a4089f0b-84bc-4135-a103-08c4d9e2cdad	3acf52cf-5dc5-4588-926d-c0a67780a63a	{"citationType": "evidence"}	{}	\N	0.88	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
275c3c4c-c562-455a-bd41-04f45552918a	46e701af-05a1-42dc-9646-daed44e73bd4	b9f707b0-304e-4dfe-b0c0-3acd167682ae	a309d337-99d2-495d-a00b-400507492aba	c8e4a9cd-689e-45b2-80e0-7923dd2a7f6f	{"citationType": "evidence"}	{}	\N	0.88	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
79f6fd4b-e9a4-4231-8b3b-28ff289b5c4c	46e701af-05a1-42dc-9646-daed44e73bd4	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	680d72e8-0df9-4a72-a195-958646f7f0c3	8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	{"role": "researcher"}	{}	\N	0.85	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
0b479975-2135-44b4-9d4b-3cf714f1cb3a	46e701af-05a1-42dc-9646-daed44e73bd4	ef81dc5d-f4b8-46c9-a43c-dae4915168d4	680d72e8-0df9-4a72-a195-958646f7f0c3	8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	{"role": "researcher"}	{}	\N	0.85	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
\.


--
-- Data for Name: Evidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Evidence" (id, target_node_id, target_edge_id, source_id, evidence_type, weight, confidence, content, content_excerpt, page_reference, temporal_relevance, decay_rate, relevant_date, is_verified, verified_by, verified_at, peer_review_status, peer_review_count, metadata, submitted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EvidenceAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceAuditLog" (id, evidence_id, action, action_description, actor_id, actor_type, changes, affected_fields, ip_address, user_agent, request_id, session_id, created_at) FROM stdin;
\.


--
-- Data for Name: EvidenceDuplicates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceDuplicates" (id, evidence_id_1, evidence_id_2, file_hash_match, content_similarity, metadata_similarity, detection_method, status, resolution_notes, resolved_by, resolved_at, merged_into_evidence_id, detected_at) FROM stdin;
\.


--
-- Data for Name: EvidenceFiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceFiles" (id, evidence_id, file_type, is_primary, version, storage_provider, storage_key, storage_bucket, storage_region, cdn_url, file_hash, hash_algorithm, file_size, mime_type, original_filename, file_extension, encoding, duration_seconds, dimensions, thumbnail_storage_key, thumbnail_cdn_url, has_preview, processing_status, processing_error, virus_scan_status, virus_scan_date, virus_scan_result, is_public, access_policy, estimated_monthly_cost, access_count, last_accessed_at, uploaded_by, uploaded_at, created_at, updated_at, deleted_at, deleted_by, deletion_reason, markdown_content, page_count, processing_service, processing_time_ms, document_title, document_author, document_subject, document_creator, document_producer, document_creation_date, document_modification_date, audio_duration_seconds, audio_sample_rate, audio_channels, audio_bitrate, video_processed, video_processing_started_at, video_processing_completed_at, video_processing_error) FROM stdin;
\.


--
-- Data for Name: EvidenceMetadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceMetadata" (id, evidence_id, authors, author_affiliations, corresponding_author, publication_date, access_date, relevant_date_range, journal, conference, publisher, volume, issue, pages, doi, isbn, issn, pmid, arxiv_id, study_type, methodology, sample_size, study_duration_days, peer_reviewed, preprint, keywords, topics, abstract, summary, language, language_confidence, geolocation, geographic_scope, countries_covered, jurisdiction, legal_context, regulation_reference, license, access_restrictions, paywall, copyright_holder, impact_factor, citation_count, h_index, altmetric_score, data_collection_method, instruments_used, software_used, statistical_methods, funding_sources, conflicts_of_interest, ethical_approval, data_availability, supplementary_materials, custom_metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EvidenceReviewVotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceReviewVotes" (id, review_id, user_id, vote_type, created_at) FROM stdin;
\.


--
-- Data for Name: EvidenceReviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceReviews" (id, evidence_id, reviewer_id, quality_score, credibility_score, relevance_score, clarity_score, overall_rating, recommendation, review_text, strengths, weaknesses, suggestions, flags, flag_explanation, reviewer_expertise_level, reviewer_credentials, verified_claims, disputed_claims, helpful_count, not_helpful_count, status, moderation_notes, created_at, updated_at, retracted_at, retraction_reason) FROM stdin;
\.


--
-- Data for Name: EvidenceSearchIndex; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceSearchIndex" (evidence_id, search_content, search_vector, file_types, authors, keywords, topics, publication_years, languages, has_files, file_count, review_count, avg_quality_score, last_updated) FROM stdin;
\.


--
-- Data for Name: EvidenceVotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EvidenceVotes" (id, evidence_id, user_id, vote_type, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ExtractedClaims; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExtractedClaims" (id, file_id, claim_text, context, confidence, claim_type, embedding, created_at) FROM stdin;
\.


--
-- Data for Name: FormalInquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FormalInquiries" (id, target_node_id, target_edge_id, user_id, content, status, parent_inquiry_id, created_at, updated_at, title, description, confidence_score, max_allowed_score, ai_determination, ai_rationale, evaluated_at, evaluated_by, related_node_ids, weakest_node_credibility, resolved_at) FROM stdin;
\.


--
-- Data for Name: Graphs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Graphs" (id, name, description, level, methodology, privacy, created_by, created_at, updated_at) FROM stdin;
2ec23ba6-641e-4894-911b-ae3bb2ec7c86	Test Graph	Test Description	1	f65ce390-53a9-4a24-a115-cce372169a2c	public	\N	2025-10-09 18:54:16.928881+00	2025-10-09 18:54:16.928881+00
6478498c-6115-4032-8ba8-421b368d0078	test 2	this si a	1	\N	public	\N	2025-10-10 17:13:25.510683+00	2025-10-10 17:13:25.510683+00
00000000-0000-0000-0000-000000000001	Level 0: Verified Facts	Immutable truth layer containing only verified, consensus facts with veracity = 1.0	0	\N	public	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:15.692947+00	2025-10-10 19:54:15.692947+00
11111111-1111-1111-1111-111111111111	My Workspace	Level 1 editable workspace for building theories	1	scientific_method	public	00000000-0000-0000-0000-000000000000	2025-10-10 23:06:25.362699+00	2025-10-10 23:06:25.362699+00
73110234-579f-40d6-84db-78911927410f	g4	\N	1	\N	public	\N	2025-10-10 23:24:59.856077+00	2025-10-10 23:24:59.856077+00
5e24155d-15fc-4cd6-96a1-89e999996393	JFK Assassination: Evidence & Theories	Comprehensive analysis of the JFK assassination including primary sources, witness testimony, and competing theories	0	Scientific Method	public	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00
fa806c40-550f-46d5-931c-03e010d868eb	JFK Assassination Investigation	Comprehensive investigation into the assassination of President John F. Kennedy on November 22, 1963	1	\N	public	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00
75485965-70c1-4bbb-885b-c85475ae1379	Climate Science Facts	Immutable verified facts about climate science	0	\N	public	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
46e701af-05a1-42dc-9646-daed44e73bd4	Climate Policy Analysis	Investigation of climate policies and impacts	1	\N	public	ffe212a8-7833-4cfb-acbc-9c7a6e72ce7c	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00
\.


--
-- Data for Name: InquiryVotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InquiryVotes" (id, inquiry_id, user_id, vote_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MediaProcessingJobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MediaProcessingJobs" (job_id, file_id, file_type, file_path, status, progress, options, result, error, created_at, updated_at, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: Methodologies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Methodologies" (id, name, description, category, status, version, is_system, icon, color, tags, config, usage_count, rating, created_by, parent_methodology_id, created_at, updated_at, published_at) FROM stdin;
0f30a641-f940-459f-95e5-e02c0717db87	5 Whys Root Cause Analysis	Iteratively ask "why" to drill down to the root cause of a problem. Best for simple to moderately complex issues.	analytical	published	1	t	search	#3B82F6	{root-cause,problem-solving,simple,iterative}	{}	0	\N	\N	\N	2025-10-09 17:15:38.7359+00	2025-10-09 17:15:38.7359+00	\N
a596c47d-c948-4869-b969-15879dd5f2f4	Fishbone (Ishikawa) Diagram	Systematic cause-and-effect analysis using categories (People, Process, Equipment, Materials, Environment, Management).	analytical	published	1	t	git-branch	#06B6D4	{root-cause,structured,brainstorming,manufacturing}	{}	0	\N	\N	\N	2025-10-09 17:15:38.744558+00	2025-10-09 17:15:38.744558+00	\N
ece2951f-c915-4ccd-b8fa-6cad6fbec2db	Mind Mapping	Visual brainstorming technique for exploring ideas, connections, and hierarchies. Great for creative thinking and knowledge organization.	creative	published	1	t	share-2	#EC4899	{brainstorming,creative,visual,free-form}	{}	0	\N	\N	\N	2025-10-09 17:15:38.747805+00	2025-10-09 17:15:38.747805+00	\N
36a81de2-558b-4fda-b941-b17d00765781	SWOT Analysis	Strategic planning framework analyzing Strengths, Weaknesses, Opportunities, and Threats.	strategic	published	1	t	grid	#14B8A6	{strategy,planning,business,decision-making}	{}	0	\N	\N	\N	2025-10-09 17:15:38.750811+00	2025-10-09 17:15:38.750811+00	\N
ee261d56-3d6f-4a96-8a7b-c49f7983b158	Systems Thinking Causal Loop	Visualize feedback loops, delays, and systemic relationships. Understand how parts of a system influence each other.	systems	published	1	t	repeat	#06B6D4	{systems,feedback,complexity,dynamics}	{}	0	\N	\N	\N	2025-10-09 17:15:38.754634+00	2025-10-09 17:15:38.754634+00	\N
9e3f0987-15d6-457e-bfe1-c95bf52f79e3	Decision Tree	Map out decisions, possible paths, and outcomes. Calculate expected values and risk-adjusted returns.	strategic	published	1	t	git-merge	#F59E0B	{decision,probability,risk,analysis}	{}	0	\N	\N	\N	2025-10-09 17:15:38.756952+00	2025-10-09 17:15:38.756952+00	\N
9d843db9-c7e5-42c9-99a4-e8c59cd085f5	Concept Mapping	Visualize relationships between concepts with labeled connections. Useful for knowledge representation and learning.	investigative	published	1	t	share-2	#A855F7	{learning,knowledge,relationships,education}	{}	0	\N	\N	\N	2025-10-09 17:15:38.759566+00	2025-10-09 17:15:38.759566+00	\N
f65ce390-53a9-4a24-a115-cce372169a2c	Timeline Analysis	Chronological visualization of events, milestones, and their relationships over time.	investigative	published	1	t	clock	#EC4899	{timeline,chronology,history,sequence}	{}	0	\N	\N	\N	2025-10-09 17:15:38.762489+00	2025-10-09 17:15:38.762489+00	\N
\.


--
-- Data for Name: MethodologyEdgeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyEdgeTypes" (id, methodology_id, name, display_name, description, is_directed, valid_source_types, valid_target_types, line_style, arrow_style, display_order, created_at, updated_at) FROM stdin;
93efcf47-0904-4806-837a-d2da2cc9c2cd	0f30a641-f940-459f-95e5-e02c0717db87	asks	Asks Why	Connects problem/answer to next why question	t	["problem", "why"]	["why"]	solid	arrow	0	2025-10-09 17:15:38.741167+00	2025-10-09 17:15:38.741167+00
4a1fa80f-cdce-4ce1-83c6-7c45186579f3	0f30a641-f940-459f-95e5-e02c0717db87	reveals	Reveals Root Cause	Final why leads to root cause	t	["why"]	["root_cause"]	solid	arrow	1	2025-10-09 17:15:38.742038+00	2025-10-09 17:15:38.742038+00
e16f8f09-bfc0-4a73-96ed-33aa7655dcc9	0f30a641-f940-459f-95e5-e02c0717db87	addresses	Addresses	Solution addresses root cause	t	["solution"]	["root_cause"]	dashed	arrow	2	2025-10-09 17:15:38.742673+00	2025-10-09 17:15:38.742673+00
0c69605c-16ec-45a8-9648-39a56d2ef588	a596c47d-c948-4869-b969-15879dd5f2f4	category_of	Category Of	Category relates to the main effect	t	["category"]	["effect"]	solid	arrow	0	2025-10-09 17:15:38.746835+00	2025-10-09 17:15:38.746835+00
fdcb3058-5704-44c4-8cf6-d078ddeb43e4	a596c47d-c948-4869-b969-15879dd5f2f4	causes	Causes	Cause contributes to effect or parent cause	t	["cause", "sub_cause"]	["effect", "category", "cause"]	solid	arrow	1	2025-10-09 17:15:38.747204+00	2025-10-09 17:15:38.747204+00
f17f86bd-52a5-46af-9385-216b2164d54b	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	branches_to	Branches To	Hierarchical connection	t	["central_idea", "main_branch", "sub_branch"]	["main_branch", "sub_branch", "leaf"]	solid	none	0	2025-10-09 17:15:38.749876+00	2025-10-09 17:15:38.749876+00
fb22a72b-2850-4522-986a-8e30cc802ea3	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	relates_to	Relates To	Non-hierarchical association	f	["main_branch", "sub_branch", "leaf"]	["main_branch", "sub_branch", "leaf"]	dashed	none	1	2025-10-09 17:15:38.750252+00	2025-10-09 17:15:38.750252+00
6ada59a6-4a10-4b95-8a75-c1793b9a92f4	36a81de2-558b-4fda-b941-b17d00765781	analyzes	Analyzes	SWOT element relates to objective	t	["strength", "weakness", "opportunity", "threat"]	["objective"]	solid	arrow	0	2025-10-09 17:15:38.753327+00	2025-10-09 17:15:38.753327+00
f08f31fe-74c4-4f67-a4e3-ae1d19670f61	36a81de2-558b-4fda-b941-b17d00765781	leverages	Leverages	Strategy uses strength or opportunity	t	["strategy"]	["strength", "opportunity"]	solid	arrow	1	2025-10-09 17:15:38.753662+00	2025-10-09 17:15:38.753662+00
0fe06e86-b6ac-4591-be22-60d0558a4bbc	36a81de2-558b-4fda-b941-b17d00765781	mitigates	Mitigates	Strategy addresses weakness or threat	t	["strategy"]	["weakness", "threat"]	dashed	arrow	2	2025-10-09 17:15:38.753983+00	2025-10-09 17:15:38.753983+00
ffc7850f-c09a-47db-9563-c8f4fb9513cc	ee261d56-3d6f-4a96-8a7b-c49f7983b158	same_direction	Same Direction (+)	Increase in source causes increase in target (or decrease causes decrease)	t	["variable"]	["variable"]	solid	arrow	0	2025-10-09 17:15:38.755758+00	2025-10-09 17:15:38.755758+00
98c8170d-3d1b-4f43-9438-b1b9b51d4dab	ee261d56-3d6f-4a96-8a7b-c49f7983b158	opposite_direction	Opposite Direction (-)	Increase in source causes decrease in target (or vice versa)	t	["variable"]	["variable"]	solid	arrow	1	2025-10-09 17:15:38.756121+00	2025-10-09 17:15:38.756121+00
f9b361eb-441b-455a-8f3f-40946f032e9c	ee261d56-3d6f-4a96-8a7b-c49f7983b158	delayed	Delayed Effect	Influence occurs with a time delay	t	["variable"]	["variable"]	dashed	arrow	2	2025-10-09 17:15:38.75641+00	2025-10-09 17:15:38.75641+00
a135e2b4-5497-4da4-95b4-93b762c00f6f	9e3f0987-15d6-457e-bfe1-c95bf52f79e3	choice	Choice	A possible choice from a decision	t	["decision"]	["chance", "outcome", "decision"]	solid	arrow	0	2025-10-09 17:15:38.758552+00	2025-10-09 17:15:38.758552+00
90f4df9d-82f3-4da4-b1ee-63ede3a8ecd1	9e3f0987-15d6-457e-bfe1-c95bf52f79e3	probability	Probability	A probabilistic outcome from a chance node	t	["chance"]	["outcome", "decision", "chance"]	solid	arrow	1	2025-10-09 17:15:38.75892+00	2025-10-09 17:15:38.75892+00
7a6cfe8e-c709-4c1c-9180-2f9feb35d4e2	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	is_a	Is A	Taxonomic relationship (specialization)	t	["sub_concept"]	["concept"]	solid	arrow	0	2025-10-09 17:15:38.761008+00	2025-10-09 17:15:38.761008+00
6a4aba02-c7a7-4ce9-a289-a1ad9cdc898e	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	has_a	Has A	Compositional relationship (part-of)	t	["concept", "sub_concept"]	["concept", "sub_concept"]	solid	arrow	1	2025-10-09 17:15:38.761359+00	2025-10-09 17:15:38.761359+00
15c17998-f802-4011-948b-2f1ffa89b975	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	leads_to	Leads To	Causal or temporal relationship	t	["concept", "sub_concept"]	["concept", "sub_concept"]	solid	arrow	2	2025-10-09 17:15:38.761655+00	2025-10-09 17:15:38.761655+00
f5065d8a-f9fd-4e7b-a85d-9f8d03f21cb0	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	related_to	Related To	General association	f	["concept", "sub_concept"]	["concept", "sub_concept"]	dashed	none	3	2025-10-09 17:15:38.76194+00	2025-10-09 17:15:38.76194+00
20495cb1-e7e7-49f9-85dd-3dbf393c1bba	f65ce390-53a9-4a24-a115-cce372169a2c	precedes	Precedes	Occurs before in time	t	["event", "milestone", "period"]	["event", "milestone", "period"]	solid	arrow	0	2025-10-09 17:15:38.763955+00	2025-10-09 17:15:38.763955+00
80c464ed-c9f3-4e87-b559-cbafff1df1d4	f65ce390-53a9-4a24-a115-cce372169a2c	causes	Causes	Causal relationship between events	t	["event", "milestone"]	["event", "milestone"]	solid	arrow	1	2025-10-09 17:15:38.764307+00	2025-10-09 17:15:38.764307+00
c8fafbb7-2956-4672-9228-9bbcdb58e988	f65ce390-53a9-4a24-a115-cce372169a2c	during	During	Event occurs during a time period	t	["event", "milestone"]	["period"]	dashed	none	2	2025-10-09 17:15:38.764589+00	2025-10-09 17:15:38.764589+00
\.


--
-- Data for Name: MethodologyNodeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyNodeTypes" (id, methodology_id, name, display_name, description, icon, color, properties_schema, default_properties, required_properties, display_order, created_at, updated_at) FROM stdin;
8fba6969-0cb2-434b-8c78-6d43b69915a7	0f30a641-f940-459f-95e5-e02c0717db87	problem	Problem Statement	The initial problem or symptom	alert-circle	#EF4444	{"type": "object", "properties": {"title": {"type": "string"}, "impact": {"enum": ["low", "medium", "high", "critical"], "type": "string"}, "description": {"type": "string"}}}	{"impact": "medium"}	{title}	0	2025-10-09 17:15:38.738469+00	2025-10-09 17:15:38.738469+00
11ea05a1-091f-487e-a08f-bd859f673450	0f30a641-f940-459f-95e5-e02c0717db87	why	Why Question	A why question exploring the cause	help-circle	#F59E0B	{"type": "object", "properties": {"depth": {"type": "number"}, "answer": {"type": "string"}, "question": {"type": "string"}}}	{"depth": 1}	{question,answer}	1	2025-10-09 17:15:38.739631+00	2025-10-09 17:15:38.739631+00
94f0b427-45d4-479d-a9b1-dba71e03d249	0f30a641-f940-459f-95e5-e02c0717db87	root_cause	Root Cause	The fundamental cause identified	target	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "confidence": {"type": "number", "maximum": 100, "minimum": 0}, "description": {"type": "string"}}}	{"confidence": 80}	{title}	2	2025-10-09 17:15:38.740095+00	2025-10-09 17:15:38.740095+00
b99ec431-4941-4f7d-bcdb-7a8e36250499	0f30a641-f940-459f-95e5-e02c0717db87	solution	Solution	Proposed solution to address the root cause	lightbulb	#8B5CF6	{"type": "object", "properties": {"cost": {"enum": ["low", "medium", "high"], "type": "string"}, "title": {"type": "string"}, "timeframe": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	3	2025-10-09 17:15:38.74059+00	2025-10-09 17:15:38.74059+00
bb49a920-9fd9-47c2-8ba5-8cf8d8ade542	a596c47d-c948-4869-b969-15879dd5f2f4	effect	Effect/Problem	The problem or effect being analyzed	alert-triangle	#DC2626	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	0	2025-10-09 17:15:38.745081+00	2025-10-09 17:15:38.745081+00
84734476-0b54-4474-a8b4-ac4422f09765	a596c47d-c948-4869-b969-15879dd5f2f4	category	Cause Category	Major category of causes (6Ms: Man, Machine, Method, Material, Measurement, Mother Nature)	folder	#7C3AED	{"type": "object", "properties": {"title": {"type": "string"}, "category": {"enum": ["Man", "Machine", "Method", "Material", "Measurement", "Mother Nature"], "type": "string"}}}	{}	{title,category}	1	2025-10-09 17:15:38.745549+00	2025-10-09 17:15:38.745549+00
dae65373-ca0d-409a-a999-eb365f5e2580	a596c47d-c948-4869-b969-15879dd5f2f4	cause	Potential Cause	Specific potential cause within a category	circle	#F59E0B	{"type": "object", "properties": {"title": {"type": "string"}, "likelihood": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"likelihood": "medium"}	{title}	2	2025-10-09 17:15:38.746008+00	2025-10-09 17:15:38.746008+00
3d7a3fd9-dfe2-4839-ad57-02dc75953f89	a596c47d-c948-4869-b969-15879dd5f2f4	sub_cause	Sub-Cause	Deeper level cause contributing to parent cause	corner-down-right	#FBBF24	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	3	2025-10-09 17:15:38.74634+00	2025-10-09 17:15:38.74634+00
0c773eae-58db-4524-b1ac-3ca7d9798924	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	central_idea	Central Idea	The main topic or concept at the center	sun	#F59E0B	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	0	2025-10-09 17:15:38.748204+00	2025-10-09 17:15:38.748204+00
07edeed9-be5e-4727-9a29-4a5e2eef4c36	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	main_branch	Main Branch	Primary theme or category	git-branch	#3B82F6	{"type": "object", "properties": {"color": {"type": "string"}, "title": {"type": "string"}}}	{}	{title}	1	2025-10-09 17:15:38.74863+00	2025-10-09 17:15:38.74863+00
8dd05970-1ba5-4086-90f0-20ea0e8f4cc7	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	sub_branch	Sub-Branch	Secondary idea or detail	corner-down-right	#10B981	{"type": "object", "properties": {"notes": {"type": "string"}, "title": {"type": "string"}}}	{}	{title}	2	2025-10-09 17:15:38.74901+00	2025-10-09 17:15:38.74901+00
b2993f7e-0a51-4d51-8bb7-88549f7dd5d4	ece2951f-c915-4ccd-b8fa-6cad6fbec2db	leaf	Leaf Node	Specific detail or example	file-text	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}	{}	{title}	3	2025-10-09 17:15:38.749482+00	2025-10-09 17:15:38.749482+00
270081a4-3aff-4c73-b91e-3aa871b48805	36a81de2-558b-4fda-b941-b17d00765781	objective	Objective	The goal or decision being analyzed	target	#6366F1	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	0	2025-10-09 17:15:38.751307+00	2025-10-09 17:15:38.751307+00
999dc37d-824b-4924-8fc3-386e0c1a3b9e	36a81de2-558b-4fda-b941-b17d00765781	strength	Strength	Internal positive attributes	trending-up	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "impact": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"impact": "medium"}	{title}	1	2025-10-09 17:15:38.751816+00	2025-10-09 17:15:38.751816+00
caf9378b-04c1-483a-aba3-c996394c2c10	36a81de2-558b-4fda-b941-b17d00765781	weakness	Weakness	Internal negative attributes	trending-down	#EF4444	{"type": "object", "properties": {"title": {"type": "string"}, "severity": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"severity": "medium"}	{title}	2	2025-10-09 17:15:38.752121+00	2025-10-09 17:15:38.752121+00
6c072ee0-3167-431b-b3c1-05df9a9a13cd	36a81de2-558b-4fda-b941-b17d00765781	opportunity	Opportunity	External positive factors	sunrise	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "probability": {"enum": ["low", "medium", "high"], "type": "string"}}}	{"probability": "medium"}	{title}	3	2025-10-09 17:15:38.752401+00	2025-10-09 17:15:38.752401+00
5cb912fa-627c-44c8-8d00-6fe70213bbec	36a81de2-558b-4fda-b941-b17d00765781	threat	Threat	External negative factors	alert-triangle	#F59E0B	{"type": "object", "properties": {"risk": {"enum": ["low", "medium", "high"], "type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{"risk": "medium"}	{title}	4	2025-10-09 17:15:38.752702+00	2025-10-09 17:15:38.752702+00
b7249b79-616a-4a0b-9362-10889e1d3291	36a81de2-558b-4fda-b941-b17d00765781	strategy	Strategy	Strategic action or recommendation	flag	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "priority": {"enum": ["low", "medium", "high"], "type": "string"}, "description": {"type": "string"}}}	{"priority": "medium"}	{title}	5	2025-10-09 17:15:38.752993+00	2025-10-09 17:15:38.752993+00
737eb0ee-7155-4193-9ff4-2851d8561920	ee261d56-3d6f-4a96-8a7b-c49f7983b158	variable	Variable	A factor or element in the system	circle	#3B82F6	{"type": "object", "properties": {"type": {"enum": ["stock", "flow", "converter"], "type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{"type": "stock"}	{title}	0	2025-10-09 17:15:38.755073+00	2025-10-09 17:15:38.755073+00
9b81658e-9b18-45e4-9e9c-eab8731487db	ee261d56-3d6f-4a96-8a7b-c49f7983b158	loop_indicator	Loop Indicator	Indicates a reinforcing (R) or balancing (B) loop	refresh-cw	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "loop_type": {"enum": ["reinforcing", "balancing"], "type": "string"}, "description": {"type": "string"}}}	{}	{title,loop_type}	1	2025-10-09 17:15:38.755423+00	2025-10-09 17:15:38.755423+00
85d540b9-5cdf-4fb1-8181-c0bad7bdd598	9e3f0987-15d6-457e-bfe1-c95bf52f79e3	decision	Decision Point	A decision that needs to be made	square	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	0	2025-10-09 17:15:38.75736+00	2025-10-09 17:15:38.75736+00
605c88ba-8624-4307-b766-6dd2a76e0e22	9e3f0987-15d6-457e-bfe1-c95bf52f79e3	chance	Chance Node	Uncertain event with multiple possible outcomes	circle	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title}	1	2025-10-09 17:15:38.757823+00	2025-10-09 17:15:38.757823+00
27746afd-1431-4a9e-a846-5cddc50e1091	9e3f0987-15d6-457e-bfe1-c95bf52f79e3	outcome	Outcome	Final result or endpoint	flag	#8B5CF6	{"type": "object", "properties": {"title": {"type": "string"}, "value": {"type": "number"}, "description": {"type": "string"}}}	{}	{title}	2	2025-10-09 17:15:38.758238+00	2025-10-09 17:15:38.758238+00
e84d9b7c-46fa-4512-ba4c-85acc5aec0e5	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	concept	Concept	A key concept or idea	box	#3B82F6	{"type": "object", "properties": {"title": {"type": "string"}, "examples": {"type": "array", "items": {"type": "string"}}, "definition": {"type": "string"}}}	{"examples": []}	{title}	0	2025-10-09 17:15:38.760358+00	2025-10-09 17:15:38.760358+00
a5f2219d-c0a7-45b0-ba98-9836bddd2dc2	9d843db9-c7e5-42c9-99a4-e8c59cd085f5	sub_concept	Sub-Concept	A more specific concept	square	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "definition": {"type": "string"}}}	{}	{title}	1	2025-10-09 17:15:38.760673+00	2025-10-09 17:15:38.760673+00
100c460b-843d-4857-a477-1600391d72a0	f65ce390-53a9-4a24-a115-cce372169a2c	event	Event	A significant event or milestone	circle	#3B82F6	{"type": "object", "properties": {"date": {"type": "string", "format": "date"}, "title": {"type": "string"}, "importance": {"enum": ["low", "medium", "high", "critical"], "type": "string"}, "description": {"type": "string"}}}	{"importance": "medium"}	{title,date}	0	2025-10-09 17:15:38.762901+00	2025-10-09 17:15:38.762901+00
843f9e28-462c-49d3-8f9c-5ae5196634a4	f65ce390-53a9-4a24-a115-cce372169a2c	period	Time Period	A span of time or era	calendar	#10B981	{"type": "object", "properties": {"title": {"type": "string"}, "end_date": {"type": "string", "format": "date"}, "start_date": {"type": "string", "format": "date"}, "description": {"type": "string"}}}	{}	{title,start_date}	1	2025-10-09 17:15:38.763247+00	2025-10-09 17:15:38.763247+00
88cde1db-e44a-4258-9a66-279a934e2fcb	f65ce390-53a9-4a24-a115-cce372169a2c	milestone	Milestone	A major achievement or turning point	flag	#F59E0B	{"type": "object", "properties": {"date": {"type": "string", "format": "date"}, "title": {"type": "string"}, "description": {"type": "string"}}}	{}	{title,date}	2	2025-10-09 17:15:38.76356+00	2025-10-09 17:15:38.76356+00
\.


--
-- Data for Name: MethodologyPermissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyPermissions" (id, methodology_id, user_id, permission, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: MethodologyWorkflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MethodologyWorkflows" (id, methodology_id, steps, is_linear, allow_skip, instructions, created_at, updated_at) FROM stdin;
ffaad8b3-0963-49ba-a858-4f2d216d44b6	0f30a641-f940-459f-95e5-e02c0717db87	[{"id": "step1", "type": "INSTRUCTION", "title": "Define the Problem", "config": {"nodeType": "problem"}, "description": "Start by clearly stating the problem you want to solve. Be specific about what is happening."}, {"id": "step2", "type": "NODE_CREATION", "title": "Ask the First Why", "config": {"nodeType": "why", "properties": {"depth": 1}}, "description": "Create the first \\"Why\\" question: Why is this problem occurring?"}, {"id": "step3", "type": "NODE_CREATION", "title": "Continue Asking Why", "config": {"repeat": true, "nodeType": "why"}, "description": "Keep asking why for each answer, typically 5 times or until you reach the root cause."}, {"id": "step4", "type": "NODE_CREATION", "title": "Identify Root Cause", "config": {"nodeType": "root_cause"}, "description": "Once you can't meaningfully ask \\"why\\" anymore, you've found your root cause."}, {"id": "step5", "type": "NODE_CREATION", "title": "Propose Solutions", "config": {"nodeType": "solution"}, "description": "Develop solutions that address the root cause, not just the symptoms."}]	t	f	The 5 Whys technique helps you drill down to the root cause by repeatedly asking "why". Start with a clear problem statement and ask why it occurs. Each answer becomes the input for the next why question. Continue until you reach the fundamental cause.	2025-10-09 17:15:38.743351+00	2025-10-09 17:15:38.743351+00
\.


--
-- Data for Name: NodeReferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NodeReferences" (id, node_id, url, title, description, type, confidence, processed_node_id, metadata, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: NodeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NodeTypes" (id, name, description, props, meta, ai, parent_node_type_id) FROM stdin;
39bb2851-a7c9-4678-9185-b574433570ea	Fact	Verified factual statement	{"fields": ["statement", "source", "date"]}	{}	\N	\N
0ed7e79e-14dc-417f-8f8e-e1071eceb940	Person	Historical or contemporary person	{"fields": ["fullName", "birth", "death", "nationality"]}	{}	\N	\N
7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	Event	Historical or current event	{"fields": ["title", "date", "location", "description"]}	{}	\N	\N
452fde61-103e-4dfa-a90b-ed263038def3	Location	Geographic location	{"fields": ["name", "coordinates", "country", "type"]}	{}	\N	\N
34c368b5-af0f-446f-839a-56a10ffd7692	Document	Primary source document	{"fields": ["title", "author", "publicationDate", "url"]}	{}	\N	\N
054fec53-1717-456e-b0dd-9f0ebc42f3dc	Concept	Scientific or philosophical concept	{"fields": ["name", "definition", "domain"]}	{}	\N	\N
d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	Article	A narrative document that references and connects multiple nodes with additional context and author commentary	{"schema": {"author_id": {"type": "string", "format": "uuid", "description": "Primary author user ID"}, "narrative": {"type": "string", "required": true, "description": "Markdown content of the article"}, "published": {"type": "boolean", "default": false, "required": true}, "permissions": {"type": "array", "items": {"type": "string"}, "description": "User IDs with edit permissions"}}}	{"category": "document", "isSpecialType": true}	\N	\N
327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	Claim	An assertion that may be true or false, subject to verification	{"schema": {"confidence": {"max": 1, "min": 0, "type": "number"}}}	{"category": "assertion"}	\N	\N
c67dadf7-fce7-45ce-b396-34f58f938271	Place	A physical or geographic location	{"schema": {"address": {"type": "string"}, "latitude": {"type": "number"}, "longitude": {"type": "number"}}}	{"category": "entity", "schemaOrg": "Place"}	\N	\N
2a6b6a28-9287-4668-971e-6f81c8b60b69	Thing	An object, document, or other physical/digital item	{"schema": {"itemType": {"type": "string"}}}	{"category": "entity", "schemaOrg": "Thing"}	\N	\N
80d49f0d-07f7-469b-8626-a734add0a9b4	Thesis	A thesis statement that provides an overarching argument or position	{"schema": {"content": {"type": "string", "required": true, "description": "The thesis statement text"}, "citations": {"type": "array", "items": {"type": "string", "format": "uuid"}, "description": "Array of node IDs that this thesis cites"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N
b6b7804b-76bf-4b51-9dd2-2034e52c792d	Citation	A reference to a source or node with attribution information	{"schema": {"url": {"type": "string", "format": "uri", "description": "URL to external source"}, "source": {"type": "string", "required": true, "description": "The citation source or reference"}, "authors": {"type": "array", "items": {"type": "string"}, "description": "Authors of the cited work"}, "sourceType": {"enum": "[\\"academic\\", \\"web\\", \\"book\\", \\"article\\", \\"node\\"]", "type": "string", "description": "Type of citation source"}, "publicationDate": {"type": "string", "format": "date", "description": "Date of publication"}, "referencedNodeId": {"type": "string", "format": "uuid", "description": "Node ID if citing an internal node"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N
e09f640b-980d-4e00-b85d-bced7817306d	Reference	A general reference or note pointing to another node or external resource	{"schema": {"text": {"type": "string", "required": true, "description": "The reference text or note"}, "externalUrl": {"type": "string", "format": "uri", "description": "URL if referencing external resource"}, "targetNodeId": {"type": "string", "format": "uuid", "description": "Node ID if referencing an internal node"}}}	{"category": "annotation", "isTextBox": true, "canvasElement": true, "hasCredibilityScore": false}	\N	\N
\.


--
-- Data for Name: Nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Nodes" (id, graph_id, node_type_id, props, meta, ai, weight, content_hash, primary_source_id, is_level_0, created_by, created_at, updated_at, title, narrative, published_at, permissions, author_id) FROM stdin;
10000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"born": "1917-05-29", "died": "1963-11-22", "role": "35th President of the United States"}	\N	\N	1	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	John F. Kennedy	\N	\N	[]	00000000-0000-0000-0000-000000000000
10000000-0000-0000-0000-000000000002	fa806c40-550f-46d5-931c-03e010d868eb	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"born": "1939-10-18", "died": "1963-11-24", "role": "Alleged assassin"}	\N	\N	0.95	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Lee Harvey Oswald	\N	\N	[]	00000000-0000-0000-0000-000000000000
20000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	c67dadf7-fce7-45ce-b396-34f58f938271	{"location": "Dallas, Texas", "coordinates": "32.7787,-96.8089"}	\N	\N	1	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Dealey Plaza	\N	\N	[]	00000000-0000-0000-0000-000000000000
30000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1963-11-22", "time": "12:30 PM CST", "location": "Dealey Plaza, Dallas, Texas"}	\N	\N	1	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Assassination of JFK	\N	\N	[]	00000000-0000-0000-0000-000000000000
40000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	2a6b6a28-9287-4668-971e-6f81c8b60b69	{"type": "Official Investigation Report", "pages": 888, "published": "1964-09-27"}	\N	\N	1	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Warren Commission Report	\N	\N	[]	00000000-0000-0000-0000-000000000000
50000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	39bb2851-a7c9-4678-9185-b574433570ea	{"evidence": "Witness testimony, acoustic analysis", "verified": true}	\N	\N	0.95	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Three shots fired	\N	\N	[]	00000000-0000-0000-0000-000000000000
60000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Witness reports of grassy knoll shots", "disputed": true}	\N	\N	0.4	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	Second shooter theory	\N	\N	[]	00000000-0000-0000-0000-000000000000
80000000-0000-0000-0000-000000000001	fa806c40-550f-46d5-931c-03e010d868eb	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	\N	\N	\N	0.85	\N	\N	f	00000000-0000-0000-0000-000000000000	2025-11-12 04:53:06.179211+00	2025-11-12 04:53:06.179211+00	The Warren Commission: Official Account	# The Warren Commission Report\n\n## Overview\n\nOn September 27, 1964, the Warren Commission released its 888-page report concluding that President John F. Kennedy was assassinated by Lee Harvey Oswald acting alone.\n\n## Key Findings\n\n- Lee Harvey Oswald fired three shots from the Texas School Book Depository\n- No evidence of conspiracy was found\n- Jack Ruby acted alone in killing Oswald\n\n## Legacy\n\nDespite the conclusions, many Americans continue to question the findings and believe in conspiracy theories.	2025-11-12 04:53:06.179211+00	[]	00000000-0000-0000-0000-000000000000
b8966792-be02-47cb-bc23-564d1470385c	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 1, "status": "published", "articleType": "investigation", "methodology": "Scientific Method"}	{"version": 1, "contributors": ["ff84e195-1ecd-4b49-9a05-416425e235be", "ffe212a8-7833-4cfb-acbc-9c7a6e72ce7c", "d6b70dff-13ed-4c7f-a60d-831dabc9c0c0"], "lastModified": "2025-11-21T22:49:36.459Z"}	\N	0.95	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Climate Change: A Comprehensive Investigation	# Climate Change: A Comprehensive Investigation\n\n## Executive Summary\n\nThis comprehensive investigation examines the evidence for anthropogenic climate change, its observed impacts, and policy responses. Drawing from peer-reviewed research, government reports, and observational data, we trace the chain of evidence from greenhouse gas emissions to global temperature rise and resulting environmental changes.\n\n## Key Findings\n\n1. **Atmospheric CO2 concentrations** have increased from 280 ppm (pre-industrial) to over 420 ppm (2024)\n2. **Global mean temperature** has risen approximately 1.1°C since 1850-1900\n3. **Sea level rise** has accelerated to 3.3 mm/year in recent decades\n4. **Extreme weather events** show attribution to climate change in many cases\n5. **Policy interventions** including carbon pricing show measurable but insufficient progress\n\n## Investigation Structure\n\nThis investigation is organized into sub-investigations examining:\n- Temperature attribution and paleoclimate context\n- Cryosphere changes (ice sheets, glaciers, sea ice)\n- Extreme weather attribution\n- Economic analysis of mitigation policies\n- Public health co-benefits\n\nEach sub-investigation contains detailed evidence chains linking observations to verified sources.	2025-11-21 22:49:36.446408+00	[]	ff84e195-1ecd-4b49-9a05-416425e235be
3daf3c3d-1351-4641-8c90-2154f89efa53	00000000-0000-0000-0000-000000000001	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "verified", "source": "NASA", "category": "astronomy", "statement": "Earth is the third planet from the Sun"}	{"schema_type": "CreativeWork", "consensus_level": "unanimous", "verification_date": "2025-01-01"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	Untitled Fact	\N	\N	[]	\N
44e957b4-6073-42e1-b61e-d815b734d58b	00000000-0000-0000-0000-000000000001	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1983", "source": "BIPM", "category": "physics", "statement": "The speed of light in vacuum is approximately 299,792,458 meters per second"}	{"standard": "SI definition", "schema_type": "CreativeWork", "verification_date": "1983"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	Untitled Fact	\N	\N	[]	\N
75dce521-38fc-4012-8ecd-0ab6d3a8ac99	00000000-0000-0000-0000-000000000001	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "verified", "source": "IUPAC", "category": "chemistry", "statement": "Water (H2O) consists of two hydrogen atoms and one oxygen atom"}	{"schema_type": "CreativeWork", "consensus_level": "unanimous", "verification_date": "historical"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.969616+00	2025-10-10 19:54:55.969616+00	Untitled Fact	\N	\N	[]	\N
47c88546-6dc5-45c2-8425-507366913140	00000000-0000-0000-0000-000000000001	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"birth": "1879-03-14", "death": "1955-04-18", "fullName": "Albert Einstein", "occupation": "Theoretical Physicist", "nationality": "German/American"}	{"nobel_prize": "1921 Physics", "schema_type": "CreativeWork", "verified_by": "historical records"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.97313+00	2025-10-10 19:54:55.97313+00	Untitled Person	\N	\N	[]	\N
13eddbb0-a30c-4304-81a2-c383745fa24b	11111111-1111-1111-1111-111111111111	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 90, "y": 210, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:24:21.363041+00	2025-10-10 23:24:21.363041+00	Untitled Fact	\N	\N	[]	\N
0035ed14-67d6-4d82-825e-cd5664178bc5	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1964-09-27", "type": "official_document", "pages": 888, "title": "Warren Commission Report", "endDate": "1964-09-27", "startDate": "1963-11-22", "conclusion": "single gunman", "description": "Official 888-page report released September 27, 1964, concluding Lee Harvey Oswald acted alone", "commission_members": ["Earl Warren", "Gerald Ford", "Allen Dulles", "John McCloy", "Richard Russell", "John Cooper", "Hale Boggs"]}	{"schema_type": "CommissionInquiry", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Warren Commission Report	\N	\N	[]	\N
5a80b204-fbe4-4d91-98fd-bed22d36a1db	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "type": "primary_evidence", "title": "Zapruder Film", "frames": 486, "duration": "PT26.6S", "frame_rate": "18.3 fps", "key_frames": {"225": "first visible reaction", "313": "fatal shot"}, "description": "26.6-second 8mm film shot by Abraham Zapruder showing the assassination"}	{"schema_type": "VideoObject", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Zapruder Film	\N	\N	[]	\N
cd318d60-a817-46a7-a647-991ffa6dccef	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.471Z"}	\N	0.9	\N	\N	f	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Temperature Records and Attribution Science	# Temperature Records and Attribution Science\n\n## Overview\n\nThis investigation examines the observational temperature record and attribution studies linking warming to greenhouse gas emissions.\n\n## Key Evidence\n\n### Observational Data\n- NASA GISS temperature analysis shows 1.1°C warming since pre-industrial\n- Berkeley Earth independent analysis confirms trend\n- Multiple reanalysis datasets show consistent warming\n\n### Attribution Studies\n- IPCC AR6 concludes "unequivocal" that human influence has warmed the climate\n- Detection and attribution studies show greenhouse gas fingerprint\n- Natural factors alone cannot explain observed warming\n\n### Paleoclimate Context\n- Current warming rate (0.18°C/decade) unprecedented in at least 2,000 years\n- Proxy records (ice cores, tree rings) provide long-term context\n- Medieval Warm Period and Little Ice Age were regional, not global	2025-11-21 22:49:36.446408+00	[]	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0
a4089f0b-84bc-4135-a103-08c4d9e2cdad	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.473Z"}	\N	0.9	\N	\N	f	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Sea Level Rise: Evidence and Projections	# Sea Level Rise: Evidence and Projections\n\n## Current Observations\n\nSatellite altimetry shows global mean sea level rising at 3.3 mm/year (1993-2023), with recent acceleration.\n\n### Contributing Factors\n1. **Thermal expansion** (~40% of rise)\n2. **Glacier mass loss** (~21%)\n3. **Greenland ice sheet** (~15%)\n4. **Antarctic ice sheet** (~12%)\n\n## Attribution\n\nMass balance studies link ice sheet contribution to warming. Greenland losing ~270 Gt/year, Antarctica ~150 Gt/year.\n\n## Future Projections\n\nIPCC AR6 projects 0.28-1.01m rise by 2100 depending on emissions scenario. Ice sheet dynamics remain key uncertainty.	2025-11-21 22:49:36.446408+00	[]	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0
a309d337-99d2-495d-a00b-400507492aba	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 2, "parentArticle": "b8966792-be02-47cb-bc23-564d1470385c"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.474Z"}	\N	0.9	\N	\N	f	ffe212a8-7833-4cfb-acbc-9c7a6e72ce7c	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Carbon Pricing Mechanisms and Effectiveness	# Carbon Pricing Mechanisms and Effectiveness\n\n## Policy Overview\n\nCarbon pricing puts a cost on greenhouse gas emissions through:\n1. **Carbon taxes** - Direct price per tonne CO2\n2. **Emissions trading** (cap-and-trade) - Market-based allowance system\n\n## Case Study: EU ETS\n\nThe European Emissions Trading System (EU ETS) is the world's largest carbon market:\n- Covers ~40% of EU emissions\n- Price reached €100/tonne CO2 in 2023\n- Emissions from covered sectors declined 35% since 2005\n\n## Effectiveness Analysis\n\nStudies show:\n- Modest emissions reductions (5-15%) where implemented\n- Revenue recycling opportunities\n- Complementary policies needed for deep decarbonization\n- Political challenges in setting adequate prices	2025-11-21 22:49:36.446408+00	[]	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0
277add5f-6120-47ef-8c47-79ccd203ce17	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "cd318d60-a817-46a7-a647-991ffa6dccef"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.476Z"}	\N	0.88	\N	\N	f	f8b6b462-b2ae-49e1-9e90-1d942e7afaa3	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	IPCC AR6 Working Group I Findings	Detailed analysis of IPCC AR6 WG1 physical science basis...	2025-11-21 22:49:36.446408+00	[]	78fa077a-2aba-473c-b220-8ed2a798221e
8c2a137e-32d9-42c3-b90c-b6abdffdafee	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "cd318d60-a817-46a7-a647-991ffa6dccef"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.477Z"}	\N	0.88	\N	\N	f	9873c4cf-bc83-4c43-b0b0-c8e55570dd1b	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Paleoclimate Temperature Reconstructions	Ice core and proxy data analysis spanning millennia...	2025-11-21 22:49:36.446408+00	[]	ff84e195-1ecd-4b49-9a05-416425e235be
26dcc10a-fe1e-4e6a-9aec-59049d0116c0	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a4089f0b-84bc-4135-a103-08c4d9e2cdad"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.479Z"}	\N	0.88	\N	\N	f	d6b941b6-d308-42de-9671-a8a86e6723dc	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Antarctic Ice Sheet Dynamics	Mass balance studies and ice flow velocity measurements...	2025-11-21 22:49:36.446408+00	[]	f8b6b462-b2ae-49e1-9e90-1d942e7afaa3
cb9a4571-7758-4ac6-a708-829507fd2062	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a4089f0b-84bc-4135-a103-08c4d9e2cdad"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.480Z"}	\N	0.88	\N	\N	f	de8f1504-d549-4548-b3d2-25f36e584d5b	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Greenland Surface Melt Analysis	Satellite observations of surface melting trends...	2025-11-21 22:49:36.446408+00	[]	ff84e195-1ecd-4b49-9a05-416425e235be
a7b848a7-4d3f-4cfe-b881-5c3ade796b91	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a309d337-99d2-495d-a00b-400507492aba"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.481Z"}	\N	0.88	\N	\N	f	de8f1504-d549-4548-b3d2-25f36e584d5b	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	European Carbon Market Case Study	In-depth analysis of EU ETS implementation and results...	2025-11-21 22:49:36.446408+00	[]	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0
5c8e39f0-b8f8-499a-b306-43550984165f	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Grassy Knoll Second Shooter", "evidence": ["witness testimony", "smoke", "acoustic evidence"], "proponents": ["Mark Lane", "Jim Garrison"], "description": "Theory of second shooter positioned on grassy knoll"}	{"schema_type": "CreativeWork/Report", "veracity_score": 0.35}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Grassy Knoll Second Shooter	\N	\N	[]	\N
8124540d-4561-4c4f-a23e-ec96690beb26	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Military-Industrial Complex", "motives": ["Vietnam withdrawal", "defense contracts", "Cold War"], "description": "Theory related to Vietnam War escalation and defense contracts", "beneficiaries": ["defense contractors", "Pentagon hawks"]}	{"schema_type": "CreativeWork/Report", "veracity_score": 0.05}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Military-Industrial Complex	\N	\N	[]	\N
c52a647b-1a82-4096-91c0-0a272233023c	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "forensic_analysis", "frame": 313, "title": "Fatal Head Shot Analysis", "exit_wound": "right temporal", "description": "Conflicting analyses of final shot direction", "direction_debate": ["back and to left", "forward snap"]}	{"schema_type": "BallisticsAnalysis", "veracity_score": 0.0}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Fatal Head Shot Analysis	\N	\N	[]	\N
2acf6a09-5424-41f6-a6de-8b3ed3f0fbee	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "LBJ Involvement Theory", "motives": ["political ambition", "Bobby Baker scandal", "Texas oil interests"], "evidence": ["Mac Wallace fingerprint claim"], "description": "Theory that Vice President Johnson was involved"}	{"schema_type": "Theory", "veracity_score": 0.0}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	LBJ Involvement Theory	\N	\N	[]	\N
e82d927e-c3f4-4c0f-9065-5443ddc9d69d	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Umbrella Man Signal Theory", "testimony": "1978 HSCA", "description": "Theory that man with umbrella was signaling shooters", "identified_as": "Louie Steven Witt", "claimed_reason": "protest symbol"}	{"schema_type": "Theory", "veracity_score": 0.0}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Umbrella Man Signal Theory	\N	\N	[]	\N
54ce63f9-3b22-4b4a-8a46-fe96bafa8e99	46e701af-05a1-42dc-9646-daed44e73bd4	d6fa1118-1b0c-412c-9a0e-9ff3db1f9545	{"level": 3, "parentArticle": "a309d337-99d2-495d-a00b-400507492aba"}	{"version": 1, "lastModified": "2025-11-21T22:49:36.482Z"}	\N	0.88	\N	\N	f	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Carbon Tax Effectiveness in Scandinavia	Empirical evidence from Nordic carbon tax policies...	2025-11-21 22:49:36.446408+00	[]	f8b6b462-b2ae-49e1-9e90-1d942e7afaa3
28934a5c-2a2c-4f1b-9858-2adfc9549f11	75485965-70c1-4bbb-885b-c85475ae1379	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "ppm", "year": 2024, "value": 420, "source": "Mauna Loa Observatory"}	{"verified": true, "verifiedDate": "2024-01-15"}	\N	1	\N	\N	t	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	CO2 at 420 ppm	\N	\N	[]	\N
3acf52cf-5dc5-4588-926d-c0a67780a63a	75485965-70c1-4bbb-885b-c85475ae1379	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "°C", "value": 1.1, "source": "NASA GISS", "baseline": "1850-1900"}	{"verified": true, "verifiedDate": "2024-01-15"}	\N	1	\N	\N	t	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Global temp +1.1°C	\N	\N	[]	\N
c8e4a9cd-689e-45b2-80e0-7923dd2a7f6f	75485965-70c1-4bbb-885b-c85475ae1379	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "mm/year", "value": 3.3, "period": "1993-2023", "source": "Satellite altimetry"}	{"verified": true, "verifiedDate": "2024-01-15"}	\N	1	\N	\N	t	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Sea level +3.3mm/year	\N	\N	[]	\N
68069834-5a4d-46ca-b995-f421c406aac8	75485965-70c1-4bbb-885b-c85475ae1379	39bb2851-a7c9-4678-9185-b574433570ea	{"unit": "%/decade", "value": 13, "source": "NSIDC"}	{"verified": true, "verifiedDate": "2024-01-15"}	\N	1	\N	\N	t	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Arctic ice decline 13%/decade	\N	\N	[]	\N
680d72e8-0df9-4a72-a195-958646f7f0c3	46e701af-05a1-42dc-9646-daed44e73bd4	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Detection and attribution studies", "confidence": 0.99}	{"claimType": "scientific"}	\N	0.7697516	\N	\N	f	d6b70dff-13ed-4c7f-a60d-831dabc9c0c0	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Human activity causes warming	\N	\N	[]	\N
547cf3ec-eb1f-4858-8a14-7e407e308520	46e701af-05a1-42dc-9646-daed44e73bd4	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Event attribution analysis", "confidence": 0.85}	{"claimType": "scientific"}	\N	0.7585826	\N	\N	f	de8f1504-d549-4548-b3d2-25f36e584d5b	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Extreme weather increasing	\N	\N	[]	\N
a3ec4981-5c2d-493a-b14d-9ef70c733038	46e701af-05a1-42dc-9646-daed44e73bd4	327c6f3c-5d92-42e5-9fb6-7a7e44d2cd10	{"basis": "Empirical policy studies", "confidence": 0.75}	{"claimType": "scientific"}	\N	0.87379795	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Carbon pricing reduces emissions	\N	\N	[]	\N
8d8e66f5-6e1e-4a8a-92d1-74e01a982e73	46e701af-05a1-42dc-9646-daed44e73bd4	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate scientist", "affiliation": "Penn State University"}	{}	\N	0.8	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Dr. Michael Mann	\N	\N	[]	\N
e98e166d-e214-48e8-b0f1-731e29411856	46e701af-05a1-42dc-9646-daed44e73bd4	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate scientist", "affiliation": "Texas Tech University"}	{}	\N	0.8	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Dr. Katharine Hayhoe	\N	\N	[]	\N
c6912ea8-62b6-451d-bbd1-7a867f5f2961	46e701af-05a1-42dc-9646-daed44e73bd4	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"role": "Climate diplomat", "affiliation": "UNFCCC"}	{}	\N	0.8	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Christiana Figueres	\N	\N	[]	\N
e8ae70b8-f4d5-4560-a551-cf418c2119c2	46e701af-05a1-42dc-9646-daed44e73bd4	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "2021-08-09", "significance": "Major assessment report"}	{}	\N	0.85	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	IPCC AR6 Release	\N	\N	[]	\N
73b8ac00-a028-4e65-b9ae-b6d727cdb735	5e24155d-15fc-4cd6-96a1-89e999996393	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "12:30:00 CST", "type": "timeline_event", "frame": "160-224", "title": "12:30 PM - First Shot", "location": "Dealey Plaza", "description": "First shot fired in Dealey Plaza"}	{"schema_type": "Event", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	12:30 PM - First Shot	\N	\N	[]	\N
44902b47-f0f6-4438-94a0-88f2db717c4b	46e701af-05a1-42dc-9646-daed44e73bd4	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "2015-12-12", "significance": "International climate treaty"}	{}	\N	0.85	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Paris Agreement	\N	\N	[]	\N
e8218bc6-0cdb-4e3d-bb1a-dc26dc1b05dc	46e701af-05a1-42dc-9646-daed44e73bd4	452fde61-103e-4dfa-a90b-ed263038def3	{"lat": 19.5362, "lon": -155.5763, "type": "Research station"}	{}	\N	0.9	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Mauna Loa Observatory	\N	\N	[]	\N
e8c83211-9cc2-494b-8f44-d4fea6451d84	46e701af-05a1-42dc-9646-daed44e73bd4	452fde61-103e-4dfa-a90b-ed263038def3	{"type": "Continent"}	{}	\N	0.9	\N	\N	f	ff84e195-1ecd-4b49-9a05-416425e235be	2025-11-21 22:49:36.446408+00	2025-11-21 22:49:36.446408+00	Antarctica	\N	\N	[]	\N
ae7a5e2d-8dc5-4d98-9b04-2dfaffce91f5	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22T12:00:00", "time": "12:30 PM CST", "type": "physical_evidence", "title": "Dealey Plaza Crime Scene", "location": "Dallas, TX", "description": "Physical location of assassination with documented positions and trajectories", "witnesses_present": 600}	{"schema_type": "Place", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Dealey Plaza Crime Scene	\N	\N	[]	\N
081a541c-235a-44bb-9b11-73557b415329	11111111-1111-1111-1111-111111111111	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 390, "y": 60, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:35:20.232892+00	2025-10-10 23:35:20.232892+00	Untitled Fact	\N	\N	[]	\N
0afeb2a9-4be9-4ef2-97a6-5a1c08664ca7	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22", "type": "witness_testimony", "title": "Grassy Knoll Witnesses", "location": "grassy knoll", "description": "51 witnesses reported shots from grassy knoll area", "total_witnesses": 51, "notable_witnesses": ["S.M. Holland", "Lee Bowers", "Jean Hill", "Mary Moorman"]}	{"schema_type": "Testimony", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Grassy Knoll Witnesses	\N	\N	[]	\N
3ab32bd7-2751-4c08-8c6c-7798f99a0826	11111111-1111-1111-1111-111111111111	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 60, "y": 135, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:35:25.837446+00	2025-10-10 23:35:25.837446+00	Untitled Fact	\N	\N	[]	\N
8a9ab74c-0a48-4ee8-a0e8-74a8bae23c74	6478498c-6115-4032-8ba8-421b368d0078	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 75, "y": 255, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:35:28.235246+00	2025-10-10 23:35:28.235246+00	Untitled Fact	\N	\N	[]	\N
f251cd21-c390-430b-a472-72bb8c3aa5f3	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Three Tramps Theory", "released": "without charges", "identified": ["Harold Doyle", "John Gedney", "Gus Abrams"], "arrest_time": "2:00 PM", "description": "Theory that three arrested tramps were CIA operatives"}	{"schema_type": "Theory", "veracity_score": 0.0}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Three Tramps Theory	\N	\N	[]	\N
28fc56fe-e65a-4215-941e-da364b7d66a1	5e24155d-15fc-4cd6-96a1-89e999996393	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "12:30:13 CST", "type": "timeline_event", "title": "12:30:13 PM - Fatal Shot", "description": "Fatal head shot at Zapruder frame 313", "zapruder_frame": 313}	{"schema_type": "Event", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	12:30:13 PM - Fatal Shot	\N	\N	[]	\N
5c9c1f78-5d2c-436b-b4aa-cad87032b68e	5e24155d-15fc-4cd6-96a1-89e999996393	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"time": "1:00 PM CST", "type": "timeline_event", "title": "1:00 PM - JFK Pronounced Dead", "doctor": "Dr. Kemp Clark", "location": "Parkland Hospital", "description": "President Kennedy pronounced dead at Parkland Hospital"}	{"schema_type": "Event", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	1:00 PM - JFK Pronounced Dead	\N	\N	[]	\N
9de40b8d-a299-410e-96fb-c7c7cf2f3b7e	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-24", "type": "audio_evidence", "title": "Dallas Police Dictabelt Recording", "channel": "Channel 1", "officer": "H.B. McLain", "duration": "5.5 minutes", "description": "Audio recording from motorcycle officer microphone suggesting 4 shots", "shots_detected": 4}	{"schema_type": "AudioObject", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Dallas Police Dictabelt Recording	\N	\N	[]	\N
b1329687-de12-45da-9d8d-eeb5ae8a87d8	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "time": "8:00 PM EST", "type": "medical_document", "title": "Bethesda Autopsy Report", "doctors": ["James Humes", "Thornton Boswell", "Pierre Finck"], "description": "Official autopsy conducted at Bethesda Naval Hospital by Commanders Humes and Boswell", "wounds_documented": 3}	{"schema_type": "MedicalProcedure", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Bethesda Autopsy Report	\N	\N	[]	\N
2f436e7b-08bd-479f-bb53-7f12c88c692e	2ec23ba6-641e-4894-911b-ae3bb2ec7c86	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 225, "y": 330, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:35:36.006889+00	2025-10-10 23:35:36.006889+00	Untitled Fact	\N	\N	[]	\N
c33a6961-9a04-43fd-8664-da7a204831a1	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "physical_evidence", "title": "CE 399 Magic Bullet", "weight": "158.6 grains", "exhibit": "CE 399", "condition": "nearly pristine", "controversy": "single bullet theory", "description": "Nearly pristine bullet found on Connally stretcher"}	{"schema_type": "Evidence", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	CE 399 Magic Bullet	\N	\N	[]	\N
f4e4faaf-839a-40ee-b36c-a715d7a4a9ba	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"type": "classified_documents", "pages": 2800, "title": "CIA JFK Files (Released 2017)", "topics": ["Oswald Mexico City", "Operation Mongoose", "Anti-Castro plots"], "description": "Previously classified CIA documents released under JFK Records Act", "foundingDate": "1947-09-18", "release_date": "2017-10-26", "still_withheld": 300}	{"schema_type": "GovernmentOrganization", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	CIA JFK Files (Released 2017)	\N	\N	[]	\N
fcc88fd8-9fe0-475b-90ae-4a6178c79f57	5e24155d-15fc-4cd6-96a1-89e999996393	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"name": "Lee Harvey Oswald", "time": "1:50 PM CST", "type": "timeline_event", "title": "1:50 PM - Oswald Arrested", "charge": "Tippit murder", "location": "Texas Theatre", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "Lee Harvey Oswald arrested at Texas Theatre"}	{"schema_type": "Person", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Lee Harvey Oswald	\N	\N	[]	\N
9c5cf4c8-cc60-4d5a-9307-7ba5eb40bdc4	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-23", "name": "Lee Harvey Oswald", "type": "testimony", "title": "Oswald Interrogation Notes", "duration": "PT12H", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "Notes from 12 hours of interrogation before Oswald death", "no_recording": true, "oswald_claim": "patsy", "interrogators": ["Will Fritz", "FBI agents", "Secret Service"]}	{"schema_type": "Person", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Lee Harvey Oswald	\N	\N	[]	\N
b0da62c1-6de0-4a2e-8b7e-73ca520d6948	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1979-03-29", "type": "official_document", "title": "House Select Committee Report", "conclusion": "probable conspiracy", "description": "1979 Congressional investigation concluding probable conspiracy based on acoustic evidence", "probability": "95%", "acoustic_shots": 4}	{"schema_type": "CreativeWork/Report", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	House Select Committee Report	\N	\N	[]	\N
43982202-5efe-4661-a258-98d8c0252a13	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "CIA Conspiracy Theory", "motives": ["Bay of Pigs", "Cuba policy", "Vietnam"], "suspects": ["E. Howard Hunt", "David Morales"], "operation": "Operation 40", "description": "Theory that CIA orchestrated assassination due to Bay of Pigs and Cuba policy", "foundingDate": "1947-09-18"}	{"schema_type": "GovernmentOrganization", "veracity_score": 0.15}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	CIA Conspiracy Theory	\N	\N	[]	\N
a71a5df2-9d5f-4391-8c09-599ebd0bd34f	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "shots": 3, "title": "Lone Gunman Theory", "location": "TSBD 6th floor", "proponents": ["Warren Commission", "Gerald Posner", "Vincent Bugliosi"], "description": "Official Warren Commission conclusion that Oswald acted alone"}	{"schema_type": "Theory", "veracity_score": 0.75}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Lone Gunman Theory	\N	\N	[]	\N
3557a30f-7982-4edc-b74c-c1d5355c69c3	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"name": "Lee Harvey Oswald", "type": "intelligence_file", "agent": "James Hosty", "title": "FBI Oswald File", "opened": "1959", "reason": "Soviet defection", "birthDate": "1939-10-18", "deathDate": "1963-11-24", "description": "FBI surveillance and investigation files on Lee Harvey Oswald pre-assassination", "foundingDate": "1908-07-26", "visits_to_home": 2}	{"schema_type": "Person", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Lee Harvey Oswald	\N	\N	[]	\N
64438350-5142-4037-b48e-9a8e2981ab43	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "theory", "title": "Organized Crime Theory", "motives": ["RFK prosecution", "Cuba casinos", "Teamsters"], "suspects": ["Carlos Marcello", "Santo Trafficante", "Sam Giancana"], "description": "Theory that Mafia killed JFK over RFK prosecution and Cuba casinos"}	{"schema_type": "Theory", "veracity_score": 0.25}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Organized Crime Theory	\N	\N	[]	\N
111cd7ae-e3cd-489d-8ee6-02b55f844fc1	5e24155d-15fc-4cd6-96a1-89e999996393	34c368b5-af0f-446f-839a-56a10ffd7692	{"date": "1963-11-22", "type": "medical_testimony", "title": "Parkland Hospital Reports", "doctors": ["Malcolm Perry", "Charles Carrico", "Robert McClelland"], "description": "Initial medical reports from emergency room doctors", "wound_description": "anterior neck wound", "initial_assessment": "entrance wound"}	{"schema_type": "Hospital", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Parkland Hospital Reports	\N	\N	[]	\N
9e671fe6-fba3-4aa7-98ce-bfa70709004d	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"date": "1963-11-22", "type": "physical_evidence", "found": "TSBD 6th floor", "owner": "A. Hidell (Oswald alias)", "title": "Mannlicher-Carcano Rifle", "caliber": "6.5mm", "description": "6.5mm Italian rifle found on 6th floor of Texas School Book Depository", "manufacturer": "Mannlicher-Carcano", "serial_number": "C2766"}	{"schema_type": "Evidence", "veracity_score": 1.0}	\N	0	\N	\N	t	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Mannlicher-Carcano Rifle	\N	\N	[]	\N
0187ed56-23f2-41c8-a1bd-7197d9f3f213	5e24155d-15fc-4cd6-96a1-89e999996393	39bb2851-a7c9-4678-9185-b574433570ea	{"type": "ballistic_theory", "title": "Single Bullet Theory", "wounds": 7, "exhibit": "CE 399", "proponent": "Arlen Specter", "trajectory": "downward 17 degrees", "description": "Theory that one bullet caused 7 wounds in Kennedy and Connally"}	{"schema_type": "Evidence", "veracity_score": 0.65}	\N	0	\N	\N	f	\N	2025-11-05 22:46:36.399954+00	2025-11-05 22:46:36.399954+00	Single Bullet Theory	\N	\N	[]	\N
59ce9efa-e932-47f4-982f-baf801a8792e	00000000-0000-0000-0000-000000000001	0ed7e79e-14dc-417f-8f8e-e1071eceb940	{"birth": "1867-11-07", "death": "1934-07-04", "fullName": "Marie Curie", "occupation": "Physicist and Chemist", "nationality": "Polish/French"}	{"schema_type": "CreativeWork", "verified_by": "historical records", "nobel_prizes": ["1903 Physics", "1911 Chemistry"]}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.97313+00	2025-10-10 19:54:55.97313+00	Untitled Person	\N	\N	[]	\N
76f02a95-9e52-48eb-b059-f6b30ac35b21	00000000-0000-0000-0000-000000000001	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1969-07-20", "title": "Moon Landing - Apollo 11", "location": "Moon - Sea of Tranquility", "description": "First human landing on the Moon"}	{"astronauts": ["Neil Armstrong", "Buzz Aldrin", "Michael Collins"], "schema_type": "CreativeWork", "verified_by": "NASA records"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.973848+00	2025-10-10 19:54:55.973848+00	Moon Landing - Apollo 11	\N	\N	[]	\N
0455fdfd-affe-4c2d-ab06-6a6da62b6748	00000000-0000-0000-0000-000000000001	7b66a718-343f-4d9e-95c0-2e7e3ce7a6b0	{"date": "1859-11-24", "title": "Publication of On the Origin of Species", "location": "London, England", "description": "Charles Darwin published his theory of evolution"}	{"publisher": "John Murray", "schema_type": "CreativeWork", "verified_by": "historical records"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.973848+00	2025-10-10 19:54:55.973848+00	Publication of On the Origin of Species	\N	\N	[]	\N
1220bfa2-56e0-4d78-8382-0bed1b826fe0	00000000-0000-0000-0000-000000000001	452fde61-103e-4dfa-a90b-ed263038def3	{"name": "Mount Everest", "type": "Mountain", "country": "Nepal/China", "elevation": "8,848.86 meters", "coordinates": "27.9881°N, 86.9250°E"}	{"schema_type": "CreativeWork", "verified_by": "Surveyor General of India", "official_height": "2020 measurement"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.97452+00	2025-10-10 19:54:55.97452+00	Mount Everest	\N	\N	[]	\N
f9c7ab8b-aee8-4305-9091-02d1c48e2372	00000000-0000-0000-0000-000000000001	054fec53-1717-456e-b0dd-9f0ebc42f3dc	{"name": "Theory of Relativity", "domain": "Physics", "definition": "Physical theory describing gravity and spacetime", "proposedBy": "Albert Einstein"}	{"type": "General Relativity", "year": "1915", "schema_type": "CreativeWork", "verified_by": "experimental confirmation"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.974959+00	2025-10-10 19:54:55.974959+00	Theory of Relativity	\N	\N	[]	\N
5a390a8a-ff1b-4f0a-bc23-cd476c39b339	00000000-0000-0000-0000-000000000001	054fec53-1717-456e-b0dd-9f0ebc42f3dc	{"name": "DNA Structure", "domain": "Biology", "definition": "Double helix structure of deoxyribonucleic acid", "discoveredBy": "Watson and Crick"}	{"year": "1953", "schema_type": "CreativeWork", "verified_by": "X-ray crystallography"}	\N	1	\N	\N	t	00000000-0000-0000-0000-000000000000	2025-10-10 19:54:55.974959+00	2025-10-10 19:54:55.974959+00	DNA Structure	\N	\N	[]	\N
33090bc4-2bb4-4065-829f-b6c3b2fdfa14	11111111-1111-1111-1111-111111111111	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 75, "y": 165, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:24:34.066392+00	2025-10-10 23:24:34.066392+00	Untitled Fact	\N	\N	[]	\N
2878bd8e-761a-4d25-92d3-aa1419dbefc8	11111111-1111-1111-1111-111111111111	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 30, "y": 180, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:24:42.592614+00	2025-10-10 23:24:42.592614+00	Untitled Fact	\N	\N	[]	\N
b38a726f-c13e-4529-9b31-0e3acaff28b2	2ec23ba6-641e-4894-911b-ae3bb2ec7c86	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 165, "y": 120, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:24:47.574902+00	2025-10-10 23:24:47.574902+00	Untitled Fact	\N	\N	[]	\N
5af2dcf1-1265-49a6-9a01-1150efc7f45d	73110234-579f-40d6-84db-78911927410f	39bb2851-a7c9-4678-9185-b574433570ea	{"x": 195, "y": 285, "label": "New Node"}	{"schema_type": "CreativeWork"}	\N	0	\N	\N	f	\N	2025-10-10 23:25:07.298281+00	2025-10-10 23:25:07.298281+00	Untitled Fact	\N	\N	[]	\N
\.


--
-- Data for Name: Notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notifications" (id, user_id, type, title, message, read, entity_type, entity_id, related_user_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: SourceCredibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SourceCredibility" (source_id, credibility_score, evidence_accuracy_score, peer_validation_score, historical_reliability_score, total_evidence_count, verified_evidence_count, challenged_evidence_count, challenge_ratio, consensus_alignment_score, last_calculated_at, calculation_metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: Sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Sources" (id, source_type, title, authors, url, doi, isbn, publication_date, publisher, abstract, content_hash, is_verified, verified_by, verified_at, metadata, submitted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: SpamReports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SpamReports" (id, challenge_id, reporter_id, report_type, description, is_reviewed, reviewed_by, reviewed_at, action_taken, created_at) FROM stdin;
\.


--
-- Data for Name: SystemConfiguration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemConfiguration" (id, key, value, category, description, data_type, is_secret, is_system, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: TranscriptSegments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TranscriptSegments" (id, transcription_id, segment_order, start_time, end_time, text, speaker_id, speaker_label, confidence, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: UserMethodologyProgress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserMethodologyProgress" (id, user_id, methodology_id, graph_id, current_step_id, completed_steps, progress_data, started_at, last_activity_at, completed_at) FROM stdin;
\.


--
-- Data for Name: UserReputation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserReputation" (user_id, reputation_score, reputation_tier, challenges_submitted, challenges_accepted, challenges_rejected, challenges_pending, votes_cast, votes_agreed_with_outcome, resolutions_performed, resolutions_overturned, accuracy_rate, participation_rate, is_banned, ban_reason, banned_until, warning_count, last_warning_at, challenges_today, last_challenge_at, daily_limit, badges, achievements, created_at, updated_at, last_active_at) FROM stdin;
00000000-0000-0000-0000-000000000000	1000000	authority	0	0	0	0	0	0	0	0	0	0	f	\N	\N	0	\N	0	\N	5	[]	[]	2025-10-09 17:05:13.316456+00	2025-10-09 17:05:13.316456+00	2025-10-09 17:05:13.316456+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, username, email, password_hash, created_at) FROM stdin;
00000000-0000-0000-0000-000000000000	system	system@rabbithole.app	NO_LOGIN	2025-10-09 17:05:13.316162+00
e8594f6e-3c60-4062-9862-0e8af249aea1	kurkafund@gmail.com	kurkafund@gmail.com	$2b$12$TKBcWDBf7iXSUzTsAGA0vuwseesac6iKq6QOUX5X/MMxr6xCzmIVu	2025-10-10 16:20:14.372091+00
c4d9b174-f299-4870-8c10-c890dca30019	testuser	test@example.com	$2b$12$lobFBrPkA7ovc4n0Fgjt4OHY3ODVvaRZQQES94Jkg6sP.NA.N0Yc.	2025-10-10 17:16:11.27125+00
9557b634-b9b3-4426-bcb0-9d5807b6280f	newuser	newuser@example.com	$2b$12$odjgOJuhOCpCLTrsfwZ9cu65ly6vYSTd0FsBWREHZcSSScMyo2nFC	2025-11-05 20:57:20.033492+00
3e6d4231-422e-477f-9759-2f4ac2512f46	activitytester	activity@test.com	hash	2025-11-13 22:26:59.537704+00
e53e92d1-d39f-402f-9c70-a4b3c103ed5f	activitytest_106	activity957@test.com	hash	2025-11-13 22:27:54.710406+00
b1a60c0c-7596-4b3d-a69d-0ff802d5a337	activitytest_217	activity953@test.com	hash	2025-11-13 22:28:16.529045+00
84d1f036-63ae-4f38-b9f2-646bcc52d66c	testuser-1763597976967	test-1763597976967@example.com	$2b$12$EXF2lLzN0KbHiJij.sKz8.KMDuLypBsu2E1MTceSyoodWmd5tBl3q	2025-11-20 00:19:37.954267+00
9eb06e9e-8015-4482-ac8f-cb2274801201	testuser-1763598058660	test-1763598058660@example.com	$2b$12$LqOo6dUaGFgmQ2Fth55dOOfwh2Uiwr6Dv8agxI1HX62vuOvcN7uB2	2025-11-20 00:20:59.12877+00
46187206-c5a9-4e28-957b-ad74e30978e3	testuser-1763598066390	test-1763598066390@example.com	$2b$12$b0hLoArU/M6mygjlde80iu/OJPTvHYm61rBOWOavlLtMlXGsEzYx2	2025-11-20 00:21:06.84181+00
cf0c53f2-d0fb-495a-86d4-ea9d6f724065	testuser-1763598074047	test-1763598074047@example.com	$2b$12$EyZ5VvitSsi8FsyfFGiDz.EEi93yFZqEDgovzwvIwbXIK7nOwtlE2	2025-11-20 00:21:14.521501+00
413988ad-99b7-470e-be58-a7dd4a12b264	testuser-1763598106535	test-1763598106535@example.com	$2b$12$BArqWBHwYIWmyo5EOiWuwO8y6Uon7H7DOjE.GLLRTfXqwtos49G96	2025-11-20 00:21:47.082275+00
97270ba7-11cc-49eb-93cc-f348cab54c7a	testuser-1763598114366	test-1763598114366@example.com	$2b$12$1NP6MMHOs65LTvy2QlN0f.usCERuNmXVM4zGIavWa6SPYbRZtLw4O	2025-11-20 00:21:54.845478+00
833e9efa-5d37-4a53-bfba-4bf6ea88bb53	testuser-1763598122049	test-1763598122049@example.com	$2b$12$c23.5/h0OP7dKsedeaJWruq9tMIU/R1PCMhfmkVvD8wSsDENscrR6	2025-11-20 00:22:02.527952+00
416ce594-afc1-4987-b67a-b6fcaa5c9767	testuser-1763598154617	test-1763598154617@example.com	$2b$12$ejJp3npHarBV6J9DTsCUKe2jWgBLKk99Vval3/w1Q.36JQJH45zh2	2025-11-20 00:22:35.099415+00
b7204ceb-d5fc-479a-8c28-caca31432c33	testuser-1763598162879	test-1763598162879@example.com	$2b$12$ebJkSkel70fjqBS2.vfLH.nhuFs1vuKICJgwcUBxx7s9XTAyvR3Ry	2025-11-20 00:22:43.362513+00
817be44d-a106-4714-a634-d55d28393e6e	testuser-1763598171075	test-1763598171075@example.com	$2b$12$mQA05OSMGrW4mxG7lY62J..e2ryR4Aa7lUZZfiFLmCpuTtInnWNTW	2025-11-20 00:22:51.552924+00
b749fd8d-3c37-4dd6-849d-f63c6e3295dc	testuser-1763598179420	test-1763598179420@example.com	$2b$12$ChJBsdN1SMM.95hE4BSCmOgHvSGp1hvtwYshGVzKJ2Vk3JJDIr2KG	2025-11-20 00:22:59.969176+00
19f3c6f0-a943-420e-9caf-ef4f5e346f47	testuser-1763598187296	test-1763598187296@example.com	$2b$12$0BxsRjPEHe1Sq58poA0AVORyu7FeAEvefR.RNB/UJ3URxoTaeYGKm	2025-11-20 00:23:07.777492+00
a7098aad-428c-47c9-88d3-61a79e076f10	testuser-1763610048048	test-1763610048048@example.com	$2b$12$8qkBfRsoQFetOISpbSNxmuWEMpCu.Y/4MTnPQQGWGzIebQbn2qMgS	2025-11-20 03:40:49.470043+00
ab819deb-70c1-476e-bdd9-903b1d573004	testuser-1763610134863	test-1763610134863@example.com	$2b$12$0qN/mh3hi4kqMCN5YftRWuKRqEugDbRpqEybAiLuMzGBZObttKaMm	2025-11-20 03:42:16.258969+00
545dde07-97a3-461a-97c9-b0704effd676	testuser-1763610144278	test-1763610144278@example.com	$2b$12$TtZ2Vb9BQfiopj4qmEl2Ue0hi.HdtuP1UPmyrQ9VjlY2wTdCUj1sq	2025-11-20 03:42:24.823447+00
986d1288-ee2a-40cc-8d3e-e8d1e7072bb7	testuser-1763610152522	test-1763610152522@example.com	$2b$12$I7RE4bBYFSN3h7nLLW0h9OiACh5HZHuvtnlc6/GaxIXDS6Xwt1hD.	2025-11-20 03:42:33.12633+00
f96094a2-9dcb-437c-810a-bfacda0a6438	testuser-1763610185608	test-1763610185608@example.com	$2b$12$MR9IKSaUvaAPNrJyR/bXo.3bs8qvjhAadTLG2rW.51pYZ5j8dpZ.e	2025-11-20 03:43:06.246102+00
81128983-6b96-45b6-9baf-d8620854d916	testuser-1763610193869	test-1763610193869@example.com	$2b$12$SfOs2JitWQKrOzZqae.WDOfN2FovFYBqi7i0NUoYwOoLqmUL9OepS	2025-11-20 03:43:14.437308+00
8a869657-721d-4b96-87fe-f771d9517799	testuser-1763610202008	test-1763610202008@example.com	$2b$12$PMS8fsHWUlVUJx0xrJxq9uLskSFfAtsBYz4mna29GoZRO3xokNo8i	2025-11-20 03:43:22.553689+00
0876c423-29f1-4eb2-b267-1275ddfec02a	testuser-1763610234961	test-1763610234961@example.com	$2b$12$WRTgvG/MxJ8h5Kijq5xyIO7LTQfTwGFxxONoXliCy7dPd99lnCyUS	2025-11-20 03:43:55.561309+00
cae13ed8-2164-4b4b-84d7-7d35b13a2916	testuser-1763610243646	test-1763610243646@example.com	$2b$12$bBV1KytoXj0mKKDujblmu.v6avhvB5PibTlET3DB.R/VwTVR5Xgmq	2025-11-20 03:44:04.201423+00
d60c16f8-3a58-49be-8fa7-9586360834c6	testuser-1763610252239	test-1763610252239@example.com	$2b$12$p4GPTr7VduV8UE56Pll3rOB6B6zVqSxWmFFcScUddV0CLg32OJ51m	2025-11-20 03:44:12.78605+00
8748bb51-a737-4c06-878a-2f7d108756c5	testuser-1763610260983	test-1763610260983@example.com	$2b$12$YZ/zXBG56cJ52cajFPumnedvYGtBk5iIMeseHA7Dh2Sp3VLuqfBDO	2025-11-20 03:44:21.549657+00
a496ad1f-67d6-4670-99c9-da13a102150f	testuser-1763610269085	test-1763610269085@example.com	$2b$12$uhpB2nQYVWg5h.aBELNyZu1z6hsn6.Lqm6LbiaON/1j8pYzKHZYIG	2025-11-20 03:44:29.633961+00
022483ca-5515-41ca-a3e3-ffff86957f76	testuser-1763610302173	test-1763610302173@example.com	$2b$12$r6YI4cPYFFNDVK/Bl7Ej9O0SeMJQPd.7ZS9KYtSi6uvrjcyVi3LWe	2025-11-20 03:45:02.752701+00
5a67b198-0c04-41f0-a228-df0223bf5c4a	testuser-1763610310322	test-1763610310322@example.com	$2b$12$f0gCnzs1SjVsN.jEWn7h8.MEU2t78tdTdh28HaNcQOIM1x/ux46cO	2025-11-20 03:45:10.886914+00
be1e92be-5515-4d9b-b41a-ab8610bc35c4	testuser-1763610318488	test-1763610318488@example.com	$2b$12$heQYPhkwUzkKcUcWJkyHk.z29mtQNlc./J5rfigF7yIx676YE7HVy	2025-11-20 03:45:19.064776+00
1d4fa29d-9cf8-4914-8ed4-098d10390c27	testuser-1763610351582	test-1763610351582@example.com	$2b$12$Rqk5s76sCHqyHj23SoSK9OMV2YPmOr3lUDkYqE0PNA1EMQxzyUr0q	2025-11-20 03:45:52.207868+00
c1045a03-92c2-43ef-abf6-e523361e5b15	testuser-1763610361031	test-1763610361031@example.com	$2b$12$dw/GK41oMidQ0rsTqXVS5.X5IhFKufVcb7yq9t6PLEwMyLdk5oPMW	2025-11-20 03:46:01.580814+00
ba04b80a-da7e-46c7-9e7a-4751450378dc	testuser-1763610369707	test-1763610369707@example.com	$2b$12$l.MJs6cYi4pPYCzGl6FoDOvqUW8JDN5g7kIoTv7cYHN.4qnOLHniW	2025-11-20 03:46:10.263718+00
5bff3ee9-5ea2-4522-8d20-abb9d2a701ce	testuser-1763610380511	test-1763610380511@example.com	$2b$12$Tk.UaIQ7gUFA9SN128BCF.WKDfLLa2C62X5qJcL/rznWuHExpe4CG	2025-11-20 03:46:21.123462+00
91225bdb-aeff-412f-a2fa-d9fa4c9da0e8	testuser-1763610413591	test-1763610413591@example.com	$2b$12$ydExkOucavkbrBnh7xvcU.5Y2JWakUoWmkcSksvMikvzheuDHRXF2	2025-11-20 03:46:54.159715+00
2ecc284c-7d68-4ae0-b402-bc197a7747a3	testuser-1763610446630	test-1763610446630@example.com	$2b$12$hB1/QEgBQV02TFur3GRD7ucj/cFzoVfF40U1h0l9UWOtYEWj4oMXO	2025-11-20 03:47:27.211827+00
78368f4c-30b2-4b5c-9196-2659ee65f21f	testuser-1763610484367	test-1763610484367@example.com	$2b$12$htUpL3o7Uy3Rd7FA7nnRUu2WTUah9rt7IyJDW8VFeNyWhHCXRUK0i	2025-11-20 03:48:05.023578+00
f6f2d931-7f91-4067-b034-457591936f85	testuser-1763610493169	test-1763610493169@example.com	$2b$12$8vAas8rlHjQr5L9AhTSbzeJ/cKlWUxHYiZqGyPiQuql1pnHZtsGhq	2025-11-20 03:48:13.715607+00
523017fb-1a6c-4e0e-a356-68370a7e5441	testuser-1763610506376	test-1763610506376@example.com	$2b$12$htth.jYPnTcD1/xggObvZ.nb5k6GWiMEltf9FJXrAKvdcIMa40w.y	2025-11-20 03:48:26.924819+00
aaea6d6a-d656-434c-88c4-c0a9b453e90f	testuser-1763610514535	test-1763610514535@example.com	$2b$12$0vVUQB5/jA0p90ma7J9fV.uO5/xgub7di8w7OnuGYWQfzF7pWC566	2025-11-20 03:48:35.074527+00
6591cdad-7e91-4c74-8f7b-3fcf25840cf5	testuser-1763616223020	test-1763616223020@example.com	$2b$12$8/MHi4NbAFiC7yoluFuAv..bdrtMhPAgFNFJMfN0M0NlgWKKJwPqm	2025-11-20 05:23:43.696126+00
e102ee5f-e676-452e-ab79-88495ccaa5f6	testuser-1763616231147	test-1763616231147@example.com	$2b$12$0xPlg/H3Od8nQdMnyhEy8OXW3FLS9KEaPqSfNUoeq3oMNGXzW7t/.	2025-11-20 05:23:51.645215+00
cfd96be6-487b-4cd8-b6c8-9b7af42ee110	testuser-1763616239050	test-1763616239050@example.com	$2b$12$gQZ6gAivrjXBmBJguvuYz.CyuodNPX7/DmPpoYPcbzcyUFyoIBv3u	2025-11-20 05:23:59.537296+00
89a70652-d0e0-4a58-a85a-6126a0b86ff5	testuser-1763616271738	test-1763616271738@example.com	$2b$12$05JPAZJe.LlPbiAfsPj43.Car5kfZWH/Z6ciAKJXuLsLUoDPRFft.	2025-11-20 05:24:32.269072+00
cd4dd67d-91b5-4da6-a787-d6104e3ff630	testuser-1763616279847	test-1763616279847@example.com	$2b$12$bbazAHaMZfPgJiJoV7wByOMFJukWdkQcl7VXuHSycIEmiQUhyM7Um	2025-11-20 05:24:40.411945+00
8d506095-1f45-43c0-8dc9-c1a247c868eb	testuser-1763616288303	test-1763616288303@example.com	$2b$12$IUe9oooOuOG7aFqzyk0nvOO6kMD1clCtSaSgTbv5Q9sBKm5ZlhMaS	2025-11-20 05:24:48.805657+00
7231a38a-e2e6-4b09-8109-2e218c13424a	testuser-1763616320991	test-1763616320991@example.com	$2b$12$wkV1qHQx5szBWhnO0nERduow6JswFP7sSjgDPcDoVAtqVqTnva27i	2025-11-20 05:25:21.511318+00
21799880-1e83-4994-b181-d1c90d9454f2	testuser-1763616329475	test-1763616329475@example.com	$2b$12$ZmJ7tS8nHyENl/8e7EcAbeZn0iDvhlSkAxH9wNk35W0izeKsNITnm	2025-11-20 05:25:29.97903+00
aeca36b2-8b38-4555-9439-8ce2a8626f8e	testuser-1763616338013	test-1763616338013@example.com	$2b$12$yW8FfPsZ82MCZJbjYo3gOeiY4zAc7yGu9YdB9B0mqUUumSPPPdh6K	2025-11-20 05:25:38.497612+00
a89a10b4-42a5-4eb6-a07b-04b4478853a5	testuser-1763616346435	test-1763616346435@example.com	$2b$12$E8S.PcLiiVB6inMAquKjGONZyWiWzNX/J0bH3alRkPKm8YRjYzB0u	2025-11-20 05:25:47.000864+00
88c1db1b-152b-4b24-a18a-49afd6b10616	testuser-1763616354518	test-1763616354518@example.com	$2b$12$3gq5TM93OCL1z/dZM9L9j.mvguejK3oN.snDkNc5IU2lhxq528Rj2	2025-11-20 05:25:55.02551+00
6174346e-d61e-42d1-8a10-d70992766df9	testuser-1763616387183	test-1763616387183@example.com	$2b$12$Kd1cKCJkq1bQjpZ5xQcVdehBOhe5eO8LnE5VTLdldALtY8egKstmC	2025-11-20 05:26:27.780828+00
d5186ce1-8a14-4d37-ba1a-a05b78160e91	testuser-1763616395223	test-1763616395223@example.com	$2b$12$XKkkFBshr0tsuqk87WscReXyuq7EgRixUo1ULYYMWBUFkJhDW6JvK	2025-11-20 05:26:35.710135+00
68513921-174d-434c-8a44-10069f4c56b4	testuser-1763616403229	test-1763616403229@example.com	$2b$12$gUyXCJpd8LPJ5iejMNXFmuqsYs4OVWpig49hx34ghvmyQmXKMZGtO	2025-11-20 05:26:43.732832+00
baa83fbb-910d-4a67-b3c3-160965a25d7a	testuser-1763616436109	test-1763616436109@example.com	$2b$12$ZFHKzqj5UQh45FWTWRUOseW5446Bi9oG6BDZNDynyGGfjfZRcuXP.	2025-11-20 05:27:16.675158+00
8c6bc2fd-1c32-417c-ae41-fabe72508e31	testuser-1763616445392	test-1763616445392@example.com	$2b$12$.4tIY5MXh4Dy0QUd4uTHFOqQZf1oze2oetthSXxfKf9BddN55CodC	2025-11-20 05:27:25.919624+00
73a96e47-6636-4975-8f83-a5ae56def57e	testuser-1763616453857	test-1763616453857@example.com	$2b$12$dO6j8fim5EkNB3EUzSnZdut1I/CG3wIIOlCLKLeETeqza5r/JVMUO	2025-11-20 05:27:34.381323+00
fc7a5de2-9996-46d6-9284-850165397549	testuser-1763616464074	test-1763616464074@example.com	$2b$12$YWQrDA05PAr9RmS2CQzkDOE1i5WlOjmFsKZbq56FYSbWj99JXhacS	2025-11-20 05:27:44.576969+00
931386cd-5142-4b75-8937-f4a02c3124bf	testuser-1763616497036	test-1763616497036@example.com	$2b$12$bVXZWxIv5I3z5TVEd7UZSexyzIjKPlC1GaUCJglx1K2dFzxPE6xbe	2025-11-20 05:28:17.640417+00
2ebc2c88-62ce-438d-a006-057fcd34a2b0	testuser-1763616529912	test-1763616529912@example.com	$2b$12$CEd1S1YRImoWDnsF480uS.dLn6dM3ABJD7HQRFGBgDytU5HFsnIPC	2025-11-20 05:28:50.417587+00
ef851416-e56a-4670-ada7-3846ab6be574	testuser-1763616567442	test-1763616567442@example.com	$2b$12$cipHL8.WoU.Es.v4E9Bb3e55fLsvHsoX2gnfO70SaTYFCudCJuVm2	2025-11-20 05:29:28.0155+00
71a0bc7f-5296-47d2-8028-9126eb480f54	testuser-1763616575955	test-1763616575955@example.com	$2b$12$W22y4E7kZNqFU9ShgKBwWeeXZDlbrbkl5DiBlAJaZXwLxirLbcdJO	2025-11-20 05:29:36.498773+00
82b500e1-04bc-4271-8125-96d430cfeb3d	testuser-1763616588294	test-1763616588294@example.com	$2b$12$OGFQ4/6aS1nc8d.EXW4S4OncGIiDT3Qlkbc0UE9ELX0LnTMswOm8y	2025-11-20 05:29:48.822196+00
55d1067b-a9f4-4169-8016-e64fd523b80c	testuser-1763616596320	test-1763616596320@example.com	$2b$12$Bt3vr/kTJd0sT.u7hLm23.gLZ4QPGSDEjT8TXhDJemiBnAL1DUe8O	2025-11-20 05:29:56.878047+00
ef69de22-c08f-43fa-b3c6-73c8e2d89ce5	testuser-1763616608247	test-1763616608247@example.com	$2b$12$.4geE51esz5domMEbl.SMeZ8fXCfHlGPPnclS8qOEoMyABR6AGnha	2025-11-20 05:30:10.255038+00
ff211208-44bb-4eb4-b7b0-d612b986e764	testuser-1763616691039	test-1763616691039@example.com	$2b$12$uZtQyjKGovEOyIK4HQVS6uQ8WZlkk1j.rOe80Ed358tNRVqodvSRW	2025-11-20 05:31:31.639544+00
ce0098e8-0ad5-4374-b82f-c2c3ab38c837	testuser-1763616699243	test-1763616699243@example.com	$2b$12$Qls0JNdk5HRwsbI4q.PhieFIVz9YCC87BUnmSPXWwrfDWNcumIiRy	2025-11-20 05:31:39.752832+00
71d20080-a268-40ea-acb3-6a0537d321ad	testuser-1763616707335	test-1763616707335@example.com	$2b$12$oAskiaJAb98/cdT/aO.Qf.mCATt4mG1rPfTqDq6GX23nDkuYnsgoe	2025-11-20 05:31:47.877034+00
23801ee7-8556-4991-a009-4ad2ba9e7a8b	testuser-1763616739993	test-1763616739993@example.com	$2b$12$JWYNARCCbJigQn0OKNkYhucXUTz5gauSm5NEYi7YFneg7vMAUbfGG	2025-11-20 05:32:20.473055+00
645d60e1-d5d4-4ecc-bb4e-2730669a7e50	testuser-1763616747718	test-1763616747718@example.com	$2b$12$VwYYXEZk36KUfLKucuDukOoszWbsjH3Bx6GLxTSWEfocGpbtwERC2	2025-11-20 05:32:28.188781+00
284c5958-0bd7-45e0-b8c6-9e572e242130	testuser-1763616755484	test-1763616755484@example.com	$2b$12$/hv6aLER56mE3MPtUzujCeAxP7eQq8dNNz0dQqJDgGdugmYS09xBm	2025-11-20 05:32:35.959029+00
e303388d-5abf-40f2-9bdd-9c9af5ec794c	testuser-1763616788044	test-1763616788044@example.com	$2b$12$Xx4.ttJoW0mMj29YNOhJEucrb9taw2yOqjoe09moSVrZixvqcVLW2	2025-11-20 05:33:08.514991+00
31131c4a-2779-4536-9fcd-72f6e08aaaed	testuser-1763616796271	test-1763616796271@example.com	$2b$12$qTQTpMemyqFwTEvIicrvEu0WnB.qGGqLN7X1UHoEti0K5wtqG8BJG	2025-11-20 05:33:16.764709+00
da23b136-ce65-4d76-b33a-6c64944ca4ee	testuser-1763616804555	test-1763616804555@example.com	$2b$12$qKZ/sCNdmMB4vBWjZcugseGeB5tEPdHKwHok8ET9iqElvvY9PtzLW	2025-11-20 05:33:25.023974+00
16c6b5b4-1731-47db-8faa-325d8d70f7ac	testuser-1763616812755	test-1763616812755@example.com	$2b$12$fDU5ud0NgLlL15XQsvYSIeooXJ8qLQr9OtO7EtxUp3hLx4W9KPm5u	2025-11-20 05:33:33.239941+00
2d94c7df-3c23-4e45-b87b-645a6698d94a	testuser-1763616820446	test-1763616820446@example.com	$2b$12$ZERcVwYT.X5eGKpfOHKi7eoxijhIzW3iMzQMwi.yu2j3zHAponVDC	2025-11-20 05:33:40.91868+00
7bb0f2a8-b6a2-4d24-856a-15996f1a8fb7	testuser-1763616853026	test-1763616853026@example.com	$2b$12$vkh.obGCICrgs3c41ixOLe7GrfBRLim908KXxlOO87WutjkMYaK5O	2025-11-20 05:34:13.498672+00
38d7c298-988c-49b2-a983-4242a51fa587	testuser-1763616860776	test-1763616860776@example.com	$2b$12$hBIf1XKfp8.7ba5r8rNXce42NW2WTjBp39QEKEMlTBxgvvdy8.bpC	2025-11-20 05:34:21.237251+00
9669b0fd-7511-49d2-806c-cf7cd32ad735	testuser-1763616868496	test-1763616868496@example.com	$2b$12$Fp68NjITjuNuRpvOWiM6xONW.YK6BoQePFuMFb3ff7E9RaDVK6LQS	2025-11-20 05:34:28.988631+00
18c6a9bf-c7e6-44d1-957c-24226b1e993f	testuser-1763616900989	test-1763616900989@example.com	$2b$12$LVy8a74PNlEVAxrOZL4BKOYP9z7nTf5CGMbdTS0IagBn46k/wydem	2025-11-20 05:35:01.477685+00
2136a66a-3887-4653-9bbc-f044ea74072b	testuser-1763616909761	test-1763616909761@example.com	$2b$12$ZriKL5MbYSVgoTw5PgEd2eVGexwi3RFRXF8MFzgwhpxpdUGd0foWO	2025-11-20 05:35:10.229883+00
708e8079-3032-4fbc-bb4f-51919fe6eacb	testuser-1763616917935	test-1763616917935@example.com	$2b$12$WSR3qi6KWKdx5zGSGGPDqe5nGZU8RoEko0R2TpUxfbbYvC.vOAoVC	2025-11-20 05:35:18.379381+00
a2d68ff0-aaef-455d-aa7d-fbef76bcb9bf	testuser-1763616927733	test-1763616927733@example.com	$2b$12$OAjtvrfqw9ErswAxe4ElPOBea6KuhshdAYlZijtdzkgqKEJAIs6lW	2025-11-20 05:35:28.197413+00
6dbccf98-6162-440f-833d-7ea0d6d3e91e	testuser-1763616960240	test-1763616960240@example.com	$2b$12$z1brU7PgiP1sciStxiZLpe.oAamB74PMdVjvmPAV9taKQbB7IeBhu	2025-11-20 05:36:00.716855+00
0b8e6439-16b0-4b95-9b92-7fa2a421d438	testuser-1763616992870	test-1763616992870@example.com	$2b$12$4DZPmeSwOjHot0qG8/dKXeapvCNtDX0IkSTEKntU9h3hzfKttUUyG	2025-11-20 05:36:33.412731+00
40701650-8c3b-47e1-96db-0574f2b9351f	testuser-1763617029844	test-1763617029844@example.com	$2b$12$jhgw8fnQ2E0dxUdO4HIGIe7cWBB8d6vfIK19G9A.PYGtrIsFgjSyO	2025-11-20 05:37:10.355801+00
f034dfc3-931f-47b5-b50d-4f42630b74f1	testuser-1763617038162	test-1763617038162@example.com	$2b$12$H/ioUlTue5399IwquDu1MOzWVRg7H3cbZ1NW.jkAVhajGth4Eqpei	2025-11-20 05:37:18.630455+00
3c30236a-dc67-4b6a-8eb1-0c847e4af568	testuser-1763617050225	test-1763617050225@example.com	$2b$12$1MP8uFnQl4/tUcA5cOpYOOD31r/0.avqONfvEd8.4CDMlXdZ9GXQW	2025-11-20 05:37:30.703843+00
5bcd26b8-ddb5-4954-860e-06a8815038bb	testuser-1763617058026	test-1763617058026@example.com	$2b$12$hKLE31my2gbu86ZQSmki9eoNIAAL4PF.zw0fuF9o7NAcFB03Py.Aq	2025-11-20 05:37:38.502197+00
65d17859-c348-431f-baa0-785cb9836bd3	testuser-1763618363204	test-1763618363204@example.com	$2b$12$BkQK1pP6sJ1TDOK1vRyWnuZwrne8gB.I9bavLpMLwUUFsmoqUvnsa	2025-11-20 05:59:23.895659+00
a7cb05c5-430b-49f0-bef5-3f261ea4e5c1	testuser-1763618364712	test-1763618364712@example.com	$2b$12$.EIUZ2EdbkcSJ/GgDQ8QIehh.e7Fo1/wQOQOT0vykBxjzTtxP20Fe	2025-11-20 05:59:25.277131+00
b796b92d-4d34-46a6-8a19-b557664887fc	testuser-1763618393763	test-1763618393763@example.com	$2b$12$9lR6oCsP7tZGGYTjvst2Q.xZNvFEYcjKh9yWXYA3IMIiNze1aLmV6	2025-11-20 05:59:54.304306+00
15ff5d4f-3b58-47a3-b25b-b8ecfc6a5d8a	testuser-1763618416098	test-1763618416098@example.com	$2b$12$mmHu0JtkprHngNx4NHaDZuzp2SEQkvWaBy5IgT.3JBGU0eCHznMui	2025-11-20 06:00:16.685061+00
2b4f8dac-512d-4180-b213-c542f4546d57	testuser-1763618424207	test-1763618424207@example.com	$2b$12$FheHIrzlGjVI9mrZvyQQAOloDycK7sWvbtD5oGrR8REA4RP.UAq3C	2025-11-20 06:00:24.746151+00
d1137ae0-ecb7-458b-9ae9-f2b1e8213eec	testuser-1763618432265	test-1763618432265@example.com	$2b$12$TCkBNa7gbQ/ULH2cHHTKBelZpZgtotbOcjQvfqDNgcGvsKBGRXdJq	2025-11-20 06:00:32.811794+00
a4329bde-f3dc-4a6b-b96b-d7270729dd15	testuser-1763618465236	test-1763618465236@example.com	$2b$12$usUSmH7IGvuYk86fYuR7tOeLhTpM4qDFD577/a/d7Pw/geGUhBVFe	2025-11-20 06:01:05.808953+00
2cd8c741-64de-48fa-9473-7467ce4c74e2	testuser-1763618473261	test-1763618473261@example.com	$2b$12$yov7.5PCJPJLd4WfNTpGAudT6RMJGUMI.oRNGNze1owjMvMI0Fd7e	2025-11-20 06:01:13.795594+00
f426fa4d-178b-43a8-bcfe-8d3040719b90	testuser-1763618481282	test-1763618481282@example.com	$2b$12$RzT65ym6M6xml/5pjMWvouuPU6yZSWxa8CWhD60u08WY8.BY6wTtu	2025-11-20 06:01:21.845203+00
bfcfdeaa-a802-4ff5-bb19-54d9102a4aeb	testuser-1763618514265	test-1763618514265@example.com	$2b$12$I9SZyLiJ5A.ci1i7XGomtu9da10TGM1a.MiBTTd6KAEG67TbJclIm	2025-11-20 06:01:54.839622+00
44f15bd8-2225-47b3-ba32-7396b01b484d	testuser-1763618522940	test-1763618522940@example.com	$2b$12$GnjGK44LEBVZdLQLurfDXO1KWLYcyGZACnU0hxnQRi3D3kySInw9G	2025-11-20 06:02:03.517424+00
6f04d085-d318-4aac-8ddb-01ba46a61b92	testuser-1763618531630	test-1763618531630@example.com	$2b$12$YOGBmoWDVO0HnfJk7Qh3NuO.JBoxKShLIywuLuaY9dtuZ3M5h4ddu	2025-11-20 06:02:12.195183+00
a892d9cf-e59e-4f5d-bd99-893152bb633c	testuser-1763618540255	test-1763618540255@example.com	$2b$12$0nwMfCWRgWrfPf/8ePONPO5Z3c61ZUgnEU8hUEQK/U.ROy8UV4zHq	2025-11-20 06:02:20.792274+00
be2ff9a9-b2f4-4019-b1f2-8e6fbdecf14a	testuser-1763618548315	test-1763618548315@example.com	$2b$12$ABQXrTQsj/E0hugb0HUGieeCpuVDb8Kj7x0PClt4D3W4tT1CAI9vC	2025-11-20 06:02:28.879964+00
8ca187ae-4623-4928-8a69-b1f5c95b1afc	testuser-1763618581353	test-1763618581353@example.com	$2b$12$1T/KPzHw47NyFv0KRlFqgeQdkSM6ONqRPsGclEOJI0rP./XD900xC	2025-11-20 06:03:01.923907+00
e9ff88ea-5ed3-46df-a194-443814bb8911	testuser-1763618589416	test-1763618589416@example.com	$2b$12$PYvCfkxX9L5ehLmJItt6uemSbV/VH5zZkqsqs6kuI5ivu0YKXuzKy	2025-11-20 06:03:09.959211+00
db8c8ddf-c88a-4f06-a7a6-7732b2fd1ce6	testuser-1763618597442	test-1763618597442@example.com	$2b$12$hnpz.hh/QmY5AxXBcpdwjeov8dLnHLYIXt6YrBQOxg2Tk06.OeLeK	2025-11-20 06:03:18.039332+00
ec01cd00-2989-4043-b8ee-a480d52fec3c	testuser-1763618631597	test-1763618631597@example.com	$2b$12$YojYyBWHbl2MGWVDnhc.xukTfNxfvOuBKAInXniLBBaFGmsKwS1b.	2025-11-20 06:03:52.187053+00
deae9135-ae00-4db7-93dc-6f5afabab0a7	testuser-1763618641019	test-1763618641019@example.com	$2b$12$MCxir/DGwG3UpQOewapyT.3CFGNwPw.SPF3VUq/gj4ZZIF6vNjxIu	2025-11-20 06:04:01.557541+00
aa192ff0-88d5-4b61-b36f-b7b3a77fb835	testuser-1763618649609	test-1763618649609@example.com	$2b$12$W0QMJdiYVrfDzv2ISum7V.tER3AZcIIp6xSrKqTErV2gqZK68O8Ji	2025-11-20 06:04:10.171472+00
5884b684-32b8-44b8-b234-492a4b0be833	testuser-1763618660082	test-1763618660082@example.com	$2b$12$7K3cjO2J.plBwQVJQvQTke6RB0mU3b8ah7IlbqVyIQGVP7K28teCm	2025-11-20 06:04:20.656729+00
537f23bf-3c4b-401c-b1ab-c3dc56805692	testuser-1763618693018	test-1763618693018@example.com	$2b$12$AJqKUdUEHh4I7oNb.lhgjukMEUZ/hLTEZ8RQdnnPa.KsSoa9xGskm	2025-11-20 06:04:53.666665+00
0f5a3898-ad26-4b61-ba88-704d8e9c5a94	testuser-1763618726114	test-1763618726114@example.com	$2b$12$HuOsFR7OPzGdvOkY6OpNWO.VI1sdHBbkrbd7604bXsu2M.ZQZ3cVK	2025-11-20 06:05:26.662717+00
feafec7c-826f-44d7-b217-aacd54f3ba49	testuser-1763618763638	test-1763618763638@example.com	$2b$12$ogtqJv/tzXYsCNwekc.kduyIQieq/bw5R2bzNITtoJP8bOl1Bm/o.	2025-11-20 06:06:04.194991+00
edc0c041-b53e-4373-bc15-83d3fe9a503e	testuser-1763618772204	test-1763618772204@example.com	$2b$12$M11z2ZW0Z6OxUwF.dIDfhu8ut2lL6JqTfkld.04c5uXVhYjBxc3Rq	2025-11-20 06:06:12.736174+00
b7fcd6b4-6c6c-44cf-a7e1-a74a8780b5e6	testuser-1763618784937	test-1763618784937@example.com	$2b$12$oVAZcAVcpPSrb.oOUckbZO2YUHnZSV4L5drig959raSAbhvV3g.nC	2025-11-20 06:06:25.488439+00
be311618-fbd5-426f-826c-d5e788b4f46c	testuser-1763618792982	test-1763618792982@example.com	$2b$12$Uf8Rwc2pCfKChK2Atmi04.//T1lsrWB46qZ1OIXnx2ol6u1qSEnju	2025-11-20 06:06:33.537703+00
d7ca972c-d46f-477f-b8e0-935b32dcdefc	testuser-1763620077123	test-1763620077123@example.com	$2b$12$OsUEL5pkcGCDLN/iW7w6VeXvhuRDMwHVmuPDYAS40FqOXov48858e	2025-11-20 06:27:58.258361+00
dcedff93-2a59-4e6a-9d82-8449f396b79d	testuser-1763620077017	test-1763620077017@example.com	$2b$12$pnERHwxnzl9bboX9oqOJP.qlMp0Nx.o.WA9aN.CLKqjuZ2QkY.dU6	2025-11-20 06:27:58.272086+00
7f36fdef-78df-452f-aa84-336a27942ea8	testuser-1763620079359	test-1763620079359@example.com	$2b$12$ZrGzI343TMxY2KFpgGgcdONqed2DmRohGMk9DMFIHnQFOMUhvvgzC	2025-11-20 06:28:00.102458+00
c3cb2a04-71a6-44e6-880f-2745ced947a8	testuser-1763620084738	test-1763620084738@example.com	$2b$12$aelJqlfNZydQ8pmC/d51kejLxsHvyxX9uKv77ouPU/P3ncNgCB6pW	2025-11-20 06:28:05.330062+00
2e8320f7-da55-4426-ab7c-6fff0b9e324c	testuser-1763620085549	test-1763620085549@example.com	$2b$12$.qPkEmyCX6tkDNAeh5zq5O2gHdBinYYxvUCRPGBpe7B4u.dFqwTC.	2025-11-20 06:28:06.11014+00
4860e37e-2a19-4b31-b4c3-bc4d2fe3d2d8	testuser-1763620087043	test-1763620087043@example.com	$2b$12$IhkUVDYJYg9DWjHsd.8JaeKgfbowbHyronE8g6Myfuw81cpwhawCe	2025-11-20 06:28:07.600947+00
a57ed400-f45c-4c01-83d1-47caacd60bb2	testuser-1763620092858	test-1763620092858@example.com	$2b$12$bmZXSmFdHB9V9DcYJlsPGO2kH.tkNOr0RXT/DYTEaFz2ZWFBM1TGe	2025-11-20 06:28:13.420566+00
1e36439e-7601-4165-8289-086c848c27f5	testuser-1763620094195	test-1763620094195@example.com	$2b$12$gxiq8nJL67voXvM5BcsQgu69069DuYDzVZH.8Od5NGAL6P8q2I1su	2025-11-20 06:28:14.757521+00
ad7ead5d-c638-443b-83b7-89f0482ba36e	testuser-1763620095673	test-1763620095673@example.com	$2b$12$28Tg2bpcV70iUUP9GRbdtOMWT/f13SCY9Z5nDe7vyWqvjT8/qEKP2	2025-11-20 06:28:16.238488+00
997a5c34-6db2-4ccb-86d6-1bdc6fcef382	testuser-1763620101008	test-1763620101008@example.com	$2b$12$89IRLJvkMkuH0NMJJ/nfleUpq9DgoGhROgGa.AVzCmmdda5BpilFS	2025-11-20 06:28:21.602143+00
f2a26970-f097-4e61-a623-9e8036558624	testuser-1763620102379	test-1763620102379@example.com	$2b$12$hL5oeni8ol43WUHjCfO.YuZCZOLJuxV6gqp2ba5tXFBwdkugeb/G2	2025-11-20 06:28:22.925082+00
81f91c9a-3752-42ec-b8e8-527cd1eb77bd	testuser-1763620106039	test-1763620106039@example.com	$2b$12$B9Cvt8Ftf3JjTK1pf8o5xujZeMVAitfVaBKYK.MaMtvWR.I2bbjBq	2025-11-20 06:28:26.582885+00
b222a8d3-a982-4d8b-8e3c-1598ed074b23	testuser-1763620107408	test-1763620107408@example.com	$2b$12$7kB9LWToCVgLYCrwt.GsMOC4h42LWOS8YTuJJG/EmqR5SyBFqu43S	2025-11-20 06:28:27.976349+00
2778dfb4-44a7-40b2-aa6d-c013c5a76628	testuser-1763620116015	test-1763620116015@example.com	$2b$12$De6ZSlVD2V8QvHlEYgwMwO5n59ZhQqyUqaNQ8uFaqM9SewoTFTO6W	2025-11-20 06:28:36.573974+00
5d243850-ffd7-4459-8fc7-7c9b7f4ae91f	testuser-1763620128828	test-1763620128828@example.com	$2b$12$uI58j/vP0WC1rw1tEhvroOukuOzNYzgl2n7fY5XbCQfY3FDO5SiNe	2025-11-20 06:28:49.436701+00
f140bf53-3be3-42f6-bd30-a24c202229e7	testuser-1763620134135	test-1763620134135@example.com	$2b$12$AWSsav0jGRpHqN7MM9i2OeKxFgm1KKsDelxA4vGU98bH0jCzpqXB.	2025-11-20 06:28:54.688111+00
3c37b47e-1ef7-42f3-b25e-a5feb4cd71d8	testuser-1763620135477	test-1763620135477@example.com	$2b$12$Pv3.ec6oZ26NdOHfq8bMmegH3f5g53Nu7DXCi4zxVUWkpFMiV0It.	2025-11-20 06:28:56.025696+00
70f3933d-433a-43d4-9b7a-9e819f4e8b1c	testuser-1763620137150	test-1763620137150@example.com	$2b$12$pYjq9EqJNCwNAekwVcMhXeN4G1oOCxLfS7oLXG0cqBMQYTxhnPQCO	2025-11-20 06:28:57.68593+00
4672e4b2-8709-4625-93b2-90c45188d8d2	testuser-1763620138986	test-1763620138986@example.com	$2b$12$S/WP7p9KJoZsaA6vJjV1beupdg.b.Iu8gOlGhEeJYcbFJQh97qwzy	2025-11-20 06:28:59.518828+00
86f68b29-a3a8-4469-b406-eca20cecd768	testuser-1763620142292	test-1763620142292@example.com	$2b$12$GqctSXzSbD3kg3GMSJvuQeyuUbTndmhZC4JEbTYwyRv8f4G6tF1Ke	2025-11-20 06:29:02.839349+00
4d530983-f168-4f03-8091-569c1d896ffa	testuser-1763620143626	test-1763620143626@example.com	$2b$12$nbrKwpP1qrRGHpJrAWO3KeY3Gavtz..DrSqZSUQwAtvd//roZlu0i	2025-11-20 06:29:04.195846+00
a6e5c066-8e12-4c96-bfca-e58d36dacb1b	testuser-1763620150346	test-1763620150346@example.com	$2b$12$fqxcmNUBqYMZXQ61xkmTQuxT.KZczyG/m27K5KVzJDv4jMDeAcJxe	2025-11-20 06:29:10.890544+00
342028c7-31c8-4c09-b75a-773d06b26c93	testuser-1763620151684	test-1763620151684@example.com	$2b$12$/CEbZ7mAJIfI8PIvK5xvp.YyiE7gFU2QDYNGFjJM.WpdHCqzYRqtu	2025-11-20 06:29:12.272522+00
e859e8f9-665a-4529-abcf-bd9ed7911829	testuser-1763620171955	test-1763620171955@example.com	$2b$12$mXDvxqDfZ6LrdidJ9p6cluXb3cNJhrmV0rwNWWR.uWnKISr5uIMIi	2025-11-20 06:29:32.51873+00
2f9f712b-32f7-4773-9ec5-72b4eaefb929	testuser-1763620183311	test-1763620183311@example.com	$2b$12$MgWxEOciB9xCLkHv/dc7dOyALsCOWzmaAQX2C/0If1lCZX8UPBjT2	2025-11-20 06:29:43.885832+00
94dcb3aa-7257-47fa-9510-aef326e03f52	testuser-1763620184707	test-1763620184707@example.com	$2b$12$rMgJXCdo/EMxjMvJFqMnAet4bsV6961iVE72a9ENKuKMYmClaTxBW	2025-11-20 06:29:45.270002+00
c1310ac0-7bb3-49ea-8e55-c74c19a63125	testuser-1763620191959	test-1763620191959@example.com	$2b$12$jJggKDecWFQdvzKlnF.WFu9gqkgzqO5z75uEjGOVH/5HaO.NFd.qe	2025-11-20 06:29:52.50179+00
0ce4b97c-000c-46bc-9869-04f7d14600b7	testuser-1763622546422	test-1763622546422@example.com	$2b$12$OvwsCffFBWxyr3E1UWC6YeLhb0yOpCnLyNguRHXWdFNOMHyR0NkBa	2025-11-20 07:09:07.151649+00
746dcce4-0ec5-4a5b-aff8-351a453eec56	testuser-1763622546489	test-1763622546489@example.com	$2b$12$RnUeOEVhoywRCPYd1uQ0ze3Xa5JTHz/4ipVxU2sAhzJvjH5YPxomq	2025-11-20 07:09:07.153572+00
aa5a293c-cd27-46ef-9b0b-ebb8d3f29ef9	testuser-1763622683113	test-1763622683113@example.com	$2b$12$jwlK2hlovatm0KPZ.Ud3luEjzaDhS2MzQ3sJB3dQGl6KDOCxWE1fS	2025-11-20 07:11:23.897303+00
7fc079cf-85fd-44be-a988-e43bd578a4e3	testuser-1763622683054	test-1763622683054@example.com	$2b$12$5YdoMejeDF8ymcCwH9dle.eTBWziQ/ZSyO/IVaiNrVni.yGFDlNre	2025-11-20 07:11:23.897599+00
ed48d5f4-869a-43d1-8e04-a34bab61cef7	testuser-1763622685407	test-1763622685407@example.com	$2b$12$QA4INb8x7uas/uFzgmLlPuK/KUk2i0S04VLo.EDoAgEdAwrBi0H.u	2025-11-20 07:11:27.23765+00
f14232de-b7e9-4197-9826-eaf3534f98fe	testuser-1763622883589	test-1763622883589@example.com	$2b$12$az4Qhwi9BKkds5dKFGbh8ezrYssUae95y1On7rPo3Wfd2WxKBSE2u	2025-11-20 07:14:44.351868+00
bb8e5e20-b3ec-408d-a4ba-e2c52636ac57	testuser-1763622883503	test-1763622883503@example.com	$2b$12$PwX4TNRz4vHpFtqlWNflguQvfoQNwUZA09q3O9TXFBYXnlaQ2Vr4a	2025-11-20 07:14:44.353858+00
f1410aae-d1ca-48e4-bc8b-495c0a9520a7	testuser-1763622885808	test-1763622885808@example.com	$2b$12$qOYM8Us2PQtbQsSRmmdLkuluRPFb6sIlq0jBWwNULyRvC/aOU67Ca	2025-11-20 07:14:47.78257+00
0e9f5415-65e4-4413-94fe-f629b6aabbb7	testuser-1763622948848	test-1763622948848@example.com	$2b$12$UcsjJipp9u9UuXThBLg00eLBlupI/Oe4FmHILqhSA0H2DfmrFQ8OK	2025-11-20 07:15:52.631114+00
b9c47159-fff3-4e29-bf6f-a8d4ea4e5e9d	testuser-1763622948913	test-1763622948913@example.com	$2b$12$7dj.mZq.MoviIUtJbGz/guJFnDpMffXyBxhho2KhTV.NAIl6Uh5iq	2025-11-20 07:15:52.695023+00
ed3c2bd6-f130-430d-94e7-b96aa4f8bf07	testuser-1763622958507	test-1763622958507@example.com	$2b$12$zUskz3zz6GFxm8mQcETsXOr19cnDNyQuujJAK6aJu9ounlE0zF7Sq	2025-11-20 07:16:04.680836+00
dd0826be-b85a-4065-9367-17cfb0e3e1a2	testuser-1763622962479	test-1763622962479@example.com	$2b$12$HJaYLxy.LNB4u0AhZWbeUeJZrK1P8rN/Kelb8zEQMufsJXrvZzpm2	2025-11-20 07:16:06.774851+00
7ec48930-48ba-41d2-956a-4282de44d42f	testuser-1763622966866	test-1763622966866@example.com	$2b$12$ls7CV1bU9DClR24qGliEUOx/t2hTnoE3uz.BrnhEjUDqRTnCjEGre	2025-11-20 07:16:08.63833+00
c463dc8a-dcf7-43da-9aaf-f74bb1b5a24f	testuser-1763622967259	test-1763622967259@example.com	$2b$12$0/voapZ1axdevbkgrUXiuOU1G2F5XZXG62B/EfWdgu8Z5LYu85NS6	2025-11-20 07:16:08.780225+00
3fbbfce4-28b9-4bb2-8448-e6a91a53ceba	testuser-1763622969755	test-1763622969755@example.com	$2b$12$/.3DH.prvSrJCRA0pQzkUe8qcwQk87JC18ooUbmrxjBkGgABuY7b2	2025-11-20 07:16:10.891007+00
9cb3a54f-3b1e-46b3-8992-fb3e53fba7a1	testuser-1763622981549	test-1763622981549@example.com	$2b$12$qTfbcRsPTPVuJCJ1HZl/M.IYUCuPkdVqzwSR833jyY1Fr7mkYxz/y	2025-11-20 07:16:22.369881+00
80611143-b7d4-414e-ab4f-22362dc39bfb	testuser-1763622981513	test-1763622981513@example.com	$2b$12$Jli03q7zcttRnpVVgg7hDuwQoODwV.LXiNWRUBj17LmKeuWXmF2P.	2025-11-20 07:16:22.385223+00
e7d88d41-f5ca-43a1-9a0d-97eb6858c56d	testuser-1763622982118	test-1763622982118@example.com	$2b$12$GhR6iXvjLjCl387f3bY08u7b3LsYmA.mXmtA0G6rtf3rtC5C0W0YG	2025-11-20 07:16:22.80297+00
ea482ad8-7717-4d2b-9965-dd6f9422dad3	testuser-1763622993716	test-1763622993716@example.com	$2b$12$KwJ.Mgs4SqO6e7qyR6Dg2e7OV/QAk1Y3co9OWypy5MB3pvIXBRJWO	2025-11-20 07:16:34.691291+00
46e8d200-f432-452f-9a43-2b9a4ec98af4	testuser-1763622993768	test-1763622993768@example.com	$2b$12$DoS7mKYfFVH3T4c/.5DA3efFupplxhI9E8I6iU3Iz1CdCffpC0wC6	2025-11-20 07:16:34.739976+00
80049d5a-f9d8-4903-a5fc-98f13538a5c2	testuser-1763622994244	test-1763622994244@example.com	$2b$12$Sgzaj5FJ9ZgwToAGkzgQv..Z85c9g4WfeaF2gC0B2g8fttf2mm4Uy	2025-11-20 07:16:34.951184+00
37e34efe-ea88-4e16-af65-9d3ab0a1bcff	testuser-1763623026696	test-1763623026696@example.com	$2b$12$ItlEKrh1Br3BPQVfAeE.SOxzMpJkmPEWNKVVwmolqZQ3zbT6e3Lf6	2025-11-20 07:17:07.345494+00
6779b274-708b-4e28-8e86-e0df05fc3494	testuser-1763623026708	test-1763623026708@example.com	$2b$12$ilhpgRp/Yb9do0jxbFc4Ee2d4OApJO1K49zye7VgsmsCrzSit3csC	2025-11-20 07:17:07.368718+00
d9004de9-8f91-4b97-88fb-150d9b5a764b	testuser-1763623026697	test-1763623026697@example.com	$2b$12$LuW5NULR7ySpFqMtFd5i/OVotUoEUFGzS6ir5zYIKWXAt9SFraQla	2025-11-20 07:17:07.376872+00
84e2eaf7-1334-48dd-ad01-a943c63f517d	testuser-1763623026722	test-1763623026722@example.com	$2b$12$oq2MG2KKvTMaexiEqQk9I.B.q5sWdbD7ux5dF7V34VBz4plUeAdlK	2025-11-20 07:17:07.408062+00
bfb944f9-d62f-4d4d-8df4-3e274cad25b1	testuser-1763623039359	test-1763623039359@example.com	$2b$12$uVr9zQo0ZOI6hOvm/aFaIOOYLoqggzTFpZ8TFWsH4XEmESp9yRZ96	2025-11-20 07:17:20.164285+00
054d959f-74cf-48ad-9b8a-b3b4acc5df22	testuser-1763623039862	test-1763623039862@example.com	$2b$12$13L6ZTG7ciqDCUt9n6a4HepNdnISxGLOEcx7UrN4UkwAjI7RqVg.u	2025-11-20 07:17:20.601878+00
9932be86-eeff-4fda-b0c7-dc69ada23a91	testuser-1763623040696	test-1763623040696@example.com	$2b$12$4AD4sFCiCW5j0Al3oRMhmOHcX6jGN8tYMXVpxp2n0ynTArM1jfpiO	2025-11-20 07:17:21.834682+00
bf4eb516-6758-424a-9066-7ec2dfa31019	testuser-1763623055066	test-1763623055066@example.com	$2b$12$3awuWKUMi09yqmiiSuC1XedAB7tw9gEa5oYufCoulqax97fNH0Zy.	2025-11-20 07:17:35.710381+00
6eef0f70-9e4f-4901-a643-ef3339d3f2ae	testuser-1763623055062	test-1763623055062@example.com	$2b$12$zLXI0kpIS8Lyu71YbQ/P/e1l.0h69UuhtBXeem5BFIlGYbkMY.5lq	2025-11-20 07:17:35.719583+00
49e67728-57b2-43d6-9c0f-160cf948d900	testuser-1763623063745	test-1763623063745@example.com	$2b$12$jaXQZlSg1eLfkPG0BcOZ8ONsqwnFYZu2WbTUTgGdshYofkaweG4.2	2025-11-20 07:17:45.970326+00
66654236-c30d-4ea4-8d2c-9ab3d6fcabb6	testuser-1763623087817	test-1763623087817@example.com	$2b$12$UvpmLUJftg.8L49nHUC6ne502NcM9sG1RyNEnt9cJ79DpMUNb5Hc2	2025-11-20 07:18:08.525688+00
0375c082-8edd-430c-bb5c-c276a8c1da26	testuser-1763623087828	test-1763623087828@example.com	$2b$12$RYLPITCvarpEia.fOIZGV.qI8VyeDumyRrYFVRZ4WOCnCYRUHNbCi	2025-11-20 07:18:08.534458+00
826e1811-423d-45e4-9508-4f955708a01d	testuser-1763623098886	test-1763623098886@example.com	$2b$12$m3jcTu1PaoC4Mhgops2RRuyurAZuryenxbSh9ljNKaqfBt1zyjmWa	2025-11-20 07:18:19.564092+00
cf70eb4b-c311-4feb-94d5-538a02797b2f	testuser-1763623099028	test-1763623099028@example.com	$2b$12$srYnz.wx8HFbUILQDB1.MeynAB0az6uyxJ2p8xqp.O2yM60XugmNC	2025-11-20 07:18:19.610717+00
74be6118-8995-4f11-9b5a-6c4154766934	testuser-1763655190451	test-1763655190451@example.com	$2b$12$DuXXmivZOJDfcQ.MvocpIugRNzzi2Opzv4m2WK4XsoS/LT7qywSLu	2025-11-20 16:13:11.297121+00
d401681c-8903-4d2e-812e-beb4f4edc441	testuser-1763655190516	test-1763655190516@example.com	$2b$12$tkuflB680Njsxu7BvVUNLOPkb0LyIWL9boWw5rTJfiT6C7w93UJNe	2025-11-20 16:13:11.29854+00
5a6a9b08-8a4c-4efc-8f2f-a5009418d12d	testuser-1763655192511	test-1763655192511@example.com	$2b$12$1V6q08OwknjgtkcylFdaXueUoJHiarPwG0CK6JDtKEgGNKnprNLGS	2025-11-20 16:13:14.067867+00
ff84e195-1ecd-4b49-9a05-416425e235be	alice_chen	alice@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
ffe212a8-7833-4cfb-acbc-9c7a6e72ce7c	bob_martinez	bob@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
d6b70dff-13ed-4c7f-a60d-831dabc9c0c0	carol_thompson	carol@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
f8b6b462-b2ae-49e1-9e90-1d942e7afaa3	david_kim	david@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
d6b941b6-d308-42de-9671-a8a86e6723dc	emma_walsh	emma@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
9873c4cf-bc83-4c43-b0b0-c8e55570dd1b	frank_rodriguez	frank@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
78fa077a-2aba-473c-b220-8ed2a798221e	grace_okafor	grace@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
de8f1504-d549-4548-b3d2-25f36e584d5b	henry_patel	henry@example.com	$2b$10$rBV2KXHAx1Bn89cKWZWLOeY.kK7kJ5FqT7GkqVl1K9pXxT8xVxI6G	2025-11-21 22:49:36.446408+00
\.


--
-- Data for Name: VeracityScoreHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VeracityScoreHistory" (id, veracity_score_id, old_score, new_score, score_delta, change_reason, triggering_entity_type, triggering_entity_id, calculation_snapshot, changed_at, changed_by) FROM stdin;
\.


--
-- Data for Name: VeracityScores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VeracityScores" (id, target_node_id, target_edge_id, veracity_score, confidence_interval_lower, confidence_interval_upper, evidence_weight_sum, evidence_count, supporting_evidence_weight, refuting_evidence_weight, consensus_score, source_count, source_agreement_ratio, challenge_count, open_challenge_count, challenge_impact, temporal_decay_factor, calculation_method, calculation_metadata, calculated_at, expires_at, calculated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: VideoFrames; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoFrames" (id, file_id, frame_number, timestamp_seconds, frame_type, storage_key, storage_provider, storage_bucket, ocr_text, ocr_confidence, ocr_language, content_vector, width, height, file_size, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: VideoMetadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoMetadata" (id, file_id, duration_seconds, width, height, fps, codec, bitrate, file_format, total_frames, extracted_frames, scene_count, ocr_text_length, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: VideoScenes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoScenes" (id, file_id, scene_number, start_time, end_time, thumbnail_frame_id, description, tags, frame_count, content_vector, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at, description, checksum, execution_time_ms) FROM stdin;
001	2025-10-09 17:05:12.67566+00	Initial schema - base tables	\N	0
002	2025-10-09 17:05:12.853377+00	Level 0/1 system verification	\N	0
003	2025-10-09 17:05:13.06963+00	Veracity scoring system	\N	1000
004	2025-10-09 17:05:13.39507+00	Challenge system	\N	0
005	2025-10-09 17:05:13.579505+00	Evidence management system	\N	0
\.


--
-- Name: ActivityPosts ActivityPosts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityPosts"
    ADD CONSTRAINT "ActivityPosts_pkey" PRIMARY KEY (id);


--
-- Name: ActivityReactions ActivityReactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityReactions"
    ADD CONSTRAINT "ActivityReactions_pkey" PRIMARY KEY (id);


--
-- Name: AudioTranscriptions AudioTranscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AudioTranscriptions"
    ADD CONSTRAINT "AudioTranscriptions_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeComments ChallengeComments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeNotifications ChallengeNotifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeResolutions ChallengeResolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeTypes ChallengeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeTypes"
    ADD CONSTRAINT "ChallengeTypes_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeTypes ChallengeTypes_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeTypes"
    ADD CONSTRAINT "ChallengeTypes_type_code_key" UNIQUE (type_code);


--
-- Name: ChallengeVotes ChallengeVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_pkey" PRIMARY KEY (id);


--
-- Name: Challenges Challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_pkey" PRIMARY KEY (id);


--
-- Name: ClaimNodeMatches ClaimNodeMatches_claim_id_node_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimNodeMatches"
    ADD CONSTRAINT "ClaimNodeMatches_claim_id_node_id_key" UNIQUE (claim_id, node_id);


--
-- Name: ClaimNodeMatches ClaimNodeMatches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimNodeMatches"
    ADD CONSTRAINT "ClaimNodeMatches_pkey" PRIMARY KEY (id);


--
-- Name: ClaimVerifications ClaimVerifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimVerifications"
    ADD CONSTRAINT "ClaimVerifications_pkey" PRIMARY KEY (id);


--
-- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);


--
-- Name: ConfigurationAuditLog ConfigurationAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfigurationAuditLog"
    ADD CONSTRAINT "ConfigurationAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ConfigurationDefaults ConfigurationDefaults_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfigurationDefaults"
    ADD CONSTRAINT "ConfigurationDefaults_key_key" UNIQUE (key);


--
-- Name: ConfigurationDefaults ConfigurationDefaults_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfigurationDefaults"
    ADD CONSTRAINT "ConfigurationDefaults_pkey" PRIMARY KEY (id);


--
-- Name: ConsensusSnapshots ConsensusSnapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_pkey" PRIMARY KEY (id);


--
-- Name: ConversationMessages ConversationMessages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConversationMessages"
    ADD CONSTRAINT "ConversationMessages_pkey" PRIMARY KEY (id);


--
-- Name: Conversations Conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "Conversations_pkey" PRIMARY KEY (id);


--
-- Name: DocumentFigures DocumentFigures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentFigures"
    ADD CONSTRAINT "DocumentFigures_pkey" PRIMARY KEY (id);


--
-- Name: DocumentProcessingResults DocumentProcessingResults_file_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentProcessingResults"
    ADD CONSTRAINT "DocumentProcessingResults_file_id_key" UNIQUE (file_id);


--
-- Name: DocumentProcessingResults DocumentProcessingResults_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentProcessingResults"
    ADD CONSTRAINT "DocumentProcessingResults_pkey" PRIMARY KEY (id);


--
-- Name: DocumentSections DocumentSections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSections"
    ADD CONSTRAINT "DocumentSections_pkey" PRIMARY KEY (id);


--
-- Name: DocumentTables DocumentTables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentTables"
    ADD CONSTRAINT "DocumentTables_pkey" PRIMARY KEY (id);


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
-- Name: EvidenceAuditLog EvidenceAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceDuplicates EvidenceDuplicates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceFiles EvidenceFiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceFiles"
    ADD CONSTRAINT "EvidenceFiles_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceMetadata EvidenceMetadata_evidence_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_evidence_id_key" UNIQUE (evidence_id);


--
-- Name: EvidenceMetadata EvidenceMetadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceReviews EvidenceReviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceSearchIndex EvidenceSearchIndex_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceSearchIndex"
    ADD CONSTRAINT "EvidenceSearchIndex_pkey" PRIMARY KEY (evidence_id);


--
-- Name: EvidenceVotes EvidenceVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_pkey" PRIMARY KEY (id);


--
-- Name: Evidence Evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY (id);


--
-- Name: ExtractedClaims ExtractedClaims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExtractedClaims"
    ADD CONSTRAINT "ExtractedClaims_pkey" PRIMARY KEY (id);


--
-- Name: Graphs Graphs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_pkey" PRIMARY KEY (id);


--
-- Name: FormalInquiries Inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "Inquiries_pkey" PRIMARY KEY (id);


--
-- Name: InquiryVotes InquiryVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_pkey" PRIMARY KEY (id);


--
-- Name: MediaProcessingJobs MediaProcessingJobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MediaProcessingJobs"
    ADD CONSTRAINT "MediaProcessingJobs_pkey" PRIMARY KEY (job_id);


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
-- Name: MethodologyWorkflows MethodologyWorkflows_methodology_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_methodology_id_key" UNIQUE (methodology_id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_pkey" PRIMARY KEY (id);


--
-- Name: NodeReferences NodeReferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeReferences"
    ADD CONSTRAINT "NodeReferences_pkey" PRIMARY KEY (id);


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
-- Name: Notifications Notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_pkey" PRIMARY KEY (id);


--
-- Name: SourceCredibility SourceCredibility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SourceCredibility"
    ADD CONSTRAINT "SourceCredibility_pkey" PRIMARY KEY (source_id);


--
-- Name: Sources Sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_pkey" PRIMARY KEY (id);


--
-- Name: SpamReports SpamReports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfiguration SystemConfiguration_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemConfiguration"
    ADD CONSTRAINT "SystemConfiguration_key_key" UNIQUE (key);


--
-- Name: SystemConfiguration SystemConfiguration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemConfiguration"
    ADD CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY (id);


--
-- Name: TranscriptSegments TranscriptSegments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TranscriptSegments"
    ADD CONSTRAINT "TranscriptSegments_pkey" PRIMARY KEY (id);


--
-- Name: UserMethodologyProgress UserMethodologyProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_pkey" PRIMARY KEY (id);


--
-- Name: UserReputation UserReputation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserReputation"
    ADD CONSTRAINT "UserReputation_pkey" PRIMARY KEY (user_id);


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
-- Name: VeracityScoreHistory VeracityScoreHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScoreHistory"
    ADD CONSTRAINT "VeracityScoreHistory_pkey" PRIMARY KEY (id);


--
-- Name: VeracityScores VeracityScores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_pkey" PRIMARY KEY (id);


--
-- Name: VideoFrames VideoFrames_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoFrames"
    ADD CONSTRAINT "VideoFrames_pkey" PRIMARY KEY (id);


--
-- Name: VideoMetadata VideoMetadata_file_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoMetadata"
    ADD CONSTRAINT "VideoMetadata_file_id_key" UNIQUE (file_id);


--
-- Name: VideoMetadata VideoMetadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoMetadata"
    ADD CONSTRAINT "VideoMetadata_pkey" PRIMARY KEY (id);


--
-- Name: VideoScenes VideoScenes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoScenes"
    ADD CONSTRAINT "VideoScenes_pkey" PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: VeracityScores unique_active_score_per_edge; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT unique_active_score_per_edge UNIQUE (target_edge_id);


--
-- Name: VeracityScores unique_active_score_per_node; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT unique_active_score_per_node UNIQUE (target_node_id);


--
-- Name: Sources unique_content_hash; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT unique_content_hash UNIQUE (content_hash);


--
-- Name: EvidenceDuplicates unique_duplicate_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT unique_duplicate_pair UNIQUE (evidence_id_1, evidence_id_2);


--
-- Name: MethodologyEdgeTypes unique_edge_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: EvidenceReviews unique_evidence_review; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT unique_evidence_review UNIQUE (evidence_id, reviewer_id);


--
-- Name: VideoFrames unique_file_frame; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoFrames"
    ADD CONSTRAINT unique_file_frame UNIQUE (file_id, frame_number);


--
-- Name: VideoScenes unique_file_scene; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoScenes"
    ADD CONSTRAINT unique_file_scene UNIQUE (file_id, scene_number);


--
-- Name: MethodologyNodeTypes unique_node_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: EvidenceReviewVotes unique_review_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT unique_review_vote UNIQUE (review_id, user_id);


--
-- Name: SpamReports unique_user_challenge_report; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT unique_user_challenge_report UNIQUE (challenge_id, reporter_id);


--
-- Name: ChallengeVotes unique_user_challenge_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT unique_user_challenge_vote UNIQUE (challenge_id, user_id);


--
-- Name: EvidenceVotes unique_user_evidence_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT unique_user_evidence_vote UNIQUE (evidence_id, user_id);


--
-- Name: InquiryVotes unique_user_inquiry_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT unique_user_inquiry_vote UNIQUE (inquiry_id, user_id);


--
-- Name: UserMethodologyProgress unique_user_methodology_graph; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT unique_user_methodology_graph UNIQUE (user_id, methodology_id, graph_id);


--
-- Name: MethodologyPermissions unique_user_methodology_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT unique_user_methodology_permission UNIQUE (methodology_id, user_id);


--
-- Name: ActivityReactions unique_user_post_reaction; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityReactions"
    ADD CONSTRAINT unique_user_post_reaction UNIQUE (post_id, user_id, reaction_type);


--
-- Name: Challenges_target_edge_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_edge_id_idx" ON public."Challenges" USING btree (target_edge_id);


--
-- Name: Challenges_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Challenges_target_node_id_idx" ON public."Challenges" USING btree (target_node_id);


--
-- Name: Comments_author_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_author_id_idx" ON public."Comments" USING btree (author_id);


--
-- Name: Comments_target_edge_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_edge_id_idx" ON public."Comments" USING btree (target_edge_id);


--
-- Name: Comments_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Comments_target_node_id_idx" ON public."Comments" USING btree (target_node_id);


--
-- Name: Edges_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_created_by_idx" ON public."Edges" USING btree (created_by);


--
-- Name: Edges_edge_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_edge_type_id_idx" ON public."Edges" USING btree (edge_type_id);


--
-- Name: Edges_graph_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_graph_id_idx" ON public."Edges" USING btree (graph_id);


--
-- Name: Edges_is_level_0_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_is_level_0_idx" ON public."Edges" USING btree (is_level_0);


--
-- Name: Edges_source_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_source_node_id_idx" ON public."Edges" USING btree (source_node_id);


--
-- Name: Edges_target_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Edges_target_node_id_idx" ON public."Edges" USING btree (target_node_id);


--
-- Name: Graphs_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Graphs_created_by_idx" ON public."Graphs" USING btree (created_by);


--
-- Name: Graphs_level_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Graphs_level_idx" ON public."Graphs" USING btree (level);


--
-- Name: Nodes_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_created_by_idx" ON public."Nodes" USING btree (created_by);


--
-- Name: Nodes_graph_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_graph_id_idx" ON public."Nodes" USING btree (graph_id);


--
-- Name: Nodes_is_level_0_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_is_level_0_idx" ON public."Nodes" USING btree (is_level_0);


--
-- Name: Nodes_node_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_node_type_id_idx" ON public."Nodes" USING btree (node_type_id);


--
-- Name: Nodes_primary_source_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Nodes_primary_source_id_idx" ON public."Nodes" USING btree (primary_source_id);


--
-- Name: idx_activity_posts_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_author_id ON public."ActivityPosts" USING btree (author_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_activity_posts_canvas_props; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_canvas_props ON public."ActivityPosts" USING gin (canvas_props);


--
-- Name: idx_activity_posts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_created_at ON public."ActivityPosts" USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_activity_posts_mentioned_nodes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_mentioned_nodes ON public."ActivityPosts" USING gin (mentioned_node_ids);


--
-- Name: idx_activity_posts_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_node_id ON public."ActivityPosts" USING btree (node_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_activity_posts_node_timeline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_node_timeline ON public."ActivityPosts" USING btree (node_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_activity_posts_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_parent_id ON public."ActivityPosts" USING btree (parent_post_id) WHERE ((is_reply = true) AND (deleted_at IS NULL));


--
-- Name: idx_activity_posts_shared_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_posts_shared_id ON public."ActivityPosts" USING btree (shared_post_id) WHERE ((is_share = true) AND (deleted_at IS NULL));


--
-- Name: idx_activity_reactions_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_reactions_post_id ON public."ActivityReactions" USING btree (post_id);


--
-- Name: idx_activity_reactions_post_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_reactions_post_type ON public."ActivityReactions" USING btree (post_id, reaction_type);


--
-- Name: idx_activity_reactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_reactions_type ON public."ActivityReactions" USING btree (reaction_type);


--
-- Name: idx_activity_reactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_reactions_user_id ON public."ActivityReactions" USING btree (user_id);


--
-- Name: idx_audio_transcriptions_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audio_transcriptions_file ON public."AudioTranscriptions" USING btree (file_id);


--
-- Name: idx_audio_transcriptions_file_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_audio_transcriptions_file_unique ON public."AudioTranscriptions" USING btree (file_id);


--
-- Name: idx_audio_transcriptions_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audio_transcriptions_language ON public."AudioTranscriptions" USING btree (language);


--
-- Name: idx_audio_transcriptions_processed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audio_transcriptions_processed ON public."AudioTranscriptions" USING btree (processed_at);


--
-- Name: idx_audio_transcriptions_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audio_transcriptions_search ON public."AudioTranscriptions" USING gin (content_vector);


--
-- Name: idx_challenge_comments_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_comments_challenge ON public."ChallengeComments" USING btree (challenge_id);


--
-- Name: idx_challenge_comments_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_comments_created ON public."ChallengeComments" USING btree (created_at DESC);


--
-- Name: idx_challenge_comments_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_comments_parent ON public."ChallengeComments" USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);


--
-- Name: idx_challenge_comments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_comments_user ON public."ChallengeComments" USING btree (user_id);


--
-- Name: idx_challenge_resolutions_appealable; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_resolutions_appealable ON public."ChallengeResolutions" USING btree (is_appealable, appeal_deadline) WHERE (is_appealable = true);


--
-- Name: idx_challenge_resolutions_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_resolutions_challenge ON public."ChallengeResolutions" USING btree (challenge_id);


--
-- Name: idx_challenge_resolutions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_resolutions_type ON public."ChallengeResolutions" USING btree (resolution_type);


--
-- Name: idx_challenge_types_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_types_active ON public."ChallengeTypes" USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_challenge_types_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_types_code ON public."ChallengeTypes" USING btree (type_code);


--
-- Name: idx_challenge_votes_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_votes_challenge ON public."ChallengeVotes" USING btree (challenge_id);


--
-- Name: idx_challenge_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_votes_user ON public."ChallengeVotes" USING btree (user_id);


--
-- Name: idx_challenge_votes_vote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_votes_vote ON public."ChallengeVotes" USING btree (vote);


--
-- Name: idx_challenges_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_active ON public."Challenges" USING btree (status, voting_ends_at) WHERE (status = ANY (ARRAY['open'::text, 'voting'::text]));


--
-- Name: idx_challenges_challenger; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_challenger ON public."Challenges" USING btree (challenger_id);


--
-- Name: idx_challenges_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_created ON public."Challenges" USING btree (created_at DESC);


--
-- Name: idx_challenges_resolution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_resolution ON public."Challenges" USING btree (resolution) WHERE (resolution IS NOT NULL);


--
-- Name: idx_challenges_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_status ON public."Challenges" USING btree (status);


--
-- Name: idx_challenges_target_edge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_target_edge ON public."Challenges" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_challenges_target_edge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_target_edge_id ON public."Challenges" USING btree (target_edge_id);


--
-- Name: idx_challenges_target_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_target_node ON public."Challenges" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_challenges_target_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_target_node_id ON public."Challenges" USING btree (target_node_id);


--
-- Name: idx_challenges_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_type ON public."Challenges" USING btree (challenge_type_id);


--
-- Name: idx_challenges_voting_ends; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenges_voting_ends ON public."Challenges" USING btree (voting_ends_at) WHERE (status = 'voting'::text);


--
-- Name: idx_claims_claim_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claims_claim_type ON public."ExtractedClaims" USING btree (claim_type);


--
-- Name: idx_claims_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claims_confidence ON public."ExtractedClaims" USING btree (confidence DESC);


--
-- Name: idx_claims_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claims_created_at ON public."ExtractedClaims" USING btree (created_at DESC);


--
-- Name: idx_claims_embedding_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claims_embedding_hnsw ON public."ExtractedClaims" USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_claims_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claims_file_id ON public."ExtractedClaims" USING btree (file_id);


--
-- Name: idx_comments_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_author_id ON public."Comments" USING btree (author_id);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_parent_id ON public."Comments" USING btree (parent_comment_id);


--
-- Name: idx_comments_root; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_root ON public."Comments" USING btree (target_node_id, target_edge_id) WHERE (parent_comment_id IS NULL);


--
-- Name: idx_comments_target_edge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_target_edge_id ON public."Comments" USING btree (target_edge_id);


--
-- Name: idx_comments_target_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_target_node_id ON public."Comments" USING btree (target_node_id);


--
-- Name: idx_config_audit_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_config_audit_changed_at ON public."ConfigurationAuditLog" USING btree (changed_at DESC);


--
-- Name: idx_config_audit_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_config_audit_changed_by ON public."ConfigurationAuditLog" USING btree (changed_by);


--
-- Name: idx_config_audit_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_config_audit_key ON public."ConfigurationAuditLog" USING btree (config_key);


--
-- Name: idx_consensus_snapshot_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consensus_snapshot_at ON public."ConsensusSnapshots" USING btree (snapshot_at DESC);


--
-- Name: idx_consensus_target_edge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consensus_target_edge ON public."ConsensusSnapshots" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_consensus_target_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consensus_target_node ON public."ConsensusSnapshots" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_conversations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_created_at ON public."Conversations" USING btree (created_at DESC);


--
-- Name: idx_conversations_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_updated_at ON public."Conversations" USING btree (updated_at DESC);


--
-- Name: idx_conversations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_user_id ON public."Conversations" USING btree (user_id);


--
-- Name: idx_doc_processing_extracted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_processing_extracted_at ON public."DocumentProcessingResults" USING btree (extracted_at DESC);


--
-- Name: idx_doc_processing_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_processing_file_id ON public."DocumentProcessingResults" USING btree (file_id);


--
-- Name: idx_doc_processing_text_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_processing_text_search ON public."DocumentProcessingResults" USING gin (to_tsvector('english'::regconfig, extracted_text));


--
-- Name: idx_document_figures_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_figures_content_search ON public."DocumentFigures" USING gin (content_vector);


--
-- Name: idx_document_figures_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_figures_file ON public."DocumentFigures" USING btree (file_id);


--
-- Name: idx_document_figures_page; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_figures_page ON public."DocumentFigures" USING btree (page_number);


--
-- Name: idx_document_sections_ai_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_sections_ai_hnsw ON public."DocumentSections" USING hnsw (ai public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_document_sections_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_sections_content_search ON public."DocumentSections" USING gin (content_vector);


--
-- Name: idx_document_sections_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_sections_file ON public."DocumentSections" USING btree (file_id);


--
-- Name: idx_document_sections_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_sections_level ON public."DocumentSections" USING btree (level);


--
-- Name: idx_document_sections_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_sections_order ON public."DocumentSections" USING btree (section_order);


--
-- Name: idx_document_tables_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_tables_content_search ON public."DocumentTables" USING gin (content_vector);


--
-- Name: idx_document_tables_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_tables_file ON public."DocumentTables" USING btree (file_id);


--
-- Name: idx_document_tables_page; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_tables_page ON public."DocumentTables" USING btree (page_number);


--
-- Name: idx_edges_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_created_by ON public."Edges" USING btree (created_by);


--
-- Name: idx_edges_edge_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_edge_type_id ON public."Edges" USING btree (edge_type_id);


--
-- Name: idx_edges_graph_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_graph_id ON public."Edges" USING btree (graph_id);


--
-- Name: idx_edges_is_level_0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_is_level_0 ON public."Edges" USING btree (is_level_0);


--
-- Name: idx_edges_source_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_source_node_id ON public."Edges" USING btree (source_node_id);


--
-- Name: idx_edges_target_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edges_target_node_id ON public."Edges" USING btree (target_node_id);


--
-- Name: idx_evidence_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_action ON public."EvidenceAuditLog" USING btree (action);


--
-- Name: idx_evidence_audit_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_actor ON public."EvidenceAuditLog" USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_evidence_audit_actor_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_actor_created ON public."EvidenceAuditLog" USING btree (actor_id, created_at DESC);


--
-- Name: idx_evidence_audit_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_created ON public."EvidenceAuditLog" USING btree (created_at DESC);


--
-- Name: idx_evidence_audit_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_evidence ON public."EvidenceAuditLog" USING btree (evidence_id);


--
-- Name: idx_evidence_audit_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_audit_ip ON public."EvidenceAuditLog" USING btree (ip_address) WHERE (ip_address IS NOT NULL);


--
-- Name: idx_evidence_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_created_at ON public."Evidence" USING btree (created_at DESC);


--
-- Name: idx_evidence_duplicates_evidence1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_duplicates_evidence1 ON public."EvidenceDuplicates" USING btree (evidence_id_1);


--
-- Name: idx_evidence_duplicates_evidence2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_duplicates_evidence2 ON public."EvidenceDuplicates" USING btree (evidence_id_2);


--
-- Name: idx_evidence_duplicates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_duplicates_status ON public."EvidenceDuplicates" USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_evidence_files_evidence_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_files_evidence_id ON public."EvidenceFiles" USING btree (evidence_id);


--
-- Name: idx_evidence_files_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_files_hash ON public."EvidenceFiles" USING btree (file_hash);


--
-- Name: idx_evidence_files_storage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_files_storage ON public."EvidenceFiles" USING btree (storage_provider, storage_key);


--
-- Name: idx_evidence_metadata_abstract_fts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_abstract_fts ON public."EvidenceMetadata" USING gin (to_tsvector('english'::regconfig, COALESCE(abstract, ''::text)));


--
-- Name: idx_evidence_metadata_authors; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_authors ON public."EvidenceMetadata" USING gin (authors);


--
-- Name: idx_evidence_metadata_doi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_doi ON public."EvidenceMetadata" USING btree (doi) WHERE (doi IS NOT NULL);


--
-- Name: idx_evidence_metadata_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_evidence ON public."EvidenceMetadata" USING btree (evidence_id);


--
-- Name: idx_evidence_metadata_geolocation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_geolocation ON public."EvidenceMetadata" USING gin (geolocation);


--
-- Name: idx_evidence_metadata_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_keywords ON public."EvidenceMetadata" USING gin (keywords);


--
-- Name: idx_evidence_metadata_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_language ON public."EvidenceMetadata" USING btree (language);


--
-- Name: idx_evidence_metadata_publication_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_publication_date ON public."EvidenceMetadata" USING btree (publication_date DESC);


--
-- Name: idx_evidence_metadata_topics; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_metadata_topics ON public."EvidenceMetadata" USING gin (topics);


--
-- Name: idx_evidence_review_votes_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_review_votes_review ON public."EvidenceReviewVotes" USING btree (review_id);


--
-- Name: idx_evidence_review_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_review_votes_user ON public."EvidenceReviewVotes" USING btree (user_id);


--
-- Name: idx_evidence_reviews_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_created ON public."EvidenceReviews" USING btree (created_at DESC);


--
-- Name: idx_evidence_reviews_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_evidence ON public."EvidenceReviews" USING btree (evidence_id) WHERE (status = 'active'::text);


--
-- Name: idx_evidence_reviews_flags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_flags ON public."EvidenceReviews" USING gin (flags);


--
-- Name: idx_evidence_reviews_helpful; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_helpful ON public."EvidenceReviews" USING btree (helpful_count DESC);


--
-- Name: idx_evidence_reviews_quality; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_quality ON public."EvidenceReviews" USING btree (quality_score DESC);


--
-- Name: idx_evidence_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_rating ON public."EvidenceReviews" USING btree (overall_rating);


--
-- Name: idx_evidence_reviews_reviewer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_reviews_reviewer ON public."EvidenceReviews" USING btree (reviewer_id);


--
-- Name: idx_evidence_search_authors; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_search_authors ON public."EvidenceSearchIndex" USING gin (authors);


--
-- Name: idx_evidence_search_file_types; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_search_file_types ON public."EvidenceSearchIndex" USING gin (file_types);


--
-- Name: idx_evidence_search_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_search_keywords ON public."EvidenceSearchIndex" USING gin (keywords);


--
-- Name: idx_evidence_search_quality; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_search_quality ON public."EvidenceSearchIndex" USING btree (avg_quality_score DESC);


--
-- Name: idx_evidence_search_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_search_vector ON public."EvidenceSearchIndex" USING gin (search_vector);


--
-- Name: idx_evidence_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_source ON public."Evidence" USING btree (source_id);


--
-- Name: idx_evidence_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_submitted_by ON public."Evidence" USING btree (submitted_by);


--
-- Name: idx_evidence_target_edge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_target_edge ON public."Evidence" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_evidence_target_edge_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_target_edge_type ON public."Evidence" USING btree (target_edge_id, evidence_type) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_evidence_target_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_target_node ON public."Evidence" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_evidence_target_node_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_target_node_type ON public."Evidence" USING btree (target_node_id, evidence_type) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_evidence_temporal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_temporal ON public."Evidence" USING btree (temporal_relevance) WHERE (temporal_relevance < (1.0)::double precision);


--
-- Name: idx_evidence_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_type ON public."Evidence" USING btree (evidence_type);


--
-- Name: idx_evidence_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_verified ON public."Evidence" USING btree (is_verified);


--
-- Name: idx_evidence_votes_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_votes_evidence ON public."EvidenceVotes" USING btree (evidence_id);


--
-- Name: idx_evidence_votes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_votes_type ON public."EvidenceVotes" USING btree (vote_type);


--
-- Name: idx_evidence_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_evidence_votes_user ON public."EvidenceVotes" USING btree (user_id);


--
-- Name: idx_formal_inquiries_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formal_inquiries_confidence ON public."FormalInquiries" USING btree (confidence_score DESC) WHERE (confidence_score IS NOT NULL);


--
-- Name: idx_formal_inquiries_target_edge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formal_inquiries_target_edge ON public."FormalInquiries" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_formal_inquiries_target_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formal_inquiries_target_node ON public."FormalInquiries" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_graphs_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_graphs_created_by ON public."Graphs" USING btree (created_by);


--
-- Name: idx_graphs_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_graphs_level ON public."Graphs" USING btree (level);


--
-- Name: idx_history_change_reason; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_change_reason ON public."VeracityScoreHistory" USING btree (change_reason);


--
-- Name: idx_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_changed_at ON public."VeracityScoreHistory" USING btree (changed_at DESC);


--
-- Name: idx_history_triggering_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_triggering_entity ON public."VeracityScoreHistory" USING btree (triggering_entity_type, triggering_entity_id) WHERE (triggering_entity_id IS NOT NULL);


--
-- Name: idx_history_veracity_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_veracity_score ON public."VeracityScoreHistory" USING btree (veracity_score_id);


--
-- Name: idx_inquiries_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_content_search ON public."FormalInquiries" USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx_inquiries_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_created_at ON public."FormalInquiries" USING btree (created_at DESC);


--
-- Name: idx_inquiries_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_parent_id ON public."FormalInquiries" USING btree (parent_inquiry_id);


--
-- Name: idx_inquiries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_status ON public."FormalInquiries" USING btree (status);


--
-- Name: idx_inquiries_target_edge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_target_edge_id ON public."FormalInquiries" USING btree (target_edge_id);


--
-- Name: idx_inquiries_target_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_target_node_id ON public."FormalInquiries" USING btree (target_node_id);


--
-- Name: idx_inquiries_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_user_id ON public."FormalInquiries" USING btree (user_id);


--
-- Name: idx_inquiry_vote_stats_inquiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_inquiry_vote_stats_inquiry ON public."InquiryVoteStats" USING btree (inquiry_id);


--
-- Name: idx_inquiry_votes_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiry_votes_created ON public."InquiryVotes" USING btree (created_at DESC);


--
-- Name: idx_inquiry_votes_inquiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiry_votes_inquiry ON public."InquiryVotes" USING btree (inquiry_id);


--
-- Name: idx_inquiry_votes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiry_votes_type ON public."InquiryVotes" USING btree (vote_type);


--
-- Name: idx_inquiry_votes_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiry_votes_user ON public."InquiryVotes" USING btree (user_id);


--
-- Name: idx_matches_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_claim_id ON public."ClaimNodeMatches" USING btree (claim_id);


--
-- Name: idx_matches_match_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_match_type ON public."ClaimNodeMatches" USING btree (match_type);


--
-- Name: idx_matches_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_node_id ON public."ClaimNodeMatches" USING btree (node_id);


--
-- Name: idx_matches_similarity_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_similarity_score ON public."ClaimNodeMatches" USING btree (similarity_score DESC);


--
-- Name: idx_media_jobs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_jobs_created_at ON public."MediaProcessingJobs" USING btree (created_at DESC);


--
-- Name: idx_media_jobs_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_jobs_file_id ON public."MediaProcessingJobs" USING btree (file_id);


--
-- Name: idx_media_jobs_file_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_jobs_file_status ON public."MediaProcessingJobs" USING btree (file_id, status);


--
-- Name: idx_media_jobs_file_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_jobs_file_type ON public."MediaProcessingJobs" USING btree (file_type);


--
-- Name: idx_media_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_media_jobs_status ON public."MediaProcessingJobs" USING btree (status);


--
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_id ON public."ConversationMessages" USING btree (conversation_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public."ConversationMessages" USING btree (created_at DESC);


--
-- Name: idx_messages_embedding_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_embedding_hnsw ON public."ConversationMessages" USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_messages_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_role ON public."ConversationMessages" USING btree (role);


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
-- Name: idx_methodology_edge_types_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_edge_types_display_order ON public."MethodologyEdgeTypes" USING btree (display_order);


--
-- Name: idx_methodology_edge_types_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes" USING btree (methodology_id);


--
-- Name: idx_methodology_node_types_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_methodology_node_types_display_order ON public."MethodologyNodeTypes" USING btree (display_order);


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
-- Name: idx_node_references_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_created_at ON public."NodeReferences" USING btree (created_at DESC);


--
-- Name: idx_node_references_metadata; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_metadata ON public."NodeReferences" USING gin (metadata);


--
-- Name: idx_node_references_node_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_node_id ON public."NodeReferences" USING btree (node_id);


--
-- Name: idx_node_references_processed_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_processed_node ON public."NodeReferences" USING btree (processed_node_id);


--
-- Name: idx_node_references_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_type ON public."NodeReferences" USING btree (type);


--
-- Name: idx_node_references_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_references_url ON public."NodeReferences" USING btree (url);


--
-- Name: idx_nodes_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_author_id ON public."Nodes" USING btree (author_id);


--
-- Name: idx_nodes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_created_by ON public."Nodes" USING btree (created_by);


--
-- Name: idx_nodes_graph_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_graph_id ON public."Nodes" USING btree (graph_id);


--
-- Name: idx_nodes_is_level_0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_is_level_0 ON public."Nodes" USING btree (is_level_0);


--
-- Name: idx_nodes_meta_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_meta_gin ON public."Nodes" USING gin (meta);


--
-- Name: idx_nodes_narrative_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_narrative_search ON public."Nodes" USING gin (to_tsvector('english'::regconfig, COALESCE(narrative, ''::text)));


--
-- Name: idx_nodes_node_type_canvas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_node_type_canvas ON public."Nodes" USING btree (node_type_id, graph_id) WHERE ((meta ->> 'isTextBox'::text) = 'true'::text);


--
-- Name: idx_nodes_node_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_node_type_id ON public."Nodes" USING btree (node_type_id);


--
-- Name: idx_nodes_primary_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_primary_source_id ON public."Nodes" USING btree (primary_source_id);


--
-- Name: idx_nodes_props_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_props_gin ON public."Nodes" USING gin (props);


--
-- Name: idx_nodes_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_published_at ON public."Nodes" USING btree (published_at) WHERE (published_at IS NOT NULL);


--
-- Name: idx_nodes_title; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_title ON public."Nodes" USING btree (title);


--
-- Name: idx_nodes_title_fulltext; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_title_fulltext ON public."Nodes" USING gin (to_tsvector('english'::regconfig, title));


--
-- Name: idx_nodes_title_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nodes_title_search ON public."Nodes" USING gin (to_tsvector('english'::regconfig, COALESCE(title, ''::text)));


--
-- Name: idx_notifications_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_challenge ON public."ChallengeNotifications" USING btree (challenge_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public."Notifications" USING btree (created_at DESC);


--
-- Name: idx_notifications_feed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_feed ON public."Notifications" USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public."ChallengeNotifications" USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_unsent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unsent ON public."ChallengeNotifications" USING btree (is_sent, created_at) WHERE (is_sent = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public."ChallengeNotifications" USING btree (user_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public."Notifications" USING btree (user_id);


--
-- Name: idx_sources_content_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_content_hash ON public."Sources" USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_sources_is_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_is_verified ON public."Sources" USING btree (is_verified);


--
-- Name: idx_sources_publication_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_publication_date ON public."Sources" USING btree (publication_date DESC);


--
-- Name: idx_sources_source_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_source_type ON public."Sources" USING btree (source_type);


--
-- Name: idx_sources_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sources_submitted_by ON public."Sources" USING btree (submitted_by);


--
-- Name: idx_spam_reports_challenge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spam_reports_challenge ON public."SpamReports" USING btree (challenge_id);


--
-- Name: idx_spam_reports_unreviewed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_spam_reports_unreviewed ON public."SpamReports" USING btree (is_reviewed) WHERE (is_reviewed = false);


--
-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_category ON public."SystemConfiguration" USING btree (category);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_key ON public."SystemConfiguration" USING btree (key);


--
-- Name: idx_system_config_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_updated_at ON public."SystemConfiguration" USING btree (updated_at DESC);


--
-- Name: idx_transcript_segments_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transcript_segments_order ON public."TranscriptSegments" USING btree (segment_order);


--
-- Name: idx_transcript_segments_order_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_transcript_segments_order_unique ON public."TranscriptSegments" USING btree (transcription_id, segment_order);


--
-- Name: idx_transcript_segments_speaker; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transcript_segments_speaker ON public."TranscriptSegments" USING btree (speaker_id) WHERE (speaker_id IS NOT NULL);


--
-- Name: idx_transcript_segments_text_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transcript_segments_text_search ON public."TranscriptSegments" USING gin (to_tsvector('english'::regconfig, text));


--
-- Name: idx_transcript_segments_time_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transcript_segments_time_range ON public."TranscriptSegments" USING btree (start_time, end_time);


--
-- Name: idx_transcript_segments_transcription; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transcript_segments_transcription ON public."TranscriptSegments" USING btree (transcription_id);


--
-- Name: idx_unique_system_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_system_methodology ON public."Methodologies" USING btree (name) WHERE (is_system = true);


--
-- Name: idx_user_methodology_progress_graph; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_methodology_progress_graph ON public."UserMethodologyProgress" USING btree (graph_id);


--
-- Name: idx_user_methodology_progress_methodology; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_methodology_progress_methodology ON public."UserMethodologyProgress" USING btree (methodology_id);


--
-- Name: idx_user_methodology_progress_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_methodology_progress_user ON public."UserMethodologyProgress" USING btree (user_id);


--
-- Name: idx_user_reputation_banned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_reputation_banned ON public."UserReputation" USING btree (is_banned) WHERE (is_banned = true);


--
-- Name: idx_user_reputation_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_reputation_score ON public."UserReputation" USING btree (reputation_score DESC);


--
-- Name: idx_user_reputation_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_reputation_tier ON public."UserReputation" USING btree (reputation_tier);


--
-- Name: idx_veracity_calculated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_calculated_at ON public."VeracityScores" USING btree (calculated_at DESC);


--
-- Name: idx_veracity_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_expires_at ON public."VeracityScores" USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_veracity_low_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_low_confidence ON public."VeracityScores" USING btree (veracity_score, evidence_count) WHERE (evidence_count < 3);


--
-- Name: idx_veracity_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_score ON public."VeracityScores" USING btree (veracity_score);


--
-- Name: idx_veracity_target_edge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_target_edge ON public."VeracityScores" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_veracity_target_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_veracity_target_node ON public."VeracityScores" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_verifications_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_claim_id ON public."ClaimVerifications" USING btree (claim_id);


--
-- Name: idx_verifications_conflicting_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_conflicting_evidence ON public."ClaimVerifications" USING gin (conflicting_evidence);


--
-- Name: idx_verifications_inquiry_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_inquiry_id ON public."ClaimVerifications" USING btree (inquiry_id);


--
-- Name: idx_verifications_supporting_evidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_supporting_evidence ON public."ClaimVerifications" USING gin (supporting_evidence);


--
-- Name: idx_verifications_veracity_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_veracity_score ON public."ClaimVerifications" USING btree (veracity_score DESC);


--
-- Name: idx_verifications_verified_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verifications_verified_at ON public."ClaimVerifications" USING btree (verified_at DESC);


--
-- Name: idx_video_frames_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_frames_content_search ON public."VideoFrames" USING gin (content_vector);


--
-- Name: idx_video_frames_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_frames_file ON public."VideoFrames" USING btree (file_id);


--
-- Name: idx_video_frames_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_frames_timestamp ON public."VideoFrames" USING btree (timestamp_seconds);


--
-- Name: idx_video_frames_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_frames_type ON public."VideoFrames" USING btree (frame_type);


--
-- Name: idx_video_metadata_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_metadata_duration ON public."VideoMetadata" USING btree (duration_seconds);


--
-- Name: idx_video_metadata_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_metadata_file ON public."VideoMetadata" USING btree (file_id);


--
-- Name: idx_video_metadata_resolution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_metadata_resolution ON public."VideoMetadata" USING btree (width, height);


--
-- Name: idx_video_scenes_content_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_scenes_content_search ON public."VideoScenes" USING gin (content_vector);


--
-- Name: idx_video_scenes_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_scenes_file ON public."VideoScenes" USING btree (file_id);


--
-- Name: idx_video_scenes_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_scenes_tags ON public."VideoScenes" USING gin (tags);


--
-- Name: idx_video_scenes_thumbnail; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_scenes_thumbnail ON public."VideoScenes" USING btree (thumbnail_frame_id);


--
-- Name: idx_video_scenes_time_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_video_scenes_time_range ON public."VideoScenes" USING btree (start_time, end_time);


--
-- Name: DocumentProcessingStats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public."DocumentProcessingStats" AS
 SELECT ef.id AS file_id,
    ef.original_filename AS filename,
    ef.file_type,
    ef.file_size,
    ef.processing_service,
    ef.processing_time_ms,
    ef.page_count,
    ef.processing_error,
    ef.updated_at,
    count(DISTINCT dt.id) AS table_count,
    count(DISTINCT df.id) AS figure_count,
    count(DISTINCT ds.id) AS section_count,
    sum(ds.word_count) AS total_words,
        CASE
            WHEN (ef.processing_error IS NOT NULL) THEN 'failed'::text
            WHEN ((ef.processing_status)::text = 'pending'::text) THEN 'pending'::text
            ELSE 'completed'::text
        END AS status
   FROM (((public."EvidenceFiles" ef
     LEFT JOIN public."DocumentTables" dt ON ((ef.id = dt.file_id)))
     LEFT JOIN public."DocumentFigures" df ON ((ef.id = df.file_id)))
     LEFT JOIN public."DocumentSections" ds ON ((ef.id = ds.file_id)))
  GROUP BY ef.id
  ORDER BY ef.updated_at DESC NULLS LAST;


--
-- Name: AudioProcessingStats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public."AudioProcessingStats" AS
 SELECT ef.id AS file_id,
    ef.original_filename AS filename,
    ef.file_size,
    ef.mime_type,
    at.id AS transcription_id,
    at.language,
    at.duration_seconds,
    at.word_count,
    at.speaker_count,
    at.processing_service,
    at.processing_time_ms,
    at.processing_error,
    at.processed_at,
    count(ts.id) AS segment_count,
    avg(ts.confidence) AS avg_confidence,
    count(DISTINCT ts.speaker_id) AS detected_speakers,
        CASE
            WHEN (at.processing_error IS NOT NULL) THEN 'failed'::text
            WHEN (at.id IS NULL) THEN 'pending'::text
            ELSE 'completed'::text
        END AS processing_status
   FROM ((public."EvidenceFiles" ef
     LEFT JOIN public."AudioTranscriptions" at ON ((ef.id = at.file_id)))
     LEFT JOIN public."TranscriptSegments" ts ON ((at.id = ts.transcription_id)))
  WHERE ((ef.file_type)::text = 'audio'::text)
  GROUP BY ef.id, at.id
  ORDER BY at.processed_at DESC NULLS LAST;


--
-- Name: VideoProcessingStats _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public."VideoProcessingStats" AS
 SELECT ef.id AS file_id,
    ef.original_filename AS filename,
    ef.file_size,
    ef.mime_type,
    ef.video_processed,
    ef.video_processing_completed_at,
    ef.video_processing_error,
    vm.duration_seconds,
    vm.width,
    vm.height,
    vm.fps,
    vm.codec,
    vm.bitrate,
    vm.file_format,
    vm.total_frames,
    vm.extracted_frames,
    vm.scene_count,
    count(DISTINCT vf.id) AS stored_frame_count,
    count(DISTINCT vf.id) FILTER (WHERE (vf.ocr_text IS NOT NULL)) AS frames_with_ocr,
    count(DISTINCT vs.id) AS stored_scene_count,
    sum(length(vf.ocr_text)) AS total_ocr_characters,
    avg(vf.ocr_confidence) AS avg_ocr_confidence,
    EXTRACT(epoch FROM (ef.video_processing_completed_at - ef.video_processing_started_at)) AS processing_duration_seconds
   FROM (((public."EvidenceFiles" ef
     LEFT JOIN public."VideoMetadata" vm ON ((ef.id = vm.file_id)))
     LEFT JOIN public."VideoFrames" vf ON ((ef.id = vf.file_id)))
     LEFT JOIN public."VideoScenes" vs ON ((ef.id = vs.file_id)))
  WHERE ((ef.file_type)::text = 'video'::text)
  GROUP BY ef.id, vm.id
  ORDER BY ef.created_at DESC;


--
-- Name: AudioTranscriptions audio_transcription_search_vector_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audio_transcription_search_vector_update BEFORE INSERT OR UPDATE ON public."AudioTranscriptions" FOR EACH ROW EXECUTE FUNCTION public.update_audio_transcription_search_vector();


--
-- Name: AudioTranscriptions audio_transcription_timestamps; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audio_transcription_timestamps BEFORE UPDATE ON public."AudioTranscriptions" FOR EACH ROW EXECUTE FUNCTION public.update_audio_timestamps();


--
-- Name: AudioTranscriptions audio_transcription_word_count_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audio_transcription_word_count_update BEFORE INSERT OR UPDATE OF transcript_text ON public."AudioTranscriptions" FOR EACH ROW EXECUTE FUNCTION public.update_audio_transcription_word_count();


--
-- Name: Challenges challenge_veracity_refresh; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER challenge_veracity_refresh AFTER INSERT OR DELETE OR UPDATE ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.trigger_veracity_refresh_on_challenge();


--
-- Name: ChallengeVotes challenge_vote_stats_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER challenge_vote_stats_update AFTER INSERT OR UPDATE ON public."ChallengeVotes" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_challenge_stats();


--
-- Name: DocumentFigures document_figure_search_vector_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_figure_search_vector_update BEFORE INSERT OR UPDATE ON public."DocumentFigures" FOR EACH ROW EXECUTE FUNCTION public.update_document_figure_search_vector();


--
-- Name: DocumentSections document_section_metadata_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_section_metadata_update BEFORE INSERT OR UPDATE ON public."DocumentSections" FOR EACH ROW EXECUTE FUNCTION public.update_document_section_metadata();


--
-- Name: DocumentTables document_table_search_vector_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_table_search_vector_update BEFORE INSERT OR UPDATE ON public."DocumentTables" FOR EACH ROW EXECUTE FUNCTION public.update_document_table_search_vector();


--
-- Name: Evidence evidence_credibility_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_credibility_update AFTER INSERT OR DELETE OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.trigger_source_credibility_update();


--
-- Name: Evidence evidence_level_0_check; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_level_0_check BEFORE INSERT OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.check_evidence_level_0();


--
-- Name: EvidenceMetadata evidence_metadata_search_index_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_metadata_search_index_update AFTER INSERT OR DELETE OR UPDATE ON public."EvidenceMetadata" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_evidence_search_index();


--
-- Name: EvidenceReviewVotes evidence_review_votes_update_counts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_review_votes_update_counts AFTER INSERT OR DELETE ON public."EvidenceReviewVotes" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_review_helpfulness();


--
-- Name: EvidenceReviews evidence_reviews_search_index_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_reviews_search_index_update AFTER INSERT OR DELETE OR UPDATE ON public."EvidenceReviews" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_evidence_search_index();


--
-- Name: Evidence evidence_veracity_refresh; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER evidence_veracity_refresh AFTER INSERT OR DELETE OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.trigger_veracity_refresh_on_evidence();


--
-- Name: InquiryVotes refresh_vote_stats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_vote_stats AFTER INSERT OR DELETE OR UPDATE ON public."InquiryVotes" FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_inquiry_vote_stats();


--
-- Name: Challenges set_challenge_voting_deadline; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_challenge_voting_deadline BEFORE INSERT ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.trigger_set_voting_deadline();


--
-- Name: TranscriptSegments transcript_segment_timestamps; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER transcript_segment_timestamps BEFORE UPDATE ON public."TranscriptSegments" FOR EACH ROW EXECUTE FUNCTION public.update_audio_timestamps();


--
-- Name: NodeReferences trigger_node_references_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_node_references_updated_at BEFORE UPDATE ON public."NodeReferences" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Nodes trigger_node_version_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_node_version_history BEFORE UPDATE ON public."Nodes" FOR EACH ROW EXECUTE FUNCTION public.trigger_node_version_history();


--
-- Name: TRIGGER trigger_node_version_history ON "Nodes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_node_version_history ON public."Nodes" IS 'Automatically tracks version history in node meta field';


--
-- Name: ActivityPosts trigger_update_activity_post_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_activity_post_timestamp BEFORE UPDATE ON public."ActivityPosts" FOR EACH ROW EXECUTE FUNCTION public.update_activity_post_timestamp();


--
-- Name: ConversationMessages trigger_update_conversation_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_conversation_timestamp AFTER INSERT ON public."ConversationMessages" FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


--
-- Name: TRIGGER trigger_update_conversation_timestamp ON "ConversationMessages"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_update_conversation_timestamp ON public."ConversationMessages" IS 'Automatically updates conversation updated_at when new messages are added';


--
-- Name: ChallengeComments update_challenge_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_challenge_comments_updated_at BEFORE UPDATE ON public."ChallengeComments" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeTypes update_challenge_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_challenge_types_updated_at BEFORE UPDATE ON public."ChallengeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeVotes update_challenge_votes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_challenge_votes_updated_at BEFORE UPDATE ON public."ChallengeVotes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Challenges update_challenges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public."Comments" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceMetadata update_evidence_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_evidence_metadata_updated_at BEFORE UPDATE ON public."EvidenceMetadata" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceReviews update_evidence_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_evidence_reviews_updated_at BEFORE UPDATE ON public."EvidenceReviews" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Evidence update_evidence_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceVotes update_evidence_votes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_evidence_votes_updated_at BEFORE UPDATE ON public."EvidenceVotes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Methodologies update_methodologies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_methodologies_updated_at BEFORE UPDATE ON public."Methodologies" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyEdgeTypes update_methodology_edge_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_methodology_edge_types_updated_at BEFORE UPDATE ON public."MethodologyEdgeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyNodeTypes update_methodology_node_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_methodology_node_types_updated_at BEFORE UPDATE ON public."MethodologyNodeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyWorkflows update_methodology_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_methodology_workflows_updated_at BEFORE UPDATE ON public."MethodologyWorkflows" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: SourceCredibility update_source_credibility_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_source_credibility_updated_at BEFORE UPDATE ON public."SourceCredibility" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Sources update_sources_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public."Sources" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: UserReputation update_user_reputation_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public."UserReputation" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: VeracityScores update_veracity_scores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_veracity_scores_updated_at BEFORE UPDATE ON public."VeracityScores" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: VideoFrames video_frame_search_vector_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER video_frame_search_vector_update BEFORE INSERT OR UPDATE ON public."VideoFrames" FOR EACH ROW EXECUTE FUNCTION public.update_video_frame_search_vector();


--
-- Name: VideoFrames video_frames_metadata_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER video_frames_metadata_update AFTER INSERT OR DELETE OR UPDATE ON public."VideoFrames" FOR EACH ROW EXECUTE FUNCTION public.update_video_metadata_counts();


--
-- Name: VideoScenes video_scene_search_vector_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER video_scene_search_vector_update BEFORE INSERT OR UPDATE ON public."VideoScenes" FOR EACH ROW EXECUTE FUNCTION public.update_video_scene_search_vector();


--
-- Name: VideoScenes video_scenes_metadata_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER video_scenes_metadata_update AFTER INSERT OR DELETE OR UPDATE ON public."VideoScenes" FOR EACH ROW EXECUTE FUNCTION public.update_video_metadata_counts();


--
-- Name: ActivityPosts ActivityPosts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityPosts"
    ADD CONSTRAINT "ActivityPosts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ActivityPosts ActivityPosts_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityPosts"
    ADD CONSTRAINT "ActivityPosts_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ActivityPosts ActivityPosts_parent_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityPosts"
    ADD CONSTRAINT "ActivityPosts_parent_post_id_fkey" FOREIGN KEY (parent_post_id) REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE;


--
-- Name: ActivityPosts ActivityPosts_shared_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityPosts"
    ADD CONSTRAINT "ActivityPosts_shared_post_id_fkey" FOREIGN KEY (shared_post_id) REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE;


--
-- Name: ActivityReactions ActivityReactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityReactions"
    ADD CONSTRAINT "ActivityReactions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public."ActivityPosts"(id) ON DELETE CASCADE;


--
-- Name: ActivityReactions ActivityReactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityReactions"
    ADD CONSTRAINT "ActivityReactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: AudioTranscriptions AudioTranscriptions_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AudioTranscriptions"
    ADD CONSTRAINT "AudioTranscriptions_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments ChallengeComments_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments ChallengeComments_hidden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_hidden_by_fkey" FOREIGN KEY (hidden_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeComments ChallengeComments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public."ChallengeComments"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments ChallengeComments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ChallengeNotifications ChallengeNotifications_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeNotifications ChallengeNotifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ChallengeResolutions ChallengeResolutions_appeal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_appeal_id_fkey" FOREIGN KEY (appeal_id) REFERENCES public."Challenges"(id);


--
-- Name: ChallengeResolutions ChallengeResolutions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeResolutions ChallengeResolutions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeVotes ChallengeVotes_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeVotes ChallengeVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Challenges Challenges_challenge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_challenge_type_id_fkey" FOREIGN KEY (challenge_type_id) REFERENCES public."ChallengeTypes"(id);


--
-- Name: Challenges Challenges_challenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_challenger_id_fkey" FOREIGN KEY (challenger_id) REFERENCES public."Users"(id);


--
-- Name: Challenges Challenges_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


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
-- Name: ClaimNodeMatches ClaimNodeMatches_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimNodeMatches"
    ADD CONSTRAINT "ClaimNodeMatches_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public."ExtractedClaims"(id) ON DELETE CASCADE;


--
-- Name: ClaimNodeMatches ClaimNodeMatches_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimNodeMatches"
    ADD CONSTRAINT "ClaimNodeMatches_node_id_fkey" FOREIGN KEY (node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ClaimVerifications ClaimVerifications_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimVerifications"
    ADD CONSTRAINT "ClaimVerifications_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public."ExtractedClaims"(id) ON DELETE CASCADE;


--
-- Name: ClaimVerifications ClaimVerifications_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClaimVerifications"
    ADD CONSTRAINT "ClaimVerifications_inquiry_id_fkey" FOREIGN KEY (inquiry_id) REFERENCES public."FormalInquiries"(id) ON DELETE SET NULL;


--
-- Name: Comments Comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public."Comments"(id) ON DELETE CASCADE;


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
-- Name: ConfigurationAuditLog ConfigurationAuditLog_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfigurationAuditLog"
    ADD CONSTRAINT "ConfigurationAuditLog_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public."Users"(id);


--
-- Name: ConsensusSnapshots ConsensusSnapshots_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: ConsensusSnapshots ConsensusSnapshots_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ConversationMessages ConversationMessages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConversationMessages"
    ADD CONSTRAINT "ConversationMessages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public."Conversations"(id) ON DELETE CASCADE;


--
-- Name: DocumentFigures DocumentFigures_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentFigures"
    ADD CONSTRAINT "DocumentFigures_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: DocumentProcessingResults DocumentProcessingResults_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentProcessingResults"
    ADD CONSTRAINT "DocumentProcessingResults_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: DocumentSections DocumentSections_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSections"
    ADD CONSTRAINT "DocumentSections_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: DocumentTables DocumentTables_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentTables"
    ADD CONSTRAINT "DocumentTables_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


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
-- Name: Edges Edges_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Edges Edges_edge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_edge_type_id_fkey" FOREIGN KEY (edge_type_id) REFERENCES public."EdgeTypes"(id);


--
-- Name: Edges Edges_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


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
-- Name: EvidenceAuditLog EvidenceAuditLog_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public."Users"(id);


--
-- Name: EvidenceAuditLog EvidenceAuditLog_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_evidence_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_evidence_id_1_fkey" FOREIGN KEY (evidence_id_1) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_evidence_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_evidence_id_2_fkey" FOREIGN KEY (evidence_id_2) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_merged_into_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_merged_into_evidence_id_fkey" FOREIGN KEY (merged_into_evidence_id) REFERENCES public."Evidence"(id);


--
-- Name: EvidenceDuplicates EvidenceDuplicates_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


--
-- Name: EvidenceFiles EvidenceFiles_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceFiles"
    ADD CONSTRAINT "EvidenceFiles_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES public."Users"(id);


--
-- Name: EvidenceFiles EvidenceFiles_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceFiles"
    ADD CONSTRAINT "EvidenceFiles_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceFiles EvidenceFiles_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceFiles"
    ADD CONSTRAINT "EvidenceFiles_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public."Users"(id);


--
-- Name: EvidenceMetadata EvidenceMetadata_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public."EvidenceReviews"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviews EvidenceReviews_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviews EvidenceReviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: EvidenceSearchIndex EvidenceSearchIndex_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceSearchIndex"
    ADD CONSTRAINT "EvidenceSearchIndex_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceVotes EvidenceVotes_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceVotes EvidenceVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public."Sources"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(id);


--
-- Name: Evidence Evidence_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: ExtractedClaims ExtractedClaims_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExtractedClaims"
    ADD CONSTRAINT "ExtractedClaims_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE SET NULL;


--
-- Name: Graphs Graphs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: FormalInquiries Inquiries_parent_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "Inquiries_parent_inquiry_id_fkey" FOREIGN KEY (parent_inquiry_id) REFERENCES public."FormalInquiries"(id) ON DELETE CASCADE;


--
-- Name: FormalInquiries Inquiries_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "Inquiries_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: FormalInquiries Inquiries_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "Inquiries_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: FormalInquiries Inquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "Inquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: InquiryVotes InquiryVotes_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_inquiry_id_fkey" FOREIGN KEY (inquiry_id) REFERENCES public."FormalInquiries"(id) ON DELETE CASCADE;


--
-- Name: InquiryVotes InquiryVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Methodologies Methodologies_parent_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_parent_methodology_id_fkey" FOREIGN KEY (parent_methodology_id) REFERENCES public."Methodologies"(id) ON DELETE SET NULL;


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
-- Name: Nodes Nodes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."Users"(id);


--
-- Name: Nodes Nodes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Nodes Nodes_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: Nodes Nodes_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_node_type_id_fkey" FOREIGN KEY (node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Nodes Nodes_primary_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_primary_source_id_fkey" FOREIGN KEY (primary_source_id) REFERENCES public."Nodes"(id);


--
-- Name: Notifications Notifications_related_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_related_user_id_fkey" FOREIGN KEY (related_user_id) REFERENCES public."Users"(id) ON DELETE SET NULL;


--
-- Name: Notifications Notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notifications"
    ADD CONSTRAINT "Notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: SourceCredibility SourceCredibility_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SourceCredibility"
    ADD CONSTRAINT "SourceCredibility_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public."Sources"(id) ON DELETE CASCADE;


--
-- Name: Sources Sources_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(id);


--
-- Name: Sources Sources_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: SpamReports SpamReports_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: SpamReports SpamReports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: SpamReports SpamReports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public."Users"(id);


--
-- Name: SystemConfiguration SystemConfiguration_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemConfiguration"
    ADD CONSTRAINT "SystemConfiguration_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public."Users"(id);


--
-- Name: TranscriptSegments TranscriptSegments_transcription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TranscriptSegments"
    ADD CONSTRAINT "TranscriptSegments_transcription_id_fkey" FOREIGN KEY (transcription_id) REFERENCES public."AudioTranscriptions"(id) ON DELETE CASCADE;


--
-- Name: UserMethodologyProgress UserMethodologyProgress_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: UserReputation UserReputation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserReputation"
    ADD CONSTRAINT "UserReputation_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: VeracityScoreHistory VeracityScoreHistory_veracity_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScoreHistory"
    ADD CONSTRAINT "VeracityScoreHistory_veracity_score_id_fkey" FOREIGN KEY (veracity_score_id) REFERENCES public."VeracityScores"(id) ON DELETE CASCADE;


--
-- Name: VeracityScores VeracityScores_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: VeracityScores VeracityScores_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: VideoFrames VideoFrames_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoFrames"
    ADD CONSTRAINT "VideoFrames_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: VideoMetadata VideoMetadata_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoMetadata"
    ADD CONSTRAINT "VideoMetadata_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: VideoScenes VideoScenes_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoScenes"
    ADD CONSTRAINT "VideoScenes_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public."EvidenceFiles"(id) ON DELETE CASCADE;


--
-- Name: VideoScenes VideoScenes_thumbnail_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoScenes"
    ADD CONSTRAINT "VideoScenes_thumbnail_frame_id_fkey" FOREIGN KEY (thumbnail_frame_id) REFERENCES public."VideoFrames"(id) ON DELETE SET NULL;


--
-- Name: NodeReferences fk_node_references_node; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeReferences"
    ADD CONSTRAINT fk_node_references_node FOREIGN KEY (node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: NodeReferences fk_node_references_processed_node; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NodeReferences"
    ADD CONSTRAINT fk_node_references_processed_node FOREIGN KEY (processed_node_id) REFERENCES public."Nodes"(id) ON DELETE SET NULL;


--
-- Name: ChallengeComments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."ChallengeComments" ENABLE ROW LEVEL SECURITY;

--
-- Name: ChallengeVotes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."ChallengeVotes" ENABLE ROW LEVEL SECURITY;

--
-- Name: UserReputation; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."UserReputation" ENABLE ROW LEVEL SECURITY;

--
-- Name: InquiryVoteStats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public."InquiryVoteStats";


--
-- PostgreSQL database dump complete
--

