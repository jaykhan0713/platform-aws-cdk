import * as cdk from 'aws-cdk-lib'

import {PlatformGatewayApp} from 'lib/app/platform-gateway-app'

const app = new cdk.App()

new PlatformGatewayApp(app)
