import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import type { VpcDependentStackProps } from 'lib/stacks/types/vpc-dependent-stack-props'

export interface RuntimeServiceStackProps extends  VpcDependentStackProps {
    readonly ecsCluster: ecs.Cluster
    readonly taskExecutionRole: iam.Role
}