import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
import { PlatformServiceRuntimeProps } from 'lib/stacks/props/platform-service-runtime-props'
import {Tags} from 'aws-cdk-lib'
import {TagKeys} from 'lib/config/naming/tags'
import {resolveSecurityGroupName} from 'lib/config/naming/security-groups'

export interface PlatformEcsTaskSgProps extends PlatformServiceRuntimeProps {
    upstreamSg?: ec2.ISecurityGroup
    appContainerPort: number
}

export class PlatformEcsTaskSecurityGroup extends Construct {
    public readonly securityGroup: ec2.ISecurityGroup

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsTaskSgProps
    ) {
        super(scope, id)

        const { vpc } = props.runtime

        this.securityGroup = new ec2.SecurityGroup(this, 'EcsTaskSecurityGroup', {
            vpc,
            description: `Platform service task SG (allow on ${props.appContainerPort} only from upstream SG)`,
            allowAllOutbound: true
        })

        this.securityGroup.addIngressRule(
            props?.upstreamSg
                ? ec2.Peer.securityGroupId(props.upstreamSg.securityGroupId)
                : ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(props.appContainerPort)
        )

        Tags.of(this.securityGroup).add(TagKeys.Name, resolveSecurityGroupName(props.envConfig, props.stackDomain))
    }
}