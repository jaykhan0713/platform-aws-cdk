import { FargateServiceOverrides } from 'lib/config/fargate/common/service-common'

export const gotenbergFargateServiceOverrides: FargateServiceOverrides = {
    healthCheckGracePeriodSeconds: 90,
    desiredCount: 2,
    disableServiceConnect: true,
    scaling: {
        minCapacity: 2,
        maxCapacity: 6,
        scaleOnCpuUtilization: {
            targetUtilizationPercent: 50,
            scaleInCooldown: 200,  //prevents thrashing after a burst
            scaleOutCooldown: 300, //TODO: do we want aggressive scale out?
        }
    }
}