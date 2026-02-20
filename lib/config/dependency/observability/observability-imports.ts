import * as cdk from 'aws-cdk-lib'
import {StackDomain} from 'lib/config/domain/stack-domain'
import {EnvConfig} from 'lib/config/env/env-config'
import {resolveExportName} from 'lib/config/naming'
import {ObservabilityExports} from 'lib/config/dependency/observability/observability-exports'

export class ObservabilityImports {
    private static readonly stackDomain: StackDomain = StackDomain.observability

    public static apsRemoteWriteEndpoint(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ObservabilityExports.apsRemoteWriteEndpoint)
        )
    }

    public static apsWorkspaceArn(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, ObservabilityExports.apsWorkspaceArn)
        )
    }
}