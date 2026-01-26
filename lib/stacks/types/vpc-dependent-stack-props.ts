import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

import type { BaseStackProps } from 'lib/stacks/base-stack'

export interface VpcDependentStackProps extends BaseStackProps {
    readonly vpc: ec2.IVpc
    readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
}