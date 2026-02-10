import type { EnvConfig } from 'lib/config/env/env-config'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'

export type EnvMap = Readonly<Record<string, string>>
export type SecretMap = Readonly<Record<string, string>> // name -> ssm param path

export interface ContainerLoggingConfig {
    logGroupName: string
    streamPrefix: string
}

export interface AppContainerConfig {
    containerName: string
    containerPortName: string
    containerPort: number
    cpuUnits?: number
    memoryMiB?: number
    essential: boolean
    stopTimeoutSeconds: number
    env: EnvMap
    logging: ContainerLoggingConfig
}

export interface AdotContainerConfig {
    enabled: boolean
    containerName: string
    cpuUnits?: number
    memoryMiB?: number
    essential: boolean
    ports: {
        grpc: number
        http: number
    }
    env: EnvMap
    secrets: SecretMap
    logging: ContainerLoggingConfig
}

export interface TaskDefinitionConfig {
    family: string
    cpu: number
    memoryMiB: number
    app: AppContainerConfig
    adot: AdotContainerConfig
}

export const defaultTaskDefConfig = (args: {
    serviceName: PlatformServiceName
    envConfig: EnvConfig
    apsRemoteWriteEndpoint: string
}): TaskDefinitionConfig => {
    const { envConfig } = args
    const projectName = envConfig.projectName
    const envName = envConfig.envName
    const port = 8080

    return {
        family: `${projectName}-${args.serviceName}-${envName}`,
        cpu: 512,
        memoryMiB: 1024,
        app: {
            containerName: 'app',
            containerPortName: 'http',
            containerPort: port,
            cpuUnits: 350,
            memoryMiB: 600,
            essential: true,
            stopTimeoutSeconds: 30,
            env: {
                SPRING_PROFILES_ACTIVE: envName,
                JAVA_TOOL_OPTIONS: '-Xms128m -Xmx448m',
                SERVICE_NAME: args.serviceName
            },
            logging: {
                logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}`,
                streamPrefix: 'ecs'
            }
        },
        adot: {
            enabled: true,
            containerName: 'adot-collector',
            cpuUnits: 64,
            memoryMiB: 128,
            essential: false,
            ports: { grpc: 4317, http: 4318 },
            env: {
                SERVICE_NAME: args.serviceName,
                APP_PORT: String(port),
                APS_REMOTE_WRITE_ENDPOINT: args.apsRemoteWriteEndpoint
            },
            secrets: {
                OTEL_CONFIG_YAML: `/${projectName}/${envName}/core/observability/adot/otel-config.yaml`
            },
            logging: {
                logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}-adot`,
                streamPrefix: 'ecs'
            }
        }
    }
}
