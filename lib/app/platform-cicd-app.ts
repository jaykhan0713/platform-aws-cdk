import * as cdk from 'aws-cdk-lib'

import { resolveStackName } from 'lib/config/naming'
import { CicdInfraStack } from 'lib/stacks/tools/cicd/cicd-infra-stack'
import { type EnvConfig, getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import { EnvName } from 'lib/config/domain/env-name'
import { StackDomain } from 'lib/config/domain/stack-domain'
import {PlatformServiceEcrReposStack} from 'lib/stacks/tools/cicd/service/platform-service-ecr-repos-stack'
import {PlatformServicePipelineStack} from 'lib/stacks/tools/cicd/service/platform-service-pipeline-stack'
import {
    getDtoPipelineStackDomainFromValue,
    getServicePipelineStackDomainFromValue,
    getPlatformServiceStackId,
    PlatformServiceName
} from 'lib/config/service/platform-service-registry'
import {PlatformFoundationEcrReposStack} from 'lib/stacks/tools/cicd/foundation/platform-foundation-ecr-repos-stack'
import {K6RunnerPipelineStack} from 'lib/stacks/tools/cicd/foundation/k6-runner-pipeline-stack'
import {
    getFoundationPipelineStackDomainFromValue,
    getPlatformFoundationStackId,
    PlatformFoundationName,
    platformFoundationOverridesSet
} from 'lib/config/foundation/platform-foundation-registry'
import {PlatformServiceDtoPipelineStack} from 'lib/stacks/tools/cicd/service/platform-service-dto-pipeline-stack'
import {PlatformFoundationPipelineStack} from 'lib/stacks/tools/cicd/foundation/platform-foundation-pipeline-stack'

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

        for (const foundationName of Object.values(PlatformFoundationName)) {
            if (!platformFoundationOverridesSet.has(foundationName)) {
                this.createPlatformFoundationPipelineStack(
                    toolsStackProps,
                    toolsConfig,
                    foundationName,
                    cicdInfraStack,
                    platformFoundationEcrReposStack
                )
            }
        }

        this.createK6RunnerPipelineStack(
            toolsStackProps,
            toolsConfig,
            cicdInfraStack,
            platformFoundationEcrReposStack
        )

        //dto pipelines first for publishing contracts
        for (const serviceName of Object.values(PlatformServiceName)) {
            this.createPlatformServiceDtoPipelineStack(
                serviceName,
                toolsStackProps,
                toolsConfig,
                cicdInfraStack,
                platformServiceEcrReposStack
            )
        }

        //service pipelines
        for (const serviceName of Object.values(PlatformServiceName)) {
            this.createPlatformServicePipelineStack(
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

    private createPlatformServicePipelineStack(
        serviceName: PlatformServiceName,
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        cicdInfraStack: CicdInfraStack,
        platformServiceEcrReposStack: PlatformServiceEcrReposStack
    ) {
        const stackDomain = getServicePipelineStackDomainFromValue(serviceName)

        new PlatformServicePipelineStack(
            this.app,
            `${getPlatformServiceStackId(serviceName)}Pipeline`, //i.e EdgeServicePipeline
            {
                stackName: resolveStackName(toolsEnvConfig, stackDomain),
                ...toolsStackProps,
                envConfig: toolsEnvConfig,
                stackDomain,

                serviceName,

                artifactsBucket: cicdInfraStack.artifactsBucket,
                githubConnectionArn: cicdInfraStack.githubConnectionArn,
                platformCodeArtifact: cicdInfraStack.platformCodeArtifact,

                ecrRepo: platformServiceEcrReposStack.repos[serviceName]
            }
        )
    }

    private createPlatformServiceDtoPipelineStack(
        serviceName: PlatformServiceName,
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        cicdInfraStack: CicdInfraStack,
        platformServiceEcrReposStack: PlatformServiceEcrReposStack
    ) {
        const stackDomain = getDtoPipelineStackDomainFromValue(serviceName)

        new PlatformServiceDtoPipelineStack(
            this.app,
            `${getPlatformServiceStackId(serviceName)}DtoPipeline`, //i.e EdgeServiceDtoPipeline
            {
                stackName: resolveStackName(toolsEnvConfig, stackDomain),
                ...toolsStackProps,
                envConfig: toolsEnvConfig,
                stackDomain,

                serviceName,

                artifactsBucket: cicdInfraStack.artifactsBucket,
                githubConnectionArn: cicdInfraStack.githubConnectionArn,
                platformCodeArtifact: cicdInfraStack.platformCodeArtifact,

                ecrRepo: platformServiceEcrReposStack.repos[serviceName]
            }
        )
    }

    private createPlatformFoundationPipelineStack(
        toolsStackProps: cdk.StackProps,
        toolsEnvConfig: EnvConfig,
        foundationName: PlatformFoundationName,
        cicdInfraStack: CicdInfraStack,
        platformFoundationEcrReposStack: PlatformFoundationEcrReposStack
    ) {
        const stackDomain = getFoundationPipelineStackDomainFromValue(foundationName)
        const {artifactsBucket, githubConnectionArn} = cicdInfraStack

        new PlatformFoundationPipelineStack(
            this.app,
            `${getPlatformFoundationStackId(foundationName)}FoundationPipeline`,
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

    private createK6RunnerPipelineStack(
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
            `${getPlatformFoundationStackId(foundationName)}FoundationPipeline`, //K6RunnerFoundationPipeline
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

