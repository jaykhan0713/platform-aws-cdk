import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'

import {Construct} from 'constructs'

import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformInternalAlbProps extends BaseStackProps {
    serviceName: PlatformServiceName
    vpc: ec2.IVpc
    privateIsolatedSubnets: ec2.ISubnet[]
    upstreamSgs?: ec2.ISecurityGroup[]
    albCertificateArn?: string
    tg: elbv2.ApplicationTargetGroup
}

export class PlatformInternalAlb extends Construct {

    public readonly alb: elbv2.ApplicationLoadBalancer
    public readonly securityGroup: ec2.ISecurityGroup
    public readonly listener: elbv2.IApplicationListener

    constructor(scope: Construct, id: string, props: PlatformInternalAlbProps) {
        super(scope, id);

        const { envConfig, serviceName, vpc, albCertificateArn } = props

        //egress rule set by orchestrator
        this.securityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
            securityGroupName: `${envConfig.projectName}-${serviceName}-alb-sg-${envConfig.envName}`,
            vpc,
            allowAllOutbound: false //tighten to service via addEgressRule
        })

        const listenerPort = albCertificateArn ? 443 : 80

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

        const listenerProps = albCertificateArn ?
            {
                protocol: elbv2.ApplicationProtocol.HTTPS,
                certificates: [acm.Certificate.fromCertificateArn(
                    this, 'AlbCert', props.albCertificateArn!
                )],
                sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS
            } :
            {
                protocol: elbv2.ApplicationProtocol.HTTP
            }

        this.listener = this.alb.addListener('HttpListener', {
            port: listenerPort,
            open: false,
            ...listenerProps
        })

        // tell listener to forward to TG
        this.listener.addTargetGroups('ForwardToDownstream', {
            targetGroups: [props.tg]
        })
        // optional: enable access logs: this.alb.logAccessLogs()
    }

}