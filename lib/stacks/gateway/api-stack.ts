import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack';
import {AlbImports} from 'lib/config/dependency/alb/alb-imports';
import {PlatformServiceName} from 'lib/config/service/platform-service-registry';
import {NetworkImports} from 'lib/config/dependency/network/network-imports';
import {PlatformHttpApi} from 'lib/constructs/api/platform-http-api';
import {PlatformCognito} from 'lib/constructs/api/platform-cognito';
import {ParamNamespace} from "lib/config/domain";
import { resolveSsmParamPath } from "lib/config/naming";

export interface ApiGatewayProps extends BaseStackProps {
    platformCognito: PlatformCognito
}

//TODO: currently single ALB listener, future account for multiple ALB+service
export class ApiStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: ApiGatewayProps) {
        super(scope, id, props);

        const { envConfig, stackDomain, platformCognito } = props

        const vpc = NetworkImports.vpcPrivateIsolated(this, envConfig)
        const vpcLinkId = NetworkImports.vpcLinkId(envConfig)
        const vpcLink = apigwv2.VpcLink.fromVpcLinkAttributes(this, 'ImportedVpcLink', {
            vpcLinkId,
            vpc
        })

        //membership vpc link SG ALB uses
        const subSgId = NetworkImports.vpcLinkSubSgId(envConfig)
        const subSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'ImportedVpcLinkSubSg',
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

        const platformHttpApi = new PlatformHttpApi(this, 'PlatformHttpApi', {
            ...props,
            vpcLink,
            listener,
            userPool: platformCognito.userPool,
            userAuthClient: platformCognito.userAuthClient,
            synthAuthClient: platformCognito.synthAuthClient
        })

        let customDomain

        if (envConfig.route53Config) {
            const domainName = envConfig.route53Config.domainName

            const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ApiHostedZone', {
                hostedZoneId: envConfig.route53Config.hostedZoneId,
                zoneName: domainName
            })

            const apiCert = new acm.Certificate(this, 'ApiGwCert', {
                domainName: `api.${domainName}`,
                validation: acm.CertificateValidation.fromDns(hostedZone)
            })

            customDomain = new apigwv2.DomainName(this, 'ApiCustomDomain', {
                domainName: `api.${domainName}`,
                certificate: apiCert
            })

            new apigwv2.ApiMapping(this, 'ApiMapping', {
                api: platformHttpApi.api,
                domainName: customDomain
            })

            new route53.ARecord(this, 'ApiAliasRecord', {
                zone: hostedZone,
                recordName: 'api',
                target: route53.RecordTarget.fromAlias(
                    new targets.ApiGatewayv2DomainProperties(
                        customDomain.regionalDomainName, // i.e the new d-xyz789.execute-api...
                        customDomain.regionalHostedZoneId
                    )
                )
            })
        }

        const paramNamespace = ParamNamespace.gateway

        const apiUrl = customDomain ? `${customDomain.name}/` : platformHttpApi.apiUrl
        //parameter store
        new ssm.StringParameter(this, 'ParameterApiUrl', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'api-url'),
            stringValue: apiUrl
        })

        //outputs
        new cdk.CfnOutput(this, 'CfnOutputApiUrl', {
            value: apiUrl
        })
    }
}