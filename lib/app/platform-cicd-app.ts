import * as cdk from 'aws-cdk-lib'

import { resolveStackName } from 'lib/config/naming'
import { CicdInfraStack } from 'lib/stacks/tools/cicd/cicd-infra-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import {PlatformServiceEcrReposStack} from 'lib/stacks/tools/cicd/platform-service-ecr-repos-stack'
import {PlatformServicePipelineStack} from 'lib/stacks/tools/cicd/platform-service-pipeline-stack'
import {getStackId, PlatformServiceName} from 'lib/config/service/platform-service-registry'

export class PlatformCicdApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'tools'
        if (rawEnv !== 'tools') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv

        //stack instantiations

        //tools env stack (stack resources outside of runtime)
        const toolsConfig = getEnvConfig(envName)
        const toolsStackProps = toCdkStackProps(toolsConfig)

        const cicdInfraStack = this.createCicdInfraStack(toolsStackProps, toolsConfig)
        const platformServiceEcrReposStack = this.createPlatformServiceEcrReposStack(toolsStackProps, toolsConfig)
        this.createEdgeServicePipeline(
            toolsStackProps,
            toolsConfig,
            cicdInfraStack,
            platformServiceEcrReposStack
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

