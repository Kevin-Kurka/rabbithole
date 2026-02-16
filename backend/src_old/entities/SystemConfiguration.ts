import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';

export enum ConfigurationCategory {
    SYSTEM = 'system',
    DATABASE = 'database',
    REDIS = 'redis',
    AI = 'ai',
    DOCUMENT = 'document',
    STORAGE = 'storage',
    SECURITY = 'security',
    OTHER = 'other'
}

export enum ConfigurationDataType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    JSON = 'json',
    URL = 'url',
    SECRET = 'secret'
}

registerEnumType(ConfigurationCategory, {
    name: 'ConfigurationCategory',
    description: 'Category of the configuration setting'
});

registerEnumType(ConfigurationDataType, {
    name: 'ConfigurationDataType',
    description: 'Data type of the configuration value'
});

@ObjectType()
export class SystemConfiguration {
    @Field(() => ID)
    id!: string;

    @Field()
    key!: string;

    @Field()
    value!: string;

    @Field(() => ConfigurationCategory)
    category!: ConfigurationCategory;

    @Field()
    description!: string;

    @Field(() => ConfigurationDataType)
    data_type!: ConfigurationDataType;

    @Field()
    is_secret!: boolean;

    @Field()
    is_system!: boolean;

    @Field({ nullable: true })
    updated_by?: string;

    @Field()
    updated_at!: Date;

    @Field()
    created_at!: Date;
}

@ObjectType()
export class MaskedConfiguration {
    @Field(() => ID)
    id!: string;

    @Field()
    key!: string;

    @Field()
    value!: string;

    @Field(() => ConfigurationCategory)
    category!: ConfigurationCategory;

    @Field()
    description!: string;

    @Field(() => ConfigurationDataType)
    data_type!: ConfigurationDataType;

    @Field()
    is_secret!: boolean;

    @Field()
    is_system!: boolean;

    @Field({ nullable: true })
    updated_by?: string;

    @Field()
    updated_at!: Date;
}

@ObjectType()
export class ConfigurationAuditLog {
    @Field(() => ID)
    id!: string;

    @Field()
    config_key!: string;

    @Field({ nullable: true })
    old_value?: string;

    @Field({ nullable: true })
    new_value?: string;

    @Field()
    changed_by!: string;

    @Field()
    changed_at!: Date;

    @Field({ nullable: true })
    change_reason?: string;
}
