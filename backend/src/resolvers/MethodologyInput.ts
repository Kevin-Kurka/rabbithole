import { InputType, Field, ID, Int, Float } from 'type-graphql';
import { MethodologyCategory, MethodologyStatus } from '../entities/Methodology';
import { EdgeLineStyle, EdgeArrowStyle } from '../entities/MethodologyEdgeType';

@InputType()
export class CreateMethodologyInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => MethodologyCategory)
  category!: MethodologyCategory;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  config?: string; // JSON string
}

@InputType()
export class UpdateMethodologyInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => MethodologyStatus, { nullable: true })
  status?: MethodologyStatus;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  config?: string; // JSON string
}

@InputType()
export class CreateMethodologyNodeTypeInput {
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

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  display_order?: number;
}

@InputType()
export class UpdateMethodologyNodeTypeInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  display_name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  color?: string;

  @Field({ nullable: true })
  properties_schema?: string;

  @Field({ nullable: true })
  default_properties?: string;

  @Field(() => [String], { nullable: true })
  required_properties?: string[];

  @Field({ nullable: true })
  constraints?: string;

  @Field({ nullable: true })
  suggestions?: string;

  @Field({ nullable: true })
  visual_config?: string;

  @Field(() => Int, { nullable: true })
  display_order?: number;
}

@InputType()
export class CreateMethodologyEdgeTypeInput {
  @Field(() => ID)
  methodology_id!: string;

  @Field()
  name!: string;

  @Field()
  display_name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ defaultValue: true })
  is_directed!: boolean;

  @Field({ nullable: true, defaultValue: false })
  is_bidirectional?: boolean;

  @Field()
  valid_source_types!: string; // JSON string array

  @Field()
  valid_target_types!: string; // JSON string array

  @Field({ nullable: true })
  source_cardinality?: string; // JSON string

  @Field({ nullable: true })
  target_cardinality?: string; // JSON string

  @Field(() => EdgeLineStyle, { nullable: true, defaultValue: EdgeLineStyle.SOLID })
  line_style?: EdgeLineStyle;

  @Field({ nullable: true })
  line_color?: string;

  @Field(() => EdgeArrowStyle, { nullable: true, defaultValue: EdgeArrowStyle.ARROW })
  arrow_style?: EdgeArrowStyle;

  @Field({ nullable: true })
  properties_schema?: string;

  @Field({ nullable: true })
  default_properties?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  display_order?: number;
}

@InputType()
export class UpdateMethodologyEdgeTypeInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  display_name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  is_directed?: boolean;

  @Field({ nullable: true })
  is_bidirectional?: boolean;

  @Field({ nullable: true })
  valid_source_types?: string;

  @Field({ nullable: true })
  valid_target_types?: string;

  @Field({ nullable: true })
  source_cardinality?: string;

  @Field({ nullable: true })
  target_cardinality?: string;

  @Field(() => EdgeLineStyle, { nullable: true })
  line_style?: EdgeLineStyle;

  @Field({ nullable: true })
  line_color?: string;

  @Field(() => EdgeArrowStyle, { nullable: true })
  arrow_style?: EdgeArrowStyle;

  @Field({ nullable: true })
  properties_schema?: string;

  @Field({ nullable: true })
  default_properties?: string;

  @Field(() => Int, { nullable: true })
  display_order?: number;
}

@InputType()
export class CreateWorkflowInput {
  @Field(() => ID)
  methodology_id!: string;

  @Field()
  steps!: string; // JSON string

  @Field({ nullable: true })
  initial_canvas_state?: string; // JSON string

  @Field({ nullable: true, defaultValue: false })
  is_linear?: boolean;

  @Field({ nullable: true, defaultValue: true })
  allow_skip?: boolean;

  @Field({ nullable: true, defaultValue: false })
  require_completion?: boolean;

  @Field({ nullable: true })
  instructions?: string;

  @Field({ nullable: true })
  tutorial_url?: string;

  @Field(() => ID, { nullable: true })
  example_graph_id?: string;
}

@InputType()
export class UpdateWorkflowInput {
  @Field({ nullable: true })
  steps?: string;

  @Field({ nullable: true })
  initial_canvas_state?: string;

  @Field({ nullable: true })
  is_linear?: boolean;

  @Field({ nullable: true })
  allow_skip?: boolean;

  @Field({ nullable: true })
  require_completion?: boolean;

  @Field({ nullable: true })
  instructions?: string;

  @Field({ nullable: true })
  tutorial_url?: string;

  @Field(() => ID, { nullable: true })
  example_graph_id?: string;
}

@InputType()
export class MethodologyFilterInput {
  @Field(() => MethodologyCategory, { nullable: true })
  category?: MethodologyCategory;

  @Field(() => MethodologyStatus, { nullable: true })
  status?: MethodologyStatus;

  @Field({ nullable: true })
  is_system?: boolean;

  @Field(() => ID, { nullable: true })
  creator_id?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  search?: string;
}

@InputType()
export class ShareMethodologyInput {
  @Field(() => ID)
  methodology_id!: string;

  @Field(() => ID)
  user_id!: string;

  @Field({ nullable: true, defaultValue: true })
  can_view?: boolean;

  @Field({ nullable: true, defaultValue: true })
  can_fork?: boolean;

  @Field({ nullable: true, defaultValue: false })
  can_edit?: boolean;

  @Field({ nullable: true, defaultValue: false })
  can_delete?: boolean;

  @Field({ nullable: true })
  expires_at?: Date;
}

@InputType()
export class UpdateWorkflowProgressInput {
  @Field(() => ID)
  graph_id!: string;

  @Field()
  step_id!: string;

  @Field({ nullable: true })
  step_data?: string; // JSON string
}

@InputType()
export class RateMethodologyInput {
  @Field(() => ID)
  methodology_id!: string;

  @Field(() => Float)
  rating!: number;
}
