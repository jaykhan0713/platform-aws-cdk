import * as cdk from 'aws-cdk-lib'

import type {EnvName} from 'lib/config/domain/env-name'
import {type EnvConfig, getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {resolveStackName} from 'lib/config/naming/stacks'
import {ObservabilityStack} from 'lib/stacks/observability/observability-stack'

export class PlatformObservabilityApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        this.createObservabilityStack(stackProps, envConfig)
    }

    //global observability
    private createObservabilityStack(stackProps: cdk.StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.observability

        return new ObservabilityStack(
            this.app,
            'Observability',
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }
}