import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery'

import { BaseStack, type BaseStackProps } from 'lib/stacks/base-stack'
import {resolveExportName} from 'lib/config/naming'
import { StackDomain } from 'lib/config/domain/stack-domain'
import {PlatformVpcLink} from 'lib/constructs/vpc/platform-vpc-link'

export class NetworkStack extends BaseStack {
    public readonly vpc: ec2.Vpc
    public readonly serviceConnectNamespace: servicediscovery.IHttpNamespace
    public readonly platformVpcLink: PlatformVpcLink

    public constructor(scope: cdk.App,  id: string,  props: BaseStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig
        const { envName, projectName } = envConfig

        const cidrBlock = '10.0.0.0/16'

        this.vpc = new ec2.Vpc(this, 'Vpc', {
            vpcName: `${projectName}-vpc-${envName}`,
            ipAddresses: ec2.IpAddresses.cidr(cidrBlock),
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 20
                },
                {
                    name: 'private-isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 20
                }
            ]
        })

        const azSuffix = (az: string) => az.slice(-1)

        this.vpc.publicSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Tier', 'public')
            cdk.Tags.of(subnet).add('Name', `public-subnet-${index}-${envName}`)
            cdk.Tags.of(subnet).add('Az', subnet.availabilityZone)
        })

        this.vpc.isolatedSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Tier', 'private-isolated')
            cdk.Tags.of(subnet).add('Name', `private-isolated-subnet-${index}-${envName}`)
            cdk.Tags.of(subnet).add('Az', subnet.availabilityZone)
        })

        // Service Connect namespace (Cloud Map Http namespace)
        this.serviceConnectNamespace = new servicediscovery.HttpNamespace(this, 'ServiceConnectHttpNamespace', {
            name: `${projectName}-http-namespace-${envName}`,
            description: `Service Connect namespace for internal services`
        })

        this.platformVpcLink = new PlatformVpcLink(this, 'PlatformVpcLink', {
            ...props,
            vpc: this.vpc
        })

        //Outputs
        new cdk.CfnOutput(this, 'CfnOutputVpcId', {
            value: this.vpc.vpcId,
            exportName: resolveExportName(envConfig, StackDomain.network, 'vpc-id'),
        })

        const [isolated0, isolated1] = this.vpc.isolatedSubnets
        if (!isolated0 || !isolated1) throw new Error('Expected 2 isolated subnets (maxAzs=2)')

        new cdk.CfnOutput(this, 'CfnOutputPrivateSubnet0Id', {
            value: isolated0.subnetId,
            exportName: resolveExportName(envConfig, StackDomain.network, 'private-isolated-subnet-0-id'),
        })

        new cdk.CfnOutput(this, 'CfnOutputPrivateSubnet1Id', {
            value: isolated1.subnetId,
            exportName: resolveExportName(envConfig, StackDomain.network, 'private-isolated-subnet-1-id'),
        })

        new cdk.CfnOutput(this, 'CfnOutputAz0', {
            value: isolated0.availabilityZone,
            exportName: resolveExportName(envConfig, StackDomain.network, 'az-0'),
        })

        new cdk.CfnOutput(this, 'CfnOutputAz1', {
            value: isolated0.availabilityZone,
            exportName: resolveExportName(envConfig, StackDomain.network, 'az-1'),
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcCidr', {
            value: cidrBlock,
            exportName: resolveExportName(envConfig, StackDomain.network, 'vpc-cidr'),
        })

        new cdk.CfnOutput(this, 'CfnOutputServiceConnectNamespaceArn', {
            value: this.serviceConnectNamespace.namespaceArn,
            exportName: resolveExportName(
                envConfig,
                StackDomain.network,
                'service-connect-http-namespace-arn'
            ),
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcLinkId', {
            value: this.platformVpcLink.vpcLink.vpcLinkId,
            exportName: resolveExportName(
                envConfig,
                StackDomain.network,
                'vpc-link-id'
            )
        })
    }
}