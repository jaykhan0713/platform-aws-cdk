import * as cdk from 'aws-cdk-lib'
import { PlatformServiceName } from 'lib/config/service/platform-service-registry'
import { EnvConfig } from 'lib/config/env/env-config'
import { resolveExportName } from 'lib/config/naming'
import { FargateExports } from 'lib/config/dependency/fargate/fargate-exports'

export class FargateImports {
    public static serviceArn(serviceName: PlatformServiceName, envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, serviceName, FargateExports.serviceArn)
        )
    }
}