export const PlatformServiceName = {
    edgeService: 'edge-service'
} as const

export type PlatformServiceName = typeof PlatformServiceName[keyof typeof PlatformServiceName]