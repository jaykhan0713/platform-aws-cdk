import * as cdk from 'aws-cdk-lib'

import { PlatformEcsApp } from 'lib/app/platform-ecs-app'

const app = new cdk.App()

new PlatformEcsApp(app)
