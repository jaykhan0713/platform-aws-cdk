import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

import type {EnvName} from 'lib/config/domain/env-name'
import {type EnvConfig, getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {NetworkStack} from 'lib/stacks/network/network-stack'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {EcsClusterStack} from 'lib/stacks/ecs/cluster/ecs-cluster-stack'
import {resolveStackName} from 'lib/config/naming/stacks'
import type {PlatformServiceRuntime} from 'lib/stacks/props/platform-service-props'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import {ObservabilityStack} from 'lib/stacks/core/observability-stack'

export class PlatformEcsApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        const observabilityStack = this.createObservabilityStack(stackProps, envConfig)

        //TODO: Update adot repo to actual stack
        const adotRepo = ecr.Repository.fromRepositoryName(
            observabilityStack,
            'AdotRepo',
            `${envConfig.projectName}/adot-collector`
        )

        //this.createEcsClusterStack(stackProps, envConfig, )

        // const platformServiceRuntime: PlatformServiceRuntime = {
        //     vpc: networkStack.vpc,
        //     serviceConnectNamespace: networkStack.serviceConnectNamespace,
        //     platformVpcLink: networkStack.platformVpcLink,
        //     cluster: ecsClusterStack.ecsCluster,
        //     apsRemoteWriteEndpoint: observabilityStack.apsRemoteWriteEndpoint,
        //     apsWorkspaceArn: observabilityStack.apsWorkspaceArn,
        //     adotImage: ecs.ContainerImage.fromEcrRepository(adotRepo, 'stable')
        // }
    }

    //ecs cluster
    private createEcsClusterStack(
        stackProps: cdk.StackProps,
        envConfig: EnvConfig,
        vpc: ec2.IVpc
    ) {
        const stackDomain = StackDomain.ecsCluster

        return new EcsClusterStack(
            this.app,
            'EcsCluster',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                vpc
            }
        )
    }

    //global observability
    private createObservabilityStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.observability

        return new ObservabilityStack(
            this.app,
            'Observability',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }
}