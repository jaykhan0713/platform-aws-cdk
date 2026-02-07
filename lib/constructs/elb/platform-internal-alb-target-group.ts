import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { Construct } from 'constructs'

import { PlatformServiceProps } from 'lib/stacks/services/props/platform-service-props'


export interface PlatformInternalAlbTargetGroupProps extends PlatformServiceProps {
    vpc: ec2.IVpc
    containerPort: number
}

export class PlatformInternalAlbTargetGroup extends Construct {
    public readonly tg: elbv2.ApplicationTargetGroup

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformInternalAlbTargetGroupProps
    ) {
        super(scope, id)

        const { envConfig, serviceName, vpc  } = props

        this.tg = new elbv2.ApplicationTargetGroup(this, 'DownstreamServiceTg', {
            targetGroupName: `${serviceName}-alb-tg-${envConfig.envName}`,
            vpc,
            port: props.containerPort,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/actuator/health/readiness'
            },
            //allow existing connections to continue for Duration after ALB stops sending new requests
            deregistrationDelay: cdk.Duration.seconds(60)
        })
    }
}