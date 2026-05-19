import * as ecs from 'aws-cdk-lib/aws-ecs'
import type { EnvConfig } from 'lib/config/env/env-config'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { TaskDefinitionConfig, TaskDefOverrides } from 'lib/config/fargate/common/taskdef-common'

export const gotenbergTaskDefConfig = (args: {
    serviceName: PlatformServiceName
    envConfig: EnvConfig
}): TaskDefinitionConfig => {
    const { envConfig } = args
    const projectName = envConfig.projectName
    const envName = envConfig.envName

    return {
        family: `${projectName}-${args.serviceName}-${envName}`,
        cpu: 1024,
        memoryMiB: 4096,
        app: {
            containerName: 'app',
            containerPortName: 'http',
            containerPort: 3000,
            cpuUnits: 1024,
            memoryMiB: 4096,
            essential: true,
            stopTimeoutSeconds: 60, //TODO: handle usecase where a long PDF parsing process (i.e 15 min) is going before termination
            logging: {
                logGroupName: `/ecs/${projectName}/${envName}/${args.serviceName}`,
                streamPrefix: 'ecs'
            }

            //TODO add health check overrides here
        },
        runtimePlatform: {
            cpuArchitecture: ecs.CpuArchitecture.ARM64
        }
    }
}
