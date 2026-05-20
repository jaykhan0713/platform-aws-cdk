import { FargateServiceOverrides } from 'lib/config/fargate/common/service-common'

export const gotenbergFargateServiceOverrides: FargateServiceOverrides = {
    healthCheckGracePeriodSeconds: 90,
    desiredCount: 1,
    disableServiceConnect: true,
    scaling: {
        minCapacity: 1,
        maxCapacity: 5,
        scaleOnCpuUtilization: {
            targetUtilizationPercent: 50,
            scaleInCooldown: 200,  //prevents thrashing after a burst
            scaleOutCooldown: 60, //aggressive scale out
        }
    }
}