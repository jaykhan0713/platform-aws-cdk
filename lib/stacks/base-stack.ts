import * as cdk from 'aws-cdk-lib'

import type { EnvConfig} from 'lib/config/env';
import { TagKeys } from 'lib/config/tags'

export interface BaseStackProps extends cdk.StackProps {
    readonly envConfig: EnvConfig
}

export abstract class BaseStack extends cdk.Stack {
    protected readonly envConfig: EnvConfig

    protected constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)

        this.envConfig = props.envConfig

        cdk.Tags.of(this).add(TagKeys.Project, props.envConfig.projectName)
        cdk.Tags.of(this).add(TagKeys.Env, props.envConfig.envName)
        cdk.Tags.of(this).add(TagKeys.ManagedBy, props.envConfig.tags.managedBy)
    }
}
