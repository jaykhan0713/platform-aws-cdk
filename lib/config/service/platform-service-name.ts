//note that adding another service here will automatically create an ECR repo for it.
export const PlatformServiceName = {
    edgeService: 'edge-service'
} as const

export type PlatformServiceName = typeof PlatformServiceName[keyof typeof PlatformServiceName]

//i.e edge-service stack id is 'EdgeService'
const kebabToPascal = (value: string): string =>
    value
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

const STACK_ID_MAP: Record<PlatformServiceName, string> =
    Object.values(PlatformServiceName).reduce((acc, serviceName) => {
        acc[serviceName] = kebabToPascal(serviceName)
        return acc
    }, {} as Record<PlatformServiceName, string>)

export const getStackId = (serviceName: PlatformServiceName) => {
    return STACK_ID_MAP[serviceName]
}