import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import { resolveExportName } from 'lib/config/naming/index'
import type { EnvConfig } from 'lib/config/env/env-config'
import  { StackDomain } from 'lib/config/domain/stack-domain'
import {NetworkExports} from 'lib/config/dependency/network/network-exports'

//simulates use in proper repos where network infra lives in separate repo.
//optional: If adding private with egress and public subnets, have maxAz per tier ordered by number
export class NetworkImports {

    private static readonly stackDomain: StackDomain = StackDomain.network

    public static vpcId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(resolveExportName(envConfig, this.stackDomain, NetworkExports.vpcId))
    }

    public static vpcCidr(envConfig: EnvConfig) {
        return cdk.Fn.importValue(resolveExportName(envConfig, this.stackDomain, NetworkExports.vpcCidr))
    }

    public static privateIsolatedSubnetAzs(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.privateIsolatedSubnetAz(index))
            )
        })
    }

    public static publicSubnetAzs(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.publicSubnetAz(index))
            )
        })
    }

    public static privateIsolatedSubnetRts(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.privateIsolatedSubnetRt(index))
            )
        })
    }

    public static publicSubnetRts(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.publicSubnetRt(index))
            )
        })
    }

    public static privateIsolatedSubnetIds(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.privateIsolatedSubnetId(index))
            )
        })
    }

    public static publicSubnetIds(envConfig: EnvConfig) {
        return Array.from({ length: this.maxAzs(envConfig) }, (_, index) => {
            return cdk.Fn.importValue(
                resolveExportName(envConfig, this.stackDomain, NetworkExports.publicSubnetId(index))
            )
        })
    }

    //1 private isolated subnet per AZ, 1 RT per private isolated subnet
    public static privateIsolatedSubnets(scope: Construct, envConfig: EnvConfig) {
        const subnetIds = this.privateIsolatedSubnetIds(envConfig)
        const availabilityZones = this.privateIsolatedSubnetAzs(envConfig)
        const routeTableIds = this.privateIsolatedSubnetRts(envConfig)

        if (subnetIds.length !== availabilityZones.length) {
            throw new Error(
                `Network import mismatch: subnetIds=${subnetIds.length} availabilityZones=${availabilityZones.length}`
            )
        }

        if (subnetIds.length !== routeTableIds.length) {
            throw new Error(
                `Network import mismatch: subnetIds=${subnetIds.length} rt=${routeTableIds.length}`
            )
        }

        return subnetIds.map((subnetId, index) => {
            return ec2.Subnet.fromSubnetAttributes(
                scope,
                `ImportedPrivateIsolatedSubnet${index}`,
                {
                    subnetId,
                    availabilityZone: availabilityZones[index],
                    routeTableId: routeTableIds[index]
                }
            )
        })
    }

    public static vpcLinkId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, NetworkExports.vpcLinkId)
        )
    }

    public static vpcLinkSubSgId(envConfig: EnvConfig) {
        return cdk.Fn.importValue(
            resolveExportName(envConfig, this.stackDomain, NetworkExports.vpcLinkSubSgId)
        )
    }

    //note that anything outside the network boundary should not need route table associations
    public static vpcPrivateIsolated(scope: Construct, envConfig: EnvConfig) {

        const vpcId = this.vpcId(envConfig)
        const vpcCidrBlock = this.vpcCidr(envConfig)
        const availabilityZones = this.privateIsolatedSubnetAzs(envConfig)

        const privateIsolatedSubnetIds = this.privateIsolatedSubnetIds(envConfig)
        const privateIsolatedSubnetRts = this.privateIsolatedSubnetRts(envConfig)

        return ec2.Vpc.fromVpcAttributes(scope, 'ImportedVpc', {
            vpcId,
            vpcCidrBlock,
            availabilityZones,
            privateSubnetIds: privateIsolatedSubnetIds,
            privateSubnetRouteTableIds: privateIsolatedSubnetRts
        })
    }

    public static vpcPublic(scope: Construct, envConfig: EnvConfig) {

        const vpcId = this.vpcId(envConfig)
        const vpcCidrBlock = this.vpcCidr(envConfig)
        const availabilityZones = this.publicSubnetAzs(envConfig)

        const publicSubnetIds = this.publicSubnetIds(envConfig)
        const publicSubnetRouteTableIds = this.publicSubnetRts(envConfig)

        return ec2.Vpc.fromVpcAttributes(scope, 'ImportedVpcPublic', {
            vpcId,
            vpcCidrBlock,
            availabilityZones,
            publicSubnetIds,
            publicSubnetRouteTableIds
        })
    }

    private static maxAzs(envConfig: EnvConfig) { return envConfig.vpcConfig?.maxAzs ?? 2 }
}
