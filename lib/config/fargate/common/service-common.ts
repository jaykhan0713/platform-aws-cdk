export interface FargateServiceOverrides {
    healthCheckGracePeriodSeconds?: number
    desiredCount?: number
    disableServiceConnect?: boolean
    scaling?: {
        minCapacity: number
        maxCapacity: number
        scaleOnCpuUtilization?: {
            targetUtilizationPercent: number
            scaleInCooldown: number
            scaleOutCooldown: number
        }
    }
}