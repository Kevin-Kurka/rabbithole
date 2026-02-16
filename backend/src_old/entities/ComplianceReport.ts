import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

@ObjectType()
export class ComplianceIssue {
    @Field(() => ID, { nullable: true })
    id?: string;

    @Field()
    type!: string;

    @Field()
    severity!: string;

    @Field()
    message!: string;

    @Field({ nullable: true })
    suggestion?: string;

    @Field({ nullable: true })
    location?: string;

    @Field({ nullable: true })
    nodeId?: string;

    @Field({ nullable: true })
    edgeId?: string;
}

@ObjectType()
export class EvidenceSuggestion {
    @Field(() => ID, { nullable: true })
    id?: string;

    @Field()
    type!: string;

    @Field()
    description!: string;

    @Field()
    searchQuery!: string;

    @Field(() => Int)
    priority!: number;

    @Field()
    rationale!: string;
}

@ObjectType()
export class ComplianceReport {
    @Field(() => ID)
    graphId!: string;

    @Field()
    methodologyId!: string;

    @Field()
    methodologyName!: string;

    @Field(() => Int)
    complianceScore!: number;

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

    @Field()
    overallAssessment!: string;

    @Field()
    generatedAt!: Date;
}
