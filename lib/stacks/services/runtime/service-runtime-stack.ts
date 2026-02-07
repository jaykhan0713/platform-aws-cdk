import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'

export class ServiceRuntimeStack extends BaseStack {

    public readonly ecsCluster: ecs.Cluster
    public readonly internalServicesSg: ec2.ISecurityGroup
    public readonly httpNamespace: servicediscovery.IHttpNamespace


    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope,  id,  props)

        const vpc = NetworkImports.vpc(this, props.envConfig)
        const { projectName, envName} = props.envConfig

        this.ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
            vpc,
            clusterName: `${projectName}-cluster-${envName}`,
            containerInsightsV2: ecs.ContainerInsights.DISABLED
        })



        /* alb backed services consume this SG, internal services will consume this SG AND
         * do their unique ecsTaskSg.addIngress(internalServices.sg) so any service registered
         * with internalServices sg can talk to the unique service. This is an internal service subscription
         * pattern.
         */
        this.internalServicesSg =  new ec2.SecurityGroup(this, 'EcsTaskSecurityGroup', {
            securityGroupName: `${projectName}-internal-services-task-sg-${envName}`,
            vpc,
            description: `SG for internal services to communicate`,
            allowAllOutbound: true
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
    }
}