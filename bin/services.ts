import * as cdk from 'aws-cdk-lib'

import { PlatformServicesApp } from 'lib/app/platform-services-app'

const app = new cdk.App()

new PlatformServicesApp(app)
