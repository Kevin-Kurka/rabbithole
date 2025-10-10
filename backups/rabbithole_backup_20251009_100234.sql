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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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
    is_level_0 BOOLEAN;
    base_score REAL;
    consensus_score REAL;
    challenge_impact REAL;
    final_score REAL;
BEGIN
    -- Check if target is Level 0 (immutable truth)
    IF target_type = 'node' THEN
        SELECT is_level_0 INTO is_level_0
        FROM public."Nodes" WHERE id = target_id;
    ELSE
        SELECT is_level_0 INTO is_level_0
        FROM public."Edges" WHERE id = target_id;
    END IF;

    -- Level 0 always has veracity = 1.0
    IF is_level_0 THEN
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
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

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
-- Data for Name: ChallengeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChallengeTypes" (id, type_code, display_name, description, icon, color, min_reputation_required, evidence_required, max_veracity_impact, min_votes_required, acceptance_threshold, voting_duration_hours, guidelines, example_challenges, is_active, created_at, updated_at) FROM stdin;
e91bf583-0b25-4231-9fe5-85a7f3ef7769	factual_error	Factual Error	The claim contains demonstrably false information	\N	\N	10	t	0.3	5	0.6	72	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
3e3d9ae3-8145-4b92-ac5f-4ec9ddb43911	missing_context	Missing Context	Important context is omitted that changes interpretation	\N	\N	5	t	0.2	5	0.6	72	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
86943c67-a90a-4251-b650-4cd12de614e2	bias	Bias	The claim shows clear bias or one-sided presentation	\N	\N	15	t	0.15	5	0.6	96	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
be210502-7ae2-4e3a-946b-7dd127bef968	source_credibility	Source Credibility	The sources cited are unreliable or misrepresented	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
d05a07a5-e7ab-493b-9876-946e200bc150	logical_fallacy	Logical Fallacy	The reasoning contains formal or informal logical fallacies	\N	\N	25	t	0.2	5	0.6	48	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
ef06cfe1-951f-49c0-bca5-835d7929c9b9	outdated_information	Outdated Information	The information is no longer current or accurate	\N	\N	5	t	0.15	5	0.6	48	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
9488e736-f0a3-4c8d-be10-5d051bf18d4f	misleading_representation	Misleading Representation	Data or facts are presented in a misleading way	\N	\N	20	t	0.25	5	0.6	72	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
74ce492c-6d35-451d-a69f-213c576ce166	conflict_of_interest	Conflict of Interest	Undisclosed conflicts affect the credibility	\N	\N	30	t	0.2	5	0.6	96	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
cc9e8be9-a52b-4abe-91ca-84d68d6b499a	methodological_flaw	Methodological Flaw	The methodology used to support the claim is flawed	\N	\N	35	t	0.3	5	0.6	96	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
20c9d2bc-aee6-4082-85a6-f89245f2ba07	other	Other	Other type of challenge not covered above	\N	\N	50	t	0.1	5	0.6	120	\N	[]	t	2025-10-09 17:02:17.744252+00	2025-10-09 17:02:17.744252+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at, description, checksum, execution_time_ms) FROM stdin;
001	2025-10-09 17:02:17+00	Initial schema - base tables	\N	\N
\.


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
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: idx_challenge_types_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_types_active ON public."ChallengeTypes" USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_challenge_types_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_challenge_types_code ON public."ChallengeTypes" USING btree (type_code);


--
-- Name: ChallengeTypes update_challenge_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_challenge_types_updated_at BEFORE UPDATE ON public."ChallengeTypes" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- PostgreSQL database dump complete
--

