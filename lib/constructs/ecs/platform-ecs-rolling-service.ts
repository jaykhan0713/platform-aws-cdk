import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import { Construct } from 'constructs'

import type { PlatformServiceRuntimeProps } from 'lib/stacks/props/platform-service-runtime-props'
import { PlatformServiceName } from 'lib/config/domain/platform-service-name'

interface PlatformEcsRollingServiceProps extends PlatformServiceRuntimeProps {
    serviceName: PlatformServiceName
    taskDefinitionArn: string

    desiredCount: number

    taskSecurityGroup: ec2.ISecurityGroup
    subnetType: ec2.SubnetType


}

export class PlatformEcsRollingService extends Construct {
    public constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsRollingServiceProps
    ) {
        super(scope, id)

    }
}