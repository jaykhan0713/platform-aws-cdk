export const ParamNamespace = {
    core: 'core',
    gateway: 'gateway',
    services: 'services'
} as const

export type ParamNamespace = typeof ParamNamespace[keyof typeof ParamNamespace]