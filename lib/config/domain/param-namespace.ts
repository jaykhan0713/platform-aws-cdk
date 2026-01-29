export const ParamNamespace = {
    core: 'core',
    services: 'services'
} as const

export type ParamNamespace = typeof ParamNamespace[keyof typeof ParamNamespace]