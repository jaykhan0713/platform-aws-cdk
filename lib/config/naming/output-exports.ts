import type { EnvConfig } from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain'
import {resolveStackName} from 'lib/config/naming/stacks'

export const resolveExportName = (cfg: EnvConfig, domain: StackDomain, area: String) =>
    `${resolveStackName(cfg, domain)}-${area}`

