import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'

import {BaseStackProps} from "lib/stacks/base-stack";
import {Construct} from "constructs";

export interface PlatformCognitoProps extends BaseStackProps {}

export class PlatformCognito extends Construct {
    public readonly userPool: cognito.UserPool
    public readonly userPoolClient: cognito.UserPoolClient
    public readonly synthClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props: PlatformCognitoProps) {
        super(scope, id)

        const { projectName, envName } = props.envConfig

        //store of users + authentication engine. Tokens are issued by pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `${projectName}-user-pool-${envName}`,
            selfSignUpEnabled: false,
            signInAliases: { username: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY, // for showcase
        })

        //Creates https://<projectName>-<envName>-auth.auth.us-west-2.amazoncognito.com Oauth endpoint
        //https://<projectName>-<envName>-auth.auth.us-west-2.amazoncognito.com/oauth2/{authorize,token,logout,jwks.json.. etc}
        this.userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: `${projectName}-${envName}-auth`,
            },
        })

        //application registration, tokens are requested through client
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,

            generateSecret: false, // requires false for PKCE

            authFlows: {
                userSrp: true, // good to keep
            },

            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.OPENID, //only use sub currently
                    // cognito.OAuthScope.PROFILE,
                    // cognito.OAuthScope.EMAIL,
                ],
                callbackUrls: [
                    'postman://app/oauth2/callback',
                    'https://oauth.pstmn.io/v1/callback',
                ],
                logoutUrls: [
                    'https://oauth.pstmn.io/v1/callback',
                ],
            }
        })

        // 1) Resource server + scope used for client_credentials
        const synthScope = {
            scopeName: 'invoke',
            scopeDescription: 'Invoke synth routes'
        }

        const synthResourceServer = this.userPool.addResourceServer('SynthResourceServer', {
            identifier: 'synth',
            scopes: [
                synthScope
            ]
        })

        // 2) New app client for ECS load generator (client_credentials)
        this.synthClient = new cognito.UserPoolClient(this, 'SynthUserPoolClient', {
            userPool: this.userPool,

            generateSecret: true,

            oAuth: {
                flows: {
                    clientCredentials: true
                },
                scopes: [
                    cognito.OAuthScope.resourceServer(synthResourceServer, synthScope)
                    // resolves to scope string like 'synth/invoke'
                ]
            }
        })

    }
}
