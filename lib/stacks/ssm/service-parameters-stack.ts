import {CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import {Construct} from 'constructs';

import {ParameterPaths} from 'lib/config/ssm/parameter-paths';

export interface PlatformParametersStackProps extends StackProps {
    envName: string
    serviceName: string
}

export class ServiceParametersStack extends Stack {
    constructor(
        scope: Construct,
        id: string,
        props: PlatformParametersStackProps
    ) {
        super(scope,  id,  props)

        const { envName, serviceName } = props

        const observabilityPrefix = ParameterPaths.serviceObservabilityPrefix(envName, serviceName)

        // adot
        const adotCollectorConfigName = `${observabilityPrefix}/adot/collector/config.yaml`

        const placeholderOtelConfig = [
            'receivers: {}',
            'exporters: {}',
            'service:',
            '  pipelines: {}',
            ''
        ].join('\n')

        const adotCollectorConfigParam = new ssm.StringParameter(
            this,
            'AdotCollectorConfigYaml',
            {
                parameterName: adotCollectorConfigName,
                description: `ADOT collector config for ${serviceName} (${envName}). Managed in ssm param store`,
                stringValue: placeholderOtelConfig
            }
        )

        adotCollectorConfigParam.applyRemovalPolicy(RemovalPolicy.RETAIN)

        new CfnOutput(this, 'AdotCollectorConfigYamlParamName', {
            value: adotCollectorConfigParam.parameterName
        })

    }
}