import * as ecs from 'aws-cdk-lib/aws-ecs'
import type { EnvConfig } from 'lib/config/env/env-config'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { TaskDefinitionConfig, TaskDefOverrides } from 'lib/config/taskdef/taskdef-common'

export const defaultGotenbergTaskDefConfig = (args: {
    serviceName: PlatformServiceName
    envConfig: EnvConfig
    taskDefOverrides?: TaskDefOverrides
}): TaskDefinitionConfig => {
    const { envConfig } = args
    const projectName = envConfig.projectName
    const envName = envConfig.envName

    return {
        family: `${projectName}-${args.serviceName}-${envName}`,
        cpu: 512,
        memoryMiB: 1024,
        app: {
            containerName: 'app',
            containerPortName: 'http',
            containerPort: 3000,
            cpuUnits: 512,
            memoryMiB: 1024,
            essential: true,
            stopTimeoutSeconds: 60, //TODO: handle usecase where a long PDF parsing process (i.e 15 min) is going before termination
            logging: {
                logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}`,
                streamPrefix: 'ecs'
            }
        },
        runtimePlatform: {
            cpuArchitecture: ecs.CpuArchitecture.ARM64
        }
    }
}
