import { ObjectType, Field, ID, Int } from 'type-graphql';
import { User } from './User';
import { Graph } from './Graph';
import { Methodology } from './Methodology';

@ObjectType()
export class UserMethodologyProgress {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field(() => ID)
  graph_id!: string;

  @Field(() => ID)
  methodology_id!: string;

  @Field(() => Int)
  current_step!: number;

  @Field()
  completed_steps!: string; // JSON string array

  @Field({ nullable: true })
  step_data?: string; // JSON string

  @Field()
  status!: string;

  @Field(() => Int)
  completion_percentage!: number;

  @Field()
  started_at!: Date;

  @Field()
  last_active_at!: Date;

  @Field({ nullable: true })
  completed_at?: Date;

  // Resolved fields
  @Field(() => User)
  user!: User;

  @Field(() => Graph)
  graph!: Graph;

  @Field(() => Methodology)
  methodology!: Methodology;
}

@ObjectType()
export class MethodologyPermission {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  methodology_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field()
  can_view!: boolean;

  @Field()
  can_fork!: boolean;

  @Field()
  can_edit!: boolean;

  @Field()
  can_delete!: boolean;

  @Field({ nullable: true })
  shared_by?: string;

  @Field()
  shared_at!: Date;

  @Field({ nullable: true })
  expires_at?: Date;

  // Resolved fields
  @Field(() => Methodology)
  methodology!: Methodology;

  @Field(() => User)
  user!: User;

  @Field(() => User, { nullable: true })
  shared_by_user?: User;
}
