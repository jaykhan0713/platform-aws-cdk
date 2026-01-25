import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Tags } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface InterfaceVpcEndpointProps {
    vpc: ec2.IVpc
    service: ec2.IInterfaceVpcEndpointService
    privateDnsEnabled: boolean
    subnetIds: string[]
    routeTableId: string
    securityGroups: ec2.ISecurityGroup[]
    nameTag: string
}

export class InterfaceVpceConstruct extends Construct  {
    public readonly endpoint: ec2.InterfaceVpcEndpoint

    public constructor(scope: Construct,
                       id: string,
                       props: InterfaceVpcEndpointProps
    ) {
        super(scope, id)

        const subnets = props.subnetIds.map((subnetId, idx) =>
            ec2.Subnet.fromSubnetAttributes(this, `InterfaceSubnet${idx}`, {
                subnetId,
                routeTableId: props.routeTableId,
            })
        )
        this.endpoint = new ec2.InterfaceVpcEndpoint(this, id, {
            vpc: props.vpc,
            service: props.service,
            privateDnsEnabled: props.privateDnsEnabled,
            subnets: { subnets },
            securityGroups: props.securityGroups
        })

        Tags.of(this.endpoint).add('Name', props.nameTag)
    }


}