import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { FargateServiceOverrides } from 'lib/config/fargate/common/service-common'
import { gotenbergFargateServiceOverrides } from 'lib/config/fargate/third-party/gotenberg/fargate-service-config'

export const fargateServiceConfigRegistry: ReadonlyMap<PlatformServiceName, FargateServiceOverrides> = new Map<
    PlatformServiceName,
    FargateServiceOverrides
> ([
    [
        PlatformServiceName.gotenbergService,
        gotenbergFargateServiceOverrides
    ]
])