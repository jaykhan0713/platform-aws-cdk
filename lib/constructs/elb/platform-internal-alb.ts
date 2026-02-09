import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'

import {Construct} from 'constructs'

import {PlatformServiceName} from 'lib/config/service/platform-service'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformInternalAlbProps extends BaseStackProps {
    serviceName: PlatformServiceName
    vpc: ec2.IVpc
    privateIsolatedSubnets: ec2.ISubnet[]
    upstreamSgs?: ec2.ISecurityGroup[]
    albHttpListenerPort?: number
    tg: elbv2.ApplicationTargetGroup
}

export class PlatformInternalAlb extends Construct {

    public readonly alb: elbv2.ApplicationLoadBalancer
    public readonly securityGroup: ec2.ISecurityGroup
    public readonly listener: elbv2.IApplicationListener

    constructor(scope: Construct, id: string, props: PlatformInternalAlbProps) {
        super(scope, id);

        const { envConfig, serviceName, vpc } = props
        const defaultHttpListenerPort = 80

        //egress rule set by orchestrator
        this.securityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
            securityGroupName: `${envConfig.projectName}-${serviceName}-alb-sg-${envConfig.envName}`,
            vpc,
            allowAllOutbound: false //tighten to service via addEgressRule
        })

        const listenerPort = props.albHttpListenerPort ?? defaultHttpListenerPort

        for (const upstreamSg of props.upstreamSgs ?? []) {
            this.securityGroup.addIngressRule(
                upstreamSg,
                ec2.Port.tcp(listenerPort),
                `Allow upstream Sg to port ${listenerPort}`
            )
        }

        this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            loadBalancerName: `${serviceName}-alb-${envConfig.envName}`,
            vpc,
            internetFacing: false,
            vpcSubnets: {
                subnets: props.privateIsolatedSubnets
            },
            securityGroup: this.securityGroup
        })

        this.listener = this.alb.addListener('HttpListener', {
            port: props.albHttpListenerPort ?? defaultHttpListenerPort,
            open: false
        })

        // tell listener to forward to TG
        this.listener.addTargetGroups('ForwardToDownstream', {
            targetGroups: [props.tg]
        })
        // optional: enable access logs: this.alb.logAccessLogs()
    }

}