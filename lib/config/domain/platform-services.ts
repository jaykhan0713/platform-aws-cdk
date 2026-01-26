export const PlatformServices = {
    edge: 'edge-service',
    wallet: 'wallet-service'
}

export type PlatformServices = typeof PlatformServices[keyof typeof PlatformServices]