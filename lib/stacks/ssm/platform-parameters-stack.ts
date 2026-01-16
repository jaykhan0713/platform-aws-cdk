import { Stack,  StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter} from 'aws-cdk-lib/aws-ssm';
import { ParameterPaths } from 'lib/config/ssm/parameter-paths'

export interface PlatformParametersStackProps extends StackProps {
    envName: string
    serviceName: string
}

export class PlatformParametersStack extends Stack {
    constructor(
        scope: Construct,
        id: string,
        props: PlatformParametersStackProps
    ) {

        super(scope,  id,  props)

        const { envName, serviceName } = props

        const prefix = ParameterPaths.servicePrefix(envName, serviceName)
        prefix.at(1)
    }
}