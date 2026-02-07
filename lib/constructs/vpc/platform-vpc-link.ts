import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'

import { Construct } from 'constructs'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformVpcLinkProps extends BaseStackProps {
    vpc: ec2.IVpc,
    privateIsolatedSubnets: ec2.ISubnet[]
}

export class PlatformVpcLink extends Construct {

    public readonly vpcLink: apigwv2.IVpcLink
    public readonly securityGroup: ec2.ISecurityGroup

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformVpcLinkProps
    ) {
        super(scope, id)

        const { envConfig, vpc } = props

        this.securityGroup = new ec2.SecurityGroup(this, 'VpcLinkSg', {
            securityGroupName: `${envConfig.projectName}-vpc-link-sg-${envConfig.envName}`,
            vpc,

            /* TODO: figure a way to handle dependency errors with sg.addEgress on other stacks
             *  when this is false
             */
            allowAllOutbound: false
        })

        this.vpcLink = new apigwv2.VpcLink(this, 'VpcLink', {
            vpcLinkName: `${envConfig.projectName}-vpc-link-${envConfig.envName}`,
            vpc,
            securityGroups: [this.securityGroup],
            subnets: {
                subnets: props.privateIsolatedSubnets
            }
        })
    }
}