import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

import {PlatformService} from 'lib/config/domain/platform-service'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformEcsTaskSgProps extends BaseStackProps {
    vpc: ec2.IVpc
    upstreamSg?: ec2.ISecurityGroup
    appContainerPort: number
    serviceName: PlatformService
}

export class PlatformEcsTaskSecurityGroup extends Construct {
    public readonly securityGroup: ec2.ISecurityGroup

    public constructor(
        scope: Construct,
        id: string,
        props: PlatformEcsTaskSgProps
    ) {
        super(scope, id)

        const { envConfig, serviceName, vpc } = props

        this.securityGroup = new ec2.SecurityGroup(this, 'EcsTaskSecurityGroup', {
            securityGroupName: `${envConfig.projectName}-${serviceName}-task-sg-${envConfig.envName}`,
            vpc,
            description: `Platform service task SG (allow on ${props.appContainerPort} only from upstream SG)`,
            allowAllOutbound: true
        })

        this.securityGroup.addIngressRule(
            props.upstreamSg ?? ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(props.appContainerPort)
        )
    }
}