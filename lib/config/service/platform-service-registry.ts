/*
 * NOTE: Adding a service here will automatically create an ECR repo for it when deploying CICD app.
 */
import { StackDomain } from 'lib/config/domain'

import { TaskDefOverrides } from 'lib/config/taskdef/taskdef-common'
import { AppContainerType } from 'lib/config/taskdef/app-container-type'

export const PlatformServiceName = {
    edgeService: 'edge-service',
    voyagerService: 'voyager-service',
    apolloService: 'apollo-service',
    gotenbergService: 'gotenberg-service',
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
    readonly taskDefOverrides?: TaskDefOverrides
    readonly vpcLinkEnabled?: boolean //TODO make this only applicable for alb exposures
    readonly appContainerType?: AppContainerType // need for services that don't own DTO
    //readonly appContainerType?: AppContainerType //TODO might need later
}

export const platformServiceOverridesMap: ReadonlyMap<PlatformServiceName, PlatformServiceOverrides> = new Map<
    PlatformServiceName,
    PlatformServiceOverrides
>([
    [
        PlatformServiceName.edgeService,
        {
            exposure: PlatformServiceExposure.alb,
            vpcLinkEnabled: true,
            taskDefOverrides: {
                cpu: 1024,
                memoryMiB: 2048,
                app: {
                    cpuUnits: 944,
                    memoryMib: 1800,
                    env: new Map<string, string>([
                        ['JAVA_TOOL_OPTIONS', '-Xms256m -Xmx1300m -XX:+UseContainerSupport']
                    ])
                }
            }
        }
    ],
    [
        PlatformServiceName.gotenbergService,
        {
            exposure: PlatformServiceExposure.alb,
            vpcLinkEnabled: false,
            appContainerType: AppContainerType.thirdParty
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

//shared pipeline key
const serviceKeyByValue = Object.fromEntries(
    Object.entries(PlatformServiceName).map(([k, v]) => [v, k])
) as Record<PlatformServiceName, PlatformServiceKey>

//service pipeline related
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

export const getServicePipelineStackDomainFromValue = (serviceName: PlatformServiceName) =>
    StackDomain[`${serviceKeyByValue[serviceName]}Pipeline` as keyof ServicePipelineDomains]

//service dto pipeline related
type ServiceDtoPipelineDomains = {
    [K in PlatformServiceKey as `${K}DtoPipeline`]:
    `${typeof PlatformServiceName[K]}-dto-pipeline`
}

export const serviceDtoPipelineDomains = Object.fromEntries(
    (Object.keys(PlatformServiceName) as PlatformServiceKey[]).map(k => [
        `${k}DtoPipeline`,
        `${PlatformServiceName[k]}-dto-pipeline`
    ])
) as ServiceDtoPipelineDomains

export const getDtoPipelineStackDomainFromValue = (serviceName: PlatformServiceName) =>
    StackDomain[`${serviceKeyByValue[serviceName]}DtoPipeline` as keyof ServiceDtoPipelineDomains]

