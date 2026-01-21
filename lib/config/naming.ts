import type { EnvConfig, EnvName } from './env'

export type StackBaseName =
    | 'edge-service'
    | 'wallet-service'
    | 'network'
    | 'observability'
    | 'ecr'
    | 'adot-collector'

export type Naming = {
    stackName: (base: StackBaseName, envOverride?: EnvName) => string
    logGroupName: (service: StackBaseName, envOverride?: EnvName) => string
    ssmParamName: (path: string, envOverride?: EnvName) => string
}

export function createNaming(cfg: EnvConfig): Naming {
    const defaultEnv = cfg.envName

    const resolveEnv = (envOverride?: EnvName) => envOverride ?? defaultEnv

    const stackName = (base: StackBaseName, envOverride?: EnvName) => {
        const env = resolveEnv(envOverride)
        return `${base}-${env}`
    }

    const logGroupName = (service: StackBaseName, envOverride?: EnvName) => {
        const env = resolveEnv(envOverride)
        return `/ecs/${cfg.projectName}/${env}/${service}`
    }

    const ssmParamName = (path: string, envOverride?: EnvName) => {
        const env = resolveEnv(envOverride)
        const cleanPath = path.replace(/^\/+/, '')
        return `/${cfg.projectName}/${env}/${cleanPath}`
    }

    return {
        stackName,
        logGroupName,
        ssmParamName,
    }
}
