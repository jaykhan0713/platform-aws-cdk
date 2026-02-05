import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import {resolveExportName, resolveStackName} from 'lib/config/naming'
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

    public static privateIsolatedSubnetIds(envConfig: EnvConfig) {
        return [
            cdk.Fn.importValue(resolveExportName(envConfig, this.networkDomain, 'private-isolated-subnet-0-id')),
            cdk.Fn.importValue(resolveExportName(envConfig, this.networkDomain, 'private-isolated-subnet-1-id'))
        ]
    }

    public static privateIsolatedSubnets(scope: Construct, envConfig: EnvConfig) {
        const subnetIds = this.privateIsolatedSubnetIds(envConfig)

        return subnetIds.map((subnetId, index) => {
            return ec2.Subnet.fromSubnetId(scope, `PrivateIsolatedSubnet${index}`, subnetId)
        })
    }

    public static vpc(scope: Construct, envConfig: EnvConfig) {

        const vpcId = this.vpcId(envConfig)
        const vpcCidrBlock = this.vpcCidr(envConfig)
        const privateSubnetIds = this.privateIsolatedSubnetIds(envConfig)

        return ec2.Vpc.fromVpcAttributes(scope, 'Vpc', {
            vpcId,
            vpcCidrBlock,
            privateSubnetIds,
            availabilityZones: cdk.Stack.of(scope).availabilityZones,
            region: envConfig.region
        })
    }
}
