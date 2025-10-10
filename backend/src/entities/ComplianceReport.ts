import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class ComplianceIssue {
  @Field()
  type!: string;

  @Field()
  severity!: string; // 'error', 'warning', 'suggestion'

  @Field()
  message!: string;

  @Field({ nullable: true })
  nodeId?: string;

  @Field({ nullable: true })
  edgeId?: string;

  @Field({ nullable: true })
  suggestion?: string;
}

@ObjectType()
export class ComplianceReport {
  @Field()
  graphId!: string;

  @Field()
  methodologyId!: string;

  @Field()
  methodologyName!: string;

  @Field(() => Int)
  complianceScore!: number; // 0-100

  @Field()
  isCompliant!: boolean;

  @Field(() => [ComplianceIssue])
  issues!: ComplianceIssue[];

  @Field(() => Int)
  totalNodes!: number;

  @Field(() => Int)
  totalEdges!: number;

  @Field(() => Int)
  missingRequiredNodeTypes!: number;

  @Field(() => Int)
  invalidEdgeConnections!: number;

  @Field({ nullable: true })
  overallAssessment?: string;

  @Field()
  generatedAt!: Date;
}

@ObjectType()
export class AIConversationMessage {
  @Field()
  role!: string; // 'user' or 'assistant'

  @Field()
  content!: string;

  @Field()
  timestamp!: Date;
}

@ObjectType()
export class EvidenceSuggestion {
  @Field()
  type!: string; // 'source', 'document', 'data', 'expert', 'experiment'

  @Field()
  description!: string;

  @Field()
  searchQuery!: string;

  @Field(() => Int)
  priority!: number; // 1-5

  @Field({ nullable: true })
  rationale?: string;
}
