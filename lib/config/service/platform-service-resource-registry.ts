import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {StackDomain} from 'lib/config/domain'

export const PlatformServiceResource = {
    rds: 'rds',
} as const

export type PlatformServiceResource = typeof PlatformServiceResource[keyof typeof PlatformServiceResource]

//Note these are 1:1 owned resources by the service. I.e 1 service owns 1 rds instance
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