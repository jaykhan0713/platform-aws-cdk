import * as cdk from 'aws-cdk-lib'
import {BaseStack, BaseStackProps} from 'lib/stacks/base-stack'
import {PlatformRds} from 'lib/constructs/data/platform-rds'
import {PlatformServiceName} from 'lib/config/service/platform-service-registry'
import {NetworkImports} from 'lib/config/dependency/network/network-imports'
import {ServiceRuntimeImports} from 'lib/config/dependency/service-runtime/service-runtime-imports'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

export interface RdsStackProps extends BaseStackProps {
    serviceName: PlatformServiceName
}

export class RdsStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props: RdsStackProps) {
        super(scope, id, props)

        const { envConfig, stackDomain, serviceName} = props

        const vpc = NetworkImports.vpcPrivateIsolated(this,  envConfig)

        const internalServicesSg = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'InternalServicesSgImported',
            ServiceRuntimeImports.internalServicesTaskSgId(envConfig),
            { mutable: false }
        )

        new PlatformRds(
            this,
            'PlatformRds',
            {
                envConfig,
                stackDomain,
                vpc,
                serviceName,
                userName: `${serviceName}-user`,
                upstreamSecurityGroup: internalServicesSg
            }
        )
    }
}