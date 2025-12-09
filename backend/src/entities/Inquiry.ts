import { ObjectType, Field, ID } from 'type-graphql';

export enum InquiryStatus {
    PENDING = 'pending',
    OPEN = 'open',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@ObjectType()
export class Inquiry {
    @Field(() => ID)
    id!: string;

    @Field()
    question!: string;

    @Field()
    status!: string;

    @Field(() => ID)
    userId!: string;

    @Field({ nullable: true })
    result?: string;

    @Field()
    createdAt!: Date;

    @Field()
    updatedAt!: Date;
}
