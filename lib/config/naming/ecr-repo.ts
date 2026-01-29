import {EnvConfig} from 'lib/config/env/env-config'
import {PlatformServiceName} from 'lib/config/domain/platform-service-name'

export const resolvePlatformServiceRepoName = (
    cfg: EnvConfig,
    serviceName: PlatformServiceName
) =>
    `${cfg.projectName}/services/${serviceName}`