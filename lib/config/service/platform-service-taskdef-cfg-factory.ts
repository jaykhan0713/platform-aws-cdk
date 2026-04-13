import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

import {InternalServiceStackProps} from 'lib/stacks/services/internal-service-stack'
import {InternalAlbServiceStackProps} from 'lib/stacks/services/internal-alb-service-stack'
import {defaultTaskDefConfig, TaskDefinitionConfig} from 'lib/config/taskdef/taskdef-config'
import {resolveSecretName, resolveSsmParamPath} from 'lib/config/naming'
import {ParamNamespace, StackDomain} from 'lib/config/domain'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import {ObservabilityImports} from 'lib/config/dependency/observability/observability-imports'
import {PlatformServiceResource, platformServiceResources} from 'lib/config/service/platform-service-resource-registry'

//optional, when InternalAlb service stacks have resources- can add to that stack
export class PlatformServiceTaskdefCfgFactory {

    private readonly resourceMappings: Partial<
        Record<PlatformServiceResource, (taskDefCfg: TaskDefinitionConfig) => void >
    >

    constructor(
        private readonly scope: Construct,
        private readonly props: InternalServiceStackProps | InternalAlbServiceStackProps
    ) {
        this.resourceMappings = {
            [PlatformServiceResource.rds]: this.mapRds
        }
    }

    public buildTaskdefCfg = () => {
        const { envConfig, serviceName, taskDefOverrides } = this.props

        const taskdefCfg = defaultTaskDefConfig({
            serviceName,
            envConfig: envConfig,
            apsRemoteWriteEndpoint: ObservabilityImports.apsRemoteWriteEndpoint(envConfig),
            taskDefOverrides
        })

        this.mapDefaultSecrets(taskdefCfg)

        platformServiceResources.get(serviceName)?.forEach((_, resource) => {
            this.resourceMappings[resource]?.(taskdefCfg)
        })

        return taskdefCfg
    }

    private mapDefaultSecrets = (
        taskdefCfg: TaskDefinitionConfig
    ) => {

        const { envConfig } = this.props

        const appSecrets = taskdefCfg.app.secrets ?? {}

        const defaultSecrets = {
            ISSUER_URI: ecs.Secret.fromSsmParameter(
                ssm.StringParameter.fromStringParameterName(
                    this.scope, `IssuerUriParam`,
                    resolveSsmParamPath(envConfig, ParamNamespace.gateway, StackDomain.cognito, 'issuer-uri')
                )
            )
        }

        taskdefCfg.app.secrets = { ...appSecrets, ...defaultSecrets }

    }

    private mapRds = (
        taskdefCfg: TaskDefinitionConfig
    ) => {

        const {envConfig, serviceName} = this.props

        const appSecrets = taskdefCfg.app.secrets ?? {}

        const secret = secretsmanager.Secret.fromSecretNameV2(
            this.scope,
            `${serviceName}-RdsSecret`,
            resolveSecretName(envConfig, ParamNamespace.services, serviceName, PlatformServiceResource.rds)
        )

        const rdsSecrets = {
            DB_HOST: ecs.Secret.fromSecretsManager(secret, 'host'),
            DB_PORT: ecs.Secret.fromSecretsManager(secret, 'port'),
            DB_NAME: ecs.Secret.fromSecretsManager(secret, 'dbname'),
            DB_USERNAME: ecs.Secret.fromSecretsManager(secret, 'username'),
            DB_PASSWORD: ecs.Secret.fromSecretsManager(secret, 'password'),
        }

        taskdefCfg.app.secrets = { ...appSecrets, ...rdsSecrets }
    }
}