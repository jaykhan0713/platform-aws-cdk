import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'

import {BaseStack, BaseStackProps} from "lib/stacks/base-stack";
import {AlbImports} from "lib/config/dependency/alb/alb-imports";
import {PlatformServiceName} from "lib/config/service/platform-service-registry";
import {NetworkImports} from "lib/config/dependency/network/network-imports";
import {PlatformHttpApi} from "lib/constructs/api/platform-http-api";
import {PlatformCognito} from "lib/constructs/api/platform-cognito";


//TODO: currently single ALB listener, future account for multiple ALB+service
export class GatewayStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props);

        const {envConfig} = props

        const vpc = NetworkImports.vpc(this, envConfig)
        const vpcLinkId = NetworkImports.vpcLinkId(envConfig)
        const vpcLink = apigwv2.VpcLink.fromVpcLinkAttributes(this, "ImportedVpcLink", {
            vpcLinkId,
            vpc
        })

        //membership vpc link SG ALB uses
        const subSgId = NetworkImports.vpcLinkSubSgId(envConfig)
        const subSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedAlbSubSg',
            subSgId,
            { mutable: false }
        )

        const serviceName = PlatformServiceName.edgeService

        const listenerArn = AlbImports.albListenerArn(serviceName, envConfig)
        const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(
            this,
            `Imported${serviceName}AlbListener`,
            {
                listenerArn,
                securityGroup: subSg
            }
        )

        const platformCognito = new PlatformCognito(this, "PlatformCognito", {
            ...props
        })

        const platformHttpApi = new PlatformHttpApi(this, "PlatformHttpApi", {
            ...props,
            vpcLink,
            listener,
            userPool: platformCognito.userPool,
            userPoolClient: platformCognito.userPoolClient
        })
    }

}