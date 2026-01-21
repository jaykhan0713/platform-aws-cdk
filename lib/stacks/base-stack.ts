import * as cdk from 'aws-cdk-lib'

import { TagKeys } from 'lib/config/tags'
import type { EnvConfig} from 'lib/config/env';
import type { StackDomain } from 'lib/config/naming'


export interface BaseStackProps extends cdk.StackProps {
    readonly envConfig: EnvConfig
    readonly stackDomain: StackDomain
}

export abstract class BaseStack extends cdk.Stack {
    protected readonly envConfig: EnvConfig
    protected readonly stackDomain: StackDomain

    protected constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)

        this.envConfig = props.envConfig
        this.stackDomain = props.stackDomain

        cdk.Tags.of(this).add(TagKeys.Project, props.envConfig.projectName)
        cdk.Tags.of(this).add(TagKeys.Env, props.envConfig.envName)
        cdk.Tags.of(this).add(TagKeys.ManagedBy, props.envConfig.tags.managedBy)
    }
}
