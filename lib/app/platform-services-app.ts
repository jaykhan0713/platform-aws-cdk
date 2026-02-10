import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import type {EnvName} from 'lib/config/domain/env-name'
import {type EnvConfig, getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {ServiceRuntimeStack} from 'lib/stacks/services/runtime/service-runtime-stack'
import {resolveStackName} from 'lib/config/naming/stacks'
import type {PlatformServiceRuntime} from 'lib/stacks/services/props/platform-service-props'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import {getStackId, PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {InternalAlbServiceStack} from 'lib/stacks/services/internal-alb-service-stack'
import {InternalServiceStack} from 'lib/stacks/services/internal-service-stack'
import {PlatformServiceStackFactory} from 'lib/config/service/platform-service-stack-factory'

export class PlatformServicesApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        const serviceRuntimeStack =
            this.createServiceRuntimeStack(stackProps, envConfig)

        const platformServiceRuntime: PlatformServiceRuntime = {
            cluster: serviceRuntimeStack.ecsCluster,
            internalServicesSgId: serviceRuntimeStack.internalServicesSg.securityGroupId,
            serviceConnectNamespace: serviceRuntimeStack.httpNamespace,

            //TODO: Update adot repo to actual stack, use arn
            adotImage: ecs.ContainerImage.fromEcrRepository(
                ecr.Repository.fromRepositoryName(
                    serviceRuntimeStack,
                    'AdotRepo',
                    `${envConfig.projectName}/adot-collector`
                ),
                'stable'
            )
        }

        const serviceStackFactory = new PlatformServiceStackFactory(
            app,
            stackProps,
            envConfig,
            platformServiceRuntime
        )

        const deployServiceRaw = app.node.tryGetContext('deploy')


        if (deployServiceRaw !== undefined) {
            if (
                !Object.values(PlatformServiceName).includes(deployServiceRaw as PlatformServiceName)
            ) {
                throw new Error(`Invalid -c deploy=${deployServiceRaw}`)
            }

            const deployService: PlatformServiceName = deployServiceRaw

            if (deployService === PlatformServiceName.edgeService) {
                serviceStackFactory.createInternalAlbServiceStack(deployService, true)
            }
        }
    }

    //ecs cluster + shared runtime glue
    private createServiceRuntimeStack(
        stackProps: cdk.StackProps,
        envConfig: EnvConfig
    ) {
        const stackDomain = StackDomain.serviceRuntime

        return new ServiceRuntimeStack(
            this.app,
            'ServiceRuntime',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }
}