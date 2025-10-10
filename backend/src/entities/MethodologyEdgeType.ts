import { ObjectType, Field, ID, Int, registerEnumType } from 'type-graphql';
import { Methodology } from './Methodology';

export enum EdgeLineStyle {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted'
}

export enum EdgeArrowStyle {
  ARROW = 'arrow',
  NONE = 'none',
  CIRCLE = 'circle',
  DIAMOND = 'diamond'
}

registerEnumType(EdgeLineStyle, {
  name: 'EdgeLineStyle',
  description: 'Line style for methodology edges'
});

registerEnumType(EdgeArrowStyle, {
  name: 'EdgeArrowStyle',
  description: 'Arrow style for methodology edges'
});

@ObjectType()
export class MethodologyEdgeType {
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

  @Field()
  is_directed!: boolean;

  @Field({ nullable: true })
  is_bidirectional?: boolean;

  @Field()
  valid_source_types!: string; // JSON string array

  @Field()
  valid_target_types!: string; // JSON string array

  @Field({ nullable: true })
  source_cardinality?: string; // JSON string

  @Field({ nullable: true })
  target_cardinality?: string; // JSON string

  @Field(() => EdgeLineStyle)
  line_style!: EdgeLineStyle;

  @Field({ nullable: true })
  line_color?: string;

  @Field(() => EdgeArrowStyle)
  arrow_style!: EdgeArrowStyle;

  @Field({ nullable: true })
  properties_schema?: string; // JSON string

  @Field({ nullable: true })
  default_properties?: string; // JSON string

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
