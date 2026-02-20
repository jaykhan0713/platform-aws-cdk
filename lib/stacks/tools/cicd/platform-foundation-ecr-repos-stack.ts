import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'

export class PlatformFoundationEcrReposStack extends BaseStack {

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)
    }
}
