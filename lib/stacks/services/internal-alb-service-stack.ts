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
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {ISecurityGroup} from 'aws-cdk-lib/aws-ec2'

export interface InternalAlbServiceStackProps extends PlatformServiceProps {
    upstreamSgs?: ec2.ISecurityGroup[] //sg's to alb.addIngress(),
    vpcLinkEnabled ?: boolean
}

export class InternalAlbServiceStack extends BaseStack {

    constructor(scope: cdk.App, id: string, props: InternalAlbServiceStackProps) {
        super(scope, id, props)

        const { envConfig, serviceName, upstreamSgs } = props

        //pin the image tag as a parameter so this stack can always synth.
        const imageTag = this.node.tryGetContext('imageTag')

        if (imageTag === undefined) {
            throw new Error(`-c imageTag is empty`)
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

        const vpcLinkSgId = props.vpcLinkEnabled
            ? NetworkImports.vpcLinkSgId(envConfig)
            : undefined
        const vpcLinkSg = vpcLinkSgId
            ? ec2.SecurityGroup.fromSecurityGroupId(
                this,
                'ImportedVpcLinkSg',
                vpcLinkSgId,
                { mutable: true }
            )
            : undefined

        const combinedUpstreamSgs: ISecurityGroup[] = [
            ...(vpcLinkSg ? [vpcLinkSg] : []),
            ...(upstreamSgs ?? [])
        ]

        const albHttpListenerPort = 80
        const platformInternalAlb = new PlatformInternalAlb(this, 'PlatformInternalAlb', {
            ...props,
            upstreamSgs: combinedUpstreamSgs, //for albsg.addIngress(), if non vpc link -> alb, pass in internalServices sg here
            serviceName,
            vpc,
            albHttpListenerPort,
            privateIsolatedSubnets,
            tg
        })

        vpcLinkSg?.addEgressRule(
            platformInternalAlb.securityGroup,
            ec2.Port.tcp(albHttpListenerPort),
            `allow Vpc Link egress to Alb sg ingress on port: ${albHttpListenerPort}`
        )

        // 2. create ECS Service SG and solve deps, optional: can create map and pass configs in with key serviceName

        const appContainerPort = taskDefCfg.app.containerPort

        const ecsTaskSg = new PlatformEcsTaskSecurityGroup(this, 'PlatformEcsTaskSecurityGroup', {
            ...props,
            vpc,
            serviceName,
            upstreamSgs: [platformInternalAlb.securityGroup],
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

        const fargateTaskDef = new PlatformEcsTaskDef(this, 'PlatformEcsTaskDef', {
            ...props,
            taskDefCfg,
            taskRole,
            taskExecutionRole,
            appImage: ecs.ContainerImage.fromEcrRepository(
                //Can use ECR promotion for multi-account.
                ecr.Repository.fromRepositoryName(
                    this,
                    'ServiceRepo',
                    `${resolvePlatformServiceRepoName(envConfig, serviceName)}`
                ),
                imageTag
            )
        }).fargateTaskDef

        // 4. create ecs service, target groups, attach to TG
        const internalServicesSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'InternalServicesSgImported',
            props.runtime.internalServicesSgId,
            { mutable: false }
        )


        const fargateService = new PlatformEcsRollingService(this, 'PlatformEcsRollingService', {
            ...props,
            fargateTaskDef,
            desiredCount: 1,
            securityGroups: [ecsTaskSg, internalServicesSg],
            healthCheckGracePeriodSeconds: 90,
            privateIsolatedSubnets
        }).fargateService

        fargateService.attachToApplicationTargetGroup(tg)

    }
}