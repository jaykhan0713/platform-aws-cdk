import * as cdk from 'aws-cdk-lib'

import type {EnvName} from 'lib/config/domain/env-name'
import {type EnvConfig, getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {resolveStackName} from 'lib/config/naming/stacks'
import {K6RunnerStack} from 'lib/stacks/load-test/k6-runner-stack'
import {getPlatformFoundationStackId, PlatformFoundationName} from 'lib/config/foundation/platform-foundation-registry'

export class PlatformLoadTestApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        this.createK6RunnerStack(stackProps, envConfig)
    }

    private createK6RunnerStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.k6Runner
        const foundationName = PlatformFoundationName.k6Runner

        return new K6RunnerStack(
            this.app,
            getPlatformFoundationStackId(foundationName), //K6Runner
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                foundationName
            }
        )
    }
}