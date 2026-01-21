import type { EnvConfig } from 'lib/config/env'
import {StackDomain} from 'lib/config/naming/stacks'

export type ParamNamespace =
    | 'core'
    | 'services'

export type ObservabilityArea =
    | 'amp'
    | 'adot'

const ssmRoot = (cfg: EnvConfig) =>
    `/${cfg.projectName}/${cfg.envName}`

//remove leading slashes, remove trailing slashes at the end of string
const clean = (s: string) =>
    s.replace(/^\/+/, '').replace(/\/+$/, '')

export const ssmCoreBase = (cfg: EnvConfig, coreDomain: StackDomain) =>
    `${ssmRoot(cfg)}/core/${coreDomain}`

export const ssmServiceBase = (cfg: EnvConfig, serviceDomain: StackDomain) =>
    `${ssmRoot(cfg)}/services/${serviceDomain}`

export const ssmJoin = (basePath: string, suffix: string) =>
    `${basePath}/${clean(suffix)}`