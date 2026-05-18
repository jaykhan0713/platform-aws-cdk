import * as ecs from 'aws-cdk-lib/aws-ecs'
import type { SideCarName } from 'lib/config/taskdef/sidecar/sidecar-registry'
import * as cdk from 'aws-cdk-lib'

export type EnvMap = Readonly<Record<string, string>>
export type SecretMap = Readonly<Record<string, ecs.Secret>>

export interface ContainerLoggingConfig {
    logGroupName: string
    streamPrefix: string
}

interface ContainerConfig {
    containerName: string
    cpuUnits?: number
    memoryMiB?: number
    essential: boolean
    env?: EnvMap
    secrets?: SecretMap
    logging: ContainerLoggingConfig
}

export interface AppContainerConfig extends ContainerConfig {
    containerPortName: string
    containerPort: number
    secrets?: SecretMap
    stopTimeoutSeconds: number
}

export interface SideCarConfig extends ContainerConfig {
    enabled: boolean
    ports: number[]
}

export interface TaskDefOverrides {
    cpu ?: number
    memoryMiB ?: number
    app ?: {
        cpuUnits?: number
        memoryMib?: number
        env?: Map<string, string>
    }
}

export interface TaskDefinitionConfig {
    family: string
    cpu: number
    memoryMiB: number
    app: AppContainerConfig //main app service
    sidecars?: Map<SideCarName, SideCarConfig>
    runtimePlatform?: {
        cpuArchitecture?: ecs.CpuArchitecture
    },
    healthCheck?: {
        command: string[],
        interval?: number,
        timeout: number,
        retries: number,
        startPeriod: number
    }
}