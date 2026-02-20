import * as cdk from 'aws-cdk-lib'

import { PlatformServiceRuntimeApp } from 'lib/app/platform-service-runtime-app'

const app = new cdk.App()

new PlatformServiceRuntimeApp(app)
