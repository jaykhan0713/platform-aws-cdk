import type {EnvConfig} from 'lib/config/env/env-config'
import type { StackDomain, ParamNamespace} from 'lib/config/domain'

const secretPathRoot = (cfg: EnvConfig) =>
    `${cfg.projectName}/${cfg.envName}`

const ssmParamPathRoot = (cfg: EnvConfig) =>
    `/${cfg.projectName}/${cfg.envName}`

//remove leading slashes, remove trailing slashes at the end of string
const clean = (s: string) =>
    s.replace(/^\/+/, '').replace(/\/+$/, '')

export const resolveSecretName = (
    cfg: EnvConfig,
    namespace: ParamNamespace,
    domain: StackDomain,
    suffix : string
) => {
    return `${secretPathRoot(cfg)}/${namespace}/${domain}/${clean(suffix)}`
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

export const resolveSsmParamDomainPathArnWildcard = (
    cfg: EnvConfig,
    namespace: ParamNamespace,
    domain: StackDomain
)=>
    `arn:aws:ssm:${cfg.region}:${cfg.account}:parameter${resolveSsmParamPath(cfg, namespace, domain, '*')}`

export const resolveSecretPathArnWildcard = (
    cfg: EnvConfig,
    namespace: ParamNamespace,
    domain: StackDomain
) =>
    `arn:aws:secretsmanager:${cfg.region}:${cfg.account}:secret:${resolveSecretName(cfg, namespace, domain, '*')}`
