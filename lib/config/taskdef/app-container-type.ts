export const AppContainerType = {
    spring: 'spring',
    go: 'go',
    thirdParty: 'thirdParty'
} as const

export type AppContainerType = typeof AppContainerType[keyof typeof AppContainerType]