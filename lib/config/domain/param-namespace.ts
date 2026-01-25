export const ParamNamespace = {
    core: 'core',
    services: 'services'
}

export type ParamNamespace = typeof ParamNamespace[keyof typeof ParamNamespace]