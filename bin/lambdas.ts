import * as cdk from 'aws-cdk-lib'

import { PlatformLambdasApp } from 'lib/app/platform-lambdas-app'

const app = new cdk.App()

new PlatformLambdasApp(app)
