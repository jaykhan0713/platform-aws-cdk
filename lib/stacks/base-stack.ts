import * as cdk from 'aws-cdk-lib'

import type { EnvConfig } from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain'
import { TagKeys } from 'lib/config/naming'
import {PlatformServiceName} from 'lib/config/service/platform-service-name'


export interface BaseStackProps extends cdk.StackProps {
    readonly envConfig: EnvConfig
    readonly stackDomain: StackDomain | PlatformServiceName
}

export abstract class BaseStack extends cdk.Stack {
    public readonly envConfig: EnvConfig
    public readonly stackDomain: StackDomain

    protected constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)

        cdk.Tags.of(this).add(TagKeys.Project, props.envConfig.projectName)
        cdk.Tags.of(this).add(TagKeys.Env, props.envConfig.envName)
        cdk.Tags.of(this).add(TagKeys.ManagedBy, props.envConfig.tags.managedBy)
    }
}
