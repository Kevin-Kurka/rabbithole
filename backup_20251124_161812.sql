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
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: EdgeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EdgeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."EdgeTypes" OWNER TO postgres;

--
-- Name: NodeTypes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NodeTypes" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."NodeTypes" OWNER TO postgres;

--
-- Name: RefreshTokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshTokens" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."RefreshTokens" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Users" OWNER TO postgres;

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
-- Data for Name: EdgeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EdgeTypes" (id, name, description, created_at) FROM stdin;
5ac5880a-0d07-486d-afe1-dc62caa4c256	HAS_POSITION	Connects an Inquiry to a Position	2025-11-24 17:34:11.636735+00
5dd8b613-05c3-466c-8d3b-a12d21b57b74	CITES_EVIDENCE	Connects a Position or Inquiry to Evidence	2025-11-24 17:34:11.636735+00
605c0a68-81d6-4494-8c85-b41bbab4e6de	VOTES_ON	Connects a Vote to a Position or Inquiry	2025-11-24 17:34:11.636735+00
6bd23f11-ad42-4226-8e3d-b1781039b025	AUTHORED_BY	Connects a Node to a User (if represented as a Node)	2025-11-24 17:34:11.636735+00
2b1d88d1-cd32-422d-9ab9-bf0225f27653	RELATED_TO	Generic relationship between nodes	2025-11-24 17:34:11.636735+00
a0147469-9302-4d0e-b9c7-df8fca9685ec	USES_METHODOLOGY	Connects an Inquiry to a Methodology	2025-11-24 17:34:11.636735+00
dd3683d3-0205-498a-8b21-7d232fd10c29	HAS_ROLE	Connects a User to a CuratorRole	2025-11-24 17:34:11.636735+00
3005aa03-3e2b-4137-80a4-c00eca77a98f	TAGGED_WITH	Connects a Node to a Tag	2025-11-24 17:34:11.636735+00
\.


--
-- Data for Name: NodeTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NodeTypes" (id, name, description, created_at) FROM stdin;
110be301-b46c-4717-820b-d7f26bb6a950	Inquiry	A core question or topic of investigation	2025-11-24 17:34:11.634791+00
a5825adb-82f5-4bd6-9cc3-7b1e4b05d1f8	Position	A stance or argument related to an inquiry	2025-11-24 17:34:11.634791+00
c25a837e-87f9-475e-b53c-421d65310740	Evidence	Supporting material or data	2025-11-24 17:34:11.634791+00
c7dd8e0b-9de3-4920-91d6-d4aefdb09635	Methodology	A defined process or framework	2025-11-24 17:34:11.634791+00
497b5ee5-9e66-4f5d-8bce-7ecd884f5174	ActivityPost	A user activity or update	2025-11-24 17:34:11.634791+00
46c9746c-51ac-4148-ab69-cbc2691f4177	CuratorRole	A role assigned to a curator	2025-11-24 17:34:11.634791+00
d08d145f-c14d-4cc3-a6b4-ea4b10e5ec1b	ConsensusVote	A vote on a position or inquiry	2025-11-24 17:34:11.634791+00
8c7966a4-16bc-42e4-ad0a-f1feef0ee8b2	Tag	A label for categorization	2025-11-24 17:34:11.634791+00
332c3465-5904-4a09-8807-e473bbefb0ce	UserProfile	Extended profile data for a user	2025-11-24 17:34:11.634791+00
\.


--
-- Data for Name: RefreshTokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshTokens" (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, username, email, password_hash, role, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (version, applied_at, description, checksum, execution_time_ms) FROM stdin;
001	2025-11-24 17:34:11.325336+00	core schema	\N	0
002	2025-11-24 17:34:11.537367+00	functions and indexes	\N	0
003	2025-11-24 17:34:11.715602+00	seed types	\N	0
\.


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
-- Name: RefreshTokens RefreshTokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshTokens"
    ADD CONSTRAINT "RefreshTokens_pkey" PRIMARY KEY (id);


--
-- Name: RefreshTokens RefreshTokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshTokens"
    ADD CONSTRAINT "RefreshTokens_token_key" UNIQUE (token);


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
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: Users set_timestamp_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public."Users" FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: RefreshTokens RefreshTokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshTokens"
    ADD CONSTRAINT "RefreshTokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

