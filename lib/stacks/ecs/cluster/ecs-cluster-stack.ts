import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {VpcImports} from 'lib/config/imports/vpc-imports'
import {resolveExportName} from 'lib/config/naming/output-exports'


export class EcsClusterStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope,  id,  props)

        const vpc = VpcImports.vpc(this, this.envConfig)

        const ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc,
            clusterName: `${StackDomain.ecsCluster}-${this.envConfig.envName}`,
            containerInsightsV2: ecs.ContainerInsights.DISABLED
        })

        new cdk.CfnOutput(this, 'CfnOutputEcsClusterArn', {
            key: 'EcsClusterArn',
            description: 'ECS Cluster Arn',
            value: ecsCluster.clusterArn,
            exportName: resolveExportName(this.envConfig, StackDomain.ecsCluster, 'ecs-cluster-arn')
        })
    }
}