import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { Evidence } from './Evidence';

@ObjectType()
export class EvidenceGeolocation {
  @Field(() => Float)
  lat!: number;

  @Field(() => Float)
  lon!: number;

  @Field({ nullable: true })
  name?: string;
}

@ObjectType()
export class EvidenceMetadata {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  evidence_id!: string;

  @Field(() => Evidence, { nullable: true })
  evidence?: Evidence;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field(() => [String], { nullable: true })
  author_affiliations?: string[];

  @Field({ nullable: true })
  corresponding_author?: string;

  @Field({ nullable: true })
  publication_date?: Date;

  @Field({ nullable: true })
  access_date?: Date;

  @Field({ nullable: true })
  relevant_date_range?: string; // Stored as string representation

  @Field({ nullable: true })
  journal?: string;

  @Field({ nullable: true })
  conference?: string;

  @Field({ nullable: true })
  publisher?: string;

  @Field({ nullable: true })
  volume?: string;

  @Field({ nullable: true })
  issue?: string;

  @Field({ nullable: true })
  pages?: string;

  @Field({ nullable: true })
  doi?: string;

  @Field({ nullable: true })
  isbn?: string;

  @Field({ nullable: true })
  issn?: string;

  @Field({ nullable: true })
  pmid?: string;

  @Field({ nullable: true })
  arxiv_id?: string;

  @Field({ nullable: true })
  study_type?: string;

  @Field({ nullable: true })
  methodology?: string;

  @Field(() => Int, { nullable: true })
  sample_size?: number;

  @Field(() => Int, { nullable: true })
  study_duration_days?: number;

  @Field({ nullable: true })
  peer_reviewed?: boolean;

  @Field()
  preprint!: boolean;

  @Field(() => [String], { nullable: true })
  keywords?: string[];

  @Field(() => [String], { nullable: true })
  topics?: string[];

  @Field({ nullable: true })
  abstract?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field()
  language!: string;

  @Field(() => Float, { nullable: true })
  language_confidence?: number;

  @Field(() => EvidenceGeolocation, { nullable: true })
  geolocation?: EvidenceGeolocation;

  @Field({ nullable: true })
  geographic_scope?: string;

  @Field(() => [String], { nullable: true })
  countries_covered?: string[];

  @Field({ nullable: true })
  jurisdiction?: string;

  @Field({ nullable: true })
  legal_context?: string;

  @Field({ nullable: true })
  regulation_reference?: string;

  @Field({ nullable: true })
  license?: string;

  @Field({ nullable: true })
  access_restrictions?: string;

  @Field()
  paywall!: boolean;

  @Field({ nullable: true })
  copyright_holder?: string;

  @Field(() => Float, { nullable: true })
  impact_factor?: number;

  @Field(() => Int)
  citation_count!: number;

  @Field(() => Int, { nullable: true })
  h_index?: number;

  @Field(() => Int, { nullable: true })
  altmetric_score?: number;

  @Field({ nullable: true })
  data_collection_method?: string;

  @Field(() => [String], { nullable: true })
  instruments_used?: string[];

  @Field(() => [String], { nullable: true })
  software_used?: string[];

  @Field(() => [String], { nullable: true })
  statistical_methods?: string[];

  @Field(() => [String], { nullable: true })
  funding_sources?: string[];

  @Field({ nullable: true })
  conflicts_of_interest?: string;

  @Field({ nullable: true })
  ethical_approval?: string;

  @Field({ nullable: true })
  data_availability?: string;

  @Field(() => [String], { nullable: true })
  supplementary_materials?: string[];

  @Field({ nullable: true })
  custom_metadata?: string; // JSON string

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
