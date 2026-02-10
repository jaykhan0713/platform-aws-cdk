import {EnvConfig} from 'lib/config/env/env-config'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'

export const resolvePlatformServiceRepoName = (
    cfg: EnvConfig,
    serviceName: PlatformServiceName
) =>
    `${cfg.projectName}/services/${serviceName}`