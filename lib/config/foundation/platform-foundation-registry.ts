export const PlatformFoundationName = {
    k6Runner: 'k6-runner',
    //adotCollector: 'adot-collector',
    //baseImages: 'base-images'
} as const

export type PlatformFoundationName = typeof PlatformFoundationName[keyof typeof PlatformFoundationName]