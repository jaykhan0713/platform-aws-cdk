import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

import {PlatformServiceName} from 'lib/config/service/platform-service-name'
import {BaseStackProps} from 'lib/stacks/base-stack'

export interface PlatformEcsTaskSgProps extends BaseStackProps {
    vpc: ec2.IVpc
    upstreamSgs: ec2.ISecurityGroup[]
    appContainerPort: number
    serviceName: PlatformServiceName
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
            description: `Unique service task SG`,
            allowAllOutbound: true //add this sg to ingress of any resource's sg.
        })

        for (const upstreamSg of props.upstreamSgs) {
            this.securityGroup.addIngressRule(
                upstreamSg,
                ec2.Port.tcp(props.appContainerPort),
                `Allow upstreamSg to ingress on port ${props.appContainerPort}`
            )
        }


    }
}