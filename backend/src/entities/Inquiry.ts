import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { User } from './User';
import { Node } from './Node';
import { Edge } from './Edge';

export enum InquiryStatus {
  OPEN = 'open',
  ANSWERED = 'answered',
  RESOLVED = 'resolved',
}

registerEnumType(InquiryStatus, {
  name: 'InquiryStatus',
  description: 'Status of an inquiry',
});

/**
 * Inquiry Entity
 * Public inquiries/questions about nodes or edges that cannot be hidden by authors
 */
@ObjectType()
export class Inquiry {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  target_node_id?: string;

  @Field(() => Node, { nullable: true })
  target_node?: Node;

  @Field(() => ID, { nullable: true })
  target_edge_id?: string;

  @Field(() => Edge, { nullable: true })
  target_edge?: Edge;

  @Field(() => ID)
  user_id!: string;

  @Field(() => User)
  user!: User;

  @Field()
  content!: string;

  @Field(() => InquiryStatus)
  status!: InquiryStatus;

  @Field(() => ID, { nullable: true })
  parent_inquiry_id?: string;

  @Field(() => Inquiry, { nullable: true })
  parent_inquiry?: Inquiry;

  @Field(() => [Inquiry], { nullable: true })
  replies?: Inquiry[];

  @Field()
  created_at!: Date;

  @Field()
  updated_at!: Date;
}
