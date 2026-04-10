import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'

import {BaseStackProps} from "lib/stacks/base-stack";
import {Construct} from "constructs";

export interface PlatformCognitoProps extends BaseStackProps {}

export class PlatformCognito extends Construct {

    public readonly userPool: cognito.UserPool
    public readonly userAuthClient: cognito.UserPoolClient
    public readonly synthAuthClient: cognito.UserPoolClient

    public readonly cognitoDomainUrl: string
    public readonly synthInvokeFullScope: string

    constructor(scope: Construct, id: string, props: PlatformCognitoProps) {
        super(scope, id)

        const { projectName, envName, region } = props.envConfig

        //store of users + authentication engine. Tokens are issued by pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `${projectName}-user-pool-${envName}`,
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            userVerification: {
                emailSubject: 'Verify your jay.platform account',
                emailBody: 'Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // for showcase
        })

        //Creates https://<projectName>-auth-<envName>.auth.us-west-2.amazoncognito.com Oauth endpoint
        //https://<projectName>-auth-<envName>.auth.us-west-2.amazoncognito.com/oauth2/{authorize,token,logout etc}
        const domainPrefix = `${projectName}-auth-${envName}`

        this.userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix,
            },
            managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN
        })

        this.cognitoDomainUrl = `https://${domainPrefix}.auth.${region}.amazoncognito.com`

        //application registration, tokens are requested through client
        this.userAuthClient = new cognito.UserPoolClient(this, 'UserAuthClient', {
            userPool: this.userPool,

            generateSecret: false, // requires false for PKCE

            authFlows: {
                userSrp: true, //TODO: switch to false once oAuth is live
                userPassword: false // SRP only
            },

            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    //cognito.OAuthScope.PROFILE
                ],
                callbackUrls: [
                    'http://localhost:3000/api/auth/sign-in-callback',
                    'https://jay-platform.com/api/auth/sign-in-callback',
                    'postman://app/oauth2/callback',
                    'https://oauth.pstmn.io/v1/callback',
                ],
                logoutUrls: [
                    'http://localhost:3000/api/auth/sign-out-callback',
                    'https://jay-platform.com/api/auth/sign-out-callback',
                    'https://oauth.pstmn.io/v1/callback',
                ],
            }
        })

        new cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
            userPoolId: this.userPool.userPoolId,
            clientId: this.userAuthClient.userPoolClientId,
            useCognitoProvidedValues: true,  // use Cognito defaults, customize in console after
        })

        // 1) Resource server + scope used for client_credentials
        const synthInvokeScope = {
            scopeName: 'invoke',
            scopeDescription: 'Invoke synth routes'
        }

        const synthResourceServerIdentifier = 'synth'

        const synthResourceServer = this.userPool.addResourceServer('SynthResourceServer', {
            identifier: synthResourceServerIdentifier,
            scopes: [
                synthInvokeScope
            ]
        })

        this.synthInvokeFullScope = `${synthResourceServerIdentifier}/${synthInvokeScope.scopeName}`

        // 2) New app client for ECS load generator (client_credentials)
        this.synthAuthClient = new cognito.UserPoolClient(this, 'SynthAuthClient', {
            userPool: this.userPool,

            generateSecret: true,

            oAuth: {
                flows: {
                    clientCredentials: true
                },
                scopes: [
                    cognito.OAuthScope.resourceServer(synthResourceServer, synthInvokeScope)
                    // resolves to scope string like 'synth/invoke'
                ]
            }
        })
    }
}