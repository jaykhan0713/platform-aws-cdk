import type { EnvConfig } from 'lib/config/env'

export type StackDomain =
    | 'observability' // | add base names as needed


export const stackName = (cfg: EnvConfig, domain: StackDomain) =>
    `${cfg.projectName}-${domain}-${cfg.envName}`
