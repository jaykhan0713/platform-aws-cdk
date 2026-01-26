import * as cdk from 'aws-cdk-lib'

import { ObservabilityStack } from 'lib/stacks/core/observability-stack'
import { resolveStackName } from 'lib/config/naming'
import {EcsServicesCommonStack} from 'lib/stacks/ecs/common/ecs-services-common-stack'
import {CicdInfraStack} from 'lib/stacks/tools/cicd/cicd-infra-stack'
import {VpcEndpointsStack} from 'lib/stacks/vpc/vpc-endpoints-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import type { EnvName } from 'lib/config/domain/env-name'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {EcsClusterStack} from 'lib/stacks/ecs/cluster/ecs-cluster-stack'

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

        this.ecsClusterStack(stackProps, envConfig)
        this.vpcEndpointsStack(stackProps, envConfig)
        this.observabilityStack(stackProps, envConfig)
        this.servicesCommonStack(stackProps, envConfig)

        //tools env stack (stack resources outside of runtime)
        const toolsConfig = getEnvConfig('tools')
        this.toolsStacks(stackProps, toolsConfig)
    }

    //ecs cluster
    private ecsClusterStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.ecsCluster

        new EcsClusterStack(
            this.app,
            'EcsCluster',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    //vpc
    private vpcEndpointsStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.vpcEndpoints

        new VpcEndpointsStack(
            this.app,
            'VpcEndpoints',
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
    private servicesCommonStack(stackProps: cdk.StackProps, envConfig: EnvConfig){
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

