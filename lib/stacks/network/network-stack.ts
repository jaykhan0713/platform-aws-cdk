import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

import { BaseStack, type BaseStackProps } from 'lib/stacks/base-stack'
import {resolveExportName} from 'lib/config/naming'
import { StackDomain } from 'lib/config/domain/stack-domain'
import {NetworkExports} from 'lib/config/dependency/network/network-exports'
import {PlatformVpcLink} from 'lib/constructs/vpc/platform-vpc-link'

export class NetworkStack extends BaseStack {
    public readonly vpc: ec2.Vpc

    public constructor(scope: cdk.App,  id: string,  props: BaseStackProps) {
        super(scope, id, props)

        const envConfig = props.envConfig
        const { envName, projectName } = envConfig

        const cidrBlock = envConfig.vpcConfig?.cidrBlock ?? '10.0.0.0/16'
        const maxAzs = envConfig.vpcConfig?.maxAzs ?? 2

        this.vpc = new ec2.Vpc(this, 'Vpc', {
            vpcName: `${projectName}-vpc-${envName}`,
            ipAddresses: ec2.IpAddresses.cidr(cidrBlock),
            maxAzs,
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

        this.vpc.publicSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Tier', 'public')
            cdk.Tags.of(subnet).add('Name', `public-subnet-${index}-${envName}`)
            cdk.Tags.of(subnet).add('Az', subnet.availabilityZone)

            new cdk.CfnOutput(this, `CfnOutputPublicSubnet${index}Id`, {
                value: subnet.subnetId,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.publicSubnetId(index)
                )
            })

            new cdk.CfnOutput(this, `CfnOutputPublicSubnet${index}Az`, {
                value: subnet.availabilityZone,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.publicSubnetAz(index)
                )
            })

            const routeTable = subnet.node.tryFindChild('RouteTable')
            if (routeTable) {
                // future CDK version or shared RT; silently skip
                cdk.Tags.of(routeTable).add('Name', `rtb-public-${index}-${envName}`)
            }

            new cdk.CfnOutput(this,  `CfnOutputPublicSubnet${index}Rt`, {
                value: subnet.routeTable.routeTableId,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.publicSubnetRt(index)
                )
            })
        })

        this.vpc.isolatedSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Tier', 'private-isolated')
            cdk.Tags.of(subnet).add('Name', `private-isolated-subnet-${index}-${envName}`)
            cdk.Tags.of(subnet).add('Az', subnet.availabilityZone)

            new cdk.CfnOutput(this, `CfnOutputPrivateIsolatedSubnet${index}Id`, {
                value: subnet.subnetId,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.privateIsolatedSubnetId(index)
                )
            })

            new cdk.CfnOutput(this, `CfnOutputPrivateIsolatedSubnet${index}Az`, {
                value: subnet.availabilityZone,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.privateIsolatedSubnetAz(index)
                )
            })

            const routeTable = subnet.node.tryFindChild('RouteTable')
            if (routeTable) {
                // future CDK version or shared RT; silently skip
                cdk.Tags.of(routeTable).add('Name', `rtb-private-isolated-${index}-${envName}`)

            }

            new cdk.CfnOutput(this,  `CfnOutputPrivateIsolatedSubnet${index}Rt`, {
                value: subnet.routeTable.routeTableId,
                exportName: resolveExportName(
                    envConfig,
                    StackDomain.network,
                    NetworkExports.privateIsolatedSubnetRt(index)
                )
            })
        })

        /**
         * NOTE: VPC Link is owned by Network Stack and not Gateway Stack
         * to ensure portability and no circular dependencies. ALB depends on VPC Link SG,
         * GW depends on VPC Link as well as ALB Listener. Portable Creation needs to be
         * Network -> Services -> GW, leaving transport primitives (VPC Link) on network stack ensures
         * GW and ALB don't have a circular dep.
         */
        const platformVpcLink = new PlatformVpcLink(this, 'PlatformVpcLink', {
            ...props,
            vpc: this.vpc,
            privateIsolatedSubnets: this.vpc.isolatedSubnets
        })

        //Outputs
        new cdk.CfnOutput(this, 'CfnOutputVpcId', {
            value: this.vpc.vpcId,
            exportName: resolveExportName(envConfig, StackDomain.network, NetworkExports.vpcId),
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcCidr', {
            value: cidrBlock,
            exportName: resolveExportName(envConfig, StackDomain.network, NetworkExports.vpcCidr),
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcLinkId', {
            description: 'Shared Vpc Link Id',
            value: platformVpcLink.vpcLink.vpcLinkId,
            exportName: resolveExportName(envConfig, StackDomain.network, NetworkExports.vpcLinkId)
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcLinkSgId', {
            description: 'Vpc Link SG Id',
            value: platformVpcLink.securityGroup.securityGroupId,
            exportName: resolveExportName(envConfig, StackDomain.network, NetworkExports.vpcLinkSgId)
        })

        new cdk.CfnOutput(this, 'CfnOutputVpcLinkSubSgId', {
            description: 'Shared Vpc Link SG Id for ALB subscription',
            value: platformVpcLink.subSg.securityGroupId,
            exportName: resolveExportName(envConfig, StackDomain.network, NetworkExports.vpcLinkSubSgId)
        })
    }
}