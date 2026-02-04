//note that adding another service here will automatically create an ECR repo for it.
export const PlatformService = {
    edgeService: 'edge-service'
} as const

export type PlatformService = typeof PlatformService[keyof typeof PlatformService]