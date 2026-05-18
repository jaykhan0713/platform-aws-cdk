import { SideCarConfig } from 'lib/config/taskdef/taskdef-common'
import { EnvConfig } from 'lib/config/env/env-config'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'

export const defaultContainerConfig = (args: {
    serviceName: PlatformServiceName,
    envConfig: EnvConfig,
    appPort: number //for scraping app's prometheus endpoint
    apsRemoteWriteEndpoint: string
    //TODO: add sidecar container overrides
}): SideCarConfig => {
    const { projectName, envName } = args.envConfig

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
            APS_REMOTE_WRITE_ENDPOINT: args.apsRemoteWriteEndpoint
        },
        logging: {
            logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}-adot`,
            streamPrefix: 'ecs'
        }
    }
}