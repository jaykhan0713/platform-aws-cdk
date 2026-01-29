export const EnvName = {
    prod: 'prod',
    tools: 'tools'
} as const // preserve literals inside EnvName

export type EnvName = typeof EnvName[keyof typeof EnvName]