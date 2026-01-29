import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import {TagKeys} from 'lib/config/naming'
import {SubnetSelection} from 'aws-cdk-lib/aws-ec2'

export interface InterfaceVpcEndpointProps {
    vpc: ec2.IVpc
    service: ec2.IInterfaceVpcEndpointService
    privateDnsEnabled: boolean
    subnets: SubnetSelection
    securityGroups: ec2.ISecurityGroup[]
    nameTag: string
}

export class PlatformInterfaceVpce extends Construct  {
    public readonly endpoint: ec2.InterfaceVpcEndpoint

    public constructor(
        scope: Construct,
        id: string,
        props: InterfaceVpcEndpointProps
    ) {
        super(scope, id)

        this.endpoint = new ec2.InterfaceVpcEndpoint(this, id, {
            vpc: props.vpc,
            service: props.service,
            privateDnsEnabled: props.privateDnsEnabled,
            subnets: props.subnets,
            securityGroups: props.securityGroups
        })

        cdk.Tags.of(this.endpoint).add(TagKeys.Name, props.nameTag)
    }


}