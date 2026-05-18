export const ThirdPartyServiceName = {
    gotenbergService: 'gotenberg-service'
} as const

export type ThirdPartyServiceName = typeof ThirdPartyServiceName[keyof typeof ThirdPartyServiceName]