import * as cdk from 'aws-cdk-lib'

import {EnvName, getEnvConfig, toCdkStackProps} from 'lib/config/env';
import { PlatformObservabilityStack } from 'lib/stacks/platform/platform-observability-stack'

const app = new cdk.App()

// i.e cdk diff -c env=prod (for explicit but defaults to prod)
const rawEnv = app.node.tryGetContext('env') ?? 'prod'
if (rawEnv !== 'prod') {
    throw new Error(`Unsupported env: ${rawEnv}`)
}

const envName: EnvName = rawEnv
const envConfig = getEnvConfig(envName)
const stackProps = toCdkStackProps(envConfig)

new PlatformObservabilityStack(
    app,
    'PlatformObservability',
    {
        stackName: `jay-platform-observability-${envName}`,
        ...stackProps,
        envConfig
    }
)
