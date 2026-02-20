import * as cdk from 'aws-cdk-lib'

import type {EnvName} from 'lib/config/domain/env-name'
import { getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
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

        const serviceStackFactory = new PlatformServiceStackFactory(
            app,
            stackProps,
            envConfig
        )

        Object.values(PlatformServiceName).forEach(serviceName => {
            serviceStackFactory.createServiceStack(serviceName)
        })
    }
}