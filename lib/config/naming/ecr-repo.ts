import {EnvConfig} from 'lib/config/env/env-config'
import {PlatformService} from 'lib/config/domain/platform-service'

export const resolvePlatformServiceRepoName = (
    cfg: EnvConfig,
    serviceName: PlatformService
) =>
    `${cfg.projectName}/services/${serviceName}`