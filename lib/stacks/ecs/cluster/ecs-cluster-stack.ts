import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import { BaseStack } from 'lib/stacks/base-stack'
import { StackDomain } from 'lib/config/domain/stack-domain'
import { resolveExportName } from 'lib/config/naming'
import type { VpcDependentStackProps } from 'lib/stacks/types'


export class EcsClusterStack extends BaseStack {
    private readonly ecsCluster: ecs.Cluster

    constructor(scope: cdk.App, id: string, props: VpcDependentStackProps) {
        super(scope,  id,  props)

        const vpc = props.vpc

        this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc,
            clusterName: `${StackDomain.ecsCluster}-${this.envConfig.envName}`,
            containerInsightsV2: ecs.ContainerInsights.DISABLED
        })

        new cdk.CfnOutput(this, 'CfnOutputEcsClusterArn', {
            description: 'ECS Cluster Arn',
            value: this.ecsCluster.clusterArn,
            exportName: resolveExportName(this.envConfig, StackDomain.ecsCluster, 'ecs-cluster-arn')
        })
    }
}