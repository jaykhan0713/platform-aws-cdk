import { App } from 'aws-cdk-lib'
import { PlatformParametersStack } from 'lib/stacks/ssm/platform-parameters-stack'

const app = new App()

new PlatformParametersStack(app, 'EdgeServiceParameters', {
    envName: 'prod',
    serviceName: 'edge-service'
})
