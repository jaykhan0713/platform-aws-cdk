import * as cdk from 'aws-cdk-lib'

import {EnvName, getEnvConfig, toCdkStackProps} from 'lib/config/env'
import { CoreObservabilityStack } from 'lib/stacks/core/core-observability-stack'
import { stackName } from 'lib/config/naming'

const app = new cdk.App()

// i.e cdk diff -c env=prod (for explicit but defaults to prod)
const rawEnv = app.node.tryGetContext('env') ?? 'prod'
if (rawEnv !== 'prod') {
    throw new Error(`Unsupported env: ${rawEnv}`)
}

const envName: EnvName = rawEnv
const envConfig = getEnvConfig(envName)
const stackProps = toCdkStackProps(envConfig)


//observability stack
const observabilityStackDomain = 'observability'

new CoreObservabilityStack(
    app,
    'CoreObservability',
    {
        stackName: stackName(envConfig, observabilityStackDomain),
        ...stackProps,
        envConfig,
        stackDomain: observabilityStackDomain
    }
)
