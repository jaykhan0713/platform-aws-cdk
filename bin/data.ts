import * as cdk from 'aws-cdk-lib'

import {PlatformDataApp} from 'lib/app/platform-data-app'

const app = new cdk.App()

new PlatformDataApp(app)
