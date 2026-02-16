import * as cdk from 'aws-cdk-lib'
import {GatewayStack} from "lib/stacks/gateway/gateway-stack";
import {EnvName, StackDomain} from "lib/config/domain";
import {EnvConfig, getEnvConfig, toCdkStackProps} from "lib/config/env/env-config";
import {StackProps} from "aws-cdk-lib";


export class PlatformGatewayApp {

    constructor(private readonly app: cdk.App) {
        // i.e cdk diff -c env=prod (for explicit but defaults to prod)
        const rawEnv = app.node.tryGetContext('env') ?? 'prod'
        if (rawEnv !== 'prod') {
            throw new Error(`Unsupported env: ${rawEnv}`)
        }

        const envName: EnvName = rawEnv
        const envConfig = getEnvConfig(envName)
        const stackProps = toCdkStackProps(envConfig)

        this.createGatewayStack(stackProps, envConfig)
    }

    private createGatewayStack(stackProps: StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.gateway

        return new GatewayStack(
            this.app,
            'Gateway',
            {
               ...stackProps,
                envConfig,
                stackDomain
            }
        )
    }
}