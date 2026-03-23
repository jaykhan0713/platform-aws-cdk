import {Construct} from 'constructs'
import {InternalServiceStackProps} from 'lib/stacks/services/internal-service-stack'
import {InternalAlbServiceStackProps} from 'lib/stacks/services/internal-alb-service-stack'
import {
    PlatformServiceName,
    platformServiceOverridesMap,
    PlatformServiceResource
} from 'lib/config/service/platform-service-registry'
import {TaskDefinitionConfig} from 'lib/config/taskdef/taskdef-config'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import {resolveSecretName} from 'lib/config/naming'
import {ParamNamespace} from 'lib/config/domain'
import * as ecs from 'aws-cdk-lib/aws-ecs'

//optional, when InternalAlb service stacks have resources- can add to that stack
export class PlatformServiceResourceFactory {

    private readonly resourceMappings: Partial<
        Record<PlatformServiceResource, (taskDefCfg: TaskDefinitionConfig) => void >
    >

    constructor(
        private readonly scope: Construct,
        private readonly props: InternalServiceStackProps | InternalAlbServiceStackProps,
        taskdefCfg: TaskDefinitionConfig
    ) {
        this.resourceMappings = {
            [PlatformServiceResource.rds]: this.mapRds
        }

        const { serviceName } = this.props
        platformServiceOverridesMap.get(serviceName)?.resources?.forEach((stackDomain, resource) => {
            this.resourceMappings[resource]?.(taskdefCfg)
        })
    }

    private mapRds = (
        taskDefCfg: TaskDefinitionConfig
    ) => {

        const {envConfig, serviceName} = this.props

        const appSecrets = taskDefCfg.app.secrets ?? {}

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

        taskDefCfg.app.secrets = { ...appSecrets, ...rdsSecrets }
    }
}