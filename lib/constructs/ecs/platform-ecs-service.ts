import * as ec2 from 'aws-cdk-lib/aws-ec2'
import {Construct} from 'constructs'
import {BaseStack} from 'lib/stacks/base-stack'
import type {PlatformServiceStackProps} from 'lib/stacks/props/platform-service-stack-props'

export interface PlatformEcsTaskSecurityGroupConstructProps {
    vpc: ec2.IVpc
    envName: string
    appPort: number

    // usually the ALB SG, but could be another upstream SG
    upstreamSecurityGroup: ec2.ISecurityGroup
}

export class PlatformEcsService extends Construct {
    public constructor(
        scope: BaseStack,
        id: string,
        props: PlatformServiceStackProps
    ) {
        super(scope, id)
    }
}