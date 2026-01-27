import type { EnvConfig } from 'lib/config/env/env-config'
import type { IamRoleArea, StackDomain} from 'lib/config/domain'

export const resolveIamRoleName = (
    cfg: EnvConfig,
    domain: StackDomain,
    area: IamRoleArea
) =>
    `${cfg.projectName}-${domain}-${area}-${cfg.envName}`