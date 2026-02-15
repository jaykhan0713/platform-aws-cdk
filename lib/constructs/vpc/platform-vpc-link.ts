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
    public readonly subSg: ec2.ISecurityGroup

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
            allowAllOutbound: false
        })

        const albListenerPort = 80

        //subscriber membership sg, ALBs subscribe to this via alb.addSecurityGroup() so vpc link can talk to them
        this.subSg = new ec2.SecurityGroup(this, 'VpcLinkSubSg', {
            securityGroupName: `${envConfig.projectName}-vpc-link-sub-sg-${envConfig.envName}`,
            vpc,
            allowAllOutbound: false
        })

        this.subSg.addIngressRule(
            this.securityGroup,
            ec2.Port.tcp(albListenerPort),
            `Ingress on ALB listener port: ${albListenerPort}`
        )

        this.securityGroup.addEgressRule(
            this.subSg,
            ec2.Port.tcp(albListenerPort),
            `Vpc Link Egress to ALB listener port: ${albListenerPort}`
        )

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