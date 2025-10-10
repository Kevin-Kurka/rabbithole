import { ObjectType, Field, ID, Float, Int } from 'type-graphql';
import { User } from './User';
import { SourceCredibility } from './SourceCredibility';

@ObjectType()
export class Source {
  @Field(() => ID)
  id!: string;

  @Field()
  source_type!: string; // 'academic_paper', 'news_article', 'government_report', etc.

  @Field()
  title!: string;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  doi?: string;

  @Field({ nullable: true })
  isbn?: string;

  @Field({ nullable: true })
  publication_date?: Date;

  @Field({ nullable: true })
  publisher?: string;

  @Field({ nullable: true })
  abstract?: string;

  @Field({ nullable: true })
  content_hash?: string;

  @Field()
  is_verified!: boolean;

  @Field(() => ID, { nullable: true })
  verified_by?: string;

  @Field({ nullable: true })
  verified_at?: Date;

  @Field({ nullable: true })
  metadata?: string; // JSON string

  @Field(() => ID, { nullable: true })
  submitted_by?: string;

  @Field(() => User, { nullable: true })
  submitter?: User;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field(() => SourceCredibility, { nullable: true })
  credibility?: SourceCredibility;
}
