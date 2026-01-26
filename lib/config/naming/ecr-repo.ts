import {EnvConfig} from 'lib/config/env/env-config'
import {PlatformServices} from 'lib/config/domain/platform-services'

export const resolvePlatformServiceRepoName = (
    cfg: EnvConfig,
    serviceName: PlatformServices
) =>
    `${cfg.projectName}/services/${serviceName}`