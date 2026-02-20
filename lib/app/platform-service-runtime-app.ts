import * as cdk from 'aws-cdk-lib'
import {EnvName, StackDomain} from "lib/config/domain";
import {type EnvConfig, getEnvConfig, toCdkStackProps} from "lib/config/env/env-config";
import {ServiceRuntimeStack} from "lib/stacks/services/runtime/service-runtime-stack";
import {resolveStackName} from "lib/config/naming";

export class PlatformServiceRuntimeApp {
    constructor(private readonly app: cdk.App) {
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        this.createServiceRuntimeStack(stackProps, envConfig)
    }

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