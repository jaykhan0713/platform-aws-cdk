import * as cdk from 'aws-cdk-lib'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformCognito} from 'lib/constructs/api/platform-cognito'
import {ParamNamespace} from 'lib/config/domain'
import {resolveSsmParamPath, resolveSecretName} from 'lib/config/naming'

export class CognitoStack extends BaseStack {

    public readonly platformCognito: PlatformCognito

    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
        super(scope, id, props);

        const { envConfig, stackDomain } = props

        this.platformCognito = new PlatformCognito(this, 'PlatformCognito', props)

        const synthClient = this.platformCognito.synthAuthClient
        const paramNamespace = ParamNamespace.gateway

        //secrets
        new secretsmanager.Secret(this, 'SecretSynthUserPoolClientId', {
            secretName: `${resolveSecretName(envConfig, paramNamespace, stackDomain, 'synth-client-secret')}`,
            secretStringValue: synthClient.userPoolClientSecret
        })

        //parameter store

        new ssm.StringParameter(this, 'ParameterCognitoDomainUrl', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'domain-url'),
            stringValue: this.platformCognito.cognitoDomainUrl
        })

        new ssm.StringParameter(this, 'ParameterCognitoIssuerUri', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'issuer-uri'),
            stringValue: this.platformCognito.userPool.userPoolProviderUrl
        })

        new ssm.StringParameter(this, 'ParameterSynthClientId', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'synth-client-id'),
            stringValue: synthClient.userPoolClientId
        })

        new ssm.StringParameter(this, 'ParameterSynthInvokeScope', {
            parameterName: `${resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'synth-invoke-scope')}`,
            stringValue: this.platformCognito.synthInvokeFullScope
        })
    }

}