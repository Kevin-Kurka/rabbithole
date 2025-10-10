import { ObjectType, Field, ID, Float } from 'type-graphql';
import { Edge } from './Edge';
import { Comment } from './Comment';
import { User } from './User';
import { VeracityScore } from './VeracityScore';

@ObjectType()
export class Node {
  @Field(() => ID)
  id!: string;

  @Field(() => Float)
  weight!: number;

  @Field()
  props!: string; // JSON string

  @Field({ nullable: true })
  meta?: string; // JSON string

  @Field()
  is_level_0!: boolean;

  @Field(() => User, { nullable: true })
  created_by?: User;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field(() => [Edge])
  edges!: Edge[];

  @Field(() => [Comment])
  comments!: Comment[];

  @Field(() => VeracityScore, { nullable: true })
  veracity?: VeracityScore;
}