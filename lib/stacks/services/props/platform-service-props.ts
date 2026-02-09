import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

import {BaseStackProps} from 'lib/stacks/base-stack'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'
import {PlatformServiceName} from 'lib/config/service/platform-service'

export interface PlatformServiceProps extends BaseStackProps {
    readonly runtime: PlatformServiceRuntime
    readonly serviceName: PlatformServiceName
}

export interface PlatformServiceRuntime {
    readonly cluster: ecs.ICluster
    readonly internalServicesSgId: string
    readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
    readonly adotImage: ecs.ContainerImage
}

