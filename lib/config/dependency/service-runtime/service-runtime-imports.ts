import * as cdk from 'aws-cdk-lib'
import {StackDomain} from 'lib/config/domain'
import {EnvConfig} from 'lib/config/env/env-config'
import {ServiceRuntimeExports} from 'lib/config/dependency/service-runtime/service-runtime-exports'
import {resolveExportName} from 'lib/config/naming'

export class ServiceRuntimeImports {
    private static readonly stackDomain: StackDomain = StackDomain.serviceRuntime

    public static ecsClusterArn(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ServiceRuntimeExports.ecsClusterArn)
        )
    }

    public static ecsClusterName(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ServiceRuntimeExports.ecsClusterName)
        )
    }

    public static internalServicesTaskSgId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ServiceRuntimeExports.internalServicesTaskSgId)
        )
    }

    public static httpNamespaceName(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ServiceRuntimeExports.httpNamespaceName)
        )
    }
}