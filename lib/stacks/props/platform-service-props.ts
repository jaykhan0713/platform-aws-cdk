import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecr from 'aws-cdk-lib/aws-ecr'

import {BaseStackProps} from 'lib/stacks/base-stack'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'
import { PlatformVpcLink } from 'lib/constructs/vpc/platform-vpc-link'
import {PlatformServiceName} from 'lib/config/service/platform-service-name'

export interface PlatformServiceProps extends BaseStackProps {
    readonly runtime: PlatformServiceRuntime
    readonly serviceName: PlatformServiceName
    readonly serviceRepo: ecr.IRepository
}

export interface PlatformServiceRuntime {
    readonly vpc: ec2.IVpc
    readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
    readonly platformVpcLink: PlatformVpcLink
    readonly cluster: ecs.ICluster

    readonly apsRemoteWriteEndpoint: string
    readonly apsWorkspaceArn: string
    readonly adotImage: ecs.ContainerImage
}

