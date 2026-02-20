import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack';
import {AlbImports} from 'lib/config/dependency/alb/alb-imports';
import {PlatformServiceName} from 'lib/config/service/platform-service-registry';
import {NetworkImports} from 'lib/config/dependency/network/network-imports';
import {PlatformHttpApi} from 'lib/constructs/api/platform-http-api';
import {PlatformCognito} from 'lib/constructs/api/platform-cognito';
import {ParamNamespace} from "lib/config/domain";
import {resolveSsmParamPath, resolveSsmSecretPath} from "lib/config/naming";


//TODO: currently single ALB listener, future account for multiple ALB+service
export class GatewayStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props);

        const {envConfig, stackDomain} = props
        const {projectName, envName} = envConfig

        const vpc = NetworkImports.vpc(this, envConfig)
        const vpcLinkId = NetworkImports.vpcLinkId(envConfig)
        const vpcLink = apigwv2.VpcLink.fromVpcLinkAttributes(this, 'ImportedVpcLink', {
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

        const platformCognito = new PlatformCognito(this, 'PlatformCognito', {
            ...props
        })

        const platformHttpApi = new PlatformHttpApi(this, 'PlatformHttpApi', {
            ...props,
            vpcLink,
            listener,
            userPool: platformCognito.userPool,
            userPoolClient: platformCognito.userPoolClient,
            synthPoolClient: platformCognito.synthClient
        })

        const synthClient = platformCognito.synthClient
        const paramNamespace = ParamNamespace.core

        //secrets
        new secretsmanager.Secret(this, 'SecretSynthUserPoolClientId', {
            secretName: `${resolveSsmSecretPath(envConfig, paramNamespace, stackDomain, 'cognito/synth-client-secret')}`,
            secretStringValue: synthClient.userPoolClientSecret
        })

        //parameter store
        new ssm.StringParameter(this, 'ParameterApiUrl', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'api-url'),
            stringValue: platformHttpApi.apiUrl
        })

        new ssm.StringParameter(this, 'ParameterCognitoDomainUrl', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'cognito/domain-url'),
            stringValue: platformCognito.cognitoDomainUrl
        })

        new ssm.StringParameter(this, 'ParameterSynthClientId', {
            //parameterName: `/${projectName}/${envName}/core/cognito/synth-client-id`,
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'cognito/synth-client-id'),
            stringValue: synthClient.userPoolClientId
        })

        new ssm.StringParameter(this, 'ParameterSynthInvokeScope', {
            parameterName: `${resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'cognito/synth-invoke-scope')}`,
            stringValue: platformCognito.synthInvokeFullScope
        })
    }
}