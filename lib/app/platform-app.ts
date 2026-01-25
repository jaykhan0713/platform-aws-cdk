import * as cdk from 'aws-cdk-lib'

import { CoreObservabilityStack } from 'lib/stacks/core/core-observability-stack'
import { resolveStackName } from 'lib/config/naming'
import {InternalServicesStack} from 'lib/stacks/infra/runtime/internal-services-stack'
import {CicdInfraStack} from 'lib/stacks/infra/tools/cicd-infra-stack'
import {VpcEndpointsStack} from 'lib/stacks/network/vpc-endpoints-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import type { EnvName } from 'lib/config/domain/env-name'
import {StackDomain} from 'lib/config/domain/stack-domain'

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

        this.vpcEndpointsStack(stackProps, envConfig)
        this.observabilityStack(stackProps, envConfig)
        this.internalServicesStack(stackProps, envConfig)

        //tools env stack (stack resources outside of runtime)
        const toolsConfig = getEnvConfig('tools')
        this.toolsStacks(stackProps, toolsConfig)
    }

    //network
    private vpcEndpointsStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.vpcEndpoints

        new VpcEndpointsStack(
            this.app,
            'NetworkVpcEndpoints',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    //global observability
    private observabilityStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.observability

        new CoreObservabilityStack(
            this.app,
            'CoreObservability',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    // shared runtime
    private internalServicesStack(stackProps: cdk.StackProps, envConfig: EnvConfig){
        const stackDomain = StackDomain.internalServices

        new InternalServicesStack(
            this.app,
            'InternalServices',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    //shared cicd for 'tools' env
    private toolsStacks(stackProps: cdk.StackProps, envConfig: EnvConfig) {
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

