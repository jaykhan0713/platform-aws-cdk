import * as cdk from 'aws-cdk-lib'

import {PlatformApp} from 'lib/app/platform-app'

const app = new cdk.App()

new PlatformApp(app)
