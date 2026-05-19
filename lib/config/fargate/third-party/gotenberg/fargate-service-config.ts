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
            scaleInCooldown: 300,  //prevents thrashing after a burst
            scaleOutCooldown: 60, //aggressive scale out

        }
    }
}