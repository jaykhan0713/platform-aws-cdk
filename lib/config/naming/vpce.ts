import type { VpceServiceName } from 'lib/config/domain/vpce-service-name'
import {EnvConfig} from 'lib/config/env/env-config'

export const resolveVpceNameTag = (
    envConfig: EnvConfig,
    name: VpceServiceName
) => `${name}-vpce-${envConfig.envName}`