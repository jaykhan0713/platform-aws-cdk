import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

import { BaseStack, type BaseStackProps } from 'lib/stacks/base-stack'
import {resolveExportName} from 'lib/config/naming'
import { StackDomain } from 'lib/config/domain/stack-domain'
import { AZ } from 'lib/config/domain'
import {PlatformVpcLink} from 'lib/constructs/vpc/platform-vpc-link'

export class NetworkStack extends BaseStack {
    public readonly vpc: ec2.Vpc
    public readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
    public readonly platformVpcLink: PlatformVpcLink

    public constructor(scope: cdk.App,  id: string,  props: BaseStackProps) {
        super(scope, id, props)

        const envName = this.envConfig.envName
        const project = this.envConfig.projectName

        this.vpc = new ec2.Vpc(this, 'Vpc', {
            vpcName: `${project}-vpc-${envName}`,
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            availabilityZones: [AZ.US_WEST_2A, AZ.US_WEST_2B],
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 20
                },
                {
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 20
                }
            ]
        })

        const azSuffix = (az: string) => az.slice(-1)

        this.vpc.publicSubnets.forEach((subnet) => {
            cdk.Tags.of(subnet).add('Tier', 'public')
            cdk.Tags.of(subnet).add(
                'Name',
                `public-subnet-${azSuffix(subnet.availabilityZone)}-${envName}`
            )
        })

        this.vpc.isolatedSubnets.forEach((subnet) => {
            cdk.Tags.of(subnet).add('Tier', 'private')
            cdk.Tags.of(subnet).add(
                'Name',
                `private-subnet-${azSuffix(subnet.availabilityZone)}-${envName}`
            )
        })

        // Service Connect namespace (Cloud Map Http namespace)
        this.serviceConnectNamespace = new servicediscovery.HttpNamespace(this, 'ServiceConnectHttpNamespace', {
            name: `${project}-http-namespace-${envName}`,
            description: `Service Connect namespace for internal services`
        })

        this.platformVpcLink = new PlatformVpcLink(this, 'PlatformVpcLink', {
            ...props,
            vpc: this.vpc
        })

        //Outputs
        new cdk.CfnOutput(this, 'VpcId', {
            value: this.vpc.vpcId,
            exportName: resolveExportName(this.envConfig, StackDomain.network, 'vpc-id'),
        })

        const isolatedA = this.vpc.isolatedSubnets.find(s => s.availabilityZone === AZ.US_WEST_2A)
        const isolatedB = this.vpc.isolatedSubnets.find(s => s.availabilityZone === AZ.US_WEST_2B)

        if (!isolatedA || !isolatedB) throw new Error('Expected isolated subnets in us-west-2a and us-west-2b')

        new cdk.CfnOutput(this, 'PrivateSubnetAId', {
            value: isolatedA.subnetId,
            exportName: resolveExportName(this.envConfig, StackDomain.network, 'private-subnet-a-id'),
        })

        new cdk.CfnOutput(this, 'PrivateSubnetBId', {
            value: isolatedB.subnetId,
            exportName: resolveExportName(this.envConfig, StackDomain.network, 'private-subnet-b-id'),
        })

        new cdk.CfnOutput(this, 'VpcCidr', {
            value: '10.0.0.0/16',
            exportName: resolveExportName(this.envConfig, StackDomain.network, 'vpc-cidr'),
        })

        new cdk.CfnOutput(this, 'ServiceConnectNamespaceArn', {
            value: this.serviceConnectNamespace.namespaceArn,
            exportName: resolveExportName(this.envConfig, StackDomain.network, 'service-connect-http-namespace-arn'),
        })
    }
}