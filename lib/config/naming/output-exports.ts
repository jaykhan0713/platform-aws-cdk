import type { EnvConfig } from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain'

export const resolveExportName = (cfg: EnvConfig, domain: StackDomain, area: String) =>
    `${cfg.projectName}-${domain}-${cfg.envName}-${area}`