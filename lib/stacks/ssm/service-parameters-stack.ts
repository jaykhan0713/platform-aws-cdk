import { RemovalPolicy, Stack,  StackProps, CfnOutput } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';

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
        const adotCollectorConfigSuffix = `${observabilityPrefix}/adot/collector/config.yaml`

    }
}