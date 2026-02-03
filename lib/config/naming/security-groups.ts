import type { EnvConfig } from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain'

export const resolveSecurityGroupName = (
    envConfig: EnvConfig,
    domain: StackDomain
) =>
    `${domain}-sg-${envConfig.envName}`