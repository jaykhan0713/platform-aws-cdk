import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import {BaseStack} from 'lib/stacks/base-stack'
import {PlatformServiceProps} from 'lib/stacks/services/props/platform-service-props'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {defaultTaskDefConfig} from 'lib/config/taskdef/taskdef-config'
import {ObservabilityImports} from 'lib/config/dependency/core/observability-imports'
import {PlatformEcsTaskSecurityGroup} from 'lib/constructs/ecs/platform-ecs-task-security-group'
import {PlatformEcsTaskRole} from 'lib/constructs/ecs/platform-ecs-task-role'
import {PlatformEcsTaskExecutionRole} from 'lib/constructs/ecs/platform-ecs-task-execution-role'
import {PlatformEcsTaskDef} from 'lib/constructs/ecs/platform-ecs-task-def'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import {resolvePlatformServiceRepoName} from 'lib/config/naming/ecr-repo'
import {PlatformEcsRollingService} from 'lib/constructs/ecs/platform-ecs-rolling-service'

export interface InternalServiceStackProps extends PlatformServiceProps {
    upstreamSgs?: ec2.ISecurityGroup[] //sg's to ecsTaskSg.addIngress()
}
export class InternalServiceStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: InternalServiceStackProps) {
        super(scope, id, props)

        // 1. Initialize dependencies
        const imageTag = this.node.tryGetContext('imageTag')

        if (imageTag === undefined) {
            throw new Error(`-c imageTag is empty`)
        }
        const { envConfig, serviceName, upstreamSgs } = props

        const vpc = NetworkImports.vpc(this, envConfig)
        const privateIsolatedSubnets = NetworkImports.privateIsolatedSubnets(this, envConfig)

        const taskDefCfg = defaultTaskDefConfig({
            serviceName,
            envConfig,
            apsRemoteWriteEndpoint: ObservabilityImports.apsRemoteWriteEndpoint(envConfig)
        })

        //add membership service to SG and allow unique task SG ingress from membership service.
        const internalServicesSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'InternalServicesSgImported',
            props.runtime.internalServicesSgId,
            { mutable: false }
        )

        //2. Create ECS service SG and deps

        const appContainerPort = taskDefCfg.app.containerPort

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

        // 4. create ecs service
        const fargateService = new PlatformEcsRollingService(this, 'PlatformEcsRollingService', {
            ...props,
            fargateTaskDef,
            desiredCount: 1,
            securityGroups: [ecsTaskSg, internalServicesSg],
            privateIsolatedSubnets,
            serviceConnectServerMode: {
                appPortName: taskDefCfg.app.containerPortName
            }
        }).fargateService
    }
}