import * as cdk from 'aws-cdk-lib'

import { ObservabilityStack } from 'lib/stacks/core/observability-stack'
import { resolveStackName } from 'lib/config/naming'
import { EcsServicesCommonStack } from 'lib/stacks/ecs/common/ecs-services-common-stack'
import { CicdInfraStack } from 'lib/stacks/tools/cicd/cicd-infra-stack'
import { VpcEndpointsStack } from 'lib/stacks/network/vpc-endpoints-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import type { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import { EcsClusterStack } from 'lib/stacks/ecs/cluster/ecs-cluster-stack'
import { NetworkStack } from 'lib/stacks/network/network-stack'
import type {VpcDependentStackProps} from 'lib/stacks/types/vpc-dependent-stack-props'
import {BaseStackProps} from 'lib/stacks/base-stack'

export class PlatformApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        //stack instantiations

        //network, vpc related and dependant
        const networkStack = this.createNetworkStack(stackProps, envConfig)

        this.createVpcEndpointsStack(stackProps, envConfig, networkStack)
        this.createEcsClusterStack(stackProps, envConfig, networkStack)

        //shared core/common stacks
        this.createObservabilityStack(stackProps, envConfig)
        this.createServicesCommonStack(stackProps, envConfig)

        //tools env stack (stack resources outside of runtime)
        const toolsConfig = getEnvConfig('tools')
        this.createCicdInfraStack(stackProps, toolsConfig)
    }

    //network stacks
    private toVpcDepStackProps(
        baseStackProps: BaseStackProps,
        networkStack: NetworkStack
    ) : VpcDependentStackProps {
        return  {
            ...baseStackProps,
            vpc: networkStack.vpc,
            serviceConnectNamespace: networkStack.serviceConnectNamespace
        }
    }

    private createNetworkStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.network

        return new NetworkStack(
            this.app,
            'Network',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    private createVpcEndpointsStack(
        stackProps: cdk.StackProps,
        envConfig: EnvConfig,
        networkStack: NetworkStack
    ) {
        const stackDomain = StackDomain.vpcEndpoints

        const baseStackProps = {
            stackName: resolveStackName(envConfig, stackDomain),
            ...stackProps,
            envConfig,
            stackDomain
        }

        new VpcEndpointsStack(
            this.app,
            'VpcEndpoints',
            this.toVpcDepStackProps(baseStackProps, networkStack)
        )
    }

    //ecs cluster
    private createEcsClusterStack(
        stackProps: cdk.StackProps,
        envConfig: EnvConfig,
        networkStack: NetworkStack
    ) {
        const stackDomain = StackDomain.ecsCluster

        const baseStackProps = {
            stackName: resolveStackName(envConfig, stackDomain),
            ...stackProps,
            envConfig,
            stackDomain
        }

        new EcsClusterStack(
            this.app,
            'EcsCluster',
            this.toVpcDepStackProps(baseStackProps, networkStack)
        )
    }

    //global observability
    private createObservabilityStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.observability

        new ObservabilityStack(
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

    // shared runtime
    private createServicesCommonStack(stackProps: cdk.StackProps, envConfig: EnvConfig){
        const stackDomain = StackDomain.ecsServicesCommon

        new EcsServicesCommonStack(
            this.app,
            'EcsServicesCommon',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    //shared cicd for 'tools' env
    private createCicdInfraStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.cicdInfra

        new CicdInfraStack(
            this.app,
            'CicdInfra',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }
}

