import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'

import {Construct} from "constructs";
import {BaseStackProps} from "lib/stacks/base-stack";

export interface PlatformHttpApiGatewayProps extends BaseStackProps {
    vpcLink: apigwv2.IVpcLink
    listener: elbv2.IApplicationListener
    userPool: cognito.IUserPool
    userPoolClient: cognito.IUserPoolClient
    synthPoolClient: cognito.IUserPoolClient
}

export class PlatformHttpApi extends Construct {

    constructor(scope: Construct, id: string, props: PlatformHttpApiGatewayProps) {
        super(scope, id);

        const { envConfig } = props
        const { projectName, envName } = envConfig

        const api = new apigwv2.HttpApi(this, "HttpApi", {
            apiName: `${projectName}-api-${envName}`,
            createDefaultStage: true,
            corsPreflight: {
                allowOrigins: ['*'], // tighten later with real domain
                allowMethods: [apigwv2.CorsHttpMethod.ANY],
                allowHeaders: ['*'],
                exposeHeaders: ['apigw-requestid'], //browser JS can access only these, returned by apigw
                maxAge: cdk.Duration.days(1),
            }
        })

        //note that CDK does not delete parameter mappings if removed here.
        const userIdHeader = 'x-user-id'
        const requestIdHeader = 'x-request-id'

        const integration = new integrations.HttpAlbIntegration(
            'ApiIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                parameterMapping: new apigwv2.ParameterMapping()
                    .removeHeader(userIdHeader) //anon/unauth'd has no user-id from sub
                    .overwriteHeader(
                        requestIdHeader,
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
            }
        )

        const internalIntegration = new integrations.HttpAlbIntegration(
            'InternalIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                parameterMapping: new apigwv2.ParameterMapping()
                    .overwritePath( //strips 'internal' in internal/{proxy+} transforms to /{proxy+}
                        apigwv2.MappingValue.custom('/$request.path.proxy')
                    )
                    .overwriteHeader(
                        userIdHeader,
                        apigwv2.MappingValue.contextVariable('authorizer.claims.sub')
                    )
                    .overwriteHeader(
                        requestIdHeader,
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
            }
        )

        const synthIntegration = new integrations.HttpAlbIntegration(
            'SynthIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                parameterMapping: new apigwv2.ParameterMapping()
                    .overwritePath(
                        apigwv2.MappingValue.custom('/api/v1/$request.path.proxy')
                    )
                    .overwriteHeader(
                        requestIdHeader,
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
            }
        )

        let authorizer: apigwv2.IHttpRouteAuthorizer | undefined

        authorizer = new authorizers.HttpJwtAuthorizer(
            'HttpJwtAuthorizer',
            `https://cognito-idp.${envConfig.region}.amazonaws.com/${props.userPool.userPoolId}`, //issuer
            {
                jwtAudience: [
                    props.userPoolClient.userPoolClientId,
                    props.synthPoolClient.userPoolClientId
                ]
            }
        )

        api.addRoutes({
            path: '/api/v1/{proxy+}', //{proxy+} takes anything
            methods: [apigwv2.HttpMethod.GET],
            integration
        })


        api.addRoutes({
            path: '/internal/{proxy+}',
            methods: [apigwv2.HttpMethod.ANY],
            integration: internalIntegration,
            authorizer,
            authorizationScopes: ['openid']
        })

        api.addRoutes({
            path: '/synth/api/v1/{proxy+}',
            methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT],
            integration: synthIntegration,
            authorizer,
            authorizationScopes: ['synth/invoke']
        })

        //TODO: optional: rate limit public API (L1 construct)
    }

}