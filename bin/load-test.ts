import * as cdk from 'aws-cdk-lib'

import { PlatformLoadTestApp } from 'lib/app/platform-load-test-app'

const app = new cdk.App()

new PlatformLoadTestApp(app)
