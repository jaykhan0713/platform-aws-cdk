import * as cdk from 'aws-cdk-lib'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import {StackDomain} from "lib/config/domain";
import {EnvConfig} from "lib/config/env/env-config";
import {resolveExportName} from "lib/config/naming";
import {AlbExports} from "lib/config/dependency/alb/alb-exports";
import {Construct} from "constructs";

export class AlbImports {

    public static albListenerArn(domain: StackDomain, envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, domain, AlbExports.albListenerArn)
        )
    }
}