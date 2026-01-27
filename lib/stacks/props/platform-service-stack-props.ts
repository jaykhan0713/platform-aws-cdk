import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

import {BaseStackProps} from 'lib/stacks/base-stack'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

export interface PlatformServiceStackProps extends BaseStackProps {
    readonly runtime: PlatformServiceRuntime
}

export interface PlatformServiceRuntime {
    readonly vpc: ec2.IVpc
    readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
    readonly cluster: ecs.ICluster
    readonly taskExecutionRole: iam.IRole

    // observability “outputs” your services need
    readonly apsWorkspaceArn: string
    // add more later: logGroupName, adotConfigParamArn, etc
}

