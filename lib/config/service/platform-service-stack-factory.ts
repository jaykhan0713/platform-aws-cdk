import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

import {type EnvConfig} from 'lib/config/env/env-config'
import {resolveStackName} from 'lib/config/naming/stacks'
import {
    getPlatformServiceStackId, PlatformServiceExposure,
    PlatformServiceName,
    platformServiceOverridesMap, PlatformServiceResource
} from 'lib/config/service/platform-service-registry'
import {InternalAlbServiceStack} from 'lib/stacks/services/internal-alb-service-stack'
import {InternalServiceStack} from 'lib/stacks/services/internal-service-stack'
import {defaultTaskDefConfig, TaskDefinitionConfig} from 'lib/config/taskdef/taskdef-config'
import {ObservabilityImports} from 'lib/config/dependency/observability/observability-imports'
import {resolveSecretName} from 'lib/config/naming'
import {ParamNamespace} from 'lib/config/domain'

export class PlatformServiceStackFactory {
    private readonly scope: cdk.App
    private readonly stackProps: cdk.StackProps
    private readonly envConfig: EnvConfig
    private readonly resourceMappings: Partial<
        Record<PlatformServiceResource, (serviceName: PlatformServiceName, taskDefCfg: TaskDefinitionConfig) => void >
    >

    constructor(
        scope: cdk.App,
        stackProps: cdk.StackProps,
        envConfig: EnvConfig
    ) {
        this.scope = scope
        this.stackProps = stackProps
        this.envConfig = envConfig

        this.resourceMappings = {
            [PlatformServiceResource.rds]: this.mapRds
        }
    }

    public createServiceStack(serviceName: PlatformServiceName) {
        const overrides = platformServiceOverridesMap.get(serviceName)

        const taskDefCfg = defaultTaskDefConfig({
            serviceName,
            envConfig: this.envConfig,
            apsRemoteWriteEndpoint: ObservabilityImports.apsRemoteWriteEndpoint(this.envConfig)
        })

        overrides?.resources?.forEach(resource => {
            this.resourceMappings[resource]?.(serviceName, taskDefCfg)
        }, taskDefCfg)

        if (overrides?.exposure === PlatformServiceExposure.alb) {
            this.createInternalAlbServiceStack(serviceName, taskDefCfg, true)
        } else {
            this.createInternalServiceStack(serviceName, taskDefCfg)
        }
    }

    private createInternalAlbServiceStack(
        serviceName: PlatformServiceName,
        taskDefCfg: TaskDefinitionConfig,
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
                vpcLinkEnabled,
                taskDefCfg
            }
        )
    }

    private createInternalServiceStack(
        serviceName: PlatformServiceName,
        taskDefCfg: TaskDefinitionConfig
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
                serviceName,
                taskDefCfg
            }
        )
    }

    private mapRds = (
        serviceName: PlatformServiceName,
        taskDefCfg: TaskDefinitionConfig
    ) => {
        const appSecrets = taskDefCfg.app.secrets ?? {}

        const secret = secretsmanager.Secret.fromSecretNameV2(
            this.scope,
            `${serviceName}-RdsSecret`,
            resolveSecretName(this.envConfig, ParamNamespace.services, serviceName, PlatformServiceResource.rds)
        )

        const rdsSecrets = {
            DB_HOST: ecs.Secret.fromSecretsManager(secret, 'host'),
            DB_PORT: ecs.Secret.fromSecretsManager(secret, 'port'),
            DB_NAME: ecs.Secret.fromSecretsManager(secret, 'dbname'),
            DB_USERNAME: ecs.Secret.fromSecretsManager(secret, 'username'),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(secret, 'password'),
        }

        taskDefCfg.app.secrets = { ...appSecrets, ...rdsSecrets }
    }
}