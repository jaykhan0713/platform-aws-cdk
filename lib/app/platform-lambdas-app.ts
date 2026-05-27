import * as cdk from 'aws-cdk-lib'
import { EnvName, StackDomain } from 'lib/config/domain'
import { getEnvConfig, toCdkStackProps } from 'lib/config/env/env-config'
import { FargateUpdaterStack } from 'lib/stacks/lambdas/fargate-updater/fargate-updater-stack'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { resolveStackName } from 'lib/config/naming'

export class PlatformLambdasApp {

    constructor(private readonly app: cdk.App) {
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        new FargateUpdaterStack(this.app, 'GotenbergServiceUpdaterLambda', {
            stackName: resolveStackName(envConfig, StackDomain.gotenbergServiceUpdater),
            ...stackProps,
            envConfig,
            stackDomain: StackDomain.gotenbergServiceUpdater,
            serviceName: PlatformServiceName.gotenbergService
        })
    }
}