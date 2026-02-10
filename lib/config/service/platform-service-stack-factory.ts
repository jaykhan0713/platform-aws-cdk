import * as cdk from 'aws-cdk-lib'

import {type EnvConfig} from 'lib/config/env/env-config'
import {resolveStackName} from 'lib/config/naming/stacks'
import type {PlatformServiceRuntime} from 'lib/stacks/services/props/platform-service-props'
import {getStackId, PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {InternalAlbServiceStack} from 'lib/stacks/services/internal-alb-service-stack'
import {InternalServiceStack} from 'lib/stacks/services/internal-service-stack'

export class PlatformServiceStackFactory {
    private readonly scope: cdk.App
    private readonly stackProps: cdk.StackProps
    private readonly envConfig: EnvConfig
    private readonly runtime: PlatformServiceRuntime

    private readonly registry: {
        s: string
    }

    constructor(
        scope: cdk.App,
        stackProps: cdk.StackProps,
        envConfig: EnvConfig,
        runtime: PlatformServiceRuntime
    ) {
        this.scope = scope
        this.stackProps = stackProps
        this.envConfig = envConfig
        this.runtime = runtime
    }

    public createInternalAlbServiceStack(
        serviceName: PlatformServiceName,
        vpcLinkEnabled?: boolean
    ) {
        const stackDomain = serviceName

        const {scope, stackProps, envConfig, runtime} = this

        return new InternalAlbServiceStack(
            scope,
            getStackId(serviceName),
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                serviceName,
                runtime,
                vpcLinkEnabled
            }
        )
    }

    public createInternalServiceStack(
        serviceName: PlatformServiceName
    ) {
        const stackDomain = serviceName

        const {scope, stackProps, envConfig, runtime} = this

        return new InternalServiceStack(
            scope,
            getStackId(serviceName),
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                serviceName,
                runtime,
            }
        )
    }
}