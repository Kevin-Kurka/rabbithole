import { ObjectType, Field, ID, Int } from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Node } from './Node';
import { Edge } from './Edge';

@ObjectType()
export class GraphVersion {
    @Field(() => ID)
    id!: string;

    @Field(() => ID)
    graphId!: string;

    @Field(() => Int)
    versionNumber!: number;

    @Field(() => GraphQLJSON)
    data!: any; // The snapshot data

    @Field({ nullable: true })
    commitMessage?: string;

    @Field(() => ID)
    createdBy!: string;

    @Field()
    createdAt!: Date;
}

@ObjectType()
export class GraphVersionHistory {
    @Field(() => ID)
    id!: string;

    @Field(() => Int)
    versionNumber!: number;

    @Field({ nullable: true })
    commitMessage?: string;

    @Field(() => ID)
    createdBy!: string;

    @Field()
    createdAt!: Date;
}

@ObjectType()
export class GraphFork {
    @Field(() => ID)
    id!: string;

    @Field(() => ID)
    originalGraphId!: string;

    @Field(() => ID)
    forkedGraphId!: string;

    @Field(() => String)
    forkedGraphName!: string;

    @Field(() => ID)
    forkedBy!: string;

    @Field({ nullable: true })
    forkReason?: string;

    @Field()
    forkedAt!: Date;
}

@ObjectType()
export class GraphAncestor {
    @Field(() => ID)
    graphId!: string;

    @Field()
    graphName!: string;

    @Field(() => Int)
    depth!: number;

    @Field({ nullable: true })
    forkedAt?: Date;
}
