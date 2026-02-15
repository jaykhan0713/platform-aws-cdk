import * as cdk from 'aws-cdk-lib'

import {PlatformNetworkApp} from 'lib/app/platform-network-app'

const app = new cdk.App()

new PlatformNetworkApp(app)
