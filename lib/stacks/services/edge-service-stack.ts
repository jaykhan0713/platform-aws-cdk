import * as cdk from 'aws-cdk-lib'
import { BaseStack, BaseStackProps } from 'lib/stacks/base-stack'

export class EdgeServiceStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props)
    }
}