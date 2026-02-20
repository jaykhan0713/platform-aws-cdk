import * as cdk from 'aws-cdk-lib'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import type {EnvName} from 'lib/config/domain/env-name'
import {type EnvConfig, getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {ServiceRuntimeStack} from 'lib/stacks/services/runtime/service-runtime-stack'
import {resolveStackName} from 'lib/config/naming/stacks'
import type {PlatformServiceRuntime} from 'lib/stacks/services/props/platform-service-props'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
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

        Object.values(PlatformServiceName).forEach(serviceName => {
            serviceStackFactory.createServiceStack(serviceName)
        })
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