import * as cdk from 'aws-cdk-lib'
import type {EnvName} from 'lib/config/domain'
import {getEnvConfig, toCdkStackProps} from 'lib/config/env/env-config'
import {
    getPlatformServiceStackId,
    PlatformServiceName,
    platformServiceOverridesMap,
    PlatformServiceResource
} from 'lib/config/service/platform-service-registry'
import {RdsStack} from 'lib/stacks/data/rds-stack'
import {resolveStackName} from 'lib/config/naming'

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

        //RDS creation
        Object.values(PlatformServiceName).forEach(serviceName => {
            const overrides = platformServiceOverridesMap.get(serviceName)
            overrides?.resources?.forEach((stackDomain, resource) => {
                if (resource === PlatformServiceResource.rds) {
                    new RdsStack(app, getPlatformServiceStackId(serviceName) + 'Rds', {
                        stackName: resolveStackName(envConfig, stackDomain),
                        ...stackProps,
                        envConfig,
                        stackDomain,
                        serviceName
                    })
                }
            })
        })
    }
}