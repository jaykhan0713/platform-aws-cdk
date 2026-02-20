import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformInternalAlb} from 'lib/constructs/alb/platform-internal-alb'
import {PlatformEcsTaskSecurityGroup} from 'lib/constructs/ecs/platform-ecs-task-security-group'
import {defaultTaskDefConfig} from 'lib/config/taskdef/taskdef-config'
import {PlatformEcsTaskRole} from 'lib/constructs/ecs/platform-ecs-task-role'
import {PlatformEcsTaskDef} from 'lib/constructs/ecs/platform-ecs-task-def'
import {PlatformEcsRollingService} from 'lib/constructs/ecs/platform-ecs-rolling-service'
import {PlatformInternalAlbTargetGroup} from 'lib/constructs/alb/platform-internal-alb-target-group'
import {PlatformEcsTaskExecutionRole} from 'lib/constructs/ecs/platform-ecs-task-execution-role'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {ObservabilityImports} from 'lib/config/dependency/observability/observability-imports'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {resolveExportName} from "lib/config/naming";
import {AlbExports} from "lib/config/dependency/alb/alb-exports";
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {ServiceRuntimeImports} from 'lib/config/dependency/service-runtime/service-runtime-imports'

export interface InternalAlbServiceStackProps extends BaseStackProps {
    serviceName: PlatformServiceName
    upstreamToAlbSgs?: ec2.ISecurityGroup[] //sg's to albSg.addIngress(),
    vpcLinkEnabled ?: boolean
}

export class InternalAlbServiceStack extends BaseStack {

    constructor(scope: cdk.App, id: string, props: InternalAlbServiceStackProps) {
        super(scope, id, props)

        const { envConfig, serviceName, upstreamToAlbSgs } = props

        const imageTag = this.node.tryGetContext('imageTag')

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

        const vpcLinkSubSgId = props.vpcLinkEnabled
            ? NetworkImports.vpcLinkSubSgId(envConfig)
            : undefined
        const vpcLinkSubSg = vpcLinkSubSgId
            ? ec2.SecurityGroup.fromSecurityGroupId(
                this,
                'ImportedVpcLinkSg',
                vpcLinkSubSgId,
                { mutable: true }
            )
            : undefined

        const internalServicesSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'InternalServicesSgImported',
            ServiceRuntimeImports.internalServicesTaskSgId(envConfig),
            { mutable: false }
        )

        //if non vpc link path, must be reachable from other internal services
        const combinedToAlbSgs =
            [
                ...(upstreamToAlbSgs ?? []),
                ...(vpcLinkSubSg ? [] : [internalServicesSg])
            ]

        const albHttpListenerPort = 80
        const platformInternalAlb = new PlatformInternalAlb(this, 'PlatformInternalAlb', {
            ...props,
            upstreamSgs: combinedToAlbSgs, //for albsg.addIngress(), if non vpc link -> alb, pass in internalServices sg here
            serviceName,
            vpc,
            albHttpListenerPort,
            privateIsolatedSubnets,
            tg
        })

        if (vpcLinkSubSg) {
            platformInternalAlb.alb.addSecurityGroup(vpcLinkSubSg)
        }

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

        // 3. create task def, related roles
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
            ),
            adotImage: ecs.ContainerImage.fromEcrRepository( //TODO import repo ARN from ssm
                ecr.Repository.fromRepositoryName(
                    this,
                    'AdotRepo',
                    `${envConfig.projectName}/adot-collector`
                ),
                'stable'
            )
        }).fargateTaskDef

        // 4. create ecs service, target groups, attach to TG
        const cluster = ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', {
            clusterArn: ServiceRuntimeImports.ecsClusterArn(envConfig),
            clusterName: ServiceRuntimeImports.ecsClusterName(envConfig),
            vpc
        })

        const fargateService = new PlatformEcsRollingService(this, 'PlatformEcsRollingService', {
            ...props,
            fargateTaskDef,
            desiredCount: 1,
            securityGroups: [ecsTaskSg, internalServicesSg],
            healthCheckGracePeriodSeconds: 90,
            privateIsolatedSubnets,
            serviceName,
            cluster,
            httpNamespaceName: ServiceRuntimeImports.httpNamespaceName(envConfig)
        }).fargateService

        //use L1 as attachToApplicationTargetGroup helper mutates SG's ingress and egress
        const cfnService = fargateService.node.defaultChild as ecs.CfnService

        cfnService.loadBalancers = [
            {
                containerName: taskDefCfg.app.containerName,
                containerPort: appContainerPort,
                targetGroupArn: tg.targetGroupArn
            }
        ]

        //make sure the service depends on the listener so registration order is clean
        cfnService.addDependency(platformInternalAlb.listener.node.defaultChild as any)

        new cdk.CfnOutput(this, 'CfnOutputAlbListenerArn', {
            description: 'Alb Listener ARN',
            value: platformInternalAlb.listener.listenerArn,
            exportName: resolveExportName(envConfig, props.stackDomain, AlbExports.albListenerArn)
        })

    }
}