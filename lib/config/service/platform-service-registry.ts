//note that adding another service here will automatically create an ECR repo for it.
import {StackDomain} from 'lib/config/domain'

export const PlatformServiceName = {
    edgeService: 'edge-service',
    voyagerService: 'voyager-service'
} as const

export type PlatformServiceName = typeof PlatformServiceName[keyof typeof PlatformServiceName]
type PlatformServiceKey = keyof typeof PlatformServiceName

//Exposure type for what the service is behind
export const PlatformServiceExposure = {
    internal: 'internal', //internal for SC client + serv
    alb: 'alb'
} as const

export type PlatformServiceExposure = typeof PlatformServiceExposure[keyof typeof PlatformServiceExposure]

export type PlatformServiceOverrides = {
    readonly exposure?: PlatformServiceExposure
    //task def overrides
}

export const platformServiceOverridesMap: ReadonlyMap<PlatformServiceName, PlatformServiceOverrides> = new Map<
    PlatformServiceName,
    PlatformServiceOverrides
>([
    [
        PlatformServiceName.edgeService,
        {
            exposure: 'alb'
        }
    ]
])

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

export const getPlatformServiceStackId = (serviceName: PlatformServiceName) => {
    return STACK_ID_MAP[serviceName]
}

//pipeline related
type ServicePipelineDomains = {
    [K in PlatformServiceKey as `${K}Pipeline`]:
    `${typeof PlatformServiceName[K]}-pipeline`
}

export const servicePipelineDomains = Object.fromEntries(
    (Object.keys(PlatformServiceName) as PlatformServiceKey[]).map(k => [
        `${k}Pipeline`,
        `${PlatformServiceName[k]}-pipeline`
    ])
) as ServicePipelineDomains

const serviceKeyByValue = Object.fromEntries(
    Object.entries(PlatformServiceName).map(([k, v]) => [v, k])
) as Record<PlatformServiceName, PlatformServiceKey>

export const getPipelineStackDomainFromValue = (serviceName: PlatformServiceName) =>
    StackDomain[`${serviceKeyByValue[serviceName]}Pipeline` as keyof ServicePipelineDomains]
