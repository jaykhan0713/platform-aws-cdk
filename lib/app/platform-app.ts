import * as cdk from 'aws-cdk-lib'

import { resolveStackName } from 'lib/config/naming'
import { VpcEndpointsStack } from 'lib/stacks/network/vpc-endpoints-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import type { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import { NetworkStack } from 'lib/stacks/network/network-stack'

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

        //vpc
        const networkStack = this.createNetworkStack(stackProps, envConfig)

        this.createVpcEndpointsStack(stackProps, envConfig, networkStack)
        //const ecsClusterStack = this.createEcsClusterStack(stackProps, envConfig, networkStack)
    }

    //network stacks

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

        new VpcEndpointsStack(
            this.app,
            'VpcEndpoints',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                vpc: networkStack.vpc
            }
        )
    }

}

