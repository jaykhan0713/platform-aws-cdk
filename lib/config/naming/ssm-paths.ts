import type {EnvConfig} from 'lib/config/env/env-config'
import type { StackDomain, ParamNamespace} from 'lib/config/domain'

const ssmSecretPathRoot = (cfg: EnvConfig) =>
    `${cfg.projectName}/${cfg.envName}`

const ssmParamPathRoot = (cfg: EnvConfig) =>
    `/${cfg.projectName}/${cfg.envName}`

//remove leading slashes, remove trailing slashes at the end of string
const clean = (s: string) =>
    s.replace(/^\/+/, '').replace(/\/+$/, '')

export const resolveSsmSecretPath = (
    cfg: EnvConfig,
    namespace: ParamNamespace,
    domain: StackDomain,
    suffix : string
) => {
    return `${ssmSecretPathRoot(cfg)}/${namespace}/${domain}/${clean(suffix)}`
}

export const resolveSsmParamPath = (
    cfg: EnvConfig,
    namespace: ParamNamespace,
    domain: StackDomain,
    suffix : string
) => {
    return `${ssmParamPathRoot(cfg)}/${namespace}/${domain}/${clean(suffix)}`
}

export const resolveSsmParamPathArnWildcard = (
    cfg: EnvConfig,
    namespace: ParamNamespace
) =>
    `arn:aws:ssm:${cfg.region}:${cfg.account}:parameter${ssmParamPathRoot(cfg)}/${namespace}/*`

