import * as cdk from 'aws-cdk-lib'

import { resolveStackName } from 'lib/config/naming'
import { CicdInfraStack } from 'lib/stacks/tools/cicd/cicd-infra-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import {PlatformServiceEcrReposStack} from 'lib/stacks/tools/cicd/service/platform-service-ecr-repos-stack'
import {PlatformServicePipelineStack} from 'lib/stacks/tools/cicd/service/platform-service-pipeline-stack'
import {
    getPipelineStackDomainFromValue,
    getPlatformServiceStackId,
    PlatformServiceName
} from 'lib/config/service/platform-service-registry'
import {PlatformFoundationEcrReposStack} from 'lib/stacks/tools/cicd/foundation/platform-foundation-ecr-repos-stack'
import {K6RunnerPipelineStack} from 'lib/stacks/tools/cicd/foundation/k6-runner-pipeline-stack'
import {getPlatformFoundationStackId, PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'

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
        const platformFoundationEcrReposStack = this.createPlatformFoundationEcrReposStack(toolsStackProps, toolsConfig)
        const platformServiceEcrReposStack = this.createPlatformServiceEcrReposStack(toolsStackProps, toolsConfig)

        this.createK6RunnerPipeline(
            toolsStackProps,
            toolsConfig,
            cicdInfraStack,
            platformFoundationEcrReposStack
        )

        for (const serviceName of Object.values(PlatformServiceName)) {
            this.createPlatformServicePipeline(
                serviceName,
                toolsStackProps,
                toolsConfig,
                cicdInfraStack,
                platformServiceEcrReposStack
            )
        }
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

    private createPlatformFoundationEcrReposStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.foundationEcrRepos

        return new PlatformFoundationEcrReposStack(
            this.app,
            'PlatformFoundationEcrRepos',
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

    private createPlatformServicePipeline(
        serviceName: PlatformServiceName,
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        cicdInfraStack: CicdInfraStack,
        platformServiceEcrReposStack: PlatformServiceEcrReposStack
    ) {
        const stackDomain = getPipelineStackDomainFromValue(serviceName)

        new PlatformServicePipelineStack(
            this.app,
            `${getPlatformServiceStackId(serviceName)}Pipeline`, //i.e EdgeServicePipeline
            {
                stackName: resolveStackName(toolsEnvConfig, stackDomain),
                ...toolsStackProps,
                envConfig: toolsEnvConfig,
                stackDomain,

                serviceName, //TODO when adding more envs, handle gracefully for steps

                artifactsBucket: cicdInfraStack.artifactsBucket,
                githubConnectionArn: cicdInfraStack.githubConnectionArn,
                platformCodeArtifact: cicdInfraStack.platformCodeArtifact,

                ecrRepo: platformServiceEcrReposStack.repos[serviceName]
            }
        )
    }

    private createK6RunnerPipeline(
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        cicdInfraStack: CicdInfraStack,
        platformFoundationEcrReposStack: PlatformFoundationEcrReposStack
    ) {
        const stackDomain = StackDomain.k6RunnerPipeline
        const foundationName = PlatformFoundationName.k6Runner
        const {artifactsBucket, githubConnectionArn} = cicdInfraStack

        new K6RunnerPipelineStack(
            this.app,
            `${getPlatformFoundationStackId(foundationName)}Pipeline`, //K6RunnerPipeline
            {
                stackName: resolveStackName(toolsEnvConfig, stackDomain),
                ...toolsStackProps,
                envConfig: toolsEnvConfig,
                stackDomain,
                foundationName,

                artifactsBucket,
                githubConnectionArn,
                ecrRepo: platformFoundationEcrReposStack.ecrRepos[foundationName]
            }
        )
    }
}

