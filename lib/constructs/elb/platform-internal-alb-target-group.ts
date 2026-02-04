import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { Construct } from 'constructs'

import { PlatformServiceProps } from 'lib/stacks/props/platform-service-props'


export interface PlatformInternalAlbTargetGroupProps extends PlatformServiceProps {
    listener: elbv2.ApplicationListener
    fargateService: ecs.FargateService

    containerPort: number
}

export class PlatformInternalAlbTargetGroup extends Construct {

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformInternalAlbTargetGroupProps
    ) {
        super(scope, id)

        const { envConfig, fargateService, listener, serviceName  } = props
        const { vpc } = props.runtime

        const tg = new elbv2.ApplicationTargetGroup(this, 'DownstreamServiceTg', {
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


        // attach ECS service to TG
        fargateService.attachToApplicationTargetGroup(tg)

        // tell listener to forward to TG
        listener.addTargetGroups('ForwardToDownstream', {
            targetGroups: [tg]
        })

    }
}