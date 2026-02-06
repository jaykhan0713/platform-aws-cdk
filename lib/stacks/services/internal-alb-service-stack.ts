import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import { BaseStack } from 'lib/stacks/base-stack'
import {PlatformServiceProps} from 'lib/stacks/services/props/platform-service-props'
import {PlatformInternalAlb} from 'lib/constructs/elb/platform-internal-alb'
import {PlatformEcsTaskSecurityGroup} from 'lib/constructs/ecs/platform-ecs-task-security-group'
import {defaultTaskDefConfig} from 'lib/config/taskdef/taskdef-config'
import {PlatformEcsTaskRole} from 'lib/constructs/ecs/platform-ecs-task-role'
import {PlatformEcsTaskDef} from 'lib/constructs/ecs/platform-ecs-task-def'
import {PlatformEcsRollingService} from 'lib/constructs/ecs/platform-ecs-rolling-service'
import {PlatformInternalAlbTargetGroup} from 'lib/constructs/elb/platform-internal-alb-target-group'
import {PlatformEcsTaskExecutionRole} from 'lib/constructs/ecs/platform-ecs-task-execution-role'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {ObservabilityImports} from 'lib/config/dependency/core/observability-imports'
import * as ecr from 'aws-cdk-lib/aws-ecr'

export class InternalAlbServiceStack extends BaseStack {

    constructor(scope: cdk.App, id: string, props: PlatformServiceProps) {
        super(scope, id, props)

        const { envConfig, serviceName } = props
        const { platformVpcLink } = props.runtime

        const imageTag = this.node.tryGetContext('ImageTag')
        if (typeof imageTag !== 'string' || imageTag.trim() === '') {
            throw new Error(`${props.stackName}: ImageTag context is required`)
        }

        if (platformVpcLink === undefined) {
            throw new Error(`${props.stackName}: missing VpcLink`)
        }

        const vpc = NetworkImports.vpc(this, envConfig)
        const privateIsolatedSubnets = NetworkImports.privateIsolatedSubnets(this, envConfig)

        const taskDefCfg = defaultTaskDefConfig({
            serviceName,
            envConfig,
            apsRemoteWriteEndpoint: ObservabilityImports.apsRemoteWriteEndpoint(envConfig)
        })

        // 1. Create  ALB, TG, solve SG dependencies

        const tg = new PlatformInternalAlbTargetGroup(this, 'PlatformInternalAlbTargetGroup', {
            ...props,
            vpc,
            containerPort: taskDefCfg.app.containerPort,
        }).tg

        const albHttpListenerPort = 80
        const platformInternalAlb = new PlatformInternalAlb(this, 'PlatformInternalAlb', {
            ...props,
            upstreamSg: platformVpcLink.securityGroup,
            serviceName,
            vpc,
            albHttpListenerPort: albHttpListenerPort,
            privateIsolatedSubnets,
            tg
        })

        platformVpcLink.securityGroup.addEgressRule(
            platformInternalAlb.securityGroup,
            ec2.Port.tcp(albHttpListenerPort),
            `VpcLink Egress to Alb on port ${albHttpListenerPort}`,
            true //sg from different stack, rule is owned by this stack.
        )

        // 2. create ECS Service SG and solve deps, optional: can create map and pass configs in with key serviceName

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
            apsWorkspaceArn: ObservabilityImports.apsWorkspaceArn(envConfig)
        }).taskRole

        const taskExecutionRole = new PlatformEcsTaskExecutionRole(
            this,
            'PlatformEcsTaskExecutionRole',
            props
        ).taskExecutionRole

        const serviceRepo = ecr.Repository.fromRepositoryName(
            this,
            'ServiceRepo',
            `${envConfig.projectName}/services/${serviceName}`
        )

        const fargateTaskDef = new PlatformEcsTaskDef(this, 'PlatformEcsTaskDef', {
            ...props,
            taskDefCfg,
            taskRole,
            taskExecutionRole,
            appImage: ecs.ContainerImage.fromEcrRepository(serviceRepo, imageTag)
        }).fargateTaskDef

        // 4. create ecs service, target groups, attach to TG
        const fargateService = new PlatformEcsRollingService(this, 'PlatformEcsRollingService', {
            ...props,
            fargateTaskDef,
            desiredCount: 1,
            securityGroups: [ecsTaskSg],
            healthCheckGracePeriodSeconds: 90,
            privateIsolatedSubnets
        }).fargateService

        fargateService.attachToApplicationTargetGroup(tg)

    }
}