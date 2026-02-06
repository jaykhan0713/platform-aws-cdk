import * as cdk from 'aws-cdk-lib'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {PlatformVpcLink} from 'lib/constructs/vpc/platform-vpc-link'

export class ServiceRuntimeStack extends BaseStack {
    public readonly ecsCluster: ecs.Cluster
    public readonly httpNamespace: servicediscovery.IHttpNamespace
    public readonly platformVpcLink: PlatformVpcLink

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope,  id,  props)

        const vpc = NetworkImports.vpc(this, props.envConfig)
        const privateIsolatedSubnets = NetworkImports.privateIsolatedSubnets(this, props.envConfig)
        const { projectName, envName} = props.envConfig

        this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc,
            clusterName: `${projectName}-cluster-${envName}`,
            containerInsightsV2: ecs.ContainerInsights.DISABLED
        })

        this.platformVpcLink = new PlatformVpcLink(this, 'PlatformVpcLink', {
            ...props,
            vpc,
            privateIsolatedSubnets
        })

        //Service Connect namespace (Cloud Map Http namespace)
        this.httpNamespace = new servicediscovery.HttpNamespace(this, 'ServiceConnectHttpNamespace', {
            name: `${projectName}-http-namespace-${envName}`,
            description: `Service Connect namespace for internal services`
        })

        //outputs
        new cdk.CfnOutput(this, 'CfnOutputEcsClusterArn', {
            description: 'ECS Cluster Arn',
            value: this.ecsCluster.clusterArn
        })

        new cdk.CfnOutput(this, 'CfnOutputHttpNamespaceArn', {
            description: 'Service Discovery Http Namespace Arn',
            value: this.httpNamespace.namespaceArn
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcLinkId', {
            description: 'Shared Vpc Link Id',
            value: this.platformVpcLink.vpcLink.vpcLinkId
        })
    }
}