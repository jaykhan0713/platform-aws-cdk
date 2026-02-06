import * as cdk from 'aws-cdk-lib'

import { PlatformCoreApp } from 'lib/app/platform-core-app'

const app = new cdk.App()

new PlatformCoreApp(app)
