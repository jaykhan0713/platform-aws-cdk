import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {StackDomain} from 'lib/config/domain'

export const PlatformServiceResource = {
    rds: 'rds',
} as const

export type PlatformServiceResource = typeof PlatformServiceResource[keyof typeof PlatformServiceResource]

export const platformServiceResources: ReadonlyMap<PlatformServiceName, ReadonlyMap<PlatformServiceResource, StackDomain>> = new Map<
    PlatformServiceName,
    ReadonlyMap<PlatformServiceResource, StackDomain>
>([
    [
        PlatformServiceName.apolloService,
        new Map<PlatformServiceResource, StackDomain>([

            [PlatformServiceResource.rds, StackDomain.apolloServiceRds],

        ])
    ]
])