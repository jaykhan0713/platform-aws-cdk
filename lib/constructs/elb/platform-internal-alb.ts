import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'

import {Construct} from 'constructs'

import type {PlatformServiceProps} from 'lib/stacks/props/platform-service-props'
import {PlatformService} from 'lib/config/domain/platform-service'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformInternalAlbProps extends BaseStackProps {
    serviceName: PlatformService
    vpc: ec2.IVpc
    upstreamSg: ec2.ISecurityGroup
    albHttpListenerPort?: number
}

export class PlatformInternalAlb extends Construct {

    public readonly alb: elbv2.ApplicationLoadBalancer
    public readonly securityGroup: ec2.ISecurityGroup
    public readonly listener: elbv2.ApplicationListener

    constructor(scope: Construct, id: string, props: PlatformInternalAlbProps) {
        super(scope, id);

        const { envConfig, serviceName, vpc } = props
        const defaultHttpListenerPort = 80

        //egress rule set by orchestrator
        this.securityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
            securityGroupName: `${serviceName}-alb-sg-${envConfig.envName}`,
            vpc,
            allowAllOutbound: false //tighten to service via addEgressRule
        })

        this.securityGroup.addIngressRule(
            props.upstreamSg,
            ec2.Port.tcp(props.albHttpListenerPort ?? defaultHttpListenerPort),
            'Allow upstream Sg to port 80'
        )

        this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            loadBalancerName: `${serviceName}-alb-${envConfig.envName}`,
            vpc,
            internetFacing: false,
            vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_ISOLATED},
            securityGroup: this.securityGroup
        })

        this.listener = this.alb.addListener('HttpListener', {
            port: props.albHttpListenerPort ?? defaultHttpListenerPort,
            open: false
        })

        // optional: enable access logs: this.alb.logAccessLogs()
    }

}