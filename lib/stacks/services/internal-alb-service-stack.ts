import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import { BaseStack } from 'lib/stacks/base-stack'
import {PlatformServiceProps} from 'lib/stacks/props/platform-service-props'
import {PlatformInternalAlb} from 'lib/constructs/elb/platform-internal-alb'
import {PlatformEcsTaskSecurityGroup} from 'lib/constructs/ecs/platform-ecs-task-security-group'
import {defaultTaskDefConfig} from 'lib/config/taskdef/taskdef-config'
import {PlatformEcsTaskRole} from 'lib/constructs/ecs/platform-ecs-task-role'
import {PlatformEcsTaskDef} from 'lib/constructs/ecs/platform-ecs-task-def'
import {PlatformEcsRollingService} from 'lib/constructs/ecs/platform-ecs-rolling-service'
import {PlatformInternalAlbTargetGroup} from 'lib/constructs/elb/platform-internal-alb-target-group'
import {PlatformEcsTaskExecutionRole} from 'lib/constructs/ecs/platform-ecs-task-execution-role'

export class InternalAlbServiceStack extends BaseStack {

    constructor(scope: cdk.App, id: string, props: PlatformServiceProps) {
        super(scope, id, props)

        const { envConfig, serviceName } = props
        const { vpc, platformVpcLink } = props.runtime

        const imageTag = this.node.tryGetContext('ImageTag')

        if (imageTag == undefined) {
            throw new Error('ImageTag is empty.')
        }

        // 1. Create  VPC, solve SG dependencies

        const albHttpListenerPort = 80
        const platformInternalAlb = new PlatformInternalAlb(this, 'PlatformInternalAlb', {
            ...props,
            upstreamSg: platformVpcLink.securityGroup,
            serviceName,
            vpc,
            albHttpListenerPort: albHttpListenerPort
        })

        platformVpcLink.securityGroup.addEgressRule(
            platformInternalAlb.securityGroup,
            ec2.Port.tcp(albHttpListenerPort),
            `VpcLink Egress to Alb on port ${albHttpListenerPort}`,
            true //sg from different stack, rule is owned bby this stack.
        )

        // 2. create ECS Service SG and solve deps, TODO: can create map and pass configs in with key serviceName
        const taskDefCfg = defaultTaskDefConfig({
            serviceName,
            envConfig,
            apsRemoteWriteEndpoint: props.runtime.apsRemoteWriteEndpoint
        })

        const appContainerPort = taskDefCfg.app.containerPort

        const ecsTaskSg = new PlatformEcsTaskSecurityGroup(this, 'PlatformEcsTaskSecurityGroup', {
            ...props,
            vpc,
            serviceName,
            upstreamSg: platformInternalAlb.securityGroup,
            appContainerPort
        }).securityGroup

        platformInternalAlb.securityGroup.addEgressRule(
            ecsTaskSg,
            ec2.Port.tcp(appContainerPort),
            `Internal Alb SG Egress to ${serviceName}, app container port: ${appContainerPort}`
        )

        // 3. create task def, related roles, then ECS Service
        const taskRole = new PlatformEcsTaskRole(this, 'PlatformEcsTaskRole', {
            ...props,
            apsWorkspaceArn: props.runtime.apsWorkspaceArn
        }).taskRole

        const taskExecutionRole = new PlatformEcsTaskExecutionRole(
            this,
            'PlatformEcsTaskExecutionRole',
            props
        ).taskExecutionRole

        const fargateTaskDef = new PlatformEcsTaskDef(this, 'PlatformEcsTaskDef', {
            ...props,
            taskDefCfg,
            taskRole,
            taskExecutionRole,
            appImage: ecs.ContainerImage.fromEcrRepository(props.serviceRepo, imageTag.valueAsString)
        }).fargateTaskDef

        // 4. create ecs service, target groups, attach to TG
        const fargateService = new PlatformEcsRollingService(this, 'PlatformEcsRollingService', {
            ...props,
            fargateTaskDef,
            desiredCount: 1,
            securityGroups: [ecsTaskSg],
            healthCheckGracePeriodSeconds: 90
        }).fargateService

        new PlatformInternalAlbTargetGroup(this, 'PlatformInternalAlbTargetGroup', {
            ...props,
            listener: platformInternalAlb.listener,
            fargateService,
            containerPort: taskDefCfg.app.containerPort
        })
    }
}