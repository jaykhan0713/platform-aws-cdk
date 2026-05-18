import type { EnvConfig } from 'lib/config/env/env-config'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { SideCarConfig, TaskDefinitionConfig, TaskDefOverrides } from 'lib/config/taskdef/taskdef-common'
import { SideCarName } from 'lib/config/taskdef/sidecar/sidecar-registry'
import { defaultContainerConfig } from 'lib/config/taskdef/sidecar/adot-collector/container-config'
import { ObservabilityImports } from 'lib/config/dependency/observability/observability-imports'

export const defaultSpringTaskDefConfig = (args: {
    serviceName: PlatformServiceName
    envConfig: EnvConfig
    taskDefOverrides?: TaskDefOverrides
}): TaskDefinitionConfig => {
    const { envConfig, taskDefOverrides, serviceName } = args
    const projectName = envConfig.projectName
    const envName = envConfig.envName
    const appPort = 8080

    return {
        family: `${projectName}-${args.serviceName}-${envName}`,
        cpu: taskDefOverrides?.cpu ?? 512,
        memoryMiB: taskDefOverrides?.memoryMiB ?? 1024,

        app: {
            containerName: 'app',
            containerPortName: 'http',
            containerPort: appPort,
            cpuUnits: taskDefOverrides?.app?.cpuUnits ?? 430,
            memoryMiB: taskDefOverrides?.app?.memoryMib ?? 800,
            essential: true,
            stopTimeoutSeconds: 30,
            env: {
                SPRING_PROFILES_ACTIVE: envName,
                JAVA_TOOL_OPTIONS: taskDefOverrides?.app?.env?.get('JAVA_TOOL_OPTIONS') ?? '-Xms128m -Xmx512m -XX:+UseContainerSupport',
                SERVICE_NAME: args.serviceName
            },
            logging: {
                logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}`,
                streamPrefix: 'ecs'
            }
        },

        //TODO: add healthcheck defaults here

        sidecars: new Map<SideCarName, SideCarConfig>([
            [
                SideCarName.adot,
                defaultContainerConfig({...args, appPort, apsRemoteWriteEndpoint: ObservabilityImports.apsRemoteWriteEndpoint(envConfig)})
            ]
        ])
    }
}
