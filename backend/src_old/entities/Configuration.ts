import { ObjectType, Field, ID, Float, Int } from 'type-graphql';

export enum ConfigDataType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    JSON = 'json',
}

@ObjectType()
export class Configuration {
    @Field(() => ID)
    key!: string;

    @Field()
    value!: string;

    @Field()
    dataType!: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    category!: string;

    @Field()
    isPublic!: boolean;

    @Field()
    isSecret!: boolean;

    @Field()
    updatedAt!: Date;

    @Field({ nullable: true })
    updatedBy?: string;
}

@ObjectType()
export class ConfigurationResponse {
    @Field()
    success!: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => Configuration, { nullable: true })
    configuration?: Configuration;
}

@ObjectType()
export class ConfigurationsResponse {
    @Field()
    success!: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => [Configuration], { nullable: true })
    configurations?: Configuration[];
}

@ObjectType()
export class ConnectionTestResponse {
    @Field()
    success!: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => Float, { nullable: true })
    latency?: number;

    @Field(() => [String], { nullable: true })
    availableModels?: string[];
}

@ObjectType()
export class ImportConfigurationsResponse {
    @Field()
    success!: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => Int)
    imported!: number;

    @Field(() => Int)
    skipped!: number;
}
