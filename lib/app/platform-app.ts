import * as cdk from 'aws-cdk-lib'

import { resolveStackName } from 'lib/config/naming'
import { CicdInfraStack } from 'lib/stacks/tools/cicd/cicd-infra-stack'
import { VpcEndpointsStack } from 'lib/stacks/network/vpc-endpoints-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import type { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import { NetworkStack } from 'lib/stacks/network/network-stack'
import {PlatformServiceEcrReposStack} from 'lib/stacks/tools/cicd/platform-service-ecr-repos-stack'
import {PlatformServicePipelineStack} from 'lib/stacks/tools/cicd/platform-service-pipeline-stack'
import {getStackId, PlatformServiceName} from 'lib/config/service/platform-service-name'

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

        //tools env stack (stack resources outside of runtime)
        const toolsConfig = getEnvConfig('tools')
        const toolsStackProps = toCdkStackProps(toolsConfig)

        const cicdInfraStack = this.createCicdInfraStack(toolsStackProps, toolsConfig)
        const platformServiceEcrReposStack = this.createPlatformServiceEcrReposStack(toolsStackProps, toolsConfig)
        this.createEdgeServicePipeline(
            toolsStackProps,
            toolsConfig,
            cicdInfraStack,
            platformServiceEcrReposStack
        )

        //platform ecs services

        //TODO: Update adot repo to actual stack
        // const adotRepo = ecr.Repository.fromRepositoryName(
        //     observabilityStack,
        //     'AdotRepo',
        //     `${envConfig.projectName}/adot-collector`
        // )
        //
        // const platformServiceRuntime: PlatformServiceRuntime = {
        //     vpc: networkStack.vpc,
        //     serviceConnectNamespace: networkStack.serviceConnectNamespace,
        //     platformVpcLink: networkStack.platformVpcLink,
        //     cluster: ecsClusterStack.ecsCluster,
        //     apsRemoteWriteEndpoint: observabilityStack.apsRemoteWriteEndpoint,
        //     apsWorkspaceArn: observabilityStack.apsWorkspaceArn,
        //     adotImage: ecs.ContainerImage.fromEcrRepository(adotRepo, 'stable')
        // }
        //
        // /**
        //  * TODO: currently using deploy=<PlatformService> to stop synth when deploying
        //  *  other apps as correct context keys like imageTag arent always passed in.
        //  *
        //  *  TODO: to simulate real org workflows, will decouple stacks to it's own
        //  *   bin/'s according to their Ownership boundaries i.e network, ecs, cicd/tools in their own app.
        //  */
        // const deployTarget = String(app.node.tryGetContext('deploy') ?? '')
        //
        // if (deployTarget === PlatformServiceName.edgeService) {
        //     this.createEdgeServiceStack(
        //         stackProps,
        //         envConfig,
        //         platformServiceRuntime,
        //         PlatformServiceName.edgeService,
        //         platformServiceEcrReposStack
        //     )
        // }
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

    //shared cicd for 'tools' env
    private createCicdInfraStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.cicdInfra

        return new CicdInfraStack(
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

    private createPlatformServiceEcrReposStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.serviceEcrRepos

        return new PlatformServiceEcrReposStack(
            this.app,
            'PlatformServiceEcrRepos',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }

    private createEdgeServicePipeline(
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        cicdInfraStack: CicdInfraStack,
        platformServiceEcrReposStack: PlatformServiceEcrReposStack
    ) {
        const stackDomain = StackDomain.edgeServicePipeline
        const serviceName = PlatformServiceName.edgeService


        new PlatformServicePipelineStack(
            this.app,
            'EdgeServicePipeline',
            {
                stackName: resolveStackName(toolsEnvConfig, stackDomain),
                ...toolsStackProps,
                envConfig: toolsEnvConfig,
                stackDomain,

                serviceName, //TODO when adding more envs, handle gracefully for steps
                serviceStackName: getStackId(serviceName),

                artifactsBucket: cicdInfraStack.artifactsBucket,
                githubConnectionArn: cicdInfraStack.githubConnectionArn,

                ecrRepo: platformServiceEcrReposStack.repos[serviceName]
            }
        )
    }
}

