import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {ObservabilityImports} from 'lib/config/dependency/observability/observability-imports'
import {PlatformEcsTaskSecurityGroup} from 'lib/constructs/ecs/platform-ecs-task-security-group'
import {PlatformEcsTaskRole} from 'lib/constructs/ecs/platform-ecs-task-role'
import {PlatformEcsTaskExecutionRole} from 'lib/constructs/ecs/platform-ecs-task-execution-role'
import {PlatformEcsTaskDef} from 'lib/constructs/ecs/platform-ecs-task-def'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {PlatformEcsRollingService} from 'lib/constructs/ecs/platform-ecs-rolling-service'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {ServiceRuntimeImports} from 'lib/config/dependency/service-runtime/service-runtime-imports'
import {TaskDefinitionConfig, TaskDefOverrides} from 'lib/config/taskdef/taskdef-config'
import {PlatformServiceTaskdefCfgFactory} from 'lib/config/service/platform-service-taskdef-cfg-factory'

export interface InternalServiceStackProps extends BaseStackProps {
    serviceName: PlatformServiceName
    upstreamSgs?: ec2.ISecurityGroup[] //sg's to ecsTaskSg.addIngress(),
    taskDefOverrides ?: TaskDefOverrides
}

export class InternalServiceStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: InternalServiceStackProps) {
        super(scope, id, props)

        const { envConfig, serviceName, upstreamSgs,} = props

        //0. Wire any taskdef dependencies for internal service resources
        const taskdefCfgFactory = new PlatformServiceTaskdefCfgFactory(this, props)
        const taskdefCfg = taskdefCfgFactory.buildTaskdefCfg()

        // 1. Initialize dependencies
        const imageTag = this.node.tryGetContext('imageTag')

        const vpc = NetworkImports.vpcPrivateIsolated(this, envConfig)
        const privateIsolatedSubnets = NetworkImports.privateIsolatedSubnets(this, envConfig)

        //add membership service to SG and allow unique task SG ingress from membership service.
        const internalServicesSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'InternalServicesSgImported',
            ServiceRuntimeImports.internalServicesTaskSgId(envConfig),
            { mutable: false }
        )

        //2. Create ECS service SG and deps

        const appContainerPort = taskdefCfg.app.containerPort

        const ecsTaskSg = new PlatformEcsTaskSecurityGroup(this, 'PlatformEcsTaskSecurityGroup', {
            ...props,
            vpc,
            serviceName,
            upstreamSgs: [internalServicesSg, ...(upstreamSgs ?? [])],
            appContainerPort
        }).securityGroup

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
            serviceName,
            taskDefCfg: taskdefCfg,
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

        // 4. create ecs service
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
            privateIsolatedSubnets,
            serviceConnectServerMode: {
                appPortName: taskdefCfg.app.containerPortName
            },
            serviceName,
            cluster,
            httpNamespaceName: ServiceRuntimeImports.httpNamespaceName(envConfig)
        }).fargateService
    }
}