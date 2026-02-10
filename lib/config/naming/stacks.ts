import type {EnvConfig} from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'

export const resolveStackName = (cfg: EnvConfig, domain: StackDomain) =>
    `${cfg.projectName}-${domain}-${cfg.envName}`