import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'

import {BaseStackProps} from "lib/stacks/base-stack";
import {Construct} from "constructs";

export interface PlatformCognitoProps extends BaseStackProps {}

export class PlatformCognito extends Construct {
    public readonly userPool: cognito.UserPool
    public readonly userPoolClient: cognito.UserPoolClient

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

        //application registration, tokens are requested through client
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,

            generateSecret: false, // required for PKCE

            authFlows: {
                userSrp: true, // good to keep
            },

            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.EMAIL,
                ],
                callbackUrls: [
                    'postman://app/oauth2/callback',
                    'https://oauth.pstmn.io/v1/callback',
                ],
                logoutUrls: [
                    'postman://app/oauth2/callback',
                    'https://oauth.pstmn.io/v1/callback',
                ],
            }
        })

        this.userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: `${projectName}-${envName}-auth`,
            },
        })
    }
}
