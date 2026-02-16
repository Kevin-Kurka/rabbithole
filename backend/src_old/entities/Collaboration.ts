import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';

export enum PresenceStatus {
    ONLINE = 'online',
    IDLE = 'idle',
    OFFLINE = 'offline'
}

registerEnumType(PresenceStatus, {
    name: 'PresenceStatus',
    description: 'Status of the user presence'
});

@ObjectType()
export class UserPresence {
    @Field(() => ID)
    userId!: string;

    @Field()
    userName!: string;

    @Field({ nullable: true })
    userAvatar?: string;

    @Field(() => ID)
    graphId!: string;

    @Field(() => PresenceStatus)
    status!: PresenceStatus;

    @Field(() => [ID], { nullable: true })
    selectedNodeIds?: string[];

    @Field()
    lastActive!: Date;
}
