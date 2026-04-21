// Base node wrapper (what Sentient returns)
export interface SentientNode<T = Record<string, unknown>> {
  id: string;
  tenant_id: string;
  type: string;
  properties: T;
  created_at: string;
  updated_at: string;
}

export interface SentientEdge<T = Record<string, unknown>> {
  id: string;
  tenant_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  properties: T;
  created_at: string;
  updated_at: string;
}

// ---- Node Properties ----

export interface UserProps {
  username: string;
  display_name: string;
  bio?: string;
  reputation_score: number;
  joined_at: string;
}

export interface ArticleProps {
  title: string;
  body: string;
  summary?: string;
  status: 'draft' | 'published';
  published_at?: string;
}

export interface ClaimProps {
  text: string;
  highlight_start?: number;
  highlight_end?: number;
  status: 'unchallenged' | 'challenged' | 'verified' | 'debunked' | 'contested';
  tags?: string[];
}

export type ChallengeFramework = 'legal' | 'scientific' | 'journalistic' | 'logical' | 'intelligence';

export interface VerdictLevel {
  level: string;
  label: string;
  description: string;
  color: string;
}

export interface ChallengeTemplate {
  framework: ChallengeFramework;
  label: string;
  icon: string;
  description: string;
  criteria: string[];
  evidenceStandards: string;
  verdictScale: VerdictLevel[];
}

export interface ChallengeProps {
  title: string;
  rationale: string;
  target_type: 'claim' | 'evidence';
  status: 'open' | 'in_review' | 'resolved';
  community_score: number;
  ai_score: number;
  ai_analysis?: string;
  verdict: 'pending' | 'verified' | 'debunked' | 'contested' | 'insufficient_evidence';
  opened_at: string;
  resolved_at?: string;
  framework?: ChallengeFramework;
  checked_criteria?: string[];
  verdict_scale?: VerdictLevel[];
}

export interface EvidenceProps {
  title: string;
  body: string;
  source_url?: string;
  source_type: 'primary_source' | 'document' | 'data' | 'testimony' | 'expert_opinion' | 'media' | 'academic';
  side: 'for' | 'against';
  relevance_score: number;
  credibility_score: number;
  status: 'unchallenged' | 'challenged' | 'verified' | 'debunked';
}

export interface TheoryProps {
  title: string;
  summary?: string;
  body: string;
  status: 'draft' | 'published';
  published_at?: string;
}

export interface OpinionProps {
  body: string;
  created_at: string;
}

export interface SourceProps {
  url: string;
  title: string;
  publication?: string;
  author?: string;
  date?: string;
  source_type: 'news' | 'academic' | 'government' | 'primary' | 'other';
  credibility_rating?: number;
}

export interface VoteProps {
  side: 'for' | 'against';
  cast_at: string;
}

// ---- Convenience type aliases ----

export type User = SentientNode<UserProps>;
export type Article = SentientNode<ArticleProps>;
export type Claim = SentientNode<ClaimProps>;
export type Challenge = SentientNode<ChallengeProps>;
export type Evidence = SentientNode<EvidenceProps>;
export type Theory = SentientNode<TheoryProps>;
export type Opinion = SentientNode<OpinionProps>;
export type Source = SentientNode<SourceProps>;
export type Vote = SentientNode<VoteProps>;

// ---- Edge property types ----

export interface CitesEdgeProps {
  context?: string;
}

export interface ReferencesEdgeProps {
  context?: string;
}

export interface ConnectsEdgeProps {
  sequence: number;
  annotation?: string;
}

export interface RelatedToEdgeProps {
  discovered_by: 'ai' | 'user';
  confidence?: number;
}

// ---- Rich Edge Properties (generic for all edge types) ----

export interface RichEdgeProps {
  label?: string;
  relationship_type?: string;
  confidence?: number;
  evidence_basis?: string;
  status?: 'active' | 'challenged' | 'verified' | 'debunked';
  created_by?: 'user' | 'ai';
  challenge_count?: number;
}
