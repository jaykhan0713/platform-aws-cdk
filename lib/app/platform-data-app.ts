import * as cdk from 'aws-cdk-lib'
import type {EnvName} from 'lib/config/domain'
import {getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'

export class PlatformDataApp {
    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

    }
}