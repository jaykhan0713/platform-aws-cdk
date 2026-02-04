import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import { resolveStackName } from 'lib/config/naming'
import type { EnvConfig } from 'lib/config/env/env-config'
import type { StackDomain } from 'lib/config/domain/stack-domain'

//only used in proper repos where network infra lives in separate repo.
export class VpcImports {

    private static readonly networkDomain: StackDomain = 'network'

    public static vpcId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(`${resolveStackName(envConfig, this.networkDomain)}-vpc-id`)
    }

    public static vpcCidr(envConfig: EnvConfig) {
        return cdk.Fn.importValue(`${resolveStackName(envConfig, this.networkDomain)}-vpc-cidr`)
    }

    public static privateSubnetIds(envConfig: EnvConfig) {
        const exportingStackName = resolveStackName(envConfig, this.networkDomain)
        return [
            cdk.Fn.importValue(`${exportingStackName}-private-subnet-a-id`),
            cdk.Fn.importValue(`${exportingStackName}-private-subnet-b-id`)
        ]
    }

    public static privateRouteTableId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(`${resolveStackName(envConfig, this.networkDomain)}-private-route-table-id`)
    }

    public static vpc(scope: Construct, envConfig: EnvConfig) {

        const vpcId = this.vpcId(envConfig)
        const vpcCidrBlock = this.vpcCidr(envConfig)
        const privateSubnetIds = this.privateSubnetIds(envConfig)
        const privateRoutTableId = this.privateRouteTableId(envConfig)

        const privateSubnetRouteTableIds = privateSubnetIds.map(() => privateRoutTableId)

        const availabilityZones = [
            `${cdk.Stack.of(scope).region}a`,
            `${cdk.Stack.of(scope).region}b`,
        ]

        return ec2.Vpc.fromVpcAttributes(scope, 'Vpc', {
            vpcId,
            vpcCidrBlock,
            availabilityZones,
            privateSubnetIds,
            privateSubnetRouteTableIds,
            region: envConfig.region
        })
    }
}
