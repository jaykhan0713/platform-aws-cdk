import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'

import {Construct} from 'constructs'

import type {PlatformServiceRuntimeProps} from 'lib/stacks/props/platform-service-runtime-props'
import {PlatformServiceName} from 'lib/config/domain/platform-service-name'
import {ISecurityGroup} from 'aws-cdk-lib/aws-ec2'

export interface PlatformInternalAlbProps extends PlatformServiceRuntimeProps {
    serviceName: PlatformServiceName,
    upstreamSg: ISecurityGroup,

}

export class PlatformInternalAlb extends Construct {

    public readonly alb: elbv2.ApplicationLoadBalancer

    constructor(scope: Construct, id: string, props: PlatformInternalAlbProps) {
        super(scope, id);

        const envConfig = props.envConfig
        const serviceName = props.serviceName
        const { vpc } = props.runtime

        const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
            securityGroupName: `${envConfig.projectName}-${serviceName}-internal-alb-sg-${envConfig.envName}`,
            vpc,
            allowAllOutbound: true // optional: can tighten to service Sg via addEgressRule
        })

        albSg.addIngressRule(
            props.upstreamSg,
            ec2.Port.tcp(80),
            '')

        this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            loadBalancerName: `${envConfig.projectName}-${serviceName}-internal-alb-${envConfig.envName}`,
            vpc,
            internetFacing: false,
            vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_ISOLATED},
            securityGroup: albSg
        })

        // optional: enable access logs: this.alb.logAccessLogs()
    }

}