import * as cdk from 'aws-cdk-lib'
import {ApiStack} from "lib/stacks/gateway/api-stack";
import {EnvName, StackDomain} from "lib/config/domain";
import {EnvConfig, getEnvConfig, toCdkStackProps} from "lib/config/env/env-config";
import {StackProps} from "aws-cdk-lib";
import {resolveStackName} from 'lib/config/naming'
import {PlatformCognito} from 'lib/constructs/api/platform-cognito'
import {CognitoStack} from 'lib/stacks/gateway/cognito-stack'


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

        const cognitoStack = this.createCognitoStack(stackProps, envConfig)
        this.createApiStack(stackProps, envConfig, cognitoStack.platformCognito)
    }

    private createCognitoStack(stackProps: StackProps, envConfig: EnvConfig) {
        const stackDomain = StackDomain.cognito

        return new CognitoStack(
            this.app,
            'Cognito',
            {
                ...stackProps,
                stackName: resolveStackName(envConfig, stackDomain),
                envConfig,
                stackDomain
            }
        )
    }

    private createApiStack(
        stackProps: StackProps,
        envConfig: EnvConfig,
        platformCognito: PlatformCognito
    ) {
        const stackDomain = StackDomain.api

        return new ApiStack(
            this.app,
            'Api',
            {
               ...stackProps,
                stackName: resolveStackName(envConfig, stackDomain),
                envConfig,
                stackDomain,
                platformCognito
            }
        )
    }
}