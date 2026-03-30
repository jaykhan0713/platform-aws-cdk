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
    userAuthClient: cognito.IUserPoolClient
    synthAuthClient: cognito.IUserPoolClient
}

export class PlatformHttpApi extends Construct {
    public readonly apiUrl: string
    public readonly api: apigwv2.HttpApi

    constructor(scope: Construct, id: string, props: PlatformHttpApiGatewayProps) {
        super(scope, id);

        const { envConfig } = props
        const { projectName, envName } = envConfig

        this.api = new apigwv2.HttpApi(this, "HttpApi", {
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

        const api = this.api

        this.apiUrl = api.url ?? ''

        //note that CDK does not delete parameter mappings if removed here. Must manually delete in AWS console/UI
        const userIdHeader = 'x-user-id'
        const requestIdHeader = 'x-request-id'
        const apiPrefix = "api/v1"

        const secureServerName = envConfig.route53Config
            ? `internal.${envConfig.route53Config.domainName}`
            : undefined

        const publicIntegration = new integrations.HttpAlbIntegration(
            'PublicIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                secureServerName,
                parameterMapping: new apigwv2.ParameterMapping()
                    .overwritePath( //strips 'public' in /public/api/v1/{proxy+} transforms to /api/v1{proxy+}
                        apigwv2.MappingValue.custom(`/${apiPrefix}/$request.path.proxy`)
                    )
                    .overwriteHeader(
                        userIdHeader,
                        apigwv2.MappingValue.custom('anon')
                    ) //removeHeader does not work currently.
                    .overwriteHeader(
                        requestIdHeader,
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
            }
        )

        const userIntegration = new integrations.HttpAlbIntegration(
            'ApiIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                secureServerName,
                parameterMapping: new apigwv2.ParameterMapping()
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

        const internalIntegration = new integrations.HttpAlbIntegration(
            'InternalIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                secureServerName,
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
                secureServerName,
                parameterMapping: new apigwv2.ParameterMapping()
                    .overwritePath(
                        apigwv2.MappingValue.custom(`/${apiPrefix}/$request.path.proxy`)
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
                    props.userAuthClient.userPoolClientId,
                    props.synthAuthClient.userPoolClientId
                ]
            }
        )

        //public route, anonymous without login
        api.addRoutes({
            path: '/public/api/v1/{proxy+}',
            methods: [apigwv2.HttpMethod.GET],
            integration: publicIntegration
        })

        //authorized routes: user, admin, synthetic traffic
        api.addRoutes({
            path: '/api/v1/{proxy+}', //{proxy+} takes anything
            methods: [apigwv2.HttpMethod.GET],
            integration: userIntegration,
            authorizer,
            authorizationScopes: ['openid']
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

        //Rate limiting

        const defaultStage = api.defaultStage?.node.defaultChild as apigwv2.CfnStage

        defaultStage.routeSettings = {
            'GET /public/api/v1/{proxy+}' : {
                ThrottlingBurstLimit: 10, //bucket size
                ThrottlingRateLimit: 5, //refills bucket w these tokens per second
                DetailedMetricsEnabled: true //since overwriting the settings, this gets disabled by default
            }
        }
    }

}