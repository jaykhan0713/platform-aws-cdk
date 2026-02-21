import * as cdk from 'aws-cdk-lib'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformCognito} from 'lib/constructs/api/platform-cognito'
import {ParamNamespace} from 'lib/config/domain'
import {resolveSsmParamPath, resolveSsmSecretPath} from 'lib/config/naming'

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
            secretName: `${resolveSsmSecretPath(envConfig, paramNamespace, stackDomain, 'synth-client-secret')}`,
            secretStringValue: synthClient.userPoolClientSecret
        })

        //parameter store

        new ssm.StringParameter(this, 'ParameterCognitoDomainUrl', {
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'domain-url'),
            stringValue: this.platformCognito.cognitoDomainUrl
        })

        new ssm.StringParameter(this, 'ParameterSynthClientId', {
            //parameterName: `/${projectName}/${envName}/core/cognito/synth-client-id`,
            parameterName: resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'synth-client-id'),
            stringValue: synthClient.userPoolClientId
        })

        new ssm.StringParameter(this, 'ParameterSynthInvokeScope', {
            parameterName: `${resolveSsmParamPath(envConfig, paramNamespace, stackDomain, 'synth-invoke-scope')}`,
            stringValue: this.platformCognito.synthInvokeFullScope
        })
    }

}