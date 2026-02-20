import * as cdk from 'aws-cdk-lib'

import { PlatformObservabilityApp } from 'lib/app/platform-observability-app'

const app = new cdk.App()

new PlatformObservabilityApp(app)
