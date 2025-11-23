--
-- PostgreSQL database dump
--

\restrict BRWvedC6LXeEsOwdcsj04Qtn2HqOpOC4xalL8pJPl0LzrH0oCm7AVoycgoPH8cg

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

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
-- Name: evidence_audit_action; Type: TYPE; Schema: public; Owner: kmk
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


ALTER TYPE public.evidence_audit_action OWNER TO kmk;

--
-- Name: evidence_file_type; Type: TYPE; Schema: public; Owner: kmk
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


ALTER TYPE public.evidence_file_type OWNER TO kmk;

--
-- Name: evidence_quality_flag; Type: TYPE; Schema: public; Owner: kmk
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


ALTER TYPE public.evidence_quality_flag OWNER TO kmk;

--
-- Name: storage_provider; Type: TYPE; Schema: public; Owner: kmk
--

CREATE TYPE public.storage_provider AS ENUM (
    'local',
    's3',
    'gcs',
    'azure',
    'cloudflare_r2',
    'cdn'
);


ALTER TYPE public.storage_provider OWNER TO kmk;

--
-- Name: apply_confidence_score_ceiling(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.apply_confidence_score_ceiling() OWNER TO kmk;

--
-- Name: archive_old_activities(integer); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.archive_old_activities(days_to_keep integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public."GraphActivity"
  SET archived_at = NOW()
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND archived_at IS NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$;


ALTER FUNCTION public.archive_old_activities(days_to_keep integer) OWNER TO kmk;

--
-- Name: award_reputation_points(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.award_reputation_points(p_user_id uuid, p_action text, p_points integer) OWNER TO kmk;

--
-- Name: calculate_challenge_impact(text, uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_challenge_impact(target_type text, target_id uuid) OWNER TO kmk;

--
-- Name: calculate_confidence_score_ceiling(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_confidence_score_ceiling(p_inquiry_id uuid) OWNER TO kmk;

--
-- Name: FUNCTION calculate_confidence_score_ceiling(p_inquiry_id uuid); Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON FUNCTION public.calculate_confidence_score_ceiling(p_inquiry_id uuid) IS 'Implements weakest link rule: confidence score capped by lowest related node credibility.';


--
-- Name: calculate_consensus_score(text, uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_consensus_score(target_type text, target_id uuid) OWNER TO kmk;

--
-- Name: calculate_evidence_quality_score(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_evidence_quality_score(p_evidence_id uuid) OWNER TO kmk;

--
-- Name: calculate_evidence_weight(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_evidence_weight(evidence_id uuid) OWNER TO kmk;

--
-- Name: calculate_temporal_decay(date, real, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_temporal_decay(relevant_date date, decay_rate real, reference_date timestamp with time zone) OWNER TO kmk;

--
-- Name: calculate_user_level(integer); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.calculate_user_level(points integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN FLOOR(SQRT(points::NUMERIC / 100));
END;
$$;


ALTER FUNCTION public.calculate_user_level(points integer) OWNER TO kmk;

--
-- Name: FUNCTION calculate_user_level(points integer); Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON FUNCTION public.calculate_user_level(points integer) IS 'Calculates user level using formula: floor(sqrt(total_points / 100))';


--
-- Name: calculate_user_reputation_tier(integer); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_user_reputation_tier(reputation_score integer) OWNER TO kmk;

--
-- Name: calculate_veracity_score(text, uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_veracity_score(target_type text, target_id uuid) OWNER TO kmk;

--
-- Name: calculate_vote_weight(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.calculate_vote_weight(user_id uuid) OWNER TO kmk;

--
-- Name: can_user_challenge(uuid, uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.can_user_challenge(p_user_id uuid, p_challenge_type_id uuid) OWNER TO kmk;

--
-- Name: check_curator_permission(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.check_curator_permission(p_user_id uuid, p_permission_type text, p_resource_type text, p_action text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_curator_id uuid;
    v_role_id uuid;
BEGIN
    -- Get active curator record
    SELECT uc.id, uc.role_id INTO v_curator_id, v_role_id
    FROM public."UserCurators" uc
    WHERE uc.user_id = p_user_id
      AND uc.status = 'active'
    LIMIT 1;

    IF v_curator_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check for user-specific permission overrides first
    SELECT
        CASE p_action
            WHEN 'create' THEN COALESCE(cp.can_create, false)
            WHEN 'read' THEN COALESCE(cp.can_read, false)
            WHEN 'edit' THEN COALESCE(cp.can_edit, false)
            WHEN 'delete' THEN COALESCE(cp.can_delete, false)
            WHEN 'approve' THEN COALESCE(cp.can_approve, false)
            WHEN 'reject' THEN COALESCE(cp.can_reject, false)
            ELSE false
        END INTO v_has_permission
    FROM public."CuratorPermissions" cp
    WHERE cp.user_curator_id = v_curator_id
      AND cp.permission_type = p_permission_type
      AND (cp.resource_type = p_resource_type OR cp.resource_type = 'all')
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
      AND cp.override_type IN ('grant', 'modify')
    LIMIT 1;

    IF v_has_permission THEN
        RETURN true;
    END IF;

    -- Check revocations
    SELECT
        CASE p_action
            WHEN 'create' THEN COALESCE(cp.can_create, false)
            WHEN 'read' THEN COALESCE(cp.can_read, false)
            WHEN 'edit' THEN COALESCE(cp.can_edit, false)
            WHEN 'delete' THEN COALESCE(cp.can_delete, false)
            WHEN 'approve' THEN COALESCE(cp.can_approve, false)
            WHEN 'reject' THEN COALESCE(cp.can_reject, false)
            ELSE false
        END INTO v_has_permission
    FROM public."CuratorPermissions" cp
    WHERE cp.user_curator_id = v_curator_id
      AND cp.permission_type = p_permission_type
      AND (cp.resource_type = p_resource_type OR cp.resource_type = 'all')
      AND (cp.expires_at IS NULL OR cp.expires_at > NOW())
      AND cp.override_type = 'revoke'
    LIMIT 1;

    IF v_has_permission THEN
        RETURN false; -- Explicitly revoked
    END IF;

    -- Check role-based permissions
    SELECT
        CASE p_action
            WHEN 'create' THEN rp.can_create
            WHEN 'read' THEN rp.can_read
            WHEN 'edit' THEN rp.can_edit
            WHEN 'delete' THEN rp.can_delete
            WHEN 'approve' THEN rp.can_approve
            WHEN 'reject' THEN rp.can_reject
            ELSE false
        END INTO v_has_permission
    FROM public."RolePermissions" rp
    WHERE rp.role_id = v_role_id
      AND rp.permission_type = p_permission_type
      AND (rp.resource_type = p_resource_type OR rp.resource_type = 'all')
    LIMIT 1;

    RETURN COALESCE(v_has_permission, false);
END;
$$;


ALTER FUNCTION public.check_curator_permission(p_user_id uuid, p_permission_type text, p_resource_type text, p_action text) OWNER TO kmk;

--
-- Name: FUNCTION check_curator_permission(p_user_id uuid, p_permission_type text, p_resource_type text, p_action text); Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON FUNCTION public.check_curator_permission(p_user_id uuid, p_permission_type text, p_resource_type text, p_action text) IS 'Checks if a user has a specific curator permission, considering role permissions and overrides';


--
-- Name: check_evidence_level_0(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.check_evidence_level_0() OWNER TO kmk;

--
-- Name: cleanup_expired_locks(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.cleanup_expired_locks() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."GraphLocks"
    SET released_at = now()
    WHERE released_at IS NULL
    AND expires_at < now();
END;
$$;


ALTER FUNCTION public.cleanup_expired_locks() OWNER TO kmk;

--
-- Name: cleanup_expired_presence(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.cleanup_expired_presence() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."UserPresence"
    SET status = 'offline', disconnected_at = now()
    WHERE status != 'offline'
    AND last_heartbeat < now() - INTERVAL '1 minute';
END;
$$;


ALTER FUNCTION public.cleanup_expired_presence() OWNER TO kmk;

--
-- Name: detect_duplicate_evidence(uuid, text); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.detect_duplicate_evidence(p_evidence_id uuid, p_file_hash text) OWNER TO kmk;

--
-- Name: expire_old_invitations(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.expire_old_invitations() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public."GraphInvitations"
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows;
END;
$$;


ALTER FUNCTION public.expire_old_invitations() OWNER TO kmk;

--
-- Name: invalidate_eligibility_cache(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.invalidate_eligibility_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Delete cached eligibility to force recalculation
  DELETE FROM public."PromotionEligibilityCache"
  WHERE graph_id = COALESCE(NEW.graph_id, OLD.graph_id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.invalidate_eligibility_cache() OWNER TO kmk;

--
-- Name: log_curator_action(uuid, uuid, text, text, uuid, jsonb, jsonb, text, inet, text); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.log_curator_action(p_curator_id uuid, p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid, p_old_value jsonb DEFAULT NULL::jsonb, p_new_value jsonb DEFAULT NULL::jsonb, p_reason text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_audit_id uuid;
    v_requires_review BOOLEAN := false;
BEGIN
    -- Determine if this action requires peer review
    SELECT rp.requires_peer_review INTO v_requires_review
    FROM public."UserCurators" uc
    JOIN public."RolePermissions" rp ON rp.role_id = uc.role_id
    WHERE uc.id = p_curator_id
      AND uc.status = 'active'
    LIMIT 1;

    -- Insert audit log entry
    INSERT INTO public."CuratorAuditLog" (
        curator_id,
        user_id,
        action_type,
        resource_type,
        resource_id,
        old_value,
        new_value,
        changes,
        reason,
        requires_peer_review,
        ip_address,
        user_agent
    ) VALUES (
        p_curator_id,
        p_user_id,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_old_value,
        p_new_value,
        jsonb_build_object('old', p_old_value, 'new', p_new_value),
        p_reason,
        COALESCE(v_requires_review, false),
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_audit_id;

    -- Update curator metrics
    UPDATE public."UserCurators"
    SET total_actions = total_actions + 1,
        updated_at = NOW()
    WHERE id = p_curator_id;

    RETURN v_audit_id;
END;
$$;


ALTER FUNCTION public.log_curator_action(p_curator_id uuid, p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid, p_old_value jsonb, p_new_value jsonb, p_reason text, p_ip_address inet, p_user_agent text) OWNER TO kmk;

--
-- Name: FUNCTION log_curator_action(p_curator_id uuid, p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid, p_old_value jsonb, p_new_value jsonb, p_reason text, p_ip_address inet, p_user_agent text); Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON FUNCTION public.log_curator_action(p_curator_id uuid, p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id uuid, p_old_value jsonb, p_new_value jsonb, p_reason text, p_ip_address inet, p_user_agent text) IS 'Logs a curator action to the audit trail and updates curator metrics';


--
-- Name: log_evidence_audit(uuid, public.evidence_audit_action, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.log_evidence_audit(p_evidence_id uuid, p_action public.evidence_audit_action, p_actor_id uuid, p_changes jsonb, p_description text) OWNER TO kmk;

--
-- Name: refresh_inquiry_vote_stats(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.refresh_inquiry_vote_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public."InquiryVoteStats";
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.refresh_inquiry_vote_stats() OWNER TO kmk;

--
-- Name: refresh_veracity_score(text, uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.refresh_veracity_score(target_type text, target_id uuid, change_reason text, triggering_entity_type text, triggering_entity_id uuid) OWNER TO kmk;

--
-- Name: reset_daily_challenge_count(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.reset_daily_challenge_count() OWNER TO kmk;

--
-- Name: resolve_challenge(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.resolve_challenge(p_challenge_id uuid, p_resolver_id uuid, p_resolution_reason text) OWNER TO kmk;

--
-- Name: trigger_detect_duplicates_on_upload(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_detect_duplicates_on_upload() OWNER TO kmk;

--
-- Name: trigger_evidence_audit_log(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_evidence_audit_log() OWNER TO kmk;

--
-- Name: trigger_set_voting_deadline(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_set_voting_deadline() OWNER TO kmk;

--
-- Name: trigger_source_credibility_update(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_source_credibility_update() OWNER TO kmk;

--
-- Name: trigger_update_challenge_stats(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_update_challenge_stats() OWNER TO kmk;

--
-- Name: trigger_update_evidence_search_index(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_update_evidence_search_index() OWNER TO kmk;

--
-- Name: trigger_update_review_helpfulness(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_update_review_helpfulness() OWNER TO kmk;

--
-- Name: trigger_veracity_refresh_on_challenge(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_veracity_refresh_on_challenge() OWNER TO kmk;

--
-- Name: trigger_veracity_refresh_on_evidence(); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.trigger_veracity_refresh_on_evidence() OWNER TO kmk;

--
-- Name: update_application_vote_counts(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_application_vote_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."CuratorApplications"
    SET
        votes_for = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'for'
        ),
        votes_against = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'against'
        ),
        votes_abstain = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id AND vote = 'abstain'
        ),
        total_voting_weight = (
            SELECT COALESCE(SUM(vote_weight), 0)
            FROM public."CuratorApplicationVotes"
            WHERE application_id = NEW.application_id
        ),
        updated_at = NOW()
    WHERE id = NEW.application_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_application_vote_counts() OWNER TO kmk;

--
-- Name: update_challenge_voting_stats(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.update_challenge_voting_stats(p_challenge_id uuid) OWNER TO kmk;

--
-- Name: update_curator_metrics(uuid); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_curator_metrics(p_curator_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total INTEGER;
    v_approved INTEGER;
    v_overturned INTEGER;
    v_avg_rating REAL;
BEGIN
    -- Get action counts
    SELECT COUNT(*) INTO v_total
    FROM public."CuratorAuditLog"
    WHERE curator_id = p_curator_id;

    -- Get approved actions (those with positive peer reviews)
    SELECT COUNT(DISTINCT cal.id) INTO v_approved
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.verdict IN ('approved', 'approved_with_notes');

    -- Get overturned actions
    SELECT COUNT(DISTINCT cal.id) INTO v_overturned
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.verdict = 'recommend_overturn';

    -- Get average peer review rating
    SELECT AVG(cr.rating) INTO v_avg_rating
    FROM public."CuratorAuditLog" cal
    JOIN public."CuratorReviews" cr ON cr.audit_log_id = cal.id
    WHERE cal.curator_id = p_curator_id
      AND cr.rating IS NOT NULL;

    -- Update metrics
    UPDATE public."UserCurators"
    SET
        total_actions = v_total,
        approved_actions = COALESCE(v_approved, 0),
        overturned_actions = COALESCE(v_overturned, 0),
        accuracy_rate = CASE
            WHEN v_total > 0 THEN
                GREATEST(0.0, LEAST(1.0, (v_total - COALESCE(v_overturned, 0))::REAL / v_total))
            ELSE 0.0
        END,
        peer_review_score = COALESCE(v_avg_rating / 5.0, 0.0),
        updated_at = NOW()
    WHERE id = p_curator_id;
END;
$$;


ALTER FUNCTION public.update_curator_metrics(p_curator_id uuid) OWNER TO kmk;

--
-- Name: update_graph_timestamp(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_graph_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public."Graphs"
    SET updated_at = now()
    WHERE id = NEW.graph_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_graph_timestamp() OWNER TO kmk;

--
-- Name: update_session_activity(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_session_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public."CollaborationSessions"
  SET last_activity = NOW()
  WHERE session_id = NEW.session_id
    AND ended_at IS NULL;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_session_activity() OWNER TO kmk;

--
-- Name: update_source_credibility(uuid); Type: FUNCTION; Schema: public; Owner: kmk
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


ALTER FUNCTION public.update_source_credibility(p_source_id uuid) OWNER TO kmk;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO kmk;

--
-- Name: update_user_level(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_user_level() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.level := GREATEST(1, calculate_user_level(NEW.total_points));
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_level() OWNER TO kmk;

--
-- Name: update_vote_weights_on_reputation_change(); Type: FUNCTION; Schema: public; Owner: kmk
--

CREATE FUNCTION public.update_vote_weights_on_reputation_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update all votes by this user with new reputation score
  UPDATE public."ConsensusVotes"
  SET vote_weight = GREATEST(NEW.overall_reputation_score, 0.5),
      voter_reputation_score = NEW.overall_reputation_score,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_vote_weights_on_reputation_change() OWNER TO kmk;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Achievements; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."Achievements" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(100),
    category character varying(50) NOT NULL,
    points integer DEFAULT 0,
    criteria jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievements_category_check" CHECK (((category)::text = ANY ((ARRAY['evidence'::character varying, 'methodology'::character varying, 'consensus'::character varying, 'collaboration'::character varying])::text[]))),
    CONSTRAINT "Achievements_points_check" CHECK ((points >= 0))
);


ALTER TABLE public."Achievements" OWNER TO kmk;

--
-- Name: TABLE "Achievements"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."Achievements" IS 'Stores achievement definitions with criteria for unlocking';


--
-- Name: COLUMN "Achievements".criteria; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."Achievements".criteria IS 'JSON object defining achievement unlock conditions, e.g., { "type": "count", "metric": "evidence_submitted", "threshold": 10 }';


--
-- Name: ChallengeTypes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ChallengeTypes" OWNER TO kmk;

--
-- Name: Challenges; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."Challenges" OWNER TO kmk;

--
-- Name: UserReputation; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."UserReputation" OWNER TO kmk;

--
-- Name: TABLE "UserReputation"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserReputation" IS 'Stores user reputation points, level, and category-specific points';


--
-- Name: Users; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."Users" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    display_name text,
    last_active timestamp with time zone,
    preferences jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public."Users" OWNER TO kmk;

--
-- Name: ActiveChallengesView; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."ActiveChallengesView" OWNER TO kmk;

--
-- Name: CuratorRoles; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorRoles" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_name text NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL,
    responsibilities text[] DEFAULT '{}'::text[] NOT NULL,
    tier integer DEFAULT 1 NOT NULL,
    min_reputation_required integer DEFAULT 1000 NOT NULL,
    min_contributions_required integer DEFAULT 50 NOT NULL,
    expertise_areas_required text[] DEFAULT '{}'::text[] NOT NULL,
    requires_application boolean DEFAULT true NOT NULL,
    requires_community_vote boolean DEFAULT true NOT NULL,
    min_votes_required integer DEFAULT 10,
    approval_threshold real DEFAULT 0.7,
    icon text,
    color text,
    badge_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CuratorRoles_approval_threshold_check" CHECK (((approval_threshold >= (0.5)::double precision) AND (approval_threshold <= (1.0)::double precision))),
    CONSTRAINT "CuratorRoles_role_name_check" CHECK ((role_name = ANY (ARRAY['community_curator'::text, 'domain_expert'::text, 'methodology_specialist'::text, 'fact_checker'::text, 'source_validator'::text]))),
    CONSTRAINT "CuratorRoles_tier_check" CHECK (((tier >= 1) AND (tier <= 5)))
);


ALTER TABLE public."CuratorRoles" OWNER TO kmk;

--
-- Name: TABLE "CuratorRoles"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."CuratorRoles" IS 'Defines curator roles with their responsibilities, requirements, and permission levels';


--
-- Name: UserCurators; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."UserCurators" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by_user_id uuid,
    expires_at timestamp with time zone,
    expertise_areas text[] DEFAULT '{}'::text[] NOT NULL,
    specialization_tags text[] DEFAULT '{}'::text[],
    total_actions integer DEFAULT 0 NOT NULL,
    approved_actions integer DEFAULT 0 NOT NULL,
    rejected_actions integer DEFAULT 0 NOT NULL,
    overturned_actions integer DEFAULT 0 NOT NULL,
    peer_review_score real DEFAULT 0.0,
    community_trust_score real DEFAULT 0.0,
    accuracy_rate real DEFAULT 0.0,
    warnings_received integer DEFAULT 0 NOT NULL,
    last_warning_at timestamp with time zone,
    suspension_count integer DEFAULT 0 NOT NULL,
    last_suspended_at timestamp with time zone,
    last_review_date timestamp with time zone,
    next_review_date timestamp with time zone,
    review_notes text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "UserCurators_accuracy_rate_check" CHECK (((accuracy_rate >= (0.0)::double precision) AND (accuracy_rate <= (1.0)::double precision))),
    CONSTRAINT "UserCurators_community_trust_score_check" CHECK (((community_trust_score >= (0.0)::double precision) AND (community_trust_score <= (1.0)::double precision))),
    CONSTRAINT "UserCurators_peer_review_score_check" CHECK (((peer_review_score >= (0.0)::double precision) AND (peer_review_score <= (1.0)::double precision))),
    CONSTRAINT "UserCurators_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'under_review'::text, 'retired'::text, 'revoked'::text])))
);


ALTER TABLE public."UserCurators" OWNER TO kmk;

--
-- Name: TABLE "UserCurators"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserCurators" IS 'Links users to curator roles and tracks their performance and accountability metrics';


--
-- Name: ActiveCuratorsView; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."ActiveCuratorsView" AS
 SELECT uc.id AS curator_id,
    uc.user_id,
    u.username,
    u.email,
    cr.role_name,
    cr.display_name AS role_display_name,
    cr.tier,
    uc.status,
    uc.expertise_areas,
    uc.total_actions,
    uc.accuracy_rate,
    uc.peer_review_score,
    uc.community_trust_score,
    uc.assigned_at,
    uc.next_review_date
   FROM ((public."UserCurators" uc
     JOIN public."Users" u ON ((u.id = uc.user_id)))
     JOIN public."CuratorRoles" cr ON ((cr.id = uc.role_id)))
  WHERE (uc.status = 'active'::text);


ALTER VIEW public."ActiveCuratorsView" OWNER TO kmk;

--
-- Name: ChallengeComments; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ChallengeComments" OWNER TO kmk;

--
-- Name: ChallengeEvidence; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."ChallengeEvidence" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    challenge_id uuid NOT NULL,
    evidence_id uuid,
    evidence_type text,
    source_url text,
    source_title text,
    content text NOT NULL,
    excerpt text,
    credibility_score real DEFAULT 0.5,
    relevance_score real DEFAULT 0.5,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    submitted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ChallengeEvidence_credibility_score_check" CHECK (((credibility_score >= (0.0)::double precision) AND (credibility_score <= (1.0)::double precision))),
    CONSTRAINT "ChallengeEvidence_evidence_type_check" CHECK ((evidence_type = ANY (ARRAY['supporting'::text, 'refuting'::text, 'clarifying'::text]))),
    CONSTRAINT "ChallengeEvidence_relevance_score_check" CHECK (((relevance_score >= (0.0)::double precision) AND (relevance_score <= (1.0)::double precision)))
);


ALTER TABLE public."ChallengeEvidence" OWNER TO kmk;

--
-- Name: VeracityScoreHistory; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."VeracityScoreHistory" OWNER TO kmk;

--
-- Name: VeracityScores; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."VeracityScores" OWNER TO kmk;

--
-- Name: ChallengeImpactSummary; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."ChallengeImpactSummary" OWNER TO kmk;

--
-- Name: ChallengeLeaderboard; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."ChallengeLeaderboard" OWNER TO kmk;

--
-- Name: ChallengeNotifications; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ChallengeNotifications" OWNER TO kmk;

--
-- Name: ChallengeResolutions; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ChallengeResolutions" OWNER TO kmk;

--
-- Name: ChallengeVotes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ChallengeVotes" OWNER TO kmk;

--
-- Name: ChatMessages; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."ChatMessages" (
    id uuid NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    archived_at timestamp without time zone,
    CONSTRAINT chat_message_length CHECK ((length(message) <= 1000)),
    CONSTRAINT chat_message_not_empty CHECK ((length(TRIM(BOTH FROM message)) > 0))
);


ALTER TABLE public."ChatMessages" OWNER TO kmk;

--
-- Name: TABLE "ChatMessages"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."ChatMessages" IS 'Real-time chat messages for graph collaboration';


--
-- Name: CollaborationSessions; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CollaborationSessions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id text NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    websocket_id text,
    ip_address inet,
    user_agent text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    last_activity timestamp with time zone DEFAULT now(),
    operations_count integer DEFAULT 0,
    bytes_sent bigint DEFAULT 0,
    bytes_received bigint DEFAULT 0
);


ALTER TABLE public."CollaborationSessions" OWNER TO kmk;

--
-- Name: TABLE "CollaborationSessions"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."CollaborationSessions" IS 'Tracks WebSocket collaboration sessions';


--
-- Name: Comments; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."Comments" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    text text NOT NULL,
    author_id uuid NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT either_node_or_edge_comment CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."Comments" OWNER TO kmk;

--
-- Name: ConsensusSnapshots; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."ConsensusSnapshots" OWNER TO kmk;

--
-- Name: ConsensusVotes; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."ConsensusVotes" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_value numeric(3,2) NOT NULL,
    reasoning text,
    vote_weight numeric(5,4) DEFAULT 0.5 NOT NULL,
    voter_reputation_score numeric(5,4) DEFAULT 0.5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "ConsensusVotes_vote_value_check" CHECK (((vote_value >= (0)::numeric) AND (vote_value <= (1)::numeric)))
);


ALTER TABLE public."ConsensusVotes" OWNER TO kmk;

--
-- Name: TABLE "ConsensusVotes"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."ConsensusVotes" IS 'Egalitarian voting system - anyone can vote, weighted by reputation';


--
-- Name: COLUMN "ConsensusVotes".vote_value; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."ConsensusVotes".vote_value IS 'Vote value: 0.0 = reject, 1.0 = approve';


--
-- Name: COLUMN "ConsensusVotes".vote_weight; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."ConsensusVotes".vote_weight IS 'Calculated weight based on voter reputation';


--
-- Name: CuratorApplicationVotes; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorApplicationVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    application_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    vote text NOT NULL,
    vote_weight real DEFAULT 1.0 NOT NULL,
    rationale text,
    voted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    CONSTRAINT "CuratorApplicationVotes_vote_check" CHECK ((vote = ANY (ARRAY['for'::text, 'against'::text, 'abstain'::text])))
);


ALTER TABLE public."CuratorApplicationVotes" OWNER TO kmk;

--
-- Name: CuratorApplications; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorApplications" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    application_statement text NOT NULL,
    motivation text NOT NULL,
    expertise_areas text[] DEFAULT '{}'::text[] NOT NULL,
    relevant_experience text,
    sample_contributions text[],
    reputation_at_application integer NOT NULL,
    contributions_at_application integer NOT NULL,
    challenges_won integer DEFAULT 0,
    methodologies_completed integer DEFAULT 0,
    voting_started_at timestamp with time zone,
    voting_deadline timestamp with time zone,
    votes_for integer DEFAULT 0 NOT NULL,
    votes_against integer DEFAULT 0 NOT NULL,
    votes_abstain integer DEFAULT 0 NOT NULL,
    total_voting_weight real DEFAULT 0.0 NOT NULL,
    reviewed_by_user_id uuid,
    reviewed_at timestamp with time zone,
    decision text,
    decision_reason text,
    reviewer_notes text,
    conditions_for_approval text,
    probation_period_days integer,
    submitted_at timestamp with time zone,
    decision_made_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CuratorApplications_decision_check" CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'needs_revision'::text, NULL::text]))),
    CONSTRAINT "CuratorApplications_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'voting'::text, 'approved'::text, 'rejected'::text, 'withdrawn'::text])))
);


ALTER TABLE public."CuratorApplications" OWNER TO kmk;

--
-- Name: TABLE "CuratorApplications"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."CuratorApplications" IS 'Manages the curator application workflow including community voting';


--
-- Name: CuratorAuditLog; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorAuditLog" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    curator_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changes jsonb,
    reason text,
    notes text,
    related_evidence_ids uuid[],
    requires_peer_review boolean DEFAULT false NOT NULL,
    peer_reviewed boolean DEFAULT false NOT NULL,
    peer_review_status text,
    ip_address inet,
    user_agent text,
    session_id text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT "CuratorAuditLog_action_type_check" CHECK ((action_type = ANY (ARRAY['create_node'::text, 'edit_node'::text, 'delete_node'::text, 'create_edge'::text, 'edit_edge'::text, 'delete_edge'::text, 'approve_veracity'::text, 'reject_veracity'::text, 'promote_to_level_0'::text, 'demote_from_level_0'::text, 'validate_source'::text, 'invalidate_source'::text, 'validate_methodology'::text, 'approve_application'::text, 'reject_application'::text, 'assign_curator_role'::text, 'revoke_curator_role'::text, 'moderate_content'::text, 'override_consensus'::text, 'other'::text]))),
    CONSTRAINT "CuratorAuditLog_peer_review_status_check" CHECK ((peer_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'flagged'::text, 'overturned'::text, NULL::text]))),
    CONSTRAINT "CuratorAuditLog_resource_type_check" CHECK ((resource_type = ANY (ARRAY['node'::text, 'edge'::text, 'source'::text, 'methodology'::text, 'application'::text, 'user'::text, 'curator'::text, 'challenge'::text, 'veracity_score'::text])))
);


ALTER TABLE public."CuratorAuditLog" OWNER TO kmk;

--
-- Name: TABLE "CuratorAuditLog"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."CuratorAuditLog" IS 'Comprehensive audit trail of all curator actions for transparency and accountability';


--
-- Name: CuratorAuditLogView; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."CuratorAuditLogView" AS
SELECT
    NULL::uuid AS audit_id,
    NULL::uuid AS curator_id,
    NULL::uuid AS user_id,
    NULL::text AS curator_username,
    NULL::text AS curator_role,
    NULL::text AS action_type,
    NULL::text AS resource_type,
    NULL::uuid AS resource_id,
    NULL::text AS reason,
    NULL::boolean AS requires_peer_review,
    NULL::boolean AS peer_reviewed,
    NULL::text AS peer_review_status,
    NULL::timestamp with time zone AS performed_at,
    NULL::bigint AS review_count;


ALTER VIEW public."CuratorAuditLogView" OWNER TO kmk;

--
-- Name: CuratorPermissions; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorPermissions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_curator_id uuid NOT NULL,
    permission_type text NOT NULL,
    resource_type text,
    override_type text NOT NULL,
    can_create boolean,
    can_read boolean,
    can_edit boolean,
    can_delete boolean,
    can_approve boolean,
    can_reject boolean,
    can_promote_to_level_0 boolean,
    can_demote_from_level_0 boolean,
    max_daily_actions integer,
    granted_by_user_id uuid NOT NULL,
    reason text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CuratorPermissions_override_type_check" CHECK ((override_type = ANY (ARRAY['grant'::text, 'revoke'::text, 'modify'::text]))),
    CONSTRAINT "CuratorPermissions_permission_type_check" CHECK ((permission_type = ANY (ARRAY['level_0_content'::text, 'level_0_nodes'::text, 'level_0_edges'::text, 'veracity_approval'::text, 'methodology_validation'::text, 'source_validation'::text, 'curator_review'::text, 'user_moderation'::text, 'application_review'::text]))),
    CONSTRAINT "CuratorPermissions_resource_type_check" CHECK ((resource_type = ANY (ARRAY['node'::text, 'edge'::text, 'source'::text, 'methodology'::text, 'user'::text, 'application'::text, 'challenge'::text, 'all'::text])))
);


ALTER TABLE public."CuratorPermissions" OWNER TO kmk;

--
-- Name: CuratorReviews; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."CuratorReviews" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    audit_log_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL,
    review_type text NOT NULL,
    rating integer,
    verdict text NOT NULL,
    comments text NOT NULL,
    specific_concerns text[],
    recommendations text[],
    action_required boolean DEFAULT false NOT NULL,
    action_taken text,
    escalated boolean DEFAULT false NOT NULL,
    escalated_to_user_id uuid,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CuratorReviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT "CuratorReviews_review_type_check" CHECK ((review_type = ANY (ARRAY['routine_review'::text, 'flag_investigation'::text, 'quality_check'::text, 'appeal_review'::text, 'audit_review'::text]))),
    CONSTRAINT "CuratorReviews_verdict_check" CHECK ((verdict = ANY (ARRAY['approved'::text, 'approved_with_notes'::text, 'flagged_minor'::text, 'flagged_major'::text, 'recommend_overturn'::text, 'recommend_warning'::text])))
);


ALTER TABLE public."CuratorReviews" OWNER TO kmk;

--
-- Name: TABLE "CuratorReviews"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."CuratorReviews" IS 'Peer reviews of curator actions for quality control';


--
-- Name: EdgeTypes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EdgeTypes" OWNER TO kmk;

--
-- Name: Edges; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."Edges" OWNER TO kmk;

--
-- Name: Evidence; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."Evidence" OWNER TO kmk;

--
-- Name: EvidenceAuditLog; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceAuditLog" OWNER TO kmk;

--
-- Name: EvidenceDuplicates; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceDuplicates" OWNER TO kmk;

--
-- Name: EvidenceMetadata; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceMetadata" OWNER TO kmk;

--
-- Name: EvidenceReviewVotes; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."EvidenceReviewVotes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "EvidenceReviewVotes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['helpful'::text, 'not_helpful'::text])))
);


ALTER TABLE public."EvidenceReviewVotes" OWNER TO kmk;

--
-- Name: EvidenceReviews; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceReviews" OWNER TO kmk;

--
-- Name: EvidenceSearchIndex; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceSearchIndex" OWNER TO kmk;

--
-- Name: SourceCredibility; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."SourceCredibility" OWNER TO kmk;

--
-- Name: Sources; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."Sources" OWNER TO kmk;

--
-- Name: EvidenceSummary; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."EvidenceSummary" OWNER TO kmk;

--
-- Name: EvidenceVotes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."EvidenceVotes" OWNER TO kmk;

--
-- Name: FormalInquiries; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."FormalInquiries" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    target_node_id uuid,
    target_edge_id uuid,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    content text NOT NULL,
    confidence_score numeric(3,2),
    max_allowed_score numeric(3,2),
    ai_determination text,
    ai_rationale text,
    evaluated_at timestamp with time zone,
    evaluated_by character varying(50) DEFAULT 'ai'::character varying,
    related_node_ids uuid[] DEFAULT '{}'::uuid[],
    weakest_node_credibility numeric(3,2),
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT "FormalInquiries_confidence_score_check" CHECK (((confidence_score >= 0.00) AND (confidence_score <= 1.00))),
    CONSTRAINT "FormalInquiries_max_allowed_score_check" CHECK (((max_allowed_score >= 0.00) AND (max_allowed_score <= 1.00))),
    CONSTRAINT "FormalInquiries_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'evaluating'::text, 'evaluated'::text, 'resolved'::text, 'withdrawn'::text]))),
    CONSTRAINT either_node_or_edge CHECK ((((target_node_id IS NOT NULL) AND (target_edge_id IS NULL)) OR ((target_node_id IS NULL) AND (target_edge_id IS NOT NULL))))
);


ALTER TABLE public."FormalInquiries" OWNER TO kmk;

--
-- Name: GraphActivity; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."GraphActivity" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "GraphActivity_action_type_check" CHECK ((action_type = ANY (ARRAY['node_created'::text, 'node_updated'::text, 'node_deleted'::text, 'edge_created'::text, 'edge_updated'::text, 'edge_deleted'::text, 'comment_added'::text, 'comment_updated'::text, 'comment_deleted'::text, 'graph_shared'::text, 'permission_changed'::text, 'user_joined'::text, 'user_left'::text]))),
    CONSTRAINT "GraphActivity_entity_type_check" CHECK ((entity_type = ANY (ARRAY['node'::text, 'edge'::text, 'comment'::text, 'graph'::text, 'user'::text])))
);


ALTER TABLE public."GraphActivity" OWNER TO kmk;

--
-- Name: TABLE "GraphActivity"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."GraphActivity" IS 'Logs all activities and changes in graphs';


--
-- Name: GraphInvitations; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."GraphInvitations" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    email text NOT NULL,
    permission text NOT NULL,
    token text NOT NULL,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT "GraphInvitations_permission_check" CHECK ((permission = ANY (ARRAY['view'::text, 'edit'::text, 'admin'::text]))),
    CONSTRAINT "GraphInvitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))
);


ALTER TABLE public."GraphInvitations" OWNER TO kmk;

--
-- Name: TABLE "GraphInvitations"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."GraphInvitations" IS 'Handles graph collaboration invitations';


--
-- Name: GraphLocks; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."GraphLocks" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    lock_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    acquired_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '00:00:30'::interval),
    released_at timestamp with time zone,
    CONSTRAINT "GraphLocks_entity_type_check" CHECK ((entity_type = ANY (ARRAY['graph'::text, 'node'::text, 'edge'::text]))),
    CONSTRAINT "GraphLocks_lock_type_check" CHECK ((lock_type = ANY (ARRAY['read'::text, 'write'::text, 'exclusive'::text])))
);


ALTER TABLE public."GraphLocks" OWNER TO kmk;

--
-- Name: TABLE "GraphLocks"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."GraphLocks" IS 'Pessimistic locking for conflict prevention';


--
-- Name: GraphShares; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."GraphShares" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission text NOT NULL,
    shared_by uuid NOT NULL,
    shared_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    CONSTRAINT "GraphShares_permission_check" CHECK ((permission = ANY (ARRAY['view'::text, 'edit'::text, 'admin'::text])))
);


ALTER TABLE public."GraphShares" OWNER TO kmk;

--
-- Name: TABLE "GraphShares"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."GraphShares" IS 'Manages graph sharing and access permissions';


--
-- Name: Graphs; Type: TABLE; Schema: public; Owner: kmk
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
    is_collaborative boolean DEFAULT false,
    max_collaborators integer DEFAULT 50,
    collaboration_settings jsonb DEFAULT '{"allowInvites": true, "requireApproval": false}'::jsonb,
    CONSTRAINT "Graphs_level_check" CHECK ((level = ANY (ARRAY[0, 1]))),
    CONSTRAINT "Graphs_privacy_check" CHECK ((privacy = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])))
);


ALTER TABLE public."Graphs" OWNER TO kmk;

--
-- Name: PromotionEligibilityCache; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."PromotionEligibilityCache" (
    graph_id uuid NOT NULL,
    methodology_completion_score numeric(5,4) DEFAULT 0,
    consensus_score numeric(5,4) DEFAULT 0,
    evidence_quality_score numeric(5,4) DEFAULT 0,
    challenge_resolution_score numeric(5,4) DEFAULT 0,
    overall_score numeric(5,4) DEFAULT 0,
    is_eligible boolean DEFAULT false,
    blocking_reason text,
    calculated_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."PromotionEligibilityCache" OWNER TO kmk;

--
-- Name: TABLE "PromotionEligibilityCache"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."PromotionEligibilityCache" IS 'Cached eligibility - recalculated on criteria changes';


--
-- Name: GraphsReadyForPromotion; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."GraphsReadyForPromotion" AS
 SELECT g.id,
    g.name,
    g.level,
    pec.overall_score,
    pec.methodology_completion_score,
    pec.consensus_score,
    pec.evidence_quality_score,
    pec.challenge_resolution_score,
    pec.is_eligible,
    pec.calculated_at
   FROM (public."Graphs" g
     JOIN public."PromotionEligibilityCache" pec ON ((g.id = pec.graph_id)))
  WHERE ((pec.is_eligible = true) AND (g.level > 0))
  ORDER BY pec.overall_score DESC;


ALTER VIEW public."GraphsReadyForPromotion" OWNER TO kmk;

--
-- Name: VIEW "GraphsReadyForPromotion"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON VIEW public."GraphsReadyForPromotion" IS 'Graphs that meet all objective promotion criteria';


--
-- Name: InquiryVotes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."InquiryVotes" OWNER TO kmk;

--
-- Name: TABLE "InquiryVotes"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."InquiryVotes" IS 'Community voting on inquiries - shows opinion, NOT evidence quality. Votes do NOT affect confidence scores.';


--
-- Name: InquiryVoteStats; Type: MATERIALIZED VIEW; Schema: public; Owner: kmk
--

CREATE MATERIALIZED VIEW public."InquiryVoteStats" AS
 SELECT inquiry_id,
    count(*) FILTER (WHERE (vote_type = 'agree'::text)) AS agree_count,
    count(*) FILTER (WHERE (vote_type = 'disagree'::text)) AS disagree_count,
    count(*) AS total_votes,
    round(((100.0 * (count(*) FILTER (WHERE (vote_type = 'agree'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS agree_percentage,
    round(((100.0 * (count(*) FILTER (WHERE (vote_type = 'disagree'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS disagree_percentage
   FROM public."InquiryVotes"
  GROUP BY inquiry_id
  WITH NO DATA;


ALTER MATERIALIZED VIEW public."InquiryVoteStats" OWNER TO kmk;

--
-- Name: MATERIALIZED VIEW "InquiryVoteStats"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON MATERIALIZED VIEW public."InquiryVoteStats" IS 'Aggregated vote statistics for inquiries - community opinion only, not truth determination.';


--
-- Name: InquiryWithVotesView; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."InquiryWithVotesView" OWNER TO kmk;

--
-- Name: VIEW "InquiryWithVotesView"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON VIEW public."InquiryWithVotesView" IS 'Shows inquiries with separated credibility (AI-judged) and voting (community opinion) metrics.';


--
-- Name: Level0Edges; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."Level0Edges" AS
 SELECT id,
    graph_id,
    edge_type_id,
    source_node_id,
    target_node_id,
    props,
    meta,
    ai,
    weight,
    is_level_0,
    created_by,
    created_at,
    updated_at
   FROM public."Edges"
  WHERE (is_level_0 = true);


ALTER VIEW public."Level0Edges" OWNER TO kmk;

--
-- Name: Nodes; Type: TABLE; Schema: public; Owner: kmk
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
    CONSTRAINT "Nodes_weight_check" CHECK (((weight >= (0.0)::double precision) AND (weight <= (1.0)::double precision)))
);


ALTER TABLE public."Nodes" OWNER TO kmk;

--
-- Name: Level0Nodes; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."Level0Nodes" AS
 SELECT id,
    graph_id,
    node_type_id,
    props,
    meta,
    ai,
    weight,
    content_hash,
    primary_source_id,
    is_level_0,
    created_by,
    created_at,
    updated_at
   FROM public."Nodes"
  WHERE (is_level_0 = true);


ALTER VIEW public."Level0Nodes" OWNER TO kmk;

--
-- Name: Level1Edges; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."Level1Edges" AS
 SELECT id,
    graph_id,
    edge_type_id,
    source_node_id,
    target_node_id,
    props,
    meta,
    ai,
    weight,
    is_level_0,
    created_by,
    created_at,
    updated_at
   FROM public."Edges"
  WHERE (is_level_0 = false);


ALTER VIEW public."Level1Edges" OWNER TO kmk;

--
-- Name: Level1Nodes; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."Level1Nodes" AS
 SELECT id,
    graph_id,
    node_type_id,
    props,
    meta,
    ai,
    weight,
    content_hash,
    primary_source_id,
    is_level_0,
    created_by,
    created_at,
    updated_at
   FROM public."Nodes"
  WHERE (is_level_0 = false);


ALTER VIEW public."Level1Nodes" OWNER TO kmk;

--
-- Name: Methodologies; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."Methodologies" OWNER TO kmk;

--
-- Name: TABLE "Methodologies"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."Methodologies" IS 'Investigation methodologies that define structured approaches to problem-solving';


--
-- Name: MethodologyEdgeTypes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."MethodologyEdgeTypes" OWNER TO kmk;

--
-- Name: TABLE "MethodologyEdgeTypes"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyEdgeTypes" IS 'Defines the types of edges/relationships allowed in a methodology';


--
-- Name: MethodologyNodeTypes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."MethodologyNodeTypes" OWNER TO kmk;

--
-- Name: TABLE "MethodologyNodeTypes"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyNodeTypes" IS 'Defines the types of nodes allowed in a methodology';


--
-- Name: MethodologyPermissions; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."MethodologyPermissions" OWNER TO kmk;

--
-- Name: TABLE "MethodologyPermissions"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyPermissions" IS 'Permissions for sharing and collaborating on custom methodologies';


--
-- Name: MethodologyStepCompletions; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."MethodologyStepCompletions" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    graph_id uuid NOT NULL,
    step_id uuid NOT NULL,
    completed_by uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    notes text,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_notes text
);


ALTER TABLE public."MethodologyStepCompletions" OWNER TO kmk;

--
-- Name: TABLE "MethodologyStepCompletions"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyStepCompletions" IS 'Objective tracking of methodology step completion';


--
-- Name: MethodologyWorkflowSteps; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."MethodologyWorkflowSteps" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    step_order integer NOT NULL,
    is_required boolean DEFAULT true,
    estimated_duration_minutes integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."MethodologyWorkflowSteps" OWNER TO kmk;

--
-- Name: TABLE "MethodologyWorkflowSteps"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyWorkflowSteps" IS 'Individual steps within methodology workflows';


--
-- Name: MethodologyWorkflows; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."MethodologyWorkflows" OWNER TO kmk;

--
-- Name: TABLE "MethodologyWorkflows"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."MethodologyWorkflows" IS 'Optional guided workflows for methodologies';


--
-- Name: NodeTypes; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."NodeTypes" OWNER TO kmk;

--
-- Name: NotificationPreferences; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."NotificationPreferences" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    graph_id uuid,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    notification_types jsonb DEFAULT '{"shares": true, "changes": true, "comments": true, "mentions": true}'::jsonb,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."NotificationPreferences" OWNER TO kmk;

--
-- Name: OperationHistory; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."OperationHistory" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    graph_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    operation_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    operation jsonb NOT NULL,
    version bigint NOT NULL,
    parent_version bigint,
    transformed_from uuid,
    applied_at timestamp with time zone DEFAULT now(),
    CONSTRAINT "OperationHistory_entity_type_check" CHECK ((entity_type = ANY (ARRAY['node'::text, 'edge'::text, 'property'::text]))),
    CONSTRAINT "OperationHistory_operation_type_check" CHECK ((operation_type = ANY (ARRAY['insert'::text, 'delete'::text, 'update'::text, 'move'::text, 'transform'::text])))
);


ALTER TABLE public."OperationHistory" OWNER TO kmk;

--
-- Name: TABLE "OperationHistory"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."OperationHistory" IS 'Operational Transform history for conflict resolution';


--
-- Name: PendingApplicationsView; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."PendingApplicationsView" AS
 SELECT ca.id AS application_id,
    ca.user_id,
    u.username,
    u.email,
    cr.role_name,
    cr.display_name AS role_display_name,
    ca.status,
    ca.application_statement,
    ca.expertise_areas,
    ca.reputation_at_application,
    ca.votes_for,
    ca.votes_against,
    ca.voting_deadline,
    ca.submitted_at,
        CASE
            WHEN (ca.total_voting_weight > (0)::double precision) THEN ((ca.votes_for)::double precision / ca.total_voting_weight)
            ELSE (0)::double precision
        END AS approval_ratio
   FROM ((public."CuratorApplications" ca
     JOIN public."Users" u ON ((u.id = ca.user_id)))
     JOIN public."CuratorRoles" cr ON ((cr.id = ca.role_id)))
  WHERE (ca.status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'voting'::text]));


ALTER VIEW public."PendingApplicationsView" OWNER TO kmk;

--
-- Name: PromotionEvents; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."PromotionEvents" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    graph_id uuid NOT NULL,
    graph_name character varying(255) NOT NULL,
    previous_level integer NOT NULL,
    new_level integer NOT NULL,
    promoted_at timestamp with time zone DEFAULT now(),
    promotion_reason text,
    methodology_completion_score numeric(5,4),
    consensus_score numeric(5,4),
    evidence_quality_score numeric(5,4),
    challenge_resolution_score numeric(5,4),
    overall_score numeric(5,4)
);


ALTER TABLE public."PromotionEvents" OWNER TO kmk;

--
-- Name: TABLE "PromotionEvents"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."PromotionEvents" IS 'Auditable log of automatic promotions';


--
-- Name: COLUMN "PromotionEvents".promotion_reason; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."PromotionEvents".promotion_reason IS 'Always automatic - no curator discretion';


--
-- Name: RecentPromotions; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."RecentPromotions" AS
 SELECT id,
    graph_id,
    graph_name,
    previous_level,
    new_level,
    promoted_at,
    overall_score
   FROM public."PromotionEvents" pe
  ORDER BY promoted_at DESC
 LIMIT 100;


ALTER VIEW public."RecentPromotions" OWNER TO kmk;

--
-- Name: VIEW "RecentPromotions"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON VIEW public."RecentPromotions" IS 'Recent graph promotions for transparency';


--
-- Name: RolePermissions; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."RolePermissions" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_type text NOT NULL,
    resource_type text,
    can_create boolean DEFAULT false NOT NULL,
    can_read boolean DEFAULT true NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    can_approve boolean DEFAULT false NOT NULL,
    can_reject boolean DEFAULT false NOT NULL,
    can_promote_to_level_0 boolean DEFAULT false NOT NULL,
    can_demote_from_level_0 boolean DEFAULT false NOT NULL,
    can_assign_veracity_score boolean DEFAULT false NOT NULL,
    can_override_consensus boolean DEFAULT false NOT NULL,
    max_daily_actions integer,
    requires_peer_review boolean DEFAULT false NOT NULL,
    requires_second_approval boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "RolePermissions_permission_type_check" CHECK ((permission_type = ANY (ARRAY['level_0_content'::text, 'level_0_nodes'::text, 'level_0_edges'::text, 'veracity_approval'::text, 'methodology_validation'::text, 'source_validation'::text, 'curator_review'::text, 'user_moderation'::text, 'application_review'::text]))),
    CONSTRAINT "RolePermissions_resource_type_check" CHECK ((resource_type = ANY (ARRAY['node'::text, 'edge'::text, 'source'::text, 'methodology'::text, 'user'::text, 'application'::text, 'challenge'::text, 'all'::text])))
);


ALTER TABLE public."RolePermissions" OWNER TO kmk;

--
-- Name: SchemaMigrations; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."SchemaMigrations" (
    id integer NOT NULL,
    version character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    execution_time_ms integer,
    checksum character varying(64),
    success boolean DEFAULT true NOT NULL,
    error_message text
);


ALTER TABLE public."SchemaMigrations" OWNER TO kmk;

--
-- Name: TABLE "SchemaMigrations"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."SchemaMigrations" IS 'Tracks which database migrations have been executed';


--
-- Name: COLUMN "SchemaMigrations".version; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."SchemaMigrations".version IS 'Migration version (e.g., 001, 002, 003)';


--
-- Name: COLUMN "SchemaMigrations".name; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."SchemaMigrations".name IS 'Human-readable migration name';


--
-- Name: COLUMN "SchemaMigrations".checksum; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."SchemaMigrations".checksum IS 'SHA-256 checksum of migration file content';


--
-- Name: SchemaMigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: kmk
--

CREATE SEQUENCE public."SchemaMigrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SchemaMigrations_id_seq" OWNER TO kmk;

--
-- Name: SchemaMigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kmk
--

ALTER SEQUENCE public."SchemaMigrations_id_seq" OWNED BY public."SchemaMigrations".id;


--
-- Name: SpamReports; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."SpamReports" OWNER TO kmk;

--
-- Name: UserReputationCache; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."UserReputationCache" (
    user_id uuid NOT NULL,
    evidence_quality_score numeric(5,4) DEFAULT 0,
    total_evidence_submitted integer DEFAULT 0,
    verified_evidence_count integer DEFAULT 0,
    rejected_evidence_count integer DEFAULT 0,
    total_votes_cast integer DEFAULT 0,
    vote_alignment_score numeric(5,4) DEFAULT 0,
    methodology_completions integer DEFAULT 0,
    challenges_raised integer DEFAULT 0,
    challenges_resolved integer DEFAULT 0,
    overall_reputation_score numeric(5,4) DEFAULT 0.5,
    calculated_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."UserReputationCache" OWNER TO kmk;

--
-- Name: TABLE "UserReputationCache"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserReputationCache" IS 'Cached reputation scores - recalculated on demand';


--
-- Name: COLUMN "UserReputationCache".overall_reputation_score; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."UserReputationCache".overall_reputation_score IS 'Used for vote weighting - objective calculation';


--
-- Name: TopContributors; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."TopContributors" AS
 SELECT u.id,
    u.username,
    urc.overall_reputation_score,
    urc.evidence_quality_score,
    urc.total_evidence_submitted,
    urc.total_votes_cast,
    urc.methodology_completions,
    urc.calculated_at
   FROM (public."Users" u
     JOIN public."UserReputationCache" urc ON ((u.id = urc.user_id)))
  ORDER BY urc.overall_reputation_score DESC
 LIMIT 100;


ALTER VIEW public."TopContributors" OWNER TO kmk;

--
-- Name: VIEW "TopContributors"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON VIEW public."TopContributors" IS 'Top contributors by objective reputation score';


--
-- Name: UserAchievements; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."UserAchievements" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    progress jsonb
);


ALTER TABLE public."UserAchievements" OWNER TO kmk;

--
-- Name: TABLE "UserAchievements"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserAchievements" IS 'Tracks which achievements users have earned and their progress';


--
-- Name: COLUMN "UserAchievements".progress; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON COLUMN public."UserAchievements".progress IS 'JSON object tracking current progress towards achievement, e.g., { "current": 7, "total": 10 }';


--
-- Name: UserAchievementProgress; Type: VIEW; Schema: public; Owner: kmk
--

CREATE VIEW public."UserAchievementProgress" AS
 SELECT u.id AS user_id,
    u.username,
    a.id AS achievement_id,
    a.key AS achievement_key,
    a.name AS achievement_name,
    a.category,
    a.points,
    ua.earned_at,
    ua.progress,
        CASE
            WHEN (ua.id IS NOT NULL) THEN true
            ELSE false
        END AS is_earned
   FROM ((public."Users" u
     CROSS JOIN public."Achievements" a)
     LEFT JOIN public."UserAchievements" ua ON (((ua.user_id = u.id) AND (ua.achievement_id = a.id))));


ALTER VIEW public."UserAchievementProgress" OWNER TO kmk;

--
-- Name: UserMethodologyProgress; Type: TABLE; Schema: public; Owner: kmk
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


ALTER TABLE public."UserMethodologyProgress" OWNER TO kmk;

--
-- Name: TABLE "UserMethodologyProgress"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserMethodologyProgress" IS 'Tracks user progress through methodology workflows';


--
-- Name: UserPresence; Type: TABLE; Schema: public; Owner: kmk
--

CREATE TABLE public."UserPresence" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    graph_id uuid NOT NULL,
    session_id text NOT NULL,
    status text DEFAULT 'online'::text NOT NULL,
    cursor_position jsonb,
    selected_nodes uuid[],
    selected_edges uuid[],
    viewport jsonb,
    last_heartbeat timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone DEFAULT now(),
    disconnected_at timestamp with time zone,
    CONSTRAINT "UserPresence_status_check" CHECK ((status = ANY (ARRAY['online'::text, 'idle'::text, 'offline'::text])))
);


ALTER TABLE public."UserPresence" OWNER TO kmk;

--
-- Name: TABLE "UserPresence"; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON TABLE public."UserPresence" IS 'Tracks active users and their cursor positions in graphs';


--
-- Name: VeracityScoresSummary; Type: VIEW; Schema: public; Owner: kmk
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


ALTER VIEW public."VeracityScoresSummary" OWNER TO kmk;

--
-- Name: SchemaMigrations id; Type: DEFAULT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SchemaMigrations" ALTER COLUMN id SET DEFAULT nextval('public."SchemaMigrations_id_seq"'::regclass);


--
-- Data for Name: Achievements; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Achievements" (id, key, name, description, icon, category, points, criteria, created_at) FROM stdin;
\.


--
-- Data for Name: ChallengeComments; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeComments" (id, challenge_id, user_id, parent_comment_id, content, is_edited, edited_at, is_hidden, hidden_reason, hidden_by, upvotes, downvotes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ChallengeEvidence; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeEvidence" (id, challenge_id, evidence_id, evidence_type, source_url, source_title, content, excerpt, credibility_score, relevance_score, is_verified, verified_by, verified_at, submitted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ChallengeNotifications; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeNotifications" (id, user_id, challenge_id, notification_type, title, message, is_read, read_at, is_sent, sent_at, priority, created_at) FROM stdin;
\.


--
-- Data for Name: ChallengeResolutions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeResolutions" (id, challenge_id, resolution_type, resolution_summary, detailed_reasoning, evidence_assessment, veracity_impact, modifications_made, total_votes, support_votes, reject_votes, abstain_votes, weighted_support_percentage, resolved_by, resolver_role, is_appealable, appeal_deadline, was_appealed, appeal_id, created_at) FROM stdin;
\.


--
-- Data for Name: ChallengeTypes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeTypes" (id, type_code, display_name, description, icon, color, min_reputation_required, evidence_required, max_veracity_impact, min_votes_required, acceptance_threshold, voting_duration_hours, guidelines, example_challenges, is_active, created_at, updated_at) FROM stdin;
a6813155-fd8d-4720-aa93-40257561868a	factual_error	Factual Error	The claim contains demonstrably false information	\N	\N	10	t	0.3	5	0.6	72	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
035ee346-2231-459c-91ab-94373be24cce	missing_context	Missing Context	Important context is omitted that changes interpretation	\N	\N	5	t	0.2	5	0.6	72	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
260e78b1-574a-4e9c-a07c-ce01e4a697f6	bias	Bias	The claim shows clear bias or one-sided presentation	\N	\N	15	t	0.15	5	0.6	96	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
a302d028-f898-4de9-8905-65b599e96a56	source_credibility	Source Credibility	The sources cited are unreliable or misrepresented	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
43d3099f-974b-4012-93a0-b01b4b703be4	logical_fallacy	Logical Fallacy	The reasoning contains formal or informal logical fallacies	\N	\N	25	t	0.2	5	0.6	48	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
36fce83a-6f65-489b-8459-5d00bd8c34bc	outdated_information	Outdated Information	The information is no longer current or accurate	\N	\N	5	t	0.15	5	0.6	48	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
59429670-b63d-44a2-aaca-78f398e42dca	misleading_representation	Misleading Representation	Data or facts are presented in a misleading way	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
8f79134d-f0db-4fc9-8653-c2feb5dc9ab9	conflict_of_interest	Conflict of Interest	Undisclosed conflicts affect the credibility	\N	\N	30	t	0.2	5	0.6	96	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
11d12de1-cecf-471e-bb82-bacb5b7f4b3a	methodological_flaw	Methodological Flaw	The methodology used to support the claim is flawed	\N	\N	35	t	0.3	5	0.6	96	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
f29ce7e8-f900-44ac-b0be-04a60d21a883	other	Other	Other type of challenge not covered above	\N	\N	50	t	0.1	5	0.6	120	\N	[]	t	2025-10-09 14:12:22.398983-07	2025-10-09 14:12:22.398983-07
\.


--
-- Data for Name: ChallengeVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChallengeVotes" (id, challenge_id, user_id, vote, confidence, reason, evidence_evaluation, weight, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Challenges; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Challenges" (id, target_node_id, target_edge_id, status, rebuttal_claim, rebuttal_grounds, rebuttal_warrant, created_at, challenge_type_id, challenger_id, title, description, evidence_ids, supporting_sources, severity, voting_starts_at, voting_ends_at, vote_count, support_votes, reject_votes, support_percentage, resolution, resolution_reason, resolved_by, resolved_at, veracity_impact, is_spam, spam_reports, visibility, metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: ChatMessages; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ChatMessages" (id, graph_id, user_id, message, created_at, deleted_at, archived_at) FROM stdin;
\.


--
-- Data for Name: CollaborationSessions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CollaborationSessions" (id, session_id, graph_id, user_id, websocket_id, ip_address, user_agent, started_at, ended_at, last_activity, operations_count, bytes_sent, bytes_received) FROM stdin;
\.


--
-- Data for Name: Comments; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Comments" (id, text, author_id, target_node_id, target_edge_id, created_at) FROM stdin;
\.


--
-- Data for Name: ConsensusSnapshots; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ConsensusSnapshots" (id, target_node_id, target_edge_id, consensus_score, source_count, evidence_count, supporting_ratio, snapshot_at) FROM stdin;
\.


--
-- Data for Name: ConsensusVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."ConsensusVotes" (id, graph_id, user_id, vote_value, reasoning, vote_weight, voter_reputation_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: CuratorApplicationVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorApplicationVotes" (id, application_id, voter_id, vote, vote_weight, rationale, voted_at, ip_address) FROM stdin;
\.


--
-- Data for Name: CuratorApplications; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorApplications" (id, user_id, role_id, status, application_statement, motivation, expertise_areas, relevant_experience, sample_contributions, reputation_at_application, contributions_at_application, challenges_won, methodologies_completed, voting_started_at, voting_deadline, votes_for, votes_against, votes_abstain, total_voting_weight, reviewed_by_user_id, reviewed_at, decision, decision_reason, reviewer_notes, conditions_for_approval, probation_period_days, submitted_at, decision_made_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: CuratorAuditLog; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorAuditLog" (id, curator_id, user_id, action_type, resource_type, resource_id, old_value, new_value, changes, reason, notes, related_evidence_ids, requires_peer_review, peer_reviewed, peer_review_status, ip_address, user_agent, session_id, performed_at, metadata) FROM stdin;
\.


--
-- Data for Name: CuratorPermissions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorPermissions" (id, user_curator_id, permission_type, resource_type, override_type, can_create, can_read, can_edit, can_delete, can_approve, can_reject, can_promote_to_level_0, can_demote_from_level_0, max_daily_actions, granted_by_user_id, reason, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: CuratorReviews; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorReviews" (id, audit_log_id, reviewer_id, reviewer_user_id, review_type, rating, verdict, comments, specific_concerns, recommendations, action_required, action_taken, escalated, escalated_to_user_id, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: CuratorRoles; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."CuratorRoles" (id, role_name, display_name, description, responsibilities, tier, min_reputation_required, min_contributions_required, expertise_areas_required, requires_application, requires_community_vote, min_votes_required, approval_threshold, icon, color, badge_image_url, is_active, created_at, updated_at) FROM stdin;
4a306002-055a-4458-a8a4-d90db6847990	community_curator	Community Curator	General-purpose curator responsible for reviewing community contributions and maintaining platform quality standards.	{"Review community-submitted content for promotion to Level 0","Moderate discussions and resolve disputes","Ensure adherence to community guidelines","Provide feedback on user contributions"}	1	500	25	{community_moderation,content_review}	t	t	10	0.7	\N	\N	\N	t	2025-10-09 14:12:22.664433-07	2025-10-09 14:12:22.664433-07
1049e6b7-8748-40f9-b5d9-12be44955c85	domain_expert	Domain Expert	Subject matter expert with deep knowledge in specific fields, responsible for validating domain-specific claims.	{"Validate claims within their area of expertise","Assess the quality and relevance of domain-specific evidence","Provide expert judgment on complex topics","Mentor other curators in their domain"}	3	1500	75	{domain_expertise,advanced_research}	t	t	10	0.7	\N	\N	\N	t	2025-10-09 14:12:22.664433-07	2025-10-09 14:12:22.664433-07
66cedd65-6df2-45fd-9582-92a3ab29d907	methodology_specialist	Methodology Specialist	Expert in research methodologies who ensures investigations follow rigorous, systematic approaches.	{"Validate that investigations follow proper methodologies","Assess the rigor of research approaches","Guide users in applying formal inquiry methods","Review and approve methodology templates"}	3	1500	75	{methodology,research_methods,logic}	t	t	10	0.7	\N	\N	\N	t	2025-10-09 14:12:22.664433-07	2025-10-09 14:12:22.664433-07
84c96eaf-5bce-4a1f-a050-bc9b12f2e445	fact_checker	Fact Checker	Specialist in verifying factual claims using primary sources and established verification techniques.	{"Verify factual accuracy of claims using primary sources","Cross-reference information across multiple sources","Identify misinformation and disinformation","Document verification processes thoroughly"}	2	1000	50	{fact_checking,source_verification}	t	t	10	0.7	\N	\N	\N	t	2025-10-09 14:12:22.664433-07	2025-10-09 14:12:22.664433-07
1ba1b0d9-c65e-45f2-898b-8b63d53b0dfe	source_validator	Source Validator	Expert in assessing source credibility, authenticity, and identifying primary sources vs derivatives.	{"Assess credibility and reliability of sources","Identify primary sources and distinguish from derivatives","Detect manipulated or fabricated media","Maintain source quality standards"}	2	1000	50	{source_analysis,media_verification}	t	t	10	0.7	\N	\N	\N	t	2025-10-09 14:12:22.664433-07	2025-10-09 14:12:22.664433-07
\.


--
-- Data for Name: EdgeTypes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EdgeTypes" (id, name, props, meta, ai, source_node_type_id, target_node_type_id) FROM stdin;
25000000-0000-0000-0000-000000000001	accused_of	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000002	occurred_at	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000003	located_at	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000004	killed	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000005	created	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000006	documents	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000007	supports	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000008	proposed_by	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000009	contradicts	\N	\N	\N	\N	\N
25000000-0000-0000-0000-000000000010	related_to	\N	\N	\N	\N	\N
ceb60a74-d4be-496c-ae2d-a6c658743771	references	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Edges; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Edges" (id, graph_id, edge_type_id, source_node_id, target_node_id, props, meta, ai, weight, is_level_0, created_by, created_at, updated_at) FROM stdin;
d89687ad-af61-4d03-9073-341b8b9aecda	339e64db-77dd-487e-b26b-28631adb1d12	25000000-0000-0000-0000-000000000007	73c27104-7c50-4dd8-bb52-8ff772745af5	1e09d0f1-2a0b-4e2e-895e-1b9fbb9b4a0b	\N	\N	\N	0.85	f	dac028af-75d9-4603-a294-4bf5d8fe4045	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
\.


--
-- Data for Name: Evidence; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Evidence" (id, target_node_id, target_edge_id, source_id, evidence_type, weight, confidence, content, content_excerpt, page_reference, temporal_relevance, decay_rate, relevant_date, is_verified, verified_by, verified_at, peer_review_status, peer_review_count, metadata, submitted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EvidenceAuditLog; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceAuditLog" (id, evidence_id, action, action_description, actor_id, actor_type, changes, affected_fields, ip_address, user_agent, request_id, session_id, created_at) FROM stdin;
\.


--
-- Data for Name: EvidenceDuplicates; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceDuplicates" (id, evidence_id_1, evidence_id_2, file_hash_match, content_similarity, metadata_similarity, detection_method, status, resolution_notes, resolved_by, resolved_at, merged_into_evidence_id, detected_at) FROM stdin;
\.


--
-- Data for Name: EvidenceMetadata; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceMetadata" (id, evidence_id, authors, author_affiliations, corresponding_author, publication_date, access_date, relevant_date_range, journal, conference, publisher, volume, issue, pages, doi, isbn, issn, pmid, arxiv_id, study_type, methodology, sample_size, study_duration_days, peer_reviewed, preprint, keywords, topics, abstract, summary, language, language_confidence, geolocation, geographic_scope, countries_covered, jurisdiction, legal_context, regulation_reference, license, access_restrictions, paywall, copyright_holder, impact_factor, citation_count, h_index, altmetric_score, data_collection_method, instruments_used, software_used, statistical_methods, funding_sources, conflicts_of_interest, ethical_approval, data_availability, supplementary_materials, custom_metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: EvidenceReviewVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceReviewVotes" (id, review_id, user_id, vote_type, created_at) FROM stdin;
\.


--
-- Data for Name: EvidenceReviews; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceReviews" (id, evidence_id, reviewer_id, quality_score, credibility_score, relevance_score, clarity_score, overall_rating, recommendation, review_text, strengths, weaknesses, suggestions, flags, flag_explanation, reviewer_expertise_level, reviewer_credentials, verified_claims, disputed_claims, helpful_count, not_helpful_count, status, moderation_notes, created_at, updated_at, retracted_at, retraction_reason) FROM stdin;
\.


--
-- Data for Name: EvidenceSearchIndex; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceSearchIndex" (evidence_id, search_content, search_vector, file_types, authors, keywords, topics, publication_years, languages, has_files, file_count, review_count, avg_quality_score, last_updated) FROM stdin;
\.


--
-- Data for Name: EvidenceVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."EvidenceVotes" (id, evidence_id, user_id, vote_type, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: FormalInquiries; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."FormalInquiries" (id, target_node_id, target_edge_id, user_id, title, description, content, confidence_score, max_allowed_score, ai_determination, ai_rationale, evaluated_at, evaluated_by, related_node_ids, weakest_node_credibility, status, created_at, updated_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: GraphActivity; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."GraphActivity" (id, graph_id, user_id, action_type, entity_type, entity_id, old_data, new_data, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: GraphInvitations; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."GraphInvitations" (id, graph_id, email, permission, token, invited_by, invited_at, accepted_at, expires_at, status) FROM stdin;
\.


--
-- Data for Name: GraphLocks; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."GraphLocks" (id, graph_id, user_id, lock_type, entity_type, entity_id, acquired_at, expires_at, released_at) FROM stdin;
\.


--
-- Data for Name: GraphShares; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."GraphShares" (id, graph_id, user_id, permission, shared_by, shared_at, expires_at) FROM stdin;
\.


--
-- Data for Name: Graphs; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Graphs" (id, name, description, level, methodology, privacy, created_by, created_at, updated_at, is_collaborative, max_collaborators, collaboration_settings) FROM stdin;
339e64db-77dd-487e-b26b-28631adb1d12	Climate Research	Demo graph with credibility scores	1	\N	public	dac028af-75d9-4603-a294-4bf5d8fe4045	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08	f	50	{"allowInvites": true, "requireApproval": false}
\.


--
-- Data for Name: InquiryVotes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."InquiryVotes" (id, inquiry_id, user_id, vote_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Methodologies; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Methodologies" (id, name, description, category, status, version, is_system, icon, color, tags, config, usage_count, rating, created_by, parent_methodology_id, created_at, updated_at, published_at) FROM stdin;
\.


--
-- Data for Name: MethodologyEdgeTypes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyEdgeTypes" (id, methodology_id, name, display_name, description, is_directed, valid_source_types, valid_target_types, line_style, arrow_style, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MethodologyNodeTypes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyNodeTypes" (id, methodology_id, name, display_name, description, icon, color, properties_schema, default_properties, required_properties, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MethodologyPermissions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyPermissions" (id, methodology_id, user_id, permission, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: MethodologyStepCompletions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyStepCompletions" (id, graph_id, step_id, completed_by, completed_at, notes, is_verified, verified_by, verified_at, verification_notes) FROM stdin;
\.


--
-- Data for Name: MethodologyWorkflowSteps; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyWorkflowSteps" (id, workflow_id, name, description, step_order, is_required, estimated_duration_minutes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MethodologyWorkflows; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."MethodologyWorkflows" (id, methodology_id, steps, is_linear, allow_skip, instructions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: NodeTypes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."NodeTypes" (id, name, description, props, meta, ai, parent_node_type_id) FROM stdin;
20000000-0000-0000-0000-000000000001	Person	An individual person	\N	\N	\N	\N
20000000-0000-0000-0000-000000000002	Event	A specific event	\N	\N	\N	\N
20000000-0000-0000-0000-000000000003	Location	A place	\N	\N	\N	\N
20000000-0000-0000-0000-000000000004	Evidence	Evidence item	\N	\N	\N	\N
20000000-0000-0000-0000-000000000005	Theory	A hypothesis	\N	\N	\N	\N
cfd9772a-fac4-415d-827b-c87dda02239c	Article	A narrative document that references and connects multiple nodes with additional context and author commentary	\N	\N	\N	\N
ab3cc2d3-7282-40e8-89f8-eee4fe0c140c	Claim	An assertion that may be true or false, subject to verification	\N	\N	\N	\N
7cdf6b21-b6da-447c-bc68-18d694e4f8c8	Fact	Verified factual statement	\N	\N	\N	\N
\.


--
-- Data for Name: Nodes; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Nodes" (id, graph_id, node_type_id, props, meta, ai, weight, content_hash, primary_source_id, is_level_0, created_by, created_at, updated_at) FROM stdin;
73c27104-7c50-4dd8-bb52-8ff772745af5	339e64db-77dd-487e-b26b-28631adb1d12	7cdf6b21-b6da-447c-bc68-18d694e4f8c8	{"title": "CO2 at 420 ppm", "verified": true}	\N	\N	1	\N	\N	f	dac028af-75d9-4603-a294-4bf5d8fe4045	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
34ec3cbf-2664-42d2-bb5b-9107bf35afff	339e64db-77dd-487e-b26b-28631adb1d12	7cdf6b21-b6da-447c-bc68-18d694e4f8c8	{"title": "Global temp +1.1°C", "verified": true}	\N	\N	0.98	\N	\N	f	dac028af-75d9-4603-a294-4bf5d8fe4045	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
4e188e93-6283-41c4-bd01-f2efbb32bd1e	339e64db-77dd-487e-b26b-28631adb1d12	7cdf6b21-b6da-447c-bc68-18d694e4f8c8	{"title": "Sea level rising 3.3mm/year", "verified": true}	\N	\N	0.95	\N	\N	f	dac028af-75d9-4603-a294-4bf5d8fe4045	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
1e09d0f1-2a0b-4e2e-895e-1b9fbb9b4a0b	339e64db-77dd-487e-b26b-28631adb1d12	ab3cc2d3-7282-40e8-89f8-eee4fe0c140c	{"title": "Extreme weather increasing", "status": "under_review"}	\N	\N	0.75	\N	\N	f	5cb8c684-dfd7-4477-aaa0-ba3d0dd6b135	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
f40fabcd-68e0-46a4-acc4-34451d75598a	339e64db-77dd-487e-b26b-28631adb1d12	ab3cc2d3-7282-40e8-89f8-eee4fe0c140c	{"title": "Carbon pricing effective", "status": "under_review"}	\N	\N	0.68	\N	\N	f	5cb8c684-dfd7-4477-aaa0-ba3d0dd6b135	2025-11-21 21:45:49.264104-08	2025-11-21 21:45:49.264104-08
\.


--
-- Data for Name: NotificationPreferences; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."NotificationPreferences" (id, user_id, graph_id, email_enabled, push_enabled, notification_types, quiet_hours_start, quiet_hours_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: OperationHistory; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."OperationHistory" (id, graph_id, user_id, session_id, operation_type, entity_type, entity_id, operation, version, parent_version, transformed_from, applied_at) FROM stdin;
\.


--
-- Data for Name: PromotionEligibilityCache; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."PromotionEligibilityCache" (graph_id, methodology_completion_score, consensus_score, evidence_quality_score, challenge_resolution_score, overall_score, is_eligible, blocking_reason, calculated_at, updated_at) FROM stdin;
\.


--
-- Data for Name: PromotionEvents; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."PromotionEvents" (id, graph_id, graph_name, previous_level, new_level, promoted_at, promotion_reason, methodology_completion_score, consensus_score, evidence_quality_score, challenge_resolution_score, overall_score) FROM stdin;
\.


--
-- Data for Name: RolePermissions; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."RolePermissions" (id, role_id, permission_type, resource_type, can_create, can_read, can_edit, can_delete, can_approve, can_reject, can_promote_to_level_0, can_demote_from_level_0, can_assign_veracity_score, can_override_consensus, max_daily_actions, requires_peer_review, requires_second_approval, description, created_at, updated_at) FROM stdin;
b71a5e76-a451-42e3-9806-a1778a1a1a6a	4a306002-055a-4458-a8a4-d90db6847990	level_0_content	all	f	t	f	f	f	f	f	f	f	f	\N	f	f	Can view Level 0 content but not modify	2025-10-09 14:12:22.665645-07	2025-10-09 14:12:22.665645-07
db53808f-3d21-4d9e-90eb-d0867de011aa	4a306002-055a-4458-a8a4-d90db6847990	veracity_approval	all	f	t	f	f	t	t	f	f	f	f	\N	t	f	Can approve/reject veracity score increases with peer review	2025-10-09 14:12:22.665645-07	2025-10-09 14:12:22.665645-07
cbca5846-42c9-4900-ae7e-927841d4d4ed	4a306002-055a-4458-a8a4-d90db6847990	application_review	application	f	t	t	f	f	f	f	f	f	f	\N	f	f	Can review and comment on curator applications	2025-10-09 14:12:22.665645-07	2025-10-09 14:12:22.665645-07
0d8617a8-dc3b-4623-9bdf-7cb3bfa4cc76	1049e6b7-8748-40f9-b5d9-12be44955c85	level_0_content	all	t	t	t	f	t	t	f	f	f	f	\N	t	f	Can create and edit Level 0 content with peer review	2025-10-09 14:12:22.666428-07	2025-10-09 14:12:22.666428-07
cc70f6cf-ce0b-457f-aaa5-a6ff1726d290	1049e6b7-8748-40f9-b5d9-12be44955c85	veracity_approval	all	f	t	f	f	t	t	f	f	f	f	\N	f	f	Can approve/reject veracity scores in their domain	2025-10-09 14:12:22.666428-07	2025-10-09 14:12:22.666428-07
275c2ffd-5f9d-45ea-9320-d8934e77f479	1049e6b7-8748-40f9-b5d9-12be44955c85	source_validation	source	f	t	t	f	t	t	f	f	f	f	\N	f	f	Can validate sources related to their expertise	2025-10-09 14:12:22.666428-07	2025-10-09 14:12:22.666428-07
02bf1f6e-c19c-4896-bdfe-ce67475bb18a	66cedd65-6df2-45fd-9582-92a3ab29d907	methodology_validation	methodology	t	t	t	f	t	t	f	f	f	f	\N	f	f	Can create, edit, and validate methodologies	2025-10-09 14:12:22.666727-07	2025-10-09 14:12:22.666727-07
b24abbc5-e1b6-4a26-8886-9ec66690b1c1	66cedd65-6df2-45fd-9582-92a3ab29d907	veracity_approval	all	f	t	f	f	t	t	f	f	f	f	\N	f	f	Can approve/reject based on methodology rigor	2025-10-09 14:12:22.666727-07	2025-10-09 14:12:22.666727-07
f08ec89f-4d8f-4b18-8ed8-8549c9b6499f	66cedd65-6df2-45fd-9582-92a3ab29d907	level_0_content	all	f	t	f	f	f	f	f	f	f	f	\N	f	f	Read-only access to Level 0 for methodology review	2025-10-09 14:12:22.666727-07	2025-10-09 14:12:22.666727-07
f63c185c-bf99-4eb3-ae0d-25c34ac9fe84	84c96eaf-5bce-4a1f-a050-bc9b12f2e445	veracity_approval	all	f	t	f	f	t	t	f	f	t	f	\N	f	f	Can verify facts and assign veracity scores	2025-10-09 14:12:22.666956-07	2025-10-09 14:12:22.666956-07
1c45d26c-351f-4ba5-a377-4131f18b9997	84c96eaf-5bce-4a1f-a050-bc9b12f2e445	level_0_nodes	node	f	t	t	f	t	t	f	f	f	f	\N	f	f	Can edit Level 0 nodes after fact verification	2025-10-09 14:12:22.666956-07	2025-10-09 14:12:22.666956-07
7924c6b0-5b3e-4e55-a62e-6b8ec921e63e	84c96eaf-5bce-4a1f-a050-bc9b12f2e445	source_validation	source	f	t	f	f	t	t	f	f	f	f	\N	f	f	Can validate sources used for fact checking	2025-10-09 14:12:22.666956-07	2025-10-09 14:12:22.666956-07
bc2a0d23-3f83-45d5-bfa5-63c805f40807	1ba1b0d9-c65e-45f2-898b-8b63d53b0dfe	source_validation	source	t	t	t	f	t	t	f	f	f	f	\N	f	f	Full control over source validation	2025-10-09 14:12:22.667182-07	2025-10-09 14:12:22.667182-07
964e35ca-8c9d-40e4-a278-de669d058f19	1ba1b0d9-c65e-45f2-898b-8b63d53b0dfe	level_0_content	all	f	t	f	f	f	f	f	f	f	f	\N	f	f	Read-only access to Level 0 for source validation	2025-10-09 14:12:22.667182-07	2025-10-09 14:12:22.667182-07
cfcba5dc-f00a-4443-a3fe-b70d5bed7dbf	1ba1b0d9-c65e-45f2-898b-8b63d53b0dfe	veracity_approval	all	f	t	f	f	t	t	f	f	f	f	\N	f	f	Can approve/reject based on source quality	2025-10-09 14:12:22.667182-07	2025-10-09 14:12:22.667182-07
\.


--
-- Data for Name: SchemaMigrations; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."SchemaMigrations" (id, version, name, executed_at, execution_time_ms, checksum, success, error_message) FROM stdin;
1	001	initial schema	2025-11-21 21:48:19.625402	14	db10ee541f6c1e069ef3da1d3b138e26c7ff44d3f71cfb8627b1548cd72a3ed2	t	\N
2	002	level0 system	2025-11-21 21:48:19.644802	24	d0228dab7b5efae6613116c65f3d1f5dde74a420e3cc49c4e273b5670e6a9bc0	t	\N
3	003	veracity system	2025-11-21 21:48:19.680663	11	5ce608133a6eddeb71b93ec9cdc97a38a1ad04ec47858b5daa1c8b57b85ab72c	f	trigger "evidence_level_0_check" for relation "Evidence" already exists
\.


--
-- Data for Name: SourceCredibility; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."SourceCredibility" (source_id, credibility_score, evidence_accuracy_score, peer_validation_score, historical_reliability_score, total_evidence_count, verified_evidence_count, challenged_evidence_count, challenge_ratio, consensus_alignment_score, last_calculated_at, calculation_metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: Sources; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Sources" (id, source_type, title, authors, url, doi, isbn, publication_date, publisher, abstract, content_hash, is_verified, verified_by, verified_at, metadata, submitted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: SpamReports; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."SpamReports" (id, challenge_id, reporter_id, report_type, description, is_reviewed, reviewed_by, reviewed_at, action_taken, created_at) FROM stdin;
\.


--
-- Data for Name: UserAchievements; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserAchievements" (id, user_id, achievement_id, earned_at, progress) FROM stdin;
\.


--
-- Data for Name: UserCurators; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserCurators" (id, user_id, role_id, status, assigned_at, assigned_by_user_id, expires_at, expertise_areas, specialization_tags, total_actions, approved_actions, rejected_actions, overturned_actions, peer_review_score, community_trust_score, accuracy_rate, warnings_received, last_warning_at, suspension_count, last_suspended_at, last_review_date, next_review_date, review_notes, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: UserMethodologyProgress; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserMethodologyProgress" (id, user_id, methodology_id, graph_id, current_step_id, completed_steps, progress_data, started_at, last_activity_at, completed_at) FROM stdin;
\.


--
-- Data for Name: UserPresence; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserPresence" (id, user_id, graph_id, session_id, status, cursor_position, selected_nodes, selected_edges, viewport, last_heartbeat, connected_at, disconnected_at) FROM stdin;
\.


--
-- Data for Name: UserReputation; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserReputation" (user_id, reputation_score, reputation_tier, challenges_submitted, challenges_accepted, challenges_rejected, challenges_pending, votes_cast, votes_agreed_with_outcome, resolutions_performed, resolutions_overturned, accuracy_rate, participation_rate, is_banned, ban_reason, banned_until, warning_count, last_warning_at, challenges_today, last_challenge_at, daily_limit, badges, achievements, created_at, updated_at, last_active_at) FROM stdin;
\.


--
-- Data for Name: UserReputationCache; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."UserReputationCache" (user_id, evidence_quality_score, total_evidence_submitted, verified_evidence_count, rejected_evidence_count, total_votes_cast, vote_alignment_score, methodology_completions, challenges_raised, challenges_resolved, overall_reputation_score, calculated_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."Users" (id, username, email, password_hash, created_at, avatar_url, display_name, last_active, preferences) FROM stdin;
dac028af-75d9-4603-a294-4bf5d8fe4045	alice_researcher	alice_researcher@example.com	hashed_password	2025-11-21 21:45:49.264104-08	\N	alice researcher	\N	{}
5cb8c684-dfd7-4477-aaa0-ba3d0dd6b135	bob_analyst	bob_analyst@example.com	hashed_password	2025-11-21 21:45:49.264104-08	\N	bob analyst	\N	{}
dff83a35-305a-495a-9106-85b75d63204c	carol_scientist	carol_scientist@example.com	hashed_password	2025-11-21 21:45:49.264104-08	\N	carol scientist	\N	{}
\.


--
-- Data for Name: VeracityScoreHistory; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."VeracityScoreHistory" (id, veracity_score_id, old_score, new_score, score_delta, change_reason, triggering_entity_type, triggering_entity_id, calculation_snapshot, changed_at, changed_by) FROM stdin;
\.


--
-- Data for Name: VeracityScores; Type: TABLE DATA; Schema: public; Owner: kmk
--

COPY public."VeracityScores" (id, target_node_id, target_edge_id, veracity_score, confidence_interval_lower, confidence_interval_upper, evidence_weight_sum, evidence_count, supporting_evidence_weight, refuting_evidence_weight, consensus_score, source_count, source_agreement_ratio, challenge_count, open_challenge_count, challenge_impact, temporal_decay_factor, calculation_method, calculation_metadata, calculated_at, expires_at, calculated_by, updated_at) FROM stdin;
\.


--
-- Name: SchemaMigrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kmk
--

SELECT pg_catalog.setval('public."SchemaMigrations_id_seq"', 3, true);


--
-- Name: Achievements Achievements_key_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Achievements"
    ADD CONSTRAINT "Achievements_key_key" UNIQUE (key);


--
-- Name: Achievements Achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Achievements"
    ADD CONSTRAINT "Achievements_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeComments ChallengeComments_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeEvidence ChallengeEvidence_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT "ChallengeEvidence_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeNotifications ChallengeNotifications_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeResolutions ChallengeResolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeTypes ChallengeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeTypes"
    ADD CONSTRAINT "ChallengeTypes_pkey" PRIMARY KEY (id);


--
-- Name: ChallengeTypes ChallengeTypes_type_code_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeTypes"
    ADD CONSTRAINT "ChallengeTypes_type_code_key" UNIQUE (type_code);


--
-- Name: ChallengeVotes ChallengeVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_pkey" PRIMARY KEY (id);


--
-- Name: Challenges Challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessages ChatMessages_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChatMessages"
    ADD CONSTRAINT "ChatMessages_pkey" PRIMARY KEY (id);


--
-- Name: CollaborationSessions CollaborationSessions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CollaborationSessions"
    ADD CONSTRAINT "CollaborationSessions_pkey" PRIMARY KEY (id);


--
-- Name: CollaborationSessions CollaborationSessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CollaborationSessions"
    ADD CONSTRAINT "CollaborationSessions_session_id_key" UNIQUE (session_id);


--
-- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);


--
-- Name: ConsensusSnapshots ConsensusSnapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_pkey" PRIMARY KEY (id);


--
-- Name: ConsensusVotes ConsensusVotes_graph_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusVotes"
    ADD CONSTRAINT "ConsensusVotes_graph_id_user_id_key" UNIQUE (graph_id, user_id);


--
-- Name: ConsensusVotes ConsensusVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusVotes"
    ADD CONSTRAINT "ConsensusVotes_pkey" PRIMARY KEY (id);


--
-- Name: CuratorApplicationVotes CuratorApplicationVotes_application_id_voter_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplicationVotes"
    ADD CONSTRAINT "CuratorApplicationVotes_application_id_voter_id_key" UNIQUE (application_id, voter_id);


--
-- Name: CuratorApplicationVotes CuratorApplicationVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplicationVotes"
    ADD CONSTRAINT "CuratorApplicationVotes_pkey" PRIMARY KEY (id);


--
-- Name: CuratorApplications CuratorApplications_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplications"
    ADD CONSTRAINT "CuratorApplications_pkey" PRIMARY KEY (id);


--
-- Name: CuratorApplications CuratorApplications_user_id_role_id_status_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplications"
    ADD CONSTRAINT "CuratorApplications_user_id_role_id_status_key" UNIQUE (user_id, role_id, status);


--
-- Name: CuratorAuditLog CuratorAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorAuditLog"
    ADD CONSTRAINT "CuratorAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CuratorPermissions CuratorPermissions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorPermissions"
    ADD CONSTRAINT "CuratorPermissions_pkey" PRIMARY KEY (id);


--
-- Name: CuratorPermissions CuratorPermissions_user_curator_id_permission_type_resource_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorPermissions"
    ADD CONSTRAINT "CuratorPermissions_user_curator_id_permission_type_resource_key" UNIQUE (user_curator_id, permission_type, resource_type);


--
-- Name: CuratorReviews CuratorReviews_audit_log_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_audit_log_id_reviewer_id_key" UNIQUE (audit_log_id, reviewer_id);


--
-- Name: CuratorReviews CuratorReviews_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_pkey" PRIMARY KEY (id);


--
-- Name: CuratorRoles CuratorRoles_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorRoles"
    ADD CONSTRAINT "CuratorRoles_pkey" PRIMARY KEY (id);


--
-- Name: CuratorRoles CuratorRoles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorRoles"
    ADD CONSTRAINT "CuratorRoles_role_name_key" UNIQUE (role_name);


--
-- Name: EdgeTypes EdgeTypes_name_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_name_key" UNIQUE (name);


--
-- Name: EdgeTypes EdgeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_pkey" PRIMARY KEY (id);


--
-- Name: Edges Edges_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceAuditLog EvidenceAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceDuplicates EvidenceDuplicates_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceMetadata EvidenceMetadata_evidence_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_evidence_id_key" UNIQUE (evidence_id);


--
-- Name: EvidenceMetadata EvidenceMetadata_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceReviews EvidenceReviews_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_pkey" PRIMARY KEY (id);


--
-- Name: EvidenceSearchIndex EvidenceSearchIndex_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceSearchIndex"
    ADD CONSTRAINT "EvidenceSearchIndex_pkey" PRIMARY KEY (evidence_id);


--
-- Name: EvidenceVotes EvidenceVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_pkey" PRIMARY KEY (id);


--
-- Name: Evidence Evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_pkey" PRIMARY KEY (id);


--
-- Name: FormalInquiries FormalInquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "FormalInquiries_pkey" PRIMARY KEY (id);


--
-- Name: GraphActivity GraphActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphActivity"
    ADD CONSTRAINT "GraphActivity_pkey" PRIMARY KEY (id);


--
-- Name: GraphInvitations GraphInvitations_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphInvitations"
    ADD CONSTRAINT "GraphInvitations_pkey" PRIMARY KEY (id);


--
-- Name: GraphInvitations GraphInvitations_token_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphInvitations"
    ADD CONSTRAINT "GraphInvitations_token_key" UNIQUE (token);


--
-- Name: GraphLocks GraphLocks_graph_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphLocks"
    ADD CONSTRAINT "GraphLocks_graph_id_entity_type_entity_id_key" UNIQUE (graph_id, entity_type, entity_id);


--
-- Name: GraphLocks GraphLocks_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphLocks"
    ADD CONSTRAINT "GraphLocks_pkey" PRIMARY KEY (id);


--
-- Name: GraphShares GraphShares_graph_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphShares"
    ADD CONSTRAINT "GraphShares_graph_id_user_id_key" UNIQUE (graph_id, user_id);


--
-- Name: GraphShares GraphShares_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphShares"
    ADD CONSTRAINT "GraphShares_pkey" PRIMARY KEY (id);


--
-- Name: Graphs Graphs_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_pkey" PRIMARY KEY (id);


--
-- Name: InquiryVotes InquiryVotes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_pkey" PRIMARY KEY (id);


--
-- Name: Methodologies Methodologies_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyEdgeTypes MethodologyEdgeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT "MethodologyEdgeTypes_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyNodeTypes MethodologyNodeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT "MethodologyNodeTypes_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyPermissions MethodologyPermissions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_graph_id_step_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_graph_id_step_id_key" UNIQUE (graph_id, step_id);


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyWorkflowSteps MethodologyWorkflowSteps_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyWorkflowSteps"
    ADD CONSTRAINT "MethodologyWorkflowSteps_pkey" PRIMARY KEY (id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_methodology_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_methodology_id_key" UNIQUE (methodology_id);


--
-- Name: MethodologyWorkflows MethodologyWorkflows_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_pkey" PRIMARY KEY (id);


--
-- Name: NodeTypes NodeTypes_name_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_name_key" UNIQUE (name);


--
-- Name: NodeTypes NodeTypes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_pkey" PRIMARY KEY (id);


--
-- Name: Nodes Nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreferences NotificationPreferences_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreferences NotificationPreferences_user_id_graph_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_user_id_graph_id_key" UNIQUE (user_id, graph_id);


--
-- Name: OperationHistory OperationHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."OperationHistory"
    ADD CONSTRAINT "OperationHistory_pkey" PRIMARY KEY (id);


--
-- Name: PromotionEligibilityCache PromotionEligibilityCache_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."PromotionEligibilityCache"
    ADD CONSTRAINT "PromotionEligibilityCache_pkey" PRIMARY KEY (graph_id);


--
-- Name: PromotionEvents PromotionEvents_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."PromotionEvents"
    ADD CONSTRAINT "PromotionEvents_pkey" PRIMARY KEY (id);


--
-- Name: RolePermissions RolePermissions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_pkey" PRIMARY KEY (id);


--
-- Name: RolePermissions RolePermissions_role_id_permission_type_resource_type_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_role_id_permission_type_resource_type_key" UNIQUE (role_id, permission_type, resource_type);


--
-- Name: SchemaMigrations SchemaMigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SchemaMigrations"
    ADD CONSTRAINT "SchemaMigrations_pkey" PRIMARY KEY (id);


--
-- Name: SchemaMigrations SchemaMigrations_version_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SchemaMigrations"
    ADD CONSTRAINT "SchemaMigrations_version_key" UNIQUE (version);


--
-- Name: SourceCredibility SourceCredibility_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SourceCredibility"
    ADD CONSTRAINT "SourceCredibility_pkey" PRIMARY KEY (source_id);


--
-- Name: Sources Sources_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_pkey" PRIMARY KEY (id);


--
-- Name: SpamReports SpamReports_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_pkey" PRIMARY KEY (id);


--
-- Name: UserAchievements UserAchievements_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserAchievements"
    ADD CONSTRAINT "UserAchievements_pkey" PRIMARY KEY (id);


--
-- Name: UserAchievements UserAchievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserAchievements"
    ADD CONSTRAINT "UserAchievements_user_id_achievement_id_key" UNIQUE (user_id, achievement_id);


--
-- Name: UserCurators UserCurators_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserCurators"
    ADD CONSTRAINT "UserCurators_pkey" PRIMARY KEY (id);


--
-- Name: UserCurators UserCurators_user_id_role_id_status_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserCurators"
    ADD CONSTRAINT "UserCurators_user_id_role_id_status_key" UNIQUE (user_id, role_id, status);


--
-- Name: UserMethodologyProgress UserMethodologyProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_pkey" PRIMARY KEY (id);


--
-- Name: UserPresence UserPresence_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserPresence"
    ADD CONSTRAINT "UserPresence_pkey" PRIMARY KEY (id);


--
-- Name: UserPresence UserPresence_user_id_graph_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserPresence"
    ADD CONSTRAINT "UserPresence_user_id_graph_id_session_id_key" UNIQUE (user_id, graph_id, session_id);


--
-- Name: UserReputationCache UserReputationCache_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserReputationCache"
    ADD CONSTRAINT "UserReputationCache_pkey" PRIMARY KEY (user_id);


--
-- Name: UserReputation UserReputation_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserReputation"
    ADD CONSTRAINT "UserReputation_pkey" PRIMARY KEY (user_id);


--
-- Name: Users Users_email_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_email_key" UNIQUE (email);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_username_key; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key" UNIQUE (username);


--
-- Name: VeracityScoreHistory VeracityScoreHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScoreHistory"
    ADD CONSTRAINT "VeracityScoreHistory_pkey" PRIMARY KEY (id);


--
-- Name: VeracityScores VeracityScores_pkey; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_pkey" PRIMARY KEY (id);


--
-- Name: VeracityScores unique_active_score_per_edge; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT unique_active_score_per_edge UNIQUE (target_edge_id);


--
-- Name: VeracityScores unique_active_score_per_node; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT unique_active_score_per_node UNIQUE (target_node_id);


--
-- Name: ChallengeEvidence unique_challenge_evidence; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT unique_challenge_evidence UNIQUE (challenge_id, evidence_id);


--
-- Name: Sources unique_content_hash; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT unique_content_hash UNIQUE (content_hash);


--
-- Name: EvidenceDuplicates unique_duplicate_pair; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT unique_duplicate_pair UNIQUE (evidence_id_1, evidence_id_2);


--
-- Name: MethodologyEdgeTypes unique_edge_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT unique_edge_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: EvidenceReviews unique_evidence_review; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT unique_evidence_review UNIQUE (evidence_id, reviewer_id);


--
-- Name: MethodologyNodeTypes unique_node_type_per_methodology; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT unique_node_type_per_methodology UNIQUE (methodology_id, name);


--
-- Name: EvidenceReviewVotes unique_review_vote; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT unique_review_vote UNIQUE (review_id, user_id);


--
-- Name: SpamReports unique_user_challenge_report; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT unique_user_challenge_report UNIQUE (challenge_id, reporter_id);


--
-- Name: ChallengeVotes unique_user_challenge_vote; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT unique_user_challenge_vote UNIQUE (challenge_id, user_id);


--
-- Name: EvidenceVotes unique_user_evidence_vote; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT unique_user_evidence_vote UNIQUE (evidence_id, user_id);


--
-- Name: InquiryVotes unique_user_inquiry_vote; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT unique_user_inquiry_vote UNIQUE (inquiry_id, user_id);


--
-- Name: UserMethodologyProgress unique_user_methodology_graph; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT unique_user_methodology_graph UNIQUE (user_id, methodology_id, graph_id);


--
-- Name: MethodologyPermissions unique_user_methodology_permission; Type: CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT unique_user_methodology_permission UNIQUE (methodology_id, user_id);


--
-- Name: idx_achievements_category; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_achievements_category ON public."Achievements" USING btree (category);


--
-- Name: idx_achievements_key; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_achievements_key ON public."Achievements" USING btree (key);


--
-- Name: idx_application_votes_application; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_application_votes_application ON public."CuratorApplicationVotes" USING btree (application_id);


--
-- Name: idx_application_votes_voter; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_application_votes_voter ON public."CuratorApplicationVotes" USING btree (voter_id);


--
-- Name: idx_challenge_comments_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_comments_challenge ON public."ChallengeComments" USING btree (challenge_id);


--
-- Name: idx_challenge_comments_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_comments_created ON public."ChallengeComments" USING btree (created_at DESC);


--
-- Name: idx_challenge_comments_parent; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_comments_parent ON public."ChallengeComments" USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);


--
-- Name: idx_challenge_comments_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_comments_user ON public."ChallengeComments" USING btree (user_id);


--
-- Name: idx_challenge_evidence_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_evidence_challenge ON public."ChallengeEvidence" USING btree (challenge_id);


--
-- Name: idx_challenge_evidence_evidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_evidence_evidence ON public."ChallengeEvidence" USING btree (evidence_id) WHERE (evidence_id IS NOT NULL);


--
-- Name: idx_challenge_evidence_submitter; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_evidence_submitter ON public."ChallengeEvidence" USING btree (submitted_by);


--
-- Name: idx_challenge_resolutions_appealable; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_resolutions_appealable ON public."ChallengeResolutions" USING btree (is_appealable, appeal_deadline) WHERE (is_appealable = true);


--
-- Name: idx_challenge_resolutions_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_resolutions_challenge ON public."ChallengeResolutions" USING btree (challenge_id);


--
-- Name: idx_challenge_resolutions_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_resolutions_type ON public."ChallengeResolutions" USING btree (resolution_type);


--
-- Name: idx_challenge_types_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_types_active ON public."ChallengeTypes" USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_challenge_types_code; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_types_code ON public."ChallengeTypes" USING btree (type_code);


--
-- Name: idx_challenge_votes_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_votes_challenge ON public."ChallengeVotes" USING btree (challenge_id);


--
-- Name: idx_challenge_votes_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_votes_user ON public."ChallengeVotes" USING btree (user_id);


--
-- Name: idx_challenge_votes_vote; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenge_votes_vote ON public."ChallengeVotes" USING btree (vote);


--
-- Name: idx_challenges_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_active ON public."Challenges" USING btree (status, voting_ends_at) WHERE (status = ANY (ARRAY['open'::text, 'voting'::text]));


--
-- Name: idx_challenges_challenger; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_challenger ON public."Challenges" USING btree (challenger_id);


--
-- Name: idx_challenges_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_created ON public."Challenges" USING btree (created_at DESC);


--
-- Name: idx_challenges_resolution; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_resolution ON public."Challenges" USING btree (resolution) WHERE (resolution IS NOT NULL);


--
-- Name: idx_challenges_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_status ON public."Challenges" USING btree (status);


--
-- Name: idx_challenges_target_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_target_edge ON public."Challenges" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_challenges_target_edge_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_target_edge_id ON public."Challenges" USING btree (target_edge_id);


--
-- Name: idx_challenges_target_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_target_node ON public."Challenges" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_challenges_target_node_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_target_node_id ON public."Challenges" USING btree (target_node_id);


--
-- Name: idx_challenges_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_type ON public."Challenges" USING btree (challenge_type_id);


--
-- Name: idx_challenges_voting_ends; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_challenges_voting_ends ON public."Challenges" USING btree (voting_ends_at) WHERE (status = 'voting'::text);


--
-- Name: idx_chat_messages_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_chat_messages_active ON public."ChatMessages" USING btree (graph_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_chat_messages_created_at ON public."ChatMessages" USING btree (created_at DESC);


--
-- Name: idx_chat_messages_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_chat_messages_graph_id ON public."ChatMessages" USING btree (graph_id);


--
-- Name: idx_chat_messages_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_chat_messages_user_id ON public."ChatMessages" USING btree (user_id);


--
-- Name: idx_collab_sessions_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collab_sessions_active ON public."CollaborationSessions" USING btree (ended_at) WHERE (ended_at IS NULL);


--
-- Name: idx_collab_sessions_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collab_sessions_graph_id ON public."CollaborationSessions" USING btree (graph_id);


--
-- Name: idx_collab_sessions_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collab_sessions_user_id ON public."CollaborationSessions" USING btree (user_id);


--
-- Name: idx_collaboration_sessions_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collaboration_sessions_active ON public."CollaborationSessions" USING btree (graph_id, user_id) WHERE (ended_at IS NULL);


--
-- Name: idx_collaboration_sessions_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collaboration_sessions_graph_id ON public."CollaborationSessions" USING btree (graph_id);


--
-- Name: idx_collaboration_sessions_session_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collaboration_sessions_session_id ON public."CollaborationSessions" USING btree (session_id);


--
-- Name: idx_collaboration_sessions_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_collaboration_sessions_user_id ON public."CollaborationSessions" USING btree (user_id);


--
-- Name: idx_comments_author_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_comments_author_id ON public."Comments" USING btree (author_id);


--
-- Name: idx_comments_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_comments_created ON public."Comments" USING btree (created_at DESC);


--
-- Name: INDEX idx_comments_created; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_comments_created IS 'Optimizes recent comments queries';


--
-- Name: idx_comments_target_edge_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_comments_target_edge_id ON public."Comments" USING btree (target_edge_id);


--
-- Name: idx_comments_target_node_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_comments_target_node_id ON public."Comments" USING btree (target_node_id);


--
-- Name: idx_consensus_snapshot_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_snapshot_at ON public."ConsensusSnapshots" USING btree (snapshot_at DESC);


--
-- Name: idx_consensus_target_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_target_edge ON public."ConsensusSnapshots" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_consensus_target_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_target_node ON public."ConsensusSnapshots" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_consensus_votes_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_votes_created ON public."ConsensusVotes" USING btree (created_at DESC);


--
-- Name: idx_consensus_votes_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_votes_graph ON public."ConsensusVotes" USING btree (graph_id);


--
-- Name: idx_consensus_votes_graph_value; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_votes_graph_value ON public."ConsensusVotes" USING btree (graph_id, vote_value);


--
-- Name: idx_consensus_votes_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_consensus_votes_user ON public."ConsensusVotes" USING btree (user_id);


--
-- Name: idx_curator_applications_role; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_applications_role ON public."CuratorApplications" USING btree (role_id);


--
-- Name: idx_curator_applications_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_applications_status ON public."CuratorApplications" USING btree (status);


--
-- Name: idx_curator_applications_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_applications_user ON public."CuratorApplications" USING btree (user_id);


--
-- Name: idx_curator_applications_voting; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_applications_voting ON public."CuratorApplications" USING btree (status, voting_deadline) WHERE (status = 'voting'::text);


--
-- Name: idx_curator_audit_action; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_action ON public."CuratorAuditLog" USING btree (action_type);


--
-- Name: idx_curator_audit_curator; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_curator ON public."CuratorAuditLog" USING btree (curator_id);


--
-- Name: idx_curator_audit_curator_action_time; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_curator_action_time ON public."CuratorAuditLog" USING btree (curator_id, action_type, performed_at DESC);


--
-- Name: idx_curator_audit_resource; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_resource ON public."CuratorAuditLog" USING btree (resource_type, resource_id);


--
-- Name: idx_curator_audit_review; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_review ON public."CuratorAuditLog" USING btree (requires_peer_review, peer_reviewed) WHERE ((requires_peer_review = true) AND (peer_reviewed = false));


--
-- Name: idx_curator_audit_time; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_time ON public."CuratorAuditLog" USING btree (performed_at DESC);


--
-- Name: idx_curator_audit_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_audit_user ON public."CuratorAuditLog" USING btree (user_id);


--
-- Name: idx_curator_permissions_curator; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_permissions_curator ON public."CuratorPermissions" USING btree (user_curator_id);


--
-- Name: idx_curator_permissions_expires; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_permissions_expires ON public."CuratorPermissions" USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_curator_permissions_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_permissions_type ON public."CuratorPermissions" USING btree (permission_type);


--
-- Name: idx_curator_reviews_audit; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_reviews_audit ON public."CuratorReviews" USING btree (audit_log_id);


--
-- Name: idx_curator_reviews_audit_verdict; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_reviews_audit_verdict ON public."CuratorReviews" USING btree (audit_log_id, verdict);


--
-- Name: idx_curator_reviews_reviewer; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_reviews_reviewer ON public."CuratorReviews" USING btree (reviewer_id);


--
-- Name: idx_curator_reviews_time; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_reviews_time ON public."CuratorReviews" USING btree (reviewed_at DESC);


--
-- Name: idx_curator_reviews_verdict; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_reviews_verdict ON public."CuratorReviews" USING btree (verdict);


--
-- Name: idx_curator_roles_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_roles_active ON public."CuratorRoles" USING btree (is_active);


--
-- Name: idx_curator_roles_tier; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_curator_roles_tier ON public."CuratorRoles" USING btree (tier);


--
-- Name: idx_edge_types_ai_hnsw; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edge_types_ai_hnsw ON public."EdgeTypes" USING hnsw (ai public.vector_cosine_ops);


--
-- Name: INDEX idx_edge_types_ai_hnsw; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_edge_types_ai_hnsw IS 'HNSW index for fast cosine similarity search on edge type AI embeddings. Supports relationship type discovery and classification.';


--
-- Name: idx_edges_ai_hnsw; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_ai_hnsw ON public."Edges" USING hnsw (ai public.vector_cosine_ops);


--
-- Name: INDEX idx_edges_ai_hnsw; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_edges_ai_hnsw IS 'HNSW index for fast cosine similarity search on edge AI embeddings. Supports semantic relationship discovery.';


--
-- Name: idx_edges_created_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_created_by ON public."Edges" USING btree (created_by);


--
-- Name: idx_edges_edge_type_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_edge_type_id ON public."Edges" USING btree (edge_type_id);


--
-- Name: idx_edges_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_graph_id ON public."Edges" USING btree (graph_id);


--
-- Name: idx_edges_graph_level; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_graph_level ON public."Edges" USING btree (graph_id, is_level_0);


--
-- Name: INDEX idx_edges_graph_level; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_edges_graph_level IS 'Critical index for graph-scoped edge queries with level filtering';


--
-- Name: idx_edges_is_level_0; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_is_level_0 ON public."Edges" USING btree (is_level_0);


--
-- Name: idx_edges_source_node_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_source_node_id ON public."Edges" USING btree (source_node_id);


--
-- Name: idx_edges_source_target; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_source_target ON public."Edges" USING btree (source_node_id, target_node_id);


--
-- Name: INDEX idx_edges_source_target; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_edges_source_target IS 'Optimizes edge traversal queries';


--
-- Name: idx_edges_target_node_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_edges_target_node_id ON public."Edges" USING btree (target_node_id);


--
-- Name: idx_evidence_audit_action; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_action ON public."EvidenceAuditLog" USING btree (action);


--
-- Name: idx_evidence_audit_actor; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_actor ON public."EvidenceAuditLog" USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_evidence_audit_actor_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_actor_created ON public."EvidenceAuditLog" USING btree (actor_id, created_at DESC);


--
-- Name: idx_evidence_audit_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_created ON public."EvidenceAuditLog" USING btree (created_at DESC);


--
-- Name: idx_evidence_audit_evidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_evidence ON public."EvidenceAuditLog" USING btree (evidence_id);


--
-- Name: idx_evidence_audit_ip; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_audit_ip ON public."EvidenceAuditLog" USING btree (ip_address) WHERE (ip_address IS NOT NULL);


--
-- Name: idx_evidence_created_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_created_at ON public."Evidence" USING btree (created_at DESC);


--
-- Name: idx_evidence_duplicates_evidence1; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_duplicates_evidence1 ON public."EvidenceDuplicates" USING btree (evidence_id_1);


--
-- Name: idx_evidence_duplicates_evidence2; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_duplicates_evidence2 ON public."EvidenceDuplicates" USING btree (evidence_id_2);


--
-- Name: idx_evidence_duplicates_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_duplicates_status ON public."EvidenceDuplicates" USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_evidence_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_edge ON public."Evidence" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: INDEX idx_evidence_edge; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_evidence_edge IS 'Partial index for edge evidence lookups';


--
-- Name: idx_evidence_metadata_abstract_fts; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_abstract_fts ON public."EvidenceMetadata" USING gin (to_tsvector('english'::regconfig, COALESCE(abstract, ''::text)));


--
-- Name: idx_evidence_metadata_authors; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_authors ON public."EvidenceMetadata" USING gin (authors);


--
-- Name: idx_evidence_metadata_doi; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_doi ON public."EvidenceMetadata" USING btree (doi) WHERE (doi IS NOT NULL);


--
-- Name: idx_evidence_metadata_evidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_evidence ON public."EvidenceMetadata" USING btree (evidence_id);


--
-- Name: idx_evidence_metadata_geolocation; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_geolocation ON public."EvidenceMetadata" USING gin (geolocation);


--
-- Name: idx_evidence_metadata_keywords; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_keywords ON public."EvidenceMetadata" USING gin (keywords);


--
-- Name: idx_evidence_metadata_language; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_language ON public."EvidenceMetadata" USING btree (language);


--
-- Name: idx_evidence_metadata_publication_date; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_publication_date ON public."EvidenceMetadata" USING btree (publication_date DESC);


--
-- Name: idx_evidence_metadata_topics; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_metadata_topics ON public."EvidenceMetadata" USING gin (topics);


--
-- Name: idx_evidence_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_node ON public."Evidence" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: INDEX idx_evidence_node; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_evidence_node IS 'Partial index for node evidence lookups';


--
-- Name: idx_evidence_review_votes_review; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_review_votes_review ON public."EvidenceReviewVotes" USING btree (review_id);


--
-- Name: idx_evidence_review_votes_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_review_votes_user ON public."EvidenceReviewVotes" USING btree (user_id);


--
-- Name: idx_evidence_reviews_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_created ON public."EvidenceReviews" USING btree (created_at DESC);


--
-- Name: idx_evidence_reviews_evidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_evidence ON public."EvidenceReviews" USING btree (evidence_id) WHERE (status = 'active'::text);


--
-- Name: idx_evidence_reviews_flags; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_flags ON public."EvidenceReviews" USING gin (flags);


--
-- Name: idx_evidence_reviews_helpful; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_helpful ON public."EvidenceReviews" USING btree (helpful_count DESC);


--
-- Name: idx_evidence_reviews_quality; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_quality ON public."EvidenceReviews" USING btree (quality_score DESC);


--
-- Name: idx_evidence_reviews_rating; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_rating ON public."EvidenceReviews" USING btree (overall_rating);


--
-- Name: idx_evidence_reviews_reviewer; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_reviews_reviewer ON public."EvidenceReviews" USING btree (reviewer_id);


--
-- Name: idx_evidence_search_authors; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_search_authors ON public."EvidenceSearchIndex" USING gin (authors);


--
-- Name: idx_evidence_search_file_types; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_search_file_types ON public."EvidenceSearchIndex" USING gin (file_types);


--
-- Name: idx_evidence_search_keywords; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_search_keywords ON public."EvidenceSearchIndex" USING gin (keywords);


--
-- Name: idx_evidence_search_quality; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_search_quality ON public."EvidenceSearchIndex" USING btree (avg_quality_score DESC);


--
-- Name: idx_evidence_search_vector; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_search_vector ON public."EvidenceSearchIndex" USING gin (search_vector);


--
-- Name: idx_evidence_source; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_source ON public."Evidence" USING btree (source_id);


--
-- Name: idx_evidence_submitted_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_submitted_by ON public."Evidence" USING btree (submitted_by);


--
-- Name: idx_evidence_target_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_target_edge ON public."Evidence" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_evidence_target_edge_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_target_edge_type ON public."Evidence" USING btree (target_edge_id, evidence_type) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_evidence_target_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_target_node ON public."Evidence" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_evidence_target_node_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_target_node_type ON public."Evidence" USING btree (target_node_id, evidence_type) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_evidence_temporal; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_temporal ON public."Evidence" USING btree (temporal_relevance) WHERE (temporal_relevance < (1.0)::double precision);


--
-- Name: idx_evidence_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_type ON public."Evidence" USING btree (evidence_type);


--
-- Name: idx_evidence_verified; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_verified ON public."Evidence" USING btree (is_verified);


--
-- Name: idx_evidence_votes_evidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_votes_evidence ON public."EvidenceVotes" USING btree (evidence_id);


--
-- Name: idx_evidence_votes_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_votes_type ON public."EvidenceVotes" USING btree (vote_type);


--
-- Name: idx_evidence_votes_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_evidence_votes_user ON public."EvidenceVotes" USING btree (user_id);


--
-- Name: idx_formal_inquiries_confidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_confidence ON public."FormalInquiries" USING btree (confidence_score DESC) WHERE (confidence_score IS NOT NULL);


--
-- Name: idx_formal_inquiries_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_created ON public."FormalInquiries" USING btree (created_at DESC);


--
-- Name: idx_formal_inquiries_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_status ON public."FormalInquiries" USING btree (status);


--
-- Name: idx_formal_inquiries_target_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_target_edge ON public."FormalInquiries" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_formal_inquiries_target_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_target_node ON public."FormalInquiries" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: idx_formal_inquiries_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_formal_inquiries_user ON public."FormalInquiries" USING btree (user_id);


--
-- Name: idx_graph_activity_action_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_activity_action_type ON public."GraphActivity" USING btree (action_type);


--
-- Name: idx_graph_activity_created_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_activity_created_at ON public."GraphActivity" USING btree (created_at DESC);


--
-- Name: idx_graph_activity_entity; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_activity_entity ON public."GraphActivity" USING btree (entity_type, entity_id);


--
-- Name: idx_graph_activity_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_activity_graph_id ON public."GraphActivity" USING btree (graph_id);


--
-- Name: idx_graph_activity_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_activity_user_id ON public."GraphActivity" USING btree (user_id);


--
-- Name: idx_graph_invitations_email; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_invitations_email ON public."GraphInvitations" USING btree (email);


--
-- Name: idx_graph_invitations_expires; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_invitations_expires ON public."GraphInvitations" USING btree (expires_at);


--
-- Name: idx_graph_invitations_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_invitations_graph_id ON public."GraphInvitations" USING btree (graph_id);


--
-- Name: idx_graph_invitations_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_invitations_status ON public."GraphInvitations" USING btree (status);


--
-- Name: idx_graph_invitations_token; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_invitations_token ON public."GraphInvitations" USING btree (token);


--
-- Name: idx_graph_locks_entity; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_locks_entity ON public."GraphLocks" USING btree (entity_type, entity_id);


--
-- Name: idx_graph_locks_expires; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_locks_expires ON public."GraphLocks" USING btree (expires_at);


--
-- Name: idx_graph_locks_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_locks_graph_id ON public."GraphLocks" USING btree (graph_id);


--
-- Name: idx_graph_shares_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_shares_graph ON public."GraphShares" USING btree (graph_id, permission);


--
-- Name: idx_graph_shares_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_shares_graph_id ON public."GraphShares" USING btree (graph_id);


--
-- Name: idx_graph_shares_permission; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_shares_permission ON public."GraphShares" USING btree (permission);


--
-- Name: idx_graph_shares_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_shares_user ON public."GraphShares" USING btree (user_id, graph_id);


--
-- Name: idx_graph_shares_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graph_shares_user_id ON public."GraphShares" USING btree (user_id);


--
-- Name: idx_graphs_created_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graphs_created_by ON public."Graphs" USING btree (created_by);


--
-- Name: idx_graphs_level; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_graphs_level ON public."Graphs" USING btree (level);


--
-- Name: idx_history_change_reason; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_history_change_reason ON public."VeracityScoreHistory" USING btree (change_reason);


--
-- Name: idx_history_changed_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_history_changed_at ON public."VeracityScoreHistory" USING btree (changed_at DESC);


--
-- Name: idx_history_triggering_entity; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_history_triggering_entity ON public."VeracityScoreHistory" USING btree (triggering_entity_type, triggering_entity_id) WHERE (triggering_entity_id IS NOT NULL);


--
-- Name: idx_history_veracity_score; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_history_veracity_score ON public."VeracityScoreHistory" USING btree (veracity_score_id);


--
-- Name: idx_inquiry_vote_stats_inquiry; Type: INDEX; Schema: public; Owner: kmk
--

CREATE UNIQUE INDEX idx_inquiry_vote_stats_inquiry ON public."InquiryVoteStats" USING btree (inquiry_id);


--
-- Name: idx_inquiry_votes_created; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_inquiry_votes_created ON public."InquiryVotes" USING btree (created_at DESC);


--
-- Name: idx_inquiry_votes_inquiry; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_inquiry_votes_inquiry ON public."InquiryVotes" USING btree (inquiry_id);


--
-- Name: idx_inquiry_votes_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_inquiry_votes_type ON public."InquiryVotes" USING btree (vote_type);


--
-- Name: idx_inquiry_votes_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_inquiry_votes_user ON public."InquiryVotes" USING btree (user_id);


--
-- Name: idx_methodologies_category; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodologies_category ON public."Methodologies" USING btree (category);


--
-- Name: idx_methodologies_created_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodologies_created_by ON public."Methodologies" USING btree (created_by);


--
-- Name: idx_methodologies_is_system; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodologies_is_system ON public."Methodologies" USING btree (is_system);


--
-- Name: idx_methodologies_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodologies_status ON public."Methodologies" USING btree (status);


--
-- Name: idx_methodologies_tags; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodologies_tags ON public."Methodologies" USING gin (tags);


--
-- Name: idx_methodology_completions_completed_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_completions_completed_by ON public."MethodologyStepCompletions" USING btree (completed_by);


--
-- Name: idx_methodology_completions_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_completions_graph ON public."MethodologyStepCompletions" USING btree (graph_id);


--
-- Name: idx_methodology_completions_graph_step; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_completions_graph_step ON public."MethodologyStepCompletions" USING btree (graph_id, step_id);


--
-- Name: idx_methodology_completions_step; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_completions_step ON public."MethodologyStepCompletions" USING btree (step_id);


--
-- Name: idx_methodology_edge_types_display_order; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_edge_types_display_order ON public."MethodologyEdgeTypes" USING btree (display_order);


--
-- Name: idx_methodology_edge_types_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_edge_types_methodology ON public."MethodologyEdgeTypes" USING btree (methodology_id);


--
-- Name: idx_methodology_node_types_display_order; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_node_types_display_order ON public."MethodologyNodeTypes" USING btree (display_order);


--
-- Name: idx_methodology_node_types_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_node_types_methodology ON public."MethodologyNodeTypes" USING btree (methodology_id);


--
-- Name: idx_methodology_permissions_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_permissions_methodology ON public."MethodologyPermissions" USING btree (methodology_id);


--
-- Name: idx_methodology_permissions_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_permissions_user ON public."MethodologyPermissions" USING btree (user_id);


--
-- Name: idx_methodology_progress_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_progress_user ON public."UserMethodologyProgress" USING btree (user_id, methodology_id);


--
-- Name: idx_methodology_workflow_steps_order; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_workflow_steps_order ON public."MethodologyWorkflowSteps" USING btree (workflow_id, step_order);


--
-- Name: idx_methodology_workflow_steps_workflow; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_workflow_steps_workflow ON public."MethodologyWorkflowSteps" USING btree (workflow_id);


--
-- Name: idx_methodology_workflows_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_methodology_workflows_methodology ON public."MethodologyWorkflows" USING btree (methodology_id);


--
-- Name: idx_node_types_ai_hnsw; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_node_types_ai_hnsw ON public."NodeTypes" USING hnsw (ai public.vector_cosine_ops);


--
-- Name: INDEX idx_node_types_ai_hnsw; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_node_types_ai_hnsw IS 'HNSW index for fast cosine similarity search on node type AI embeddings. Supports type classification and semantic type matching.';


--
-- Name: idx_nodes_ai_hnsw; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_ai_hnsw ON public."Nodes" USING hnsw (ai public.vector_cosine_ops);


--
-- Name: INDEX idx_nodes_ai_hnsw; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_nodes_ai_hnsw IS 'HNSW index for fast cosine similarity search on node AI embeddings. Supports semantic search and content-based node matching.';


--
-- Name: idx_nodes_created_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_created_by ON public."Nodes" USING btree (created_by);


--
-- Name: idx_nodes_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_graph_id ON public."Nodes" USING btree (graph_id);


--
-- Name: idx_nodes_graph_level; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_graph_level ON public."Nodes" USING btree (graph_id, is_level_0);


--
-- Name: INDEX idx_nodes_graph_level; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_nodes_graph_level IS 'Critical index for graph-scoped node queries with level filtering';


--
-- Name: idx_nodes_is_level_0; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_is_level_0 ON public."Nodes" USING btree (is_level_0);


--
-- Name: idx_nodes_node_type_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_node_type_id ON public."Nodes" USING btree (node_type_id);


--
-- Name: idx_nodes_primary_source_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_primary_source_id ON public."Nodes" USING btree (primary_source_id);


--
-- Name: idx_nodes_type_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_nodes_type_graph ON public."Nodes" USING btree (node_type_id, graph_id);


--
-- Name: INDEX idx_nodes_type_graph; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_nodes_type_graph IS 'Composite index for node type filtering within graphs';


--
-- Name: idx_notifications_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_notifications_challenge ON public."ChallengeNotifications" USING btree (challenge_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_notifications_unread ON public."ChallengeNotifications" USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_unsent; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_notifications_unsent ON public."ChallengeNotifications" USING btree (is_sent, created_at) WHERE (is_sent = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_notifications_user ON public."ChallengeNotifications" USING btree (user_id);


--
-- Name: idx_operation_history_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_operation_history_graph_id ON public."OperationHistory" USING btree (graph_id);


--
-- Name: idx_operation_history_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_operation_history_user ON public."OperationHistory" USING btree (user_id, session_id);


--
-- Name: idx_operation_history_version; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_operation_history_version ON public."OperationHistory" USING btree (graph_id, version);


--
-- Name: idx_promotion_eligibility_eligible; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_eligibility_eligible ON public."PromotionEligibilityCache" USING btree (is_eligible);


--
-- Name: idx_promotion_eligibility_updated; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_eligibility_updated ON public."PromotionEligibilityCache" USING btree (updated_at DESC);


--
-- Name: idx_promotion_events_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_events_graph ON public."PromotionEvents" USING btree (graph_id);


--
-- Name: idx_promotion_events_graph_level; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_events_graph_level ON public."PromotionEvents" USING btree (graph_id, new_level);


--
-- Name: idx_promotion_events_level; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_events_level ON public."PromotionEvents" USING btree (new_level);


--
-- Name: idx_promotion_events_promoted_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_promotion_events_promoted_at ON public."PromotionEvents" USING btree (promoted_at DESC);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_role_permissions_role ON public."RolePermissions" USING btree (role_id);


--
-- Name: idx_role_permissions_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_role_permissions_type ON public."RolePermissions" USING btree (permission_type);


--
-- Name: idx_schema_migrations_executed_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_schema_migrations_executed_at ON public."SchemaMigrations" USING btree (executed_at DESC);


--
-- Name: idx_schema_migrations_version; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_schema_migrations_version ON public."SchemaMigrations" USING btree (version);


--
-- Name: idx_sources_content_hash; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_sources_content_hash ON public."Sources" USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_sources_is_verified; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_sources_is_verified ON public."Sources" USING btree (is_verified);


--
-- Name: idx_sources_publication_date; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_sources_publication_date ON public."Sources" USING btree (publication_date DESC);


--
-- Name: idx_sources_source_type; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_sources_source_type ON public."Sources" USING btree (source_type);


--
-- Name: idx_sources_submitted_by; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_sources_submitted_by ON public."Sources" USING btree (submitted_by);


--
-- Name: idx_spam_reports_challenge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_spam_reports_challenge ON public."SpamReports" USING btree (challenge_id);


--
-- Name: idx_spam_reports_unreviewed; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_spam_reports_unreviewed ON public."SpamReports" USING btree (is_reviewed) WHERE (is_reviewed = false);


--
-- Name: idx_unique_system_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE UNIQUE INDEX idx_unique_system_methodology ON public."Methodologies" USING btree (name) WHERE (is_system = true);


--
-- Name: idx_user_achievements_achievement_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_achievements_achievement_id ON public."UserAchievements" USING btree (achievement_id);


--
-- Name: idx_user_achievements_earned_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_achievements_earned_at ON public."UserAchievements" USING btree (earned_at);


--
-- Name: idx_user_achievements_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_achievements_user_id ON public."UserAchievements" USING btree (user_id);


--
-- Name: idx_user_curators_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_active ON public."UserCurators" USING btree (user_id, status) WHERE (status = 'active'::text);


--
-- Name: idx_user_curators_review_due; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_review_due ON public."UserCurators" USING btree (next_review_date) WHERE (status = 'active'::text);


--
-- Name: idx_user_curators_role; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_role ON public."UserCurators" USING btree (role_id);


--
-- Name: idx_user_curators_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_status ON public."UserCurators" USING btree (status);


--
-- Name: idx_user_curators_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_user ON public."UserCurators" USING btree (user_id);


--
-- Name: idx_user_curators_user_role_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_curators_user_role_active ON public."UserCurators" USING btree (user_id, role_id) WHERE (status = 'active'::text);


--
-- Name: idx_user_methodology_progress_graph; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_methodology_progress_graph ON public."UserMethodologyProgress" USING btree (graph_id);


--
-- Name: idx_user_methodology_progress_methodology; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_methodology_progress_methodology ON public."UserMethodologyProgress" USING btree (methodology_id);


--
-- Name: idx_user_methodology_progress_user; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_methodology_progress_user ON public."UserMethodologyProgress" USING btree (user_id);


--
-- Name: idx_user_presence_active; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_active ON public."UserPresence" USING btree (graph_id, status, last_heartbeat) WHERE (status <> 'offline'::text);


--
-- Name: idx_user_presence_graph_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_graph_id ON public."UserPresence" USING btree (graph_id);


--
-- Name: idx_user_presence_heartbeat; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_heartbeat ON public."UserPresence" USING btree (last_heartbeat);


--
-- Name: idx_user_presence_last_heartbeat; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_last_heartbeat ON public."UserPresence" USING btree (last_heartbeat);


--
-- Name: idx_user_presence_status; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_status ON public."UserPresence" USING btree (status);


--
-- Name: idx_user_presence_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_presence_user_id ON public."UserPresence" USING btree (user_id);


--
-- Name: idx_user_reputation_banned; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_banned ON public."UserReputation" USING btree (is_banned) WHERE (is_banned = true);


--
-- Name: idx_user_reputation_overall; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_overall ON public."UserReputationCache" USING btree (overall_reputation_score DESC);


--
-- Name: idx_user_reputation_score; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_score ON public."UserReputation" USING btree (reputation_score DESC);


--
-- Name: idx_user_reputation_tier; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_tier ON public."UserReputation" USING btree (reputation_tier);


--
-- Name: idx_user_reputation_updated; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_updated ON public."UserReputationCache" USING btree (updated_at DESC);


--
-- Name: idx_user_reputation_user_id; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_user_reputation_user_id ON public."UserReputation" USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_users_email ON public."Users" USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_users_username ON public."Users" USING btree (username) WHERE (username IS NOT NULL);


--
-- Name: idx_veracity_calculated_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_calculated_at ON public."VeracityScores" USING btree (calculated_at DESC);


--
-- Name: idx_veracity_expires_at; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_expires_at ON public."VeracityScores" USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_veracity_low_confidence; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_low_confidence ON public."VeracityScores" USING btree (veracity_score, evidence_count) WHERE (evidence_count < 3);


--
-- Name: idx_veracity_score; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_score ON public."VeracityScores" USING btree (veracity_score);


--
-- Name: INDEX idx_veracity_score; Type: COMMENT; Schema: public; Owner: kmk
--

COMMENT ON INDEX public.idx_veracity_score IS 'Optimizes veracity score sorting and filtering';


--
-- Name: idx_veracity_target_edge; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_target_edge ON public."VeracityScores" USING btree (target_edge_id) WHERE (target_edge_id IS NOT NULL);


--
-- Name: idx_veracity_target_node; Type: INDEX; Schema: public; Owner: kmk
--

CREATE INDEX idx_veracity_target_node ON public."VeracityScores" USING btree (target_node_id) WHERE (target_node_id IS NOT NULL);


--
-- Name: CuratorAuditLogView _RETURN; Type: RULE; Schema: public; Owner: kmk
--

CREATE OR REPLACE VIEW public."CuratorAuditLogView" AS
 SELECT cal.id AS audit_id,
    cal.curator_id,
    uc.user_id,
    u.username AS curator_username,
    cr.role_name AS curator_role,
    cal.action_type,
    cal.resource_type,
    cal.resource_id,
    cal.reason,
    cal.requires_peer_review,
    cal.peer_reviewed,
    cal.peer_review_status,
    cal.performed_at,
    count(cr2.id) AS review_count
   FROM ((((public."CuratorAuditLog" cal
     JOIN public."UserCurators" uc ON ((uc.id = cal.curator_id)))
     JOIN public."Users" u ON ((u.id = uc.user_id)))
     JOIN public."CuratorRoles" cr ON ((cr.id = uc.role_id)))
     LEFT JOIN public."CuratorReviews" cr2 ON ((cr2.audit_log_id = cal.id)))
  GROUP BY cal.id, uc.user_id, u.username, cr.role_name;


--
-- Name: Challenges challenge_veracity_refresh; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER challenge_veracity_refresh AFTER INSERT OR DELETE OR UPDATE ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.trigger_veracity_refresh_on_challenge();


--
-- Name: ChallengeVotes challenge_vote_stats_update; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER challenge_vote_stats_update AFTER INSERT OR UPDATE ON public."ChallengeVotes" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_challenge_stats();


--
-- Name: FormalInquiries enforce_confidence_ceiling; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER enforce_confidence_ceiling BEFORE INSERT OR UPDATE OF confidence_score, related_node_ids ON public."FormalInquiries" FOR EACH ROW EXECUTE FUNCTION public.apply_confidence_score_ceiling();


--
-- Name: Evidence evidence_credibility_update; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_credibility_update AFTER INSERT OR DELETE OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.trigger_source_credibility_update();


--
-- Name: Evidence evidence_level_0_check; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_level_0_check BEFORE INSERT OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.check_evidence_level_0();


--
-- Name: EvidenceMetadata evidence_metadata_search_index_update; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_metadata_search_index_update AFTER INSERT OR DELETE OR UPDATE ON public."EvidenceMetadata" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_evidence_search_index();


--
-- Name: EvidenceReviewVotes evidence_review_votes_update_counts; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_review_votes_update_counts AFTER INSERT OR DELETE ON public."EvidenceReviewVotes" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_review_helpfulness();


--
-- Name: EvidenceReviews evidence_reviews_search_index_update; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_reviews_search_index_update AFTER INSERT OR DELETE OR UPDATE ON public."EvidenceReviews" FOR EACH ROW EXECUTE FUNCTION public.trigger_update_evidence_search_index();


--
-- Name: Evidence evidence_veracity_refresh; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER evidence_veracity_refresh AFTER INSERT OR DELETE OR UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.trigger_veracity_refresh_on_evidence();


--
-- Name: InquiryVotes refresh_vote_stats; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER refresh_vote_stats AFTER INSERT OR DELETE OR UPDATE ON public."InquiryVotes" FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_inquiry_vote_stats();


--
-- Name: Challenges set_challenge_voting_deadline; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER set_challenge_voting_deadline BEFORE INSERT ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.trigger_set_voting_deadline();


--
-- Name: MethodologyStepCompletions trigger_invalidate_on_completion; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER trigger_invalidate_on_completion AFTER INSERT OR DELETE OR UPDATE ON public."MethodologyStepCompletions" FOR EACH ROW EXECUTE FUNCTION public.invalidate_eligibility_cache();


--
-- Name: ConsensusVotes trigger_invalidate_on_vote; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER trigger_invalidate_on_vote AFTER INSERT OR DELETE OR UPDATE ON public."ConsensusVotes" FOR EACH ROW EXECUTE FUNCTION public.invalidate_eligibility_cache();


--
-- Name: GraphActivity trigger_update_graph_on_activity; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER trigger_update_graph_on_activity AFTER INSERT ON public."GraphActivity" FOR EACH ROW EXECUTE FUNCTION public.update_graph_timestamp();


--
-- Name: UserPresence trigger_update_session_activity; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER trigger_update_session_activity AFTER UPDATE OF last_heartbeat ON public."UserPresence" FOR EACH ROW EXECUTE FUNCTION public.update_session_activity();


--
-- Name: UserReputationCache trigger_update_vote_weights; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER trigger_update_vote_weights AFTER UPDATE ON public."UserReputationCache" FOR EACH ROW WHEN ((old.overall_reputation_score IS DISTINCT FROM new.overall_reputation_score)) EXECUTE FUNCTION public.update_vote_weights_on_reputation_change();


--
-- Name: CuratorApplicationVotes update_application_votes_trigger; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_application_votes_trigger AFTER INSERT OR UPDATE ON public."CuratorApplicationVotes" FOR EACH ROW EXECUTE FUNCTION public.update_application_vote_counts();


--
-- Name: ChallengeComments update_challenge_comments_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_challenge_comments_updated_at BEFORE UPDATE ON public."ChallengeComments" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeEvidence update_challenge_evidence_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_challenge_evidence_updated_at BEFORE UPDATE ON public."ChallengeEvidence" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeTypes update_challenge_types_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_challenge_types_updated_at BEFORE UPDATE ON public."ChallengeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeVotes update_challenge_votes_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_challenge_votes_updated_at BEFORE UPDATE ON public."ChallengeVotes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Challenges update_challenges_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public."Challenges" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: CuratorApplications update_curator_applications_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_curator_applications_updated_at BEFORE UPDATE ON public."CuratorApplications" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: CuratorPermissions update_curator_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_curator_permissions_updated_at BEFORE UPDATE ON public."CuratorPermissions" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: CuratorRoles update_curator_roles_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_curator_roles_updated_at BEFORE UPDATE ON public."CuratorRoles" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceMetadata update_evidence_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_evidence_metadata_updated_at BEFORE UPDATE ON public."EvidenceMetadata" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceReviews update_evidence_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_evidence_reviews_updated_at BEFORE UPDATE ON public."EvidenceReviews" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Evidence update_evidence_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON public."Evidence" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: EvidenceVotes update_evidence_votes_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_evidence_votes_updated_at BEFORE UPDATE ON public."EvidenceVotes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Methodologies update_methodologies_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_methodologies_updated_at BEFORE UPDATE ON public."Methodologies" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyEdgeTypes update_methodology_edge_types_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_methodology_edge_types_updated_at BEFORE UPDATE ON public."MethodologyEdgeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyNodeTypes update_methodology_node_types_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_methodology_node_types_updated_at BEFORE UPDATE ON public."MethodologyNodeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: MethodologyWorkflows update_methodology_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_methodology_workflows_updated_at BEFORE UPDATE ON public."MethodologyWorkflows" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: RolePermissions update_role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public."RolePermissions" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: SourceCredibility update_source_credibility_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_source_credibility_updated_at BEFORE UPDATE ON public."SourceCredibility" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: Sources update_sources_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public."Sources" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: UserCurators update_user_curators_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_user_curators_updated_at BEFORE UPDATE ON public."UserCurators" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: UserReputation update_user_reputation_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public."UserReputation" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: VeracityScores update_veracity_scores_updated_at; Type: TRIGGER; Schema: public; Owner: kmk
--

CREATE TRIGGER update_veracity_scores_updated_at BEFORE UPDATE ON public."VeracityScores" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ChallengeComments ChallengeComments_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments ChallengeComments_hidden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_hidden_by_fkey" FOREIGN KEY (hidden_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeComments ChallengeComments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public."ChallengeComments"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments ChallengeComments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeComments"
    ADD CONSTRAINT "ChallengeComments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ChallengeEvidence ChallengeEvidence_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT "ChallengeEvidence_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeEvidence ChallengeEvidence_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT "ChallengeEvidence_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE SET NULL;


--
-- Name: ChallengeEvidence ChallengeEvidence_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT "ChallengeEvidence_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeEvidence ChallengeEvidence_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeEvidence"
    ADD CONSTRAINT "ChallengeEvidence_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeNotifications ChallengeNotifications_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeNotifications ChallengeNotifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeNotifications"
    ADD CONSTRAINT "ChallengeNotifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ChallengeResolutions ChallengeResolutions_appeal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_appeal_id_fkey" FOREIGN KEY (appeal_id) REFERENCES public."Challenges"(id);


--
-- Name: ChallengeResolutions ChallengeResolutions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeResolutions ChallengeResolutions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeResolutions"
    ADD CONSTRAINT "ChallengeResolutions_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


--
-- Name: ChallengeVotes ChallengeVotes_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: ChallengeVotes ChallengeVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChallengeVotes"
    ADD CONSTRAINT "ChallengeVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Challenges Challenges_challenge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_challenge_type_id_fkey" FOREIGN KEY (challenge_type_id) REFERENCES public."ChallengeTypes"(id);


--
-- Name: Challenges Challenges_challenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_challenger_id_fkey" FOREIGN KEY (challenger_id) REFERENCES public."Users"(id);


--
-- Name: Challenges Challenges_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


--
-- Name: Challenges Challenges_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Challenges Challenges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Challenges"
    ADD CONSTRAINT "Challenges_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ChatMessages ChatMessages_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChatMessages"
    ADD CONSTRAINT "ChatMessages_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: ChatMessages ChatMessages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ChatMessages"
    ADD CONSTRAINT "ChatMessages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: CollaborationSessions CollaborationSessions_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CollaborationSessions"
    ADD CONSTRAINT "CollaborationSessions_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: CollaborationSessions CollaborationSessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CollaborationSessions"
    ADD CONSTRAINT "CollaborationSessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: Comments Comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Comments Comments_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ConsensusSnapshots ConsensusSnapshots_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: ConsensusSnapshots ConsensusSnapshots_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusSnapshots"
    ADD CONSTRAINT "ConsensusSnapshots_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ConsensusVotes ConsensusVotes_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusVotes"
    ADD CONSTRAINT "ConsensusVotes_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: ConsensusVotes ConsensusVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."ConsensusVotes"
    ADD CONSTRAINT "ConsensusVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: CuratorApplicationVotes CuratorApplicationVotes_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplicationVotes"
    ADD CONSTRAINT "CuratorApplicationVotes_application_id_fkey" FOREIGN KEY (application_id) REFERENCES public."CuratorApplications"(id) ON DELETE CASCADE;


--
-- Name: CuratorApplicationVotes CuratorApplicationVotes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplicationVotes"
    ADD CONSTRAINT "CuratorApplicationVotes_voter_id_fkey" FOREIGN KEY (voter_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: CuratorApplications CuratorApplications_reviewed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplications"
    ADD CONSTRAINT "CuratorApplications_reviewed_by_user_id_fkey" FOREIGN KEY (reviewed_by_user_id) REFERENCES public."Users"(id);


--
-- Name: CuratorApplications CuratorApplications_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplications"
    ADD CONSTRAINT "CuratorApplications_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE;


--
-- Name: CuratorApplications CuratorApplications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorApplications"
    ADD CONSTRAINT "CuratorApplications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: CuratorAuditLog CuratorAuditLog_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorAuditLog"
    ADD CONSTRAINT "CuratorAuditLog_curator_id_fkey" FOREIGN KEY (curator_id) REFERENCES public."UserCurators"(id) ON DELETE CASCADE;


--
-- Name: CuratorAuditLog CuratorAuditLog_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorAuditLog"
    ADD CONSTRAINT "CuratorAuditLog_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: CuratorPermissions CuratorPermissions_granted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorPermissions"
    ADD CONSTRAINT "CuratorPermissions_granted_by_user_id_fkey" FOREIGN KEY (granted_by_user_id) REFERENCES public."Users"(id);


--
-- Name: CuratorPermissions CuratorPermissions_user_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorPermissions"
    ADD CONSTRAINT "CuratorPermissions_user_curator_id_fkey" FOREIGN KEY (user_curator_id) REFERENCES public."UserCurators"(id) ON DELETE CASCADE;


--
-- Name: CuratorReviews CuratorReviews_audit_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_audit_log_id_fkey" FOREIGN KEY (audit_log_id) REFERENCES public."CuratorAuditLog"(id) ON DELETE CASCADE;


--
-- Name: CuratorReviews CuratorReviews_escalated_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_escalated_to_user_id_fkey" FOREIGN KEY (escalated_to_user_id) REFERENCES public."Users"(id);


--
-- Name: CuratorReviews CuratorReviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public."UserCurators"(id) ON DELETE CASCADE;


--
-- Name: CuratorReviews CuratorReviews_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."CuratorReviews"
    ADD CONSTRAINT "CuratorReviews_reviewer_user_id_fkey" FOREIGN KEY (reviewer_user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: EdgeTypes EdgeTypes_source_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_source_node_type_id_fkey" FOREIGN KEY (source_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: EdgeTypes EdgeTypes_target_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EdgeTypes"
    ADD CONSTRAINT "EdgeTypes_target_node_type_id_fkey" FOREIGN KEY (target_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Edges Edges_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Edges Edges_edge_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_edge_type_id_fkey" FOREIGN KEY (edge_type_id) REFERENCES public."EdgeTypes"(id);


--
-- Name: Edges Edges_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: Edges Edges_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_source_node_id_fkey" FOREIGN KEY (source_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Edges Edges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Edges"
    ADD CONSTRAINT "Edges_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: EvidenceAuditLog EvidenceAuditLog_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public."Users"(id);


--
-- Name: EvidenceAuditLog EvidenceAuditLog_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceAuditLog"
    ADD CONSTRAINT "EvidenceAuditLog_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_evidence_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_evidence_id_1_fkey" FOREIGN KEY (evidence_id_1) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_evidence_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_evidence_id_2_fkey" FOREIGN KEY (evidence_id_2) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceDuplicates EvidenceDuplicates_merged_into_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_merged_into_evidence_id_fkey" FOREIGN KEY (merged_into_evidence_id) REFERENCES public."Evidence"(id);


--
-- Name: EvidenceDuplicates EvidenceDuplicates_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceDuplicates"
    ADD CONSTRAINT "EvidenceDuplicates_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public."Users"(id);


--
-- Name: EvidenceMetadata EvidenceMetadata_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceMetadata"
    ADD CONSTRAINT "EvidenceMetadata_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public."EvidenceReviews"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviewVotes EvidenceReviewVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviewVotes"
    ADD CONSTRAINT "EvidenceReviewVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviews EvidenceReviews_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceReviews EvidenceReviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceReviews"
    ADD CONSTRAINT "EvidenceReviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: EvidenceSearchIndex EvidenceSearchIndex_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceSearchIndex"
    ADD CONSTRAINT "EvidenceSearchIndex_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceVotes EvidenceVotes_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public."Evidence"(id) ON DELETE CASCADE;


--
-- Name: EvidenceVotes EvidenceVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."EvidenceVotes"
    ADD CONSTRAINT "EvidenceVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public."Sources"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(id);


--
-- Name: Evidence Evidence_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: Evidence Evidence_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Evidence"
    ADD CONSTRAINT "Evidence_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: FormalInquiries FormalInquiries_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "FormalInquiries_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: FormalInquiries FormalInquiries_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "FormalInquiries_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: FormalInquiries FormalInquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."FormalInquiries"
    ADD CONSTRAINT "FormalInquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: GraphActivity GraphActivity_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphActivity"
    ADD CONSTRAINT "GraphActivity_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: GraphActivity GraphActivity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphActivity"
    ADD CONSTRAINT "GraphActivity_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: GraphInvitations GraphInvitations_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphInvitations"
    ADD CONSTRAINT "GraphInvitations_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: GraphInvitations GraphInvitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphInvitations"
    ADD CONSTRAINT "GraphInvitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public."Users"(id);


--
-- Name: GraphLocks GraphLocks_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphLocks"
    ADD CONSTRAINT "GraphLocks_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: GraphLocks GraphLocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphLocks"
    ADD CONSTRAINT "GraphLocks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: GraphShares GraphShares_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphShares"
    ADD CONSTRAINT "GraphShares_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: GraphShares GraphShares_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphShares"
    ADD CONSTRAINT "GraphShares_shared_by_fkey" FOREIGN KEY (shared_by) REFERENCES public."Users"(id);


--
-- Name: GraphShares GraphShares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."GraphShares"
    ADD CONSTRAINT "GraphShares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Graphs Graphs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Graphs"
    ADD CONSTRAINT "Graphs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: InquiryVotes InquiryVotes_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_inquiry_id_fkey" FOREIGN KEY (inquiry_id) REFERENCES public."FormalInquiries"(id) ON DELETE CASCADE;


--
-- Name: InquiryVotes InquiryVotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."InquiryVotes"
    ADD CONSTRAINT "InquiryVotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: Methodologies Methodologies_parent_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Methodologies"
    ADD CONSTRAINT "Methodologies_parent_methodology_id_fkey" FOREIGN KEY (parent_methodology_id) REFERENCES public."Methodologies"(id) ON DELETE SET NULL;


--
-- Name: MethodologyEdgeTypes MethodologyEdgeTypes_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyEdgeTypes"
    ADD CONSTRAINT "MethodologyEdgeTypes_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyNodeTypes MethodologyNodeTypes_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyNodeTypes"
    ADD CONSTRAINT "MethodologyNodeTypes_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyPermissions MethodologyPermissions_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyPermissions"
    ADD CONSTRAINT "MethodologyPermissions_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES public."Users"(id);


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_step_id_fkey" FOREIGN KEY (step_id) REFERENCES public."MethodologyWorkflowSteps"(id) ON DELETE CASCADE;


--
-- Name: MethodologyStepCompletions MethodologyStepCompletions_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyStepCompletions"
    ADD CONSTRAINT "MethodologyStepCompletions_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: MethodologyWorkflowSteps MethodologyWorkflowSteps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyWorkflowSteps"
    ADD CONSTRAINT "MethodologyWorkflowSteps_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public."MethodologyWorkflows"(id) ON DELETE CASCADE;


--
-- Name: MethodologyWorkflows MethodologyWorkflows_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."MethodologyWorkflows"
    ADD CONSTRAINT "MethodologyWorkflows_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: NodeTypes NodeTypes_parent_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NodeTypes"
    ADD CONSTRAINT "NodeTypes_parent_node_type_id_fkey" FOREIGN KEY (parent_node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Nodes Nodes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: Nodes Nodes_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: Nodes Nodes_node_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_node_type_id_fkey" FOREIGN KEY (node_type_id) REFERENCES public."NodeTypes"(id);


--
-- Name: Nodes Nodes_primary_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Nodes"
    ADD CONSTRAINT "Nodes_primary_source_id_fkey" FOREIGN KEY (primary_source_id) REFERENCES public."Nodes"(id);


--
-- Name: NotificationPreferences NotificationPreferences_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: NotificationPreferences NotificationPreferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: OperationHistory OperationHistory_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."OperationHistory"
    ADD CONSTRAINT "OperationHistory_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: OperationHistory OperationHistory_transformed_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."OperationHistory"
    ADD CONSTRAINT "OperationHistory_transformed_from_fkey" FOREIGN KEY (transformed_from) REFERENCES public."OperationHistory"(id);


--
-- Name: OperationHistory OperationHistory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."OperationHistory"
    ADD CONSTRAINT "OperationHistory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: PromotionEligibilityCache PromotionEligibilityCache_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."PromotionEligibilityCache"
    ADD CONSTRAINT "PromotionEligibilityCache_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: PromotionEvents PromotionEvents_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."PromotionEvents"
    ADD CONSTRAINT "PromotionEvents_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: RolePermissions RolePermissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "RolePermissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE;


--
-- Name: SourceCredibility SourceCredibility_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SourceCredibility"
    ADD CONSTRAINT "SourceCredibility_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public."Sources"(id) ON DELETE CASCADE;


--
-- Name: Sources Sources_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public."Users"(id);


--
-- Name: Sources Sources_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."Sources"
    ADD CONSTRAINT "Sources_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public."Users"(id);


--
-- Name: SpamReports SpamReports_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES public."Challenges"(id) ON DELETE CASCADE;


--
-- Name: SpamReports SpamReports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: SpamReports SpamReports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."SpamReports"
    ADD CONSTRAINT "SpamReports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public."Users"(id);


--
-- Name: UserAchievements UserAchievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserAchievements"
    ADD CONSTRAINT "UserAchievements_achievement_id_fkey" FOREIGN KEY (achievement_id) REFERENCES public."Achievements"(id) ON DELETE CASCADE;


--
-- Name: UserAchievements UserAchievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserAchievements"
    ADD CONSTRAINT "UserAchievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: UserCurators UserCurators_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserCurators"
    ADD CONSTRAINT "UserCurators_assigned_by_user_id_fkey" FOREIGN KEY (assigned_by_user_id) REFERENCES public."Users"(id);


--
-- Name: UserCurators UserCurators_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserCurators"
    ADD CONSTRAINT "UserCurators_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."CuratorRoles"(id) ON DELETE CASCADE;


--
-- Name: UserCurators UserCurators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserCurators"
    ADD CONSTRAINT "UserCurators_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: UserMethodologyProgress UserMethodologyProgress_methodology_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserMethodologyProgress"
    ADD CONSTRAINT "UserMethodologyProgress_methodology_id_fkey" FOREIGN KEY (methodology_id) REFERENCES public."Methodologies"(id) ON DELETE CASCADE;


--
-- Name: UserPresence UserPresence_graph_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserPresence"
    ADD CONSTRAINT "UserPresence_graph_id_fkey" FOREIGN KEY (graph_id) REFERENCES public."Graphs"(id) ON DELETE CASCADE;


--
-- Name: UserPresence UserPresence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserPresence"
    ADD CONSTRAINT "UserPresence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: UserReputationCache UserReputationCache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserReputationCache"
    ADD CONSTRAINT "UserReputationCache_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: UserReputation UserReputation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."UserReputation"
    ADD CONSTRAINT "UserReputation_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: VeracityScoreHistory VeracityScoreHistory_veracity_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScoreHistory"
    ADD CONSTRAINT "VeracityScoreHistory_veracity_score_id_fkey" FOREIGN KEY (veracity_score_id) REFERENCES public."VeracityScores"(id) ON DELETE CASCADE;


--
-- Name: VeracityScores VeracityScores_target_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_target_edge_id_fkey" FOREIGN KEY (target_edge_id) REFERENCES public."Edges"(id) ON DELETE CASCADE;


--
-- Name: VeracityScores VeracityScores_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmk
--

ALTER TABLE ONLY public."VeracityScores"
    ADD CONSTRAINT "VeracityScores_target_node_id_fkey" FOREIGN KEY (target_node_id) REFERENCES public."Nodes"(id) ON DELETE CASCADE;


--
-- Name: ChallengeComments; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."ChallengeComments" ENABLE ROW LEVEL SECURITY;

--
-- Name: ChallengeVotes; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."ChallengeVotes" ENABLE ROW LEVEL SECURITY;

--
-- Name: GraphActivity; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."GraphActivity" ENABLE ROW LEVEL SECURITY;

--
-- Name: GraphInvitations; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."GraphInvitations" ENABLE ROW LEVEL SECURITY;

--
-- Name: GraphShares; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."GraphShares" ENABLE ROW LEVEL SECURITY;

--
-- Name: UserPresence; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."UserPresence" ENABLE ROW LEVEL SECURITY;

--
-- Name: UserReputation; Type: ROW SECURITY; Schema: public; Owner: kmk
--

ALTER TABLE public."UserReputation" ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE "ConsensusVotes"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT,INSERT,UPDATE ON TABLE public."ConsensusVotes" TO PUBLIC;


--
-- Name: TABLE "PromotionEligibilityCache"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."PromotionEligibilityCache" TO PUBLIC;


--
-- Name: TABLE "GraphsReadyForPromotion"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."GraphsReadyForPromotion" TO PUBLIC;


--
-- Name: TABLE "MethodologyStepCompletions"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT,INSERT ON TABLE public."MethodologyStepCompletions" TO PUBLIC;


--
-- Name: TABLE "MethodologyWorkflowSteps"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."MethodologyWorkflowSteps" TO PUBLIC;


--
-- Name: TABLE "PromotionEvents"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."PromotionEvents" TO PUBLIC;


--
-- Name: TABLE "RecentPromotions"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."RecentPromotions" TO PUBLIC;


--
-- Name: TABLE "UserReputationCache"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."UserReputationCache" TO PUBLIC;


--
-- Name: TABLE "TopContributors"; Type: ACL; Schema: public; Owner: kmk
--

GRANT SELECT ON TABLE public."TopContributors" TO PUBLIC;


--
-- Name: InquiryVoteStats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: kmk
--

REFRESH MATERIALIZED VIEW public."InquiryVoteStats";


--
-- PostgreSQL database dump complete
--

\unrestrict BRWvedC6LXeEsOwdcsj04Qtn2HqOpOC4xalL8pJPl0LzrH0oCm7AVoycgoPH8cg

