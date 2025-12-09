import { ObjectType, Field, ID, registerEnumType, Float, Int } from 'type-graphql';

export enum MessageRole {
    SYSTEM = 'system',
    USER = 'user',
    ASSISTANT = 'assistant'
}

registerEnumType(MessageRole, {
    name: 'MessageRole',
    description: 'Role of the message sender'
});

@ObjectType()
export class Message {
    @Field(() => MessageRole)
    role!: MessageRole;

    @Field()
    content!: string;

    @Field()
    timestamp!: Date;
}

@ObjectType()
export class Conversation {
    @Field(() => ID)
    id!: string;

    @Field(() => ID)
    graphId!: string;

    @Field(() => ID)
    userId!: string;

    @Field(() => [Message])
    messages!: Message[];

    @Field()
    lastUpdated!: Date;

    @Field(() => Int)
    messageCount!: number;
}

@ObjectType()
export class ConversationMessage extends Message {
    @Field(() => ID)
    userId!: string;

    @Field(() => ID)
    conversationId!: string;
}

@ObjectType()
export class SearchableNode {
    @Field(() => ID)
    id!: string;

    @Field()
    title!: string;

    @Field()
    type!: string;

    @Field()
    content!: string;

    @Field(() => Float)
    similarity!: number;
}

@ObjectType()
export class ConversationalAIResponse {
    @Field(() => ID)
    conversationId!: string;

    @Field()
    answer!: string;

    @Field(() => [SearchableNode])
    sources!: SearchableNode[];

    @Field(() => [String])
    suggestedFollowUp!: string[];
}
