import { SideCarConfig } from 'lib/config/fargate/common/taskdef-common'
import { EnvConfig } from 'lib/config/env/env-config'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { ObservabilityImports } from 'lib/config/dependency/observability/observability-imports'

export const defaultAdotCollectorContainerConfig = (args: {
    serviceName: PlatformServiceName,
    envConfig: EnvConfig,
    appPort: number //for scraping app's prometheus endpoint
    //TODO: add sidecar container overrides
}): SideCarConfig => {
    const envConfig = args.envConfig
    const { projectName, envName } = envConfig

    return {
        enabled: true,
        containerName: 'adot-collector',
        cpuUnits: 32,
        memoryMiB: 128,
        essential: false,
        ports: [ 4317, 4318 ], //grpc, http
        env: {
            SERVICE_NAME: args.serviceName,
            APP_PORT: String(args.appPort),
            APS_REMOTE_WRITE_ENDPOINT: ObservabilityImports.apsRemoteWriteEndpoint(envConfig)
        },
        logging: {
            logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}-adot`,
            streamPrefix: 'ecs'
        }
    }
}