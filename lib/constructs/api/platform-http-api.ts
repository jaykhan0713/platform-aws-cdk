import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'

import {Construct} from "constructs";
import {BaseStackProps} from "lib/stacks/base-stack";

export interface PlatformHttpApiGatewayProps extends BaseStackProps {
    vpcLink: apigwv2.IVpcLink
    listener: elbv2.IApplicationListener

}

export class PlatformHttpApi extends Construct {

    constructor(scope: Construct, id: string, props: PlatformHttpApiGatewayProps) {
        super(scope, id);

        const { envConfig } = props
        const { projectName, envName } = envConfig

        const api = new apigwv2.HttpApi(this, "HttpApi", {
            apiName: `${projectName}-api-${envName}`,
            createDefaultStage: true
        })

        const integration = new integrations.HttpAlbIntegration(
            'ApiIntegration',
            props.listener,
            {
                vpcLink: props.vpcLink,
                parameterMapping: new apigwv2.ParameterMapping()
                    .appendHeader(
                        'x-gateway-request-id',
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
                    .appendHeader(
                        'x-user-id',
                        apigwv2.MappingValue.contextVariable('authorizer.claims.sub')
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
                    .appendHeader(
                        'x-gateway-request-id',
                        apigwv2.MappingValue.contextVariable('requestId')
                    )
                    .appendHeader(
                        'x-user-id',
                        apigwv2.MappingValue.contextVariable('authorizer.claims.sub')
                    )
            }
        )

        api.addRoutes({
            path: '/api/v1/{proxy+}',
            methods: [apigwv2.HttpMethod.ANY],
            integration
        })


        api.addRoutes({
            path: '/internal/{proxy+}',
            methods: [apigwv2.HttpMethod.ANY],
            integration: internalIntegration
        })

    }

}