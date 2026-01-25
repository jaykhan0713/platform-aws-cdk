export const EnvName = {
    prod: 'prod',
    tools: 'tools'
}

export type EnvName = typeof EnvName[keyof typeof EnvName]