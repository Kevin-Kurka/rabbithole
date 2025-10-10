import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Methodology } from './Methodology';

@ObjectType()
export class MethodologyNodeType {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  methodology_id!: string;

  @Field()
  name!: string;

  @Field()
  display_name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field()
  properties_schema!: string; // JSON string

  @Field({ nullable: true })
  default_properties?: string; // JSON string

  @Field(() => [String], { nullable: true })
  required_properties?: string[];

  @Field({ nullable: true })
  constraints?: string; // JSON string

  @Field({ nullable: true })
  suggestions?: string; // JSON string

  @Field({ nullable: true })
  visual_config?: string; // JSON string

  @Field(() => Int)
  display_order!: number;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  // Resolved fields
  @Field(() => Methodology)
  methodology!: Methodology;
}
