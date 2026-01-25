import type { EnvConfig } from 'lib/config/env/env-config'
import { StackDomain}  from 'lib/config/domain'

export const resolveIamRoleName = (
    cfg: EnvConfig,
    domain: StackDomain,
    area: String
) =>
    `${cfg.projectName}-${domain}-${area}-${cfg.envName}`

export const resolveIamPolicyName = (
    cfg: EnvConfig,
    domain: StackDomain,
    area: String
)=>
    `${cfg.projectName}-${domain}-${area}-${cfg.envName}`