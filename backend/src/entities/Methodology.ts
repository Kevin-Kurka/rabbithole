import { ObjectType, Field, ID, Int, Float, registerEnumType } from 'type-graphql';
import { User } from './User';
import { MethodologyNodeType } from './MethodologyNodeType';
import { MethodologyEdgeType } from './MethodologyEdgeType';
import { MethodologyWorkflow } from './MethodologyWorkflow';
import { MethodologyCategory, MethodologyStatus } from '../types/methodology';

// Re-export for backward compatibility
export { MethodologyCategory, MethodologyStatus };

registerEnumType(MethodologyCategory, {
  name: 'MethodologyCategory',
  description: 'Categories for investigation methodologies'
});

registerEnumType(MethodologyStatus, {
  name: 'MethodologyStatus',
  description: 'Status of a methodology'
});

@ObjectType()
export class Methodology {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => MethodologyCategory)
  category!: MethodologyCategory;

  @Field(() => MethodologyStatus)
  status!: MethodologyStatus;

  @Field(() => Int)
  version!: number;

  @Field()
  is_system!: boolean;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  config?: string; // JSON string

  @Field(() => Int)
  usage_count!: number;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field({ nullable: true })
  created_by?: string;

  @Field({ nullable: true })
  parent_methodology_id?: string;

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;

  @Field({ nullable: true })
  published_at?: Date;

  // Resolved fields
  @Field(() => User, { nullable: true })
  creator?: User;

  @Field(() => Methodology, { nullable: true })
  parent_methodology?: Methodology;

  @Field(() => [MethodologyNodeType])
  node_types!: MethodologyNodeType[];

  @Field(() => [MethodologyEdgeType])
  edge_types!: MethodologyEdgeType[];

  @Field(() => MethodologyWorkflow, { nullable: true })
  workflow?: MethodologyWorkflow;
}
