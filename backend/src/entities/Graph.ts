import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Node } from './Node';
import { Edge } from './Edge';
import { User } from './User';

@ObjectType()
export class Graph {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  level!: number;

  @Field({ nullable: true })
  methodology?: string;

  @Field()
  privacy!: string;

  @Field(() => User, { nullable: true })
  created_by?: User;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field(() => ID, { nullable: true })
  parent_graph_id?: string;

  @Field({ nullable: true })
  fork_metadata?: string;

  @Field(() => [Node])
  nodes!: Node[];

  @Field(() => [Edge])
  edges!: Edge[];
}
