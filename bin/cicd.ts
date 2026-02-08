import * as cdk from 'aws-cdk-lib'

import { PlatformCicdApp } from 'lib/app/platform-cicd-app'

const app = new cdk.App()

new PlatformCicdApp(app)
