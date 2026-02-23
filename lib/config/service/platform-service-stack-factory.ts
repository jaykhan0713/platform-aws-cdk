import * as cdk from 'aws-cdk-lib'

import {type EnvConfig} from 'lib/config/env/env-config'
import {resolveStackName} from 'lib/config/naming/stacks'
import {
    getPlatformServiceStackId, PlatformServiceExposure,
    PlatformServiceName,
    platformServiceOverridesMap
} from 'lib/config/service/platform-service-registry'
import {InternalAlbServiceStack} from 'lib/stacks/services/internal-alb-service-stack'
import {InternalServiceStack} from 'lib/stacks/services/internal-service-stack'

export class PlatformServiceStackFactory {
    private readonly scope: cdk.App
    private readonly stackProps: cdk.StackProps
    private readonly envConfig: EnvConfig

    constructor(
        scope: cdk.App,
        stackProps: cdk.StackProps,
        envConfig: EnvConfig
    ) {
        this.scope = scope
        this.stackProps = stackProps
        this.envConfig = envConfig
    }

    public createServiceStack(serviceName: PlatformServiceName) {
        const overrides = platformServiceOverridesMap.get(serviceName)

        if (overrides?.exposure === PlatformServiceExposure.alb) {
            this.createInternalAlbServiceStack(serviceName, true)
        } else {
            this.createInternalServiceStack(serviceName)
        }
    }

    public createInternalAlbServiceStack(
        serviceName: PlatformServiceName,
        vpcLinkEnabled?: boolean
    ) {
        const stackDomain = serviceName

        const {scope, stackProps, envConfig } = this

        return new InternalAlbServiceStack(
            scope,
            getPlatformServiceStackId(serviceName),
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                serviceName,
                vpcLinkEnabled
            }
        )
    }

    public createInternalServiceStack(
        serviceName: PlatformServiceName
    ) {
        const stackDomain = serviceName

        const {scope, stackProps, envConfig } = this

        return new InternalServiceStack(
            scope,
            getPlatformServiceStackId(serviceName),
            {
                stackName: resolveStackName(envConfig, stackDomain),
                ...stackProps,
                envConfig,
                stackDomain,
                serviceName
            }
        )
    }
}