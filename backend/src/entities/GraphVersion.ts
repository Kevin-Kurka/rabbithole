import { ObjectType, Field, ID, Int } from 'type-graphql';
import { User } from './User';

@ObjectType()
export class GraphVersion {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  graph_id!: string;

  @Field(() => Int)
  version_number!: number;

  @Field()
  snapshot_data!: string; // JSONB stored as JSON string

  @Field({ nullable: true })
  snapshot_metadata?: string; // JSONB stored as JSON string

  @Field()
  created_at!: Date;

  @Field(() => User, { nullable: true })
  created_by?: User;
}

@ObjectType()
export class GraphVersionHistory {
  @Field(() => ID)
  version_id!: string;

  @Field(() => Int)
  version_number!: number;

  @Field()
  created_at!: Date;

  @Field(() => ID, { nullable: true })
  created_by?: string;

  @Field({ nullable: true })
  snapshot_metadata?: string;
}

@ObjectType()
export class GraphFork {
  @Field(() => ID)
  fork_id!: string;

  @Field()
  fork_name!: string;

  @Field({ nullable: true })
  fork_description?: string;

  @Field()
  created_at!: Date;

  @Field(() => ID, { nullable: true })
  created_by?: string;

  @Field({ nullable: true })
  fork_metadata?: string;
}

@ObjectType()
export class GraphAncestor {
  @Field(() => ID)
  ancestor_id!: string;

  @Field()
  ancestor_name!: string;

  @Field(() => Int)
  ancestor_level!: number;

  @Field(() => Int)
  depth!: number;
}
