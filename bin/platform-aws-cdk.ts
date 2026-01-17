import { App } from 'aws-cdk-lib'

import { ServiceParametersStack } from 'lib/stacks/ssm/service-parameters-stack'

const app = new App()

new ServiceParametersStack(app, 'jay-platform-edge-service-ssm-params', {
    envName: 'prod',
    serviceName: 'edge-service'
})
